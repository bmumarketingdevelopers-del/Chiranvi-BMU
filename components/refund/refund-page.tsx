import PolicyPage, { PolicyCallout, type PolicySection } from "@/components/policy-page/policy-page";

/*
  The /refund page ("Refund" in the site footer opens it): the shared policy page layout
  (components/policy-page) with the Refund Policy title, short line and four cards.
*/

const policySections: PolicySection[] = [
  {
    id: "no-refund-policy",
    title: "No Refund Policy",
    iconPaths: ["M12 3l7 3v6c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3Z", "M9 12l2 2 4-4"],
    content: (
      <>
        <p>
          At Chiranvi Farms, we are committed to delivering fresh, quality dairy products and food essentials to our
          customers. Since our products include perishable items such as milk, paneer, butter and other dairy products,
          maintaining freshness, hygiene and food safety is our highest priority.
        </p>
        <PolicyCallout>
          Due to the perishable nature of these products,{" "}
          <strong>
            all purchases are final, and we do not offer refunds once an order has been placed and confirmed.
          </strong>{" "}
          Perishable products have a limited shelf life and require careful handling and storage. Once an order enters
          the preparation or delivery process, we cannot guarantee the conditions under which the products may be stored
          or handled if returned. Reselling returned perishable products could compromise food safety and product
          quality.
        </PolicyCallout>
        <p>
          For these reasons, we do not accept product returns or provide refunds for changes of mind, incorrect product
          selection, unwanted purchases or other personal preferences.
        </p>
      </>
    ),
  },
  {
    id: "before-placing-your-order",
    title: "Before Placing Your Order",
    iconPaths: ["M8 4h8v3H8z", "M6 5.5H5v15h14v-15h-1", "M8.5 11.5l1 1 2-2M13.5 11.5H16M8.5 16l1 1 2-2M13.5 16H16"],
    content: (
      <>
        <p>
          We encourage customers to review their selected products, quantities, prices and delivery details carefully
          before completing a purchase. Please ensure that your order is correct and that someone is available to
          receive the delivery at the specified address.
        </p>
        <p>
          Our team takes care to prepare and deliver your order with the attention that fresh food deserves. Your
          understanding helps us maintain our quality standards and reduce unnecessary food waste.
        </p>
      </>
    ),
  },
  {
    id: "concerns-about-your-order",
    title: "Concerns About Your Order",
    iconPaths: ["M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3Z", "M4 7.5l8 4.5 8-4.5M12 12v9", "M15.5 15.5a1.6 1.6 0 1 0 0 .01"],
    content: (
      <>
        <p>
          Although refunds are not offered under our standard policy, we want every customer to have a positive
          experience with Chiranvi Farms.
        </p>
        <p>
          If you receive a product that appears damaged, spoiled, contaminated or incorrect, please contact our customer
          support team as soon as possible after delivery. Share your order details and clear photographs of the product
          and packaging so that our team can review the concern.
        </p>
        <p>
          Such reports will be assessed individually in accordance with our quality and food-safety procedures and
          applicable consumer protection requirements. Any remedy offered will depend on the circumstances and
          applicable requirements.
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
        For questions or concerns regarding your order, please contact Chiranvi Farms through the customer support
        details provided on our website. Our team will assist you with your concern and help clarify the next steps.
      </p>
    ),
  },
];

export default function RefundPage() {
  return (
    <PolicyPage
      title="Refund Policy"
      description="At Chiranvi Farms, freshness matters. Every product is handled with care to bring quality and goodness to your home."
      sections={policySections}
    />
  );
}
