// Run with: node scripts/test-november-event.cjs
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

let now = '2026-11-01T12:00:00+09:00';
global.window = { localStorage: { getItem: key => key === 'taskgame.virtualGameNow' ? now : null } };

const events = require('../lib/game/events/index.ts');
const state = require('../lib/game/state.ts');
const assets = require('../lib/game/assets.ts');
const { NOVEMBER_GROUND_WALKS } = require('../lib/game/events/novemberGroundWalks.ts');
const shop = require('../lib/game/shop.ts');
const evolution = require('../lib/game/evolution.ts');
const { NOVEMBER_EVOLUTION_BRANCHES } = require('../lib/game/events/novemberEvolution.ts');
const { parseCsv } = require('../lib/csv/loadCsv.ts');

const event = events.getEventBySlug('november-koyo-onsen');
assert.ok(event);
assert.equal(event.name, '紅葉バスツアーと湯けむり温泉');
assert.equal(event.mission.loginRewardTitle, 'もみじフレーム');
assert.equal(event.freeEggMonsterId, 107);
assert.equal(event.freeCoinShopItems.length, 1);
assert.equal(event.paidCoinShopItems.length, 4);

const id = event.eventId;
const monsters = parseCsv(fs.readFileSync(path.join(root, 'public/data/monsters_master.csv'), 'utf8')).map(row => ({
  monsterId: Number(row.monster_id), name: row.name, stage: row.stage, attribute: row.attribute,
  unlockCondition: row.unlock_condition, evolutionFrom: row.evolution_from, evolutionTo: row.evolution_to,
  movementType: row.movement_type, rarity: row.rarity, description: row.description
}));
const initial = () => ({ ...state.buildInitialState([]), hasSeenTutorial: true, freeCoins: 10000, paidCoinBalance: 10000 });

for (const [date, active, visible] of [
  ['2026-10-28T23:59:59+09:00', false, false],
  ['2026-10-29T00:00:00+09:00', false, true],
  ['2026-10-31T23:59:59+09:00', false, true],
  ['2026-11-01T00:00:00+09:00', true, true],
  ['2026-11-30T23:59:59+09:00', true, true],
  ['2026-12-01T00:00:00+09:00', false, false]
]) {
  now = date;
  assert.equal(events.isEventActive(event), active, date);
  assert.equal(events.isEventAnnouncementVisible(event), visible, date);
  assert.equal(state.claimEventFreeEgg(initial(), id).claimed, active, date);
}

now = '2026-11-01T12:00:00+09:00';
let player = state.claimEventFreeEgg(initial(), id).nextState;
assert.equal(player.eventStates[id].ownedEggCount, 1);
assert.equal(state.queueEventEgg(player, id).nextState.queuedEggMonsterId, 107);
const start = state.forceStartEventEgg(player, id, monsters);
assert.equal(start.started, true);
assert.equal(start.nextState.currentMonsterId, 107);

for (const item of [...event.freeCoinShopItems, ...event.paidCoinShopItems]) {
  const before = initial();
  const result = state.purchaseEventReward(before, id, item.itemId);
  assert.equal(result.purchased, true, item.itemId);
  const balance = item.currencyType === 'free_coin' ? 'freeCoins' : 'paidCoinBalance';
  assert.equal(result.nextState[balance], before[balance] - item.price);
  if (item.rewardType === 'event_egg') {
    assert.equal(result.nextState.eventStates[id].ownedEggCount, 1);
  } else {
    const list = item.rewardType === 'background' ? shop.SHOP_BACKGROUNDS : item.rewardType === 'decoration' ? shop.SHOP_DECORATIONS : shop.SHOP_FRAMES;
    assert.ok(list.some(entry => entry.itemId === item.grantValue), item.grantValue);
    now = '2026-12-01T12:00:00+09:00';
    const equip = item.rewardType === 'background' ? state.equipBackground : item.rewardType === 'decoration' ? state.equipDecoration : state.equipFrame;
    const equipped = equip(result.nextState, item.grantValue);
    assert.equal(item.rewardType === 'decoration' ? equipped.active : equipped.equipped, true);
    now = '2026-11-01T12:00:00+09:00';
  }
}

player = initial();
const duck = event.paidCoinShopItems.find(item => item.itemId === 'november_duck_parade');
assert.ok(duck);
assert.equal(duck.price, 300);
const duckPurchase = state.purchaseEventReward(player, id, duck.itemId);
assert.ok(duckPurchase.nextState.ownedDecorationIds.includes('november_duck_parade'));
assert.ok(!duckPurchase.nextState.ownedDecorationIds.includes('october_ghost_parade'));
assert.equal(state.purchaseEventReward(duckPurchase.nextState, id, duck.itemId).reason, 'already_owned');
assert.equal(state.purchaseEventReward({...player, paidCoinBalance:299}, id, duck.itemId).purchased, false);
for (let day = 1; day <= 7; day += 1) {
  now = `2026-11-${String(day).padStart(2, '0')}T12:00:00+09:00`;
  player = state.refreshGameStateForToday(player);
  assert.equal(player.eventStates[id].loginDates.length, day);
  assert.equal(player.ownedFrameIds.includes('november_maple_frame'), day === 7);
}

const fileExists = file => assert.ok(fs.existsSync(path.join(root, 'public', file)), file);
[
  event.heroImagePath, event.homeBannerImagePath, event.shopBannerImagePath, event.shopPromoBannerImagePath,
  ...event.freeCoinShopItems.map(item => item.imagePath),
  ...event.paidCoinShopItems.map(item => item.imagePath),
  shop.SHOP_FRAMES.find(item => item.itemId === event.mission.loginRewardFrameId).imagePath
].forEach(fileExists);

assert.equal(event.rewardPreviewMonsterIds.length, 14);
for (const monsterId of event.rewardPreviewMonsterIds) {
  const monster = monsters.find(entry => entry.monsterId === monsterId);
  assert.ok(monster, `Missing monster ${monsterId}`);
  assert.ok(['ground', 'flying', 'floating'].includes(monster.movementType));
  fileExists(assets.getMonsterImage(monsterId));
  for (const kind of [monster.stage === 'egg' ? 'sway' : 'walk', 'happy']) {
    const motion = assets.getMonsterMotionAsset(monsterId, kind);
    assert.ok(motion, `${monsterId} ${kind}`);
    fileExists(motion.imagePath);
  }
}

const groundIds = monsters.filter(monster => event.rewardPreviewMonsterIds.includes(monster.monsterId) && monster.movementType === 'ground' && monster.stage !== 'egg').map(monster => monster.monsterId);
assert.deepEqual(NOVEMBER_GROUND_WALKS.map(walk => walk.id), groundIds, 'Every November ground walker is covered');
assert.equal(groundIds.length, 9);
for (const monsterId of groundIds) {
  const walk = assets.getMonsterMotionAsset(monsterId, 'walk');
  assert.ok(walk.imagePath.endsWith('_walk_v3_4f.png'));
  assert.equal(walk.displaySize, monsterId === 108 ? 170 : 142);
  assert.equal(walk.offsetY, monsterId === 108 ? -12 : 0);
  assert.ok(!assets.getMonsterMotionAsset(monsterId, 'happy').imagePath.includes('_v3_'));
}
for (const monsterId of [109, 111, 116, 120]) assert.ok(!assets.getMonsterMotionAsset(monsterId, 'walk').imagePath.includes('_v3_'));
assert.ok(assets.getMonsterMotionAsset(107, 'sway').imagePath.includes('_sway_'));

const attributes = ['heal', 'knowledge', 'power', 'create'];
const select = (monster, attribute) => {
  const totals = { heal: 0, power: 0, knowledge: 0, create: 0, [attribute]: 100 };
  return monster.stage === 'egg'
    ? evolution.resolveEggEvolutionMonsterId(monster, totals, monsters)
    : evolution.evaluateEvolution({ gameState: { ...initial(), currentMonsterId: monster.monsterId, currentMonsterLevel: 30, attributeTotals: totals }, monsters });
};

const expectedBranches = {
  107: [109, 108],
  108: [112, 110],
  109: [111, 112],
  110: [115, 116],
  111: [114, 113],
  112: [113, 115],
  113: [117, 119],
  114: [118, 117],
  115: [117, 119],
  116: [119, 120]
};

for (const [sourceId, branches] of Object.entries(NOVEMBER_EVOLUTION_BRANCHES)) {
  const source = monsters.find(monster => monster.monsterId === Number(sourceId));
  assert.ok(source);
  assert.deepEqual(branches.map(branch => branch.monsterId), expectedBranches[sourceId], `${source.name}: branch table`);
  for (const attribute of attributes) {
    const branchIndex = ['heal', 'knowledge'].includes(attribute) ? 0 : 1;
    assert.equal(select(source, attribute), branches[branchIndex].monsterId, `${source.name}: ${attribute}`);
  }
}

assert.equal(monsters.find(monster => monster.monsterId === 111).name, 'バスガイドミニフェアリー');
assert.equal(monsters.find(monster => monster.monsterId === 116).movementType, 'flying');
assert.equal(monsters.find(monster => monster.monsterId === 120).name, '湯煙ノ龍神');
console.log('November event: dates, rewards, shop items, artwork, monster motions, and all evolution branches passed.');

// Login rewards and frame equipment must preserve the current November monster.
now = '2026-11-01T12:00:00+09:00';
let framePlayer = { ...initial(), currentMonsterId: 111, currentMonsterLevel: 12, currentMonsterExp: 146,
  hasCompletedInitialBirth: true, hasCompletedCurrentBirth: true, lastPlayedDate: '2026-11-01' };
for (let day = 1; day <= 7; day++) {
  now = `2026-11-${String(day).padStart(2, '0')}T12:00:00+09:00`;
  framePlayer = state.refreshGameStateForToday(framePlayer);
}
const frameResult = state.equipFrame(framePlayer, event.mission.loginRewardFrameId);
assert.equal(frameResult.equipped, true);
assert.equal(frameResult.nextState.currentMonsterId, 111);
assert.deepEqual(frameResult.nextState.acquiredLetters, framePlayer.acquiredLetters);
assert.equal(state.reconcileMonsterProgress({ state: frameResult.nextState, monsters, levelingRows: require('../lib/game/leveling.ts').getFallbackLevelingMaster() }).currentMonsterId, 111);
assert.equal(framePlayer.streakDays, 7);
// Event login counts are cumulative; the separate everyday streak resets after a missed day.
now = '2026-11-09T12:00:00+09:00';
framePlayer = state.refreshGameStateForToday(framePlayer);
assert.equal(framePlayer.streakDays, 1);
assert.equal(framePlayer.eventStates[id].loginDates.length, 8);
assert.equal(state.refreshGameStateForToday(framePlayer).streakDays, 1);

// Starting an event egg must discard the review snapshot of the previous monster.
now = '2026-11-01T12:00:00+09:00';
const reviewTask = { taskId: 1, name: 'テスト', baseExp: 2, power: 0, heal: 1, knowledge: 0, create: 0 };
let reviewPlayer = { ...initial(), lastPlayedDate: '2026-10-31', hasCompletedCurrentBirth: true,
  activeTasks: [{ taskId: 1, enabled: true, sortOrder: 0 }] };
reviewPlayer = state.refreshGameStateForToday(reviewPlayer);
assert.ok(reviewPlayer.pendingDailyReview?.rewardBaseSnapshot);
reviewPlayer = state.claimEventFreeEgg(reviewPlayer, id).nextState;
reviewPlayer = state.forceStartEventEgg(reviewPlayer, id, monsters).nextState;
assert.equal(reviewPlayer.currentMonsterId, 107);
assert.equal(reviewPlayer.pendingDailyReview, null, 'The old monster snapshot must not restore a normal egg');
assert.equal(state.resolveDailyReviewTask({state:reviewPlayer, tasks:[reviewTask], task:reviewTask, didComplete:true, monsters, levelingRows:require('../lib/game/leveling.ts').getFallbackLevelingMaster()}).nextState.currentMonsterId, 107);
console.log('November regressions: 7-day frame, monster preservation, independent login streak and stale review snapshot passed.');

// Approved November letters must be event-specific and match the scene preview.
const { NOVEMBER_LETTER_TEMPLATES, getNovemberFarewellTemplate } = require('../lib/game/events/novemberLetters.ts');
now = '2026-11-15T12:00:00+09:00';
const seenNovemberLetters = new Set();
for (const monsterId of event.rewardPreviewMonsterIds) {
  const farewellState = { ...initial(), currentMonsterId: monsterId, currentMonsterExp: 360, lastPlayedDate: '2026-11-15', endEventPending: true };
  const preview = getNovemberFarewellTemplate(farewellState);
  assert.ok(preview);
  assert.deepEqual(getNovemberFarewellTemplate(JSON.parse(JSON.stringify(farewellState))), preview);
  const departed = state.finishEndEvent(farewellState, monsters);
  const letter = departed.acquiredLetters.at(-1);
  assert.equal(letter.title, preview.title);
  assert.equal(letter.body, preview.body);
  assert.equal(letter.imagePath, preview.imagePath);
  assert.equal(letter.fromMonsterId, monsterId);
  assert.equal(letter.obtainedDate, '2026-11-15');
  seenNovemberLetters.add(letter.title);
}
assert.equal(seenNovemberLetters.size, 3);
for (const monsterId of [1, 6, 93, 106]) {
  assert.equal(getNovemberFarewellTemplate({currentMonsterId: monsterId, currentMonsterExp: 360, lastPlayedDate: '2026-11-15'}), null);
  const letter = state.finishEndEvent({...initial(), currentMonsterId: monsterId}, monsters).acquiredLetters.at(-1);
  assert.ok(assets.LETTER_ITEM_IMAGES.includes(letter.imagePath));
}
NOVEMBER_LETTER_TEMPLATES.forEach(letter => fileExists(letter.imagePath));
console.log('November letters: approved text, event-only eligibility, all three variants, scene/record consistency and saved art passed.');
