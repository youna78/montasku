"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadLevelingMaster } from "@/lib/csv/levelingMaster";
import { loadMonstersMaster } from "@/lib/csv/monstersMaster";
import { loadTasksMaster } from "@/lib/csv/tasksMaster";
import {
  addTaskToActive,
  completeTask as runCompleteTask,
  finishEndEvent as runFinishEndEvent,
  finishBirthEvent as runFinishBirthEvent,
  loadGameState,
  moveTaskInActive,
  removeTaskFromActive,
  saveGameState,
  startTutorialFlow as runStartTutorialFlow,
  type AddTaskResult,
  type CompleteTaskResult,
  type RemoveTaskResult,
  type ReorderTaskResult
} from "@/lib/game/state";
import type { GameState } from "@/types/game";
import type { LevelingMaster, MonsterMaster, TaskMaster } from "@/types/master";

type UseGameResult = {
  tasks: TaskMaster[];
  monsters: MonsterMaster[];
  levelingRows: LevelingMaster[];
  gameState: GameState | null;
  isLoading: boolean;
  completeTask: (taskId: number) => CompleteTaskResult | null;
  addTask: (taskId: number) => AddTaskResult | null;
  removeTask: (taskId: number) => RemoveTaskResult | null;
  moveTask: (taskId: number, direction: "up" | "down") => ReorderTaskResult | null;
  startTutorialFlow: () => void;
  finishBirthEvent: () => void;
  finishEndEvent: () => void;
};

export function useGame(): UseGameResult {
  const [tasks, setTasks] = useState<TaskMaster[]>([]);
  const [monsters, setMonsters] = useState<MonsterMaster[]>([]);
  const [levelingRows, setLevelingRows] = useState<LevelingMaster[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const gameStateRef = useRef<GameState | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const loadedTasks = await loadTasksMaster();
        const loadedLeveling = await loadLevelingMaster();
        const loadedState = loadGameState(loadedTasks, loadedLeveling);

        setTasks(loadedTasks);
        setLevelingRows(loadedLeveling);
        setGameState(loadedState);
        gameStateRef.current = loadedState;

        try {
          const loadedMonsters = await loadMonstersMaster();
          setMonsters(loadedMonsters);
        } catch (monsterError) {
          console.error("[useGame] failed to load monsters CSV", monsterError);
          setMonsters([]);
        }
      } catch (taskError) {
        console.error("[useGame] failed to initialize game", taskError);
        const fallbackState = loadGameState([]);
        setTasks([]);
        setMonsters([]);
        setLevelingRows([]);
        setGameState(fallbackState);
        gameStateRef.current = fallbackState;
      } finally {
        setIsLoading(false);
      }
    }

    init().catch((unexpectedError) => {
      console.error("[useGame] unexpected init error", unexpectedError);
      setIsLoading(false);
    });
  }, []);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const commitState = useCallback((next: GameState) => {
    gameStateRef.current = next;
    setGameState(next);
    saveGameState(next);
  }, []);

  const completeTask = useCallback(
    (taskId: number): CompleteTaskResult | null => {
      const current = gameStateRef.current;
      if (!current) return null;
      const task = tasks.find((t) => t.taskId === taskId);
      if (!task) return null;

      const result = runCompleteTask({ state: current, task, monsters, levelingRows });
      commitState(result.nextState);
      return result;
    },
    [commitState, monsters, tasks, levelingRows]
  );

  const addTask = useCallback(
    (taskId: number): AddTaskResult | null => {
      const current = gameStateRef.current;
      if (!current) return null;
      const result = addTaskToActive(current, taskId);
      commitState(result.nextState);
      return result;
    },
    [commitState]
  );

  const removeTask = useCallback(
    (taskId: number): RemoveTaskResult | null => {
      const current = gameStateRef.current;
      if (!current) return null;
      const result = removeTaskFromActive(current, taskId);
      commitState(result.nextState);
      return result;
    },
    [commitState]
  );

  const moveTask = useCallback(
    (taskId: number, direction: "up" | "down"): ReorderTaskResult | null => {
      const current = gameStateRef.current;
      if (!current) return null;
      const result = moveTaskInActive(current, taskId, direction);
      commitState(result.nextState);
      return result;
    },
    [commitState]
  );

  const finishBirthEvent = useCallback(() => {
    const current = gameStateRef.current;
    if (!current) return;
    commitState(runFinishBirthEvent(current));
  }, [commitState]);

  const finishEndEvent = useCallback(() => {
    const current = gameStateRef.current;
    if (!current) return;
    commitState(runFinishEndEvent(current));
  }, [commitState]);

  const startTutorialFlow = useCallback(() => {
    const current = gameStateRef.current;
    if (!current) return;
    commitState(runStartTutorialFlow(current));
  }, [commitState]);

  return { tasks, monsters, levelingRows, gameState, isLoading, completeTask, addTask, removeTask, moveTask, startTutorialFlow, finishBirthEvent, finishEndEvent };
}
