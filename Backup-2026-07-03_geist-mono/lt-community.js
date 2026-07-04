'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   Liquidity Theory — Community & Social
   lt-community.js  |  About, the promise, channels, team, support
   Public: renderCommunity(containerId)   ·   engine calls via showCommunity()

   Overhauled 2026-07-03 to flagship grammar: ONE surface system (site cards +
   hairlines), quiet outline CTAs, platform brand colour reduced to a low-alpha
   icon tint + row-hover hint — never filled slabs or foreign-coloured buttons.
   No runtime third-party fetches except the team avatars (unavatar, with a
   deterministic initials fallback).
   ═══════════════════════════════════════════════════════════════════════════ */

const LT_SOCIAL = {
  discord: 'https://discord.gg/LiquidityTheory',
  blofin:  'https://partner.blofin.com/d/LiquidityTheory',
  youtube: 'https://www.youtube.com/@LiquidityTheory',
  playlists: 'https://www.youtube.com/@LiquidityTheory/playlists',
  team: [
    { handle: 'Captain_Kole', name: 'Zoran Kole', role: 'Founder, Liquidity Theory · CEO, GigaChad Ventures',
      bio: 'Crypto investor since 2013 · early $FTM backer · Bybit #1 PNL award winner.', url: 'https://x.com/Captain_Kole' },
    { handle: 'MikeBTC',      name: 'Michael',    role: 'Co-Founder, Liquidity Theory',
      bio: 'COO, GigaChad Ventures · CEO, PerpMonkey Management.', url: 'https://x.com/MikeBTC' }
  ]
};

function _commStyles() {
  LTUtils.injectStyles('lt-community-styles', `
  .cm-wrap { width:100%; max-width:860px; margin:0 auto; padding:0 0 56px;
    font-family:'JetBrains Mono',monospace; }
  .cm-back-row { padding:14px 0 18px; }
  .cm-back-btn { display:inline-flex; align-items:center; gap:6px; background:none; border:none; color:var(--text3);
    font-family:inherit; font-size:12.5px; font-weight:600; cursor:pointer; padding:4px 0; transition:color .15s; }
  .cm-back-btn:hover { color:var(--teal); }

  /* ── intro: plain page header, no boxed hero ── */
  .cm-title { font-size:clamp(24px,4.6vw,31px); letter-spacing:-0.8px; font-weight:800; line-height:1.08;
    color:var(--text); margin:0 0 14px; text-wrap:balance; }
  .cm-title span { color:var(--teal); }
  .cm-lede { font-size:14px; line-height:1.75; color:var(--text2); max-width:62ch; margin:0; }

  /* inline stat strip — hairline separated, no chips */
  .cm-strip { display:flex; flex-wrap:wrap; align-items:center; gap:10px 0; margin:22px 0 0; }
  .cm-stat { display:flex; align-items:baseline; gap:7px; padding:0 22px; border-left:1px solid var(--border2); }
  .cm-stat:first-child { padding-left:0; border-left:none; }
  .cm-stat b { font-size:16px; font-weight:800; color:var(--text); letter-spacing:-0.3px; }
  .cm-stat span { font-size:11.5px; color:var(--text3); }
  .cm-live-dot { width:6px; height:6px; border-radius:50%; background:#3ba55d; align-self:center; flex:none; }

  .cm-rule { border:none; border-top:1px solid var(--border); margin:30px 0; }

  /* section label — matches the app home's quiet sentence-case labels */
  .cm-h { font-size:12.5px; font-weight:700; letter-spacing:.3px; color:var(--text3); margin:0 0 12px; }

  /* ── the promise: two structured columns in one hairline card ── */
  .cm-promise { display:grid; grid-template-columns:1.15fr 1fr; background:var(--bg3);
    border:1px solid var(--border); border-radius:var(--radius-lg); overflow:hidden; }
  @media(max-width:680px){ .cm-promise { grid-template-columns:1fr; } }
  .cm-promise-col { padding:20px 22px; }
  .cm-promise-col + .cm-promise-col { border-left:1px solid var(--border); }
  @media(max-width:680px){ .cm-promise-col + .cm-promise-col { border-left:none; border-top:1px solid var(--border); } }
  .cm-promise-col h3 { font-size:13px; font-weight:800; color:var(--text); margin:0 0 10px; letter-spacing:-0.2px; }
  .cm-promise-col p { font-size:12.5px; line-height:1.75; color:var(--text2); margin:0 0 10px; }
  .cm-promise-col p:last-child { margin-bottom:0; }
  .cm-promise-col a { color:var(--teal); font-weight:600; text-decoration:none; }
  .cm-promise-col a:hover { text-decoration:underline; }
  .cm-never { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:11px; }
  .cm-never li { display:flex; gap:10px; font-size:12.5px; line-height:1.6; color:var(--text2); }
  .cm-never li i { width:15px; height:15px; color:var(--pink, #ff2e88); flex:none; margin-top:2px; }
  .cm-never li b { color:var(--text); font-weight:700; }
  .cm-promise-note { margin-top:14px; padding-top:12px; border-top:1px dashed var(--border2);
    font-size:11.5px; line-height:1.65; color:var(--text3); }

  /* ── channels: one card, hairline-divided link rows ── */
  .cm-rows { background:var(--bg3); border:1px solid var(--border); border-radius:var(--radius-lg); overflow:hidden; }
  .cm-row { --hue:var(--teal); display:flex; align-items:center; gap:16px; padding:18px 20px;
    text-decoration:none; transition:background-color .14s; }
  .cm-row + .cm-row { border-top:1px solid var(--border); }
  .cm-row:hover { background:color-mix(in srgb, var(--hue) 4%, transparent); }
  .cm-row-ic { width:38px; height:38px; border-radius:10px; flex:none; display:flex; align-items:center; justify-content:center;
    background:color-mix(in srgb, var(--hue) 10%, transparent); border:1px solid color-mix(in srgb, var(--hue) 22%, transparent); }
  .cm-row-ic svg { width:19px; height:19px; color:var(--hue); fill:var(--hue); }
  .cm-row-info { flex:1; min-width:0; }
  .cm-row-title { display:flex; align-items:center; gap:9px; flex-wrap:wrap; font-size:13.5px; font-weight:800; color:var(--text); letter-spacing:-0.2px; }
  .cm-row-desc { font-size:12px; line-height:1.6; color:var(--text3); margin-top:3px; }
  .cm-row-meta { display:inline-flex; align-items:center; gap:6px; font-size:10.5px; font-weight:700; color:var(--text3); }
  .cm-row-cta { display:inline-flex; align-items:center; gap:7px; flex:none; align-self:center;
    font-size:12px; font-weight:700; color:var(--text2); background:transparent;
    border:1px solid var(--border2); border-radius:var(--radius); padding:8px 14px; white-space:nowrap;
    transition:border-color .15s, color .15s; }
  .cm-row:hover .cm-row-cta { border-color:color-mix(in srgb, var(--hue) 45%, var(--border2)); color:var(--text); }
  .cm-row-cta i { width:13px; height:13px; }
  @media(max-width:560px){
    .cm-row { flex-wrap:wrap; }
    .cm-row-info { flex:1 1 calc(100% - 54px); }
    .cm-row-cta { margin-left:54px; }
  }

  /* ── team ── */
  .cm-team { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  @media(max-width:640px){ .cm-team { grid-template-columns:1fr; } }
  .cm-card { display:flex; align-items:flex-start; gap:14px; background:var(--bg3); border:1px solid var(--border);
    border-radius:var(--radius-lg); padding:18px 20px; transition:border-color .15s; }
  .cm-card:hover { border-color:var(--border3); }
  .cm-avatar { width:52px; height:52px; border-radius:50%; flex:none; object-fit:cover; background:var(--bg4); border:1px solid var(--border2); }
  .cm-avatar-fallback { width:52px; height:52px; border-radius:50%; flex:none; display:flex; align-items:center; justify-content:center;
    background:var(--bg4); border:1px solid var(--border2); color:var(--teal); font-family:inherit; font-weight:800; font-size:19px; }
  .cm-card-info { flex:1; min-width:0; }
  .cm-card-name { font-size:14.5px; font-weight:800; color:var(--text); letter-spacing:-0.2px; }
  .cm-card-handle { font-size:12px; color:var(--teal); font-weight:600; margin-top:1px; }
  .cm-card-role { font-size:10.5px; color:var(--text3); margin-top:5px; line-height:1.5; }
  .cm-card-bio { font-size:11px; color:var(--text2); margin-top:5px; line-height:1.55; }
  .cm-x-btn { display:inline-flex; align-items:center; gap:6px; background:transparent; border:1px solid var(--border2); color:var(--text2);
    font-family:inherit; font-weight:700; font-size:11.5px; text-decoration:none; padding:7px 12px; border-radius:var(--radius);
    transition:border-color .15s, color .15s; white-space:nowrap; flex:none; align-self:center; }
  .cm-x-btn:hover { border-color:var(--text3); color:var(--text); }
  .cm-x-btn svg { width:12px; height:12px; }

  /* ── support: quiet single card ── */
  .cm-support { background:var(--bg3); border:1px solid var(--border); border-radius:var(--radius-lg); padding:20px 22px; }
  .cm-support p { font-size:12.5px; line-height:1.75; color:var(--text2); margin:0 0 12px; max-width:70ch; }
  .cm-support-row { display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap; }
  .cm-support-note { font-size:11px; color:var(--text3); }
  .cm-support-cta { display:inline-flex; align-items:center; gap:8px; font-size:12px; font-weight:700; color:var(--text2);
    text-decoration:none; border:1px solid var(--border2); border-radius:var(--radius); padding:9px 16px;
    transition:border-color .15s, color .15s; white-space:nowrap; }
  .cm-support-cta:hover { border-color:color-mix(in srgb, #ff6a1a 50%, var(--border2)); color:var(--text); }
  .cm-support-cta i { width:13px; height:13px; }
  .cm-support h3 { font-size:13.5px; font-weight:800; color:var(--text); margin:0 0 10px; letter-spacing:-0.2px; }

  .cm-foot { text-align:center; font-size:11px; color:var(--text3); margin-top:34px; line-height:1.9; }
  `);
}

const _CM_X_GLYPH = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>';

function _commTeamCard(m) {
  const initials = m.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const avatar = `https://unavatar.io/twitter/${m.handle}?fallback=false`;
  return `
    <div class="cm-card">
      <img class="cm-avatar" src="${avatar}" alt="${m.name}" loading="lazy"
           onerror="this.outerHTML='<div class=&quot;cm-avatar-fallback&quot;>${initials}</div>'" />
      <div class="cm-card-info">
        <div class="cm-card-name">${m.name}</div>
        <div class="cm-card-handle">@${m.handle}</div>
        <div class="cm-card-role">${m.role}</div>
        ${m.bio ? `<div class="cm-card-bio">${m.bio}</div>` : ''}
      </div>
      <a class="cm-x-btn" href="${m.url}" target="_blank" rel="noopener noreferrer">${_CM_X_GLYPH} Follow</a>
    </div>`;
}

function renderCommunity(containerId) {
  _commStyles();
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="cm-wrap">
      <div class="cm-back-row">
        <button class="cm-back-btn" onclick="typeof init==='function'&&init(false)">
          <i data-lucide="arrow-left" style="width:15px;height:15px;"></i> Back to Course
        </button>
      </div>

      <!-- page header — plain, no boxed hero -->
      <h1 class="cm-title">About <span>Liquidity Theory</span></h1>
      <p class="cm-lede">
        A free, open place to learn to trade — structured courses, real market analysis, and a community
        that grows together. Whether you're opening your first chart or refining a system, this is where
        it clicks.
      </p>
      <div class="cm-strip">
        <div class="cm-stat"><span class="cm-live-dot"></span><b>9,000+</b><span>in the Discord</span></div>
        <div class="cm-stat"><b>$0</b><span>forever · no account</span></div>
        <div class="cm-stat"><b>83</b><span>interactive lessons</span></div>
      </div>

      <hr class="cm-rule" />

      <!-- the promise — structured, scannable -->
      <div class="cm-h">Who we are &amp; what we promise</div>
      <div class="cm-promise">
        <div class="cm-promise-col">
          <h3>Two traders, no funnel</h3>
          <p>We're <a href="${LT_SOCIAL.team[0].url}" target="_blank" rel="noopener noreferrer">${LT_SOCIAL.team[0].name}</a>
          and <a href="${LT_SOCIAL.team[1].url}" target="_blank" rel="noopener noreferrer">${LT_SOCIAL.team[1].name}</a> —
          crypto traders, not licensed financial advisors, and we won't pretend to be.</p>
          <p>Most free trading content online is hype, noise, or a funnel to something paid. We built one place
          that teaches the fundamentals honestly, for free, with no account required.</p>
          <div class="cm-promise-note">Everything here is educational. Verify what you learn, manage your risk,
          and never trade money you can't afford to lose.</div>
        </div>
        <div class="cm-promise-col">
          <h3>What we never do</h3>
          <ul class="cm-never">
            <li><i data-lucide="x"></i><span><b>No signals.</b> We teach you to read markets, not to copy trades.</span></li>
            <li><i data-lucide="x"></i><span><b>No profit promises.</b> Trading is hard — most people who attempt it lose money.</span></li>
            <li><i data-lucide="x"></i><span><b>No paywall, ever.</b> The whole curriculum is simply here, open to anyone.</span></li>
          </ul>
        </div>
      </div>

      <hr class="cm-rule" />

      <!-- channels — one card, link rows -->
      <div class="cm-h">Find us</div>
      <div class="cm-rows">
        <a class="cm-row" style="--hue:#5865F2" href="${LT_SOCIAL.discord}" target="_blank" rel="noopener noreferrer">
          <span class="cm-row-ic"><svg viewBox="0 0 24 24"><path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.099.246.197.373.291a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.893.077.077 0 0 0-.041.106c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg></span>
          <span class="cm-row-info">
            <span class="cm-row-title">Discord <span class="cm-row-meta"><span class="cm-live-dot"></span>9,000+ members</span></span>
            <span class="cm-row-desc">Home base — learning, live market analysis, trade ideas, daily discussion.</span>
          </span>
          <span class="cm-row-cta">Join <i data-lucide="arrow-up-right"></i></span>
        </a>
        <a class="cm-row" style="--hue:#ff4444" href="${LT_SOCIAL.playlists}" target="_blank" rel="noopener noreferrer">
          <span class="cm-row-ic"><svg viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg></span>
          <span class="cm-row-info">
            <span class="cm-row-title">YouTube</span>
            <span class="cm-row-desc">Lesson breakdowns, market analysis and trade reviews — organised into course playlists.</span>
          </span>
          <span class="cm-row-cta">Watch <i data-lucide="arrow-up-right"></i></span>
        </a>
        <a class="cm-row" style="--hue:#e8ebf0" href="https://x.com/Captain_Kole" target="_blank" rel="noopener noreferrer">
          <span class="cm-row-ic">${_CM_X_GLYPH}</span>
          <span class="cm-row-info">
            <span class="cm-row-title">X / Twitter</span>
            <span class="cm-row-desc">Daily market takes from the founders.</span>
          </span>
          <span class="cm-row-cta">Follow <i data-lucide="arrow-up-right"></i></span>
        </a>
      </div>

      <hr class="cm-rule" />

      <!-- team -->
      <div class="cm-h">The team</div>
      <div class="cm-team">
        ${LT_SOCIAL.team.map(_commTeamCard).join('')}
      </div>

      <hr class="cm-rule" />

      <!-- support -->
      <div class="cm-h">How this stays free</div>
      <div class="cm-support">
        <p>Liquidity Theory has no ads and no paywall. If you ever decide to trade — only with money you can
        afford to lose — opening your account through our <strong>BloFin</strong> referral sends a small
        commission our way at no extra cost to you. That's the entire business model.</p>
        <div class="cm-support-row">
          <span class="cm-support-note">Entirely optional — never required to use anything here.</span>
          <a class="cm-support-cta" href="${LT_SOCIAL.blofin}" target="_blank" rel="noopener noreferrer">
            Visit BloFin <i data-lucide="arrow-up-right"></i>
          </a>
        </div>
      </div>

      <div class="cm-foot">
        Liquidity Theory · learn, analyze, trade together<br/>
        Trading involves substantial risk. Nothing here is financial advice.
      </div>
    </div>
  `;

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

window.renderCommunity = renderCommunity;
window.LT_SOCIAL = LT_SOCIAL;
