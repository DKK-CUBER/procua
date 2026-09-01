import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { logAuditEvent } from '@/lib/server/audit';
import { mockShipmentsStore } from '@/lib/server/dataStore';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, errorResponse } = requireAuth(request, 'PROCUREMENT_MANAGER');
  if (errorResponse) return errorResponse;

  const resolvedParams = await params;
  const optionId = resolvedParams.id;

  let matchedOption: any = null;
  let matchedShipment: any = null;

  for (const shp of mockShipmentsStore) {
    const opt = shp.recoveryOptions?.find((o) => o.id === optionId || o.optionCode === optionId);
    if (opt) {
      matchedOption = opt;
      matchedShipment = shp;
      break;
    }
  }

  if (!matchedOption) {
    return NextResponse.json(
      { error: 'Recovery option not found' },
      { status: 404 }
    );
  }

  matchedOption.isApproved = true;
  matchedOption.approvedAt = new Date().toISOString();

  // Adjust shipment delay prediction
  if (matchedOption.delayAvoidedDays > 0) {
    matchedShipment.estimatedDelayDays = Math.max(0, matchedShipment.estimatedDelayDays - matchedOption.delayAvoidedDays);
    matchedShipment.risk = matchedShipment.estimatedDelayDays <= 0.5 ? 'low' : 'medium';
    matchedShipment.riskLevel = matchedShipment.estimatedDelayDays <= 0.5 ? 'LOW' : 'MEDIUM';
  }

  await logAuditEvent({
    businessId: session!.businessId,
    userId: session!.id,
    action: 'APPROVE_RECOVERY_ACTION',
    entityType: 'RecoveryOption',
    entityId: optionId,
    afterData: {
      optionCode: matchedOption.optionCode,
      additionalCost: matchedOption.additionalCost,
      delayAvoidedDays: matchedOption.delayAvoidedDays,
      shipmentId: matchedShipment.id
    }
  });

  return NextResponse.json({
    success: true,
    message: `Recovery action "${matchedOption.title}" approved by buyer.`,
    option: matchedOption,
    shipment: matchedShipment
  });
}
