import { pageMetadata, JsonLd, breadcrumbLd, webPageLd } from "@/lib/seo"

const TITLE = "Privacy Policy"
const DESCRIPTION =
  "How HireTuner collects, uses, shares, and protects your personal information, including our use of cookies and Google AdSense advertising."
const PATH = "/privacy-policy"

export const metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: PATH })

export default function PrivacyPolicy() {
  return (
    <div className="max-w-[800px] mx-auto px-margin-page py-stack-xl">
      <JsonLd data={breadcrumbLd([{ name: "Privacy Policy", path: PATH }])} />
      <JsonLd data={webPageLd({ name: TITLE, description: DESCRIPTION, path: PATH })} />
      <h1 className="font-display-lg text-display-lg text-primary mb-stack-lg">Privacy Policy</h1>
      <div className="prose prose-slate max-w-none text-on-surface">
        <p>Last updated: June 18, 2026</p>

        <h2>Introduction</h2>
        <p>
          This Privacy Policy describes how HireTuner (&ldquo;HireTuner,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
          &ldquo;our&rdquo;) collects, uses, discloses, and safeguards your information when you visit our website and use
          our AI-powered resume-tailoring service (collectively, the &ldquo;Service&rdquo;). It also explains your privacy
          rights and how the law protects you. By using the Service, you agree to the collection and use of information in
          accordance with this Policy. If you do not agree with our practices, please do not use the Service.
        </p>

        <h2>Information We Collect</h2>
        <p>We collect several types of information to provide and improve the Service to you:</p>
        <ul>
          <li>
            <strong>Account information.</strong> When you create an account, we collect your name and email address, and,
            where applicable, authentication identifiers from third-party sign-in providers.
          </li>
          <li>
            <strong>Resume and document content.</strong> When you upload or paste a resume, a job description, or related
            text, we process that content to generate tailored resumes, suggestions, and match estimates.
          </li>
          <li>
            <strong>Usage data.</strong> We automatically collect information about how you interact with the Service, such
            as pages visited, features used, time spent, referring URLs, and the actions you take.
          </li>
          <li>
            <strong>Cookies and device data.</strong> We collect your IP address, browser type and version, device
            identifiers, operating system, and similar diagnostic data, as well as cookie identifiers (see
            &ldquo;Cookies and Tracking Technologies&rdquo; below).
          </li>
        </ul>

        <h2>How We Use Your Information</h2>
        <p>We use the information we collect for the following purposes:</p>
        <ul>
          <li>To provide, operate, and maintain the Service, including generating tailored resume content.</li>
          <li>To create and manage your account and authenticate you.</li>
          <li>To process payments and manage your subscription.</li>
          <li>To personalize your experience and improve our features and models.</li>
          <li>To communicate with you about updates, security alerts, and support requests.</li>
          <li>To display advertising on free and monthly plans (see &ldquo;Advertising and Google AdSense&rdquo;).</li>
          <li>To detect, prevent, and address fraud, abuse, and security issues.</li>
          <li>To comply with legal obligations and enforce our terms.</li>
        </ul>

        <h2>Legal Bases for Processing (GDPR)</h2>
        <p>
          If you are located in the European Economic Area or the United Kingdom, we process your personal data only when we
          have a valid legal basis to do so, namely:
        </p>
        <ul>
          <li>
            <strong>Performance of a contract</strong>: to deliver the Service you have requested and manage your
            account and subscription.
          </li>
          <li>
            <strong>Legitimate interests</strong>: to improve and secure the Service, prevent fraud, and serve
            non-personalized advertising, provided those interests are not overridden by your rights.
          </li>
          <li>
            <strong>Consent</strong>: for personalized advertising cookies and certain analytics, where required.
            You may withdraw consent at any time.
          </li>
          <li>
            <strong>Legal obligation</strong>: to comply with applicable laws, regulations, and lawful requests.
          </li>
        </ul>

        <h2>Cookies and Tracking Technologies</h2>
        <p>
          We use cookies and similar tracking technologies to operate the Service, remember your preferences, analyze
          traffic, and deliver advertising. Cookies are small files placed on your device. You can instruct your browser to
          refuse cookies or to indicate when a cookie is being sent; however, some parts of the Service may not function
          properly without them. For a detailed description of the categories of cookies we use, please see our{" "}
          <a href="/cookie-policy">Cookie Policy</a>.
        </p>

        <h2>Advertising and Google AdSense</h2>
        <p>
          We use Google AdSense to display advertisements on certain pages of the Service for users on our free and monthly
          plans. In connection with this advertising:
        </p>
        <ul>
          <li>
            Third-party vendors, including Google, use cookies to serve ads based on a user&apos;s prior visits to our
            website or other websites.
          </li>
          <li>
            Google&apos;s use of advertising cookies enables it and its partners to serve ads to our users based on their
            visits to our Service and/or other sites on the Internet.
          </li>
          <li>
            You may opt out of personalized advertising by visiting Google Ads Settings at{" "}
            <a href="https://www.google.com/settings/ads" rel="noopener noreferrer">
              https://www.google.com/settings/ads
            </a>
            . You may also opt out of third-party vendors&apos; use of cookies for personalized advertising by visiting{" "}
            <a href="https://www.aboutads.info" rel="noopener noreferrer">
              www.aboutads.info
            </a>
            .
          </li>
          <li>
            For more information on how Google uses data when you use our partners&apos; sites or apps, please review
            Google&apos;s Privacy Policy at{" "}
            <a href="https://policies.google.com/privacy" rel="noopener noreferrer">
              https://policies.google.com/privacy
            </a>
            .
          </li>
        </ul>
        <p>
          Subscribers on our paid annual and Plus plans receive an ad-free experience and are not served advertising
          cookies through the Service.
        </p>

        <h2>Data Sharing and Third Parties</h2>
        <p>We do not sell your personal information. We share information only with trusted service providers, including:</p>
        <ul>
          <li>
            <strong>Stripe</strong>: to securely process payments and manage subscriptions. We do not store full
            payment card numbers on our servers.
          </li>
          <li>
            <strong>AI processing provider</strong>: to generate tailored resume content and match estimates from
            the text you submit.
          </li>
          <li>
            <strong>Google AdSense</strong>: to serve advertising to users on free and monthly plans, as described
            above.
          </li>
          <li>
            <strong>Analytics providers</strong>: to understand how the Service is used and to improve it.
          </li>
        </ul>
        <p>
          We may also disclose information to comply with the law, respond to lawful requests, protect our rights, or in
          connection with a merger, acquisition, or sale of assets.
        </p>

        <h2>Data Retention</h2>
        <p>
          We retain your personal information only for as long as necessary to fulfill the purposes described in this Policy,
          including providing the Service, complying with our legal obligations, resolving disputes, and enforcing our
          agreements. When information is no longer needed, we delete or anonymize it. You may request deletion of your
          account and associated content at any time.
        </p>

        <h2>Data Security</h2>
        <p>
          We implement appropriate technical and organizational measures designed to protect your information against
          unauthorized access, loss, misuse, or alteration, including encryption in transit and access controls. However, no
          method of transmission over the Internet or electronic storage is completely secure, and we cannot guarantee
          absolute security.
        </p>

        <h2>Your Rights</h2>
        <p>
          Depending on your location, you may have the right to access, correct, update, or delete your personal
          information; to object to or restrict certain processing; to data portability; and to withdraw consent. You also
          have the right to opt out of personalized advertising as described above. To exercise these rights, contact us
          using the details below. We will respond within the timeframe required by applicable law.
        </p>

        <h2>Children&apos;s Privacy</h2>
        <p>
          The Service is not intended for individuals under the age of 16, and we do not knowingly collect personal
          information from children under 16. If you believe a child has provided us with personal information, please
          contact us and we will take steps to delete it.
        </p>

        <h2>International Data Transfers</h2>
        <p>
          Your information may be processed and stored in countries other than your own, where data protection laws may
          differ. Where we transfer personal data internationally, we rely on appropriate safeguards, such as standard
          contractual clauses, to ensure your information remains protected.
        </p>

        <h2>Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. When we do, we will revise the &ldquo;Last updated&rdquo;
          date at the top of this page and, where appropriate, notify you. We encourage you to review this Policy
          periodically to stay informed about how we protect your information.
        </p>

        <h2>Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy or our privacy practices, please contact us at{" "}
          <a href="mailto:support@hiretuner.com">support@hiretuner.com</a>.
        </p>
      </div>
    </div>
  )
}
