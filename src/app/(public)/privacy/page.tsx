import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How ArthaFlow Global collects, uses, and protects your data.",
};

const sections = [
  {
    h: "1. Information We Collect",
    p: "When you create an account we collect your name, email, phone number, and business details (company name, GST number, IEC, product catalogue). When you use the platform we store the documents you generate or upload, your shipment records, and usage data that helps us improve the product.",
  },
  {
    h: "2. How We Use Your Information",
    p: "We use your information to operate the platform — generating export documents, computing your readiness score, matching you with buyers, and providing the Saathi AI advisor. We also use it to communicate with you about your account, and to improve our AI models and services. We do not sell your personal data to third parties.",
  },
  {
    h: "3. AI Processing",
    p: "Content you submit for document generation or to the Saathi advisor is processed by AI service providers acting on our behalf under contractual confidentiality obligations. We recommend not including sensitive information beyond what a document requires.",
  },
  {
    h: "4. Sharing With Partners",
    p: "When you request services such as freight quotes, insurance, or trade finance, we share the shipment details needed to fulfil that request with the relevant partner — only with your action and only what is required.",
  },
  {
    h: "5. Data Storage & Security",
    p: "Your data is stored with our cloud infrastructure providers using encryption in transit and at rest. Access is restricted by row-level security so that your business data is visible only to your account and authorised ArthaFlow personnel.",
  },
  {
    h: "6. Your Rights",
    p: "You can access, correct, or export your data from your account settings, and you may request deletion of your account and associated data by writing to us. We retain records only as long as needed to provide the service or as required by law.",
  },
  {
    h: "7. Cookies",
    p: "We use essential cookies to keep you signed in and basic analytics to understand how the product is used. We do not use third-party advertising cookies.",
  },
  {
    h: "8. Changes & Contact",
    p: "We may update this policy as the product evolves; material changes will be notified in-app or by email. Questions? Write to hello@arthaflow.in.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-[760px] px-6 py-16">
      <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-text-heading">
        Privacy Policy
      </h1>
      <p className="mb-10 text-sm text-text-secondary">
        Last updated: July 2026
      </p>
      <p className="mb-8 text-[15px] leading-relaxed text-text-body">
        ArthaFlow Global (&quot;ArthaFlow&quot;, &quot;we&quot;, &quot;us&quot;)
        helps Indian manufacturers export globally. This policy explains what
        data we collect, why we collect it, and how we protect it.
      </p>
      {sections.map((s) => (
        <section key={s.h} className="mb-8">
          <h2 className="mb-2 text-lg font-bold text-text-heading">{s.h}</h2>
          <p className="text-[15px] leading-relaxed text-text-body">{s.p}</p>
        </section>
      ))}
    </div>
  );
}
