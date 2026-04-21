import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="プライバシーポリシー">
      <div className="legal-intro">
        モンタスク（以下「本サービス」）は、ユーザー認証、ゲームデータの保存、機種変更時の引き継ぎその他本サービスの提供のため、必要な範囲で個人情報を取得・利用します。
      </div>

      <div className="legal-section">
        <h2>1. 取得する情報</h2>
        <p>本サービスは、GoogleログインまたはAppleログインを利用する際に、以下の情報を取得する場合があります。</p>
        <ul className="legal-list">
          <li>氏名</li>
          <li>メールアドレス</li>
          <li>ログインに利用したアカウントに紐づくユーザーID</li>
        </ul>
      </div>

      <div className="legal-section">
        <h2>2. 利用目的</h2>
        <p>取得した情報は、以下の目的で利用します。</p>
        <ul className="legal-list">
          <li>ログイン機能の提供</li>
          <li>ユーザーごとのゲームデータ保存</li>
          <li>機種変更時や別端末利用時のデータ引き継ぎ</li>
          <li>不正利用防止</li>
          <li>お問い合わせ対応</li>
        </ul>
      </div>

      <div className="legal-section">
        <h2>3. 利用する外部サービス</h2>
        <p>本サービスでは、以下の外部サービスを利用することがあります。</p>
        <ul className="legal-list">
          <li>Google Authentication</li>
          <li>Sign in with Apple</li>
          <li>Firebase Authentication</li>
          <li>Cloud Firestore</li>
          <li>Vercel</li>
        </ul>
      </div>

      <div className="legal-section">
        <h2>4. データの管理</h2>
        <p>本サービスは、取得した情報を適切に管理し、不正アクセス、紛失、漏えい等の防止に努めます。</p>
      </div>

      <div className="legal-section">
        <h2>5. お問い合わせ</h2>
        <p>本サービスに関するお問い合わせは、お問い合わせページより受け付けます。</p>
      </div>

      <div className="legal-section">
        <h2>6. 改定</h2>
        <p>本ポリシーは、必要に応じて改定する場合があります。改定後は、本サービス上での表示その他適切な方法によりお知らせします。</p>
      </div>
    </LegalPageLayout>
  );
}
