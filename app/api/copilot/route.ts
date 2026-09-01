import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handleCopilotQuery } from '@/lib/server/ai/copilot';

const copilotSchema = z.object({
  query: z.string().min(1)
});

export async function POST(request: NextRequest) {
  const { session, errorResponse } = requireAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const parsed = copilotSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Query is required', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const response = await handleCopilotQuery({
      query: parsed.data.query,
      businessId: session!.businessId,
      businessName: session!.businessName
    });

    return NextResponse.json({
      success: true,
      data: response
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Copilot query failed', message: error.message },
      { status: 500 }
    );
  }
}
