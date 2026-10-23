// Delayed cloud reads must never undo local actions or mutate storage after unmount.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync('lib/game/useGame.ts', 'utf8') + '\nexport function setTestUser() { hydratedUserUidThisSession = "test"; }', {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };

function mountTest() {
  const local = { currentMonsterId: 111, currentMonsterLevel: 12, currentMonsterExp: 146,
    stateUpdatedAt: '2026-10-01T00:00:00Z', eventStates: {}, acquiredLetters: [],
    selectedFrameId: '', ownedFrameIds: ['november_maple_frame'] };
  let saved = { ...local };
  let resolveCloud;
  const cloud = new Promise(resolve => { resolveCloud = resolve; });
  let hydratations = 0;
  const effects = [];
  const setters = [];
  let latestState = null;
  const stateApi = {
    loadGameState: () => saved,
    saveGameState: value => { saved = value; },
    hydrateGameState: value => { hydratations++; saved = value; return value; },
    reconcileMonsterProgress: ({ state }) => state,
    equipFrame: (state, id) => ({ equipped: true, nextState: { ...state, selectedFrameId: id } })
  };
  const modules = {
    react: {
      useState: value => { const index = setters.length; setters.push(null); return [value, next => { if (index === 3) latestState = next; }]; },
      useEffect: fn => effects.push(fn), useCallback: fn => fn, useMemo: fn => fn(), useRef: value => ({ current: value })
    },
    'next/navigation': { useRouter: () => ({ replace() {} }), usePathname: () => '/inventory' },
    '@/components/auth/AuthProvider': { useAuth: () => ({ user: { uid: 'test' }, isLoading: false }) },
    '@/lib/game/customTasks': { normalizeCustomTasks: () => [] },
    '@/lib/game/octoberUi': { isOctoberUiEnabled: () => true },
    '@/lib/csv/tasksMaster': { loadTasksMaster: async () => [] },
    '@/lib/csv/monstersMaster': { loadMonstersMaster: async () => [{ monsterId: 111 }] },
    '@/lib/csv/levelingMaster': { loadLevelingMaster: async () => [] },
    '@/lib/game/cloudState': { loadCloudGameState: () => cloud, saveCloudGameState: async () => {} },
    '@/lib/game/cloudEvents': { loadCloudEventStates: async () => ({}), saveCloudEventStates: async () => {} },
    '@/lib/game/cloudCommerce': {
      loadCloudWalletSummary: async () => null, loadCloudInventoryProfile: async () => null,
      mergeCommerceIntoGameState: state => state, saveCloudCommerceState: async () => {}
    },
    '@/lib/game/assets': { getMonsterImage: () => '/test.png', getMonsterMotionAsset: () => null },
    '@/lib/game/state': stateApi,
    '@/lib/analytics/gtag': { trackEvent() {} }
  };
  const output = { exports: {} };
  vm.runInNewContext(source, {
    exports: output.exports, require: name => modules[name] ?? {}, console, process,
    Image: class { complete = true; set src(_) {} },
    window: { setTimeout, clearTimeout, addEventListener() {}, removeEventListener() {} },
    document: { addEventListener() {}, removeEventListener() {} }
  });
  output.exports.setTestUser();
  const game = output.exports.useGame();
  const cleanups = effects.map(effect => effect());
  return { game, local, resolveCloud, state: () => latestState, saved: () => saved,
    hydrations: () => hydratations, unmount: () => cleanups.forEach(fn => fn?.()) };
}

(async () => {
  const mounted = mountTest();
  await flush();
  assert.equal(mounted.state().currentMonsterId, 111);
  mounted.game.equipFrame('november_maple_frame');
  const committed = mounted.saved();
  mounted.resolveCloud({ ...mounted.local, currentMonsterId: 1, stateUpdatedAt: '2026-10-02T00:00:00Z' });
  await flush();
  assert.equal(mounted.saved().currentMonsterId, 111, 'Late cloud response must not restore the old normal egg');
  assert.equal(mounted.saved().selectedFrameId, 'november_maple_frame', 'Late init must preserve the equipped reward');
  assert.equal(mounted.saved(), committed, 'Initialization must not overwrite a newer local action');

  const cancelled = mountTest();
  await flush();
  cancelled.unmount();
  cancelled.resolveCloud({ ...cancelled.local, currentMonsterId: 1 });
  await flush();
  assert.equal(cancelled.hydrations(), 0, 'Unmounted init must not hydrate or write local storage');
  assert.equal(cancelled.saved().currentMonsterId, 111);
  console.log('Game sync: late cloud response and cancelled initialization cannot undo monster/frame state.');
})().catch(error => { console.error(error); process.exitCode = 1; });
