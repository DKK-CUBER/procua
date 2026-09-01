import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Procura database seed...');

  // 1. Create Business
  const business = await prisma.business.upsert({
    where: { id: 'biz_kinetiq_01' },
    update: {},
    create: {
      id: 'biz_kinetiq_01',
      name: 'Kinetiq Studios',
      legalName: 'Kinetiq Studios Private Limited',
      gstin: '33AABCK1234F1Z5',
      city: 'Chennai',
      state: 'Tamil Nadu',
      country: 'India'
    }
  });

  // 2. Create Users & Memberships
  const passwordHash = await hashPassword('Password123!');

  const sadwik = await prisma.user.upsert({
    where: { email: 'sadwik@kinetiqstudios.com' },
    update: {},
    create: {
      id: 'usr_sadwik_01',
      name: 'Sadwik Kumar',
      email: 'sadwik@kinetiqstudios.com',
      passwordHash,
      phone: '+91-98840-12345'
    }
  });

  await prisma.businessMember.upsert({
    where: {
      userId_businessId: {
        userId: sadwik.id,
        businessId: business.id
      }
    },
    update: {},
    create: {
      businessId: business.id,
      userId: sadwik.id,
      role: 'PROCUREMENT_MANAGER'
    }
  });

  // 3. Create Suppliers
  const cobalt = await prisma.supplier.upsert({
    where: { id: 'cobalt' },
    update: {},
    create: {
      id: 'cobalt',
      name: 'Cobalt Office Systems',
      supplierType: 'manufacturer',
      city: 'Chennai',
      state: 'Tamil Nadu',
      reliabilityScore: 98,
      rating: 4.9,
      reviewCount: 42,
      onTimeDeliveryRate: 97,
      averageResponseMins: 18,
      averageSavingsPct: 6.8,
      hasMessagingChannel: true,
      email: 'orders@cobaltoffice.in',
      phone: '+91-44-2834-9100',
      officialWebsiteUrl: 'https://cobaltoffice.in',
      isWebsiteVerified: true,
      websiteConfidence: 0.95
    }
  });

  const ernest = await prisma.supplier.upsert({
    where: { id: 'ernest' },
    update: {},
    create: {
      id: 'ernest',
      name: 'Ernest Furnishings',
      supplierType: 'wholesaler',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      reliabilityScore: 93,
      rating: 4.7,
      reviewCount: 35,
      onTimeDeliveryRate: 92,
      averageResponseMins: 24,
      averageSavingsPct: 5.5,
      hasMessagingChannel: true,
      email: 'b2b@ernestfurnishings.com',
      phone: '+91-422-265-4421'
    }
  });

  // 4. Create Procurement Request
  const req1827 = await prisma.procurementRequest.upsert({
    where: { id: 'req-1827' },
    update: {},
    create: {
      id: 'req-1827',
      businessId: business.id,
      title: 'Ergonomic office chairs',
      category: 'Commercial Furniture',
      targetQuantity: 500,
      targetUnitPrice: 720,
      maxUnitPrice: 750,
      deliveryLocation: 'Chennai',
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      deliveryDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      allowPartial: false,
      status: 'REVIEW',
      whyExplanation: 'Ranked from real supplier records returned by connected sources.'
    }
  });

  // 5. Create Purchase Order
  const po1827 = await prisma.purchaseOrder.upsert({
    where: { poNumber: 'PO-1827' },
    update: {},
    create: {
      id: 'po-1827',
      businessId: business.id,
      supplierId: cobalt.id,
      requestId: req1827.id,
      poNumber: 'PO-1827',
      status: 'APPROVED',
      subtotal: 370000,
      taxAmount: 66600,
      freightAmount: 0,
      totalAmount: 436600,
      paymentTerms: '30% advance, 70% against delivery',
      deliveryTerms: 'Door delivery Chennai warehouse',
      deliveryAddress: 'Plot 42, Guindy Industrial Estate, Chennai 600032',
      expectedDelivery: new Date('2026-09-04'),
      approvedByUserId: sadwik.id,
      approvedAt: new Date()
    }
  });

  console.log('✅ Procura database seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
