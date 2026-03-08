import type { GameState } from "@/types/game";
import type { MonsterMaster, TaskMaster } from "@/types/master";
import { evaluateEvolution, resolveBirthMonsterId } from "./evolution";

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

function uniqueNumbers(values: number[]): number[] {
  return [...new Set(values.filter((v) => Number.isFinite(v)))];
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

function expForNextLevel(level: number): number {
  return 20 + Math.max(0, level - 1) * 5;
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
    streakDays: 0,
    attributeTotals: {
      power: 0,
      heal: 0,
      knowledge: 0,
      create: 0
    },
    completedTaskIdsToday: [],
    activeTasks,
    discoveredMonsterIds: [1],
    lastPlayedDate: todayLocalDate(),
    hasSeenTutorial: false,
    isInTutorialFlow: false,
    onboardingCompletedTaskCount: 0,
    birthEventPending: false,
    hasCompletedInitialBirth: false
  };
}

function normalizeState(parsed: Partial<GameState>, tasks: TaskMaster[]): GameState {
  const initial = buildInitialState(tasks);

  const hasCompletedInitialBirth =
    typeof parsed.hasCompletedInitialBirth === "boolean"
      ? parsed.hasCompletedInitialBirth
      : Number(parsed.currentMonsterId ?? initial.currentMonsterId) !== 1;

  const rawDiscovered = Array.isArray(parsed.discoveredMonsterIds) ? parsed.discoveredMonsterIds : [];
  const normalizedActiveTasks = normalizeActiveTasks(parsed.activeTasks, initial.activeTasks);

  return {
    ...initial,
    ...parsed,
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
    hasSeenTutorial: typeof parsed.hasSeenTutorial === "boolean" ? parsed.hasSeenTutorial : hasCompletedInitialBirth,
    isInTutorialFlow: typeof parsed.isInTutorialFlow === "boolean" ? parsed.isInTutorialFlow : false,
    onboardingCompletedTaskCount:
      typeof parsed.onboardingCompletedTaskCount === "number"
        ? parsed.onboardingCompletedTaskCount
        : hasCompletedInitialBirth
          ? 3
          : 0,
    birthEventPending: typeof parsed.birthEventPending === "boolean" ? parsed.birthEventPending : false,
    hasCompletedInitialBirth
  };
}

function applyDailyReset(state: GameState): GameState {
  const today = todayLocalDate();
  if (state.lastPlayedDate === today) return state;

  return {
    ...state,
    todayExp: 0,
    completedTaskIdsToday: [],
    lastPlayedDate: today
  };
}

export function saveGameState(state: GameState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadGameState(tasks: TaskMaster[]): GameState {
  if (typeof window === "undefined") return buildInitialState(tasks);

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = buildInitialState(tasks);
    saveGameState(initial);
    return initial;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<GameState>;
    const normalized = normalizeState(parsed, tasks);
    const resetApplied = applyDailyReset(normalized);
    saveGameState(resetApplied);
    return resetApplied;
  } catch {
    const initial = buildInitialState(tasks);
    saveGameState(initial);
    return initial;
  }
}

function applyExpAndAttributes(state: GameState, task: TaskMaster): GameState {
  let level = state.currentMonsterLevel;
  let exp = state.currentMonsterExp + task.baseExp;

  while (exp >= expForNextLevel(level)) {
    exp -= expForNextLevel(level);
    level += 1;
  }

  return {
    ...state,
    currentMonsterLevel: level,
    currentMonsterExp: exp,
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
  if (state.hasCompletedInitialBirth) return state;

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
}): CompleteTaskResult {
  const { state, task, monsters } = params;

  if (state.completedTaskIdsToday.includes(task.taskId)) {
    return {
      nextState: state,
      gainedExp: 0,
      gainedAttributes: { power: 0, heal: 0, knowledge: 0, create: 0 },
      alreadyCompleted: true,
      evolved: false,
      levelUp: false
    };
  }

  const previousLevel = state.currentMonsterLevel;
  const previousMonsterId = state.currentMonsterId;

  let nextState = applyExpAndAttributes(state, task);
  nextState = applyInitialBirthProgress(nextState, monsters);

  if (nextState.hasCompletedInitialBirth) {
    const nextMonsterId = evaluateEvolution({ gameState: nextState, monsters });
    if (nextMonsterId && nextMonsterId !== nextState.currentMonsterId) {
      nextState = {
        ...nextState,
        currentMonsterId: nextMonsterId,
        discoveredMonsterIds: uniqueNumbers([...nextState.discoveredMonsterIds, nextMonsterId])
      };
    }
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
    levelUp: nextState.currentMonsterLevel > previousLevel
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

export function finishBirthEvent(state: GameState): GameState {
  return {
    ...state,
    birthEventPending: false,
    hasCompletedInitialBirth: true,
    hasSeenTutorial: true,
    isInTutorialFlow: false,
    discoveredMonsterIds: uniqueNumbers([...state.discoveredMonsterIds, state.currentMonsterId])
  };
}

export function startTutorialFlow(state: GameState): GameState {
  if (state.hasCompletedInitialBirth) {
    return state;
  }
  return {
    ...state,
    isInTutorialFlow: true
  };
}

export function getInitialRoute(state: GameState): "/tutorial" | "/tasks" | "/birth-event" | "/home" {
  if (state.birthEventPending && !state.hasCompletedInitialBirth) return "/birth-event";
  if (!state.hasCompletedInitialBirth) return state.isInTutorialFlow ? "/tasks" : "/tutorial";
  return "/home";
}

export function progressToNextLevel(level: number, exp: number): { current: number; required: number } {
  return {
    current: exp,
    required: expForNextLevel(level)
  };
}
