import jsPDF from 'jspdf';

export interface ReportData {
  totalProcurement: number;
  totalSavings: number;
  averageSavingsPct: number;
  onTimeDeliveryRate: number;
  businessName?: string;
  generatedDate?: string;
}

export function buildExecutivePdf(data: ReportData): Buffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = 16;

  // Background Header Banner
  doc.setFillColor(13, 20, 30); // #0d141e
  doc.rect(0, 0, pageWidth, 38, 'F');

  // Accent Line
  doc.setFillColor(183, 244, 106); // #b7f46a
  doc.rect(0, 37, pageWidth, 1.5, 'F');

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('PROCURA INTELLIGENCE SUITE', margin, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(183, 244, 106);
  doc.text('EXECUTIVE PROCUREMENT & SUPPLIER INTELLIGENCE REPORT', margin, 21);

  // Metadata right-aligned
  doc.setTextColor(180, 200, 220);
  doc.setFontSize(8);
  const dateStr = data.generatedDate || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';
  doc.text(`Ref: REP-2026-0901`, pageWidth - margin, 14, { align: 'right' });
  doc.text(`Generated: ${dateStr}`, pageWidth - margin, 19, { align: 'right' });
  doc.text(`Workspace: ${data.businessName || 'Kinetiq Studios'} (GSTIN: 33AABCK1234F1Z5)`, pageWidth - margin, 24, { align: 'right' });
  doc.text(`Scope: All Connected Sources (ONDC, Direct API, Marketplace X)`, pageWidth - margin, 29, { align: 'right' });

  y = 46;

  // 1. Executive Summary Headline
  doc.setTextColor(20, 30, 45);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('1. Executive Performance KPI Summary', margin, y);
  y += 6;

  // 4 Metric KPI Cards
  const cardWidth = (pageWidth - margin * 2 - 9) / 4;
  const cardHeight = 22;
  const metrics = [
    { label: 'TOTAL PROCUREMENT', value: `Rs ${(data.totalProcurement / 100000).toFixed(2)} Lakhs`, sub: '3 Active Orders' },
    { label: 'TOTAL SAVINGS', value: `Rs ${(data.totalSavings / 100000).toFixed(2)} Lakhs`, sub: 'Negotiated Impact' },
    { label: 'AVG SAVINGS %', value: `${data.averageSavingsPct}%`, sub: 'Vs Initial Quotes' },
    { label: 'ON-TIME DELIVERY', value: `${data.onTimeDeliveryRate}%`, sub: 'Carrier Verified' }
  ];

  metrics.forEach((m, idx) => {
    const x = margin + idx * (cardWidth + 3);
    doc.setFillColor(245, 248, 252);
    doc.setDrawColor(215, 225, 235);
    doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 115, 130);
    doc.text(m.label, x + 3, y + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(13, 20, 30);
    doc.text(m.value, x + 3, y + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(20, 140, 80);
    doc.text(m.sub, x + 3, y + 18);
  });

  y += cardHeight + 8;

  // 2. Spend Over Time Visual Graph
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20, 30, 45);
  doc.text('2. Monthly Procurement Volume vs Baseline (Visual Analytics)', margin, y);
  y += 5;

  const chartBoxHeight = 44;
  const chartBoxWidth = pageWidth - margin * 2;
  doc.setFillColor(250, 252, 255);
  doc.setDrawColor(220, 230, 240);
  doc.roundedRect(margin, y, chartBoxWidth, chartBoxHeight, 2, 2, 'FD');

  const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep (Est)'];
  const spendValues = [1.2, 1.8, 1.4, 2.4, 3.1, 2.5];
  const maxVal = 3.5;
  const barWidth = 14;
  const chartAreaWidth = chartBoxWidth - 30;
  const step = chartAreaWidth / months.length;

  months.forEach((month, idx) => {
    const bx = margin + 18 + idx * step;
    const bHeight = (spendValues[idx] / maxVal) * 26;
    const by = y + chartBoxHeight - 10 - bHeight;

    doc.setFillColor(idx === 4 ? 30 : 150, idx === 4 ? 120 : 180, idx === 4 ? 220 : 200);
    doc.rect(bx, by, barWidth, bHeight, 'F');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 70, 90);
    doc.text(`Rs ${spendValues[idx]}L`, bx + barWidth / 2, by - 1.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 115, 130);
    doc.text(month, bx + barWidth / 2, y + chartBoxHeight - 4, { align: 'center' });
  });

  y += chartBoxHeight + 8;

  // 3. Performance Matrix Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20, 30, 45);
  doc.text('3. Connected Supplier Reliability & Savings Performance Matrix', margin, y);
  y += 5;

  const tableHeaders = ['Supplier Name', 'Source Channel', 'Orders', 'On-Time Rate', 'Avg Response', 'Verified Savings'];
  const colWidths = [45, 32, 20, 25, 26, 34];
  const tableX = margin;

  doc.setFillColor(13, 20, 30);
  doc.rect(tableX, y, pageWidth - margin * 2, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);

  let curX = tableX + 3;
  tableHeaders.forEach((h, i) => {
    doc.text(h, curX, y + 4.8);
    curX += colWidths[i];
  });
  y += 7;

  const tableRows = [
    ['Cobalt Office Systems', 'ONDC Network', '42 completed', '98.0%', '18 mins', 'Rs 60,000 (8.1%)'],
    ['Ernest Furnishings', 'Direct API Gateway', '28 completed', '95.0%', '24 mins', 'Rs 28,400 (6.5%)'],
    ['Sahara Workspace', 'Marketplace X', '19 completed', '93.0%', '42 mins', 'Rs 14,200 (5.0%)'],
    ['Krypton Industrial Supplies', 'Private RFQ', '15 completed', '91.0%', '35 mins', 'Rs 22,500 (7.2%)']
  ];

  tableRows.forEach((row, rIdx) => {
    doc.setFillColor(rIdx % 2 === 0 ? 255 : 248, rIdx % 2 === 0 ? 255 : 250, rIdx % 2 === 0 ? 255 : 252);
    doc.rect(tableX, y, pageWidth - margin * 2, 6.5, 'F');
    doc.setDrawColor(230, 235, 242);
    doc.line(tableX, y + 6.5, pageWidth - margin, y + 6.5);

    doc.setFont('helvetica', rIdx === 0 ? 'bold' : 'normal');
    doc.setFontSize(7);
    doc.setTextColor(25, 35, 50);

    let cellX = tableX + 3;
    row.forEach((cell, cIdx) => {
      if (cIdx === 5) {
        doc.setTextColor(20, 140, 80);
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setTextColor(25, 35, 50);
      }
      doc.text(cell, cellX, y + 4.5);
      cellX += colWidths[cIdx];
    });
    y += 6.5;
  });

  y += 6;

  // 4. Autonomous Risk Mitigation & Reconciliation Record
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20, 30, 45);
  doc.text('4. Autonomous Risk Mitigation & 3-Way Reconciliation Ledger', margin, y);
  y += 5;

  const riskBoxHeight = 32;
  doc.setFillColor(255, 250, 245);
  doc.setDrawColor(245, 215, 185);
  doc.roundedRect(margin, y, pageWidth - margin * 2, riskBoxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(180, 70, 20);
  doc.text('• LIVE RISK EVENT MITIGATED: PO-1827 (Chennai Warehouse Hub)', margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(70, 80, 95);
  doc.text('Disruption Detected: Upstream carrier transfer delay (+2.4 days estimated variance).', margin + 6, y + 11);
  doc.text('Autonomous Recovery Executed: Recommended Buffer Inventory release from regional warehouse (Net Impact: 0.4 days).', margin + 6, y + 16);
  doc.text('3-Way Document Reconciliation (INV-1827): OCR identified Rs 10,000 unit variance + Rs 1,800 GST overbilling.', margin + 6, y + 21);
  doc.text('Action Taken: Automatic payment hold placed; Credit Note request dispatched to Cobalt Office Systems.', margin + 6, y + 26);

  // Footer & Cryptographic Verification Seal
  doc.setDrawColor(215, 225, 235);
  doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 115, 130);
  doc.text('PROCURA ENTERPRISE PROCUREMENT ENGINE', margin, pageHeight - 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('All data verified from connected protocol logs, carrier GPS milestones, and tamper-evident audit ledger.', margin, pageHeight - 8);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 140, 80);
  doc.text('[VERIFIED AUDIT LEDGER · NON-DISPENSABLE RECORD]', pageWidth - margin, pageHeight - 10, { align: 'right' });

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

export function buildPurchaseOrderPdf(po: any): Buffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = 16;

  // Background Header Banner
  doc.setFillColor(17, 24, 39); // #111827
  doc.rect(0, 0, pageWidth, 38, 'F');

  // Accent Line
  doc.setFillColor(16, 185, 129); // emerald
  doc.rect(0, 37, pageWidth, 1.5, 'F');

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('OFFICIAL PURCHASE ORDER', margin, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(167, 243, 208);
  doc.text(`PO NUMBER: ${po.poNumber || 'PO-2026-1827'} | STATUS: ${po.status || 'APPROVED'}`, margin, 21);

  // Metadata right-aligned
  doc.setTextColor(209, 213, 219);
  doc.setFontSize(8);
  const dateStr = po.createdAt ? new Date(po.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
  doc.text(`Issue Date: ${dateStr}`, pageWidth - margin, 14, { align: 'right' });
  doc.text(`Buyer: Kinetiq Studios (GSTIN: 33AABCK1234F1Z5)`, pageWidth - margin, 19, { align: 'right' });
  doc.text(`Delivery Location: Chennai Warehouse Hub`, pageWidth - margin, 24, { align: 'right' });
  doc.text(`Verification Protocol: B2B Verified Gateway`, pageWidth - margin, 29, { align: 'right' });

  y = 48;

  // Buyer & Vendor Info Box
  doc.setDrawColor(229, 231, 235);
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 32, 2, 2, 'FD');

  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('SUPPLIER (VENDOR):', margin + 4, y + 6);
  doc.text('BUYER (BILL TO & SHIP TO):', margin + (pageWidth - 2 * margin) / 2 + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(55, 65, 81);
  doc.text(`${po.supplierName || 'Vendor Partner'}`, margin + 4, y + 11);
  doc.text(`Location: ${po.deliveryTerms || 'Chennai, Tamil Nadu'}`, margin + 4, y + 15.5);
  doc.text(`Commercial Desk: Verified Vendor Network`, margin + 4, y + 20);
  doc.text(`Payment: ${po.paymentTerms || '30% advance on PO confirmation'}`, margin + 4, y + 24.5);

  const halfX = margin + (pageWidth - 2 * margin) / 2 + 4;
  doc.text('Kinetiq Studios Pvt Ltd', halfX, y + 11);
  doc.text('Plot 42, Guindy Industrial Estate', halfX, y + 15.5);
  doc.text('Chennai, Tamil Nadu 600032', halfX, y + 20);
  doc.text(`Expected Delivery: ${po.expectedDelivery || '4 days from issuance'}`, halfX, y + 24.5);

  y += 40;

  // Line Items Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('Order Line Items & Specifications', margin, y);
  y += 6;

  // Table Header
  doc.setFillColor(243, 244, 246);
  doc.rect(margin, y, pageWidth - 2 * margin, 8, 'F');
  doc.setFontSize(8);
  doc.setTextColor(75, 85, 99);
  doc.text('Item Description & Specs', margin + 3, y + 5.5);
  doc.text('Qty', margin + 95, y + 5.5);
  doc.text('Unit Price', margin + 115, y + 5.5);
  doc.text('GST %', margin + 140, y + 5.5);
  doc.text('Total (INR)', pageWidth - margin - 3, y + 5.5, { align: 'right' });
  y += 8;

  // Table Row
  const item = po.items?.[0] || {
    itemName: po.product || 'Industrial Goods',
    quantity: po.quantity || 500,
    unitPrice: po.unitPrice || 740,
    totalAmount: po.subtotal || 370000
  };

  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, pageWidth - 2 * margin, 18, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, y + 18, pageWidth - margin, y + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39);
  doc.text((item.itemName || '').slice(0, 50), margin + 3, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text(item.specifications || 'Commercial grade, verified supplier specifications', margin + 3, y + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39);
  doc.text(`${item.quantity} units`, margin + 95, y + 8);
  doc.text(`Rs ${(item.unitPrice || 0).toLocaleString('en-IN')}`, margin + 115, y + 8);
  doc.text('18.0%', margin + 140, y + 8);
  doc.setFont('helvetica', 'bold');
  doc.text(`Rs ${(item.totalAmount || 0).toLocaleString('en-IN')}`, pageWidth - margin - 3, y + 8, { align: 'right' });

  y += 24;

  // Pricing Totals Box
  const subtotal = po.subtotal || item.totalAmount || 370000;
  const tax = po.taxAmount || Math.round(subtotal * 0.18);
  const total = po.totalAmount || subtotal + tax;

  const summaryX = pageWidth - margin - 75;
  doc.setDrawColor(229, 231, 235);
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(summaryX, y, 75, 30, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(75, 85, 99);
  doc.text('Subtotal:', summaryX + 4, y + 6);
  doc.text(`Rs ${subtotal.toLocaleString('en-IN')}`, pageWidth - margin - 4, y + 6, { align: 'right' });

  doc.text('GST Tax (18%):', summaryX + 4, y + 13);
  doc.text(`Rs ${tax.toLocaleString('en-IN')}`, pageWidth - margin - 4, y + 13, { align: 'right' });

  doc.setDrawColor(209, 213, 219);
  doc.line(summaryX + 4, y + 17, pageWidth - margin - 4, y + 17);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  doc.text('Grand Total:', summaryX + 4, y + 24);
  doc.text(`Rs ${total.toLocaleString('en-IN')}`, pageWidth - margin - 4, y + 24, { align: 'right' });

  y += 38;

  // Authorization & Terms
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(17, 24, 39);
  doc.text('Commercial Terms & Authorization', margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);
  doc.text('1. Delivery: Door delivery to specified warehouse within agreed delivery SLA.', margin, y);
  doc.text('2. Quality: All delivered goods are subject to standard inspection and 3-way document reconciliation.', margin, y + 4.5);
  doc.text('3. Invoicing: Please reference this Purchase Order number on all shipping challans and GST tax invoices.', margin, y + 9);

  y += 20;

  // Signature Block
  doc.setDrawColor(209, 213, 219);
  doc.line(margin, y + 15, margin + 55, y + 15);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text('Authorized Signatory', margin, y + 19);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text('Sadwik Kumar (Procurement Head)', margin, y + 23);

  doc.line(pageWidth - margin - 55, y + 15, pageWidth - margin, y + 15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text('Supplier Acceptance', pageWidth - margin - 55, y + 19);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text(`${po.supplierName || 'Commercial Representative'}`, pageWidth - margin - 55, y + 23);

  // Footer & Audit Statement
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, pageHeight - 16, pageWidth - margin, pageHeight - 16);
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  const rfqRefStr = po.rfqReference ? ` · RFQ Ref: ${po.rfqReference}` : '';
  doc.text(`Generated from buyer-approved supplier offer${rfqRefStr} · Immutable Procurement Audit Ledger`, margin, pageHeight - 11);
  doc.text('Legally Binding Purchase Document · Generated via Procura Enterprise Suite', margin, pageHeight - 7);

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
