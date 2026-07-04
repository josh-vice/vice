/* Extract every v2 lesson beat's narration (`say`) → tools/tts/beats.json, for the
   Kokoro generator. Loads the lesson data files under a minimal `window` shim. */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'lessons-v2';
const win = { LT_LESSONS: {} };
const run = (file) => {
  const src = fs.readFileSync(file, 'utf8');
  try { new Function('window', src)(win); }
  catch (e) { console.error('ERR', file, '::', e.message); }
};

// vocabulary first (lessons may reference window.LTChartVocab at parse time)
run(path.join(ROOT, 'chart-vocabulary.js'));
for (const c of ['Course1', 'Course2', 'Course3', 'Course4']) {
  const dir = path.join(ROOT, 'lessons', c);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort()) run(path.join(dir, f));
}

const out = {};
for (const id of Object.keys(win.LT_LESSONS).sort()) {
  const L = win.LT_LESSONS[id];
  out[id] = {
    module: L.module || '', title: L.title || '',
    beats: (L.beats || []).map((b, i) => ({ i, id: b.id || ('beat' + i), type: b.type || '', say: (b.say || '') }))
  };
}
fs.writeFileSync('tools/tts/beats.json', JSON.stringify(out, null, 2));
const lessons = Object.keys(out).length;
const beats = Object.values(out).reduce((s, l) => s + l.beats.length, 0);
const withSay = Object.values(out).reduce((s, l) => s + l.beats.filter(b => b.say.trim()).length, 0);
console.log(`lessons=${lessons} beats=${beats} withSay=${withSay}`);
