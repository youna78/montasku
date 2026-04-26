# App Store IAP setup for Montasku

## App Store Connect products

Create these products as consumable in-app purchases.

| Internal item ID | App Store product ID | Grant |
| --- | --- | --- |
| `paid_coin_pack_small` | `montasku_coin_120` | 120 Monta Coins |
| `paid_coin_pack_medium` | `montasku_coin_380` | 380 Monta Coins |
| `paid_coin_pack_large` | `montasku_coin_700` | 700 Monta Coins |
| `paid_coin_pack_xlarge` | `montasku_coin_1600` | 1600 Monta Coins |

## Vercel environment variables

Add these values for the iOS purchase verification API.

```env
APP_STORE_BUNDLE_ID=com.ikizurasenryaku.montasku
APP_STORE_ISSUER_ID=
APP_STORE_KEY_ID=
APP_STORE_PRIVATE_KEY=
APP_STORE_ENV=sandbox
```

Use `APP_STORE_ENV=sandbox` for TestFlight and Sandbox testing. Switch to `production` after the live App Store release is ready to accept real purchases.

`APP_STORE_PRIVATE_KEY` should be the full `.p8` key contents. If Vercel stores it as one line, keep the `\n` line breaks in the value.

## Purchase flow

1. The iOS app loads product names and prices from StoreKit.
2. The user taps the purchase button.
3. Montasku shows a confirmation modal.
4. StoreKit opens the Apple purchase sheet.
5. The app sends the transaction ID to `/api/app-store/fulfill`.
6. The API verifies the transaction with App Store Server API.
7. Firestore updates `users/{uid}/wallet/summary.paidCoinBalance`.
8. Firestore writes `users/{uid}/purchaseHistory/{purchaseId}` with `channel: app_store`.

Guest users cannot purchase Monta Coins.

## Sandbox test checklist

- Sign in to Montasku with Google, Apple, or email.
- Open the iOS app shop and switch to the Monta Coin tab.
- Confirm that prices are shown from Apple, not hardcoded text.
- Purchase with a Sandbox tester Apple ID.
- Confirm Firestore `purchaseHistory` has `channel: app_store`.
- Confirm `wallet/summary.paidCoinBalance` increases.
- Confirm purchase history appears in the app.
