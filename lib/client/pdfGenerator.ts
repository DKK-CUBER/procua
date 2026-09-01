import jsPDF from 'jspdf';

export interface ReportData {
  totalProcurement: number;
  totalSavings: number;
  averageSavingsPct: number;
  onTimeDeliveryRate: number;
  businessName?: string;
  generatedDate?: string;
}

export function generateExecutivePdfReport(data?: ReportData) {
  if (typeof window !== 'undefined') {
    // 1. Trigger direct browser download via official HTTP attachment endpoint
    const downloadUrl = '/api/pdf/report';
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `Procura_Executive_Procurement_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) document.body.removeChild(link);
    }, 1500);
  }
}

export function generatePurchaseOrderPdf(po: any) {
  if (typeof window !== 'undefined') {
    const poId = po?.id || po?.poNumber || 'PO-1827';
    const supplier = encodeURIComponent(po?.supplierName || 'Vendor');
    const product = encodeURIComponent(po?.product || po?.items?.[0]?.itemName || '500 ergonomic office chairs');
    const total = encodeURIComponent(String(po?.totalAmount || po?.subtotal || 370000));
    const qty = encodeURIComponent(String(po?.items?.[0]?.quantity || po?.quantity || 500));
    const unitPrice = encodeURIComponent(String(po?.items?.[0]?.unitPrice || po?.unitPrice || 740));

    // 1. Trigger direct browser download via official HTTP attachment endpoint
    const downloadUrl = `/api/pdf/purchase-order?id=${encodeURIComponent(poId)}&supplier=${supplier}&product=${product}&total=${total}&qty=${qty}&unitPrice=${unitPrice}`;
    const cleanSupplier = (po?.supplierName || 'Vendor').replace(/[^a-zA-Z0-9]/g, '_');
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${poId}_${cleanSupplier}.pdf`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) document.body.removeChild(link);
    }, 1500);
  }
}
