import type { Metadata } from "next";
import ProfileDetailsPage from "@/components/account/profile-details/profile-details-page";

export const metadata: Metadata = {
  title: "My Profile | Chiranvi Farm",
};

export default function AccountProfilePage() {
  return <ProfileDetailsPage />;
}
