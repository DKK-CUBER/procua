import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { generateSessionToken, hashPassword } from '@/lib/auth';

const signupSchema = z.object({
  name: z.string().min(2),
  businessName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  country: z.string().default('India')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { name, businessName, email, password, phone, country } = parsed.data;

    // 1. Check if user already exists in DB
    const existingUser = await db.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 409 }
      );
    }

    // 2. Hash password
    const passwordHash = await hashPassword(password);

    // 3. Create Business in DB
    const business = await (db.business.create as any)({
      data: {
        name: businessName,
        legalName: `${businessName} Private Limited`,
        city: 'Chennai',
        state: 'Tamil Nadu',
        country: country || 'India'
      }
    });

    // 4. Create User in DB
    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        phone: phone || null
      }
    });

    // 5. Create Business Membership in DB
    await db.businessMember.create({
      data: {
        userId: user.id,
        businessId: business.id,
        role: 'OWNER'
      }
    });

    const sessionPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone || undefined,
      businessId: business.id,
      businessName: business.name,
      role: 'OWNER' as const
    };

    const token = generateSessionToken(sessionPayload);

    // 6. Record Session in DB
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
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Signup failed', message: error.message },
      { status: 500 }
    );
  }
}
