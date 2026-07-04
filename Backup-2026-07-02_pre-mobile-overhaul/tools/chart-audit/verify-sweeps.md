# Chart-edit verification sweeps (paste into the Claude Preview console on `/lt-index.html`)

Two headless sweeps that render every chart the app can draw and assert nothing throws or clips.
Run the relevant one after ANY chart edit; require **0 throws / 0 clipped / 0 console errors** before deploy.
Reload the preview first so the new `?v=` files are loaded.

Last run (2026-06-30): ECharts **231 charts · 543 levels · 0/0**; v2 **84 lessons · 397 beats · 0 throws**.

---

## 1. ECharts course charts (`lt-data*.js` — markLine/markArea clip + render)

Renders every candlestick `introChart`/`lessonChart`/`quiz.chart` across all 4 courses into a hidden host and
checks every markLine + markArea edge maps inside the price grid (grid 0). The engine y-axis fix
(`lt-engine.js` `buildCandlestickOption`) expands the axis to include any level, so clipped should stay 0.

```js
(async () => {
  const courses = [['1',LT_CHAPTERS],['2',LT_CHAPTERS_2],['3',LT_CHAPTERS_3],['4',LT_CHAPTERS_4]];
  let host = document.getElementById('__sweep'); if (host) host.remove();
  host = document.createElement('div'); host.id='__sweep';
  host.style.cssText='position:fixed;left:-3000px;top:0;width:760px;height:360px;';
  document.body.appendChild(host);
  let charts=0, throws=0, clipped=0, levels=0; const throwList=[], clipList=[];
  for (const [cn, arr] of courses) for (const ch of arr) {
    for (const [slot, def] of [['introChart',ch.introChart],['lessonChart',ch.lessonChart],['quiz.chart',ch.quiz&&ch.quiz.chart]]) {
      if (!def || def.type!=='candlestick' || !def.ohlc) continue;
      charts++; host.style.height=(def.chartHeight||360)+'px';
      let inst; try { inst=echarts.init(host); inst.setOption(buildCandlestickOption(def), true); }
      catch(e){ throws++; throwList.push(`c${cn} ch${ch.id} ${slot}: ${e.message}`); if(inst)inst.dispose(); continue; }
      try {
        const rect=inst.getModel().getComponent('grid',0).coordinateSystem.getRect();
        const lo=rect.y-1, hi=rect.y+rect.height+1, lv=[];
        (def.markLines||[]).forEach(m=>lv.push(['ML',m.yAxis,m.label]));
        (def.markAreas||[]).forEach(a=>{lv.push(['MA0',a.y0,a.label]);lv.push(['MA1',a.y1,a.label]);});
        for (const [k,y,label] of lv){ if(y==null)continue; levels++; const px=inst.convertToPixel({yAxisIndex:0},y);
          if(!(px>=lo&&px<=hi)){clipped++;clipList.push(`c${cn} ch${ch.id} ${slot} ${k} y=${y} "${label}"`);} }
      } catch(e){ throws++; throwList.push(`c${cn} ch${ch.id} ${slot} CLIPCHK: ${e.message}`); }
      inst.dispose();
    }
  }
  host.remove();
  return { charts, levelsChecked: levels, throws, clipped, throwList: throwList.slice(0,20), clipList: clipList.slice(0,20) };
})()
```

Note on the one expected "edge" case: a stop "above swing high" can legitimately sit ~1-2 above the band top —
it still maps inside the grid because the y-axis fix expanded to include it, so `clipped` stays 0.

---

## 2. v2 animated lessons (`lessons-v2/lessons/Course*/*.js` — anchor resolution + render)

Drives every lesson through the real `LTRenderer` in instant mode. `_resolveChartAnno` throws on an unknown
anchor, so any bad `show` anchor surfaces here. Also exercises the accumulation across same-`chart` beats.

```js
(async () => {
  for (const n of [1,2,3,4]) await ensureV2LessonsLoaded(n);
  const results=[]; let totalBeats=0;
  for (const [id, lesson] of Object.entries(window.LT_LESSONS)) {
    const mount=document.createElement('div');
    mount.style.cssText='position:fixed;left:-4000px;top:0;width:760px;height:460px;';
    document.body.appendChild(mount);
    let r=null, err=null, beatsRun=0;
    try { r=new LTRenderer(mount, lesson, {}); for(let i=0;i<lesson.beats.length;i++){ r.go(i,false); beatsRun++; } }
    catch(e){ err=e.message; }
    try{ if(r) r.pause(); }catch(e){}
    mount.remove(); totalBeats+=beatsRun;
    results.push({id, beats: lesson.beats.length, beatsRun, err});
  }
  const failed=results.filter(r=>r.err);
  return { lessons: results.length, beatsRendered: totalBeats, failures: failed.length, detail: failed.map(f=>f.id+': '+f.err) };
})()
```

Then `mcp__Claude_Preview__preview_console_logs` at level `error` must return nothing. OpenClaw auto-deploys
from the working tree — **never run a manual `vercel`.**
```

## Anchor-map regen (for re-running the v2 audit)

The v2 audit needs the exact anchors each vocabulary move exposes. Regenerate by EXECUTING the vocabulary in
node (it attaches to `globalThis`), then iterating `LTChartVocab.charts` / `.candles` and calling each move:

```js
require('/Users/pbot/.openclaw/workspace/lessons-v2/chart-vocabulary.js');
const V = globalThis.LTChartVocab;
for (const [name, fn] of Object.entries(V.charts)) {
  const g = fn({});                       // some moves take params: horizontal_sr({as}), consolidation_breakout({dir})
  // g.anchors: { name: {type:'level'|'point', price, i} }, g.regions (candles), g.stages
}
```
