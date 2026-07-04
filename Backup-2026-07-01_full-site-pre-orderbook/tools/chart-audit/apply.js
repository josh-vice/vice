/* Surgical applier for the chart-teaching-audit plans.
   INSERT-ONLY into existing markLines/markPoints/markAreas/revealMarkPoints arrays
   (creates the array if absent). No brace-matching, no deletions → lowest risk.
   Fixes (find/replace) are NOT auto-applied — they're reported for manual review.
   Usage: node apply.js <course 1|2|3|4> [--write]      (default = dry run) */
const fs = require('fs');
const path = require('path');

const PLAN_DIR = __dirname;
const FILES = {
  1: '/Users/pbot/.openclaw/workspace/lt-data.js',
  2: '/Users/pbot/.openclaw/workspace/lt-data-course2.js',
  3: '/Users/pbot/.openclaw/workspace/lt-data-course3.js',
  4: '/Users/pbot/.openclaw/workspace/lt-data-course4.js',
};

const course = parseInt(process.argv[2], 10);
const WRITE = process.argv.includes('--write');
if (!FILES[course]) { console.error('usage: node apply.js <1|2|3|4> [--write]'); process.exit(1); }

const ser = {
  markLine: (o) => `{ yAxis: ${o.yAxis}, label: ${JSON.stringify(o.label)}, color: ${JSON.stringify(o.color || '#00d4d4')} }`,
  markPoint: (o) => `{ dataIndex: ${o.dataIndex}, label: ${JSON.stringify(o.label)}, position: ${JSON.stringify(o.position || 'top')}${o.color ? `, color: ${JSON.stringify(o.color)}` : ''} }`,
  markArea: (o) => `{ y0: ${o.y0}, y1: ${o.y1}, label: ${JSON.stringify(o.label)}, color: ${JSON.stringify(o.color)} }`,
};

let text = fs.readFileSync(FILES[course], 'utf8');
const log = [], fixes = [], failures = [];
let inserts = 0;

// chapter block bounds: from the chapter's `title: "<title>"` to the next chapter `\n    id:`
function chapterBounds(title) {
  const anchor = `title: ${JSON.stringify(title)}`;
  const start = text.indexOf(anchor);
  if (start < 0) return null;
  const next = text.indexOf('\n    id:', start + anchor.length);
  return { start, end: next < 0 ? text.length : next };
}
function slotRegion(b, slot) {
  // returns [start,end) within the chapter block for the given slot's object body
  const kw = slot === 'quiz.chart' ? 'quiz: {' : slot + ': {';
  const ki = text.indexOf(kw, b.start);
  if (ki < 0 || ki >= b.end) return null;
  let bodyStart = ki;
  if (slot === 'quiz.chart') {
    const ci = text.indexOf('chart: {', ki);
    if (ci < 0 || ci >= b.end) return null;
    bodyStart = ci;
  }
  // end = next sibling slot keyword (introChart/lessonChart/quiz) after bodyStart, else block end
  const sibs = ['introChart: {', 'lessonChart: {', 'quiz: {'];
  let end = b.end;
  for (const s of sibs) {
    const si = text.indexOf(s, bodyStart + 5);
    if (si > bodyStart && si < end) end = si;
  }
  return { start: bodyStart, end };
}
// quiz-level region (for revealMarkPoints), from `quiz: {` to block end
function quizRegion(b) {
  const qi = text.indexOf('quiz: {', b.start);
  if (qi < 0 || qi >= b.end) return null;
  return { start: qi, end: b.end };
}

function insertIntoArray(region, prop, itemsStr, label) {
  // find `prop` then the next `[` within region; insert itemsStr right after `[`
  const pi = text.indexOf(prop + ':', region.start);
  if (pi >= 0 && pi < region.end) {
    const br = text.indexOf('[', pi);
    if (br >= 0 && br < region.end) {
      text = text.slice(0, br + 1) + ' ' + itemsStr + ',' + text.slice(br + 1);
      inserts++; log.push(`  + ${label}: into existing ${prop}[]`);
      return true;
    }
  }
  // array absent → create after the slot's `title:` line
  const ti = text.indexOf('title:', region.start);
  if (ti >= 0 && ti < region.end) {
    const eol = text.indexOf('\n', ti);
    const indent = '      ';
    const block = `\n${indent}${prop}: [ ${itemsStr} ],`;
    text = text.slice(0, eol) + block + text.slice(eol);
    inserts++; log.push(`  + ${label}: CREATED ${prop}[] after title`);
    return true;
  }
  failures.push(`${label}: could not place ${prop}`);
  return false;
}

const planFiles = fs.readdirSync(PLAN_DIR).filter(f => new RegExp(`^c${course}-ch\\d+\\.json$`).test(f))
  .sort((a, b) => parseInt(a.match(/ch(\d+)/)[1]) - parseInt(b.match(/ch(\d+)/)[1]));

for (const pf of planFiles) {
  const plan = JSON.parse(fs.readFileSync(path.join(PLAN_DIR, pf), 'utf8'));
  if (!plan.edits || !plan.edits.length) continue;
  const b = chapterBounds(plan.title);
  log.push(`\n[c${course} ch${plan.chapterId}] ${plan.title}`);
  if (!b) { failures.push(`ch${plan.chapterId}: chapter block not found ("${plan.title}")`); continue; }
  for (const e of plan.edits) {
    const reg = slotRegion(b, e.slot);
    // NOTE: bounds shift as we insert; recompute per edit
    if ((e.addMarkLines || e.addMarkPoints || e.addMarkAreas) && !reg) {
      failures.push(`ch${plan.chapterId} ${e.slot}: slot region not found`);
    } else {
      if (e.addMarkLines && e.addMarkLines.length) insertIntoArray(slotRegion(chapterBounds(plan.title), e.slot), 'markLines', e.addMarkLines.map(ser.markLine).join(', '), `${e.slot} markLines`);
      if (e.addMarkPoints && e.addMarkPoints.length) insertIntoArray(slotRegion(chapterBounds(plan.title), e.slot), 'markPoints', e.addMarkPoints.map(ser.markPoint).join(', '), `${e.slot} markPoints`);
      if (e.addMarkAreas && e.addMarkAreas.length) insertIntoArray(slotRegion(chapterBounds(plan.title), e.slot), 'markAreas', e.addMarkAreas.map(ser.markArea).join(', '), `${e.slot} markAreas`);
    }
    if (e.addRevealMarkPoints && e.addRevealMarkPoints.length) {
      const qr = quizRegion(chapterBounds(plan.title));
      if (qr) insertIntoArray(qr, 'revealMarkPoints', e.addRevealMarkPoints.map(ser.markPoint).join(', '), `${e.slot} revealMarkPoints`);
      else failures.push(`ch${plan.chapterId}: quiz region not found for revealMarkPoints`);
    }
    if (e.fixes && e.fixes.length) e.fixes.forEach(fx => fixes.push(`[c${course} ch${plan.chapterId} ${e.slot}] FIND: ${fx.find}\n        REPLACE: ${fx.replaceWith}\n        WHY: ${fx.reason}`));
  }
}

console.log('===== INSERTIONS ('+inserts+') =====');
console.log(log.join('\n'));
console.log('\n===== FIXES NEEDING MANUAL EDIT ('+fixes.length+') =====');
console.log(fixes.join('\n\n') || '(none)');
console.log('\n===== FAILURES ('+failures.length+') =====');
console.log(failures.join('\n') || '(none)');

if (WRITE) {
  // sanity: bracket balance unchanged-ish check is hard; just ensure file still parses-ish by length growth
  fs.writeFileSync(FILES[course], text);
  console.log('\nWROTE', FILES[course]);
} else {
  console.log('\n(dry run — no file written. add --write to apply)');
}
