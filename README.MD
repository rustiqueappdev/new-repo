# ReRoute Admin Panel

Admin dashboard for the **ReRoute** farmhouse & resort rental platform. Built with React, TypeScript, and Firebase.

**Live:** [rustique-6b7c4.web.app](https://rustique-6b7c4.web.app/)

---

## Features

- **Dashboard & Analytics** — Real-time stats, revenue trends, booking breakdowns, and user growth charts (powered by Recharts)
- **Property Management** — Review, approve, or reject farmhouse/resort listings with a verification checklist and commission setup
- **Booking Management** — View and manage all bookings with date filters, status tracking, and payment details
- **Payments & Refunds** — Track commissions per farmhouse, process refunds with Razorpay integration
- **User Management** — Manage guests, owners, and admins with role-based access and KYC verification
- **Coupon Engine** — Create and manage discount codes (percentage or fixed), with usage limits and validity periods
- **Review Moderation** — Monitor and moderate user reviews and ratings
- **Communication Center** — Send targeted push notifications to users/owners via Firebase Cloud Messaging
- **Audit Trail** — Every admin action is logged with timestamps and admin details
- **Security** — AES-256 encryption for sensitive bank/KYC data, admin-only Firebase Auth

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Material UI v7 |
| Backend | Firebase (Auth, Firestore, Storage, Cloud Functions) |
| Payments | Razorpay API |
| Charts | Recharts |
| Forms | React Hook Form + Yup |
| Data Tables | Material React Table |
| Notifications | Firebase Cloud Messaging (FCM) |

## Project Structure

```
reroute-admin/
├── src/
│   ├── components/       # Layout, farmhouse, user, and common components
│   ├── config/           # Firebase configuration
│   ├── context/          # Auth, Snackbar, PendingCount contexts
│   ├── hooks/            # Audit logging, dashboard stats
│   ├── pages/            # All page components (dashboard, bookings, users, etc.)
│   ├── types/            # TypeScript interfaces and helper functions
│   └── utils/            # AES-256 decryption, audit logging
├── functions/            # Firebase Cloud Functions (notification triggers)
├── firebase.json
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase CLI (`npm install -g firebase-tools`)

### Setup

```bash
cd reroute-admin
npm install
```

Create a `.env` file in `reroute-admin/`:

```env
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_ENCRYPTION_SECRET=your_encryption_secret
```

### Run

```bash
npm start
```

### Deploy

```bash
npm run build
firebase deploy
```

### Cloud Functions

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

## Cloud Functions

| Function | Trigger | Purpose |
|---|---|---|
| `sendCommunicationNotification` | Firestore onCreate | Sends push notifications when admin creates a communication |
| `sendBookingStatusNotification` | Firestore onUpdate | Notifies users on booking status changes |
| `sendFarmhouseStatusNotification` | Firestore onUpdate | Notifies owners when property is approved/rejected |
| `sendManualNotification` | HTTP Callable | Admin-triggered custom push notifications |

## License

Private — All rights reserved.
