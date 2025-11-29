import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface AuditLogEntry {
  action: string;
  entity_type: 'farmhouse' | 'user' | 'booking' | 'coupon' | 'review' | 'payment' | 'communication';
  entity_id?: string;
  admin_uid: string;
  admin_email?: string;
  details?: Record<string, any>;
  timestamp: any;
  ip_address?: string;
}

/**
 * Log an admin action to the audit trail
 * @param action - Description of the action (e.g., "approved_farmhouse", "deleted_review")
 * @param entity_type - Type of entity being acted upon
 * @param entity_id - ID of the specific entity
 * @param admin_uid - UID of the admin performing the action
 * @param admin_email - Email of the admin
 * @param details - Additional details about the action
 */
export const logAuditAction = async (
  action: string,
  entity_type: AuditLogEntry['entity_type'],
  entity_id: string | undefined,
  admin_uid: string,
  admin_email?: string,
  details?: Record<string, any>
): Promise<void> => {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      action,
      entity_type,
      entity_id: entity_id || null,
      admin_uid,
      admin_email: admin_email || null,
      details: details || null,
      timestamp: serverTimestamp(),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    });
  } catch (error) {
    console.error('Failed to log audit action:', error);
    // Don't throw - audit logging should not break the app
  }
};

// Predefined audit action types for consistency
export const AuditActions = {
  // Farmhouse actions
  APPROVE_FARMHOUSE: 'approved_farmhouse',
  REJECT_FARMHOUSE: 'rejected_farmhouse',
  UPDATE_FARMHOUSE: 'updated_farmhouse',
  DELETE_FARMHOUSE: 'deleted_farmhouse',
  UPDATE_COMMISSION: 'updated_commission',

  // User actions
  CREATE_USER: 'created_user',
  UPDATE_USER: 'updated_user',
  DELETE_USER: 'deleted_user',
  CHANGE_USER_ROLE: 'changed_user_role',
  ACTIVATE_USER: 'activated_user',
  DEACTIVATE_USER: 'deactivated_user',
  APPROVE_KYC: 'approved_kyc',
  REJECT_KYC: 'rejected_kyc',

  // Booking actions
  UPDATE_BOOKING: 'updated_booking',
  CANCEL_BOOKING: 'cancelled_booking',
  REFUND_BOOKING: 'refunded_booking',

  // Coupon actions
  CREATE_COUPON: 'created_coupon',
  UPDATE_COUPON: 'updated_coupon',
  DELETE_COUPON: 'deleted_coupon',
  ACTIVATE_COUPON: 'activated_coupon',
  DEACTIVATE_COUPON: 'deactivated_coupon',

  // Review actions
  DELETE_REVIEW: 'deleted_review',
  FLAG_REVIEW: 'flagged_review',
  UNFLAG_REVIEW: 'unflagged_review',

  // Payment actions
  MARK_COMMISSION_PAID: 'marked_commission_paid',
  UPDATE_PAYMENT_STATUS: 'updated_payment_status',

  // Communication actions
  SEND_NOTIFICATION: 'sent_notification',
  SEND_BROADCAST: 'sent_broadcast',
} as const;
