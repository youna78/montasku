const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const backgroundPath = path.join(root, "public/img/monster_frame/october_evolution_chart_background_v2.png");
const outputDir = path.join(root, "public/img/monster_frame");

const width = 1128;
const height = 1410;

const nodes = [
  { id: 93, name: "ハロウィン卵", x: 562, y: 220, size: 160, image: "monster_renewal_93_halloween_egg_01.png" },
  { id: 94, name: "キャンディゴースト", x: 407, y: 424, size: 150, image: "monster_renewal_95_candy_ghost_01.png" },
  { id: 95, name: "パンプキンプチ", x: 714, y: 424, size: 145, image: "monster_renewal_94_pumpkin_petit_01.png" },
  { id: 96, name: "魔女見習いフェアリー", x: 279, y: 648, size: 150, image: "monster_renewal_96_apprentice_witch_fairy_01.png" },
  { id: 97, name: "黒マントのミニビースト", x: 562, y: 648, size: 155, image: "monster_renewal_97_black_cloak_mini_beast_01.png" },
  { id: 98, name: "パンプキンドラゴン", x: 848, y: 648, size: 155, image: "monster_renewal_98_pumpkin_dragon_01.png" },
  { id: 99, name: "キャンドルウィッチ", x: 193, y: 875, size: 166, image: "monster_renewal_99_candle_witch_01.png" },
  { id: 100, name: "シャドウファング", x: 438, y: 875, size: 170, image: "monster_renewal_100_shadow_fang_01.png" },
  { id: 102, name: "ミイラ男", x: 686, y: 875, size: 166, image: "monster_renewal_102_mummy_man_01.png" },
  { id: 101, name: "ランタンワイバーン", x: 936, y: 875, size: 170, image: "monster_renewal_101_lantern_wyvern_01.png" },
  { id: 103, name: "ハロウィンクイーン", x: 200, y: 1132, size: 174, image: "monster_renewal_103_halloween_queen_01.png" },
  { id: 104, name: "冥夜のベヒモス", x: 445, y: 1132, size: 174, image: "monster_renewal_104_midnight_behemoth_01.png" },
  { id: 105, name: "砂塵ノミイラキング", x: 690, y: 1132, size: 174, image: "monster_renewal_106_sandstorm_mummy_king_01.png" },
  { id: 106, name: "百鬼ノパンプキンロード", x: 935, y: 1132, size: 174, image: "monster_renewal_105_hyakki_pumpkin_lord_01.png" },
];

const nodeById = new Map(nodes.map((node) => [node.id, node]));
const edges = [
  [93, 94, "HK"], [93, 95, "PC"],
  [94, 96, "HK"], [94, 97, "PC"], [95, 97, "HK"], [95, 98, "PC"],
  [96, 99, "HK"], [96, 100, "PC"], [97, 100, "HK"], [97, 102, "PC"], [98, 102, "HK"], [98, 101, "PC"],
  [99, 103, "HK"], [99, 104, "PC"], [100, 104, "HK"], [100, 105, "PC"],
  [102, 104, "HK"], [102, 105, "PC"], [101, 105, "HK"], [101, 106, "PC"],
];

function escapeXml(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]);
}

function splitName(name) {
  if (name.length <= 10) return [name];
  const middle = Math.ceil(name.length / 2);
  return [name.slice(0, middle), name.slice(middle)];
}

function edgeSvg() {
  const paths = edges.map(([fromId, toId, type], index) => {
    const from = nodeById.get(fromId);
    const to = nodeById.get(toId);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    const ux = dx / length;
    const uy = dy / length;
    const startX = from.x + ux * 104;
    const startY = from.y + uy * 104;
    const endX = to.x - ux * 112;
    const endY = to.y - uy * 112;
    const midX = startX + (endX - startX) * (index % 2 === 0 ? 0.44 : 0.56);
    const midY = startY + (endY - startY) * (index % 2 === 0 ? 0.44 : 0.56);
    const color = type === "HK" ? "#75e3cb" : "#ffb14d";
    return `
      <path d="M ${startX.toFixed(1)} ${startY.toFixed(1)} L ${endX.toFixed(1)} ${endY.toFixed(1)}"
        fill="none" stroke="#17101f" stroke-width="10" stroke-linecap="round" opacity="0.9"/>
      <path d="M ${startX.toFixed(1)} ${startY.toFixed(1)} L ${endX.toFixed(1)} ${endY.toFixed(1)}"
        fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" marker-end="url(#arrow-${type})"/>
      <g transform="translate(${midX.toFixed(1)} ${midY.toFixed(1)})">
        <rect x="-23" y="-15" width="46" height="30" rx="12" fill="#17101f" stroke="${color}" stroke-width="2"/>
        <text x="0" y="8" text-anchor="middle" font-family="Arial, sans-serif" font-size="19" font-weight="800" fill="${color}">${type}</text>
      </g>`;
  }).join("");

  return Buffer.from(`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <marker id="arrow-HK" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#75e3cb"/></marker>
      <marker id="arrow-PC" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#ffb14d"/></marker>
    </defs>
    ${paths}
  </svg>`);
}

function labelsSvg(secret) {
  const labels = nodes.map((node) => {
    const hidden = secret && node.id >= 99;
    const lines = hidden ? ["？？？"] : splitName(node.name);
    const plaqueWidth = node.id >= 99 ? 194 : node.id >= 96 ? 188 : 178;
    const plaqueHeight = lines.length === 1 ? 34 : 48;
    const top = node.y + 66 - (plaqueHeight / 2);
    const fontSize = lines.length === 1 ? 20 : 17;
    const text = lines.map((line, lineIndex) => `<text x="${node.x}" y="${top + 23 + lineIndex * 18}" text-anchor="middle" font-family="Hiragino Sans, YuGothic, sans-serif" font-size="${fontSize}" font-weight="700" fill="#fff2ce" stroke="#24152d" stroke-width="3" paint-order="stroke">${escapeXml(line)}</text>`).join("");
    return `<g>
      <rect x="${node.x - plaqueWidth / 2}" y="${top}" width="${plaqueWidth}" height="${plaqueHeight}" rx="12" fill="#211528" fill-opacity="0.94" stroke="#d99b42" stroke-width="2"/>
      ${text}
    </g>`;
  }).join("");

  return Buffer.from(`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <g>
      <text x="255" y="73" text-anchor="middle" font-family="Hiragino Sans, YuGothic, sans-serif" font-size="32" font-weight="800" fill="#3b2132">モンタスク</text>
      <text x="255" y="111" text-anchor="middle" font-family="Hiragino Sans, YuGothic, sans-serif" font-size="32" font-weight="800" fill="#3b2132">ハロウィン進化表</text>
    </g>
    ${labels}
    <g transform="translate(564 1324)">
      <rect x="-285" y="-32" width="570" height="64" rx="18" fill="#160f1e" fill-opacity="0.9" stroke="#b97b34" stroke-width="2"/>
      <circle cx="-222" cy="0" r="8" fill="#75e3cb"/><text x="-202" y="8" font-family="Hiragino Sans, YuGothic, sans-serif" font-size="22" font-weight="700" fill="#fff2ce">HK：Heal / Knowledge</text>
      <circle cx="62" cy="0" r="8" fill="#ffb14d"/><text x="82" y="8" font-family="Hiragino Sans, YuGothic, sans-serif" font-size="22" font-weight="700" fill="#fff2ce">PC：Power / Create</text>
    </g>
  </svg>`);
}

function secretNodesSvg() {
  const marks = nodes.filter((node) => node.id >= 99).map((node) => `
    <g transform="translate(${node.x} ${node.y - 10})">
      <circle r="62" fill="#130d19" fill-opacity="0.82" stroke="#9c6b35" stroke-width="3" stroke-dasharray="8 8"/>
      <text x="0" y="24" text-anchor="middle" font-family="Hiragino Sans, YuGothic, sans-serif" font-size="70" font-weight="800" fill="#c9964f">？</text>
    </g>`).join("");
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${marks}</svg>`);
}

async function spriteComposite(node) {
  const input = path.join(root, "public/img/monster", node.image);
  const buffer = await sharp(input).resize(node.size, node.size, { fit: "contain" }).png().toBuffer();
  return { input: buffer, left: Math.round(node.x - node.size / 2), top: Math.round(node.y - node.size / 2 - 13) };
}

async function build(secret) {
  const visibleNodes = nodes.filter((node) => !secret || node.id < 99);
  const sprites = await Promise.all(visibleNodes.map(spriteComposite));
  const layers = [
    { input: edgeSvg(), left: 0, top: 0 },
    ...sprites,
    ...(secret ? [{ input: secretNodesSvg(), left: 0, top: 0 }] : []),
    { input: labelsSvg(secret), left: 0, top: 0 },
  ];
  const suffix = secret ? "secret" : "full";
  await sharp(backgroundPath)
    .resize(width, height, { fit: "fill" })
    .composite(layers)
    .png({ compressionLevel: 9, palette: true, quality: 100 })
    .toFile(path.join(outputDir, `october_evolution_chart_${suffix}_v2.png`));
}

Promise.all([build(false), build(true)]).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
