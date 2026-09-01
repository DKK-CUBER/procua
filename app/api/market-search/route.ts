import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { searchMarketProducts } from '@/lib/server/services/marketSearch';

const searchSchema = z.object({
  query: z.string().min(2, 'Query must have at least 2 characters'),
  location: z.string().optional(),
  budget: z.number().optional()
});

export async function GET(request: NextRequest) {
  const { errorResponse } = requireAuth(request);
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || searchParams.get('query') || '';
  const location = searchParams.get('location') || searchParams.get('city') || 'Chennai, Tamil Nadu, India';
  const budgetParam = searchParams.get('budget');
  const budget = budgetParam ? parseFloat(budgetParam) : undefined;

  const parsed = searchSchema.safeParse({ query, location, budget });
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'INVALID_QUERY',
        message: 'Please provide a valid search query with at least 2 characters.',
        details: parsed.error.format()
      },
      { status: 400 }
    );
  }

  const result = await searchMarketProducts({
    query: parsed.data.query,
    location: parsed.data.location,
    budget: parsed.data.budget
  });

  if (!result.success && result.error === 'MISSING_API_KEY') {
    return NextResponse.json(result, { status: 503 });
  }

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const { errorResponse } = requireAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const parsed = searchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_QUERY',
          message: 'Please provide a valid query with at least 2 characters.',
          details: parsed.error.format()
        },
        { status: 400 }
      );
    }

    const result = await searchMarketProducts({
      query: parsed.data.query,
      location: parsed.data.location,
      budget: parsed.data.budget
    });

    if (!result.success && result.error === 'MISSING_API_KEY') {
      return NextResponse.json(result, { status: 503 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'REQUEST_ERROR',
        message: 'Invalid request payload.'
      },
      { status: 400 }
    );
  }
}
