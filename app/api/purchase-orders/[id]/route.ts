import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mockPurchaseOrdersStore } from '@/lib/server/dataStore';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  try {
    const dbPo = await db.purchaseOrder.findFirst({
      where: {
        OR: [
          { id },
          { poNumber: id },
          { poNumber: id.toUpperCase() }
        ]
      },
      include: {
        items: true,
        supplier: true,
        payments: {
          orderBy: { createdAt: 'desc' }
        },
        shipments: {
          include: {
            shipmentEvents: {
              orderBy: { occurredAt: 'desc' }
            }
          }
        }
      }
    });

    if (dbPo) {
      return NextResponse.json({
        success: true,
        data: dbPo
      });
    }
  } catch (_) {}

  const po = mockPurchaseOrdersStore.find(
    (p) => p.id === id || p.poNumber.toLowerCase() === id.toLowerCase() || p.id.includes(id)
  ) || mockPurchaseOrdersStore[0];

  return NextResponse.json({
    success: true,
    data: po
  });
}
