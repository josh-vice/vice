#!/usr/bin/env python3
"""
lt_process_video.py
Downloads VTT subtitles and extracts frames for one Liquidity Theory video.
Outputs manifest.json + frame JPGs to output_dir.
Usage: python3 lt_process_video.py <video_id> <output_dir>
"""
import sys, json, re, subprocess, tempfile
from pathlib import Path

def ts_to_secs(ts):
    ts = ts.strip().split(' ')[0]
    parts = ts.split(':')
    try:
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
        if len(parts) == 2:
            return int(parts[0]) * 60 + float(parts[1])
    except:
        pass
    return 0.0

def clean_text(t):
    return re.sub(r'<[^>]+>', '', t).strip()

def fmt_ts(s):
    return f"{int(s)//60:02d}:{int(s)%60:02d}"

def parse_vtt(content):
    segs, lines, i = [], content.splitlines(), 0
    while i < len(lines):
        line = lines[i].strip()
        if '-->' in line:
            start = ts_to_secs(line.split('-->')[0])
            texts, i = [], i + 1
            while i < len(lines) and lines[i].strip():
                t = clean_text(lines[i])
                if t:
                    texts.append(t)
                i += 1
            if texts:
                joined = ' '.join(dict.fromkeys(texts))
                if not segs or segs[-1][1] != joined:
                    segs.append((start, joined))
        i += 1
    return segs

def group_chunks(segs, size=15):
    if not segs:
        return []
    chunks, cs, ct, nb = [], segs[0][0], [], segs[0][0] + size
    for s, t in segs:
        if s >= nb and ct:
            chunks.append({
                'start_secs': cs,
                'ts': fmt_ts(cs),
                'dialogue': ' '.join(dict.fromkeys(ct))
            })
            cs, ct, nb = s, [t], s + size
        else:
            ct.append(t)
    if ct:
        chunks.append({
            'start_secs': cs,
            'ts': fmt_ts(cs),
            'dialogue': ' '.join(dict.fromkeys(ct))
        })
    return chunks

def run(cmd, timeout=600):
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)

def main():
    if len(sys.argv) < 3:
        print('Usage: lt_process_video.py <video_id> <output_dir>', file=sys.stderr)
        sys.exit(1)

    vid = sys.argv[1]
    out = Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    url = f'https://www.youtube.com/watch?v={vid}'

    # ── 1. Download VTT ──────────────────────────────────────────────────────
    has_transcript, chunks = False, []
    with tempfile.TemporaryDirectory() as tmp:
        run([
            'yt-dlp', '--write-auto-subs', '--write-subs',
            '--sub-lang', 'en.*', '--sub-format', 'vtt',
            '--skip-download', '-o', f'{tmp}/s', url
        ], timeout=90)
        vtts = list(Path(tmp).glob('*.vtt'))
        if vtts:
            segs = parse_vtt(vtts[0].read_text(encoding='utf-8', errors='replace'))
            chunks = group_chunks(segs, size=15)
            has_transcript = bool(chunks)

    # ── 2. Fallback: sample every 30s based on duration ──────────────────────
    if not chunks:
        r = run(['yt-dlp', '--print', '%(duration)s', url], timeout=30)
        try:
            dur = int(r.stdout.strip())
            chunks = [{'start_secs': t, 'ts': fmt_ts(t), 'dialogue': '[No transcript available]'}
                      for t in range(0, max(dur, 30), 30)]
        except:
            chunks = [{'start_secs': 0, 'ts': '00:00', 'dialogue': '[No transcript available]'}]

    # ── 3. Download video at lowest usable quality ───────────────────────────
    vp = out / f'{vid}.mp4'
    run([
        'yt-dlp', '-f',
        'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/'
        'bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/'
        'worst[ext=mp4]/worst',
        '--merge-output-format', 'mp4',
        '-o', str(vp), url
    ], timeout=600)

    if not vp.exists():
        found = [f for f in out.glob(f'{vid}.*') if f.suffix not in ('.json',)]
        vp = found[0] if found else None

    # ── 4. Extract frames ────────────────────────────────────────────────────
    fps = {}
    if vp and vp.exists():
        for c in chunks:
            fp = out / f'f_{int(c["start_secs"]):05d}.jpg'
            run([
                'ffmpeg', '-y', '-ss', str(c['start_secs']),
                '-i', str(vp),
                '-frames:v', '1', '-q:v', '3',
                '-vf', 'scale=iw:ih',          # keep native resolution
                str(fp)
            ], timeout=30)
            if fp.exists():
                fps[c['start_secs']] = str(fp)
        try:
            vp.unlink()
        except:
            pass

    for c in chunks:
        c['frame_path'] = fps.get(c['start_secs'], '')

    # ── 5. Write manifest ────────────────────────────────────────────────────
    manifest = {
        'video_id': vid,
        'has_transcript': has_transcript,
        'total_chunks': len(chunks),
        'frames_extracted': len(fps),
        'chunks': chunks
    }
    (out / 'manifest.json').write_text(json.dumps(manifest, indent=2))
    print(json.dumps(manifest, indent=2))

if __name__ == '__main__':
    main()
