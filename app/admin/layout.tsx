import type { Metadata } from "next";
import { Poppins, Ubuntu } from "next/font/google";
import AdminPanelLayout from "@/components/admin/admin-panel-layout";

export const metadata: Metadata = {
  title: "Chiranvi Panel | Chiranvi Farm",
};

// The site's own fonts: Ubuntu for headings and big numbers, Poppins for everything else
const poppinsFont = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins" });
const ubuntuFont = Ubuntu({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-ubuntu" });

// Chiranvi Panel (admin): every /admin page shares this frame, which also checks who may open it.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${poppinsFont.variable} ${ubuntuFont.variable}`}>
      <AdminPanelLayout>{children}</AdminPanelLayout>
    </div>
  );
}
