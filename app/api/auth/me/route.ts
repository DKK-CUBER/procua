import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { session, errorResponse } = requireAuth(request);
  if (errorResponse) return errorResponse;

  if (session?.id) {
    try {
      const dbUser = await db.user.findUnique({
        where: { id: session.id },
        include: {
          memberships: {
            include: { business: true }
          }
        }
      });

      if (dbUser) {
        const membership = dbUser.memberships?.[0];
        return NextResponse.json({
          authenticated: true,
          user: {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            phone: dbUser.phone || undefined,
            businessId: membership?.businessId || session.businessId,
            businessName: membership?.business?.name || session.businessName,
            role: (membership?.role as any) || session.role
          }
        });
      }
    } catch (_) {}
  }

  return NextResponse.json({
    authenticated: true,
    user: session
  });
}
