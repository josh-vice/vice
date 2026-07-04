/* Surgical applier for the v2 LESSON teaching-audit plans.
   INSERT-ONLY into each beat's existing `show: [ ... ]` array (all 127 visual beats already have one).
   Beats are located by their `id: '<slug>'`; the region is bounded to the next beat (`\n    {`) or the
   beats-array end (`\n  ]`). Fixes (verbatim find/replace, scoped to the beat) ARE applied here when they
   match exactly; non-verbatim ones are reported for manual edit. No brace-matching, no deletions.
   Usage: node v2-apply.js <planDir> [--write]      (default = dry run)

   Plan shape (one file per lesson, written by the audit workflow):
   { course, file, lessonId, edits:[ { beatId, addShow:[{kind,at|of|from|to,side,depth,tone,style,place,label,extend}],
                                       fixes:[{find,replaceWith,reason}] } ], noAnchorGaps, alreadyGood, notes } */
const fs = require('fs');
const path = require('path');

const PLAN_DIR = process.argv[2];
const WRITE = process.argv.includes('--write');
if (!PLAN_DIR || !fs.existsSync(PLAN_DIR)) { console.error('usage: node v2-apply.js <planDir> [--write]'); process.exit(1); }
const LESSONS_ROOT = '/Users/pbot/.openclaw/workspace/lessons-v2/lessons';

// serialize a show item with single quotes, stable field order, matching the file style
const FIELD_ORDER = ['kind', 'at', 'of', 'from', 'to', 'side', 'depth', 'tone', 'style', 'place', 'label', 'extend'];
function q(v) { return typeof v === 'string' ? "'" + v.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'" : String(v); }
function serShow(o) {
  const parts = [];
  for (const k of FIELD_ORDER) if (o[k] !== undefined) parts.push(`${k}: ${q(o[k])}`);
  // include any non-standard keys last (defensive)
  for (const k of Object.keys(o)) if (!FIELD_ORDER.includes(k)) parts.push(`${k}: ${q(o[k])}`);
  return `{ ${parts.join(', ')} }`;
}

const planFiles = fs.readdirSync(PLAN_DIR).filter(f => /\.json$/.test(f) && f !== 'PLAN.md').sort();
let inserts = 0, fixesApplied = 0;
const log = [], manual = [], failures = [];
const dirtyFiles = new Set();

for (const pf of planFiles) {
  const plan = JSON.parse(fs.readFileSync(path.join(PLAN_DIR, pf), 'utf8'));
  if (!plan.edits || !plan.edits.length) continue;
  const lessonPath = path.join(LESSONS_ROOT, 'Course' + plan.course, plan.file);
  if (!fs.existsSync(lessonPath)) { failures.push(`${pf}: lesson file not found (${lessonPath})`); continue; }
  let text = fs.readFileSync(lessonPath, 'utf8');
  log.push(`\n[c${plan.course} ${plan.file}] ${plan.lessonId || ''}`);

  // locate a beat by id and return [start,end) of its region
  function beatRegion(beatId) {
    let bi = text.indexOf(`id: '${beatId}'`);
    if (bi < 0) bi = text.indexOf(`id: "${beatId}"`);
    if (bi < 0) return null;
    // end = next beat opener `\n    {` or beats-array close `\n  ]`
    const nextBeat = text.indexOf('\n    {', bi);
    const arrEnd = text.indexOf('\n  ]', bi);
    let end = text.length;
    if (nextBeat > bi) end = Math.min(end, nextBeat);
    if (arrEnd > bi) end = Math.min(end, arrEnd);
    return { start: bi, end };
  }

  for (const e of plan.edits) {
    // recompute region each edit (offsets shift on insert)
    const adds = e.addShow || [];
    if (adds.length) {
      const reg = beatRegion(e.beatId);
      if (!reg) { failures.push(`c${plan.course} ${plan.file} beat '${e.beatId}': not found`); }
      else {
        const si = text.indexOf('show:', reg.start);
        const br = si >= 0 && si < reg.end ? text.indexOf('[', si) : -1;
        if (br < 0 || br >= reg.end) { failures.push(`c${plan.course} ${plan.file} beat '${e.beatId}': no show[] in region`); }
        else {
          const itemsStr = adds.map(serShow).join(', ');
          text = text.slice(0, br + 1) + ' ' + itemsStr + ',' + text.slice(br + 1);
          inserts += adds.length;
          log.push(`  + '${e.beatId}': ${adds.length} show item(s) -> ${adds.map(a => a.kind + ':' + (a.at || a.of || (a.from + '->' + a.to))).join(', ')}`);
          dirtyFiles.add(lessonPath);
        }
      }
    }
    for (const fx of (e.fixes || [])) {
      const reg = beatRegion(e.beatId);
      const find = (fx.find || '').trim(), repl = (fx.replaceWith || '').trim();
      if (!reg) { manual.push(`c${plan.course} ${plan.file} '${e.beatId}': beat not found for fix`); continue; }
      const idx = text.indexOf(find, reg.start);
      if (find && idx >= 0 && idx < reg.end) {
        text = text.slice(0, idx) + repl + text.slice(idx + find.length);
        fixesApplied++; log.push(`  ~ '${e.beatId}': FIX applied`); dirtyFiles.add(lessonPath);
      } else {
        manual.push(`c${plan.course} ${plan.file} '${e.beatId}': fix not verbatim\n      FIND: ${find}\n      REPL: ${repl}`);
      }
    }
  }

  if (WRITE && dirtyFiles.has(lessonPath)) fs.writeFileSync(lessonPath, text);
}

console.log('===== INSERTIONS (' + inserts + ' show items) =====');
console.log(log.join('\n'));
console.log('\n===== FIXES APPLIED (' + fixesApplied + ') =====');
console.log('\n===== MANUAL NEEDED (' + manual.length + ') =====');
console.log(manual.join('\n\n') || '(none)');
console.log('\n===== FAILURES (' + failures.length + ') =====');
console.log(failures.join('\n') || '(none)');
console.log('\nFiles ' + (WRITE ? 'WRITTEN' : 'to change') + ': ' + dirtyFiles.size);
if (!WRITE) console.log('(dry run — add --write to apply)');
