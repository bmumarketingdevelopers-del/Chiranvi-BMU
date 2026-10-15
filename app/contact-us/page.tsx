import type { Metadata } from "next";
import { Poppins, Ubuntu } from "next/font/google";
import ContactUsPage from "@/components/contact-us/contact-us-page";

export const metadata: Metadata = {
  title: "Contact Us | Chiranvi Farms",
};

const poppinsFont = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins" });
const ubuntuFont = Ubuntu({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
  variable: "--font-ubuntu",
});

// Contact Us page: opened from "Contact" in the site footer.
export default function ContactUsRoute() {
  return (
    <main className={`${poppinsFont.variable} ${ubuntuFont.variable}`}>
      <ContactUsPage />
    </main>
  );
}
