# ReRoute Admin Panel

Admin console for the **ReRoute** farmhouse rental platform. A web dashboard where administrators can oversee all platform activities — managing farmhouses, users, bookings, payments, KYC verification, reviews, and communications.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 18 + TypeScript |
| **UI Library** | Material UI (MUI) 7 |
| **Routing** | React Router v7 |
| **Backend/DB** | Firebase (Auth, Firestore, Storage) |
| **Charts** | Recharts |
| **Encryption** | crypto-js (AES-256 decryption for sensitive bank data) |
| **Build Tool** | Create React App (Webpack) |

## Project Structure

```
src/
├── App.tsx                  # Routes & MUI theme configuration
├── index.tsx                # Entry point
├── config/
│   └── firebase.ts          # Firebase initialization
├── context/
│   ├── AuthContext.tsx       # Admin-only authentication + splash screen
│   ├── PendingCountContext.tsx # Real-time pending approval counts
│   └── SnackbarContext.tsx   # Global toast notifications
├── hooks/
│   ├── useAuditLog.ts       # Audit trail logging hook
│   └── useDashboardStats.ts # Dashboard statistics aggregation
├── components/
│   ├── common/              # SplashScreen, PrivateRoute, ErrorBoundary, LoadingSkeleton, EmptyState
│   ├── layout/              # MainLayout, Sidebar, Header
│   ├── farmhouse/           # FarmhouseDetailModal, ApprovalDialog
│   └── user/                # UserDialog
├── pages/
│   ├── auth/Login.tsx
│   ├── dashboard/           # Dashboard, RevenueDashboard, AnalyticsDashboard
│   ├── farmhouse/           # FarmhouseApprovals, AllFarmhouses
│   ├── booking/BookingsManagement.tsx
│   ├── coupon/CouponsManagement.tsx
│   ├── user/UsersManagement.tsx
│   ├── kyc/KYCManagement.tsx
│   ├── payment/PaymentsCommission.tsx
│   ├── ReviewManagement.tsx
│   └── CommunicationCenter.tsx
├── types/
│   └── index.ts             # Interfaces (User, Farmhouse, Booking, Coupon, etc.)
└── utils/
    ├── auditLog.ts          # Audit action constants & logger
    └── decryption.ts        # AES-256 decryption for encrypted bank details
```

## Data Flow

```
Firebase Firestore (Cloud DB)
        │
        ▼
  React Context Layer
  ├── AuthContext ──── Firebase Auth (admin-only login)
  ├── PendingCountContext ──── Real-time listeners (onSnapshot)
  └── SnackbarContext ──── UI notifications
        │
        ▼
  Pages (fetch via getDocs/onSnapshot)
  ├── Read: Firestore collections (users, farmhouses, bookings, coupons, reviews, communications)
  ├── Write: updateDoc/addDoc for approvals, edits, cancellations
  └── Decrypt: Bank details (accountNumber, ifscCode) via AES-256
        │
        ▼
  UI Components (MUI)
```

**Key data collections in Firestore:**
- `users` — All platform users (guests, owners, admins) with KYC data
- `farmhouses` — Property listings with details, pricing, photos, amenities, and owner KYC/bank info
- `bookings` — Reservation records with payment status and audit trails
- `coupons` — Discount codes with usage tracking
- `reviews` — User ratings and feedback
- `communications` — Push notification history

**Encryption:** The mobile app encrypts sensitive bank details (account number, IFSC code) using AES-256 with user-specific keys derived from `SHA256(userId + ENCRYPTION_SECRET)`. The admin panel decrypts these on-the-fly for display using the same secret.

## Admin Features

- **Dashboard** — Overview stats, recent bookings, quick actions
- **Farmhouse Management** — Approve/reject listings, view details, set commission rates
- **User Management** — View all users, filter by role, manage accounts
- **Booking Management** — View, edit, cancel, refund bookings
- **KYC Verification** — Review owner identity documents, approve/reject KYC
- **Payments & Commission** — Track platform earnings and owner payouts
- **Revenue & Analytics** — Charts for revenue trends, booking patterns, user growth
- **Reviews** — Moderate user reviews
- **Communications** — Send push notifications to users/owners

## Setup

1. Clone the repo and install dependencies:
   ```bash
   cd reroute-admin
   npm install
   ```

2. Create a `.env` file with Firebase config and encryption secret:
   ```env
   REACT_APP_FIREBASE_API_KEY=your_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id
   REACT_APP_ENCRYPTION_SECRET=your_encryption_secret_min_32_chars
   ```

3. Run the dev server:
   ```bash
   npm start
   ```
   Opens at [http://localhost:3000](http://localhost:3000).

4. Build for production:
   ```bash
   npm run build
   ```
