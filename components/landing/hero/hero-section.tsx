"use client";

import Image from "next/image";
import Link from "next/link";
import { rememberPageAfterLogin, useIsLoggedIn } from "@/components/login/login-status";
import SiteNavigationPlacement from "@/components/navigation/site-navigation-placement";
import styles from "./hero-section.module.css";

/*
  Landing page hero: navigation bar, heading, description, Order Now button,
  ghee jar / milk bottle swap animation, gold ring, green panel and "5K+ Orders".
  Its sizes rely on the zoom and layout script in app/page.tsx.
*/

const satisfiedCustomerPhotos = [
  "/images/customers/satisfied-customer-1.webp",
  "/images/customers/satisfied-customer-2.webp",
  "/images/customers/satisfied-customer-3.webp",
];

export default function HeroSection() {
  const isLoggedIn = useIsLoggedIn();
  return (
    <>
      {/* Navigation bar, placed the same way on every page (stays at the top; the hero runs up under it) */}
      <SiteNavigationPlacement reserveSpace={false} />

      <section className={styles["landing-hero-section"]}>
        <div className={styles["landing-hero-canvas"]}>
          {/* Shown only on phones and upright tablets, where the navigation bar moves to the bottom. */}
          <Link href="/" className={styles["landing-hero-mobile-logo-link"]}>
            <Image
              src="/images/brand/chiranvi-farm-logo.webp"
              alt="Chiranvi Farm"
              width={516}
              height={240}
              className={styles["landing-hero-mobile-logo-image"]}
            />
          </Link>

          {/*
          Ring, green panel, products and "5K+ Orders".
          On desktop this wrapper has no box of its own; on mobile it becomes the top block.
        */}
          <div className={styles["landing-hero-product-stage"]}>
            <div
              className={styles["landing-hero-gold-ring"]}
              aria-hidden="true"
            />
            <div
              className={styles["landing-hero-green-panel"]}
              aria-hidden="true"
            />

            <div className={styles["landing-hero-product-showcase"]}>
              <Image
                src="/images/products/desi-ghee-jar-chiranvi-farm.webp"
                alt="Chiranvi Farm Desi Ghee jar, made from A2 milk"
                width={1524}
                height={2204}
                className={`${styles["landing-hero-product-image"]} ${styles["landing-hero-ghee-jar-image"]}`}
                preload
              />
              <Image
                src="/images/products/desi-cow-milk-bottle-chiranvi-farm.webp"
                alt="Chiranvi Farm Desi Cow Milk bottle, no added preservatives"
                width={1188}
                height={2312}
                className={`${styles["landing-hero-product-image"]} ${styles["landing-hero-milk-bottle-image"]}`}
              />
            </div>

            <div className={styles["satisfied-customers-summary"]}>
              <div className={styles["satisfied-customers-photo-stack"]}>
                {satisfiedCustomerPhotos.map((customerPhoto) => (
                  <Image
                    key={customerPhoto}
                    src={customerPhoto}
                    alt=""
                    width={172}
                    height={172}
                    className={styles["satisfied-customer-photo"]}
                  />
                ))}
              </div>
              <div>
                <p className={styles["satisfied-customers-order-count"]}>
                  5K+ Orders
                </p>
                <p className={styles["satisfied-customers-caption"]}>
                  Customers Are Satisfied
                </p>
              </div>
            </div>
          </div>

          <div className={styles["landing-hero-text-column"]}>
            <h1 className={styles["landing-hero-heading"]}>
              We’ve Served 20K+
              <br />
              Now it’s Your turn to
              <br />
              Choose{" "}
              <span className={styles["landing-hero-heading-highlighted-word"]}>
                PURITY.
              </span>
            </h1>

            <p className={styles["landing-hero-description"]}>
              Pure ingredients. Honest quality. Everyday goodness. <br />
              We bring you carefully crafted ghee, fresh milk, and dairy <br />
              products you can trust for your family.
            </p>

            {/* Order Now: the products page (logged out: the login first, then the products page) */}
            <Link
              href={isLoggedIn ? "/products" : "/login"}
              className={styles["landing-hero-order-now-button"]}
              onClick={() => {
                if (!isLoggedIn) rememberPageAfterLogin("/products");
              }}
            >
              Order Now
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
