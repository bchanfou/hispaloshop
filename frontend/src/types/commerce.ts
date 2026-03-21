export interface CartItem {
  product_id: string;
  variant_id?: string;
  pack_id?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  producer_id?: string;
  producer_name?: string;
}

export interface ShippingAddress {
  id?: string;
  full_name: string;
  line1: string;
  line2?: string;
  city: string;
  postal_code: string;
  country: string;
  phone?: string;
  is_default?: boolean;
}

export interface Order {
  order_id: string;
  status: string;
  items: CartItem[];
  total: number;
  shipping_address?: ShippingAddress;
  created_at: string;
  customer_name?: string;
}
