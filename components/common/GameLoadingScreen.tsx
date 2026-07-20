type GameLoadingScreenProps = {
  monsterImagePath?: string | null;
  message?: string;
};

export function GameLoadingScreen({
  monsterImagePath,
  message = "モンスターを呼んでいます..."
}: GameLoadingScreenProps) {
  return (
    <main className="game-loading-screen" aria-live="polite" aria-busy="true">
      <div className="game-loading-scene">
        <div className="game-loading-light" />
        <img
          src={monsterImagePath || "/img/monster/monster_egg_01.png"}
          alt=""
          className="game-loading-monster"
        />
        <div className="game-loading-shadow" />
      </div>
      <div className="game-loading-copy">
        <strong>モンタスク</strong>
        <span>{message}</span>
        <span className="game-loading-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </div>
    </main>
  );
}
