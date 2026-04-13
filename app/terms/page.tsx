import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export default function TermsPage() {
  return (
    <LegalPageLayout title="利用規約">
      <div className="legal-intro">
        本規約は、モンタスク（以下「本サービス」）の利用条件を定めるものです。ユーザーは、本サービスを利用することで、本規約に同意したものとみなされます。
      </div>

      <div className="legal-section">
        <h2>1. 本サービスについて</h2>
        <p>
          本サービスは、日々のタスク達成を通じてモンスター育成を楽しめるサービスです。サービス内容は、開発状況や運営上の都合により変更される場合があります。
        </p>
      </div>

      <div className="legal-section">
        <h2>2. アカウント</h2>
        <p>
          Googleログインまたはメールアドレス認証を利用する場合、ユーザーは自身の管理するアカウント情報を用いてログインするものとします。
        </p>
      </div>

      <div className="legal-section">
        <h2>3. 禁止事項</h2>
        <ul className="legal-list">
          <li>法令または公序良俗に反する行為</li>
          <li>本サービスの運営を妨げる行為</li>
          <li>不正アクセスまたはこれを試みる行為</li>
          <li>他のユーザーまたは第三者の権利を侵害する行為</li>
          <li>本サービスの不具合や仕様を悪用する行為</li>
          <li>本サービス内の有料コンテンツや機能を不正に取得または利用しようとする行為</li>
        </ul>
      </div>

      <div className="legal-section">
        <h2>4. 免責</h2>
        <p>
          本サービスは、継続的かつ安全な提供に努めますが、システム障害、通信環境、外部サービスの不具合その他やむを得ない事情により、一時的に利用できなくなる場合があります。
        </p>
      </div>

      <div className="legal-section">
        <h2>5. 規約の変更</h2>
        <p>本規約は、必要に応じて改定する場合があります。改定後は、本サービス上での表示その他適切な方法によりお知らせします。</p>
      </div>
    </LegalPageLayout>
  );
}
