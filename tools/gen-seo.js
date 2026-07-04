#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   gen-seo.js — static SEO page generator for Liquidity Theory
   ---------------------------------------------------------------------------
   The app renders all course content client-side, so search engines see blank
   pages. This script reads the course data and pre-renders ONE crawlable HTML
   page per lesson (full text + meta + OG + JSON-LD), a /learn curriculum hub,
   sitemap.xml and robots.txt. Each lesson page links into the interactive app
   via a deep link (?c=<course>&ch=<chapter>&s=0).

   Run:  node tools/gen-seo.js   (also wired as the Vercel buildCommand)
   Zero dependencies — Node built-ins only. Does not touch the app at runtime.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BASE_URL = 'https://liqtheory.com';   // apex domain (www 301-redirects to it via Vercel)
const OG_IMAGE = BASE_URL + '/og-image.png?v=3';

// Kept in sync with LT_COURSE_NAMES (lt-settings.js) / COURSE4_META (lt-data-course4.js).
const COURSE_NAMES   = ['Laying the Foundation', 'Building Your Toolbox', 'Sharpening Your Edge', 'Liquidity Theory'];
const COURSE_ACCENTS = ['#00d4d4', '#e0b020', '#a855f7', '#f87171'];

/* ── Load the course data in a sandbox (data files call ltCandles() at parse
      time, so lt-chartgen.js must load first; same vm trick as HANDOFF). ───── */
function loadCourses() {
  const ctx = { console, document: { addEventListener() {} } };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  const run = (file, capture) => {
    let code = fs.readFileSync(path.join(ROOT, file), 'utf8');
    if (capture) code += `\n;this.${capture.as} = (typeof ${capture.name} !== 'undefined') ? ${capture.name} : null;`;
    vm.runInContext(code, ctx, { filename: file });
  };
  run('lt-chartgen.js');
  run('lt-data.js',         { name: 'LT_CHAPTERS',   as: '__C1' });
  run('lt-data-course2.js', { name: 'LT_CHAPTERS_2', as: '__C2' });
  run('lt-data-course3.js', { name: 'LT_CHAPTERS_3', as: '__C3' });
  run('lt-data-course4.js', { name: 'LT_CHAPTERS_4', as: '__C4' });
  return [ctx.__C1, ctx.__C2, ctx.__C3, ctx.__C4];
}

/* ── Small text helpers ─────────────────────────────────────────────────── */
const slug = s => String(s).toLowerCase()
  .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'lesson';
const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const stripTags = s => String(s == null ? '' : s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const metaDesc = s => { const t = stripTags(s); return t.length > 155 ? t.slice(0, 152).trimEnd() + '…' : t; };
const bulletsHtml = arr => (Array.isArray(arr) && arr.length)
  ? `<ul>${arr.map(b => `<li>${b}</li>`).join('')}</ul>` : '';   // bullets may contain our own <strong>/<em>

/* ── Build a flat, ordered model of every lesson with its URL/slug ─────────── */
function buildModel(courses) {
  const model = [];
  courses.forEach((chapters, ci) => {
    if (!chapters) return;
    const courseNum = ci + 1;
    const courseSlug = `course-${courseNum}-${slug(COURSE_NAMES[ci])}`;
    const seen = new Set();
    const lessons = chapters.map((ch, idx) => {
      let cs = slug(ch.title);
      while (seen.has(cs)) cs += '-' + idx;        // guarantee uniqueness within the course
      seen.add(cs);
      return {
        courseNum, courseSlug, courseName: COURSE_NAMES[ci], accent: COURSE_ACCENTS[ci],
        idx, chapter: ch, chapterSlug: cs,
        path: `/learn/${courseSlug}/${cs}/`,
        appLink: `/?c=${courseNum}&ch=${idx}&s=0`
      };
    });
    model.push({ courseNum, courseSlug, courseName: COURSE_NAMES[ci], accent: COURSE_ACCENTS[ci], lessons });
  });
  return model;
}

/* ── Page chrome (shared <head> + on-brand inline CSS) ──────────────────────── */
function head(title, description, canonical, extraJsonLd) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${canonical}" />
<link rel="icon" type="image/svg+xml" href="/lt-logo.svg" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="Liquidity Theory" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${canonical}" />
<meta property="og:image" content="${OG_IMAGE}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${OG_IMAGE}" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Cascadia+Code:wght@400;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
${extraJsonLd ? `<script type="application/ld+json">${JSON.stringify(extraJsonLd)}</script>` : ''}
<style>
  :root{--bg:#08070f;--bg3:#14121f;--bg4:#1d1a30;--border:#272235;--border2:#363049;--teal:#00d4d4;--text:#f6f5fb;--text2:#a8a3bb;--text3:#8b85a3;}
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:var(--bg);color:var(--text);font-family:'Geist Mono',ui-monospace,monospace;line-height:1.7;
    background-image:radial-gradient(900px 480px at 80% -10%,rgba(0,212,212,.08),transparent 60%),
      linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px);
    background-size:auto,44px 44px,44px 44px;}
  .wrap{max-width:760px;margin:0 auto;padding:28px 22px 64px;}
  a{color:var(--teal);text-decoration:none;}
  a:hover{text-decoration:underline;}
  h1,h2,h3{font-family:'Geist Mono',ui-monospace,monospace;letter-spacing:-.2px;line-height:1.2;}
  .brand{display:flex;align-items:center;gap:9px;font-family:'Geist Mono',ui-monospace,monospace;font-weight:700;font-size:19px;margin-bottom:20px;}
  .brand svg{width:24px;height:24px;}
  .crumb{font-size:12px;color:var(--text3);margin-bottom:14px;}
  .crumb a{color:var(--text2);}
  .eyebrow{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px;}
  h1.title{font-size:34px;font-weight:700;margin-bottom:18px;}
  section{background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:20px 22px;margin-bottom:16px;}
  section h2{font-size:21px;font-weight:700;margin-bottom:10px;}
  section p{color:var(--text2);margin-bottom:12px;}
  section p strong,li strong{color:var(--text);font-weight:700;}
  ul{list-style:none;display:flex;flex-direction:column;gap:8px;margin-top:6px;}
  li{position:relative;padding-left:18px;color:var(--text2);font-size:14.5px;}
  li::before{content:"–";position:absolute;left:0;color:var(--teal);font-weight:700;}
  .tag{font-size:11px;color:var(--text3);margin-bottom:16px;}
  .cta{display:inline-flex;align-items:center;gap:8px;background:var(--teal);color:#04201f;font-weight:700;
    padding:13px 24px;border-radius:6px;margin:6px 0 4px;font-size:15px;}
  .cta:hover{filter:brightness(1.08);text-decoration:none;}
  .quiz-opts{list-style:none;padding:0;}
  .quiz-opts li{background:var(--bg4);border:1px solid var(--border2);border-radius:6px;padding:10px 14px;padding-left:14px;}
  .quiz-opts li::before{content:"";}
  .nav{display:flex;justify-content:space-between;gap:12px;margin-top:24px;font-size:13px;}
  .foot{margin-top:40px;padding-top:18px;border-top:1px solid var(--border);font-size:12px;color:var(--text3);line-height:1.7;}
  .toc-course{margin-bottom:26px;}
  .toc-course h2{font-size:22px;margin-bottom:10px;}
  .toc-list{display:flex;flex-direction:column;gap:6px;}
  .toc-list a{color:var(--text2);font-size:14px;}
  .toc-list a:hover{color:var(--teal);}
</style>
</head>`;
}

const LOGO = `<svg viewBox="74 90 252 220" fill-rule="nonzero" aria-hidden="true"><path fill="#16E9D0" d="M83 231h19a3 3 0 0 1 3 3v39a3 3 0 0 1-3 3H83a3 3 0 0 1-3-3v-39a3 3 0 0 1 3-3Zm83-21h19a3 3 0 0 1 3 3v30a3 3 0 0 1-3 3h-19a3 3 0 0 1-3-3v-30a3 3 0 0 1 3-3Zm85-83h20a3 3 0 0 1 3 3v85a3 3 0 0 1-3 3h-20a3 3 0 0 1-3-3v-85a3 3 0 0 1 3-3Z"/><path fill="#fff" d="M124 179h19a3 3 0 0 1 3 3v54a3 3 0 0 1-3 3h-19a3 3 0 0 1-3-3v-54a3 3 0 0 1 3-3Zm84-2h19a3 3 0 0 1 3 3v85a3 3 0 0 1-3 3h-19a3 3 0 0 1-3-3v-85a3 3 0 0 1 3-3Zm89-33h19a3 3 0 0 1 3 3v66a3 3 0 0 1-3 3h-19a3 3 0 0 1-3-3v-66a3 3 0 0 1 3-3Z"/></svg>`;
const BRAND = `<a class="brand" href="/learn/">${LOGO}<span>Liquidity Theory</span></a>`;
const DISCLAIMER = `Liquidity Theory · Learn · Analyze · Trade together<br/>Educational content only — trading involves substantial risk and most beginners lose money. Nothing here is financial advice.`;

/* ── One lesson page ────────────────────────────────────────────────────────── */
function lessonPage(L, prev, next) {
  const ch = L.chapter;
  const courseLabel = `Course ${L.courseNum}: ${L.courseName}`;
  const title = `${ch.title} — ${courseLabel} | Liquidity Theory`;
  const desc = metaDesc(ch.intro && ch.intro.body) || `${ch.title} — a free interactive ${L.courseName} lesson from Liquidity Theory.`;
  const canonical = BASE_URL + L.path;
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'LearningResource',
    name: ch.title, description: stripTags(ch.intro && ch.intro.body).slice(0, 300),
    url: canonical, learningResourceType: 'lesson', educationalLevel: 'Beginner',
    inLanguage: 'en', isAccessibleForFree: true,
    isPartOf: { '@type': 'Course', name: courseLabel, url: BASE_URL + '/learn/' },
    provider: { '@type': 'Organization', name: 'Liquidity Theory', url: BASE_URL }
  };

  const intro = ch.intro ? `<section>
      <div class="eyebrow" style="color:${L.accent}">Introduction</div>
      <h2>${esc(ch.intro.heading || 'Overview')}</h2>
      ${ch.intro.body ? `<p>${ch.intro.body}</p>` : ''}
      ${bulletsHtml(ch.intro.bullets)}
    </section>` : '';

  const lesson = ch.lesson ? `<section>
      <div class="eyebrow" style="color:${L.accent}">Lesson</div>
      <h2>${esc(ch.lesson.heading || 'Lesson')}</h2>
      ${ch.lesson.body ? `<p>${ch.lesson.body}</p>` : ''}
      ${bulletsHtml(ch.lesson.bullets)}
    </section>` : '';

  const quiz = (ch.quiz && ch.quiz.question) ? `<section>
      <div class="eyebrow" style="color:${L.accent}">Check Yourself</div>
      <p><strong>${esc(ch.quiz.question)}</strong></p>
      ${Array.isArray(ch.quiz.answers) && ch.quiz.answers.length
        ? `<ul class="quiz-opts">${ch.quiz.answers.map(a => `<li>${esc(stripTags(a.text))}</li>`).join('')}</ul>` : ''}
      <p style="margin-top:12px;font-size:13px;color:var(--text3)">Answer it (with a live chart) in the interactive lesson.</p>
    </section>` : '';

  const navHtml = `<div class="nav">
      <span>${prev ? `<a href="${prev.path}">← ${esc(prev.chapter.title)}</a>` : `<a href="/learn/">← All lessons</a>`}</span>
      <span>${next ? `<a href="${next.path}">${esc(next.chapter.title)} →</a>` : `<a href="/learn/">All lessons →</a>`}</span>
    </div>`;

  return `${head(title, desc, canonical, jsonld)}
<body>
  <div class="wrap">
    ${BRAND}
    <div class="crumb"><a href="/learn/">Lessons</a> › <a href="/learn/#${L.courseSlug}">${esc(courseLabel)}</a> › ${esc(ch.module || '')}</div>
    <div class="eyebrow" style="color:${L.accent}">${esc(courseLabel)}${ch.module ? ' · ' + esc(ch.module) : ''}</div>
    <h1 class="title">${esc(ch.title)}</h1>
    ${ch.tag ? `<div class="tag">${esc(ch.tag)}</div>` : ''}
    <a class="cta" href="${L.appLink}">Open the interactive lesson →</a>
    ${intro}
    ${lesson}
    ${quiz}
    <a class="cta" href="${L.appLink}">Start this lesson in the app →</a>
    ${navHtml}
    <div class="foot">${DISCLAIMER}</div>
  </div>
</body>
</html>`;
}

/* ── /learn hub ─────────────────────────────────────────────────────────────── */
function hubPage(model) {
  const title = 'Free Trading Course — Learn to Trade, One Candle at a Time | Liquidity Theory';
  const desc = 'A free, no-account crypto trading course: price action, market structure, risk management, derivatives and liquidity theory — taught interactively with live charts.';
  const canonical = BASE_URL + '/learn/';
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'ItemList',
    itemListElement: model.flatMap(c => c.lessons).map((L, i) => ({
      '@type': 'ListItem', position: i + 1, url: BASE_URL + L.path, name: L.chapter.title
    }))
  };
  const courses = model.map(c => `
    <div class="toc-course" id="${c.courseSlug}">
      <h2 style="color:${c.accent}">Course ${c.courseNum}: ${esc(c.courseName)}</h2>
      <div class="toc-list">
        ${c.lessons.map(L => `<a href="${L.path}">${String(L.idx + 1).padStart(2, '0')} · ${esc(L.chapter.title)}</a>`).join('')}
      </div>
    </div>`).join('');
  return `${head(title, desc, canonical, jsonld)}
<body>
  <div class="wrap">
    ${BRAND}
    <div class="eyebrow" style="color:var(--teal)">Free · No account · No ads</div>
    <h1 class="title">Learn to Trade — the Full Curriculum</h1>
    <p style="color:var(--text2);margin-bottom:8px;">Every lesson below is free and interactive, with live charts and quizzes. Start at Course 1 if you're new.</p>
    <a class="cta" href="/">Open the interactive app →</a>
    <div style="margin-top:26px;">${courses}</div>
    <div class="foot">${DISCLAIMER}</div>
  </div>
</body>
</html>`;
}

/* ── Write everything ───────────────────────────────────────────────────────── */
function writeFile(rel, content) {
  const full = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

function main() {
  const courses = loadCourses();
  const model = buildModel(courses);
  const flat = model.flatMap(c => c.lessons);

  // Fresh /learn each run (drop stale pages)
  fs.rmSync(path.join(ROOT, 'learn'), { recursive: true, force: true });

  // Lesson pages with within-course prev/next
  model.forEach(c => {
    c.lessons.forEach((L, i) => {
      writeFile(`learn/${L.courseSlug}/${L.chapterSlug}/index.html`,
        lessonPage(L, c.lessons[i - 1] || null, c.lessons[i + 1] || null));
    });
  });

  // Hub
  writeFile('learn/index.html', hubPage(model));

  // sitemap.xml
  const today = new Date().toISOString().slice(0, 10);
  const urls = [BASE_URL + '/', BASE_URL + '/learn/'].concat(flat.map(L => BASE_URL + L.path));
  writeFile('sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(u => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n') +
    `\n</urlset>\n`);

  // robots.txt
  writeFile('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${BASE_URL}/sitemap.xml\n`);

  console.log(`gen-seo: ${flat.length} lesson pages across ${model.length} courses + hub, sitemap (${urls.length} urls), robots.txt`);
}

main();
