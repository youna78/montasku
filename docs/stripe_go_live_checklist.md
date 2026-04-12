# Stripe 本番決済移行チェックリスト

## 1. 事前確認
- [ ] `app/commerce` の文面を最終確認
- [ ] `app/privacy` と `app/terms` の文面を最終確認
- [ ] お問い合わせ導線が本番で開くことを確認
- [ ] Google ログイン、メールログイン、Firestore 保存が本番で正常動作することを確認

## 2. Stripe Live モード準備
- [ ] Stripe Dashboard を Live mode に切り替える
- [ ] `STRIPE_SECRET_KEY` を `sk_live_...` に差し替える
- [ ] Webhook endpoint を本番用に作成する
- [ ] `STRIPE_WEBHOOK_SECRET` を本番用 `whsec_...` に差し替える
- [ ] Webhook URL を `https://montasku.vercel.app/api/stripe/webhook` に設定する
- [ ] Webhook イベントを以下にする
  - [ ] `checkout.session.completed`
  - [ ] `checkout.session.async_payment_succeeded`
  - [ ] `checkout.session.async_payment_failed`
  - [ ] `checkout.session.expired`

## 3. Vercel 環境変数
- [ ] `NEXT_PUBLIC_APP_URL` が本番 URL になっている
- [ ] `STRIPE_SECRET_KEY` が live 用になっている
- [ ] `STRIPE_WEBHOOK_SECRET` が live 用になっている
- [ ] `FIREBASE_ADMIN_PROJECT_ID` が本番プロジェクトと一致している
- [ ] `FIREBASE_ADMIN_CLIENT_EMAIL` が正しい
- [ ] `FIREBASE_ADMIN_PRIVATE_KEY` が正しい
- [ ] 再デプロイを実行する

## 4. 決済フロー確認
- [ ] 有料コイン商品を 1 つ本番で購入する
- [ ] `purchaseHistory` が `pending -> fulfilled` になる
- [ ] `wallet/summary.paidCoinBalance` が自動加算される
- [ ] `/shop/thanks` に正常に戻る
- [ ] キャンセル時にコインが増えない
- [ ] 同じ決済で二重付与されない

## 5. UI / 導線確認
- [ ] 未ログイン時にモンタコイン購入ボタンが無効になっている
- [ ] ログイン時に Stripe Checkout へ遷移できる
- [ ] ホーム / ショップで `paidCoinBalance` が確認できる
- [ ] 購入後の反映案内文が自然

## 6. 運用確認
- [ ] 反映遅延時のお問い合わせ導線を確認
- [ ] Firestore `purchaseHistory` を運営側で見られる状態にしておく
- [ ] 返金時の運用方針を決めておく
- [ ] 決済失敗時のユーザー案内文を確認

## 7. 追加商品を出す時
- [ ] 新しい「円決済商品」を増やす場合は `lib/game/shop.ts` の `SHOP_PAID_COIN_ITEMS` を更新する
- [ ] 新しい「モンタコイン消費アイテム」を増やす場合はショップマスタとゲーム内ロジックを更新する
- [ ] モンタコイン消費アイテムだけの追加なら Stripe Dashboard 側の追加作業は不要

## 参考
- Stripe Checkout Sessions: https://docs.stripe.com/api/checkout/sessions/create
- Stripe Webhooks: https://docs.stripe.com/webhooks
- Stripe Go-live checklist: https://docs.stripe.com/get-started/checklist/go-live
