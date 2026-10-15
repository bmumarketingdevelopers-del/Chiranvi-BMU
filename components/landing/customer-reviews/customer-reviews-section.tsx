"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./customer-reviews-section.module.css";

/*
  Landing page section "Where Goodness Gets a Voice": customer review cards with dots below.
  Built as a swipeable slider: desktop shows three cards side by side, phones show one.
  With three reviews nothing moves (exactly like the design); add more reviews to
  customerReviews below and visitors can swipe / scroll through them, and the dots follow.
  The card in the middle of the visible ones is highlighted with a darker border.
  Scroll reveal: when the section scrolls into view, the heading, cards and dots fade and
  slide up together.
*/

// Placeholder reviews from the design until real reviews are available.
const customerReviews = [
  {
    reviewerName: "John",
    reviewerRole: "Software Engineer",
    rating: 4.9,
    reviewText:
      "Fresh, wholesome, and full of authentic taste. Quality of every product really stands out. Loved the traditional touch and natural flavours. Definitely coming back for more!",
  },
  {
    reviewerName: "Ethan Miller",
    reviewerRole: "Product Designer",
    rating: 4.9,
    reviewText:
      "Fresh, wholesome, and full of authentic taste. The quality of every product really stands out. Loved the traditional touch and natural flavours.",
  },
  {
    reviewerName: "Roshan",
    reviewerRole: "Developer",
    rating: 4.9,
    reviewText:
      "Every product feels fresh, pure, and authentic. The traditional flavours are simply wonderful. You can truly taste the quality and care. A brand our family can trust.",
  },
];

export default function CustomerReviewsSection() {
  const sectionRef = useRef<HTMLElement>(null);
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
      { threshold: 0.2 },
    );
    revealObserver.observe(section);
    return () => revealObserver.disconnect();
  }, []);

  const reviewTrackRef = useRef<HTMLUListElement>(null);
  const [firstVisibleReviewIndex, setFirstVisibleReviewIndex] = useState(0);
  const [visibleReviewCount, setVisibleReviewCount] = useState(3);

  // Works out which card is first on screen and how many fit, whenever the track scrolls or resizes.
  useEffect(() => {
    const reviewTrack = reviewTrackRef.current;
    if (!reviewTrack) return;

    function updateVisibleReviews() {
      const reviewTrack = reviewTrackRef.current;
      const firstReviewCard = reviewTrack?.firstElementChild as HTMLElement | null;
      if (!reviewTrack || !firstReviewCard) return;
      const cardGap = parseFloat(getComputedStyle(reviewTrack).columnGap) || 0;
      const cardStep = firstReviewCard.offsetWidth + cardGap;
      setFirstVisibleReviewIndex(Math.round(reviewTrack.scrollLeft / cardStep));
      setVisibleReviewCount(Math.max(1, Math.round((reviewTrack.clientWidth + cardGap) / cardStep)));
    }

    updateVisibleReviews();
    reviewTrack.addEventListener("scroll", updateVisibleReviews, { passive: true });
    window.addEventListener("resize", updateVisibleReviews);
    return () => {
      reviewTrack.removeEventListener("scroll", updateVisibleReviews);
      window.removeEventListener("resize", updateVisibleReviews);
    };
  }, []);

  function scrollToReview(reviewIndex: number) {
    const reviewCard = reviewTrackRef.current?.children[reviewIndex] as HTMLElement | undefined;
    reviewTrackRef.current?.scrollTo({ left: reviewCard?.offsetLeft ?? 0, behavior: "smooth" });
  }

  const highlightedReviewIndex = Math.min(
    firstVisibleReviewIndex + Math.floor(visibleReviewCount / 2),
    customerReviews.length - 1,
  );

  return (
    <section
      ref={sectionRef}
      className={`${styles["customer-reviews-section"]} ${
        revealState === "visible" ? "" : styles[`customer-reviews-section-${revealState}`]
      }`}
      aria-labelledby="customer-reviews-heading"
    >
      <h2 id="customer-reviews-heading" className={styles["customer-reviews-heading"]}>
        Where Goodness Gets a Voice
      </h2>
      <p className={styles["customer-reviews-subheading"]}>
        Real experiences from families who choose Chiranvi Farm.
      </p>

      <ul ref={reviewTrackRef} className={styles["customer-reviews-track"]} aria-label="Customer reviews">
        {customerReviews.map((customerReview, reviewIndex) => (
          <li
            key={customerReview.reviewerName}
            className={`${styles["customer-review-card"]} ${
              reviewIndex === highlightedReviewIndex ? styles["customer-review-card-highlighted"] : ""
            }`}
          >
            <p className={styles["customer-review-rating"]}>
              <svg viewBox="0 0 24 24" className={styles["customer-review-rating-star"]} aria-hidden="true">
                <path d="M12 2.8l2.8 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17.1 6.4 20l1.1-6.2-4.6-4.4 6.3-.9z" />
              </svg>
              <span>
                <span className={styles["customer-review-visually-hidden"]}>Rated </span>
                {customerReview.rating}
              </span>
            </p>

            <p className={styles["customer-review-text"]}>{customerReview.reviewText}</p>

            <div className={styles["customer-review-author"]}>
              {/* Grey circle until reviewer photos are available */}
              <span className={styles["customer-review-author-photo"]} aria-hidden="true" />
              <span>
                <span className={styles["customer-review-author-name"]}>{customerReview.reviewerName}</span>
                <span className={styles["customer-review-author-role"]}>{customerReview.reviewerRole}</span>
              </span>
            </div>
          </li>
        ))}
      </ul>

      <div className={styles["customer-reviews-dots"]}>
        {customerReviews.map((customerReview, reviewIndex) => (
          <button
            key={customerReview.reviewerName}
            type="button"
            aria-label={`Show review ${reviewIndex + 1}`}
            aria-current={reviewIndex === firstVisibleReviewIndex}
            className={`${styles["customer-reviews-dot"]} ${
              reviewIndex === firstVisibleReviewIndex ? styles["customer-reviews-dot-active"] : ""
            }`}
            onClick={() => scrollToReview(reviewIndex)}
          />
        ))}
      </div>
    </section>
  );
}
