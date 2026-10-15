import SiteFooter from "@/components/footer/site-footer";
import LandingZoomAndLayoutRunner from "@/components/landing/landing-zoom-and-layout-runner";
import LoginBottomSheet from "@/components/login/login-bottom-sheet";
import SiteNavigationBar from "@/components/navigation/site-navigation-bar";
import JoinCommunitySection from "./join-community-section";
import styles from "./community-page.module.css";

/*
  The /community page ("Join Community" in the navigation bar opens it):
  the navigation bar on top, the "Join the Chiranvi Community" section, then the shared site footer
  (with the "Refer a Friend" banner).
  Same layout script as the landing page (zoom-aware sizes, phone layout), and on phones the login
  opens as a bottom sheet here too.
*/

export default function CommunityPage() {
  return (
    <div className={styles["community-page"]}>
      <LandingZoomAndLayoutRunner />

      <div className={styles["community-page-navigation"]}>
        <SiteNavigationBar />
      </div>

      <JoinCommunitySection />

      <SiteFooter />
      <LoginBottomSheet />
    </div>
  );
}
