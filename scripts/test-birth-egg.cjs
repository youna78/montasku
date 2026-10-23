// Reuse the in-memory TypeScript loader and existing birth lifecycle checks.
require('./test-october-ui.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {parseCsv} = require('../lib/csv/loadCsv.ts');
const {getBirthEggMonster} = require('../lib/game/birthEgg.ts');
const {getMonsterImage} = require('../lib/game/assets.ts');
const game = require('../lib/game/state.ts');
const {getFallbackLevelingMaster} = require('../lib/game/leveling.ts');
const monsters = parseCsv(fs.readFileSync('public/data/monsters_master.csv','utf8')).map(row => ({
  monsterId:+row.monster_id, name:row.name, stage:row.stage, attribute:row.attribute,
  unlockCondition:row.unlock_condition, evolutionFrom:row.evolution_from, evolutionTo:row.evolution_to
}));
const eggs = monsters.filter(monster => monster.stage === 'egg');
assert.ok(eggs.length >= 8);
for (const egg of eggs) {
  assert.equal(getBirthEggMonster(egg.monsterId, monsters)?.monsterId, egg.monsterId);
  assert.ok(fs.existsSync('public'+getMonsterImage(egg.monsterId)));
  const children = (egg.evolutionTo ?? '').split('|').filter(Boolean);
  assert.ok(children.length > 0);
  for (const name of children) {
    const baby = monsters.find(monster => monster.name === name);
    assert.ok(baby, name);
    assert.equal(getBirthEggMonster(baby.monsterId, monsters)?.monsterId, egg.monsterId, name);
  }
}
// The displayed egg must remain correct after progress changes the current ID
// and after serialization/reload. The queued next egg must not influence it.
window.localStorage.getItem = key => key === 'taskgame.virtualGameNow' ? '2026-11-01T12:00:00+09:00' : null;
window.localStorage.setItem = () => {};
const levelingRows = getFallbackLevelingMaster();
for (const eggId of [1,107]) {
  let state = {...game.buildInitialState([]), currentMonsterId:eggId, queuedEggMonsterId:eggId === 1 ? 107 : 1, hasSeenTutorial:true};
  for (let id=1;id<=3;id++) {
    state = game.completeTask({state,monsters,levelingRows,task:{taskId:id,name:'test',baseExp:2,power:1,heal:0,knowledge:0,create:0}}).nextState;
  }
  assert.equal(state.birthEventPending, true);
  assert.notEqual(state.currentMonsterId, eggId);
  assert.equal(getBirthEggMonster(state.currentMonsterId,monsters)?.monsterId,eggId);
  const restored = game.hydrateGameState(JSON.parse(JSON.stringify(state)),[],levelingRows);
  assert.equal(getBirthEggMonster(restored.currentMonsterId,monsters)?.monsterId,eggId);
}
assert.equal(getBirthEggMonster(undefined,monsters),undefined);
assert.equal(getBirthEggMonster(9999,monsters),undefined);
assert.equal(getBirthEggMonster(3,[]),undefined);
assert.equal(getBirthEggMonster(1,[{monsterId:1,name:'a',stage:'baby',evolutionFrom:'b'},{monsterId:2,name:'b',stage:'baby',evolutionFrom:'a'}]),undefined);
console.log('Birth eggs: all egg variants, actual hatch/reload, normal vs event, queued egg independence, missing data and cyclic ancestry passed.');
