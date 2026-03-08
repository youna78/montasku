"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadTasksMaster } from "@/lib/csv/tasksMaster";
import { getInitialRoute, loadGameState } from "@/lib/game/state";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    async function bootstrap() {
      const tasks = await loadTasksMaster();
      const gameState = loadGameState(tasks);
      router.replace(getInitialRoute(gameState));
    }

    bootstrap().catch(() => {
      router.replace("/home");
    });
  }, [router]);

  return <main>Loading...</main>;
}
