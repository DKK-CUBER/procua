import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { logAuditEvent } from '@/lib/server/audit';
import { reconcileDocuments } from '@/lib/server/ai/reconciliation';
import { mockDocumentsStore, mockPurchaseOrdersStore } from '@/lib/server/dataStore';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, errorResponse } = requireAuth(request, 'PROCUREMENT_EXECUTIVE');
  if (errorResponse) return errorResponse;

  const resolvedParams = await params;
  const id = resolvedParams.id;

  const doc = mockDocumentsStore.find(
    (d) => d.id === id || d.documentNumber?.toLowerCase() === id.toLowerCase() || d.id.includes(id)
  );

  if (!doc) {
    return NextResponse.json(
      { error: 'Document not found' },
      { status: 404 }
    );
  }

  const po = mockPurchaseOrdersStore.find(
    (p) => p.id === doc.purchaseOrderId || p.poNumber === 'PO-1827'
  );

  const poItem = po?.items?.[0] || { unitPrice: 740, quantity: 500, taxRate: 18.0 };
  const ext = doc.extractions?.[0] || {
    extractedUnitPrice: 760,
    extractedQty: 500,
    extractedTax: 18.0,
    extractedSupplier: doc.supplierName
  };

  const report = reconcileDocuments({
    poNumber: po?.poNumber || 'PO-1827',
    poUnitPrice: poItem.unitPrice,
    poQuantity: poItem.quantity,
    poTaxRate: poItem.taxRate,
    poSupplier: po?.supplierName || 'Cobalt Office Systems',
    invoiceNumber: doc.documentNumber,
    invoiceUnitPrice: ext.extractedUnitPrice || 760,
    invoiceQuantity: ext.extractedQty || 500,
    invoiceTaxRate: ext.extractedTax || 18.0,
    invoiceSupplier: ext.extractedSupplier || doc.supplierName
  });

  doc.reconciliationStatus = report.status;
  doc.discrepancyNotes = report.discrepancyReasons.join(' ');

  await logAuditEvent({
    businessId: session!.businessId,
    userId: session!.id,
    action: 'RECONCILE_DOCUMENT',
    entityType: 'Document',
    entityId: doc.id,
    afterData: { status: report.status, variance: report.totalVarianceAmount }
  });

  return NextResponse.json({
    success: true,
    report,
    document: doc
  });
}
