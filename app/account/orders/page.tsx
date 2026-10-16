import type { Metadata } from "next";
import OrdersPage from "@/components/account/orders/orders-page";

export const metadata: Metadata = {
  title: "My Orders | Chiranvi Farm",
};

export default function AccountOrdersPage() {
  return <OrdersPage />;
}
