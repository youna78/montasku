// Run with: node scripts/test-october-event.cjs
// Transpile local TypeScript in memory; no build output or live account writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (request.startsWith('@/')) request = path.join(root, request.slice(2));
  if (request.startsWith('.') || path.isAbsolute(request)) {
    const base = path.resolve(parent ? path.dirname(parent.filename) : root, request);
    for (const candidate of [base + '.ts', path.join(base, 'index.ts')]) {
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return originalResolve.call(this, request, parent, ...rest);
};
require.extensions['.ts'] = (module, filename) => {
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  });
  module._compile(source.outputText, filename);
};
let now = '2026-10-01T12:00:00+09:00';
global.window = { localStorage: { getItem: key => key === 'taskgame.virtualGameNow' ? now : null } };
const events = require('../lib/game/events/index.ts');
const state = require('../lib/game/state.ts');
const assets = require('../lib/game/assets.ts');
const shop = require('../lib/game/shop.ts');
const evolution = require('../lib/game/evolution.ts');
const { parseCsv } = require('../lib/csv/loadCsv.ts');
const event = events.getEventBySlug('october-halloween');
assert.ok(event);
const id = event.eventId;
const monsters = parseCsv(fs.readFileSync(path.join(root, 'public/data/monsters_master.csv'), 'utf8')).map(r => ({
  monsterId: Number(r.monster_id), name: r.name, stage: r.stage, attribute: r.attribute,
  unlockCondition: r.unlock_condition, evolutionFrom: r.evolution_from, evolutionTo: r.evolution_to,
  movementType: r.movement_type, rarity: r.rarity, description: r.description
}));
const initial = () => ({ ...state.buildInitialState([]), hasSeenTutorial: true, freeCoins: 10000, paidCoinBalance: 10000 });
for (const [date, active, visible] of [
  ['2026-09-28T23:59:59+09:00', false, false],
  ['2026-09-29T00:00:00+09:00', false, true],
  ['2026-09-30T23:59:59+09:00', false, true],
  ['2026-10-01T00:00:00+09:00', true, true],
  ['2026-10-31T23:59:59+09:00', true, true],
  ['2026-11-01T00:00:00+09:00', false, false]
]) {
  now = date;
  assert.equal(events.isEventActive(event), active, date);
  assert.equal(events.isEventAnnouncementVisible(event), visible, date);
  assert.equal(state.claimEventFreeEgg(initial(), id).claimed, active, date);
  assert.equal(state.purchaseEventReward(initial(), id, event.freeCoinShopItems[0].itemId).purchased, active, date);
}
now = '2026-10-01T12:00:00+09:00';
let player = state.claimEventFreeEgg(initial(), id).nextState;
assert.equal(player.eventStates[id].ownedEggCount, 1);
assert.equal(state.claimEventFreeEgg(player, id).reason, 'already_claimed');
assert.equal(state.queueEventEgg(player, id).nextState.queuedEggMonsterId, 93);
const start = state.forceStartEventEgg(player, id, monsters);
assert.equal(start.started, true);
assert.equal(start.nextState.currentMonsterId, 93);
assert.equal(start.nextState.eventStates[id].ownedEggCount, 0);
assert.equal(event.freeCoinShopItems.length, 1);
assert.equal(event.paidCoinShopItems.length, 4);
for (const item of [...event.freeCoinShopItems, ...event.paidCoinShopItems]) {
  const before = initial();
  const result = state.purchaseEventReward(before, id, item.itemId);
  assert.equal(result.purchased, true, item.itemId);
  const balance = item.currencyType === 'free_coin' ? 'freeCoins' : 'paidCoinBalance';
  assert.equal(result.nextState[balance], before[balance] - item.price);
  assert.equal(state.purchaseEventReward({ ...before, [balance]: item.price - 1 }, id, item.itemId).purchased, false);
  if (item.rewardType === 'event_egg') {
    assert.equal(result.nextState.eventStates[id].ownedEggCount, 1);
  } else {
    assert.equal(state.purchaseEventReward(result.nextState, id, item.itemId).reason, 'already_owned');
    const list = item.rewardType === 'background' ? shop.SHOP_BACKGROUNDS : item.rewardType === 'frame' ? shop.SHOP_FRAMES : shop.SHOP_DECORATIONS;
    assert.ok(list.some(r => r.itemId === item.grantValue), item.grantValue);
    now = '2026-11-01T12:00:00+09:00';
    const equip = item.rewardType === 'background' ? state.equipBackground : item.rewardType === 'frame' ? state.equipFrame : state.equipDecoration;
    const equipped = equip(result.nextState, item.grantValue);
    assert.ok(equipped.equipped || equipped.toggled, 'Owned items stay equippable after October');
    now = '2026-10-01T12:00:00+09:00';
  }
}
player = initial();
for (let day = 1; day <= 7; day++) {
  now = `2026-10-${String(day).padStart(2, '0')}T12:00:00+09:00`;
  const beforeCoins = player.freeCoins;
  player = state.refreshGameStateForToday(player);
  assert.equal(player.freeCoins - beforeCoins, day === 1 ? 2 : 5); // Event +2, daily +3.
  assert.equal(player.eventStates[id].loginDates.length, day);
  assert.equal(player.ownedFrameIds.includes('october_pumpkin_frame'), day === 7);
  assert.deepEqual(state.refreshGameStateForToday(player), player, 'Same-day login is idempotent');
}
assert.equal(player.ownedFrameIds.filter(x => x === 'october_pumpkin_frame').length, 1);
const fileExists = file => assert.ok(fs.existsSync(path.join(root, 'public', file)), file);
[event.heroImagePath, event.homeBannerImagePath, event.shopBannerImagePath, event.shopIconImagePath,
 ...event.freeCoinShopItems.map(i => i.imagePath), ...event.paidCoinShopItems.map(i => i.imagePath),
 shop.SHOP_FRAMES.find(i => i.itemId === event.mission.loginRewardFrameId).imagePath,
 '/img/decoration/october_ghost_parade_sprite_01.png'].forEach(fileExists);
assert.equal(event.rewardPreviewMonsterIds.length, 14);
for (const monsterId of event.rewardPreviewMonsterIds) {
  const monster = monsters.find(m => m.monsterId === monsterId);
  assert.ok(monster, `Missing monster ${monsterId}`);
  assert.ok(['ground', 'flying', 'floating'].includes(monster.movementType));
  fileExists(assets.getMonsterImage(monsterId));
  for (const kind of [monster.stage === 'egg' ? 'sway' : 'walk', 'happy']) {
    const motion = assets.getMonsterMotionAsset(monsterId, kind);
    assert.ok(motion, `${monsterId} ${kind}`);
    fileExists(motion.imagePath);
  }
  for (const next of (monster.evolutionTo || '').split('|').filter(Boolean)) {
    const target = monsters.find(m => m.name === next);
    assert.ok(target, next);
    assert.ok(target.evolutionFrom.split('|').includes(monster.name), `${monster.name} -> ${next}`);
  }
}
const attributes = ['heal', 'knowledge', 'power', 'create'];
const select = (monster, attribute) => {
  const totals = { heal: 0, power: 0, knowledge: 0, create: 0, [attribute]: 100 };
  return monster.stage === 'egg'
    ? evolution.resolveEggEvolutionMonsterId(monster, totals, monsters)
    : evolution.evaluateEvolution({ gameState: { ...initial(), currentMonsterId: monster.monsterId, currentMonsterLevel: 30, attributeTotals: totals }, monsters });
};
const reached = new Set([93]);
const queue = [93];
while (queue.length) {
  const currentId = queue.shift();
  const monster = monsters.find(m => m.monsterId === currentId);
  const nextNames = (monster.evolutionTo || '').split('|').filter(Boolean);
  const results = attributes.map(a => select(monster, a));
  for (const name of nextNames) {
    const target = monsters.find(m => m.name === name);
    assert.ok(results.includes(target.monsterId), `Unreachable branch: ${monster.name} -> ${name}`);
    assert.equal(['egg', 'baby', 'child', 'adult', 'final'].indexOf(target.stage),
      ['egg', 'baby', 'child', 'adult', 'final'].indexOf(monster.stage) + 1);
    if (!reached.has(target.monsterId)) { reached.add(target.monsterId); queue.push(target.monsterId); }
  }
  for (const fromName of (monster.evolutionFrom || '').split('|').filter(Boolean)) {
    assert.ok(monsters.find(m => m.name === fromName)?.evolutionTo.split('|').includes(monster.name),
      `Inconsistent parent: ${fromName} -> ${monster.name}`);
  }
}
assert.deepEqual([...reached].sort((a, b) => a - b), event.rewardPreviewMonsterIds);
for (const [monsterId, name, slug, movement] of [
  [94, 'キャンディゴースト', 'monster_renewal_95_candy_ghost', 'floating'],
  [95, 'パンプキンプチ', 'monster_renewal_94_pumpkin_petit', 'ground'],
  [105, '砂塵ノミイラキング', 'monster_renewal_106_sandstorm_mummy_king', 'ground'],
  [106, '百鬼ノパンプキンロード', 'monster_renewal_105_hyakki_pumpkin_lord', 'flying']
]) {
  const monster = monsters.find(m => m.monsterId === monsterId);
  assert.equal(monster.name, name);
  assert.equal(monster.movementType, movement);
  assert.equal(assets.getMonsterImage(monsterId), `/img/monster/${slug}_01.png`);
  for (const kind of ['walk', 'happy']) {
    assert.equal(assets.getMonsterMotionAsset(monsterId, kind).imagePath, `/img/monster/${slug}_${kind}_4f.png`);
  }
}
// Independent expectations transcribed from the user's arrow diagram.
const expectedArrows = [
  [93, 94, 95], [94, 96, 97], [95, 97, 98], [96, 99, 100],
  [97, 100, 102], [98, 102, 101], [99, 103, 104],
  [100, 104, 105], [101, 105, 106], [102, 104, 105]
];
for (const [sourceId, hkTarget, pcTarget] of expectedArrows) {
  const source = monsters.find(m => m.monsterId === sourceId);
  for (const attr of attributes) {
    assert.equal(select(source, attr), ['heal', 'knowledge'].includes(attr) ? hkTarget : pcTarget,
      `Diagram arrow ${source.name}: ${attr}`);
  }
}
// Exercise overlapping conditions separately; the supplied diagram has none.
const { OCTOBER_EVOLUTION_BRANCHES } = require('../lib/game/events/octoberEvolution.ts');
const originalBranches = OCTOBER_EVOLUTION_BRANCHES[94];
const originalRandom = Math.random;
try {
  OCTOBER_EVOLUTION_BRANCHES[94] = originalBranches.map(branch => ({ ...branch, attributes }));
  const before = { ...initial(), currentMonsterId: 94, currentMonsterLevel: 8,
    hasCompletedCurrentBirth: true, attributeTotals: { heal: 100, power: 0, knowledge: 0, create: 0 } };
  for (const [randomValue, expected] of [[0, 96], [0.499, 96], [0.5, 97], [0.999, 97]]) {
    assert.equal(evolution.evaluateEvolution({ gameState: before, monsters, random: () => randomValue }), expected);
  }
  Math.random = () => 0.999;
  const evolved = state.reconcileMonsterProgress({ state: before, monsters, levelingRows: [] });
  assert.equal(evolved.currentMonsterId, 97);
  Math.random = () => { throw new Error('Must not reroll a completed evolution'); };
  assert.equal(state.reconcileMonsterProgress({ state: JSON.parse(JSON.stringify(evolved)), monsters, levelingRows: [] }).currentMonsterId, 97);
} finally {
  OCTOBER_EVOLUTION_BRANCHES[94] = originalBranches;
  Math.random = originalRandom;
}
// Earlier events retain their existing deterministic evolution rule.
assert.equal(select(monsters.find(m => m.monsterId === 81), 'power'), 83);
assert.equal(select(monsters.find(m => m.monsterId === 81), 'create'), 84);
console.log('October event: dates, claims, purchases, equipment, 7-day rewards, artwork identity, and every evolution branch passed.');
