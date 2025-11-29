import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

/**
 * Cloud Function to send push notification when a communication is created
 * Triggered when a new document is added to the 'communications' collection
 */
export const sendCommunicationNotification = functions.firestore
  .document('communications/{communicationId}')
  .onCreate(async (snap, context) => {
    const communication = snap.data();

    try {
      // Get the recipient user's FCM token
      let recipientTokens: string[] = [];

      if (communication.recipientType === 'all_users') {
        // Get all users' FCM tokens
        const usersSnapshot = await admin.firestore().collection('users').get();
        recipientTokens = usersSnapshot.docs
          .map(doc => doc.data().fcmToken)
          .filter(token => token);
      } else if (communication.recipientType === 'specific_user' && communication.recipientId) {
        // Get specific user's FCM token
        const userDoc = await admin.firestore()
          .collection('users')
          .doc(communication.recipientId)
          .get();

        const fcmToken = userDoc.data()?.fcmToken;
        if (fcmToken) {
          recipientTokens.push(fcmToken);
        }
      } else if (communication.recipientType === 'role' && communication.recipientRole) {
        // Get all users with specific role
        const usersSnapshot = await admin.firestore()
          .collection('users')
          .where('role', '==', communication.recipientRole)
          .get();

        recipientTokens = usersSnapshot.docs
          .map(doc => doc.data().fcmToken)
          .filter(token => token);
      }

      if (recipientTokens.length === 0) {
        console.log('No FCM tokens found for recipients');
        return null;
      }

      // Prepare the notification payload
      const payload: admin.messaging.MulticastMessage = {
        tokens: recipientTokens,
        notification: {
          title: communication.title || 'New Message',
          body: communication.message || '',
        },
        data: {
          communicationId: context.params.communicationId,
          type: communication.type || 'general',
          timestamp: new Date().toISOString(),
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'reroute_notifications',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      // Send the notification
      const response = await admin.messaging().sendEachForMulticast(payload);

      console.log(`Successfully sent ${response.successCount} notifications`);
      if (response.failureCount > 0) {
        console.log(`Failed to send ${response.failureCount} notifications`);
      }

      // Update the communication document with delivery status
      await snap.ref.update({
        notificationSent: true,
        notificationSentAt: admin.firestore.FieldValue.serverTimestamp(),
        deliveryStatus: {
          success: response.successCount,
          failure: response.failureCount,
        },
      });

      return response;
    } catch (error) {
      console.error('Error sending notification:', error);

      // Update communication with error status
      await snap.ref.update({
        notificationSent: false,
        notificationError: error instanceof Error ? error.message : 'Unknown error',
      });

      return null;
    }
  });

/**
 * Cloud Function to send notification when booking status changes
 */
export const sendBookingStatusNotification = functions.firestore
  .document('bookings/{bookingId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only send notification if booking status or payment status changed
    if (before.bookingStatus === after.bookingStatus &&
        before.paymentStatus === after.paymentStatus) {
      return null;
    }

    try {
      // Get the user's FCM token
      const userId = after.userId || after.user_id;
      if (!userId) {
        console.log('No user ID found in booking');
        return null;
      }

      const userDoc = await admin.firestore()
        .collection('users')
        .doc(userId)
        .get();

      const fcmToken = userDoc.data()?.fcmToken;
      if (!fcmToken) {
        console.log('No FCM token found for user');
        return null;
      }

      // Determine notification message
      let title = 'Booking Update';
      let body = '';

      if (before.bookingStatus !== after.bookingStatus) {
        switch (after.bookingStatus) {
          case 'confirmed':
            title = 'Booking Confirmed';
            body = 'Your booking has been confirmed!';
            break;
          case 'cancelled':
            title = 'Booking Cancelled';
            body = 'Your booking has been cancelled.';
            break;
          case 'completed':
            title = 'Booking Completed';
            body = 'Thank you for using our service!';
            break;
        }
      } else if (before.paymentStatus !== after.paymentStatus) {
        switch (after.paymentStatus) {
          case 'paid':
            title = 'Payment Successful';
            body = 'Your payment has been received.';
            break;
          case 'failed':
            title = 'Payment Failed';
            body = 'Your payment could not be processed.';
            break;
          case 'refunded':
            title = 'Payment Refunded';
            body = 'Your payment has been refunded.';
            break;
        }
      }

      // Send notification
      const payload: admin.messaging.Message = {
        token: fcmToken,
        notification: {
          title,
          body,
        },
        data: {
          bookingId: context.params.bookingId,
          type: 'booking_update',
          bookingStatus: after.bookingStatus,
          paymentStatus: after.paymentStatus,
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'reroute_notifications',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      await admin.messaging().send(payload);
      console.log('Booking notification sent successfully');

      return true;
    } catch (error) {
      console.error('Error sending booking notification:', error);
      return null;
    }
  });

/**
 * Cloud Function to send notification when farmhouse is approved/rejected
 */
export const sendFarmhouseStatusNotification = functions.firestore
  .document('farmhouses/{farmhouseId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only send notification if approval status changed
    if (before.isApproved === after.isApproved) {
      return null;
    }

    try {
      // Get the owner's FCM token
      const ownerId = after.ownerId || after.owner_id;
      if (!ownerId) {
        console.log('No owner ID found in farmhouse');
        return null;
      }

      const ownerDoc = await admin.firestore()
        .collection('users')
        .doc(ownerId)
        .get();

      const fcmToken = ownerDoc.data()?.fcmToken;
      if (!fcmToken) {
        console.log('No FCM token found for owner');
        return null;
      }

      // Determine notification message
      const farmhouseName = after.name || after.farmhouse_name || 'Your farmhouse';
      const title = after.isApproved ? 'Farmhouse Approved!' : 'Farmhouse Status Update';
      const body = after.isApproved
        ? `${farmhouseName} has been approved and is now live!`
        : `${farmhouseName} status has been updated.`;

      // Send notification
      const payload: admin.messaging.Message = {
        token: fcmToken,
        notification: {
          title,
          body,
        },
        data: {
          farmhouseId: context.params.farmhouseId,
          type: 'farmhouse_update',
          isApproved: String(after.isApproved),
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'reroute_notifications',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      await admin.messaging().send(payload);
      console.log('Farmhouse notification sent successfully');

      return true;
    } catch (error) {
      console.error('Error sending farmhouse notification:', error);
      return null;
    }
  });

/**
 * HTTP Cloud Function to manually send a notification
 * Used for testing or manual notifications
 */
export const sendManualNotification = functions.https.onCall(async (data, context) => {
  // Check if request is made by an authenticated admin
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  // Verify user is admin
  const userDoc = await admin.firestore()
    .collection('users')
    .doc(context.auth.uid)
    .get();

  if (userDoc.data()?.role !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can send notifications'
    );
  }

  const { title, body, tokens, data: notificationData } = data;

  if (!title || !body || !tokens || tokens.length === 0) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing required fields: title, body, or tokens'
    );
  }

  try {
    const payload: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title,
        body,
      },
      data: notificationData || {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'reroute_notifications',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(payload);

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    console.error('Error sending manual notification:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to send notification'
    );
  }
});
