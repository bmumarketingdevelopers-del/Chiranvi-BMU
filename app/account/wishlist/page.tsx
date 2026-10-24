import type { Metadata } from "next";
import WishlistPage from "@/components/account/wishlist/wishlist-page";

export const metadata: Metadata = {
  title: "My Wishlist | Chiranvi Farm",
};

export default function AccountWishlistPage() {
  return <WishlistPage />;
}
