import type { Metadata } from "next";
import OrdersPage from "@/components/account/orders/orders-page";

export const metadata: Metadata = {
  title: "My Orders | Chiranvi Farms",
};

export default function AccountOrdersPage() {
  return <OrdersPage />;
}
