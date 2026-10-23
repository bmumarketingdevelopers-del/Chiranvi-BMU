"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useIsLoggedIn } from "@/components/login/login-status";
import styles from "./shop-by-category-section.module.css";

/*
  Landing page section below the purity promises: "Shop By Category" heading
  with six round category pictures (Milk, Paneer, Ghee, Butter, Flours, Batter).
  Logged out, every category leads to the login page (logging in comes before shopping). Logged in, the
  categories do not open anything yet (they will open the product pages once those are finished).
  Scroll reveal: when the section scrolls into view, the heading and the six
  categories fade and slide up together.
*/

// Transparent product cut-outs; the circle's light gradient shows behind them.
// Milk and ghee reuse the hero's product images.
const productCategories = [
  { name: "Milk", imageSource: "/images/products/desi-cow-milk-bottle-chiranvi-farm.webp", imageWidth: 1188, imageHeight: 2312 },
  { name: "Paneer", imageSource: "/images/categories/paneer-category.webp", imageWidth: 428, imageHeight: 288 },
  { name: "Ghee", imageSource: "/images/products/desi-ghee-jar-chiranvi-farm.webp", imageWidth: 1524, imageHeight: 2204 },
  { name: "Butter", imageSource: "/images/categories/butter-category.webp", imageWidth: 412, imageHeight: 272 },
  { name: "Flours", imageSource: "/images/categories/flours-category-chiranvi-farm.webp", imageWidth: 412, imageHeight: 276 },
  { name: "Batter", imageSource: "/images/categories/batter-category-chiranvi-farm.webp", imageWidth: 372, imageHeight: 248 },
];

export default function ShopByCategorySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isLoggedIn = useIsLoggedIn();
  // "visible": shown normally (also the server-rendered state, so nothing is hidden without JavaScript).
  // "waiting": hidden, ready to animate. "revealed": animated into view.
  const [revealState, setRevealState] = useState<"visible" | "waiting" | "revealed">("visible");

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Already clearly on screen when the page opens (not just peeking in at the bottom): just show it.
    if (section.getBoundingClientRect().top < window.innerHeight - 100) return;

    setRevealState("waiting");
    const revealObserver = new IntersectionObserver(
      ([sectionVisibility]) => {
        if (sectionVisibility.isIntersecting) {
          setRevealState("revealed");
          revealObserver.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    revealObserver.observe(section);
    return () => revealObserver.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`${styles["shop-by-category-section"]} ${
        revealState === "visible" ? "" : styles[`shop-by-category-section-${revealState}`]
      }`}
      aria-labelledby="shop-by-category-heading"
    >
      <h2 id="shop-by-category-heading" className={styles["shop-by-category-heading"]}>
        {/* Decorative line and dash on both sides of the heading */}
        <span className={styles["shop-by-category-heading-decoration"]} aria-hidden="true" />
        Shop By Category
        <span
          className={`${styles["shop-by-category-heading-decoration"]} ${styles["shop-by-category-heading-decoration-right"]}`}
          aria-hidden="true"
        />
      </h2>

      <ul className={styles["shop-by-category-list"]}>
        {productCategories.map((productCategory) => {
          const categoryPictureAndName = (
            <>
              <span className={styles["shop-by-category-image-circle"]}>
                <Image
                  src={productCategory.imageSource}
                  alt=""
                  width={productCategory.imageWidth}
                  height={productCategory.imageHeight}
                  sizes="120px"
                  className={styles["shop-by-category-image"]}
                />
              </span>
              <span className={styles["shop-by-category-name"]}>{productCategory.name}</span>
            </>
          );
          return (
            <li key={productCategory.name}>
              {isLoggedIn ? (
                <span className={styles["shop-by-category-link"]}>{categoryPictureAndName}</span>
              ) : (
                <Link href="/login" className={styles["shop-by-category-link"]}>
                  {categoryPictureAndName}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
