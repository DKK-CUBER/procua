import { NextRequest, NextResponse } from 'next/server';
import { buildExecutivePdf } from '@/lib/server/services/pdfService';

export async function GET(req: NextRequest) {
  try {
    const data = {
      totalProcurement: 1240000,
      totalSavings: 186000,
      averageSavingsPct: 8.4,
      onTimeDeliveryRate: 94.7,
      businessName: 'Kinetiq Studios',
      generatedDate: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST'
    };

    const pdfBuffer = buildExecutivePdf(data);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Procura_Executive_Procurement_Report_${dateStr}.pdf`;

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const data = {
      totalProcurement: body.totalProcurement || 1240000,
      totalSavings: body.totalSavings || 186000,
      averageSavingsPct: body.averageSavingsPct || 8.4,
      onTimeDeliveryRate: body.onTimeDeliveryRate || 94.7,
      businessName: body.businessName || 'Kinetiq Studios',
      generatedDate: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST'
    };

    const pdfBuffer = buildExecutivePdf(data);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Procura_Executive_Procurement_Report_${dateStr}.pdf`;

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
