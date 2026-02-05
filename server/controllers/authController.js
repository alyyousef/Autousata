const bcrypt = require('bcrypt');
const crypto = require('crypto');
const oracledb = require('oracledb');
const db = require('../config/db');
const { generateTokens, verifyRefreshToken } = require('../middleware/auth');
const { uploadToS3 } = require('../middleware/uploadMiddleware');
const { sendVerificationEmail } = require('../services/emailService');
require('dotenv').config();

// ==========================================
// 1. REGISTER
// ==========================================
async function register(req, res) {
    const { firstName, lastName, email, phone, password } = req.body;
    const file = req.file; 
    let connection;

    try {
        console.log(`👉 Registering: ${email}`);

        let profilePicUrl = null;
        if (file) {
            console.log("📸 [1] Starting S3 Upload...");
            profilePicUrl = await uploadToS3(file, 'profiles'); 
            console.log("✅ [2] S3 Upload Finished:", profilePicUrl);
        }

        console.log("🔑 [3] Hashing Password...");
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const verificationToken = crypto.randomBytes(32).toString('hex');

        console.log("🔌 [4] Requesting Database Connection...");
        connection = await db.getConnection();
        
        console.log("📝 [5] Executing Stored Procedure...");
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

        console.log("✅ [6] DB Execution Complete.");
        const status = result.outBinds.out_status;
        const newUserId = result.outBinds.out_id;

        if (status === 'SUCCESS') {
            // Update token in DB
            await connection.execute(
                `UPDATE users 
                 SET email_verification_token = :token,
                     email_token_expiry = CURRENT_TIMESTAMP + INTERVAL '1' DAY
                 WHERE id = :u_id`, 
                { token: verificationToken, u_id: newUserId },
                { autoCommit: true }
            );

            console.log("✉️ [7] Sending Verification Email...");
            sendVerificationEmail(email, verificationToken)
                .catch(err => console.error("Email failed in background:", err));

            const { accessToken, refreshToken } = generateTokens(newUserId);

            res.status(201).json({ 
                message: 'User registered successfully. Please verify your email.',
                accessToken,
                refreshToken,
                token: accessToken,
                user: {
                    id: newUserId,
                    firstName,
                    lastName,
                    email,
                    role: 'client',
                    profileImage: profilePicUrl,
                    emailVerified: false
                }
            });

        } else {
            console.log("❌ DB Returned Error:", status);
            res.status(400).json({ error: status });
        }

    } catch (err) {
        console.error('❌ Registration Error:', err);
        res.status(500).json({ error: 'Registration failed' });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) { console.error("Error closing connection:", e); }
        }
    }
}

// ==========================================
// 2. LOGIN
// ==========================================
async function login(req, res) {
    const { email, password } = req.body;
    let connection;

    try {
        console.log(`👉 Logging in: ${email}`);
        
        connection = await db.getConnection();

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

        const userData = result.outBinds;

        if (userData.status === 'UNVERIFIED') {
            return res.status(403).json({ 
                error: 'Please verify your email address to log in.',
                needsVerification: true 
            });
        }

        if (userData.status !== 'FOUND') {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, userData.hash);

        if (match) {
            const { accessToken, refreshToken } = generateTokens(userData.id);

            res.json({
                message: 'Login successful',
                accessToken,
                refreshToken,
                token: accessToken,
                user: {
                    id: userData.id,
                    firstName: userData.fn,
                    lastName: userData.ln,
                    email: email,
                    role: userData.role,
                    profileImage: userData.img 
                }
            });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }

    } catch (err) {
        console.error('❌ Login Error:', err);
        res.status(500).json({ error: 'Login failed' });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
}

// ==========================================
// 3. VERIFY EMAIL
// ==========================================
async function verifyEmail(req, res) {
    const { token } = req.body;
    let connection;

    try {
        connection = await db.getConnection();

        const result = await connection.execute(
            `SELECT id FROM users 
             WHERE email_verification_token = :token 
             AND email_token_expiry > CURRENT_TIMESTAMP`,
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired verification link.' });
        }

        const userId = result.rows[0][0];

        await connection.execute(
            `UPDATE users 
             SET email_verified = '1', 
                 email_verification_token = NULL, 
                 email_token_expiry = NULL 
             WHERE id = :u_id`,
            { u_id: userId },
            { autoCommit: true }
        );

        res.json({ message: 'Email verified successfully! You can now log in.' });

    } catch (err) {
        console.error('Verification error:', err);
        res.status(500).json({ error: 'Verification failed' });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error("Error closing connection:", e);
            }
        }
    }
}

// ==========================================
// 4. REFRESH TOKEN
// ==========================================
async function refreshToken(req, res) {
    const { refreshToken: token } = req.body;

    if (!token) {
        return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = verifyRefreshToken(token);
    if (!decoded) {
        return res.status(403).json({ error: 'Invalid or expired refresh token' });
    }

    const tokens = generateTokens(decoded.userId);

    res.json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
    });
}

// ==========================================
// 5. CURRENT USER
// ==========================================
async function getCurrentUser(req, res) {
    let connection;

    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        connection = await db.getConnection();

        const result = await connection.execute(
            `SELECT id, first_name, last_name, email, phone, role, profile_pic_url, location_city, email_verified, phone_verified
             FROM users
             WHERE id = :uid`,
            { uid: userId }
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const row = result.rows[0];
        const user = {
            id: row[0],
            firstName: row[1],
            lastName: row[2],
            name: `${row[1] || ''} ${row[2] || ''}`.trim(),
            email: row[3],
            phone: row[4],
            role: row[5],
            profileImage: row[6],
            avatar: row[6],
            location: { city: row[7] },
            emailVerified: row[8] === '1',
            phoneVerified: row[9] === '1'
        };

        res.json({ user });

    } catch (err) {
        console.error('Get current user error:', err);
        res.status(500).json({ error: 'Failed to fetch user' });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error('Error closing connection:', e);
            }
        }
    }
}

const getMe = (req, res) => getCurrentUser(req, res);

module.exports = { register, login, verifyEmail, refreshToken, getCurrentUser, getMe };
