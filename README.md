# Habit Monster App

習慣タスクを達成するとモンスターが育つゲーム風タスク管理アプリ。

## コンセプト

タスク達成
↓
EXP獲得
↓
モンスター成長
↓
進化
↓
図鑑登録
↓
新しいタマゴ

ゲーム感は軽めで、タスク管理ツールとしての使いやすさを重視する。

## UI

スマホファースト  
iPhoneサイズ基準  

下タブナビ

- ホーム
- タスク
- 図鑑
- 設定

## データ

data/

- tasks_master.csv
- monsters_master.csv

docs/

- ui_screens.csv
- navigation_flow.csv

## タスク方針（MVP）

- タスクはユーザー自由入力ではなく、公式タスクのみを使用
- 理由: タスク -> EXP -> モンスター成長のゲームバランス維持
- 要望収集は `settings` の「タスク追加リクエスト」導線で実施
  - フォームURL: `https://docs.google.com/forms/d/e/1FAIpQLSflbsd5RHq5IBKaTU7k6aIFPJjhk1GINQ0VqSjwSYRFBtUvJA/viewform?usp=publish-editor`

## 開発起動手順

Node.js と npm がある環境で実行してください。

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

## Vercel 公開手順

1. GitHub に push する
2. Vercel で `New Project` -> 対象 GitHub リポジトリを選択
3. Framework Preset は `Next.js` のままにする
4. Build Command: `npm run build`（デフォルト）
5. Output Directory: `.next`（デフォルト）
6. Node.js Version: `20.x`
7. `Deploy` を実行

補足:
- このアプリは `localStorage` を使用するため、データはブラウザごとに保存されます（端末/ブラウザ間で共有されません）。
- 初回確認時はブラウザの `localStorage` キー `habit-monster-mvp-state` を削除してから試すと検証しやすいです。

## MVP確認項目

1. 初回フローが通ること  
`/` -> `tutorial` -> `tutorial-egg` -> `tasks` で3件達成 -> `birth-event` -> `home`

2. リロードしても状態が保持されること  
`home` や `tasks` でリロードしても、モンスター情報・達成状態・図鑑解放状態が維持される

3. 日付変更時リセットが限定されること  
`todayExp` と `completedTaskIdsToday` がリセットされ、`hasSeenTutorial / hasCompletedInitialBirth / birthEventPending` が維持される

4. タスク追加が反映されること  
`settings` -> `task-settings` -> `task-add` でタスク追加後、`home` の未達成タスクに反映される

5. タスク上限が効くこと  
`task-add` で 15 件を超えて追加しようとすると拒否される

6. 図鑑表示が反映されること  
解放済みモンスターは名前表示、未取得は `???`。進化後に図鑑へ反映される

## ローカル確認時チェックリスト

1. 初回フロー確認前にブラウザの `localStorage` キー `habit-monster-mvp-state` を削除する
2. `npm install` が成功する
3. `npm run dev` で起動し、`http://localhost:3000` が表示される
4. 画面遷移:
`/` から初回は `tutorial` に入り、3タスク達成後に `birth-event`、完了後 `home` に入る
5. リロード耐性:
`home / tasks / dex / settings / task-add` でリロードしても状態が壊れない
6. 日次リセット:
日付をまたいだ後、`todayExp` と `completedTaskIdsToday` のみがリセットされる
7. タスク追加:
`task-add` で追加したタスクが `home` の未達成タスクに反映される
8. ソート順:
`home` の未達成タスクが `activeTasks.sortOrder` 順で表示される
9. 上限:
`task-add` で 15 件を超える追加が拒否される
10. 図鑑:
`discoveredMonsterIds` に応じて `dex` が表示され、未取得は `???` になる
11. 開発用デバッグ表示:
`NODE_ENV=development` でのみデバッグパネルが表示される

## 最終受け入れチェック（実機）

1. 初回導線が1本で通る  
`tutorial -> tutorial-egg -> tasks -> 3件達成 -> birth-event -> home`

2. タスク追加/削除/並び替えが安定して動く  
- `task_add`: 連続追加できる、15件上限で追加不可  
- `task_remove`: 3件未満にできない  
- `task_reorder`: 上下を連続操作しても並び替えできる

3. 並び順・状態永続化  
- `home` の未達成タスク順に `sortOrder` が反映される  
- リロード後も `activeTasks` の順序・状態が維持される

4. 図鑑反映  
- 誕生/進化したモンスターが `dex` に反映される  
- 未取得は `???` のまま

## GitHub push 前のデプロイ注意点

1. `npm run build` がローカルで成功していること
2. `public/img` / `public/sound` のファイル名の大文字小文字が、コード内パスと一致していること
3. `DevDebugPanel` が本番で表示されないこと（`NODE_ENV=development` のみ表示）
4. `.next` と `node_modules` を Git に含めないこと
5. 音声はユーザー操作後に再生されるため、初回自動再生はブラウザ制限でブロックされる可能性があること
