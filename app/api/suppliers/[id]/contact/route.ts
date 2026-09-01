import { NextRequest, NextResponse } from 'next/server';
import { resolveSupplierContact } from '@/lib/server/discovery/contactResolver';
import { db } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const supplier = await db.supplier.findUnique({ where: { id } });
    if (!supplier) {
      return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 });
    }

    const contactResult = await resolveSupplierContact({
      supplierId: id,
      officialWebsiteUrl: supplier.officialWebsiteUrl,
      manualEmail: supplier.email,
      manualPhone: supplier.phone
    });

    return NextResponse.json({ success: true, contact: contactResult });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { manualEmail, manualPhone, officialWebsiteUrl } = body;

    const contactResult = await resolveSupplierContact({
      supplierId: id,
      officialWebsiteUrl,
      manualEmail,
      manualPhone
    });

    if (contactResult.status === 'verified') {
      await db.supplier.update({
        where: { id },
        data: {
          email: contactResult.email,
          phone: contactResult.phone,
          emailVerification: 'verified',
          emailSource: contactResult.source
        }
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, contact: contactResult });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
