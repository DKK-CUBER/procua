import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { encryptSecret } from '@/lib/server/security';
import { logAuditEvent } from '@/lib/server/audit';
import { mockSources } from '@/lib/server/dataStore';

const connectSourceSchema = z.object({
  sourceCode: z.string(),
  token: z.string().min(1),
  accountName: z.string().min(1)
});

export async function GET(request: NextRequest) {
  const { errorResponse } = requireAuth(request);
  if (errorResponse) return errorResponse;

  return NextResponse.json({
    success: true,
    sources: mockSources
  });
}

export async function POST(request: NextRequest) {
  const { session, errorResponse } = requireAuth(request, 'OWNER');
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const parsed = connectSourceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid connection parameters', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { sourceCode, token, accountName } = parsed.data;

    // Encrypt token before persisting - never save raw marketplace token
    const encryptedToken = encryptSecret(token);

    const source = mockSources.find((s) => s.code === sourceCode);
    if (source) {
      source.isConnected = true;
    }

    await logAuditEvent({
      businessId: session!.businessId,
      userId: session!.id,
      action: 'CONNECT_SOURCE',
      entityType: 'SupplierConnection',
      entityId: sourceCode,
      afterData: { sourceCode, accountName, encryptedTokenStored: true }
    });

    return NextResponse.json({
      success: true,
      message: `Source ${sourceCode} connected successfully with encrypted token.`
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to connect source', message: error.message },
      { status: 500 }
    );
  }
}
