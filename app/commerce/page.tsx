import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export default function CommercePage() {
  return (
    <LegalPageLayout title="特定商取引法に基づく表記">
      <div className="legal-intro">
        現時点で本サービスでは、有料商品の販売は開始していません。有料機能やデジタル商品の販売を開始する際は、本ページを更新し、必要事項を表示します。
      </div>

      <div className="legal-section">
        <h2>1. 販売事業者</h2>
        <p>販売開始時に掲載予定です。</p>
      </div>

      <div className="legal-section">
        <h2>2. 運営責任者</h2>
        <p>販売開始時に掲載予定です。</p>
      </div>

      <div className="legal-section">
        <h2>3. 所在地・連絡先</h2>
        <p>販売開始時に掲載予定です。</p>
      </div>

      <div className="legal-section">
        <h2>4. 販売価格・支払方法</h2>
        <p>販売開始時に、商品ごとの価格、支払方法、提供時期を本ページまたは購入画面に表示します。</p>
      </div>

      <div className="legal-section">
        <h2>5. 返品・キャンセル</h2>
        <p>デジタルコンテンツの性質上、購入後の返品やキャンセルについては、法令および各決済事業者の定めに従って対応します。</p>
      </div>
    </LegalPageLayout>
  );
}
