// ---------------------------------------------------------------------------
// HispaloShop — Shared API Types
// ---------------------------------------------------------------------------

/** User roles in the platform */
export type UserRole = 'customer' | 'producer' | 'influencer' | 'admin' | 'importer';

/** Core user object returned by /auth/me and embedded in other entities */
export interface User {
  id: string;
  user_id?: string;
  email: string;
  full_name: string;
  username?: string;
  name?: string;
  bio?: string;
  role: UserRole;
  avatar_url?: string;
  profile_image?: string;
  is_active?: boolean;
  is_verified?: boolean;
  country?: string;
  language?: string;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  has_story?: boolean;
  created_at?: string;
}

/** Product as returned by /products and embedded in posts/orders */
export interface Product {
  id: string;
  product_id?: string;
  name: string;
  description?: string;
  price: number;
  original_price?: number;
  currency?: string;
  display_price?: number;
  display_currency?: string;
  image_url?: string;
  images?: string[];
  category?: string;
  producer_id?: string;
  producer_name?: string;
  store_name?: string;
  stock?: number;
  market_stock?: number;
  track_stock?: boolean;
  available_in_country?: boolean;
  average_rating?: number;
  rating?: number;
  reviews_count?: number;
  is_organic?: boolean;
  is_vegan?: boolean;
  is_gluten_free?: boolean;
  certifications?: Array<{ name: string; id?: string }>;
  allergens?: string[];
  created_at?: string;
}

/** Embedded user in posts/reels */
export interface PostUser {
  id: string;
  user_id?: string;
  name: string;
  username?: string;
  avatar_url?: string;
  avatar?: string;
  profile_image?: string;
  is_verified?: boolean;
  has_story?: boolean;
}

/** Post as returned by feed endpoints */
export interface Post {
  id: string;
  user_id?: string;
  user?: PostUser;
  caption?: string;
  content?: string;
  image_url?: string;
  images?: string[];
  media?: Array<string | { url: string; type?: string }>;
  location?: string;
  likes_count?: number;
  likes?: number;
  comments_count?: number;
  comments?: number;
  is_liked?: boolean;
  liked?: boolean;
  is_saved?: boolean;
  saved?: boolean;
  is_edited?: boolean;
  edited?: boolean;
  products?: Product[];
  productTag?: Product;
  liked_by_sample?: Array<{ name: string; id: string }>;
  liked_by?: Array<{ name: string; id: string }>;
  created_at?: string;
  timestamp?: string;
}

/** Reel as returned by /reels */
export interface Reel {
  id: string;
  user_id?: string;
  user?: PostUser;
  video_url: string;
  thumbnail_url?: string;
  caption?: string;
  likes_count?: number;
  comments_count?: number;
  views_count?: number;
  is_liked?: boolean;
  is_saved?: boolean;
  duration?: number;
  products?: Product[];
  created_at?: string;
}

/** Story as returned by /stories */
export interface Story {
  id: string;
  user_id: string;
  user?: PostUser;
  media_url: string;
  media_type?: 'image' | 'video';
  caption?: string;
  stickers?: unknown[];
  views_count?: number;
  reactions?: Record<string, number>;
  expires_at?: string;
  created_at?: string;
}

/** Order as returned by /orders */
export interface Order {
  id: string;
  order_id?: string;
  status: 'pending' | 'paid' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  items: OrderItem[];
  total: number;
  subtotal?: number;
  shipping_cost?: number;
  discount_cents?: number;
  coupon_code?: string;
  shipping_address?: ShippingAddress;
  payment_method?: string;
  producer_id?: string;
  customer_id?: string;
  tracking_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OrderItem {
  product_id: string;
  product_name?: string;
  name?: string;
  quantity: number;
  price: number;
  variant_id?: string;
  pack_id?: string;
  image?: string;
}

export interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
  phone?: string;
}

/** Cart item as stored in CartContext */
export interface CartItem {
  product_id: string;
  variant_id?: string;
  pack_id?: string;
  quantity: number;
  name?: string;
  price?: number;
  image?: string;
  producer_id?: string;
  producer_name?: string;
}

/** Store / producer store profile */
export interface Store {
  id: string;
  store_id?: string;
  name: string;
  slug?: string;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  owner_id?: string;
  country?: string;
  city?: string;
  is_verified?: boolean;
  products_count?: number;
  followers_count?: number;
  rating?: number;
  certifications?: Array<{ name: string; id?: string }>;
  created_at?: string;
}

/** Recipe as returned by /recipes */
export interface Recipe {
  id: string;
  user_id?: string;
  user?: PostUser;
  title: string;
  description?: string;
  image_url?: string;
  ingredients?: string[];
  steps?: string[];
  prep_time?: number;
  cook_time?: number;
  servings?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  products?: Product[];
  likes_count?: number;
  comments_count?: number;
  is_liked?: boolean;
  is_saved?: boolean;
  created_at?: string;
}

/** Normalized API error shape (matches client.js normalizeApiError) */
export interface ApiError {
  name: 'ApiClientError';
  message: string;
  status: number;
  code: string | null;
  data: unknown;
}

/** Generic paginated response envelope */
export interface PaginatedResponse<T> {
  items: T[];
  total?: number;
  page?: number;
  limit?: number;
  has_more?: boolean;
  next_cursor?: string | null;
}
