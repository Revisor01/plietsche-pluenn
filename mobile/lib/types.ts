export type Role = 'visitor' | 'volunteer' | 'admin';

export interface Item {
  id: string;
  sku: string;
  title: string;
  category: string;
  size: string;
  condition: string;
  photo?: string;
  points: number;
  qr_code: string;
  is_showcase: boolean;
  showcase_position?: number;
  note?: string;
  location?: string;
  stays_external?: boolean;
  status?: 'pending' | 'approved' | 'archived';
  taken_at?: string;
  archived_at?: string;
  created_by?: string;
  created: string;
  collectionId: string;
  collectionName: string;
}

export interface Campaign {
  id: string;
  name: string;
  multiplier: number;
  starts_at: string;
  ends_at: string;
  target_role: string;
  created: string;
}

export interface PointsLog {
  id: string;
  user: string;
  points: number;
  kind: 'checkin' | 'scan' | 'badge' | 'streak' | 'campaign' | 'adjustment';
  label: string;
  ref_id?: string;
  created: string;
}

export type Tier = 'none' | 'bronze' | 'silber' | 'gold' | 'platin';

export interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  trigger_type: string;
  tier_bronze: number;
  tier_silber: number;
  tier_gold: number;
  tier_platin: number;
  reward_bronze: number;
  reward_silber: number;
  reward_gold: number;
  reward_platin: number;
  is_visible: boolean;
}

export interface UserBadge {
  id: string;
  user: string;
  badge: string;
  unlocked_at?: string;
  progress: number;
  current_tier: Tier;
  expand?: { badge?: Badge };
}

export interface Store {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  hours_json: Record<string, string | null>;
  cover_photo?: string;
  geofence_radius_m: number;
}
