export interface User {
  user_id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'user' | 'owner' | 'admin';
  kyc_status?: 'pending' | 'approved' | 'rejected';
  is_active: boolean;
  created_at: any;
  owner_kyc?: OwnerKYC;
}

export interface OwnerKYC {
  person1_name: string;
  person1_phone: string;
  person1_aadhaar_url: string;
  person2_name: string;
  person2_phone: string;
  person2_aadhaar_url: string;
  company_pan_url: string;
  labour_licence_url: string;
  status: 'pending' | 'approved' | 'rejected';
}

// ✅ UPDATED: Matches mobile app structure
export interface Farmhouse {
  farmhouse_id: string;
  ownerId: string; // Mobile app uses ownerId, not owner_id
  
  // Basic details nested in mobile app
  basicDetails?: {
    name: string;
    description: string;
    locationText: string;
    city: string;
    area: string;
    capacity: string; // Mobile app stores as string
    bedrooms: string; // Mobile app stores as string
    contactPhone1: string;
    contactPhone2: string | null;
    mapLink: string | null;
  };
  
  // Pricing nested in mobile app
  pricing?: {
    weekendDay: string;
    weekendNight: string;
    weeklyDay: string;
    weeklyNight: string;
    occasionalDay: string;
    occasionalNight: string;
    customPricing?: any[];
  };
  
  // Photos array
  photoUrls?: string[];
  
  // Amenities map
  amenities?: {
    bonfire: number;
    carroms: number;
    chess: number;
    geyser: number;
    pool: boolean;
    tv: number;
    volleyball: number;
    customAmenities: any;
  };
  
  // Rules map
  rules?: {
    petsNotAllowed: boolean;
    unmarriedNotAllowed: boolean;
    quietHours: string | null;
    customRules: string | null;
  };
  
  // KYC map
  kyc?: {
    agreedToTerms: boolean;
    panNumber: string;
    companyPANUrl: string | null;
    labourDocUrl: string | null;
    person1: {
      name: string;
      phone: string;
      aadhaarNumber: string;
      aadhaarFrontUrl: string | null;
      aadhaarBackUrl: string | null;
    };
    person2: {
      name: string | null;
      phone: string | null;
      aadhaarNumber: string | null;
      aadhaarFrontUrl: string | null;
      aadhaarBackUrl: string | null;
    };
    bankDetails: {
      accountNumber: string;
      ifscCode: string;
      accountHolderName: string;
      branchName: string;
    };
  };
  
  status: 'pending' | 'approved' | 'rejected' | 'pending_approval' | 'active';
  commission_percentage?: number;
  approved_by?: string;
  approved_at?: any;
  rejection_reason?: string;
  created_at: any;
  
  // Legacy fields for backward compatibility
  name?: string;
  location?: string;
  description?: string;
  images?: string[];
  max_guests?: number;
  base_rate?: number;
  weekend_rate?: number;
  owner_id?: string;
}

export interface Booking {
  booking_id: string;
  user_id: string;
  farmhouse_id: string;
  owner_id: string;
  start_date: any;
  end_date: any;
  guest_count: number;
  total_amount: number;
  discount_amount: number;
  payment_status: 'pending' | 'paid' | 'refunded';
  status: 'confirmed' | 'cancelled' | 'completed';
  commission_amount: number;
  commission_paid_to_owner: boolean;
  created_at: any;
  coupon_code?: string;
}

export interface Coupon {
  coupon_id: string;
  code: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  valid_from: any;
  valid_until: any;
  max_uses: number;
  current_uses: number;
  is_active: boolean;
  min_booking_amount?: number;
  description?: string;
  created_at: any;
}

export interface CouponUsage {
  user_id: string;
  coupon_id: string;
  booking_id: string;
  discount_applied: number;
  used_at: any;
}

export interface DashboardStats {
  totalFarmhouses: number;
  pendingFarmhouses: number;
  totalUsers: number;
  totalBookings: number;
  activeCoupons: number;
  todayBookings: number;
  weekBookings: number;
  monthBookings: number;
}

// Helper function to get name from farmhouse (works with both structures)
export function getFarmhouseName(farmhouse: Farmhouse): string {
  return farmhouse.basicDetails?.name || farmhouse.name || 'Unnamed Property';
}

// Helper function to get location from farmhouse
export function getFarmhouseLocation(farmhouse: Farmhouse): string {
  if (farmhouse.basicDetails) {
    const city = farmhouse.basicDetails.city || '';
    const area = farmhouse.basicDetails.area || '';
    return `${area}, ${city}`.trim().replace(/^,\s*/, '').replace(/,\s*$/, '') || 'Location not specified';
  }
  return farmhouse.location || 'Location not specified';
}

// Helper function to get description
export function getFarmhouseDescription(farmhouse: Farmhouse): string {
  return farmhouse.basicDetails?.description || farmhouse.description || 'No description available';
}

// Helper function to get images
export function getFarmhouseImages(farmhouse: Farmhouse): string[] {
  return farmhouse.photoUrls || farmhouse.images || [];
}

// Helper function to get capacity/max guests
export function getFarmhouseCapacity(farmhouse: Farmhouse): number {
  if (farmhouse.basicDetails?.capacity) {
    return parseInt(farmhouse.basicDetails.capacity) || 0;
  }
  return farmhouse.max_guests || 0;
}

// Helper function to get base rate
export function getFarmhouseBaseRate(farmhouse: Farmhouse): number {
  if (farmhouse.pricing?.weeklyDay) {
    return parseInt(farmhouse.pricing.weeklyDay) || 0;
  }
  return farmhouse.base_rate || 0;
}

// Helper function to get weekend rate
export function getFarmhouseWeekendRate(farmhouse: Farmhouse): number {
  if (farmhouse.pricing?.weekendNight) {
    return parseInt(farmhouse.pricing.weekendNight) || 0;
  }
  return farmhouse.weekend_rate || 0;
}

// Helper function to get amenities as array
export function getFarmhouseAmenities(farmhouse: Farmhouse): string[] {
  const amenities: string[] = [];
  
  if (farmhouse.amenities) {
    if (farmhouse.amenities.pool) amenities.push('Swimming Pool');
    if (farmhouse.amenities.bonfire && farmhouse.amenities.bonfire > 0) amenities.push('Bonfire');
    if (farmhouse.amenities.tv && farmhouse.amenities.tv > 0) amenities.push('TV');
    if (farmhouse.amenities.geyser && farmhouse.amenities.geyser > 0) amenities.push('Geyser');
    if (farmhouse.amenities.carroms && farmhouse.amenities.carroms > 0) amenities.push('Carrom Board');
    if (farmhouse.amenities.chess && farmhouse.amenities.chess > 0) amenities.push('Chess');
    if (farmhouse.amenities.volleyball && farmhouse.amenities.volleyball > 0) amenities.push('Volleyball');
  }
  
  return amenities;
}

// Helper function to get rules as array
export function getFarmhouseRules(farmhouse: Farmhouse): string[] {
  const rules: string[] = [];
  
  if (farmhouse.rules) {
    if (farmhouse.rules.petsNotAllowed) rules.push('No Pets Allowed');
    if (farmhouse.rules.unmarriedNotAllowed) rules.push('Unmarried Couples Not Allowed');
    if (farmhouse.rules.quietHours) rules.push(`Quiet Hours: ${farmhouse.rules.quietHours}`);
    if (farmhouse.rules.customRules) rules.push(farmhouse.rules.customRules);
  }
  
  return rules;
}

// Helper function to get owner ID
export function getFarmhouseOwnerId(farmhouse: Farmhouse): string {
  return farmhouse.ownerId || farmhouse.owner_id || '';
}