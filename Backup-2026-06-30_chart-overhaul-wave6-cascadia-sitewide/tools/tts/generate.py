#!/usr/bin/env python3
"""
Kokoro TTS generator for v2 lesson narration (voice af_heart — same engine as v1).

Per lesson it writes, under lessons-v2/audio/<lessonId>/ :
    <NN>.mp3        one clip per beat
    timings.json    { "<NN>": [ {"t": word, "s": start, "e": end }, ... ] }  (word-level
                    timing for karaoke caption highlighting; times in seconds, audio-clock)
Plus lessons-v2/audio/manifest.js  ->  window.LT_AUDIO_MANIFEST = { "<lessonId>": <beats> }
so the player only loads audio for lessons that have it.

Usage (run with the venv active):
    source tools/tts/.venv/bin/activate
    python tools/tts/generate.py                 # all lessons; skip ones already fully done
    python tools/tts/generate.py course1/05_trending_markets   # rebuild ONE lesson (overwrite)
    python tools/tts/generate.py --force         # rebuild everything
A lesson is "done" only if every beat mp3 AND its timings.json exist; selective regen
(naming a lessonId) rebuilds just that lesson's folder.
"""
import sys, os, json, re, subprocess, tempfile
import numpy as np, soundfile as sf
from kokoro import KPipeline

OUT, VOICE, SR = 'lessons-v2/audio', 'af_heart', 24000
BEATS = json.load(open('tools/tts/beats.json'))

argv = sys.argv[1:]
force = '--force' in argv
only  = set(a for a in argv if not a.startswith('--'))
if only:
    force = True

def clean(s):
    return re.sub(r'\s+', ' ', re.sub(r'[*_`~]', '', s)).strip()
def pad(i):
    return ('0' + str(i)) if i < 10 else str(i)

# Synthesize text -> (audio np.float32, [ {t,s,e} ]). Handles multi-chunk results by
# offsetting each chunk's token timestamps by the cumulative audio duration.
def synth(pipe, text):
    parts, words, off = [], [], 0.0
    for res in pipe(text, voice=VOICE):
        a = res.audio
        if a is None:
            continue
        a = a.detach().cpu().numpy() if hasattr(a, 'detach') else np.asarray(a)
        cur = None
        for tk in (res.tokens or []):
            s, e = tk.start_ts, tk.end_ts
            if s is None or e is None:
                if cur is not None:
                    cur['t'] += tk.text
                continue
            s += off; e += off
            if cur is None:
                cur = {'t': tk.text, 's': round(s, 3), 'e': round(e, 3)}
            else:
                cur['t'] += tk.text; cur['e'] = round(e, 3)
            if tk.whitespace:
                words.append(cur); cur = None
        if cur:
            words.append(cur)
        parts.append(a); off += len(a) / SR
    if not parts:
        return None, []
    return (np.concatenate(parts) if len(parts) > 1 else parts[0]), words

def lesson_done(lid, beats):
    d = os.path.join(OUT, lid)
    tj = os.path.join(d, 'timings.json')
    if not os.path.exists(tj):
        return False
    return all(os.path.exists(os.path.join(d, pad(b['i']) + '.mp3')) for b in beats if clean(b['say']))

pipe = KPipeline(lang_code='a')
mpath = os.path.join(OUT, 'manifest.js')
manifest = {}
mj = os.path.join(OUT, 'manifest.json')               # keep a json copy too (handy)
if os.path.exists(mj):
    try: manifest = json.load(open(mj))
    except Exception: manifest = {}

ids = [lid for lid in BEATS if (not only or lid in only)]
made = 0
for lid in ids:
    beats = BEATS[lid]['beats']
    if not force and lesson_done(lid, beats):
        manifest[lid] = sum(1 for b in beats if clean(b['say']))
        continue
    d = os.path.join(OUT, lid)
    os.makedirs(d, exist_ok=True)
    timings, have = {}, 0
    for b in beats:
        say = clean(b['say'])
        if not say:
            continue
        have += 1
        audio, words = synth(pipe, say)
        if audio is None:
            continue
        timings[pad(b['i'])] = words
        mp3 = os.path.join(d, pad(b['i']) + '.mp3')
        tmp = tempfile.NamedTemporaryFile(suffix='.wav', delete=False).name
        sf.write(tmp, audio, SR)
        subprocess.run(['ffmpeg', '-y', '-i', tmp, '-codec:a', 'libmp3lame', '-b:a', '96k',
                        '-ar', str(SR), mp3], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        os.remove(tmp)
        made += 1
    json.dump(timings, open(os.path.join(d, 'timings.json'), 'w'), ensure_ascii=False)
    manifest[lid] = have
    print(f"[{lid}] {have} beats", flush=True)

json.dump(manifest, open(mj, 'w'), indent=0, sort_keys=True)
with open(mpath, 'w') as f:
    f.write('window.LT_AUDIO_MANIFEST = ' + json.dumps(manifest, sort_keys=True) + ';\n')
print(f"DONE generated={made} lessons={len(ids)}", flush=True)
