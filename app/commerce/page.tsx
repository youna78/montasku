import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export default function CommercePage() {
  return (
    <LegalPageLayout title="特定商取引法に基づく表記">
      <div className="legal-intro">
        モンタスクで販売する有料デジタルコンテンツおよび有料コインに関する表示です。各商品の税込価格は、ショップ画面および購入画面に表示します。
      </div>

      <div className="legal-section">
        <h2>1. 販売事業者</h2>
        <p>Yuka Fujie</p>
      </div>

      <div className="legal-section">
        <h2>2. 運営責任者</h2>
        <p>Yuka Fujie</p>
      </div>

      <div className="legal-section">
        <h2>3. 所在地</h2>
        <p>請求があった場合、遅滞なく開示いたします。</p>
        <p>開示を希望される場合は、下記お問い合わせ窓口までご連絡ください。</p>
      </div>

      <div className="legal-section">
        <h2>4. 電話番号</h2>
        <p>請求があった場合、遅滞なく開示いたします。</p>
        <p>開示を希望される場合は、下記お問い合わせ窓口までご連絡ください。</p>
      </div>

      <div className="legal-section">
        <h2>5. メールアドレス</h2>
        <p>contact@ikizurasenryaku.com</p>
      </div>

      <div className="legal-section">
        <h2>6. 販売価格</h2>
        <p>各商品の税込価格は、ショップ画面および購入画面に表示します。</p>
      </div>

      <div className="legal-section">
        <h2>7. 商品代金以外の必要料金</h2>
        <p>インターネット接続に必要な通信料は、お客様のご負担となります。</p>
      </div>

      <div className="legal-section">
        <h2>8. 支払方法</h2>
        <p>Stripe を利用したクレジットカード決済その他、購入画面に表示される方法によります。</p>
      </div>

      <div className="legal-section">
        <h2>9. 支払時期</h2>
        <p>ご利用の決済手段会社が定める引き落とし時期によります。</p>
      </div>

      <div className="legal-section">
        <h2>10. 商品の引渡時期</h2>
        <p>決済完了後、通常は即時にアカウントへ反映します。</p>
        <p>システム上の都合により反映まで時間を要する場合があります。一定時間経っても反映されない場合は、購入履歴ページで購入IDをご確認のうえ、お問い合わせ窓口までご連絡ください。</p>
      </div>

      <div className="legal-section">
        <h2>11. 返品・キャンセル</h2>
        <p>デジタルコンテンツの性質上、購入完了後のお客様都合による返品・キャンセルはお受けできません。</p>
        <p>ただし、法令上必要な場合または決済事業者の定めがある場合は、その定めに従って対応します。</p>
      </div>

      <div className="legal-section">
        <h2>12. お問い合わせ窓口</h2>
        <p>お問い合わせは、問い合わせページまたは上記メールアドレスよりご連絡ください。</p>
      </div>
    </LegalPageLayout>
  );
}
