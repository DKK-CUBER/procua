import assert from 'node:assert';
import { db } from '../lib/db';
import { hashPassword, verifyPassword, generateSessionToken, verifySessionToken, hasRole } from '../lib/auth';

console.log('\n🧪 Running Procura Database Auth & User Management Test Suite...\n');

let passedTests = 0;

async function it(name: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      await res;
    }
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

async function runAuthTests() {
  const testEmail = `test_procurement_${Date.now()}@example.com`;
  const testPassword = 'SecurePassword123!';
  let createdUserId = '';
  let createdBusinessId = '';

  console.log('1. Password Cryptography & Verification');
  await it('Hashes passwords securely with bcrypt and verifies them accurately', async () => {
    const hash = await hashPassword(testPassword);
    assert(hash && hash.startsWith('$2'), 'Hash should be a bcrypt hash');

    const isValid = await verifyPassword(testPassword, hash);
    assert.strictEqual(isValid, true, 'Valid password must verify');

    const isInvalid = await verifyPassword('WrongPassword!', hash);
    assert.strictEqual(isInvalid, false, 'Invalid password must be rejected');
  });

  console.log('\n2. SQLite Database User & Business Persistence');
  await it('Signs up a new user, creates business, user, and membership in SQLite Prisma DB', async () => {
    const passwordHash = await hashPassword(testPassword);
    const business = await db.business.create({
      data: {
        name: 'Apex Procurement Ltd',
        legalName: 'Apex Procurement Private Limited',
        city: 'Chennai',
        state: 'Tamil Nadu',
        country: 'India'
      }
    });
    createdBusinessId = business.id;

    const user = await db.user.create({
      data: {
        name: 'Kavin Kadmiel',
        email: testEmail,
        passwordHash,
        phone: '+919876543210'
      }
    });
    createdUserId = user.id;

    const member = await db.businessMember.create({
      data: {
        userId: user.id,
        businessId: business.id,
        role: 'OWNER'
      }
    });

    assert(user.id, 'User ID must be generated');
    assert.strictEqual(user.email, testEmail);
    assert.strictEqual(business.name, 'Apex Procurement Ltd');
    assert.strictEqual(member.role, 'OWNER');
  });

  console.log('\n3. Database User Retrieval & Login Credentials');
  await it('Fetches user with business membership from DB and verifies login credentials', async () => {
    const userFromDb = await db.user.findUnique({
      where: { email: testEmail },
      include: {
        memberships: {
          include: { business: true }
        }
      }
    });

    assert(userFromDb, 'User must exist in DB');
    assert.strictEqual(userFromDb?.name, 'Kavin Kadmiel');
    assert(userFromDb?.memberships.length > 0, 'User must have business memberships');
    assert.strictEqual(userFromDb?.memberships[0].business.name, 'Apex Procurement Ltd');

    // Verify correct password
    const passwordMatch = await verifyPassword(testPassword, userFromDb!.passwordHash!);
    assert.strictEqual(passwordMatch, true, 'Correct password must match hash');

    // Verify wrong password fails
    const wrongMatch = await verifyPassword('BadPassword999', userFromDb!.passwordHash!);
    assert.strictEqual(wrongMatch, false, 'Wrong password must not match hash');
  });

  console.log('\n4. JWT Token Generation & Claims Verification');
  await it('Generates and verifies session JWT with user role and business claims', () => {
    const token = generateSessionToken({
      id: createdUserId,
      email: testEmail,
      name: 'Kavin Kadmiel',
      businessId: createdBusinessId,
      businessName: 'Apex Procurement Ltd',
      role: 'OWNER'
    });

    assert(token, 'Token must be generated');

    const decoded = verifySessionToken(token);
    assert(decoded, 'Token must decode successfully');
    assert.strictEqual(decoded?.email, testEmail);
    assert.strictEqual(decoded?.businessName, 'Apex Procurement Ltd');
    assert.strictEqual(decoded?.role, 'OWNER');
  });

  console.log('\n5. Sadwik Demo Account Fallback & Role Hierarchy');
  await it('Verifies Sadwik demo account fallback is preserved for workspace', () => {
    const sadwikSession = {
      id: 'usr_sadwik_01',
      email: 'sadwik@kinetiqstudios.com',
      name: 'Sadwik Kumar',
      businessId: 'biz_kinetiq_01',
      businessName: 'Kinetiq Studios',
      role: 'PROCUREMENT_MANAGER' as const
    };

    const token = generateSessionToken(sadwikSession);
    const decoded = verifySessionToken(token);

    assert.strictEqual(decoded?.name, 'Sadwik Kumar');
    assert.strictEqual(decoded?.businessName, 'Kinetiq Studios');
    assert.strictEqual(decoded?.role, 'PROCUREMENT_MANAGER');
  });

  await it('Enforces role-based hierarchy correctly', () => {
    assert.strictEqual(hasRole('OWNER', 'VIEWER'), true);
    assert.strictEqual(hasRole('OWNER', 'PROCUREMENT_MANAGER'), true);
    assert.strictEqual(hasRole('PROCUREMENT_MANAGER', 'PROCUREMENT_EXECUTIVE'), true);
    assert.strictEqual(hasRole('VIEWER', 'PROCUREMENT_MANAGER'), false);
    assert.strictEqual(hasRole('VIEWER', 'OWNER'), false);
  });

  console.log(`\n======================================================`);
  console.log(`Summary: All ${passedTests} Auth & DB tests passed! 🚀`);
  console.log(`======================================================\n`);
}

runAuthTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
