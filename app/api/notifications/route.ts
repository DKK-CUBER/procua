import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { mockNotificationsStore } from '@/lib/server/dataStore';

export async function GET(request: NextRequest) {
  const { errorResponse } = requireAuth(request);
  if (errorResponse) return errorResponse;

  return NextResponse.json({
    success: true,
    unreadCount: mockNotificationsStore.filter((n) => !n.isRead).length,
    notifications: mockNotificationsStore
  });
}

export async function POST(request: NextRequest) {
  const { errorResponse } = requireAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await request.json();
    const notif = mockNotificationsStore.find((n) => n.id === id);
    if (notif) {
      notif.isRead = true;
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}
