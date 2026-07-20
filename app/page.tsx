"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { GameLoadingScreen } from "@/components/common/GameLoadingScreen";
import { loadLevelingMaster } from "@/lib/csv/levelingMaster";
import { loadTasksMaster } from "@/lib/csv/tasksMaster";
import { getInitialRoute, loadGameState } from "@/lib/game/state";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    async function bootstrap() {
      const [tasks, levelingRows] = await Promise.all([loadTasksMaster(), loadLevelingMaster()]);
      const gameState = loadGameState(tasks, levelingRows);
      router.replace(getInitialRoute(gameState));
    }

    bootstrap().catch(() => {
      router.replace("/home");
    });
  }, [router]);

  return <GameLoadingScreen />;
}
