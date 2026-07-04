'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   Liquidity Theory — Community & Social
   lt-community.js  |  About Us, Discord, X/Twitter team, YouTube
   Public: renderCommunity(containerId)   ·   engine calls via showCommunity()

   UI is deliberately cohesive with the rest of the app: site surface (--bg3) +
   hairline borders for every card, the teal accent system, and JetBrains Mono.
   Platform brand colours (Discord blurple, YouTube red, BloFin orange) live ONLY
   on each card's icon + CTA via a per-card `--pc` variable, so the page reads as
   one terminal-native surface rather than three branded ad blocks.
   ═══════════════════════════════════════════════════════════════════════════ */

const LT_SOCIAL = {
  discord: 'https://discord.gg/LiquidityTheory',
  blofin:  'https://partner.blofin.com/d/LiquidityTheory',
  youtube: 'https://www.youtube.com/@LiquidityTheory',                 // ← swap for the real channel URL if different
  playlists: 'https://www.youtube.com/@LiquidityTheory/playlists',     // course playlists (linked, not embedded)
  team: [
    { handle: 'Captain_Kole', name: 'Zoran Kole', role: 'Founder, Liquidity Theory · CEO, GigaChad Ventures',
      bio: 'Crypto investor since 2013 · early $FTM backer · Bybit #1 PNL award winner.', url: 'https://x.com/Captain_Kole' },
    { handle: 'MikeBTC',      name: 'Michael',    role: 'Co-Founder, Liquidity Theory',
      bio: 'COO, GigaChad Ventures · CEO, PerpMonkey Management.', url: 'https://x.com/MikeBTC' }
  ]
};

function _commStyles() {
  if (document.getElementById('lt-community-styles')) return;
  const s = document.createElement('style');
  s.id = 'lt-community-styles';
  s.textContent = `
  .cm-wrap { width:100%; max-width:920px; margin:0 auto; padding:0 0 56px;
    font-family:'JetBrains Mono',monospace; }
  .cm-back-row { padding:14px 0 10px; }
  .cm-back-btn { display:inline-flex; align-items:center; gap:6px; background:none; border:none; color:var(--text3);
    font-family:'JetBrains Mono',monospace; font-size:12.5px; font-weight:600; cursor:pointer; padding:4px 0; transition:color .15s; }
  .cm-back-btn:hover { color:var(--teal); }

  /* hero */
  .cm-hero { position:relative; overflow:hidden; border:1px solid var(--border); border-radius:var(--radius-lg);
    background:radial-gradient(130% 150% at 0% 0%, rgba(0,212,212,.13), transparent 52%), var(--bg3);
    padding:26px 28px; }
  .cm-hero-title { font-family:'JetBrains Mono',monospace; font-size:clamp(22px,4.4vw,28px); letter-spacing:-0.7px;
    font-weight:800; line-height:1.05; color:var(--text); margin:0 0 11px; text-wrap:balance; }
  .cm-hero-title span { color:var(--teal); }
  .cm-hero-body { font-size:13.5px; line-height:1.7; color:var(--text2); max-width:64ch; margin:0; }
  .cm-hero-meta { display:flex; flex-wrap:wrap; gap:8px; margin-top:16px; }
  .cm-meta-chip { display:inline-flex; align-items:center; gap:6px; font-size:11px; font-weight:600; color:var(--text2);
    background:var(--bg4); border:1px solid var(--border2); border-radius:100px; padding:4px 11px; }
  .cm-meta-chip b { color:var(--teal); font-weight:700; }

  /* section heading — sentence-case, teal tick; no tracked-uppercase eyebrows */
  .cm-h { display:flex; align-items:center; gap:9px; margin:30px 0 12px;
    font-family:'JetBrains Mono',monospace; font-size:15px; font-weight:700; letter-spacing:-0.2px; color:var(--text); }
  .cm-h::before { content:""; width:7px; height:7px; border-radius:1px; background:var(--teal);
    box-shadow:0 0 8px rgba(0,212,212,.55); flex:none; }

  /* about / trust — plain site card (no side-stripe) */
  .cm-about { background:var(--bg3); border:1px solid var(--border); border-radius:var(--radius-lg); padding:20px 22px; }
  .cm-about p { font-size:13px; line-height:1.7; color:var(--text2); margin:0 0 12px; }
  .cm-about p:last-child { margin-bottom:0; }
  .cm-about strong { color:var(--text); font-weight:700; }
  .cm-about a { color:var(--teal); font-weight:600; text-decoration:none; }
  .cm-about a:hover { text-decoration:underline; }

  /* unified feature card — site surface; brand colour only on the icon + CTA (--pc) */
  .cm-feature { display:flex; align-items:center; gap:20px; flex-wrap:wrap;
    background:var(--bg3); border:1px solid var(--border); border-radius:var(--radius-lg); padding:20px 22px;
    transition:border-color .15s, transform .15s, box-shadow .15s; }
  .cm-feature:hover { border-color:color-mix(in srgb, var(--pc) 55%, var(--border)); transform:translateY(-2px);
    box-shadow:0 10px 26px -14px color-mix(in srgb, var(--pc) 60%, transparent); }
  .cm-feature--discord { --pc:#5865F2; --pc-txt:#fff; }
  .cm-feature--youtube { --pc:#ff0000; --pc-txt:#fff; }
  .cm-feature--blofin  { --pc:#ff6a1a; --pc-txt:#1a0f04; }
  .cm-feature-icon { width:54px; height:54px; border-radius:14px; background:var(--pc);
    display:flex; align-items:center; justify-content:center; flex:none;
    box-shadow:0 6px 20px -6px color-mix(in srgb, var(--pc) 70%, transparent); }
  .cm-feature-icon svg { width:30px; height:30px; }
  .cm-feature-info { flex:1; min-width:220px; }
  .cm-feature-info h3 { font-size:16px; font-weight:800; color:var(--text); margin:0 0 5px; display:flex; align-items:center; flex-wrap:wrap; gap:9px; }
  .cm-feature-info p { font-size:12.5px; line-height:1.65; color:var(--text2); margin:0; }
  .cm-feature-btn { display:inline-flex; align-items:center; gap:8px; background:var(--pc); color:var(--pc-txt);
    font-family:'JetBrains Mono',monospace; font-weight:700; font-size:13.5px; text-decoration:none;
    padding:11px 20px; border-radius:var(--radius); transition:filter .15s, transform .15s; white-space:nowrap; }
  .cm-feature-btn:hover { filter:brightness(1.08); transform:translateY(-1px); }
  .cm-members { display:inline-flex; align-items:center; gap:6px; font-size:10.5px; font-weight:700; color:var(--text2);
    background:var(--bg4); border:1px solid var(--border2); padding:2px 9px; border-radius:100px; letter-spacing:.2px; }
  .cm-members-dot { width:6px; height:6px; border-radius:50%; background:#3ba55d; box-shadow:0 0 6px #3ba55d; flex:none; }
  /* BloFin icon: white chip carrying the logo image (its mark is a wide wordmark, so the
     chip sizes to it instead of forcing a 54px square that the wordmark overflows). */
  .cm-feature--blofin .cm-feature-icon { background:#fff; width:auto; min-width:54px; max-width:124px; height:48px; padding:0 13px; overflow:hidden; }
  .cm-blofin-logo { height:22px; max-width:96px; width:auto; object-fit:contain; display:block; }
  .cm-blofin-word { font-family:'JetBrains Mono',monospace; font-size:20px; font-weight:800; color:#ff6a1a; }
  .cm-perks { display:flex; gap:6px; flex-wrap:wrap; margin-top:9px; }
  .cm-perk { font-size:10.5px; font-weight:600; color:var(--text2); background:var(--bg4);
    border:1px solid var(--border2); border-radius:20px; padding:3px 10px; white-space:nowrap; }

  /* team / X — two-up site cards */
  .cm-team { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  @media(max-width:640px){ .cm-team { grid-template-columns:1fr; } }
  .cm-card { display:flex; align-items:flex-start; gap:15px; background:var(--bg3); border:1px solid var(--border);
    border-radius:var(--radius-lg); padding:18px 20px; transition:border-color .15s, transform .15s; }
  .cm-card:hover { border-color:var(--border3); transform:translateY(-2px); }
  .cm-avatar { width:58px; height:58px; border-radius:50%; flex:none; object-fit:cover; background:var(--bg4); border:2px solid var(--border2); }
  .cm-avatar-fallback { width:58px; height:58px; border-radius:50%; flex:none; display:flex; align-items:center; justify-content:center;
    background:linear-gradient(135deg,var(--teal),#0a8a8a); color:#04201f; font-family:'JetBrains Mono',monospace; font-weight:800; font-size:22px; border:2px solid var(--border2); }
  .cm-card-info { flex:1; min-width:0; }
  .cm-card-name { font-size:15px; font-weight:800; color:var(--text); }
  .cm-card-handle { font-size:12.5px; color:var(--teal); font-weight:600; }
  .cm-card-role { font-size:10.5px; color:var(--text3); margin-top:3px; line-height:1.4; }
  .cm-card-bio { font-size:11px; color:var(--text2); margin-top:6px; line-height:1.5; }
  .cm-x-btn { display:inline-flex; align-items:center; gap:6px; background:var(--bg); border:1px solid var(--border2); color:var(--text);
    font-family:'JetBrains Mono',monospace; font-weight:700; font-size:12px; text-decoration:none; padding:8px 13px; border-radius:var(--radius); transition:border-color .15s, background .15s; white-space:nowrap; flex:none; align-self:center; }
  .cm-x-btn:hover { background:var(--bg2); border-color:var(--teal); }

  .cm-foot { text-align:center; font-size:11.5px; color:var(--text3); margin-top:32px; line-height:1.8; }
  `;
  document.head.appendChild(s);
}

function _commTeamCard(m) {
  const initials = m.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  // Avatar pulled live from the account's social profile; falls back to initials.
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
      <a class="cm-x-btn" href="${m.url}" target="_blank" rel="noopener noreferrer">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        Follow
      </a>
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

      <!-- Hero / About -->
      <div class="cm-hero">
        <h1 class="cm-hero-title">About <span>Liquidity Theory</span></h1>
        <p class="cm-hero-body">
          A hub for traders — built around learning, real market analysis, and a community that grows
          together. We break down price action, liquidity, and risk into a structured curriculum, then put
          it into practice. Whether you're opening your first chart or refining a system, this is where
          traders come to level up — together.
        </p>
        <div class="cm-hero-meta">
          <span class="cm-meta-chip"><b>Free</b> forever</span>
          <span class="cm-meta-chip"><b>No account</b> needed</span>
          <span class="cm-meta-chip"><b>~9,000</b> in the Discord</span>
        </div>
      </div>

      <!-- Honest framing / trust -->
      <h2 class="cm-h">Who we are &amp; what we promise</h2>
      <div class="cm-about">
        <p>We're two crypto traders — <a href="${LT_SOCIAL.team[0].url}" target="_blank" rel="noopener noreferrer">${LT_SOCIAL.team[0].name}</a>
        and <a href="${LT_SOCIAL.team[1].url}" target="_blank" rel="noopener noreferrer">${LT_SOCIAL.team[1].name}</a> —
        not licensed financial advisors, and we won't pretend to be. We built Liquidity Theory because most free trading content
        online is hype, noise, or a funnel to something paid. We wanted one place that teaches the fundamentals honestly, for
        free, with no account required.</p>
        <p><strong>What we don't do:</strong> we don't sell signals, we don't promise profits, and we don't believe anyone has a
        crystal ball. Trading is genuinely hard and <strong>most people who attempt it lose money</strong>. Our goal is to make you
        a more informed, more disciplined trader who thinks for themselves — not to convince you that trading is easy or a shortcut.</p>
        <p>Everything here is educational. Verify what you learn, manage your risk, and never trade money you can't afford to lose.</p>
      </div>

      <!-- Discord -->
      <h2 class="cm-h">Join the community</h2>
      <div class="cm-feature cm-feature--discord">
        <div class="cm-feature-icon">
          <svg viewBox="0 0 24 24" fill="#fff"><path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.099.246.197.373.291a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.893.077.077 0 0 0-.041.106c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
        </div>
        <div class="cm-feature-info">
          <h3>The Liquidity Theory Discord <span class="cm-members"><span class="cm-members-dot"></span>~9,000 members</span></h3>
          <p>Our home base — learning, live market analysis, trade ideas, and daily discussion. Free to join.</p>
        </div>
        <a class="cm-feature-btn" href="${LT_SOCIAL.discord}" target="_blank" rel="noopener noreferrer">
          <i data-lucide="message-circle" style="width:16px;height:16px;"></i> Join the Discord
        </a>
      </div>

      <!-- Team / X -->
      <h2 class="cm-h">Follow the team on X</h2>
      <div class="cm-team">
        ${LT_SOCIAL.team.map(_commTeamCard).join('')}
      </div>

      <!-- YouTube — links to the channel's course playlists (no embed) -->
      <h2 class="cm-h">Watch on YouTube</h2>
      <div class="cm-feature cm-feature--youtube">
        <div class="cm-feature-icon">
          <svg viewBox="0 0 24 24" fill="#fff"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
        </div>
        <div class="cm-feature-info">
          <h3>Liquidity Theory on YouTube</h3>
          <p>Full lesson breakdowns, market analysis and trade reviews — organised into course playlists so you can follow along in order.</p>
        </div>
        <a class="cm-feature-btn" href="${LT_SOCIAL.playlists}" target="_blank" rel="noopener noreferrer">
          <i data-lucide="play-circle" style="width:16px;height:16px;"></i> Browse Playlists
        </a>
      </div>

      <!-- BloFin — optional support -->
      <h2 class="cm-h">Support this project <span style="font-weight:600;color:var(--text3);font-size:12px;">(optional)</span></h2>
      <div class="cm-feature cm-feature--blofin">
        <div class="cm-feature-icon">
          <img class="cm-blofin-logo" src="https://cdn.brandfetch.io/blofin.com/w/400/h/100/logo" alt="BloFin"
               onerror="if(this.dataset.s!=='1'){this.dataset.s='1';this.src='https://logo.clearbit.com/blofin.com';}else if(this.dataset.s!=='2'){this.dataset.s='2';this.src='https://images.media-outreach.com/Thumb/318x213/378352/Blofin+logo.png';}else{var w=document.createElement('span');w.className='cm-blofin-word';w.textContent='BloFin';this.replaceWith(w);}" />
        </div>
        <div class="cm-feature-info">
          <h3>How this stays free</h3>
          <p>Liquidity Theory is free, with no ads or paywall. If you decide to trade — only ever with money you can afford to lose — using our BloFin referral sends a small commission our way at no extra cost to you. Entirely optional, and never required to use anything here.</p>
          <div class="cm-perks">
            <span class="cm-perk">Lower trading fees</span>
            <span class="cm-perk">Deep liquidity</span>
            <span class="cm-perk">Supports the project</span>
          </div>
        </div>
        <a class="cm-feature-btn" href="${LT_SOCIAL.blofin}" target="_blank" rel="noopener noreferrer">
          <i data-lucide="external-link" style="width:16px;height:16px;"></i> Visit BloFin
        </a>
      </div>

      <div class="cm-foot">
        Liquidity Theory · Learn · Analyze · Trade together<br/>
        Trading involves substantial risk. Nothing here is financial advice.
      </div>
    </div>
  `;

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

window.renderCommunity = renderCommunity;
window.LT_SOCIAL = LT_SOCIAL;
