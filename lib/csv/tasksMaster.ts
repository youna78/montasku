import type { TaskMaster } from "@/types/master";
import { loadCsv, toBool, toNum } from "./loadCsv";

export async function loadTasksMaster(): Promise<TaskMaster[]> {
  const rows = await loadCsv("/data/tasks_master.csv");

  return rows.map((row) => ({
    taskId: toNum(row.task_id),
    name: row.name,
    category: row.category as TaskMaster["category"],
    baseExp: toNum(row.base_exp),
    power: toNum(row.power),
    heal: toNum(row.heal),
    knowledge: toNum(row.knowledge),
    create: toNum(row.create),
    defaultEnabled: toBool(row.default_enabled),
    recommendedOrder: toNum(row.recommended_order),
    isNightTask: toBool(row.is_night_task),
    notes: row.notes || undefined
  }));
}
