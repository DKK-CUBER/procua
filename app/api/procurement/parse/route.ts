import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { parseProcurementRequirement } from '@/lib/server/ai/parser';

const parseSchema = z.object({
  requirement: z.string().min(1)
});

export async function POST(request: NextRequest) {
  const { errorResponse } = requireAuth(request, 'PROCUREMENT_EXECUTIVE');
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const parsed = parseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Requirement text is required', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const structured = await parseProcurementRequirement(parsed.data.requirement);
    return NextResponse.json({
      success: true,
      data: structured
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to parse procurement requirement', message: error.message },
      { status: 500 }
    );
  }
}
