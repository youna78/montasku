import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export default function CommercePage() {
  return (
    <LegalPageLayout title="特定商取引法に基づく表記">
      <div className="legal-intro">
        モンタスクで販売する有料デジタルコンテンツおよび有料コインに関する表示です。各商品の税込価格は、ショップ画面および購入画面に表示します。
      </div>

      <div className="legal-section">
        <h2>1. 販売事業者</h2>
        <p>yuka fujie</p>
      </div>

      <div className="legal-section">
        <h2>2. 運営責任者</h2>
        <p>yuka fujie</p>
      </div>

      <div className="legal-section">
        <h2>3. 所在地</h2>
        <p>請求があった場合、遅滞なく開示いたします。</p>
        <p>開示を希望される場合は、お問い合わせページよりご連絡ください。</p>
      </div>

      <div className="legal-section">
        <h2>4. 電話番号</h2>
        <p>請求があった場合、遅滞なく開示いたします。</p>
        <p>開示を希望される場合は、お問い合わせページよりご連絡ください。</p>
      </div>

      <div className="legal-section">
        <h2>5. メールアドレス</h2>
        <p>contact@ikizurasenryaku.com</p>
      </div>

      <div className="legal-section">
        <h2>6. 販売価格</h2>
        <p>各商品ページまたは購入画面に表示します。</p>
      </div>

      <div className="legal-section">
        <h2>7. 商品代金以外の必要料金</h2>
        <p>インターネット接続に必要な通信料等は、お客様のご負担となります。</p>
      </div>

      <div className="legal-section">
        <h2>8. 支払方法</h2>
        <p>クレジットカード、その他購入画面に表示する方法</p>
      </div>

      <div className="legal-section">
        <h2>9. 支払時期</h2>
        <p>購入手続き時に決済されます。</p>
      </div>

      <div className="legal-section">
        <h2>10. 提供時期</h2>
        <p>決済完了後、直ちにご利用いただけます。</p>
      </div>

      <div className="legal-section">
        <h2>11. 返品・キャンセル</h2>
        <p>デジタル商品の性質上、購入手続き完了後の返品・キャンセルは原則としてお受けできません。法令上認められる場合を除きます。</p>
      </div>

      <div className="legal-section">
        <h2>12. お問い合わせ窓口</h2>
        <p>お問い合わせページよりご連絡ください。</p>
      </div>
    </LegalPageLayout>
  );
}
