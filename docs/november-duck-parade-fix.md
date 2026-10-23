# アヒルさんパレードが表示されない原因

仕様元：[モンタスク管理表](https://docs.google.com/spreadsheets/d/1H1OlDfmp_fyDb-z1d1z2cpUxxY7C8jJk8A7lAq2ZH2Y/edit)、2026-10-22確認。

`02_event_rewards` の `november_koyo_onsen_2026` に `november_duck_parade`（アヒルさんパレード、decoration、paid_coin、300）があるが、アプリの11月の `paidCoinShopItems` と `SHOP_DECORATIONS` には登録されていなかった。管理表は実行時に自動読込されず、登録しただけでは画面に出ない。

加えて管理表の当該行には以下の古い参照が残っていた。

- grant_value: `october_ghost_parade`
- image_path: `/img/decoration/october_ghost_parade.png`
- `06_shop_items` には対応する11月デコの行がない。

アプリ側では専用の付与先 `november_duck_parade` と、既存の `deco_november_duck_parade_01.png` を使って登録。ホームでは既存の3コマシート `deco_november_duck_parade_sprite_01.png` を使い、左向きに移動するデコとして表示。動きを減らす設定にも対応。

管理表自体は未変更。次回の管理表同期では、上記2参照を11月用のID・画像へ修正する必要がある。

検証：300モンタコインの減算、専用IDの付与、ゴーストを付与しないこと、二重購入防止、残高不足、イベント終了後の装備を自動テストで確認。ブラウザーで販売カードとバナー上の開催状況・残日数を確認。
