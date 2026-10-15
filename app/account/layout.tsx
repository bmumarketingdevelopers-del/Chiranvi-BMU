import type { ReactNode } from "react";
import { Poppins, Ubuntu } from "next/font/google";
import AccountDashboardLayout from "@/components/account/account-dashboard-layout";

// Fonts for the dashboard: Poppins for the text, Ubuntu for the Best Sellers heading on the Orders page.
const poppinsFont = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins" });
const ubuntuFont = Ubuntu({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-ubuntu" });

// Account dashboard (/account, /account/orders, /account/subscription, /account/address, /account/offers).
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${poppinsFont.variable} ${ubuntuFont.variable}`}>
      <AccountDashboardLayout>{children}</AccountDashboardLayout>
    </div>
  );
}
