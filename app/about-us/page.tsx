import type { Metadata } from "next";
import { Poppins, Ubuntu } from "next/font/google";
import AboutUsPage from "@/components/about-us/about-us-page";

export const metadata: Metadata = {
  title: "About Us | Chiranvi Farm",
};

const poppinsFont = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins" });
const ubuntuFont = Ubuntu({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
  variable: "--font-ubuntu",
});

// About Us page: opened from "About us" in the navigation bar and the site footer.
export default function AboutUsRoute() {
  return (
    <main className={`${poppinsFont.variable} ${ubuntuFont.variable}`}>
      <AboutUsPage />
    </main>
  );
}
