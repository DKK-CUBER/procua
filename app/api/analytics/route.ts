import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { AnalyticsDTO } from '@/lib/types';

export async function GET(request: NextRequest) {
  const { errorResponse } = requireAuth(request);
  if (errorResponse) return errorResponse;

  const data: AnalyticsDTO = {
    totalProcurement: 1240000,
    totalSavings: 186000,
    averageSavingsPct: 8.4,
    onTimeDeliveryRate: 94.7,
    activeRequestsCount: 12,
    activeNegotiationsCount: 7,
    atRiskShipmentsCount: 3,
    monthlySpendHistory: [
      { label: 'Mar', amount: 650000, height: 65 },
      { label: 'Apr', amount: 1150000, height: 115 },
      { label: 'May', amount: 880000, height: 88 },
      { label: 'Jun', amount: 1600000, height: 160 },
      { label: 'Jul', amount: 1280000, height: 128 },
      { label: 'Aug', amount: 1800000, height: 180 },
      { label: 'Sep', amount: 1350000, height: 135 }
    ],
    supplierPerformanceList: [
      { id: 'cobalt', name: 'Cobalt Office Systems', reliability: 98, orders: 42 },
      { id: 'dwell', name: 'Dwell Business', reliability: 95, orders: 19 },
      { id: 'ernest', name: 'Ernest Furnishings', reliability: 93, orders: 35 },
      { id: 'sahara', name: 'Sahara Workspace', reliability: 91, orders: 28 }
    ]
  };

  return NextResponse.json({
    success: true,
    data
  });
}
