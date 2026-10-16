import PolicyPage, { PolicyCallout, PolicyPointCards, type PolicySection } from "@/components/policy-page/policy-page";

/*
  The /privacy-policy page ("Privacy policy" in the site footer opens it): the shared policy page
  layout (components/policy-page, same design as the Refund page) with the Privacy Policy title,
  short line and eleven cards, from the design.
*/

const informationUses = [
  {
    title: "Account Verification",
    text: "Sending OTPs through WhatsApp or other supported channels to verify your mobile number and secure your account.",
  },
  { title: "Order Processing", text: "Confirming orders, managing purchases and sharing order-related updates." },
  {
    title: "Payment Processing",
    text: "Facilitating payments, verifying transaction status and managing payment-related queries.",
  },
  {
    title: "Delivery and Tracking",
    text: "Coordinating deliveries, sharing tracking updates and ensuring your products reach the correct address.",
  },
  {
    title: "Customer Support",
    text: "Contacting you to answer questions, resolve issues and provide assistance regarding your orders.",
  },
  { title: "Service Updates", text: "Informing you about important changes to our services, orders or policies." },
];

const privacySections: PolicySection[] = [
  {
    id: "information-we-collect",
    title: "Information We Collect",
    iconPaths: ["M3 5h18v14H3z", "M9 10.5a2 2 0 1 0 0-.01", "M6 16a3 3 0 0 1 6 0", "M14 10h4M14 13.5h4"],
    content: (
      <>
        <p>
          When you visit our website, create an account or place an order, we may collect information such as your name,
          mobile number, email address, delivery address, order details and other information necessary to provide our
          services.
        </p>
        <p>
          We may also collect information related to your transactions and order activity to help us process purchases,
          manage deliveries and provide customer support.
        </p>
      </>
    ),
  },
  {
    id: "how-we-use-your-information",
    title: "How We Use Your Information",
    iconPaths: [
      "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
      "M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4",
    ],
    content: (
      <>
        <p>
          We use your personal information only for legitimate business purposes related to your experience with
          Chiranvi Farm, including:
        </p>
        <PolicyPointCards points={informationUses} />
        <p>We aim to collect and use only the information necessary to provide these services.</p>
      </>
    ),
  },
  {
    id: "whatsapp-communication",
    title: "WhatsApp Communication",
    iconPaths: [
      "M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3Z",
      "M9 8.5c0 3.5 2.6 6.5 6.5 6.5l1-1.5-2-1-1 .8c-1-.4-2-1.4-2.4-2.4l.8-1-1-2L9 8.5Z",
    ],
    content: (
      <>
        <p>
          Chiranvi Farm may use WhatsApp to send OTP verification codes, order confirmations, payment-related
          notifications, delivery updates and other essential service communications.
        </p>
        <p>
          Your mobile number and relevant information may be processed through WhatsApp and the service providers
          required to deliver these communications. WhatsApp processes information under its own privacy terms and
          policies.
        </p>
        <PolicyCallout>
          We will use your contact information for promotional communications only where permitted by applicable law
          and, where required, with your consent. <strong>You may opt out of promotional messages at any time.</strong>
        </PolicyCallout>
      </>
    ),
  },
  {
    id: "payments-and-transaction-security",
    title: "Payments and Transaction Security",
    iconPaths: ["M3 6h18v12H3z", "M3 10h18", "M7 15h4"],
    content: (
      <>
        <p>
          Payments made through our website may be processed by third-party payment service providers. These providers
          may process the information necessary to securely complete transactions and verify payment status.
        </p>
        <p>
          Chiranvi Farm does not intentionally store complete payment card details or other sensitive payment
          credentials unless specifically required and handled in accordance with applicable security requirements.
        </p>
        <p>
          Payment information is handled according to the relevant payment provider&apos;s privacy and security
          practices.
        </p>
      </>
    ),
  },
  {
    id: "sharing-of-your-information",
    title: "Sharing of Your Information",
    iconPaths: ["M18 8a3 3 0 1 0 0-.01M6 15a3 3 0 1 0 0-.01M18 19a3 3 0 1 0 0-.01", "M8.6 13.5l6.8-4M8.6 16.5l6.8 4"],
    content: (
      <>
        <PolicyCallout>
          <strong>We do not sell or rent your personal information to third parties.</strong>
        </PolicyCallout>
        <p>
          We do not share your personal information with unrelated third parties for their independent marketing
          purposes.
        </p>
        <p>
          However, certain information may need to be processed by service providers that help us operate our business,
          such as WhatsApp for communication, payment gateways for transactions, and delivery or technology providers
          for order fulfilment, tracking and website operations.
        </p>
        <p>
          These providers may access only the information necessary to perform their services and are expected to handle
          it appropriately. We may also disclose information when required by applicable law, a lawful request from an
          authorised authority, or to protect our legal rights and the safety of our customers.
        </p>
      </>
    ),
  },
  {
    id: "data-security",
    title: "Data Security",
    iconPaths: ["M5 11h14v10H5z", "M8 11V7a4 4 0 0 1 8 0v4", "M12 15v2"],
    content: (
      <>
        <p>
          We take reasonable technical and organisational measures to protect your personal information against
          unauthorised access, misuse, alteration, disclosure or loss.
        </p>
        <p>
          Although we work to safeguard your information, no website, digital platform or electronic transmission can be
          guaranteed to be completely secure.
        </p>
      </>
    ),
  },
  {
    id: "data-retention",
    title: "Data Retention",
    iconPaths: ["M4 6h12M4 11h8M4 16h6", "M17 13a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z", "M17 15v2l1.3 1"],
    content: (
      <>
        <p>
          We retain personal information only for as long as reasonably necessary to provide our services, maintain
          order and transaction records, resolve disputes, meet legal and regulatory obligations, and protect our
          legitimate business interests.
        </p>
        <p>
          When information is no longer required, we take appropriate steps to delete it or anonymise it, subject to
          applicable legal requirements.
        </p>
      </>
    ),
  },
  {
    id: "your-privacy-rights",
    title: "Your Privacy Rights",
    iconPaths: [
      "M12 3l7 3v6c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3Z",
      "M12 10.5a1.8 1.8 0 1 0 0-.01",
      "M9.2 15.5a3 3 0 0 1 5.6 0",
    ],
    content: (
      <>
        <p>
          Subject to applicable law, you may request access to, correction of or deletion of your personal information.
          You may also raise concerns about how your information is being used or withdraw consent where processing is
          based on consent.
        </p>
        <p>
          Certain information may need to be retained where required by law or necessary to complete transactions and
          resolve outstanding matters.
        </p>
        <p>To make a privacy-related request, please contact us using the contact details provided on our website.</p>
      </>
    ),
  },
  {
    id: "cookies-and-website-technologies",
    title: "Cookies and Website Technologies",
    iconPaths: [
      "M12 3a9 9 0 1 0 9 9 3 3 0 0 1-3-3 3 3 0 0 1-3-3 3 3 0 0 1-3-3Z",
      "M8.5 10h.01M14.5 15h.01M9.5 15.5h.01",
    ],
    content: (
      <>
        <p>
          Our website may use cookies or similar technologies to support essential website functions, remember
          preferences, improve performance and understand how visitors use our services.
        </p>
        <p>
          Where required, we will seek consent for non-essential cookies or tracking technologies. You can also manage
          cookies through your browser settings, although disabling certain cookies may affect website functionality.
        </p>
      </>
    ),
  },
  {
    id: "changes-to-this-privacy-policy",
    title: "Changes to This Privacy Policy",
    iconPaths: ["M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4", "M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4"],
    content: (
      <>
        <p>
          Chiranvi Farm may update this Privacy Policy from time to time to reflect changes in our services, business
          practices or applicable legal requirements.
        </p>
        <p>
          Any updated version will be published on this page with a revised effective date. We encourage customers to
          review this page periodically.
        </p>
      </>
    ),
  },
  {
    id: "contact-us",
    title: "Contact Us",
    iconPaths: ["M4 5h16v11H9l-5 4V5Z", "M8 9h8M8 12.5h5"],
    content: (
      <p>
        If you have questions, concerns or requests regarding your personal information or this Privacy Policy, please
        contact Chiranvi Farm through the customer support details listed on our website.
      </p>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <PolicyPage
      title="Privacy Policy"
      description={
        <>
          <strong>Your privacy matters to us.</strong> At Chiranvi Farm, we are committed to protecting your personal
          information and using it responsibly to provide you with a smooth, secure and reliable shopping experience.
        </>
      }
      sections={privacySections}
    />
  );
}
