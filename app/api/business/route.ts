import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { session, errorResponse } = requireAuth(request);
  if (errorResponse) return errorResponse;

  return NextResponse.json({
    success: true,
    business: {
      id: session!.businessId,
      name: session!.businessName,
      industry: 'Design & Manufacturing',
      size: '50-200 employees',
      gstin: '33AABCK1234F1Z5',
      location: 'Chennai, Tamil Nadu',
      country: 'India',
      members: [
        { id: 'usr-1', name: 'Sadwik Kumar', email: 'sadwik@kinetiqstudios.com', role: 'PROCUREMENT_MANAGER' },
        { id: 'usr-2', name: 'Kavin Raj', email: 'kavin@kinetiqstudios.com', role: 'OWNER' },
        { id: 'usr-3', name: 'Priya Sundaram', email: 'priya@kinetiqstudios.com', role: 'PROCUREMENT_EXECUTIVE' },
        { id: 'usr-4', name: 'Audit Viewer', email: 'auditor@kinetiqstudios.com', role: 'VIEWER' }
      ]
    }
  });
}
