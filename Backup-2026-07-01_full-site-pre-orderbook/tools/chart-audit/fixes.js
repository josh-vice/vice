/* Apply the audit FIXES (relabels / coordinate nudges), scoped to each chapter block.
   Handles: full-object replacements + label-only changes. Reports the rest for manual edit.
   Usage: node fixes.js <1|2|3|4> [--write] */
const fs = require('fs');
const path = require('path');
const PLAN_DIR = __dirname;
const FILES = { 1:'/Users/pbot/.openclaw/workspace/lt-data.js', 2:'/Users/pbot/.openclaw/workspace/lt-data-course2.js', 3:'/Users/pbot/.openclaw/workspace/lt-data-course3.js', 4:'/Users/pbot/.openclaw/workspace/lt-data-course4.js' };
const course = parseInt(process.argv[2],10), WRITE = process.argv.includes('--write');
if(!FILES[course]){ console.error('usage: node fixes.js <1|2|3|4> [--write]'); process.exit(1); }
let text = fs.readFileSync(FILES[course],'utf8');
const applied=[], manual=[];

function chapterBlock(title){ const a=`title: ${JSON.stringify(title)}`; const s=text.indexOf(a); if(s<0) return null; const n=text.indexOf('\n    id:', s+a.length); return {start:s, end:n<0?text.length:n}; }
function replaceInBlock(b, find, repl){ const idx=text.indexOf(find, b.start); if(idx<0||idx>=b.end) return false; text=text.slice(0,idx)+repl+text.slice(idx+find.length); return true; }

const planFiles = fs.readdirSync(PLAN_DIR).filter(f=>new RegExp(`^c${course}-ch\\d+\\.json$`).test(f));
for(const pf of planFiles){
  const plan=JSON.parse(fs.readFileSync(path.join(PLAN_DIR,pf),'utf8'));
  if(!plan.edits) continue;
  for(const e of plan.edits){
    if(!e.fixes) continue;
    for(const fx of e.fixes){
      const tag=`c${course}ch${plan.chapterId} ${e.slot}`;
      const b=chapterBlock(plan.title);
      if(!b){ manual.push(`${tag}: chapter block not found`); continue; }
      const repl=(fx.replaceWith||'').trim(), find=(fx.find||'').trim();
      // Case A: full-object replacement
      if(find.startsWith('{') && repl.startsWith('{')){
        if(replaceInBlock(b, find, repl)) applied.push(`${tag}: OBJECT replaced`);
        else manual.push(`${tag}: object FIND not verbatim → ${find}`);
        continue;
      }
      // Case B: label-only change (repl like: label: "..."  and find contains a label: "...")
      const newLabelM = repl.match(/label:\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/);
      const oldLabelM = find.match(/label:\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/);
      if(newLabelM && oldLabelM){
        const oldL = oldLabelM[0], newL = `label: ${newLabelM[1]}`;
        if(replaceInBlock(b, oldL, newL)) applied.push(`${tag}: LABEL ${oldLabelM[1]} -> ${newLabelM[1]}`);
        else manual.push(`${tag}: label FIND not verbatim → ${oldL}`);
        continue;
      }
      manual.push(`${tag}: DESCRIPTIVE → FIND:[${find}] REPL:[${repl}]`);
    }
  }
}
console.log(`===== APPLIED (${applied.length}) =====\n`+applied.join('\n'));
console.log(`\n===== MANUAL NEEDED (${manual.length}) =====\n`+manual.join('\n'));
if(WRITE){ fs.writeFileSync(FILES[course], text); console.log('\nWROTE '+FILES[course]); } else console.log('\n(dry run)');
