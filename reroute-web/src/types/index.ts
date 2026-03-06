// Mirrored from mobile app's types/navigation.ts — web-adapted

export type UserRole = 'customer' | 'owner' | 'admin';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  additionalRoles?: UserRole[];
  createdAt?: any;
  wishlist?: string[];
}

export interface CustomPricing {
  label: string;
  price?: number;
  weeklyDay?: number;
  weeklyNight?: number;
  weekendDay?: number;
  weekendNight?: number;
  occasionalDay?: number;
  occasionalNight?: number;
}

export interface Farmhouse {
  id: string;
  name: string;
  location: string;
  city: string;
  area: string;
  mapLink?: string;
  bedrooms: number;
  capacity: number;
  description?: string;
  weeklyDay: number;
  weeklyNight: number;
  occasionalDay: number;
  occasionalNight: number;
  weekendDay: number;
  weekendNight: number;
  extraGuestPrice?: number;
  customPricing?: CustomPricing[];
  photos: string[];
  photoUrls?: string[];
  amenities: {
    tv?: number | boolean;
    geyser?: number | boolean;
    bonfire?: number | boolean;
    chess?: number | boolean;
    carroms?: number | boolean;
    volleyball?: number | boolean;
    pool?: boolean;
    [key: string]: number | boolean | undefined;
  };
  rules: {
    unmarriedCouples?: boolean;
    pets?: boolean;
    quietHours?: boolean | string;
    [key: string]: boolean | string | undefined;
  };
  ownerId: string;
  status: 'pending' | 'approved' | 'rejected';
  rating?: number;
  reviews?: number;
  bookedDates?: string[];
  blockedDates?: string[];
  createdAt?: any;
  approvedAt?: any;
  updatedAt?: any;
  // Owner contact — stored in Firebase but NEVER shown to customers
  contactPhone1?: string;
  contactPhone2?: string;
  basicDetails?: {
    name?: string; city?: string; area?: string;
    location?: string; mapLink?: string;
    bedrooms?: string; capacity?: string; description?: string;
    contactPhone1?: string; contactPhone2?: string;
  };
}

export type BookingType = 'overnight' | 'dayuse';
export type BookingStatus = 'pending' | 'payment_pending' | 'confirmed' | 'cancelled' | 'completed' | 'draft';
export type PaymentStatus = 'pending' | 'utr_submitted' | 'verified' | 'failed' | 'refunded';

export interface Booking {
  id: string;
  farmhouseId: string;
  farmhouseName: string;
  farmhousePhoto?: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhone?: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  bookingType: BookingType;
  totalPrice: number;
  originalPrice?: number;
  discountApplied?: number;
  couponCode?: string | null;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  utrNumber?: string;
  createdAt?: any;
  updatedAt?: any;
  cancelledAt?: any;
  cancelReason?: string;
}

export interface Review {
  id: string;
  farmhouseId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  date?: string;
  createdAt?: any;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  validFrom?: any;
  validUntil?: any;
  usageLimit?: number;
  usedCount?: number;
  minBookingAmount?: number;
  maxDiscountAmount?: number;
  applicableFor?: 'all' | 'first_booking' | 'specific';
  farmhouseIds?: string[];
  active: boolean;
  description?: string;
}
