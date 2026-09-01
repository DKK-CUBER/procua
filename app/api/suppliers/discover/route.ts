import { NextRequest, NextResponse } from 'next/server';
import { runSupplierDiscovery, DiscoverRequestInput } from '@/lib/server/discovery/engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const product = typeof body.product === 'string' ? body.product.trim() : '';

    if (!product || product.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_PRODUCT',
          message: 'Please provide a valid product name (at least 2 characters).'
        },
        { status: 400 }
      );
    }

    const input: DiscoverRequestInput = {
      product,
      quantity: typeof body.quantity === 'number' ? body.quantity : 50,
      location: {
        city: body.location?.city || 'Chennai',
        state: body.location?.state || 'Tamil Nadu',
        country: body.location?.country || 'India',
        address: body.location?.address || null
      },
      maxUnitPrice: typeof body.maxUnitPrice === 'number' ? body.maxUnitPrice : undefined,
      requirements: Array.isArray(body.requirements) ? body.requirements : [],
      deliveryDeadline: body.deliveryDeadline || null
    };

    const discoveryResult = await runSupplierDiscovery(input);
    return NextResponse.json(discoveryResult);
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'DISCOVERY_FAILED',
        message: error.message || 'Supplier discovery service encountered an unexpected error.'
      },
      { status: 500 }
    );
  }
}
