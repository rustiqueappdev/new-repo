import { useAuth } from '../context/AuthContext';
import { logAuditAction, AuditLogEntry } from '../utils/auditLog';

/**
 * Custom hook for logging audit actions
 * Automatically includes admin UID and email from auth context
 */
export const useAuditLog = () => {
  const { currentUser } = useAuth();

  const log = async (
    action: string,
    entity_type: AuditLogEntry['entity_type'],
    entity_id?: string,
    details?: Record<string, any>
  ) => {
    if (!currentUser) {
      console.warn('Cannot log audit action: No authenticated user');
      return;
    }

    await logAuditAction(
      action,
      entity_type,
      entity_id,
      currentUser.uid,
      currentUser.email || undefined,
      details
    );
  };

  return { log };
};
