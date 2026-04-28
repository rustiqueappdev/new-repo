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

async function getRecipientsForType(
  recipientType: string,
  recipientId?: string
): Promise<{ tokens: string[]; userIds: string[] }> {
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

  return {
    tokens: filtered.map((u) => getToken(u)).filter((t): t is string => Boolean(t)),
    userIds: filtered.map((u) => u.id),
  };
}

async function saveNotificationsForUsers(
  userIds: string[],
  title: string,
  body: string,
  data: Record<string, string>
): Promise<void> {
  const CHUNK = 499;
  for (let i = 0; i < userIds.length; i += CHUNK) {
    const chunk = userIds.slice(i, i + CHUNK);
    const batch = db.batch();
    for (const userId of chunk) {
      const ref = db.collection('notifications').doc();
      batch.set(ref, {
        userId,
        title,
        body,
        data,
        type: 'promotion',
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }
}

export const sendCommunicationNotification = functions.firestore
  .document('communications/{communicationId}')
  .onCreate(async (snap, context) => {
    const comm = snap.data();
    if (!comm) return null;

    try {
      const { tokens, userIds } = await getRecipientsForType(
        comm.recipientType,
        comm.recipientId
      );

      const notifData = {
        communicationId: context.params.communicationId,
        type: comm.type || 'general',
        timestamp: new Date().toISOString(),
      };

      // Save to Firestore for in-app notification list
      if (userIds.length > 0) {
        await saveNotificationsForUsers(userIds, comm.title || 'New Message', comm.message || '', notifData);
      }

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
        notifData
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

      const notifData = {
        bookingId: context.params.bookingId,
        type: 'booking_update',
        bookingStatus: after.bookingStatus || '',
        paymentStatus: after.paymentStatus || '',
      };

      await messaging.send({
        token: fcmToken,
        notification: { title, body },
        data: notifData,
        android: {
          priority: 'high',
          notification: { sound: 'default', channelId: 'reroute_notifications' },
        },
        apns: { payload: { aps: { sound: 'default', badge: 1 } } },
      });

      await db.collection('notifications').add({
        userId,
        title,
        body,
        data: notifData,
        type: 'booking',
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
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

export const notifyAdminOnOwnerUpdate = functions.firestore
  .document('farmhouses/{farmhouseId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    const statusChanged = before.status !== after.status;
    if (statusChanged) return null;

    const ownerId = after.ownerId || after.owner_id;
    if (!ownerId) return null;

    try {
      const ownerDoc = await db.collection('users').doc(ownerId).get();
      const ownerData = ownerDoc.data();
      if (!ownerData || ownerData.role === 'admin') return null;

      const changedFields: string[] = [];
      const checkNested = (
        path: string,
        beforeObj: Record<string, unknown> | undefined,
        afterObj: Record<string, unknown> | undefined
      ) => {
        if (!beforeObj && !afterObj) return;
        if (!beforeObj || !afterObj) {
          changedFields.push(path);
          return;
        }
        const allKeys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);
        for (const key of allKeys) {
          if (JSON.stringify(beforeObj[key]) !== JSON.stringify(afterObj[key])) {
            changedFields.push(`${path}.${key}`);
          }
        }
      };

      checkNested('basicDetails', before.basicDetails, after.basicDetails);
      checkNested('pricing', before.pricing, after.pricing);
      checkNested('amenities', before.amenities, after.amenities);
      checkNested('rules', before.rules, after.rules);
      checkNested('kyc', before.kyc, after.kyc);

      if (JSON.stringify(before.photoUrls) !== JSON.stringify(after.photoUrls)) {
        changedFields.push('photos');
      }

      if (changedFields.length === 0) return null;

      const farmhouseName =
        after.basicDetails?.name || after.name || 'Unnamed farmhouse';
      const ownerName = ownerData.name || ownerData.displayName || 'Owner';

      const sectionLabels: Record<string, string> = {
        basicDetails: 'basic details',
        pricing: 'pricing',
        amenities: 'amenities',
        rules: 'rules',
        kyc: 'KYC/bank details',
        photos: 'photos',
      };
      const sections = [...new Set(changedFields.map((f) => f.split('.')[0]))];
      const readableSections = sections
        .map((s) => sectionLabels[s] || s)
        .join(', ');

      await db.collection('admin_notifications').add({
        type: 'farmhouse_updated',
        farmhouse_id: context.params.farmhouseId,
        farmhouse_name: farmhouseName,
        message: `${ownerName} updated ${readableSections} for ${farmhouseName}`,
        updated_by: ownerId,
        updated_by_name: ownerName,
        changed_fields: changedFields,
        read: false,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(
        `Admin notification created: owner ${ownerId} updated farmhouse ${context.params.farmhouseId}`
      );
      return true;
    } catch (error) {
      console.error('Error creating admin notification for owner update:', error);
      return null;
    }
  });

export const getAdminNotifications = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  if (userDoc.data()?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can access notifications');
  }

  try {
    const snap = await db.collection('admin_notifications')
      .orderBy('created_at', 'desc')
      .limit(20)
      .get();

    const notifications = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      created_at: d.data().created_at?.toMillis() || null,
    }));

    return { notifications };
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    throw new functions.https.HttpsError('internal', 'Failed to fetch notifications');
  }
});

export const manageAdminNotifications = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  if (userDoc.data()?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can manage notifications');
  }

  const { action } = data;

  try {
    if (action === 'mark_all_read') {
      const unreadSnap = await db.collection('admin_notifications')
        .where('read', '==', false)
        .get();
      const batch = db.batch();
      unreadSnap.docs.forEach((d) => batch.update(d.ref, { read: true }));
      await batch.commit();
      return { success: true, updated: unreadSnap.size };
    }

    if (action === 'clear_all') {
      const allSnap = await db.collection('admin_notifications').get();
      const batch = db.batch();
      allSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      return { success: true, deleted: allSnap.size };
    }

    throw new functions.https.HttpsError('invalid-argument', 'Invalid action');
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    console.error('Error managing admin notifications:', error);
    throw new functions.https.HttpsError('internal', 'Failed to manage notifications');
  }
});

export const getReviews = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  if (userDoc.data()?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can access reviews');
  }

  try {
    const farmhousesSnap = await db.collection('farmhouses').get();

    const allReviews: Array<Record<string, unknown>> = [];
    const userIds = new Set<string>();

    for (const farmDoc of farmhousesSnap.docs) {
      const farmData = farmDoc.data();
      const farmhouseName = farmData.basicDetails?.name || farmData.name || 'Unknown Farmhouse';
      const farmhouseId = farmDoc.id;

      const reviewsSnap = await db
        .collection('farmhouses')
        .doc(farmhouseId)
        .collection('reviews')
        .get();

      for (const revDoc of reviewsSnap.docs) {
        const revData = revDoc.data();
        const userId = revData.userId || revData.user_id || '';
        if (userId) userIds.add(userId);

        allReviews.push({
          review_id: revDoc.id,
          farmhouseId,
          farmhouseName,
          userId,
          rating: revData.rating || 0,
          comment: revData.comment || revData.review || revData.text || '',
          createdAt: revData.createdAt?.toMillis?.() ||
            revData.created_at?.toMillis?.() ||
            revData.timestamp?.toMillis?.() || null,
        });
      }
    }

    const userMap: Record<string, { name: string; email: string }> = {};
    for (const uid of userIds) {
      try {
        const uDoc = await db.collection('users').doc(uid).get();
        if (uDoc.exists) {
          const u = uDoc.data() || {};
          userMap[uid] = {
            name: u.name || u.displayName || 'Unknown User',
            email: u.email || '',
          };
        }
      } catch (e) {
        console.log('Could not fetch user:', uid, e);
      }
    }

    const reviews = allReviews.map((r) => ({
      ...r,
      userName: userMap[r.userId as string]?.name || 'Unknown User',
      userEmail: userMap[r.userId as string]?.email || '',
    }));

    return { reviews };
  } catch (error) {
    console.error('Error fetching reviews:', error);
    throw new functions.https.HttpsError('internal', 'Failed to fetch reviews');
  }
});

export const deleteReview = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  if (userDoc.data()?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can delete reviews');
  }

  const { reviewId, farmhouseId } = data;
  if (!reviewId || !farmhouseId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing reviewId or farmhouseId');
  }

  try {
    await db
      .collection('farmhouses')
      .doc(farmhouseId)
      .collection('reviews')
      .doc(reviewId)
      .delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting review:', error);
    throw new functions.https.HttpsError('internal', 'Failed to delete review');
  }
});

export const getReviewDetails = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const authDoc = await db.collection('users').doc(context.auth.uid).get();
  if (authDoc.data()?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can access review details');
  }

  const { userId, farmhouseId } = data;

  try {
    let userDetails = null;
    if (userId) {
      const uDoc = await db.collection('users').doc(userId).get();
      if (uDoc.exists) {
        const u = uDoc.data() || {};
        userDetails = {
          name: u.name || u.displayName || 'N/A',
          email: u.email || 'N/A',
          phone: u.phone || u.phoneNumber || 'N/A',
        };
      }
    }

    let farmhouseDetails = null;
    if (farmhouseId) {
      const fDoc = await db.collection('farmhouses').doc(farmhouseId).get();
      if (fDoc.exists) {
        const f = fDoc.data() || {};
        farmhouseDetails = {
          basicDetails: {
            name: f.basicDetails?.name || f.name || 'N/A',
            locationText: f.basicDetails?.locationText || f.location || 'N/A',
          },
          status: f.status || 'N/A',
        };
      }
    }

    return { userDetails, farmhouseDetails };
  } catch (error) {
    console.error('Error fetching review details:', error);
    throw new functions.https.HttpsError('internal', 'Failed to fetch review details');
  }
});

export const getRefunds = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  if (userDoc.data()?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can access refunds');
  }

  try {
    const refundsSnap = await db.collection('refunds').get();
    const refunds: Array<Record<string, unknown>> = [];
    const bookingIds = new Set<string>();
    const userIds = new Set<string>();

    for (const refDoc of refundsSnap.docs) {
      const d = refDoc.data();
      const bookingId = d.bookingId || d.booking_id || '';
      const userId = d.userId || d.user_id || '';
      if (bookingId) bookingIds.add(bookingId);
      if (userId) userIds.add(userId);

      refunds.push({
        id: refDoc.id,
        refundId: d.refundId || d.refund_id || '',
        bookingId,
        paymentId: d.paymentId || d.payment_id || '',
        userId,
        amount: d.amount || 0,
        reason: d.reason || '',
        status: d.status || 'unknown',
        createdAt: d.createdAt?.toMillis?.() ||
          d.created_at?.toMillis?.() || null,
        updatedAt: d.updatedAt?.toMillis?.() ||
          d.updated_at?.toMillis?.() || null,
      });
    }

    const bookingMap: Record<string, Record<string, unknown>> = {};
    for (const bid of bookingIds) {
      try {
        const bDoc = await db.collection('bookings').doc(bid).get();
        if (bDoc.exists) {
          const b = bDoc.data() || {};
          bookingMap[bid] = {
            farmhouseName: b.farmhouseName || b.farmhouse_name || '',
            farmhouseId: b.farmhouseId || b.farmhouse_id || '',
            userName: b.userName || b.user_name || '',
            userEmail: b.userEmail || b.user_email || '',
            userPhone: b.userPhone || b.user_phone || '',
            checkInDate: b.checkInDate || b.check_in_date || '',
            checkOutDate: b.checkOutDate || b.check_out_date || '',
            totalPrice: b.totalPrice || b.total_price || 0,
            originalPrice: b.originalPrice || b.original_price || 0,
            bookingStatus: b.bookingStatus || b.booking_status || b.status || '',
            refundPercentage: b.refundPercentage || b.refund_percentage || 0,
            refundAmount: b.refundAmount || b.refund_amount || 0,
            refundDate: b.refundDate || b.refund_date || '',
            refundStatus: b.refundStatus || b.refund_status || '',
            cancelledAt: b.cancelledAt?.toMillis?.() ||
              b.cancelled_at?.toMillis?.() || null,
          };
        }
      } catch (e) {
        console.log('Could not fetch booking:', bid, e);
      }
    }

    const userMap: Record<string, Record<string, string>> = {};
    for (const uid of userIds) {
      if (bookingMap[uid]) continue;
      try {
        const uDoc = await db.collection('users').doc(uid).get();
        if (uDoc.exists) {
          const u = uDoc.data() || {};
          userMap[uid] = {
            name: u.name || u.displayName || '',
            email: u.email || '',
            phone: u.phone || u.phoneNumber || '',
          };
        }
      } catch (e) {
        console.log('Could not fetch user:', uid, e);
      }
    }

    const enriched = refunds.map((r) => {
      const booking = bookingMap[r.bookingId as string] || {};
      const user = userMap[r.userId as string] || {};
      return {
        ...r,
        farmhouseName: booking.farmhouseName || '',
        farmhouseId: booking.farmhouseId || '',
        userName: booking.userName || user.name || '',
        userEmail: booking.userEmail || user.email || '',
        userPhone: booking.userPhone || user.phone || '',
        checkInDate: booking.checkInDate || '',
        checkOutDate: booking.checkOutDate || '',
        totalPrice: booking.totalPrice || 0,
        originalPrice: booking.originalPrice || 0,
        bookingStatus: booking.bookingStatus || '',
        refundPercentage: booking.refundPercentage || 0,
        bookingRefundAmount: booking.refundAmount || 0,
        refundDate: booking.refundDate || '',
        bookingRefundStatus: booking.refundStatus || '',
        cancelledAt: booking.cancelledAt || null,
      };
    });

    return { refunds: enriched };
  } catch (error) {
    console.error('Error fetching refunds:', error);
    throw new functions.https.HttpsError('internal', 'Failed to fetch refunds');
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
