import SiteNavigationBar from "./site-navigation-bar";
import styles from "./site-navigation-placement.module.css";

/*
  Where the navigation bar sits, the same on every page (taken from the landing page):
  47 design pixels from the sides and 27 from the top of the 1440-wide frame, sized with the landing
  page unit, and it stays at the top of the screen while the page scrolls (12px from the top and
  sides on phones).
  reserveSpace: true (other pages) keeps room for the bar so the page starts below it; the landing
  page passes false because its hero runs up underneath the bar.
*/

export default function SiteNavigationPlacement({ reserveSpace = true }: { reserveSpace?: boolean }) {
  return (
    <>
      <div className={styles["site-navigation-placement"]}>
        <div className={styles["site-navigation-placement-bar"]}>
          <SiteNavigationBar />
        </div>
      </div>
      {reserveSpace && <div className={styles["site-navigation-placement-space"]} aria-hidden="true" />}
    </>
  );
}
