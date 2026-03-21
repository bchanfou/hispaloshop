export type UserRole = 'consumer' | 'producer' | 'influencer' | 'importer' | 'admin' | 'super_admin';

export interface UserProfile {
  user_id: string;
  username: string;
  name?: string;
  full_name?: string;
  email: string;
  roles: UserRole[];
  avatar_url?: string;
  profile_image?: string;
  bio?: string;
  website?: string;
  social_links?: { instagram?: string; tiktok?: string; youtube?: string };
  follower_count?: number;
  following_count?: number;
  post_count?: number;
  is_verified?: boolean;
  country?: string;
  onboarding_completed?: boolean;
  xp?: number;
  streak_days?: number;
}
