"use client";

type SfxId = "s_Check" | "s_add" | "s_delete" | "irekae";

const SFX_PATH: Record<SfxId, string> = {
  s_Check: "/sound/s_Check.mp3",
  s_add: "/sound/s_add.mp3",
  s_delete: "/sound/s_delete.mp3",
  irekae: "/sound/irekae.mp3"
};

const audioCache = new Map<SfxId, HTMLAudioElement>();

export function playSfx(id: SfxId): void {
  if (typeof window === "undefined" || typeof Audio === "undefined") return;

  let audio = audioCache.get(id);
  if (!audio) {
    audio = new Audio(SFX_PATH[id]);
    audio.preload = "auto";
    audioCache.set(id, audio);
  }

  try {
    audio.currentTime = 0;
    void audio.play().catch((error) => {
      console.debug("[sfx] play blocked", { id, error });
    });
  } catch (error) {
    console.debug("[sfx] play failed", { id, error });
  }
}

