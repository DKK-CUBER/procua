import { db } from '@/lib/db';

export interface AuditEventParams {
  businessId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeData?: any;
  afterData?: any;
  sourceIp?: string;
}

/**
 * Enterprise Audit Trail Logger
 * Records immutable timeline of who changed what, when, before & after states.
 */
export async function logAuditEvent(params: AuditEventParams) {
  try {
    await db.auditLog.create({
      data: {
        businessId: params.businessId,
        userId: params.userId || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        details: JSON.stringify({ before: params.beforeData, after: params.afterData }),
        ipAddress: params.sourceIp || '127.0.0.1'
      }
    });
  } catch (error) {
    console.error('[AUDIT LOG FAILED]', error);
  }
}
