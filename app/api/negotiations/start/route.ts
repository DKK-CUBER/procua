import { NextRequest, NextResponse } from 'next/server';
import { startVoiceNegotiation } from '@/lib/server/voice/negotiationQueue';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      procurement_id,
      supplier_ids,
      product_name,
      product,
      quantity,
      target_price,
      max_budget,
      maximum_price,
      delivery_location,
      location,
      buyer_name,
      company_name,
      authorization,
      is_simulation
    } = body;

    if (!supplier_ids || !Array.isArray(supplier_ids) || supplier_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one supplier must be explicitly selected by the buyer.' },
        { status: 400 }
      );
    }

    const result = await startVoiceNegotiation({
      procurementId: procurement_id || 'proc_default_123',
      supplierIds: supplier_ids,
      product: product_name || product || undefined,
      quantity: quantity ? parseInt(quantity) : undefined,
      targetPrice: target_price ? parseInt(target_price) : undefined,
      maximumPrice: (max_budget || maximum_price) ? parseInt(max_budget || maximum_price) : undefined,
      deliveryLocation: delivery_location || location || undefined,
      buyerName: buyer_name || 'Sadwik',
      companyName: company_name || 'Example Technologies',
      authorization: authorization || undefined,
      isSimulation: is_simulation !== undefined ? Boolean(is_simulation) : false
    });

    return NextResponse.json({
      success: true,
      negotiation_id: result.negotiationSessionId,
      status: 'started',
      active_supplier_index: result.activeSupplierIndex,
      total_selected: result.totalSelected,
      queue: result.queue.map((q) => ({
        supplier_id: q.supplierId,
        supplier_name: q.supplierName,
        status: q.status.toLowerCase(),
        negotiation_id: q.negotiationId,
        phone: q.phone,
        business_hours: q.businessHoursStatus
      })),
      authorization: result.authorizationSummary
    });
  } catch (error: any) {
    console.error('[API /negotiations/start Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to start negotiation queue' },
      { status: 400 }
    );
  }
}
