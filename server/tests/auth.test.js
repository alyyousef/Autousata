const request = require('supertest');
const app = require('../server'); // Import the app
const db = require('../config/db'); // Import DB to connect manually

// 1. Generate UNIQUE Identity for every test run
const uniqueId = Date.now();
const testUser = {
    firstName: "Test",
    lastName: "User",
    email: `testuser${uniqueId}@example.com`,
    // ✅ FIX: Generate a unique 11-digit phone number (starts with 010)
    phone: `010${String(uniqueId).slice(-8)}`, 
    password: "password123"
};

let authToken = "";

// =================================================================
// 🔧 TEST SETUP & TEARDOWN
// =================================================================
beforeAll(async () => {
    await db.initialize();
});

afterAll(async () => {
    await db.close();
});

describe('🔐 Authentication System Tests', () => {

    // =================================================================
    // 1. SIGNUP TESTS
    // =================================================================
    describe('POST /api/auth/register', () => {
        
        it('✅ Should register a new user successfully', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send(testUser);
            
            // Debugging log if it fails
            if (res.statusCode !== 201) console.log('Register Error:', res.body);

            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('user');
            expect(res.body.user.email).toBe(testUser.email);
        });

        it('❌ Should fail if email/phone is already taken', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send(testUser); // Sending same data again
            
            // Your SP catches the error and returns 400 with the message, 
            // OR the controller catches ORA-00001 and returns 409.
            // We accept either to be safe.
            expect([400, 409]).toContain(res.statusCode);
        });

        it('❌ Should fail if password is too weak (< 8 chars)', async () => {
            const weakUser = { ...testUser, email: 'weak@test.com', phone: '01099999999', password: '123' };
            const res = await request(app).post('/api/auth/register').send(weakUser);
            expect(res.statusCode).toEqual(400);
        });

        it('❌ Should fail if phone number contains letters', async () => {
            const badPhoneUser = { ...testUser, email: 'badphone@test.com', phone: '010-BAD-PHONE' };
            const res = await request(app).post('/api/auth/register').send(badPhoneUser);
            expect(res.statusCode).toEqual(400);
        });
    });

    // =================================================================
    // 2. LOGIN TESTS
    // =================================================================
    describe('POST /api/auth/login', () => {

        it('✅ Should login successfully with correct credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password
                });
            
            if (res.statusCode !== 200) console.log('Login Error:', res.body);

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('accessToken');
            
            authToken = res.body.accessToken;
        });

        it('❌ Should fail with wrong password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: "WRONGPASSWORD"
                });
            
            expect(res.statusCode).toEqual(401);
        });

        it('❌ Should fail if user does not exist', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: "ghost@doesnotexist.com",
                    password: "password123"
                });
            
            expect(res.statusCode).toEqual(401); 
        });
    });

    // =================================================================
    // 3. FORGOT PASSWORD TESTS
    // =================================================================
    describe('POST /api/auth/forgot-password', () => {

        it('✅ Should send reset email for valid user', async () => {
            const res = await request(app)
                .post('/api/auth/forgot-password')
                .send({ email: testUser.email });

            if (res.statusCode !== 200) console.log('Forgot PW Error:', res.body);

            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toMatch(/sent/i);
        });

        it('❌ Should return 404 for non-existent email', async () => {
            const res = await request(app)
                .post('/api/auth/forgot-password')
                .send({ email: "ghost@doesnotexist.com" });

            expect(res.statusCode).toEqual(404);
            // ✅ FIX: Use .toMatch for Regex, not .toBe
            expect(res.body.error).toMatch(/not found/i); 
        });

        it('❌ Should fail for invalid email format', async () => {
            const res = await request(app)
                .post('/api/auth/forgot-password')
                .send({ email: "not-an-email" });

            expect(res.statusCode).toEqual(400); 
        });
    });

    // =================================================================
    // 4. KYC UPLOAD TESTS (Protected Route)
    // =================================================================
    describe('PUT /api/profile/kyc', () => {

        it('❌ Should fail if no token provided', async () => {
            const res = await request(app)
                .put('/api/profile/kyc');
            
            expect(res.statusCode).toEqual(401); 
        });

        it('❌ Should fail if no file attached', async () => {
            // Need a valid token from the login test
            if (!authToken) {
                console.warn("⚠️ SKIPPING KYC TEST: No Auth Token");
                return;
            }

            const res = await request(app)
                .put('/api/profile/kyc')
                .set('Authorization', `Bearer ${authToken}`); 
            
            expect(res.statusCode).toEqual(400); // Bad Request (No file)
        });
    });
});