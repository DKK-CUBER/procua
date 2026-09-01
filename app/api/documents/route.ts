import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { logAuditEvent } from '@/lib/server/audit';
import { DocumentDTO } from '@/lib/types';
import { mockDocumentsStore, mockPurchaseOrdersStore } from '@/lib/server/dataStore';
import { reconcileDocuments } from '@/lib/server/ai/reconciliation';

const uploadDocSchema = z.object({
  documentType: z.enum([
    'PURCHASE_ORDER',
    'QUOTATION',
    'INVOICE',
    'LORRY_RECEIPT',
    'EWAY_BILL',
    'PACKING_LIST',
    'DELIVERY_RECEIPT',
    'OTHER'
  ]),
  documentNumber: z.string().optional(),
  fileName: z.string().min(1),
  purchaseOrderId: z.string().optional(),
  supplierId: z.string().optional(),
  extractedUnitPrice: z.number().optional(),
  extractedQty: z.number().optional(),
  extractedTax: z.number().optional(),
  extractedSupplier: z.string().optional()
});

export async function GET(request: NextRequest) {
  const { errorResponse } = requireAuth(request);
  if (errorResponse) return errorResponse;

  return NextResponse.json({
    success: true,
    data: mockDocumentsStore
  });
}

export async function POST(request: NextRequest) {
  const { session, errorResponse } = requireAuth(request, 'PROCUREMENT_EXECUTIVE');
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const parsed = uploadDocSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid document upload metadata', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const docId = 'doc-' + Date.now().toString(36);
    const poNumber = d.purchaseOrderId || 'PO-1827';
    const supplierName = d.extractedSupplier || 'Cobalt Office Systems';

    // Simulated / Vision OCR extraction engine
    const unitPrice = d.extractedUnitPrice ?? (d.documentType === 'INVOICE' ? 760 : 740);
    const qty = d.extractedQty ?? 500;
    const taxRate = d.extractedTax ?? 18.0;
    const docNum = d.documentNumber || (d.documentType === 'INVOICE' ? `INV-${Math.floor(1800 + Math.random() * 100)}` : `DOC-${Math.floor(1000 + Math.random() * 9000)}`);
    const totalAmount = Math.round(unitPrice * qty * (1 + taxRate / 100));

    // Find PO to run automatic reconciliation
    const matchingPo = mockPurchaseOrdersStore.find(
      (p) => p.poNumber === poNumber || p.id === poNumber
    ) || mockPurchaseOrdersStore[0];

    const poUnitPrice = matchingPo?.items?.[0]?.unitPrice || 740;
    const poQty = matchingPo?.items?.[0]?.quantity || 500;
    const poTax = matchingPo?.items?.[0]?.taxRate || 18.0;

    const reconReport = reconcileDocuments({
      poNumber: matchingPo?.poNumber || 'PO-1827',
      poUnitPrice,
      poQuantity: poQty,
      poTaxRate: poTax,
      poSupplier: matchingPo?.supplierName || 'Cobalt Office Systems',
      invoiceNumber: docNum,
      invoiceUnitPrice: unitPrice,
      invoiceQuantity: qty,
      invoiceTaxRate: taxRate,
      invoiceSupplier: supplierName
    });

    const newDoc: DocumentDTO = {
      id: docId,
      businessId: session!.businessId,
      purchaseOrderId: matchingPo?.id || 'po-1827',
      supplierId: d.supplierId || 'cobalt',
      supplierName,
      documentType: d.documentType,
      documentNumber: docNum,
      fileName: d.fileName,
      fileSizeBytes: Math.floor(120000 + Math.random() * 150000),
      mimeType: 'application/pdf',
      reconciliationStatus: reconReport.status,
      discrepancyNotes: reconReport.discrepancyReasons.join(' '),
      extractions: [
        {
          id: `ext-${Date.now()}`,
          extractedPoNumber: poNumber,
          extractedInvoiceNumber: docNum,
          extractedDate: new Date().toISOString().split('T')[0],
          extractedSupplier: supplierName,
          extractedQty: qty,
          extractedUnitPrice: unitPrice,
          extractedTax: taxRate,
          extractedTotal: totalAmount,
          confidenceScore: 0.985,
          varianceDetected: reconReport.hasMismatch,
          varianceSummary: reconReport.discrepancyReasons.join(' ') || 'All fields match Purchase Order specifications.'
        }
      ],
      uploadedAt: new Date().toISOString()
    };

    mockDocumentsStore.unshift(newDoc);

    await logAuditEvent({
      businessId: session!.businessId,
      userId: session!.id,
      action: 'UPLOAD_AND_OCR_DOCUMENT',
      entityType: 'Document',
      entityId: docId,
      afterData: {
        documentNumber: docNum,
        documentType: d.documentType,
        reconciliationStatus: reconReport.status,
        varianceAmount: reconReport.totalVarianceAmount
      }
    });

    return NextResponse.json({
      success: true,
      data: newDoc,
      reconciliationReport: reconReport
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Document upload and OCR extraction failed', message: error.message },
      { status: 500 }
    );
  }
}
