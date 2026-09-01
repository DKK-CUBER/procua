import { NextRequest, NextResponse } from 'next/server';
import { syncInboundProcurementReplies } from '@/lib/server/email/imapWorker';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const syncRes = await syncInboundProcurementReplies(id);
    return NextResponse.json({
      success: true,
      result: syncRes
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
