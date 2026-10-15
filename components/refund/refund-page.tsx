"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import SiteFooter from "@/components/footer/site-footer";
import LandingZoomAndLayoutRunner from "@/components/landing/landing-zoom-and-layout-runner";
import LoginBottomSheet from "@/components/login/login-bottom-sheet";
import SiteNavigationBar from "@/components/navigation/site-navigation-bar";
import styles from "./refund-page.module.css";

/*
  The /refund page ("Refund" in the site footer opens it), from the design:
  - green hero banner: "Home / Refund Policy", the title with a gold bar under it, a short line,
    and on the right the milk, paneer and ghee in white circles with a "Farm fresh" tag;
  - "On this page" menu on the left (stays in view while scrolling; the section being read is
    highlighted, clicking an item scrolls to it), and the four policy cards on the right;
  - the "Thank you for choosing Chiranvi Farms" banner, then the shared site footer.
*/

type PolicySection = { id: string; title: string; iconPaths: string[]; content: ReactNode };

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
        <p className={styles["refund-callout"]}>
          Due to the perishable nature of these products,{" "}
          <strong>
            all purchases are final, and we do not offer refunds once an order has been placed and confirmed.
          </strong>{" "}
          Perishable products have a limited shelf life and require careful handling and storage. Once an order enters
          the preparation or delivery process, we cannot guarantee the conditions under which the products may be stored
          or handled if returned. Reselling returned perishable products could compromise food safety and product
          quality.
        </p>
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

function PolicyIcon({ iconPaths }: { iconPaths: string[] }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {iconPaths.map((iconPath) => (
        <path key={iconPath} d={iconPath} />
      ))}
    </svg>
  );
}

export default function RefundPage() {
  const [activeSectionId, setActiveSectionId] = useState(policySections[0].id);

  // Highlight the section being read in the "On this page" menu.
  useEffect(() => {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visibleEntry) setActiveSectionId(visibleEntry.target.id);
      },
      { rootMargin: "-25% 0px -55% 0px" },
    );
    for (const policySection of policySections) {
      const sectionElement = document.getElementById(policySection.id);
      if (sectionElement) sectionObserver.observe(sectionElement);
    }
    return () => sectionObserver.disconnect();
  }, []);

  function scrollToSection(sectionId: string) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSectionId(sectionId);
  }

  return (
    <div className={styles["refund-page"]}>
      <LandingZoomAndLayoutRunner />

      <div className={styles["refund-page-navigation"]}>
        <SiteNavigationBar />
      </div>

      {/* Hero banner */}
      <section className={styles["refund-hero"]} aria-labelledby="refund-page-title">
        <span className={styles["refund-hero-arc"]} aria-hidden="true" />
        <span className={styles["refund-hero-dashed-circle"]} aria-hidden="true" />

        <div className={styles["refund-hero-text"]}>
          <nav aria-label="Breadcrumb" className={styles["refund-breadcrumb"]}>
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Refund Policy</span>
          </nav>
          <h1 id="refund-page-title" className={styles["refund-hero-title"]}>
            Refund Policy
          </h1>
          <span className={styles["refund-hero-title-bar"]} aria-hidden="true" />
          <p className={styles["refund-hero-description"]}>
            At Chiranvi Farms, freshness matters. Every product is handled with care to bring quality and goodness to
            your home.
          </p>
        </div>

        <div className={styles["refund-hero-products"]} aria-hidden="true">
          <span className={`${styles["refund-hero-product-circle"]} ${styles["refund-hero-product-milk"]}`}>
            <Image
              src="/images/products/a2-cow-milk-1-litre-bottle.webp"
              alt=""
              width={232}
              height={500}
              sizes="80px"
            />
          </span>
          <span className={`${styles["refund-hero-product-circle"]} ${styles["refund-hero-product-paneer"]}`}>
            <Image src="/images/products/fresh-paneer-200g-box.webp" alt="" width={604} height={444} sizes="140px" />
          </span>
          <span className={`${styles["refund-hero-product-circle"]} ${styles["refund-hero-product-ghee"]}`}>
            <Image src="/images/products/desi-ghee-jar.webp" alt="" width={1524} height={2204} sizes="100px" />
          </span>
          <span className={styles["refund-hero-farm-fresh-tag"]}>
            <svg viewBox="0 0 24 24">
              <path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14Z" />
              <path d="M5 19l7-7" />
            </svg>
            Farm fresh
          </span>
        </div>
      </section>

      {/* "On this page" menu and the policy cards */}
      <div className={styles["refund-body"]}>
        <nav aria-label="On this page" className={styles["refund-contents"]}>
          <p className={styles["refund-contents-title"]}>On this page</p>
          <ol className={styles["refund-contents-list"]}>
            {policySections.map((policySection, sectionIndex) => (
              <li key={policySection.id}>
                <a
                  href={`#${policySection.id}`}
                  aria-current={activeSectionId === policySection.id ? "location" : undefined}
                  className={`${styles["refund-contents-link"]} ${
                    activeSectionId === policySection.id ? styles["refund-contents-link-active"] : ""
                  }`}
                  onClick={(event) => {
                    event.preventDefault();
                    scrollToSection(policySection.id);
                  }}
                >
                  <span className={styles["refund-contents-number"]}>{String(sectionIndex + 1).padStart(2, "0")}</span>
                  {policySection.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className={styles["refund-sections"]}>
          {policySections.map((policySection) => (
            <section
              key={policySection.id}
              id={policySection.id}
              aria-labelledby={`${policySection.id}-heading`}
              className={styles["refund-card"]}
            >
              <div className={styles["refund-card-heading-row"]}>
                <span className={styles["refund-card-icon"]}>
                  <PolicyIcon iconPaths={policySection.iconPaths} />
                </span>
                <h2 id={`${policySection.id}-heading`} className={styles["refund-card-heading"]}>
                  {policySection.title}
                </h2>
              </div>
              <div className={styles["refund-card-text"]}>{policySection.content}</div>
            </section>
          ))}
        </div>

        {/* Thank-you banner, across both columns */}
        <p className={styles["refund-thank-you"]}>
          <span className={styles["refund-thank-you-heart"]} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
            </svg>
          </span>
          Thank you for choosing Chiranvi Farms. Your trust inspires us to deliver quality, freshness and goodness to
          your home.
        </p>
      </div>

      <SiteFooter />
      <LoginBottomSheet />
    </div>
  );
}
