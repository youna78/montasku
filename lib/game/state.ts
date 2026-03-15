import type { GameState, LetterRecord } from "@/types/game";
import type { LevelingMaster, MonsterMaster, TaskMaster } from "@/types/master";
import { LETTER_ITEM_IMAGES } from "./assets";
import { evaluateEvolution, resolveBirthMonsterId } from "./evolution";
import {
  getCumulativeExpForLevel,
  getFallbackLevelingMaster,
  getLevelProgress,
  isEndLevel,
  normalizeLevelingMaster,
  resolveLevelFromExp
} from "./leveling";

const STORAGE_KEY = "habit-monster-mvp-state";
const MIN_ACTIVE_TASKS = 3;
const MAX_ACTIVE_TASKS = 15;

export type CompleteTaskResult = {
  nextState: GameState;
  gainedExp: number;
  gainedAttributes: {
    power: number;
    heal: number;
    knowledge: number;
    create: number;
  };
  alreadyCompleted: boolean;
  evolved: boolean;
  levelUp: boolean;
  previousMonsterId: number;
  nextMonsterId: number;
};

export type AddTaskResult = {
  nextState: GameState;
  added: boolean;
  reason?: "already_active" | "max_reached";
};

export type RemoveTaskResult = {
  nextState: GameState;
  removed: boolean;
  reason?: "not_found" | "min_reached";
};

export type ReorderTaskResult = {
  nextState: GameState;
  moved: boolean;
  reason?: "not_found" | "boundary";
};

export type FinishEndEventResult = GameState;

function uniqueNumbers(values: number[]): number[] {
  return [...new Set(values.filter((v) => Number.isFinite(v)))];
}

function normalizeLetters(rawLetters: GameState["acquiredLetters"] | undefined): GameState["acquiredLetters"] {
  if (!Array.isArray(rawLetters)) return [];

  return rawLetters.reduce<LetterRecord[]>((acc, letter) => {
    if (
      !letter ||
      typeof letter.letterId !== "string" ||
      typeof letter.title !== "string" ||
      typeof letter.body !== "string" ||
      typeof letter.fromMonsterId !== "number" ||
      typeof letter.fromMonsterName !== "string" ||
      typeof letter.obtainedDate !== "string"
    ) {
      return acc;
    }

    acc.push({
      ...letter,
      imagePath: typeof letter.imagePath === "string" ? letter.imagePath : LETTER_ITEM_IMAGES[0]
    });
    return acc;
  }, []);
}

const LETTER_TEMPLATES: Array<{ title: string; body: string; imagePath: string }> = [
  {
    title: "ありがとうのてがみ",
    body: "いっしょに すごした じかんは たいせつな たからもの。\nこれからも きみの まいにちを そっと おうえんしているよ。",
    imagePath: LETTER_ITEM_IMAGES[0]
  },
  {
    title: "げんきでいてね",
    body: "きょうまで たくさん がんばったね。\nむりしすぎず じぶんの ぺーすで すすんでいってね。",
    imagePath: LETTER_ITEM_IMAGES[1]
  },
  {
    title: "つぎのぼうけんへ",
    body: "ここからさきは あたらしい ぼうけんの はじまり。\nきっと また すてきな であいが まっているよ。",
    imagePath: LETTER_ITEM_IMAGES[2]
  },
  {
    title: "みまもっているよ",
    body: "はなれていても きみの がんばりは ちゃんと みえているよ。\nこまった ときは ひとやすみして だいじょうぶ。",
    imagePath: LETTER_ITEM_IMAGES[3]
  },
  {
    title: "ちいさなきろく",
    body: "きょうの いっぽも あしたの いっぽも ぜんぶ たいせつ。\nすこしずつでも まえに すすめば それで じゅうぶんだよ。",
    imagePath: LETTER_ITEM_IMAGES[4]
  },
  {
    title: "まほうのことば",
    body: "よく がんばったね。 えらい。\nそのことばを いつでも じぶんに かけてあげてね。",
    imagePath: LETTER_ITEM_IMAGES[5]
  },
  {
    title: "またあうひまで",
    body: "しばらく たびに でるけれど きみのことは わすれないよ。\nつぎの タマゴも きっと すてきに そだっていくはず。",
    imagePath: LETTER_ITEM_IMAGES[6]
  }
];

function pickRandomLetterTemplate(): { title: string; body: string; imagePath: string } {
  const index = Math.floor(Math.random() * LETTER_TEMPLATES.length);
  return LETTER_TEMPLATES[index] ?? LETTER_TEMPLATES[0];
}

function buildFarewellLetter(state: GameState, monster: MonsterMaster | undefined): LetterRecord {
  const fromMonsterName = monster?.name ?? "モンスター";
  const template = pickRandomLetterTemplate();
  return {
    letterId: `${fromMonsterName}-${state.lastPlayedDate}-${state.currentMonsterExp}`,
    title: template.title,
    body: template.body,
    imagePath: template.imagePath,
    fromMonsterId: monster?.monsterId ?? state.currentMonsterId,
    fromMonsterName,
    obtainedDate: state.lastPlayedDate
  };
}

function normalizeActiveTasks(
  rawActiveTasks: GameState["activeTasks"] | undefined,
  fallback: GameState["activeTasks"]
): GameState["activeTasks"] {
  const source = Array.isArray(rawActiveTasks) && rawActiveTasks.length > 0 ? rawActiveTasks : fallback;

  const enabledUnique = source
    .filter((task) => task && Number.isFinite(task.taskId) && task.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .reduce<Array<{ taskId: number; sortOrder: number; enabled: boolean }>>((acc, task) => {
      if (acc.some((current) => current.taskId === task.taskId)) {
        return acc;
      }
      acc.push({ taskId: task.taskId, sortOrder: acc.length + 1, enabled: true });
      return acc;
    }, []);

  if (enabledUnique.length === 0) {
    return fallback;
  }

  return enabledUnique;
}

function sortAndReindexActiveTasks(activeTasks: GameState["activeTasks"]): GameState["activeTasks"] {
  return activeTasks
    .filter((task) => task.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((task, idx) => ({
      taskId: task.taskId,
      sortOrder: idx + 1,
      enabled: true
    }));
}

function reindexActiveTasksInCurrentOrder(activeTasks: GameState["activeTasks"]): GameState["activeTasks"] {
  return activeTasks.map((task, idx) => ({
    taskId: task.taskId,
    sortOrder: idx + 1,
    enabled: true
  }));
}

function todayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDateString(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, monthIndex, day, 12, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function diffDays(fromDate: string, toDate: string): number | null {
  const from = parseLocalDateString(fromDate);
  const to = parseLocalDateString(toDate);
  if (!from || !to) return null;

  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  return Math.round((to.getTime() - from.getTime()) / millisecondsPerDay);
}

function legacyExpForNextLevel(level: number): number {
  return 20 + Math.max(0, level - 1) * 5;
}

function legacyTotalExp(level: number, currentExp: number): number {
  let total = Math.max(0, currentExp);
  for (let currentLevel = 1; currentLevel < level; currentLevel += 1) {
    total += legacyExpForNextLevel(currentLevel);
  }
  return total;
}

export function buildInitialState(tasks: TaskMaster[]): GameState {
  const activeTasks = tasks
    .filter((task) => task.defaultEnabled)
    .sort((a, b) => a.recommendedOrder - b.recommendedOrder)
    .map((task, idx) => ({
      taskId: task.taskId,
      sortOrder: idx + 1,
      enabled: true
    }));

  return {
    currentMonsterId: 1,
    currentMonsterLevel: 1,
    currentMonsterExp: 0,
    todayExp: 0,
    streakDays: 1,
    attributeTotals: {
      power: 0,
      heal: 0,
      knowledge: 0,
      create: 0
    },
    completedTaskIdsToday: [],
    activeTasks,
    discoveredMonsterIds: [1],
    acquiredLetters: [],
    lastPlayedDate: todayLocalDate(),
    hasSeenTutorial: false,
    isInTutorialFlow: false,
    onboardingCompletedTaskCount: 0,
    birthEventPending: false,
    hasCompletedInitialBirth: false,
    hasCompletedCurrentBirth: false,
    endEventPending: false
  };
}

function normalizeState(
  parsed: Partial<GameState>,
  tasks: TaskMaster[],
  levelingRows: LevelingMaster[]
): GameState {
  const initial = buildInitialState(tasks);
  const table = normalizeLevelingMaster(levelingRows);

  const parsedLevel = typeof parsed.currentMonsterLevel === "number" ? parsed.currentMonsterLevel : initial.currentMonsterLevel;
  const parsedExp = typeof parsed.currentMonsterExp === "number" ? parsed.currentMonsterExp : initial.currentMonsterExp;
  const totalExp =
    parsedLevel > 1 && parsedExp < legacyExpForNextLevel(parsedLevel)
      ? legacyTotalExp(parsedLevel, parsedExp)
      : parsedExp;
  const resolvedLevel = resolveLevelFromExp(totalExp, table);
  const hasCompletedInitialBirth =
    typeof parsed.hasCompletedInitialBirth === "boolean"
      ? parsed.hasCompletedInitialBirth
      : Number(parsed.currentMonsterId ?? initial.currentMonsterId) !== 1;
  const hasCompletedCurrentBirth =
    typeof parsed.hasCompletedCurrentBirth === "boolean"
      ? parsed.hasCompletedCurrentBirth
      : hasCompletedInitialBirth && Number(parsed.currentMonsterId ?? initial.currentMonsterId) !== 1;
  const shouldQueueEndEvent =
    isEndLevel(resolvedLevel.level, table) &&
    hasCompletedCurrentBirth &&
    Number(parsed.currentMonsterId ?? initial.currentMonsterId) !== 1;
  const rawDiscovered = Array.isArray(parsed.discoveredMonsterIds) ? parsed.discoveredMonsterIds : [];
  const normalizedActiveTasks = normalizeActiveTasks(parsed.activeTasks, initial.activeTasks);

  return {
    ...initial,
    ...parsed,
    currentMonsterLevel: resolvedLevel.level,
    currentMonsterExp: totalExp,
    attributeTotals: {
      ...initial.attributeTotals,
      ...(parsed.attributeTotals ?? {})
    },
    completedTaskIdsToday: Array.isArray(parsed.completedTaskIdsToday) ? parsed.completedTaskIdsToday : [],
    activeTasks: normalizedActiveTasks,
    discoveredMonsterIds: uniqueNumbers([
      ...initial.discoveredMonsterIds,
      ...rawDiscovered,
      Number(parsed.currentMonsterId ?? 1)
    ]),
    acquiredLetters: normalizeLetters(parsed.acquiredLetters),
    hasSeenTutorial: typeof parsed.hasSeenTutorial === "boolean" ? parsed.hasSeenTutorial : hasCompletedInitialBirth,
    isInTutorialFlow: typeof parsed.isInTutorialFlow === "boolean" ? parsed.isInTutorialFlow : false,
    onboardingCompletedTaskCount:
      typeof parsed.onboardingCompletedTaskCount === "number"
        ? parsed.onboardingCompletedTaskCount
        : hasCompletedInitialBirth
          ? 3
          : 0,
    birthEventPending: typeof parsed.birthEventPending === "boolean" ? parsed.birthEventPending : false,
    hasCompletedInitialBirth,
    hasCompletedCurrentBirth,
    endEventPending: typeof parsed.endEventPending === "boolean" ? parsed.endEventPending : shouldQueueEndEvent
  };
}

function applyDailyReset(state: GameState): GameState {
  const today = todayLocalDate();
  if (state.lastPlayedDate === today) return state;

  const dayDiff = diffDays(state.lastPlayedDate, today);
  const nextStreakDays = dayDiff === 1 ? Math.max(1, state.streakDays) + 1 : 1;

  return {
    ...state,
    todayExp: 0,
    completedTaskIdsToday: [],
    streakDays: nextStreakDays,
    lastPlayedDate: today
  };
}

export function saveGameState(state: GameState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadGameState(
  tasks: TaskMaster[],
  levelingRows: LevelingMaster[] = getFallbackLevelingMaster()
): GameState {
  if (typeof window === "undefined") return buildInitialState(tasks);

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = buildInitialState(tasks);
    saveGameState(initial);
    return initial;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<GameState>;
    const normalized = normalizeState(parsed, tasks, levelingRows);
    const resetApplied = applyDailyReset(normalized);
    saveGameState(resetApplied);
    return resetApplied;
  } catch {
    const initial = buildInitialState(tasks);
    saveGameState(initial);
    return initial;
  }
}

function applyExpAndAttributes(
  state: GameState,
  task: TaskMaster,
  levelingRows: LevelingMaster[]
): GameState {
  const table = normalizeLevelingMaster(levelingRows);
  const totalExp = state.currentMonsterExp + task.baseExp;
  const resolvedLevel = resolveLevelFromExp(totalExp, table);

  return {
    ...state,
    currentMonsterLevel: resolvedLevel.level,
    currentMonsterExp: totalExp,
    todayExp: state.todayExp + task.baseExp,
    attributeTotals: {
      power: state.attributeTotals.power + task.power,
      heal: state.attributeTotals.heal + task.heal,
      knowledge: state.attributeTotals.knowledge + task.knowledge,
      create: state.attributeTotals.create + task.create
    },
    completedTaskIdsToday: [...state.completedTaskIdsToday, task.taskId]
  };
}

function applyInitialBirthProgress(state: GameState, monsters: MonsterMaster[]): GameState {
  if (state.hasCompletedCurrentBirth) return state;

  const onboardingCompletedTaskCount = state.onboardingCompletedTaskCount + 1;
  if (onboardingCompletedTaskCount < 3) {
    return {
      ...state,
      onboardingCompletedTaskCount
    };
  }

  const birthMonsterId = resolveBirthMonsterId(state.attributeTotals, monsters) ?? state.currentMonsterId;
  return {
    ...state,
    onboardingCompletedTaskCount,
    birthEventPending: true,
    currentMonsterId: birthMonsterId,
    discoveredMonsterIds: uniqueNumbers([...state.discoveredMonsterIds, birthMonsterId])
  };
}

// Complete-task state update is centralized here.
export function completeTask(params: {
  state: GameState;
  task: TaskMaster;
  monsters: MonsterMaster[];
  levelingRows: LevelingMaster[];
}): CompleteTaskResult {
  const { state, task, monsters, levelingRows } = params;

  if (state.completedTaskIdsToday.includes(task.taskId)) {
    return {
      nextState: state,
      gainedExp: 0,
      gainedAttributes: { power: 0, heal: 0, knowledge: 0, create: 0 },
      alreadyCompleted: true,
      evolved: false,
      levelUp: false,
      previousMonsterId: state.currentMonsterId,
      nextMonsterId: state.currentMonsterId
    };
  }

  const previousLevel = state.currentMonsterLevel;
  const previousMonsterId = state.currentMonsterId;

  let nextState = applyExpAndAttributes(state, task, levelingRows);
  nextState = applyInitialBirthProgress(nextState, monsters);
  const didLevelUp = nextState.currentMonsterLevel > previousLevel;

  if (nextState.hasCompletedCurrentBirth && didLevelUp) {
    const nextMonsterId = evaluateEvolution({ gameState: nextState, monsters });
    if (nextMonsterId && nextMonsterId !== nextState.currentMonsterId) {
      nextState = {
        ...nextState,
        currentMonsterId: nextMonsterId,
        discoveredMonsterIds: uniqueNumbers([...nextState.discoveredMonsterIds, nextMonsterId])
      };
    }
  }

  if (nextState.hasCompletedCurrentBirth && didLevelUp && isEndLevel(nextState.currentMonsterLevel, levelingRows)) {
    nextState = {
      ...nextState,
      endEventPending: true
    };
  }

  return {
    nextState,
    gainedExp: task.baseExp,
    gainedAttributes: {
      power: task.power,
      heal: task.heal,
      knowledge: task.knowledge,
      create: task.create
    },
    alreadyCompleted: false,
    evolved: nextState.currentMonsterId !== previousMonsterId,
    levelUp: didLevelUp,
    previousMonsterId,
    nextMonsterId: nextState.currentMonsterId
  };
}

export function addTaskToActive(state: GameState, taskId: number): AddTaskResult {
  const activeEnabled = state.activeTasks.filter((t) => t.enabled);
  if (activeEnabled.some((t) => t.taskId === taskId)) {
    return { nextState: state, added: false, reason: "already_active" };
  }
  if (activeEnabled.length >= MAX_ACTIVE_TASKS) {
    return { nextState: state, added: false, reason: "max_reached" };
  }

  const nextSortOrder = Math.max(0, ...state.activeTasks.map((t) => t.sortOrder)) + 1;
  return {
    nextState: {
      ...state,
      activeTasks: [...state.activeTasks, { taskId, sortOrder: nextSortOrder, enabled: true }]
    },
    added: true
  };
}

export function removeTaskFromActive(state: GameState, taskId: number): RemoveTaskResult {
  const activeEnabled = sortAndReindexActiveTasks(state.activeTasks);
  const found = activeEnabled.some((task) => task.taskId === taskId);
  if (!found) {
    return { nextState: state, removed: false, reason: "not_found" };
  }
  if (activeEnabled.length <= MIN_ACTIVE_TASKS) {
    return { nextState: state, removed: false, reason: "min_reached" };
  }

  const nextActiveTasks = sortAndReindexActiveTasks(activeEnabled.filter((task) => task.taskId !== taskId));
  return {
    nextState: {
      ...state,
      activeTasks: nextActiveTasks,
      completedTaskIdsToday: state.completedTaskIdsToday.filter((id) => id !== taskId)
    },
    removed: true
  };
}

export function moveTaskInActive(
  state: GameState,
  taskId: number,
  direction: "up" | "down"
): ReorderTaskResult {
  const activeEnabled = sortAndReindexActiveTasks(state.activeTasks);
  const index = activeEnabled.findIndex((task) => task.taskId === taskId);
  if (index < 0) {
    return { nextState: state, moved: false, reason: "not_found" };
  }

  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= activeEnabled.length) {
    return { nextState: state, moved: false, reason: "boundary" };
  }

  const before = activeEnabled.map((task) => ({ taskId: task.taskId, sortOrder: task.sortOrder }));
  const next = [...activeEnabled];
  const currentTask = next[index];
  next[index] = next[target];
  next[target] = currentTask;
  const reindexed = reindexActiveTasksInCurrentOrder(next);
  const after = reindexed.map((task) => ({ taskId: task.taskId, sortOrder: task.sortOrder }));

  console.debug("[task-reorder] moveTaskInActive", {
    taskId,
    direction,
    before,
    after
  });

  return {
    nextState: {
      ...state,
      activeTasks: reindexed
    },
    moved: true
  };
}

export function getTaskLimitInfo(state: GameState): { min: number; max: number; current: number } {
  return {
    min: MIN_ACTIVE_TASKS,
    max: MAX_ACTIVE_TASKS,
    current: state.activeTasks.filter((t) => t.enabled).length
  };
}

export function finishBirthEvent(
  state: GameState,
  levelingRows: LevelingMaster[] = getFallbackLevelingMaster()
): GameState {
  const babyStartExp = getCumulativeExpForLevel(2, levelingRows);

  return {
    ...state,
    currentMonsterLevel: 2,
    currentMonsterExp: babyStartExp,
    todayExp: 0,
    birthEventPending: false,
    hasCompletedInitialBirth: true,
    hasCompletedCurrentBirth: true,
    hasSeenTutorial: true,
    isInTutorialFlow: false,
    discoveredMonsterIds: uniqueNumbers([...state.discoveredMonsterIds, state.currentMonsterId])
  };
}

export function finishEndEvent(state: GameState, monsters: MonsterMaster[]): FinishEndEventResult {
  const currentMonster = monsters.find((monster) => monster.monsterId === state.currentMonsterId);
  const nextLetter = buildFarewellLetter(state, currentMonster);

  return {
    ...state,
    currentMonsterId: 1,
    currentMonsterLevel: 1,
    currentMonsterExp: 0,
    attributeTotals: {
      power: 0,
      heal: 0,
      knowledge: 0,
      create: 0
    },
    onboardingCompletedTaskCount: 0,
    birthEventPending: false,
    hasCompletedCurrentBirth: false,
    endEventPending: false,
    isInTutorialFlow: false,
    discoveredMonsterIds: uniqueNumbers([...state.discoveredMonsterIds, 1]),
    acquiredLetters: [...state.acquiredLetters, nextLetter]
  };
}

export function startTutorialFlow(state: GameState): GameState {
  if (state.hasSeenTutorial) {
    return state;
  }
  return {
    ...state,
    isInTutorialFlow: true
  };
}

export function getInitialRoute(state: GameState): "/tutorial" | "/tasks" | "/birth-event" | "/end-event" | "/home" {
  if (state.endEventPending) return "/end-event";
  if (state.birthEventPending) return "/birth-event";
  if (!state.hasSeenTutorial) return state.isInTutorialFlow ? "/tasks" : "/tutorial";
  return "/home";
}

export function progressToNextLevel(
  level: number,
  totalExp: number,
  levelingRows: LevelingMaster[] = getFallbackLevelingMaster()
): { current: number; required: number; currentTotal: number; nextTotal: number | null } {
  return getLevelProgress(level, totalExp, levelingRows);
}
