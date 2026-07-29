#!/usr/bin/env node
/*
 * ElevenLabs TTS generator for v2 lesson narration — drop-in replacement for
 * generate.py (Kokoro). Writes the SAME layout the renderer expects, per lesson:
 *
 *     lessons-v2/audio/<lessonId>/<NN>.mp3        one clip per beat
 *     lessons-v2/audio/<lessonId>/timings.json    { "<NN>": [ {t,s,e}, ... ] }  word timings
 *     lessons-v2/audio/manifest.js                 window.LT_AUDIO_MANIFEST = { "<id>": <beatCount> }
 *
 * Word timings drive the karaoke caption highlight (renderer.js). ElevenLabs' standard
 * endpoint returns none, so we call /with-timestamps (character-level alignment) and
 * aggregate characters → words (split on whitespace) to match the {t,s,e} schema Kokoro
 * produced. Audio comes back as base64 mp3 in the SAME response — no ffmpeg re-encode.
 *
 * Prereqs (Node 18+ for global fetch):
 *     export ELEVENLABS_API_KEY=sk_...
 *     export ELEVENLABS_VOICE_ID=<voice_id>      (or pass as: --voice <id>)
 *
 * Usage (run from repo root):
 *     node tools/tts/generate-eleven.mjs                         # all lessons; skip fully-done ones
 *     node tools/tts/generate-eleven.mjs course1/05_trending_markets   # rebuild ONE lesson (overwrite)
 *     node tools/tts/generate-eleven.mjs --force                 # rebuild everything
 * A lesson is "done" only if timings.json AND every beat mp3 exist; naming a lessonId
 * (or --force) rebuilds that folder. Resumable: a mid-batch failure re-runs from where it stopped.
 */
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'lessons-v2/audio';
const MODEL = process.env.ELEVENLABS_MODEL || 'eleven_flash_v2_5';  // owner choice: half-cost (0.5 credit/char), near-parity; override via env for a higher-quality one-off
const OUTPUT_FORMAT = 'mp3_44100_128';            // needs Creator+ tier; drop to mp3_44100_96 on lower tiers
const API = 'https://api.elevenlabs.io/v1/text-to-speech';

const argv = process.argv.slice(2);
const force = argv.includes('--force');
const voiceArg = (() => { const k = argv.indexOf('--voice'); return k >= 0 ? argv[k + 1] : null; })();
const only = new Set(argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--voice'));
const rebuild = force || only.size > 0;

const KEY = process.env.ELEVENLABS_API_KEY;
const VOICE = voiceArg || process.env.ELEVENLABS_VOICE_ID;
if (typeof fetch === 'undefined') { console.error('Need Node 18+ (global fetch).'); process.exit(1); }
if (!KEY)   { console.error('Set ELEVENLABS_API_KEY.'); process.exit(1); }
if (!VOICE) { console.error('Set ELEVENLABS_VOICE_ID or pass --voice <id>.'); process.exit(1); }

const BEATS = JSON.parse(fs.readFileSync('tools/tts/beats.json', 'utf8'));

// Match generate.py exactly so filenames / caption text are identical.
const clean = (s) => (s || '').replace(/[*_`~]/g, '').replace(/\s+/g, ' ').trim();
const pad = (i) => (i < 10 ? '0' : '') + i;
const round3 = (n) => Math.round(n * 1000) / 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Character-level alignment → word timings. Split on whitespace; each word keeps its
// punctuation (e.g. "One:") and takes the first char's start + last char's end. Uses the
// raw `alignment` (input chars) so the caption text matches the original narration.
function wordsFromAlignment(al) {
  if (!al || !al.characters) return [];
  const c = al.characters;
  const s = al.character_start_times_seconds || [];
  const e = al.character_end_times_seconds || [];
  const out = [];
  let cur = null;
  for (let k = 0; k < c.length; k++) {
    if (/\s/.test(c[k])) { if (cur) { out.push(cur); cur = null; } continue; }
    if (!cur) cur = { t: c[k], s: round3(s[k]), e: round3(e[k]) };
    else { cur.t += c[k]; cur.e = round3(e[k]); }
  }
  if (cur) out.push(cur);
  return out;
}

// One beat → { audio: Buffer, words: [...] }. Retries 429/5xx with backoff.
async function synth(text) {
  const url = `${API}/${VOICE}/with-timestamps?output_format=${OUTPUT_FORMAT}`;
  const body = JSON.stringify({ text, model_id: MODEL });
  for (let attempt = 0; attempt < 5; attempt++) {
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', accept: 'application/json' },
        body,
      });
    } catch (err) { if (attempt === 4) throw err; await sleep(1000 * (attempt + 1)); continue; }
    if (res.ok) {
      const j = await res.json();
      const b64 = j.audio_base64 || j.audio;
      if (!b64) throw new Error('no audio_base64 in response');
      return { audio: Buffer.from(b64, 'base64'), words: wordsFromAlignment(j.alignment) };
    }
    if (res.status === 429 || res.status >= 500) {          // rate-limited / transient → back off
      const wait = res.status === 429 ? 5000 * (attempt + 1) : 1500 * (attempt + 1);
      await sleep(wait); continue;
    }
    throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  throw new Error('exhausted retries');
}

function lessonDone(lid, beats) {
  const d = path.join(OUT, lid);
  if (!fs.existsSync(path.join(d, 'timings.json'))) return false;
  return beats.every((b) => !clean(b.say) || fs.existsSync(path.join(d, pad(b.i) + '.mp3')));
}

// Preserve the existing manifest so a selective/partial run doesn't drop other lessons.
const mjPath = path.join(OUT, 'manifest.json');
const mjsPath = path.join(OUT, 'manifest.js');
let manifest = {};
if (fs.existsSync(mjPath)) { try { manifest = JSON.parse(fs.readFileSync(mjPath, 'utf8')); } catch { manifest = {}; } }

const writeManifest = () => {
  const sorted = {};
  for (const k of Object.keys(manifest).sort()) sorted[k] = manifest[k];
  fs.writeFileSync(mjPath, JSON.stringify(sorted, null, 0));
  fs.writeFileSync(mjsPath, 'window.LT_AUDIO_MANIFEST = ' + JSON.stringify(sorted) + ';\n');
};

const ids = Object.keys(BEATS).filter((lid) => !only.size || only.has(lid));
let made = 0;
for (const lid of ids) {
  const beats = BEATS[lid].beats;
  const withSay = beats.filter((b) => clean(b.say)).length;
  if (!rebuild && lessonDone(lid, beats)) { manifest[lid] = withSay; continue; }
  const d = path.join(OUT, lid);
  fs.mkdirSync(d, { recursive: true });
  const timings = {};
  for (const b of beats) {
    const say = clean(b.say);
    if (!say) continue;
    const { audio, words } = await synth(say);
    fs.writeFileSync(path.join(d, pad(b.i) + '.mp3'), audio);
    timings[pad(b.i)] = words;
    made++;
  }
  fs.writeFileSync(path.join(d, 'timings.json'), JSON.stringify(timings));
  manifest[lid] = withSay;
  writeManifest();                                          // checkpoint after each lesson (resumable)
  console.log(`[${lid}] ${withSay} beats`);
}
writeManifest();
console.log(`DONE generated=${made} lessons=${ids.length}`);
