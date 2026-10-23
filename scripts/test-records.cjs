require('./test-october-event.cjs');
const assert = require('node:assert/strict');
const game = require('../lib/game/state.ts');
const { summarizeRecords, normalizeRecords } = require('../lib/game/records.ts');
const { getFallbackLevelingMaster } = require('../lib/game/leveling.ts');
const levelingRows = getFallbackLevelingMaster();
const task = {taskId: 1, name:'テスト',baseExp:2,power:1,heal:0,knowledge:0,create:0};
let state = {...game.buildInitialState([task]),hasSeenTutorial:true,hasCompletedCurrentBirth:true,lastPlayedDate:'2026-10-02'};
state = game.completeTask({state, task, monsters:[],levelingRows}).nextState;
assert.equal(state.achievementRecords.length,1);
assert.equal(state.achievementRecords[0].exp,2);
assert.equal(game.completeTask({state,task,monsters:[],levelingRows}).nextState.achievementRecords.length,1);
state = {...state, pendingDailyReview:{targetDate:'2026-10-01',taskIds:[1],resolvedTaskIds:[],rewardedTaskIds:[]}};
state = game.resolveDailyReviewTask({state,tasks:[task],task,didComplete:true,monsters:[],levelingRows}).nextState;
assert.equal(state.achievementRecords.length,2);
assert.equal(state.achievementRecords[1].date,'2026-10-01');
state = game.resolveDailyReviewTask({state,tasks:[task],task,didComplete:true,monsters:[],levelingRows}).nextState;
assert.equal(state.achievementRecords.length,1, 'undo review removes only review record');
const summary = summarizeRecords({...state,achievementRecords:[...state.achievementRecords,{date:'2026-09-30',taskId:2,name:'旧記録',exp:null,coins:null}]},'2026-10-02');
assert.equal(summary.exp,2);
assert.deepEqual(summary.monthly,[['2026-09',1],['2026-10',1]]);
assert.equal(summary.week[2].value,1);
assert.equal(summary.week[4].value,1);
assert.equal(summary.difference,0);
assert.equal(normalizeRecords([null,{},...state.achievementRecords,...state.achievementRecords]).length,1);
console.log('Records: completion, duplicate prevention, review undo, month/week aggregation and unknown rewards passed.');
const { isNovemberRecordsEnabled } = require('../lib/game/recordsUi.ts');
assert.equal(isNovemberRecordsEnabled(new Date('2026-10-31T23:59:59+09:00')), false);
assert.equal(isNovemberRecordsEnabled(new Date('2026-11-01T00:00:00+09:00')), true);
assert.equal(isNovemberRecordsEnabled(new Date('2027-01-01T00:00:00+09:00')), true);
const sunday = summarizeRecords({...state, achievementRecords: [
  {date:'2026-10-25',taskId:1,name:'前週',exp:20,coins:4},
  {date:'2026-10-26',taskId:1,name:'月曜',exp:null,coins:null},
  {date:'2026-11-01',taskId:1,name:'日曜',exp:3,coins:2}
]}, '2026-11-01');
assert.deepEqual(sunday.week.map(day => day.value), [1,0,0,0,0,0,1]);
assert.equal(sunday.week.reduce((sum, day) => sum + day.value,0),2);
assert.equal(sunday.exp,23);
assert.equal(sunday.coins,6);
assert.deepEqual(summarizeRecords({...state, achievementRecords:[]},'2026-11-01').week.map(day => day.value),[0,0,0,0,0,0,0]);
console.log('November records: Japan midnight switch, cross-month week and empty/unknown rewards passed.');
