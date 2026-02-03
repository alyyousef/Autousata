const oracledb = require('oracledb');
const bcrypt = require('bcrypt');
const { generateToken } = require('../middleware/auth');
require('dotenv').config();

// ==========================================
// 1. SIGN UP (Updated for Frontend)
// ==========================================
async function register(req, res) {
    // 1. Accept firstName and lastName directly from Frontend
    const { firstName, lastName, email, phone, password } = req.body;
    let connection;

    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        connection = await oracledb.getConnection();

        // 2. Pass them directly to Oracle
        const result = await connection.execute(
            `BEGIN 
                sp_register_user(:fn, :ln, :em, :ph, :pw, :out_id, :out_status); 
             END;`,
            {
                fn: firstName,     // <--- Direct mapping
                ln: lastName,      // <--- Direct mapping
                em: email,
                ph: phone,
                pw: hashedPassword,
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
                    firstName: firstName, // Send back separate fields
                    lastName: lastName,
                    email: email,
                    role: 'client'
                }
            });
        } else {
            // Handle Oracle errors (like Duplicate Email)
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
async function login(req, res) {
    const { email, password } = req.body;
    let connection;

    try {
        connection = await oracledb.getConnection();

        const result = await connection.execute(
            `BEGIN 
                sp_login_user(:em, :id, :hash, :fn, :ln, :role, :status); 
             END;`,
            {
                em: email,
                id: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
                hash: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
                fn: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
                ln: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
                role: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
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
                    role: userData.role
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