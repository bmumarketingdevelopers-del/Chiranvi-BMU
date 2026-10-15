import type { Metadata } from "next";
import { Poppins, Ubuntu } from "next/font/google";
import ReviewsPage from "@/components/reviews/reviews-page";

export const metadata: Metadata = {
  title: "Reviews | Chiranvi Farms",
};

const poppinsFont = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins" });
const ubuntuFont = Ubuntu({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-ubuntu" });

// Reviews page: opened from "Review" in the site footer.
export default function ReviewsRoute() {
  return (
    <main className={`${poppinsFont.variable} ${ubuntuFont.variable}`}>
      <ReviewsPage />
    </main>
  );
}
