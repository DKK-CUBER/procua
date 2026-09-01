import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { generateSessionToken, verifyPassword } from '@/lib/auth';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // 1. Sadwik Demo / Mock Account (Special handling as requested)
    if (email.toLowerCase().includes('sadwik')) {
      const sessionPayload = {
        id: 'usr_sadwik_01',
        email: 'sadwik@kinetiqstudios.com',
        name: 'Sadwik Kumar',
        businessId: 'biz_kinetiq_01',
        businessName: 'Kinetiq Studios',
        role: 'PROCUREMENT_MANAGER' as const
      };

      const token = generateSessionToken(sessionPayload);

      const response = NextResponse.json({
        success: true,
        user: sessionPayload,
        token
      });

      response.cookies.set('procura_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60
      });

      return response;
    }

    // 2. Fetch User from SQLite DB
    const user = await db.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: { business: true }
        }
      }
    });

    if (user) {
      // 3. Verify Password if hash exists
      if (user.passwordHash) {
        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
          return NextResponse.json(
            { error: 'Invalid email or password' },
            { status: 401 }
          );
        }
      }

      const membership = user.memberships?.[0];
      const businessId = membership?.businessId || 'biz_kinetiq_01';
      const businessName = membership?.business?.name || 'Enterprise Workspace';
      const role = (membership?.role as any) || 'PROCUREMENT_MANAGER';

      const sessionPayload = {
        id: user.id,
        email: user.email,
        name: user.name,
        businessId,
        businessName,
        role
      };

      const token = generateSessionToken(sessionPayload);

      // Record session in DB
      try {
        await db.session.create({
          data: {
            token,
            userId: user.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        });
      } catch (_) {}

      const response = NextResponse.json({
        success: true,
        user: sessionPayload,
        token
      });

      response.cookies.set('procura_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60
      });

      return response;
    }

    // 4. Semi-mock fallback for newly provided email testing
    const fallbackName = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    const sessionPayload = {
      id: 'usr_' + Buffer.from(email).toString('hex').slice(0, 10),
      email,
      name: fallbackName,
      businessId: 'biz_' + Buffer.from(email).toString('hex').slice(0, 8),
      businessName: `${fallbackName} Enterprises`,
      role: 'PROCUREMENT_MANAGER' as const
    };

    const token = generateSessionToken(sessionPayload);

    const response = NextResponse.json({
      success: true,
      user: sessionPayload,
      token
    });

    response.cookies.set('procura_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed', message: error.message },
      { status: 500 }
    );
  }
}
