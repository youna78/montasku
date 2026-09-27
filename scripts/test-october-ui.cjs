// Reuse the TypeScript loader and existing event regression checks.
require('./test-october-event.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const state = require('../lib/game/state.ts');
const { isOctoberUiEnabled, tasksUntilBirth } = require('../lib/game/octoberUi.ts');
const { getActiveHomeAnnouncements } = require('../lib/game/announcements.ts');
const { getFallbackLevelingMaster } = require('../lib/game/leveling.ts');
const { parseCsv } = require('../lib/csv/loadCsv.ts');
assert.equal(isOctoberUiEnabled(new Date('2026-09-30T23:59:59+09:00')), false);
assert.equal(isOctoberUiEnabled(new Date('2026-10-01T00:00:00+09:00')), true);
assert.equal(isOctoberUiEnabled(new Date('2026-11-01T00:00:00+09:00')), true);
assert.equal(getActiveHomeAnnouncements(new Date('2026-09-30T23:59:59+09:00')).some(item => item.announcementId === 'october_update_2026_10_01'), false);
const octoberAnnouncements = getActiveHomeAnnouncements(new Date('2026-10-01T00:00:00+09:00'));
const octoberUpdate = octoberAnnouncements.find(item => item.announcementId === 'october_update_2026_10_01');
assert.ok(octoberUpdate);
assert.equal(octoberUpdate.showPopup, true);
assert.equal(octoberUpdate.details.length, 3);
const monsters = parseCsv(fs.readFileSync('public/data/monsters_master.csv', 'utf8')).map(r => ({
 monsterId: +r.monster_id, name:r.name, stage:r.stage, attribute:r.attribute,
 unlockCondition:r.unlock_condition, evolutionFrom:r.evolution_from, evolutionTo:r.evolution_to
}));
const levelingRows = getFallbackLevelingMaster();
let player = state.startTutorialFlow(state.buildInitialState([]));
for (let i=1;i<=3;i++) {
 const task={taskId:i,baseExp:2,power:0,heal:1,knowledge:0,create:0};
 player=state.completeTask({state:player,task,monsters,levelingRows}).nextState;
 assert.equal(tasksUntilBirth(player.onboardingCompletedTaskCount),3-i);
 assert.equal(player.birthEventPending,i===3);
 const duplicate=state.completeTask({state:player,task,monsters,levelingRows});
 assert.equal(duplicate.alreadyCompleted,true);
 assert.equal(duplicate.nextState.onboardingCompletedTaskCount,i);
}
// Serialized state must preserve the pending scene across navigation/restart.
player=state.reconcileMonsterProgress({state:JSON.parse(JSON.stringify(player)),monsters,levelingRows});
assert.equal(state.getInitialRoute(player),'/birth-event');
const bornId=player.currentMonsterId;
player=state.finishBirthEvent(player,monsters,levelingRows);
assert.equal(player.birthEventPending,false);
assert.equal(player.currentMonsterId,bornId);
assert.equal(state.getInitialRoute(player),'/home');
player=state.completeTask({state:player,task:{taskId:4,baseExp:2,power:0,heal:1,knowledge:0,create:0},monsters,levelingRows}).nextState;
assert.equal(player.birthEventPending,false);
console.log('October UI: JST activation, announcement timing, hatch progress, duplicate completion and restart recovery passed.');
