export type OrderStatus =
  | "pending"
  | "confirmed"
  | "packed"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type Order = {
  id: string;
  user_id: string;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
};
