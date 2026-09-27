import type { TaskMaster } from "@/types/master";

export const CUSTOM_TASK_IDS = [100001, 100002, 100003] as const;
export function normalizeCustomTasks(value: unknown): TaskMaster[] {
  if (!Array.isArray(value)) return [];
  return CUSTOM_TASK_IDS.flatMap(taskId => {
    const raw = value.find(row => row && row.taskId === taskId);
    const name = typeof raw?.name === "string" ? raw.name.trim().slice(0, 40) : "";
    if (!name) return [];
    return [{ taskId, name, category: "生活" as const, baseExp: 2, power: 0, heal: 0, knowledge: 0, create: 0, defaultEnabled: false, recommendedOrder: taskId, isNightTask: false }];
  });
}
