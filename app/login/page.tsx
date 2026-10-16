import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import LoginPanel from "@/components/login/login-panel";

export const metadata: Metadata = {
  title: "Log in | Chiranvi Farm",
};

// The login page loads Poppins itself (the landing page's fonts are only loaded on that page).
const poppinsFont = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export default function LoginPage() {
  return (
    <main className={poppinsFont.className}>
      <LoginPanel />
    </main>
  );
}
