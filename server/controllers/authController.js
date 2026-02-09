const bcrypt = require('bcrypt');
const oracledb = require('oracledb');
const crypto = require('crypto'); // ✅ FIXED: Added missing import
const db = require('../config/db');
const { generateTokens, verifyRefreshToken } = require('../middleware/auth');
const { uploadToS3 } = require('../middleware/uploadMiddleware');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');
require('dotenv').config();

// ==========================================
// 1. REGISTER (With OTP)
// ==========================================
async function register(req, res) {
    const { firstName, lastName, email, phone, password } = req.body;

    // 1. Phone Validation
    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(phone)) {
        return res.status(400).json({ error: 'Invalid phone format. Only numbers allowed (10-15 digits).' });
    }

    // 2. Password Strength (Min 8 chars)
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password too weak. Minimum 8 characters.' });
    }

    const file = req.file; 
    let connection;

    try {
        console.log(`👉 Registering: ${email}`);

        let profilePicUrl = null;
        if (file) {
            console.log("📸 [1] Starting S3 Upload...");
            profilePicUrl = await uploadToS3(file, 'profiles'); 
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        connection = await db.getConnection();
        
        const result = await connection.execute(
            `BEGIN 
                sp_register_user(:fn, :ln, :em, :ph, :pw, :img, :out_id, :out_status); 
             END;`,
            {
                fn: firstName,
                ln: lastName,
                em: email,
                ph: phone,
                pw: hashedPassword,
                img: profilePicUrl, 
                out_id: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
                out_status: { dir: oracledb.BIND_OUT, type: oracledb.STRING }
            }
        );

        const status = result.outBinds.out_status;
        const newUserId = result.outBinds.out_id;

        if (status === 'SUCCESS') {
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

            await connection.execute(
                `BEGIN sp_save_email_otp(:email, :otp, :status); END;`,
                { 
                    email: email, 
                    otp: otpCode, 
                    status: { dir: oracledb.BIND_OUT, type: oracledb.STRING } 
                }
            );

            sendVerificationEmail(email, otpCode)
                .catch(err => console.error("Email failed:", err));

            const { accessToken, refreshToken } = generateTokens(newUserId);

            res.status(201).json({ 
                message: 'User registered successfully.',
                accessToken,
                refreshToken,
                user: { id: newUserId, firstName, lastName, email, role: 'client', profileImage: profilePicUrl, emailVerified: false }
            });

        } else {
            res.status(400).json({ error: status });
        }

    } catch (err) {
        console.error('❌ Registration Error:', err);
        // Clean error message for user
        if (err.message.includes('ORA-00001')) {
            return res.status(409).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Registration failed' });
    } finally {
        if (connection) { try { await connection.close(); } catch (e) {} }
    }
}

// ==========================================
// 2. LOGIN
// ==========================================
async function login(req, res) {
    const { email, password } = req.body;
    let connection;

    try {
        connection = await db.getConnection();

        // 1. Authenticate via Stored Procedure
        const result = await connection.execute(
            `BEGIN 
                sp_login_user(:em, :id, :hash, :fn, :ln, :role, :img, :status); 
             END;`,
            {
                em: email,
                id: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
                hash: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
                fn: { dir: oracledb.BIND_OUT, type: oracledb.STRING }, 
                ln: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
                role: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
                img: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
                status: { dir: oracledb.BIND_OUT, type: oracledb.STRING }
            }
        );

        const authData = result.outBinds;

        if (authData.status === 'UNVERIFIED') {
            return res.status(403).json({ error: 'Please verify your email.', needsVerification: true });
        }

        if (authData.status !== 'FOUND') {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, authData.hash);

        if (match) {
            try {
                // 2. Fetch Full Profile
                const userResult = await connection.execute(
                    `SELECT ID, FIRST_NAME, LAST_NAME, EMAIL, PHONE, ROLE, 
                            PROFILE_PIC_URL, EMAIL_VERIFIED, PHONE_VERIFIED, 
                            KYC_STATUS, KYC_DOCUMENT_URL, LOCATION_CITY
                     FROM USERS 
                     WHERE ID = :id`,
                    [authData.id],
                    { outFormat: oracledb.OUT_FORMAT_OBJECT }
                );

                if (userResult.rows.length > 0) {
                    const dbUser = userResult.rows[0];
                    
                    const fullUser = {
                        id: dbUser.ID,
                        firstName: dbUser.FIRST_NAME,
                        lastName: dbUser.LAST_NAME,
                        email: dbUser.EMAIL,
                        phone: dbUser.PHONE,
                        role: dbUser.ROLE,
                        profileImage: dbUser.PROFILE_PIC_URL, 
                        // ✅ FIX: Use '==' to handle '1' (string) or 1 (number)
                        emailVerified: dbUser.EMAIL_VERIFIED == 1,
                        phoneVerified: dbUser.PHONE_VERIFIED == 1,
                        kycStatus: dbUser.KYC_STATUS || 'not_uploaded',
                        kycDocumentUrl: dbUser.KYC_DOCUMENT_URL,
                        location: { city: dbUser.LOCATION_CITY || '' } 
                    };

                    const { accessToken, refreshToken } = generateTokens(fullUser.id);
                    return res.json({
                        message: 'Login successful',
                        accessToken,
                        refreshToken,
                        user: fullUser
                    });
                }
            } catch (sqlError) {
                console.error("❌ SQL Error in Login:", sqlError);
            }

            // Fallback if SQL fails
            const { accessToken, refreshToken } = generateTokens(authData.id);
            res.json({
                message: 'Login successful (Basic)',
                accessToken,
                refreshToken,
                user: { 
                    id: authData.id, firstName: authData.fn, lastName: authData.ln, 
                    email, role: authData.role, profileImage: authData.img, 
                    emailVerified: false 
                }
            });

        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }

    } catch (err) {
        console.error('❌ Login Main Error:', err);
        res.status(500).json({ error: 'Login failed' });
    } finally {
        if (connection) { try { await connection.close(); } catch (e) {} }
    }
}

// ==========================================
// 3. VERIFY EMAIL OTP
// ==========================================
async function verifyEmailOtp(req, res) {
    const { email, otp } = req.body;
    let connection;

    try {
        connection = await db.getConnection();
        const result = await connection.execute(
            `BEGIN sp_verify_email_otp(:email, :otp, :status); END;`,
            { email, otp, status: { dir: oracledb.BIND_OUT, type: oracledb.STRING } }
        );

        const status = result.outBinds.status;
        if (status === 'SUCCESS') {
            res.json({ success: true, message: 'Email verified successfully!' });
        } else {
            res.status(400).json({ error: 'Invalid or expired code.', code: status });
        }
    } catch (err) {
        console.error('❌ OTP Verify Error:', err);
        res.status(500).json({ error: 'Verification failed' });
    } finally {
        if (connection) { try { await connection.close(); } catch (e) {} }
    }
}

// ==========================================
// 4. REFRESH TOKEN
// ==========================================
async function refreshToken(req, res) {
    const { refreshToken: token } = req.body;
    if (!token) return res.status(400).json({ error: 'Refresh token required' });

    const decoded = verifyRefreshToken(token);
    if (!decoded) return res.status(403).json({ error: 'Invalid refresh token' });

    const tokens = generateTokens(decoded.userId);
    res.json({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
}

// ==========================================
// 5. GET CURRENT USER
// ==========================================
async function getMe(req, res) {
    let connection;
    try {
        // ✅ FIX: Check for 'userId' OR 'id' to prevent undefined errors
        const targetId = req.user?.userId || req.user?.id;
        
        if (!targetId) {
            console.error("❌ GetMe Failed: No User ID in token:", req.user);
            return res.status(401).json({ error: 'Not authenticated' });
        }

        connection = await db.getConnection();
        
        const result = await connection.execute(
            `SELECT ID, FIRST_NAME, LAST_NAME, EMAIL, PHONE, ROLE, 
                    PROFILE_PIC_URL, EMAIL_VERIFIED, PHONE_VERIFIED,
                    KYC_STATUS, KYC_DOCUMENT_URL, LOCATION_CITY
             FROM USERS 
             WHERE ID = :id`,
            [targetId],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const dbUser = result.rows[0];

        const fullUser = {
            id: dbUser.ID,
            firstName: dbUser.FIRST_NAME,
            lastName: dbUser.LAST_NAME,
            email: dbUser.EMAIL,
            phone: dbUser.PHONE,
            role: dbUser.ROLE,
            profileImage: dbUser.PROFILE_PIC_URL,
            // ✅ FIX: Use '==' for loose comparison (handles '1' vs 1)
            emailVerified: dbUser.EMAIL_VERIFIED == 1, 
            phoneVerified: dbUser.PHONE_VERIFIED == 1,
            kycStatus: dbUser.KYC_STATUS || 'not_uploaded',
            kycDocumentUrl: dbUser.KYC_DOCUMENT_URL,
            location: { city: dbUser.LOCATION_CITY || '' }
        };

        res.json({ user: fullUser });

    } catch (err) {
        console.error("❌ GetMe Crash Error:", err);
        // Return 500, but try to avoid logging out frontend if possible
        res.status(500).json({ error: "Server Error fetching profile" });
    } finally {
        if (connection) { try { await connection.close(); } catch (e) {} }
    }
}
// ==========================================
// 6. FORGOT PASSWORD (Corrected)
// ==========================================
async function forgotPassword(req, res) {
    const { email } = req.body;
    let connection;

    try {
        // ✅ FIX: Validate Input First!
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        connection = await db.getConnection();
        
        // 1. Check if user exists
        const check = await connection.execute(
            `SELECT id FROM users WHERE email = :email`,
            [email]
        );

        // ✅ LOGIC UPDATE: Explicitly tell frontend if user is missing
        if (check.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Email not found', 
                code: 'USER_NOT_FOUND',
                message: 'This email is not registered with us.' 
            });
        }

        const userId = check.rows[0][0];
        const resetToken = crypto.randomBytes(32).toString('hex');

        // 2. Save token
        await connection.execute(
            `UPDATE users 
             SET reset_password_token = :token,
                 reset_password_expiry = CURRENT_TIMESTAMP + INTERVAL '1' HOUR
             WHERE id = :id`,
            { token: resetToken, id: userId },
            { autoCommit: true }
        );

        // 3. Send Premium Email
        await sendPasswordResetEmail(email, resetToken);

        res.json({ success: true, message: 'Password reset link sent to your email.' });

    } catch (err) {
        console.error('Forgot Password Error:', err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        if (connection) { try { await connection.close(); } catch (e) {} }
    }
}

// ==========================================
// 7. RESET PASSWORD
// ==========================================
async function resetPassword(req, res) {
    const { token, newPassword } = req.body;
    let connection;

    try {
        connection = await db.getConnection();

        const result = await connection.execute(
            `SELECT id FROM users 
             WHERE reset_password_token = :token 
             AND reset_password_expiry > CURRENT_TIMESTAMP`,
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired reset token.' });
        }

        const userId = result.rows[0][0];
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        await connection.execute(
            `UPDATE users 
             SET password_hash = :pw,
                 reset_password_token = NULL,
                 reset_password_expiry = NULL
             WHERE id = :id`,
            { pw: hashedPassword, id: userId },
            { autoCommit: true }
        );

        res.json({ message: 'Password has been reset successfully.' });

    } catch (err) {
        console.error('Reset Password Error:', err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        if (connection) { try { await connection.close(); } catch (e) {} }
    }
}

module.exports = { register, login, verifyEmailOtp, refreshToken, getMe, forgotPassword, resetPassword };