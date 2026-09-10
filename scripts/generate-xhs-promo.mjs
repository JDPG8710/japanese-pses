import fs from 'node:fs/promises';
import sharp from 'sharp';

const source = 'C:/Users/dingy/.codex/generated_images/01a07646-40f7-7fd3-a34d-ef10d7386346/exec-02328523-d414-43ce-a92a-18c7ffc71f0b.png';
const output = 'social/piko-game-xiaohongshu-promo-zh.png';
const width = 1080;
const height = 1350;

const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="panel" x1="0" y1="0" x2="0.9" y2="1">
      <stop offset="0" stop-color="#07143e" stop-opacity="0.96"/>
      <stop offset="0.76" stop-color="#07143e" stop-opacity="0.78"/>
      <stop offset="1" stop-color="#07143e" stop-opacity="0.08"/>
    </linearGradient>
    <linearGradient id="cta" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffd84d"/>
      <stop offset="1" stop-color="#ffbf21"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="9" flood-color="#000923" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect x="30" y="30" width="730" height="850" rx="40" fill="url(#panel)"/>
  <rect x="52" y="56" width="190" height="56" rx="28" fill="#ffd84d" filter="url(#shadow)"/>
  <text x="147" y="94" text-anchor="middle" font-family="Microsoft YaHei, Noto Sans CJK SC, sans-serif" font-size="30" font-weight="900" fill="#08143f">piko-game</text>

  <text x="62" y="185" font-family="Microsoft YaHei, Noto Sans CJK SC, sans-serif" font-size="58" font-weight="900" fill="#ffffff">让学习，变成</text>
  <text x="62" y="258" font-family="Microsoft YaHei, Noto Sans CJK SC, sans-serif" font-size="66" font-weight="900" fill="#ffd84d">孩子主动出发的</text>
  <text x="62" y="331" font-family="Microsoft YaHei, Noto Sans CJK SC, sans-serif" font-size="66" font-weight="900" fill="#ffffff">宇宙冒险！</text>
  <rect x="62" y="364" width="560" height="4" rx="2" fill="#6eeeff"/>
  <text x="62" y="425" font-family="Microsoft YaHei, Noto Sans CJK SC, sans-serif" font-size="31" font-weight="700" fill="#d8e8ff">给小学生的多语言学习游戏</text>

  <g font-family="Microsoft YaHei, Noto Sans CJK SC, sans-serif">
    <circle cx="82" cy="496" r="13" fill="#ffd84d"/>
    <text x="116" y="507" font-size="29" font-weight="800" fill="#ffffff">小学 1–6 年级</text>
    <circle cx="82" cy="564" r="13" fill="#58e6c0"/>
    <text x="116" y="575" font-size="29" font-weight="800" fill="#ffffff">语文 · 数学 · 科学 · 英语</text>
    <circle cx="82" cy="632" r="13" fill="#ff82c8"/>
    <text x="116" y="643" font-size="29" font-weight="800" fill="#ffffff">中文 / English / 日本語</text>
    <circle cx="82" cy="700" r="13" fill="#6eeeff"/>
    <text x="116" y="711" font-size="29" font-weight="800" fill="#ffffff">逻辑闯关 · 迷宫 · 编程 · 数独</text>
    <circle cx="82" cy="768" r="13" fill="#ff9c65"/>
    <text x="116" y="779" font-size="29" font-weight="800" fill="#ffffff">无需注册，打开浏览器就能玩</text>
  </g>

  <rect x="52" y="1175" width="650" height="108" rx="54" fill="url(#cta)" stroke="#fff4b3" stroke-width="4" filter="url(#shadow)"/>
  <text x="377" y="1221" text-anchor="middle" font-family="Microsoft YaHei, Noto Sans CJK SC, sans-serif" font-size="26" font-weight="800" fill="#08143f">免费体验 · 现在就出发</text>
  <text x="377" y="1258" text-anchor="middle" font-family="Arial, sans-serif" font-size="27" font-weight="900" fill="#08143f">piko-game.com</text>

  <text x="58" y="1320" font-family="Microsoft YaHei, Noto Sans CJK SC, sans-serif" font-size="23" font-weight="700" fill="#d9e7ff">#小学生学习 #亲子教育 #益智游戏 #多语言学习</text>
</svg>`;

const overlay = Buffer.from(svg);
await sharp(source)
  .resize(width, height, { fit: 'cover', position: 'centre' })
  .composite([{ input: overlay }])
  .png({ compressionLevel: 9 })
  .toFile(output);

console.log(output);
