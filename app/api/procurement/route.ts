import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { logAuditEvent } from '@/lib/server/audit';
import { ProcurementRequest } from '@/lib/types';
import { mockRequestsStore } from '@/lib/server/dataStore';

const createRequestSchema = z.object({
  title: z.string().min(2),
  rawRequirement: z.string().optional(),
  productCategory: z.string().default('Furniture & Office'),
  quantity: z.number().int().positive(),
  budget: z.number().positive().optional(),
  targetUnitPrice: z.number().positive().optional(),
  maxUnitPrice: z.number().positive().optional(),
  deliveryLocation: z.string().min(2),
  deliveryDeadline: z.string().min(1),
  allowPartial: z.boolean().default(false)
});

export async function GET(request: NextRequest) {
  const { session, errorResponse } = requireAuth(request);
  if (errorResponse) return errorResponse;

  return NextResponse.json({
    success: true,
    data: mockRequestsStore
  });
}

export async function POST(request: NextRequest) {
  const { session, errorResponse } = requireAuth(request, 'PROCUREMENT_EXECUTIVE');
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const parsed = createRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const newReqId = 'req-' + Date.now().toString(36);
    const newReq: ProcurementRequest = {
      id: newReqId,
      businessId: session?.businessId,
      referenceNumber: `REQ-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      title: d.title,
      rawRequirement: d.rawRequirement,
      productCategory: d.productCategory,
      quantity: d.quantity,
      budget: d.budget || (d.targetUnitPrice ? d.targetUnitPrice * d.quantity : undefined),
      targetUnitPrice: d.targetUnitPrice,
      maxUnitPrice: d.maxUnitPrice,
      deliveryLocation: d.deliveryLocation,
      deadline: d.deliveryDeadline,
      deliveryDeadline: d.deliveryDeadline,
      allowPartial: d.allowPartial,
      status: 'searching',
      whyExplanation: 'Active search across ONDC and connected supplier networks.',
      createdAt: new Date().toISOString()
    };

    mockRequestsStore.unshift(newReq);

    await logAuditEvent({
      businessId: session!.businessId,
      userId: session!.id,
      action: 'CREATE_PROCUREMENT_REQUEST',
      entityType: 'ProcurementRequest',
      entityId: newReqId,
      afterData: newReq
    });

    return NextResponse.json({
      success: true,
      data: newReq
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to create procurement request', message: error.message },
      { status: 500 }
    );
  }
}
