export type UserRole = 'creator' | 'business' | 'admin' | null;

export type VerificationStatus =
  | 'unverified'
  | 'pending'
  | 'pending_review'
  | 'verified'
  | 'verified_manual'
  | 'verified_oauth'
  | 'rejected'
  | 'resubmission_required'
  | 'deleted';

export type OrderStatus =
  | 'created'
  | 'pending'
  | 'pending_payment'
  | 'escrow_funded'
  | 'in_progress'
  | 'submitted'
  | 'revision_requested'
  | 'disputed'
  | 'completed'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus =
  | 'unpaid'
  | 'pending'
  | 'held_in_escrow'
  | 'released'
  | 'refunded'
  | 'failed';

export type PayoutStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type DisputeStatus =
  | 'open'
  | 'under_review'
  | 'resolved_creator'
  | 'resolved_business'
  | 'closed';

export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'link'
  | 'proposal'
  | 'deal_confirmed'
  | 'status_update'
  | 'system';

export interface Profile {
  id: string;
  role: UserRole;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  city: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatorProfile {
  id: string;
  user_id: string;
  bio: string | null;
  niche: string[] | null;
  follower_count: number | null;
  engagement_rate: number | null;
  location: string | null;
  instagram_profile_url: string | null;
  instagram_username: string | null;
  submitted_reels: string[] | null;
  primary_reel_url: string | null;
  claimed_followers: number | null;
  claimed_engagement_rate: number | null;
  reviewed_follower_count: number | null;
  reviewed_engagement_rate: number | null;
  reviewed_avg_reel_views: number | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  verification_status: VerificationStatus;
  instagram_verified: boolean;
  metrics_source: string | null;
  metrics_verified_at: string | null;
  payout_upi_id: string | null;
  instagram_connected_at: string | null;
  instagram_last_synced_at: string | null;
  instagram_sync_status: string | null;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface BusinessProfile {
  id: string;
  user_id: string;
  business_name: string | null;
  logo_path: string | null;
  website: string | null;
  app_url: string | null;
  description: string | null;
  business_type: string | null;
  industry: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  target_audience: string | null;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface CreatorPackage {
  id: string;
  creator_id: string;
  name: string;
  platform: string;
  deliverables: string[];
  turnaround_days: number;
  revisions_allowed: number;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatorReel {
  id: string;
  creator_id: string;
  title: string | null;
  video_url: string | null;
  reel_url: string | null;
  thumbnail_url: string | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  engagement_rate: number;
  is_featured: boolean;
  is_visible: boolean;
  metrics_source: string;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  product_name: string | null;
  product_url: string | null;
  target_niche: string[] | null;
  target_locations: string[] | null;
  budget: number | null;
  deadline: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  business_profile?: BusinessProfile;
}

export interface Conversation {
  id: string;
  creator_id: string;
  business_id: string;
  campaign_id: string | null;
  last_message_at: string;
  created_at: string;
  creator?: Profile;
  business?: Profile;
  campaign?: Campaign;
  last_message?: Message;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: MessageType;
  metadata: Record<string, any> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  sender?: Profile;
  receiver?: Profile;
}

export interface CollaborationRequest {
  id: string;
  business_user_id: string;
  creator_user_id: string;
  brand_name: string | null;
  offered_price: number | null;
  status: string;
  message: string | null;
  created_at: string;
  updated_at: string;
  business?: Profile;
  creator?: Profile;
}

export interface Order {
  id: string;
  business_id: string;
  creator_id: string;
  proposal_id: string | null;
  campaign_id: string | null;
  package_id: string | null;
  amount: number;
  total_amount: number;
  escrow_amount: number;
  platform_fee: number;
  creator_payout_amount: number;
  turnaround_days: number;
  revisions_allowed: number;
  revisions_used: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payout_status: PayoutStatus;
  deadline: string | null;
  work_started_at: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  auto_approve_at: string | null;
  payout_upi_id: string | null;
  payout_transfer_id: string | null;
  payout_completed_at: string | null;
  created_at: string;
  updated_at: string;
  business?: Profile;
  creator?: Profile;
  creator_profile?: CreatorProfile;
  business_profile?: BusinessProfile;
  brief?: OrderBrief;
  deliveries?: Delivery[];
}

export interface DealProposal {
  id: string;
  conversation_id: string;
  business_id: string;
  creator_id: string;
  created_by: string;
  order_id: string | null;
  title: string;
  deliverables: string[];
  price: number;
  turnaround_days: number;
  revisions_allowed: number;
  status: string;
  created_at: string;
  accepted_at: string | null;
  updated_at: string;
}

export interface OrderBrief {
  id: string;
  order_id: string;
  product_name: string | null;
  product_url: string | null;
  app_download_link: string | null;
  brand_guidelines: string | null;
  key_talking_points: string | null;
  do_points: string | null;
  dont_points: string | null;
  reference_links: string[] | null;
  attachments: any | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Delivery {
  id: string;
  order_id: string;
  creator_id: string;
  version: number;
  video_url: string | null;
  reel_url: string | null;
  caption: string | null;
  notes: string | null;
  attachments: any | null;
  status: string;
  feedback: string | null;
  revision_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  payer_id: string;
  amount: number;
  currency: string;
  provider: string;
  provider_order_id: string | null;
  provider_payment_id: string | null;
  provider_signature: string | null;
  status: string;
  idempotency_key: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  payer?: Profile;
}

export interface Payout {
  id: string;
  order_id: string;
  creator_id: string;
  amount: number;
  currency: string;
  provider: string;
  provider_transfer_id: string | null;
  status: PayoutStatus;
  created_at: string;
  updated_at: string;
  creator?: Profile;
}

export interface Dispute {
  id: string;
  order_id: string;
  raised_by: string;
  reason: string;
  status: DisputeStatus;
  resolution_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
  order?: Order;
  raised_by_user?: Profile;
  resolved_by_admin?: Profile;
}

export interface OrderEvent {
  id: string;
  order_id: string;
  actor_id: string | null;
  event_type: string;
  metadata: Record<string, any> | null;
  created_at: string;
  actor?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  is_read: boolean;
  read_at: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface AdminAction {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string;
  metadata: Record<string, any> | null;
  created_at: string;
  admin?: Profile;
}

export interface InstagramWebhookEvent {
  id: string;
  instagram_user_id: string | null;
  creator_user_id: string | null;
  field: string | null;
  payload: Record<string, any> | null;
  processed: boolean;
  error: string | null;
  received_at: string;
}
