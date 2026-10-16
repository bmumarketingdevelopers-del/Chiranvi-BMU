import type { Metadata } from "next";
import { Poppins, Ubuntu } from "next/font/google";
import CommunityPage from "@/components/community/community-page";

export const metadata: Metadata = {
  title: "Join Community | Chiranvi Farm",
};

const poppinsFont = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins" });
const ubuntuFont = Ubuntu({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-ubuntu" });

// "Join Community" page: opened from the navigation bar.
export default function JoinCommunityPage() {
  return (
    <main className={`${poppinsFont.variable} ${ubuntuFont.variable}`}>
      <CommunityPage />
    </main>
  );
}
