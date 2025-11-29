# Reroute Admin - Firebase Cloud Functions

This directory contains Firebase Cloud Functions for the Reroute Admin panel, specifically for handling push notifications via Firebase Cloud Messaging (FCM).

## Functions Overview

### 1. `sendCommunicationNotification`
- **Trigger**: Firestore onCreate on `communications/{communicationId}`
- **Purpose**: Sends push notifications when admins create communications in the Communication Center
- **Features**:
  - Supports sending to all users, specific users, or users with specific roles
  - Handles FCM token retrieval from user documents
  - Updates communication document with delivery status

### 2. `sendBookingStatusNotification`
- **Trigger**: Firestore onUpdate on `bookings/{bookingId}`
- **Purpose**: Notifies users when their booking status or payment status changes
- **Features**:
  - Detects status changes (confirmed, cancelled, completed)
  - Sends appropriate notification based on status
  - Includes booking details in notification data

### 3. `sendFarmhouseStatusNotification`
- **Trigger**: Firestore onUpdate on `farmhouses/{farmhouseId}`
- **Purpose**: Notifies farmhouse owners when their property is approved/rejected
- **Features**:
  - Triggers on approval status change
  - Sends personalized message with farmhouse name
  - Includes farmhouse details in notification data

### 4. `sendManualNotification`
- **Trigger**: HTTP Callable Function
- **Purpose**: Allows admins to manually send push notifications
- **Features**:
  - Authentication and admin role verification
  - Accepts custom title, body, and recipient tokens
  - Returns success/failure counts

## Setup Instructions

### 1. Install Dependencies

```bash
cd functions
npm install
```

### 2. Build Functions

```bash
npm run build
```

### 3. Deploy to Firebase

```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:sendCommunicationNotification
```

### 4. Test Locally with Emulators

```bash
npm run serve
```

## Prerequisites for Mobile App

For push notifications to work, the mobile app needs to:

1. **Register for FCM**: Get FCM token when app launches
2. **Store Token**: Save FCM token to user document in Firestore
3. **Handle Notifications**: Implement notification handlers for foreground/background

### Example Mobile App Integration (React Native)

```javascript
// Install: npm install @react-native-firebase/messaging

import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';

// Request permission and get token
async function registerForPushNotifications(userId) {
  const authStatus = await messaging().requestPermission();

  if (authStatus === messaging.AuthorizationStatus.AUTHORIZED) {
    const fcmToken = await messaging().getToken();

    // Save token to Firestore
    await firestore()
      .collection('users')
      .doc(userId)
      .update({
        fcmToken: fcmToken,
        fcmTokenUpdatedAt: firestore.FieldValue.serverTimestamp()
      });
  }
}

// Handle foreground notifications
messaging().onMessage(async remoteMessage => {
  console.log('Foreground notification:', remoteMessage);
  // Show in-app notification
});

// Handle background notifications
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Background notification:', remoteMessage);
});
```

### User Document Structure

Each user document in Firestore should have:

```typescript
{
  uid: string;
  email: string;
  role: 'user' | 'owner' | 'admin';
  fcmToken?: string;  // FCM token for push notifications
  fcmTokenUpdatedAt?: Timestamp;
  // ... other fields
}
```

## Security

- All functions verify user authentication
- Admin-only functions check for admin role
- FCM tokens are stored securely in Firestore
- Functions use Firebase Admin SDK with elevated permissions

## Monitoring

View function logs:

```bash
# View all logs
firebase functions:log

# View logs for specific function
firebase functions:log --only sendCommunicationNotification
```

## Cost Considerations

- Cloud Functions free tier: 2M invocations/month
- FCM is free for unlimited notifications
- Monitor usage in Firebase Console

## Troubleshooting

### Function not triggering
- Check Firestore triggers match document path exactly
- Verify function is deployed: `firebase functions:list`
- Check logs: `firebase functions:log`

### Notification not received
- Verify user has valid FCM token in Firestore
- Check token is not expired (mobile app should refresh periodically)
- Verify notification payload format
- Check mobile app notification permissions

### Build errors
- Ensure TypeScript version matches: `npm list typescript`
- Clear build cache: `rm -rf lib && npm run build`
- Check for ESLint errors: `npm run lint`
