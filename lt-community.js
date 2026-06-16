'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   Liquidity Theory — Community & Social
   lt-community.js  |  About Us, Discord, X/Twitter team, YouTube
   Public: renderCommunity(containerId)   ·   engine calls via showCommunity()
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
  .cm-wrap { width:100%; max-width:1000px; margin:0 auto; padding:0 0 56px; }
  .cm-back-row { padding:14px 0 6px; }
  .cm-back-btn { display:inline-flex; align-items:center; gap:6px; background:none; border:none; color:var(--teal); font-family:'JetBrains Mono',monospace; font-size:13px; font-weight:600; cursor:pointer; padding:0; }
  .cm-back-btn:hover { opacity:.8; }

  /* hero */
  .cm-hero { position:relative; overflow:hidden; border:1px solid var(--border); border-radius:var(--radius-lg);
    background:radial-gradient(120% 140% at 0% 0%, rgba(0,212,212,.12), transparent 55%), var(--bg3);
    padding:24px 26px 22px; margin:6px 0 12px; }
  .cm-hero-eyebrow { font-size:10.5px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--teal); margin-bottom:7px; }
  .cm-hero-title { font-family:'JetBrains Mono',monospace; font-size:24px; letter-spacing:-0.6px; font-weight:800; line-height:1; color:var(--text); margin-bottom:9px; }
  .cm-hero-title span { color:var(--teal); }
  .cm-hero-body { font-size:13.5px; line-height:1.7; color:var(--text2); max-width:680px; }

  .cm-section-label { font-family:'JetBrains Mono',monospace; font-size:12.5px; font-weight:700; text-transform:uppercase; letter-spacing:1.2px; color:var(--text3); margin:22px 0 10px; }

  /* discord feature card */
  .cm-discord { display:flex; align-items:center; gap:22px; flex-wrap:wrap;
    border:1px solid rgba(88,101,242,.4); border-radius:var(--radius-lg);
    background:linear-gradient(110deg, rgba(88,101,242,.16), rgba(88,101,242,.04));
    padding:24px 26px; }
  .cm-discord-icon { width:58px; height:58px; border-radius:16px; background:#5865F2; display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 8px 24px rgba(88,101,242,.4); }
  .cm-discord-info { flex:1; min-width:220px; }
  .cm-discord-info h3 { font-size:18px; font-weight:800; color:var(--text); margin:0 0 5px; }
  .cm-discord-members { display:inline-flex; align-items:center; gap:6px; font-size:11px; font-weight:700; color:#9aa6ff; background:rgba(88,101,242,.14); border:1px solid rgba(88,101,242,.32); padding:2px 9px; border-radius:100px; margin-left:9px; vertical-align:middle; letter-spacing:.3px; }
  .cm-discord-dot { width:6px; height:6px; border-radius:50%; background:#3ba55d; box-shadow:0 0 6px #3ba55d; flex-shrink:0; }
  .cm-discord-info p { font-size:13px; line-height:1.6; color:var(--text2); margin:0; }
  .cm-discord-btn { display:inline-flex; align-items:center; gap:8px; background:#5865F2; color:#fff; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:14px; text-decoration:none; padding:12px 22px; border-radius:var(--radius); transition:all .15s; white-space:nowrap; }
  .cm-discord-btn:hover { background:#4752c4; transform:translateY(-1px); box-shadow:0 8px 20px rgba(88,101,242,.45); }

  /* team / X */
  .cm-team { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  @media(max-width:640px){ .cm-team { grid-template-columns:1fr; } }
  .cm-card { display:flex; align-items:flex-start; gap:16px; background:var(--bg3); border:1px solid var(--border); border-radius:var(--radius-lg); padding:18px 20px; transition:all .15s; }
  .cm-card:hover { border-color:var(--border3); transform:translateY(-2px); }
  .cm-avatar { width:62px; height:62px; border-radius:50%; flex-shrink:0; object-fit:cover; background:var(--bg4); border:2px solid var(--border2); }
  .cm-avatar-fallback { width:62px; height:62px; border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center;
    background:linear-gradient(135deg,var(--teal),#0a8a8a); color:#04201f; font-family:'JetBrains Mono',monospace; font-weight:800; font-size:24px; border:2px solid var(--border2); }
  .cm-card-info { flex:1; min-width:0; }
  .cm-card-name { font-size:16px; font-weight:800; color:var(--text); }
  .cm-card-handle { font-size:13px; color:var(--teal); font-weight:600; }
  .cm-card-role { font-size:11px; color:var(--text3); margin-top:3px; }
  .cm-card-bio { font-size:11px; color:var(--text2); margin-top:5px; line-height:1.5; }
  .cm-x-btn { display:inline-flex; align-items:center; gap:6px; background:#000; border:1px solid var(--border3); color:#fff; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:12px; text-decoration:none; padding:8px 14px; border-radius:var(--radius); transition:all .15s; white-space:nowrap; }
  .cm-x-btn:hover { background:#1a1a1a; border-color:var(--teal); }

  /* youtube — clean feature card (links to playlists, no embed) */
  .cm-yt { display:flex; align-items:center; gap:22px; flex-wrap:wrap;
    border:1px solid rgba(255,0,0,.35); border-radius:var(--radius-lg);
    background:linear-gradient(110deg, rgba(255,0,0,.12), rgba(255,0,0,.03)); padding:22px 26px; }
  .cm-yt-icon { width:58px; height:58px; border-radius:16px; background:#FF0000; display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 8px 24px rgba(255,0,0,.32); }
  .cm-yt-info { flex:1; min-width:220px; }
  .cm-yt-info h3 { font-size:18px; font-weight:800; color:var(--text); margin:0 0 5px; }
  .cm-yt-info p { font-size:13px; color:var(--text2); margin:0; line-height:1.6; }
  .cm-yt-btn { display:inline-flex; align-items:center; gap:8px; background:#FF0000; color:#fff; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:14px; text-decoration:none; padding:12px 22px; border-radius:var(--radius); transition:all .15s; white-space:nowrap; }
  .cm-yt-btn:hover { background:#cc0000; transform:translateY(-1px); box-shadow:0 8px 20px rgba(255,0,0,.4); }

  /* blofin — trade with us (signature orange, black/white accents) */
  /* honest framing / trust */
  .cm-about { background:var(--bg3); border:1px solid var(--border); border-left:3px solid var(--teal); border-radius:var(--radius-lg); padding:20px 22px; }
  .cm-about p { font-size:13.5px; line-height:1.7; color:var(--text2); margin:0 0 12px; }
  .cm-about p:last-child { margin-bottom:0; }
  .cm-about strong { color:var(--text); font-weight:700; }
  .cm-about a { color:var(--teal); font-weight:600; }

  /* blofin — support card (signature orange, black/white accents) */
  .cm-blofin { display:flex; align-items:center; gap:22px; flex-wrap:wrap;
    border:1px solid rgba(255,106,26,.45); border-radius:var(--radius-lg);
    background:linear-gradient(110deg, rgba(255,106,26,.15), rgba(255,106,26,.03)); padding:22px 26px; }
  .cm-blofin-brand { display:flex; align-items:center; gap:12px; flex-shrink:0; }
  .cm-blofin-chip { background:#fff; border-radius:11px; padding:7px 13px; display:flex; align-items:center; box-shadow:0 2px 10px rgba(0,0,0,.3); }
  .cm-blofin-logo { height:28px; width:auto; display:block; }
  .cm-blofin-word { font-family:'JetBrains Mono',monospace; font-size:28px; font-weight:800; color:#ff6a1a; letter-spacing:.3px; }
  .cm-blofin-info { flex:1; min-width:240px; }
  .cm-blofin-info h3 { font-size:18px; font-weight:800; color:var(--text); margin:0 0 5px; }
  .cm-blofin-info p { font-size:13px; line-height:1.65; color:var(--text2); margin:0 0 9px; }
  .cm-blofin-perks { display:flex; gap:6px; flex-wrap:wrap; }
  .cm-blofin-perk { font-size:10.5px; font-weight:700; color:#ff8b4d; background:rgba(255,106,26,.1); border:1px solid rgba(255,106,26,.32); border-radius:20px; padding:3px 10px; white-space:nowrap; }
  .cm-blofin-btn { display:inline-flex; align-items:center; gap:8px; background:linear-gradient(110deg,#ff7a2e,#ff5c00); color:#1a0f04;
    font-family:'JetBrains Mono',monospace; font-weight:800; font-size:14px; text-decoration:none; padding:12px 22px; border-radius:var(--radius); transition:all .15s; white-space:nowrap; }
  .cm-blofin-btn:hover { filter:brightness(1.08); transform:translateY(-1px); box-shadow:0 8px 22px rgba(255,92,0,.42); }

  .cm-foot { text-align:center; font-size:12px; color:var(--text3); margin-top:28px; line-height:1.7; }
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
        <div class="cm-hero-eyebrow">Community &amp; Social</div>
        <div class="cm-hero-title">About <span>Liquidity Theory</span></div>
        <div class="cm-hero-body">
          Liquidity Theory is a hub for traders — built around learning, real market analysis, and a community
          that grows together. We break down price action, liquidity, and risk into a structured curriculum,
          then put it into practice. Whether you're opening your first chart or refining a system, this is where
          traders come to level up — together.
        </div>
      </div>

      <!-- Honest framing / trust -->
      <div class="cm-section-label">Who We Are &amp; What We Promise</div>
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
      <div class="cm-section-label">Join the Community</div>
      <div class="cm-discord">
        <div class="cm-discord-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff"><path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.099.246.197.373.291a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.893.077.077 0 0 0-.041.106c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
        </div>
        <div class="cm-discord-info">
          <h3>The Liquidity Theory Discord <span class="cm-discord-members"><span class="cm-discord-dot"></span>~9,000 members</span></h3>
          <p>Our home base — a hub for learning, bringing traders together, education, live market analysis, trade ideas and daily discussion. Free to join.</p>
        </div>
        <a class="cm-discord-btn" href="${LT_SOCIAL.discord}" target="_blank" rel="noopener noreferrer">
          <i data-lucide="message-circle" style="width:16px;height:16px;"></i> Join the Discord
        </a>
      </div>

      <!-- Team / X -->
      <div class="cm-section-label">Follow the Team on X</div>
      <div class="cm-team">
        ${LT_SOCIAL.team.map(_commTeamCard).join('')}
      </div>

      <!-- YouTube — links to the channel's course playlists (no embed) -->
      <div class="cm-section-label">Watch on YouTube</div>
      <div class="cm-yt">
        <div class="cm-yt-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
        </div>
        <div class="cm-yt-info">
          <h3>Liquidity Theory on YouTube</h3>
          <p>Full lesson breakdowns, market analysis and trade reviews — organised into course playlists so you can follow along in order.</p>
        </div>
        <a class="cm-yt-btn" href="${LT_SOCIAL.playlists}" target="_blank" rel="noopener noreferrer">
          <i data-lucide="play-circle" style="width:16px;height:16px;"></i> Browse Playlists
        </a>
      </div>

      <!-- BloFin — optional support -->
      <div class="cm-section-label">Support This Project (Optional)</div>
      <div class="cm-blofin">
        <div class="cm-blofin-brand">
          <span class="cm-blofin-chip">
            <img class="cm-blofin-logo" src="https://cdn.brandfetch.io/blofin.com/w/400/h/100/logo" alt="BloFin"
                 onerror="if(this.dataset.s!=='1'){this.dataset.s='1';this.src='https://logo.clearbit.com/blofin.com';}else if(this.dataset.s!=='2'){this.dataset.s='2';this.src='https://images.media-outreach.com/Thumb/318x213/378352/Blofin+logo.png';}else{var w=document.createElement('span');w.className='cm-blofin-word';w.textContent='BloFin';this.closest('.cm-blofin-chip').replaceWith(w);}" />
          </span>
        </div>
        <div class="cm-blofin-info">
          <h3>How this stays free</h3>
          <p>Liquidity Theory is free, with no ads or paywall. If you decide to trade — only ever with money you can afford to lose — using our BloFin referral sends a small commission our way at no extra cost to you. Entirely optional, and never required to use anything here.</p>
          <div class="cm-blofin-perks">
            <span class="cm-blofin-perk">Lower trading fees</span>
            <span class="cm-blofin-perk">Deep liquidity</span>
            <span class="cm-blofin-perk">Supports the project</span>
          </div>
        </div>
        <a class="cm-blofin-btn" href="${LT_SOCIAL.blofin}" target="_blank" rel="noopener noreferrer">
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
