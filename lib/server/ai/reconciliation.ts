export interface ReconciliationInput {
  poNumber: string;
  poUnitPrice: number;
  poQuantity: number;
  poTaxRate: number;
  poSupplier: string;
  invoiceNumber?: string;
  invoiceUnitPrice?: number;
  invoiceQuantity?: number;
  invoiceTaxRate?: number;
  invoiceSupplier?: string;
}

export interface ReconciliationReport {
  status: 'VERIFIED' | 'MISMATCH' | 'DISPUTED';
  hasMismatch: boolean;
  totalVarianceAmount: number;
  discrepancyReasons: string[];
  fieldDiffs: {
    field: string;
    poValue: string | number;
    invoiceValue: string | number;
    difference: string;
  }[];
}

/**
 * Enterprise Document Reconciliation Engine
 * Automatically compares PO vs. Invoice vs. Quotation data points.
 */
export function reconcileDocuments(input: ReconciliationInput): ReconciliationReport {
  const discrepancyReasons: string[] = [];
  const fieldDiffs: ReconciliationReport['fieldDiffs'] = [];
  let totalVariance = 0;

  // 1. Supplier Mismatch
  if (input.invoiceSupplier && input.invoiceSupplier.toLowerCase() !== input.poSupplier.toLowerCase()) {
    discrepancyReasons.push(`Supplier name mismatch: PO references "${input.poSupplier}" but Invoice is from "${input.invoiceSupplier}".`);
    fieldDiffs.push({
      field: 'Supplier',
      poValue: input.poSupplier,
      invoiceValue: input.invoiceSupplier,
      difference: 'Entity mismatch'
    });
  }

  // 2. Quantity Mismatch
  if (input.invoiceQuantity !== undefined && input.invoiceQuantity !== input.poQuantity) {
    const diffQty = input.invoiceQuantity - input.poQuantity;
    discrepancyReasons.push(`Quantity mismatch: PO has ${input.poQuantity} units, Invoice billed for ${input.invoiceQuantity} units.`);
    fieldDiffs.push({
      field: 'Quantity',
      poValue: `${input.poQuantity} units`,
      invoiceValue: `${input.invoiceQuantity} units`,
      difference: `${diffQty > 0 ? '+' : ''}${diffQty} units`
    });
  }

  // 3. Price Mismatch
  if (input.invoiceUnitPrice !== undefined && input.invoiceUnitPrice !== input.poUnitPrice) {
    const diffPrice = input.invoiceUnitPrice - input.poUnitPrice;
    const billedQty = input.invoiceQuantity || input.poQuantity;
    const varianceAmount = diffPrice * billedQty;
    totalVariance += varianceAmount;

    discrepancyReasons.push(`Price mismatch detected: PO unit price is ₹${input.poUnitPrice}, Invoice unit price is ₹${input.invoiceUnitPrice} (₹${Math.abs(varianceAmount)} total difference).`);
    fieldDiffs.push({
      field: 'Unit Price',
      poValue: `₹${input.poUnitPrice}`,
      invoiceValue: `₹${input.invoiceUnitPrice}`,
      difference: `${diffPrice > 0 ? '+' : ''}₹${diffPrice}/unit`
    });
  }

  // 4. Tax Rate Mismatch
  if (input.invoiceTaxRate !== undefined && input.invoiceTaxRate !== input.poTaxRate) {
    discrepancyReasons.push(`Tax rate variance: PO expected ${input.poTaxRate}% GST, Invoice applied ${input.invoiceTaxRate}% GST.`);
    fieldDiffs.push({
      field: 'Tax Rate',
      poValue: `${input.poTaxRate}%`,
      invoiceValue: `${input.invoiceTaxRate}%`,
      difference: `${input.invoiceTaxRate - input.poTaxRate}%`
    });
  }

  const hasMismatch = discrepancyReasons.length > 0;
  return {
    status: hasMismatch ? 'MISMATCH' : 'VERIFIED',
    hasMismatch,
    totalVarianceAmount: totalVariance,
    discrepancyReasons,
    fieldDiffs
  };
}
