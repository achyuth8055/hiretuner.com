import { pageMetadata, JsonLd, breadcrumbLd, webPageLd } from "@/lib/seo"

const TITLE = "Terms of Service"
const DESCRIPTION =
  "The terms and conditions governing your use of HireTuner, including accounts, subscriptions, billing, advertising, acceptable use, and disclaimers."
const PATH = "/terms-of-service"

export const metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: PATH })

export default function TermsOfService() {
  return (
    <div className="max-w-[800px] mx-auto px-margin-page py-stack-xl">
      <JsonLd data={breadcrumbLd([{ name: "Terms of Service", path: PATH }])} />
      <JsonLd data={webPageLd({ name: TITLE, description: DESCRIPTION, path: PATH })} />
      <h1 className="font-display-lg text-display-lg text-primary mb-stack-lg">Terms of Service</h1>
      <div className="prose prose-slate max-w-none text-on-surface">
        <p>Last updated: June 18, 2026</p>

        <h2>Acknowledgment</h2>
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the HireTuner website and
          AI-powered resume-tailoring service (the &ldquo;Service&rdquo;) operated by HireTuner (&ldquo;HireTuner,&rdquo;
          &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). Please read these Terms carefully before using the
          Service. By accessing or using the Service, you agree to be bound by these Terms and by our{" "}
          <a href="/privacy-policy">Privacy Policy</a>. If you do not agree, you may not use the Service.
        </p>

        <h2>Definitions</h2>
        <ul>
          <li>
            <strong>Service</strong> means the HireTuner website, applications, and related features.
          </li>
          <li>
            <strong>Account</strong> means the registered account that allows you to access the Service.
          </li>
          <li>
            <strong>User Content</strong> means any text, resume, job description, or other material you submit to the
            Service.
          </li>
          <li>
            <strong>Subscription</strong> means a paid plan that provides access to premium features on a recurring basis.
          </li>
        </ul>

        <h2>Eligibility</h2>
        <p>
          You must be at least 16 years old to use the Service. By using the Service, you represent and warrant that you
          meet this requirement and that you have the legal capacity to enter into these Terms.
        </p>

        <h2>Accounts and Registration</h2>
        <p>
          To access certain features, you must create an account and provide accurate, complete information. You are
          responsible for safeguarding your login credentials and for all activity that occurs under your account. You agree
          to notify us promptly of any unauthorized use. We may suspend or terminate accounts that contain inaccurate
          information or that are used in violation of these Terms.
        </p>

        <h2>Subscriptions and Billing</h2>
        <p>We offer the following plans:</p>
        <ul>
          <li>
            <strong>Free</strong>: access to core features with usage limits and advertising.
          </li>
          <li>
            <strong>Starter</strong>: $5.49 per month or $49.99 per year, with expanded features and limits.
          </li>
        </ul>
        <p>
          Paid subscriptions are processed securely through our payment processor, Stripe. By subscribing, you authorize us
          and Stripe to charge your chosen payment method on a recurring basis. Subscriptions <strong>automatically renew</strong>{" "}
          at the end of each billing period (monthly or annual) at the then-current rate unless you cancel before the renewal
          date. You may cancel at any time from your account settings; cancellation takes effect at the end of the current
          billing period, and you will retain access to paid features until then. Except where required by law, payments are
          non-refundable. If you believe you were charged in error, contact us and we will review your request in good
          faith.
        </p>

        <h2>Advertisements</h2>
        <p>
          The Service is supported in part by advertising. Users on the free and monthly plans may be shown third-party
          advertisements, including ads served through Google AdSense. Subscribers on the paid annual and Plus plans receive
          an ad-free experience. We are not responsible for the content of third-party ads or the products and services they
          promote. For details on advertising cookies, see our <a href="/cookie-policy">Cookie Policy</a>.
        </p>

        <h2>Acceptable Use and Prohibited Conduct</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for any unlawful, fraudulent, or harmful purpose.</li>
          <li>Submit content that is false, defamatory, infringing, or that violates the rights of others.</li>
          <li>Attempt to access, scrape, reverse engineer, or disrupt the Service or its infrastructure.</li>
          <li>Resell, sublicense, or commercially exploit the Service without our written permission.</li>
          <li>Upload malware or attempt to circumvent usage limits, security, or authentication measures.</li>
        </ul>

        <h2>User Content and License</h2>
        <p>
          You retain all ownership rights in the User Content you submit, including your resume content. By submitting User
          Content, you grant us a limited, non-exclusive, worldwide license to host, store, process, and transmit that
          content solely to operate and provide the Service to you, including generating tailored resumes and suggestions.
          You are responsible for ensuring you have the rights to submit your User Content.
        </p>

        <h2>Intellectual Property</h2>
        <p>
          The Service, including its software, design, text, logos, and trademarks, is owned by HireTuner or its licensors and
          is protected by intellectual property laws. Except for the rights expressly granted to you, these Terms do not
          transfer any right, title, or interest in the Service to you.
        </p>

        <h2>AI-Generated Content Disclaimer</h2>
        <p>
          The Service uses artificial intelligence to generate resume suggestions, rewrites, and match estimates. These
          outputs are provided for informational purposes only and may contain inaccuracies. Match scores and similar
          estimates are <strong>not guarantees</strong> of interviews, job offers, employment, or any particular outcome. You
          are solely responsible for reviewing, editing, and verifying any AI-generated content before relying on or
          submitting it.
        </p>

        <h2>Disclaimer of Warranties</h2>
        <p>
          The Service is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without warranties of any
          kind, whether express or implied, including warranties of merchantability, fitness for a particular purpose, and
          non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or secure, or that any
          results obtained from the Service will be accurate or reliable.
        </p>

        <h2>Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, in no event shall HireTuner or its affiliates, officers, employees, or
          suppliers be liable for any indirect, incidental, special, consequential, or punitive damages, or for any loss of
          profits, data, or goodwill, arising out of or related to your use of the Service. Our total aggregate liability
          for any claim relating to the Service shall not exceed the greater of the amount you paid us in the twelve months
          preceding the claim or USD $50.
        </p>

        <h2>Indemnification</h2>
        <p>
          You agree to defend, indemnify, and hold harmless HireTuner and its affiliates from and against any claims,
          liabilities, damages, losses, and expenses, including reasonable legal fees, arising out of or in any way
          connected with your User Content, your use of the Service, or your violation of these Terms.
        </p>

        <h2>Third-Party Links</h2>
        <p>
          The Service may contain links to third-party websites or services that are not owned or controlled by HireTuner. We
          are not responsible for the content, privacy policies, or practices of any third-party sites, and you access them
          at your own risk.
        </p>

        <h2>Termination</h2>
        <p>
          We may suspend or terminate your access to the Service at any time, with or without notice, for conduct that we
          believe violates these Terms or is harmful to other users, us, or third parties. You may stop using the Service
          and delete your account at any time. Provisions that by their nature should survive termination will survive.
        </p>

        <h2>Governing Law</h2>
        <p>
          These Terms are governed by and construed in accordance with the laws of the jurisdiction in which HireTuner is
          established, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be
          subject to the exclusive jurisdiction of the courts located there.
        </p>

        <h2>Changes to These Terms</h2>
        <p>
          We may modify these Terms from time to time. When we do, we will revise the &ldquo;Last updated&rdquo; date above
          and, where appropriate, provide additional notice. Your continued use of the Service after changes take effect
          constitutes your acceptance of the revised Terms.
        </p>

        <h2>Contact Us</h2>
        <p>
          If you have any questions about these Terms, please contact us at{" "}
          <a href="mailto:support@hiretuner.com">support@hiretuner.com</a>.
        </p>
      </div>
    </div>
  )
}
