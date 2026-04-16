import { AccountDeletionSection } from "@/components/auth/AccountDeletionSection";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export default function ContactPage() {
  return (
    <LegalPageLayout title="お問い合わせ">
      <div className="legal-intro">
        モンタスクに関するご意見、ご要望、不具合報告などは、専用のお問い合わせフォームから受け付けています。
      </div>

      <div className="legal-section">
        <h2>1. お問い合わせ方法</h2>
        <p>下記のボタンから、お問い合わせフォームへ進めます。返信が必要な内容は、フォーム内の案内に沿ってご記入ください。</p>
        <div className="legal-actions">
          <a
            href="https://ikizurasenryaku.com/montasku-contact/"
            target="_blank"
            rel="noreferrer"
            className="ui-link-button settings-menu-button settings-menu-button-primary"
          >
            お問い合わせフォームを開く
          </a>
        </div>
      </div>

      <div className="legal-section">
        <h2>2. お問い合わせ内容の例</h2>
        <ul className="legal-list">
          <li>ログインやデータ引き継ぎに関するご相談</li>
          <li>表示崩れや不具合のご報告</li>
          <li>機能改善やタスク追加に関するご要望</li>
          <li>プライバシーや利用規約に関する確認</li>
        </ul>
      </div>

      <div className="legal-section">
        <h2>3. ご案内</h2>
        <p>
          タスク追加に関するご要望は、設定画面にある「タスク追加リクエスト」フォームからも受け付けています。内容に応じて使いやすい方をご利用ください。
        </p>
      </div>

      <div className="legal-section">
        <p>返信にはお時間をいただく場合があります。</p>
        <p>内容によっては個別に返信できない場合がありますので、あらかじめご了承ください。</p>
      </div>

      <AccountDeletionSection />
    </LegalPageLayout>
  );
}
