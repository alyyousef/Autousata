const oracledb = require('oracledb');
const bcrypt = require('bcrypt');
const { generateToken } = require('../middleware/auth');
const { uploadToS3 } = require('../middleware/uploadMiddleware'); // <--- Import S3 tool
require('dotenv').config();

// ==========================================
// 1. SIGN UP
// ==========================================
async function register(req, res) {
    // 1. Accept text fields AND the file from the request
    const { firstName, lastName, email, phone, password } = req.body;
    const file = req.file; // This comes from upload.single() in the route
    
    let connection;

    try {
        // 2. Upload to S3 (Only if a file was actually sent)
        let profilePicUrl = null;
        if (file) {
            console.log("Uploading image to S3...");
            profilePicUrl = await uploadToS3(file, 'profiles'); 
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        connection = await oracledb.getConnection();

        // 3. Execute Procedure (Passing the new :img parameter)
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
                img: profilePicUrl, // <--- Passing the S3 URL (or null) to Oracle
                out_id: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
                out_status: { dir: oracledb.BIND_OUT, type: oracledb.STRING }
            }
        );

        const status = result.outBinds.out_status;
        const newUserId = result.outBinds.out_id;

        if (status === 'SUCCESS') {
            const token = generateToken(newUserId);

            res.status(201).json({ 
                message: 'User registered successfully',
                token,
                user: {
                    id: newUserId,
                    firstName: firstName,
                    lastName: lastName,
                    email: email,
                    role: 'client',
                    profileImage: profilePicUrl // Send the new URL back to the frontend
                }
            });
        } else {
            res.status(400).json({ error: status });
        }

    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Registration failed' });
    } finally {
        if (connection) await connection.close();
    }
}

// ==========================================
// 2. LOGIN
// ==========================================
// ==========================================
// 2. LOGIN (Updated with Image Support)
// ==========================================
async function login(req, res) {
    const { email, password } = req.body;
    let connection;

    try {
        connection = await oracledb.getConnection();

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
                img: { dir: oracledb.BIND_OUT, type: oracledb.STRING }, // <--- Capture Image URL
                status: { dir: oracledb.BIND_OUT, type: oracledb.STRING }
            }
        );

        const userData = result.outBinds;

        if (userData.status !== 'FOUND') {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, userData.hash);

        if (match) {
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
                    profileImage: userData.img // <--- Send to Frontend!
                }
            });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    } finally {
        if (connection) await connection.close();
    }
}
module.exports = { register, login };