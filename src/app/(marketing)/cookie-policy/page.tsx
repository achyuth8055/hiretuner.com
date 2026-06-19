import { pageMetadata, JsonLd, breadcrumbLd, webPageLd } from "@/lib/seo"

const TITLE = "Cookie Policy"
const DESCRIPTION =
  "Learn what cookies HireTuner uses, including strictly necessary, functional, analytics, and Google AdSense advertising cookies, and how to control them."
const PATH = "/cookie-policy"

export const metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: PATH })

export default function CookiePolicy() {
  return (
    <div className="max-w-[800px] mx-auto px-margin-page py-stack-xl">
      <JsonLd data={breadcrumbLd([{ name: "Cookie Policy", path: PATH }])} />
      <JsonLd data={webPageLd({ name: TITLE, description: DESCRIPTION, path: PATH })} />
      <h1 className="font-display-lg text-display-lg text-primary mb-stack-lg">Cookie Policy</h1>
      <div className="prose prose-slate max-w-none text-on-surface">
        <p>Last updated: June 18, 2026</p>

        <p>
          This Cookie Policy explains what cookies are, how HireTuner (&ldquo;HireTuner,&rdquo; &ldquo;we,&rdquo;
          &ldquo;us,&rdquo; or &ldquo;our&rdquo;) uses them, and the choices you have. It should be read together with our{" "}
          <a href="/privacy-policy">Privacy Policy</a>. By continuing to use our website and service (the
          &ldquo;Service&rdquo;), you consent to the use of cookies as described here, except where consent is required and
          not given.
        </p>

        <h2>What Are Cookies</h2>
        <p>
          Cookies are small text files that are placed on your computer, mobile device, or any other device when you visit a
          website. They are widely used to make websites work, or work more efficiently, and to provide reporting
          information to site owners. Cookies may be &ldquo;session&rdquo; cookies, which are deleted when you close your
          browser, or &ldquo;persistent&rdquo; cookies, which remain until they expire or you delete them. They may also be
          set by the site you are visiting (&ldquo;first-party&rdquo;) or by another organization (&ldquo;third-party&rdquo;).
        </p>

        <h2>Why We Use Cookies</h2>
        <p>
          We use cookies to operate and secure the Service, to remember your settings and preferences, to understand how the
          Service is used so we can improve it, and to deliver and measure advertising on our free and monthly plans.
        </p>

        <h2>Categories of Cookies We Use</h2>

        <h3>Strictly Necessary Cookies</h3>
        <p>
          These cookies are essential for the Service to function and cannot be switched off. They include our
          authentication and session cookie, <strong>rolefit_session</strong>, which keeps you signed in and maintains the
          security of your session. Without these cookies, services you have asked for, such as logging in or saving your
          work, cannot be provided.
        </p>

        <h3>Functional Cookies</h3>
        <p>
          These cookies enable enhanced functionality and personalization, such as remembering your language, layout
          preferences, and editor settings. If you do not allow these cookies, some or all of these features may not work
          properly.
        </p>

        <h3>Analytics Cookies</h3>
        <p>
          These cookies help us understand how visitors interact with the Service by collecting and reporting information
          anonymously, such as which pages are most visited and whether users encounter errors. We use this information to
          improve the performance and design of the Service.
        </p>

        <h3>Advertising Cookies (Google AdSense / DoubleClick DART)</h3>
        <p>
          On our free and monthly plans, we use Google AdSense to display advertisements. Google uses the DoubleClick DART
          cookie to serve ads to our users based on their visits to our Service and other sites on the Internet. The DART
          cookie enables Google and its partners to show more relevant ads and to limit the number of times you see a given
          advertisement. These cookies also help measure the effectiveness of advertising campaigns.
        </p>

        <h2>How to Control or Disable Cookies</h2>
        <p>You can control and manage cookies in several ways:</p>
        <ul>
          <li>
            <strong>Browser settings.</strong> Most browsers allow you to refuse or delete cookies through their settings.
            Refer to your browser&apos;s help documentation for instructions. Note that blocking strictly necessary cookies
            may prevent parts of the Service from working.
          </li>
          <li>
            <strong>Google Ads Settings.</strong> You can opt out of personalized advertising from Google by visiting{" "}
            <a href="https://www.google.com/settings/ads" rel="noopener noreferrer">
              https://www.google.com/settings/ads
            </a>
            .
          </li>
          <li>
            <strong>Industry opt-out tools.</strong> You can opt out of many third-party vendors&apos; advertising cookies
            at{" "}
            <a href="https://www.aboutads.info" rel="noopener noreferrer">
              www.aboutads.info
            </a>
            .
          </li>
        </ul>

        <h2>Third-Party Cookies</h2>
        <p>
          Some cookies are set by third parties that provide services to us or appear on our pages, including Google
          AdSense, our analytics providers, and our payment processor. We do not control the setting of these cookies, so we
          encourage you to review the relevant third party&apos;s own cookie and privacy policies, such as Google&apos;s
          Privacy Policy at{" "}
          <a href="https://policies.google.com/privacy" rel="noopener noreferrer">
            https://policies.google.com/privacy
          </a>
          .
        </p>

        <h2>Do Not Track</h2>
        <p>
          Some browsers offer a &ldquo;Do Not Track&rdquo; (DNT) signal. Because there is currently no industry or legal
          standard for recognizing or honoring DNT signals, our Service does not respond to them differently. We will update
          this Policy if that changes.
        </p>

        <h2>Ad-Free Experience for Annual Subscribers</h2>
        <p>
          Subscribers on our paid annual plan enjoy an ad-free, ad-cookie-free experience. We do not load Google AdSense or
          DoubleClick DART advertising cookies for these users.
        </p>

        <h2>Updates to This Policy</h2>
        <p>
          We may update this Cookie Policy from time to time to reflect changes in technology, law, or our practices. When
          we do, we will revise the &ldquo;Last updated&rdquo; date above. Please review this page periodically.
        </p>

        <h2>Contact Us</h2>
        <p>
          If you have any questions about our use of cookies, please contact us at{" "}
          <a href="mailto:support@hiretuner.com">support@hiretuner.com</a>.
        </p>
      </div>
    </div>
  )
}
