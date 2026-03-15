export type AttributeTotals = {
  power: number;
  heal: number;
  knowledge: number;
  create: number;
};

export type ActiveTask = {
  taskId: number;
  sortOrder: number;
  enabled: boolean;
};

export type LetterRecord = {
  letterId: string;
  title: string;
  body: string;
  imagePath: string;
  fromMonsterId: number;
  fromMonsterName: string;
  obtainedDate: string;
};

export type GameState = {
  currentMonsterId: number;
  currentMonsterLevel: number;
  currentMonsterExp: number;
  todayExp: number;
  streakDays: number;
  attributeTotals: AttributeTotals;
  completedTaskIdsToday: number[];
  activeTasks: ActiveTask[];
  discoveredMonsterIds: number[];
  acquiredLetters: LetterRecord[];
  lastPlayedDate: string;
  hasSeenTutorial: boolean;
  isInTutorialFlow: boolean;
  onboardingCompletedTaskCount: number;
  birthEventPending: boolean;
  hasCompletedInitialBirth: boolean;
  hasCompletedCurrentBirth: boolean;
  endEventPending: boolean;
};
