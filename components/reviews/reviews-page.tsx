import SiteFooter from "@/components/footer/site-footer";
import LandingZoomAndLayoutRunner from "@/components/landing/landing-zoom-and-layout-runner";
import LoginBottomSheet from "@/components/login/login-bottom-sheet";
import SiteNavigationPlacement from "@/components/navigation/site-navigation-placement";
import { customerReviews } from "./customer-reviews-data";
import ReviewerAvatar from "./reviewer-avatar";
import styles from "./reviews-page.module.css";

/*
  The /reviews page ("Review" in the site footer opens it), from the design:
  the navigation bar, "Where Goodness Gets a Voice" with its short line, all twelve review cards
  (three per row on desktop, one per row on phones), then the shared site footer.
  Each card: star and rating, the review, then the reviewer's illustrated avatar, name and place.
*/

export default function ReviewsPage() {
  return (
    <div className={styles["reviews-page"]}>
      <LandingZoomAndLayoutRunner />

      {/* Navigation bar, placed exactly like on the landing page */}
      <SiteNavigationPlacement />

      <div className={styles["reviews-page-content"]}>
        <h1 className={styles["reviews-page-heading"]}>Where Goodness Gets a Voice</h1>
        <p className={styles["reviews-page-subheading"]}>Real experiences from families who choose Chiranvi Farm.</p>

        <ul className={styles["reviews-page-grid"]} aria-label="Customer reviews">
          {customerReviews.map((customerReview) => (
            <li key={customerReview.id} className={styles["reviews-page-card"]}>
              <p className={styles["reviews-page-card-rating"]}>
                <svg viewBox="0 0 24 24" className={styles["reviews-page-card-star"]} aria-hidden="true">
                  <path d="M12 2.8l2.8 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17.1 6.4 20l1.1-6.2-4.6-4.4 6.3-.9z" />
                </svg>
                <span>
                  <span className={styles["reviews-page-visually-hidden"]}>Rated </span>
                  {customerReview.rating.toFixed(1)}
                </span>
              </p>
              <p className={styles["reviews-page-card-text"]}>{customerReview.reviewText}</p>
              <div className={styles["reviews-page-card-author"]}>
                <span className={styles["reviews-page-card-avatar"]}>
                  <ReviewerAvatar look={customerReview.avatar} />
                </span>
                <span>
                  <span className={styles["reviews-page-card-name"]}>{customerReview.reviewerName}</span>
                  <span className={styles["reviews-page-card-place"]}>{customerReview.reviewerPlace}</span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <SiteFooter />
      <LoginBottomSheet />
    </div>
  );
}
