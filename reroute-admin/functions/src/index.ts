import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

interface UserRecord {
  id: string;
  fcmToken?: string;
  fcm_token?: string;
  pushToken?: string;
  deviceToken?: string;
  role?: string;
  is_active?: boolean;
}

async function sendToTokens(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string>
): Promise<{ successCount: number; failureCount: number }> {
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500);
    const response = await messaging.sendEachForMulticast({
      tokens: batch,
      notification: { title, body },
      data,
      android: {
        priority: 'high',
        notification: { sound: 'default', channelId: 'reroute_notifications' },
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
      },
    });
    successCount += response.successCount;
    failureCount += response.failureCount;
  }

  return { successCount, failureCount };
}

function getToken(u: UserRecord): string | undefined {
  return u.fcmToken || u.fcm_token || u.pushToken || u.deviceToken;
}

async function getTokensForRecipientType(
  recipientType: string,
  recipientId?: string
): Promise<string[]> {
  const usersSnap = await db.collection('users').get();
  const allUsers: UserRecord[] = usersSnap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<UserRecord, 'id'>),
  }));

  let filtered: UserRecord[];

  switch (recipientType) {
  case 'all_users':
    filtered = allUsers;
    break;

  case 'active_users':
    filtered = allUsers.filter((u) => u.is_active === true);
    break;

  case 'all_owners':
    filtered = allUsers.filter((u) => u.role === 'owner');
    break;

  case 'farmhouse_owners': {
    const farmhousesSnap = await db.collection('farmhouses').get();
    const ownerIds = new Set(
      farmhousesSnap.docs
        .map((d) => d.data().ownerId || d.data().owner_id)
        .filter(Boolean)
    );
    filtered = allUsers.filter((u) => ownerIds.has(u.id));
    break;
  }

  case 'specific_user':
    filtered = recipientId ? allUsers.filter((u) => u.id === recipientId) : [];
    break;

  case 'role':
    filtered = allUsers.filter((u) => u.role === recipientId);
    break;

  default:
    filtered = [];
  }

  return filtered
    .map((u) => getToken(u))
    .filter((t): t is string => Boolean(t));
}

export const sendCommunicationNotification = functions.firestore
  .document('communications/{communicationId}')
  .onCreate(async (snap, context) => {
    const comm = snap.data();
    if (!comm) return null;

    try {
      const tokens = await getTokensForRecipientType(
        comm.recipientType,
        comm.recipientId
      );

      if (tokens.length === 0) {
        console.log(`No FCM tokens for recipientType: ${comm.recipientType}`);
        await snap.ref.update({
          notificationSent: false,
          notificationError: `No FCM tokens found for recipient type: ${comm.recipientType}`,
        });
        return null;
      }

      const { successCount, failureCount } = await sendToTokens(
        tokens,
        comm.title || 'New Message',
        comm.message || '',
        {
          communicationId: context.params.communicationId,
          type: comm.type || 'general',
          timestamp: new Date().toISOString(),
        }
      );

      console.log(`Sent ${successCount} notifications, ${failureCount} failed`);

      await snap.ref.update({
        notificationSent: true,
        notificationSentAt: admin.firestore.FieldValue.serverTimestamp(),
        deliveryStatus: { success: successCount, failure: failureCount },
      });

      return { successCount, failureCount };
    } catch (error) {
      console.error('Error sending communication notification:', error);
      await snap.ref.update({
        notificationSent: false,
        notificationError: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  });

export const sendBookingStatusNotification = functions.firestore
  .document('bookings/{bookingId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (
      before.bookingStatus === after.bookingStatus &&
      before.paymentStatus === after.paymentStatus
    ) {
      return null;
    }

    try {
      const userId = after.userId || after.user_id;
      if (!userId) return null;

      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data() as UserRecord | undefined;
      const fcmToken = userData ? getToken(userData) : undefined;
      if (!fcmToken) return null;

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

      if (!body) return null;

      await messaging.send({
        token: fcmToken,
        notification: { title, body },
        data: {
          bookingId: context.params.bookingId,
          type: 'booking_update',
          bookingStatus: after.bookingStatus || '',
          paymentStatus: after.paymentStatus || '',
        },
        android: {
          priority: 'high',
          notification: { sound: 'default', channelId: 'reroute_notifications' },
        },
        apns: { payload: { aps: { sound: 'default', badge: 1 } } },
      });

      return true;
    } catch (error) {
      console.error('Error sending booking notification:', error);
      return null;
    }
  });

export const sendFarmhouseStatusNotification = functions.firestore
  .document('farmhouses/{farmhouseId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    const statusChanged = before.status !== after.status;
    const isApprovedChanged = before.isApproved !== after.isApproved;
    if (!statusChanged && !isApprovedChanged) return null;

    const isNowApproved = after.status === 'approved' || after.isApproved === true;
    const isNowRejected = after.status === 'rejected';
    if (!isNowApproved && !isNowRejected) return null;

    try {
      const ownerId = after.ownerId || after.owner_id;
      if (!ownerId) return null;

      const ownerDoc = await db.collection('users').doc(ownerId).get();
      const ownerData = ownerDoc.data() as UserRecord | undefined;
      const fcmToken = ownerData ? getToken(ownerData) : undefined;
      if (!fcmToken) return null;

      const farmhouseName =
        after.basicDetails?.name || after.name || after.farmhouse_name || 'Your farmhouse';

      const title = isNowApproved ? 'Farmhouse Approved!' : 'Farmhouse Rejected';
      const body = isNowApproved ?
        `${farmhouseName} has been approved and is now live!` :
        `${farmhouseName} was not approved. Contact support for details.`;

      await messaging.send({
        token: fcmToken,
        notification: { title, body },
        data: {
          farmhouseId: context.params.farmhouseId,
          type: 'farmhouse_update',
          status: after.status || '',
        },
        android: {
          priority: 'high',
          notification: { sound: 'default', channelId: 'reroute_notifications' },
        },
        apns: { payload: { aps: { sound: 'default', badge: 1 } } },
      });

      return true;
    } catch (error) {
      console.error('Error sending farmhouse notification:', error);
      return null;
    }
  });

export const sendManualNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  if (userDoc.data()?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can send notifications');
  }

  const { title, body, tokens, data: notificationData } = data;
  if (!title || !body || !tokens || tokens.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }

  try {
    const result = await sendToTokens(tokens, title, body, notificationData || {});
    return { success: true, ...result };
  } catch (error) {
    console.error('Error sending manual notification:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send notification');
  }
});
