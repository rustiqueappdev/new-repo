# Push Notifications Integration Guide

## Overview

The Reroute Admin panel now supports **Firebase Cloud Messaging (FCM)** for sending push notifications to mobile app users. This guide explains how to integrate push notifications in your mobile application (React Native, Flutter, or native iOS/Android).

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Admin Panel    │ creates │ Firebase Cloud   │ sends   │  Mobile App     │
│  (React Web)    ├────────>│ Functions (FCM)  ├────────>│  (iOS/Android)  │
└─────────────────┘         └──────────────────┘         └─────────────────┘
         │                            │                            │
         │                            │                            │
         └────────────────────────────┴────────────────────────────┘
                         Firebase Firestore
                    (stores FCM tokens & messages)
```

## How It Works

1. **Mobile app** requests FCM token when user logs in
2. **Mobile app** saves FCM token to user's Firestore document
3. **Admin** sends message via Communication Center
4. **Cloud Function** automatically triggers and sends push notification
5. **Mobile app** receives notification and displays it

---

## Mobile App Integration

### Option 1: React Native (Recommended)

#### Step 1: Install Dependencies

```bash
npm install @react-native-firebase/app @react-native-firebase/messaging
# or
yarn add @react-native-firebase/app @react-native-firebase/messaging
```

#### Step 2: Configure Firebase

1. Download `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) from Firebase Console
2. Place them in the appropriate directories:
   - Android: `android/app/google-services.json`
   - iOS: `ios/GoogleService-Info.plist`

#### Step 3: Request Permission & Get FCM Token

```javascript
// src/services/notificationService.js
import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';

export const requestNotificationPermission = async (userId) => {
  try {
    // Request permission (iOS will show permission dialog, Android auto-grants)
    const authStatus = await messaging().requestPermission();

    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Notification permission granted');

      // Get FCM token
      const fcmToken = await messaging().getToken();
      console.log('FCM Token:', fcmToken);

      // Save token to Firestore
      await firestore()
        .collection('users')
        .doc(userId)
        .update({
          fcmToken: fcmToken,
          fcmTokenUpdatedAt: firestore.FieldValue.serverTimestamp()
        });

      return fcmToken;
    } else {
      console.log('Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return null;
  }
};

// Handle token refresh
export const setupTokenRefreshListener = (userId) => {
  return messaging().onTokenRefresh(async (newToken) => {
    console.log('FCM token refreshed:', newToken);
    await firestore()
      .collection('users')
      .doc(userId)
      .update({
        fcmToken: newToken,
        fcmTokenUpdatedAt: firestore.FieldValue.serverTimestamp()
      });
  });
};
```

#### Step 4: Handle Notifications

```javascript
// src/services/notificationService.js (continued)

// Handle foreground notifications
export const setupForegroundNotificationHandler = () => {
  return messaging().onMessage(async (remoteMessage) => {
    console.log('Foreground notification received:', remoteMessage);

    // Show in-app notification (using react-native-toast-message or similar)
    Alert.alert(
      remoteMessage.notification?.title || 'Notification',
      remoteMessage.notification?.body || ''
    );
  });
};

// Handle background/quit notifications
export const setupBackgroundNotificationHandler = () => {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('Background notification received:', remoteMessage);
    // Handle background notification (e.g., update badge count, local database)
  });
};

// Handle notification tap (when app opens from notification)
export const setupNotificationOpenHandler = (navigation) => {
  // When app is in background/quit and user taps notification
  messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log('Notification opened app from background:', remoteMessage);

    // Navigate based on notification data
    const { type, bookingId, farmhouseId } = remoteMessage.data || {};

    if (type === 'booking_update' && bookingId) {
      navigation.navigate('BookingDetails', { bookingId });
    } else if (type === 'farmhouse_update' && farmhouseId) {
      navigation.navigate('FarmhouseDetails', { farmhouseId });
    }
  });

  // When app was completely quit and opened via notification
  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        console.log('Notification opened app from quit state:', remoteMessage);
        // Handle initial notification
      }
    });
};
```

#### Step 5: Initialize in App Component

```javascript
// App.js
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import {
  requestNotificationPermission,
  setupTokenRefreshListener,
  setupForegroundNotificationHandler,
  setupBackgroundNotificationHandler,
  setupNotificationOpenHandler
} from './src/services/notificationService';

// Set up background handler outside component
setupBackgroundNotificationHandler();

function App() {
  const navigationRef = React.useRef(null);

  useEffect(() => {
    // When user logs in
    const unsubscribe = auth().onAuthStateChanged(async (user) => {
      if (user) {
        // Request notification permission and save token
        await requestNotificationPermission(user.uid);

        // Set up token refresh listener
        const tokenRefreshUnsubscribe = setupTokenRefreshListener(user.uid);

        // Set up foreground notification handler
        const foregroundUnsubscribe = setupForegroundNotificationHandler();

        // Set up notification tap handler
        setupNotificationOpenHandler(navigationRef);

        return () => {
          tokenRefreshUnsubscribe();
          foregroundUnsubscribe();
        };
      }
    });

    return unsubscribe;
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      {/* Your app navigation */}
    </NavigationContainer>
  );
}

export default App;
```

#### Step 6: iOS Configuration (Additional)

Add the following to `ios/YourApp/AppDelegate.mm`:

```objective-c
#import <Firebase.h>
#import <UserNotifications/UserNotifications.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  // Initialize Firebase
  [FIRApp configure];

  // Request notification authorization
  UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
  [center requestAuthorizationWithOptions:(UNAuthorizationOptionAlert | UNAuthorizationOptionBadge | UNAuthorizationOptionSound)
                        completionHandler:^(BOOL granted, NSError * _Nullable error) {
    if (granted) {
      dispatch_async(dispatch_get_main_queue(), ^{
        [[UIApplication sharedApplication] registerForRemoteNotifications];
      });
    }
  }];

  return YES;
}

@end
```

---

### Option 2: Flutter

#### Step 1: Install Dependencies

```yaml
# pubspec.yaml
dependencies:
  firebase_core: ^2.24.0
  firebase_messaging: ^14.7.6
  cloud_firestore: ^4.13.6
```

#### Step 2: Request Permission & Get Token

```dart
// lib/services/notification_service.dart
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class NotificationService {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Future<void> initialize(String userId) async {
    // Request permission
    NotificationSettings settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      print('Notification permission granted');

      // Get FCM token
      String? token = await _messaging.getToken();
      print('FCM Token: $token');

      // Save to Firestore
      if (token != null) {
        await _firestore.collection('users').doc(userId).update({
          'fcmToken': token,
          'fcmTokenUpdatedAt': FieldValue.serverTimestamp(),
        });
      }

      // Handle foreground messages
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        print('Foreground message: ${message.notification?.title}');
        // Show local notification
      });

      // Handle notification tap
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        print('Notification tapped: ${message.data}');
        // Navigate based on data
      });

      // Handle token refresh
      _messaging.onTokenRefresh.listen((newToken) async {
        await _firestore.collection('users').doc(userId).update({
          'fcmToken': newToken,
          'fcmTokenUpdatedAt': FieldValue.serverTimestamp(),
        });
      });
    }
  }
}

// Background handler (must be top-level function)
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  print('Background message: ${message.notification?.title}');
}

// Initialize in main
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  runApp(MyApp());
}
```

---

### Option 3: Native Android

#### Step 1: Add Firebase SDK

```gradle
// app/build.gradle
dependencies {
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-messaging'
    implementation 'com.google.firebase:firebase-firestore'
}
```

#### Step 2: Create Notification Service

```java
// MyFirebaseMessagingService.java
public class MyFirebaseMessagingService extends FirebaseMessagingService {
    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        // Save token to Firestore
        String userId = FirebaseAuth.getInstance().getCurrentUser().getUid();
        FirebaseFirestore.getInstance()
            .collection("users")
            .document(userId)
            .update("fcmToken", token, "fcmTokenUpdatedAt", FieldValue.serverTimestamp());
    }

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        // Show notification
        sendNotification(remoteMessage.getNotification());
    }
}
```

---

### Option 4: Native iOS

#### Step 1: Configure Capabilities

1. Open Xcode → Signing & Capabilities
2. Add "Push Notifications" capability
3. Add "Background Modes" → Enable "Remote notifications"

#### Step 2: Request Permission

```swift
// AppDelegate.swift
import Firebase
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {

    func application(_ application: UIApplication,
                    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        FirebaseApp.configure()

        UNUserNotificationCenter.current().delegate = self
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            if granted {
                DispatchQueue.main.async {
                    application.registerForRemoteNotifications()
                }
            }
        }

        return true
    }

    func application(_ application: UIApplication,
                    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken

        Messaging.messaging().token { token, error in
            if let token = token {
                // Save to Firestore
                let userId = Auth.auth().currentUser?.uid
                Firestore.firestore().collection("users").document(userId).updateData([
                    "fcmToken": token,
                    "fcmTokenUpdatedAt": FieldValue.serverTimestamp()
                ])
            }
        }
    }
}
```

---

## User Document Structure

Each user document in Firestore must have the following fields:

```typescript
{
  uid: string;              // User ID
  email: string;            // User email
  displayName?: string;     // User display name
  role: 'user' | 'owner' | 'admin';
  fcmToken?: string;        // FCM token for push notifications
  fcmTokenUpdatedAt?: Timestamp;
  // ... other fields
}
```

---

## Notification Types

The Cloud Functions send different notification types:

### 1. Communication Center Messages
- **Trigger**: Admin sends message via Communication Center
- **Data Fields**:
  ```json
  {
    "communicationId": "doc_id",
    "type": "general"
  }
  ```

### 2. Booking Status Updates
- **Trigger**: Booking status or payment status changes
- **Data Fields**:
  ```json
  {
    "bookingId": "doc_id",
    "type": "booking_update",
    "bookingStatus": "confirmed|cancelled|completed",
    "paymentStatus": "paid|failed|refunded"
  }
  ```

### 3. Farmhouse Approval
- **Trigger**: Farmhouse approved/rejected by admin
- **Data Fields**:
  ```json
  {
    "farmhouseId": "doc_id",
    "type": "farmhouse_update",
    "isApproved": "true|false"
  }
  ```

---

## Testing Push Notifications

### Method 1: Test via Admin Panel

1. Open Communication Center in admin panel
2. Select recipient type (e.g., "Specific User")
3. Enter subject and message
4. Click "Send Message"
5. Check mobile app for notification

### Method 2: Test via Firebase Console

1. Go to Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Enter notification text
4. Select target (topic, token, or user segment)
5. Send test message

### Method 3: Test Booking Notifications

1. Change a booking status in Firestore manually
2. Mobile app should receive notification automatically

---

## Troubleshooting

### Issue: Token not saving to Firestore
**Solution**: Check Firestore security rules allow users to update their own documents

```javascript
// firestore.rules
match /users/{userId} {
  allow update: if request.auth != null && request.auth.uid == userId;
}
```

### Issue: Notifications not received on iOS
**Solutions**:
- Ensure APNS certificate is configured in Firebase Console
- Check that app has notification permission
- Verify APNS token is set: `Messaging.messaging().apnsToken`

### Issue: Notifications work in foreground but not background
**Solution**: Implement background message handler (see code samples above)

### Issue: "No FCM tokens found for recipients" in Cloud Function logs
**Solution**: Ensure users have logged in to mobile app and FCM tokens are saved to Firestore

---

## Best Practices

1. **Refresh tokens periodically**: FCM tokens can expire, implement token refresh listener
2. **Handle permission denial gracefully**: Don't block app functionality if notifications are denied
3. **Test on real devices**: iOS simulator doesn't support push notifications
4. **Use notification channels on Android**: Categorize notifications for better user experience
5. **Handle notification tap**: Navigate users to relevant screens when they tap notifications
6. **Update tokens on login**: Always refresh FCM token when user logs in
7. **Clean up old tokens**: Remove FCM token from Firestore when user logs out

---

## Deployment Checklist

- [ ] Firebase Cloud Functions deployed (`firebase deploy --only functions`)
- [ ] Mobile app configured with `google-services.json` / `GoogleService-Info.plist`
- [ ] FCM token saving implemented on login
- [ ] Notification permission request implemented
- [ ] Foreground notification handler implemented
- [ ] Background notification handler implemented
- [ ] Notification tap handler implemented
- [ ] Firestore security rules updated to allow token updates
- [ ] APNS certificate configured (iOS only)
- [ ] Tested on both iOS and Android devices

---

## Additional Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [React Native Firebase Messaging](https://rnfirebase.io/messaging/usage)
- [Flutter Firebase Messaging](https://firebase.flutter.dev/docs/messaging/overview)
- [iOS Push Notification Setup](https://firebase.google.com/docs/cloud-messaging/ios/client)
- [Android Push Notification Setup](https://firebase.google.com/docs/cloud-messaging/android/client)

---

## Need Help?

If you encounter issues:
1. Check Firebase Console logs: Cloud Functions → Logs
2. Check mobile app console logs
3. Verify Firestore documents have correct structure
4. Test with Firebase Cloud Messaging test tool
5. Ensure admin panel Cloud Functions are deployed

**Built with ❤️ for Reroute Admin Panel**
