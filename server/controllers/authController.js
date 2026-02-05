const bcrypt = require('bcrypt');
const crypto = require('crypto');
const oracledb = require('oracledb'); 
const db = require('../config/db');   // <--- USES OUR POOL
const { generateToken } = require('../middleware/auth');
const { uploadToS3 } = require('../middleware/uploadMiddleware');
const { sendVerificationEmail } = require('../services/emailService');
require('dotenv').config();

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
        connection = await db.getConnection(); // <--- CORRECT WAY
        
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
            // Update token
            await connection.execute(
                `UPDATE users 
                 SET email_verification_token = :token,
                     email_token_expiry = CURRENT_TIMESTAMP + INTERVAL '1' DAY
                 WHERE id = :u_id`, 
                { token: verificationToken, u_id: newUserId },
                { autoCommit: true }
            );

            console.log("✉️ [7] Sending Verification Email...");
            // Run email in background so response is fast
            sendVerificationEmail(email, verificationToken)
                .catch(err => console.error("Email failed in background:", err));

            const token = generateToken(newUserId);
            res.status(201).json({ 
                message: 'User registered successfully.',
                token,
                user: { id: newUserId, firstName, lastName, email, role: 'client', profileImage: profilePicUrl }
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
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
}

// ==========================================
// 2. LOGIN (DEBUG VERSION)
// ==========================================
async function login(req, res) {
    const { email, password } = req.body;
    let connection;

    try {
        console.log(`👉 Logging in: ${email}`);
        console.log("🔌 [1] Requesting Database Connection...");
        
        // Use the pool manager
        connection = await db.getConnection();
        console.log("✅ [2] DB Connected. Checking Credentials...");

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

        console.log("✅ [3] Procedure Executed.");
        const userData = result.outBinds;

        if (userData.status === 'UNVERIFIED') {
            console.log("⚠️ [4] User is Unverified.");
            return res.status(403).json({ 
                error: 'Please verify your email address to log in.',
                needsVerification: true 
            });
        }

        if (userData.status !== 'FOUND') {
            console.log("❌ [4] User Not Found or Invalid.");
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        console.log("🔑 [4] Verifying Password...");
        const match = await bcrypt.compare(password, userData.hash);

        if (match) {
            console.log("✅ [5] Password Correct. Generating Token...");
            const token = generateToken(userData.id);

            res.json({
                message: 'Login successful',
                token,
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
            console.log("❌ [5] Password Wrong.");
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
module.exports = { register, login }; // removed verifyEmail for brevity unless you have it