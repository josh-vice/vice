/* VICE TERMINAL — MEE6 welcome-card banners (neon-noir terminal brand).
   Render ratio 545:127 at 2x (1090x254) PNG via @resvg/resvg-js with real fonts:
   Barlow Condensed (wordmark) + JetBrains Mono (terminal text). Flamingo = vice-terminal.png. */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const W = 1090, H = 254;
const FONTS = [
  'JetBrainsMono-Regular', 'JetBrainsMono-Medium', 'JetBrainsMono-Bold',
  'BarlowCondensed-SemiBold', 'BarlowCondensed-Bold', 'BarlowCondensed-ExtraBold', 'BarlowCondensed-Black',
].map(f => path.join(__dirname, 'fonts', `${f}.ttf`));

const C = {
  bg: '#08070f', cyan: '#00d4d4', magenta: '#ff2e88', gold: '#ffcc00',
  green: '#21d196', text: '#f6f5fb', text2: '#a8a3bb', text3: '#8b85a3',
};
const FLAMINGO = 'data:image/png;base64,' +
  fs.readFileSync(path.join(__dirname, '..', 'vice-terminal.png')).toString('base64');

function grid() {
  let g = '';
  for (let x = 0; x <= W; x += 44) g += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#ffffff" stroke-opacity="0.022"/>`;
  for (let y = 0; y <= H; y += 44) g += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#ffffff" stroke-opacity="0.022"/>`;
  // subtle scanlines (terminal cue)
  for (let y = 0; y < H; y += 4) g += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#000000" stroke-opacity="0.10"/>`;
  return g;
}

// faint candlestick ticks behind the flamingo — a quiet "trading terminal" texture
function ticks(seed) {
  let s = '', x0 = 612, x1 = 1058, n = 11, step = (x1 - x0) / n, top = 54, bot = 196;
  let sd = seed; const rnd = () => { sd = (sd * 1103515245 + 12345) & 0x7fffffff; return sd / 0x7fffffff; };
  let lvl = bot - 30;
  for (let i = 0; i < n; i++) {
    const cx = x0 + step * i + step / 2, up = rnd() > 0.4, body = 14 + rnd() * 30;
    const bt = up ? lvl - body : lvl, bb = up ? lvl : lvl + body, col = up ? C.cyan : C.magenta;
    s += `<line x1="${cx}" y1="${bt - 8}" x2="${cx}" y2="${bb + 8}" stroke="${col}" stroke-width="1.5"/>`;
    s += up
      ? `<rect x="${cx - 6}" y="${Math.max(top, bt)}" width="12" height="${Math.max(2, bb - bt)}" fill="none" stroke="${col}" stroke-width="1.5" rx="1.5"/>`
      : `<rect x="${cx - 6}" y="${bt}" width="12" height="${Math.max(2, bb - bt)}" fill="${col}" rx="1.5"/>`;
    lvl = (up ? bt : bb) + (up ? -(8 + rnd() * 16) : (6 + rnd() * 12));
    lvl = Math.max(top + 24, Math.min(bot - 16, lvl));
  }
  return `<g opacity="0.30" filter="url(#soft)">${s}</g>`;
}

function banner({ file, word, sub, accent, gradientWord, seed, subColor }) {
  const fs2 = Math.min(96, Math.floor(560 / (word.length * 0.50)));   // fit wordmark
  const wordFill = gradientWord ? 'url(#syn)' : C.text;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="gC" cx="8%" cy="-10%" r="80%"><stop offset="0%" stop-color="${C.cyan}" stop-opacity="0.20"/><stop offset="60%" stop-color="${C.cyan}" stop-opacity="0"/></radialGradient>
    <radialGradient id="gM" cx="78%" cy="115%" r="80%"><stop offset="0%" stop-color="${C.magenta}" stop-opacity="0.22"/><stop offset="62%" stop-color="${C.magenta}" stop-opacity="0"/></radialGradient>
    <radialGradient id="flg" cx="50%" cy="45%" r="55%"><stop offset="0%" stop-color="${C.magenta}" stop-opacity="0.42"/><stop offset="55%" stop-color="${C.magenta}" stop-opacity="0.10"/><stop offset="100%" stop-color="${C.magenta}" stop-opacity="0"/></radialGradient>
    <linearGradient id="syn" x1="0" y1="0" x2="1" y2="0.3"><stop offset="0%" stop-color="${C.cyan}"/><stop offset="100%" stop-color="${C.magenta}"/></linearGradient>
    <linearGradient id="vig" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.38"/></linearGradient>
    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="tglow" x="-40%" y="-80%" width="180%" height="260%"><feGaussianBlur stdDeviation="6"/></filter>
    <filter id="iglow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="7"/></filter>
  </defs>

  <rect width="${W}" height="${H}" fill="${C.bg}"/>
  ${grid()}
  <rect width="${W}" height="${H}" fill="url(#gC)"/>
  <rect width="${W}" height="${H}" fill="url(#gM)"/>
  ${ticks(seed)}

  <!-- flamingo hero (glow + sharp) -->
  <ellipse cx="892" cy="120" rx="150" ry="118" fill="url(#flg)"/>
  <image href="${FLAMINGO}" x="800" y="22" width="190" height="190" filter="url(#iglow)" opacity="0.85"/>
  <image href="${FLAMINGO}" x="800" y="22" width="190" height="190"/>

  <rect width="${W}" height="${H}" fill="url(#vig)"/>
  <!-- left calm zone -->
  <rect x="0" y="0" width="600" height="${H}" fill="${C.bg}" opacity="0.5"/>
  <rect x="0" y="0" width="470" height="${H}" fill="${C.bg}" opacity="0.4"/>

  <!-- VICE TERMINAL lockup -->
  <image href="${FLAMINGO}" x="44" y="30" width="26" height="26"/>
  <text x="80" y="50" font-family="Barlow Condensed" font-weight="800" font-size="22" letter-spacing="3" fill="${C.magenta}">VICE TERMINAL</text>

  <!-- section word: cyan glow behind + fill on top -->
  <text x="42" y="168" font-family="Barlow Condensed" font-weight="900" font-size="${fs2}" letter-spacing="1" fill="${accent}" filter="url(#tglow)" opacity="0.8">${word}</text>
  <text x="42" y="168" font-family="Barlow Condensed" font-weight="900" font-size="${fs2}" letter-spacing="1" fill="${wordFill}">${word}</text>

  <!-- synthwave underline -->
  <rect x="46" y="184" width="${Math.min(90 + word.length * 14, 430)}" height="6" rx="3" fill="url(#syn)" filter="url(#soft)"/>

  <!-- subtitle (mono / terminal) -->
  <text x="46" y="222" font-family="JetBrains Mono" font-weight="500" font-size="19" fill="${subColor || C.text2}">${sub}</text>
</svg>`;

  const resvg = new Resvg(svg, { font: { fontFiles: FONTS, defaultFontFamily: 'Barlow Condensed', loadSystemFonts: false }, background: C.bg });
  fs.writeFileSync(path.join(__dirname, file), resvg.render().asPng());
  console.log('wrote', file);
}

banner({ file: 'welcome.png',   word: 'WELCOME',     sub: 'Welcome to the terminal.',       accent: C.cyan,    seed: 7 });
banner({ file: 'links.png',     word: 'LINKS',       sub: 'Everything, one place.',          accent: C.cyan,    seed: 23 });
banner({ file: 'rules.png',     word: 'RULES',       sub: 'Keep the floor clean.',           accent: C.gold,    seed: 41 });
banner({ file: 'mods.png',      word: 'MODS',        sub: 'The crew running the desk.',       accent: C.magenta, seed: 58 });
banner({ file: 'invite.png',    word: 'INVITE LINK', sub: 'Bring someone onto the floor.',    accent: C.cyan,    seed: 71 });
banner({ file: 'terminal.png',  word: 'TERMINAL',    sub: '> vice_terminal --live',           accent: C.green,   seed: 88, subColor: C.green });
banner({ file: 'vice-suite.png',word: 'VICE SUITE',  sub: 'The premium floor.',               accent: C.magenta, seed: 99, gradientWord: true });
console.log('done');
