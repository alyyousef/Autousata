const bcrypt = require('bcrypt');
const oracledb = require('oracledb');
const db = require('./config/db');
const crypto = require('crypto');
require('dotenv').config();

async function createAdminUser() {
    let connection;
    
    try {
        console.log('🔌 Initializing database pool...');
        await db.initialize();
        
        console.log('🔌 Connecting to database...');
        connection = await db.getConnection();
        
        const adminEmail = 'admin@autousata.com';
        const adminPassword = 'admin123';
        const firstName = 'Admin';
        const lastName = 'User';
        const phone = '+201000000000';
        
        console.log('🔑 Hashing password...');
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        
        console.log('👤 Creating admin user...');
        const userId = crypto.randomUUID();
        
        // Check if admin already exists and show details
        const checkResult = await connection.execute(
            'SELECT id, email, first_name, last_name, role FROM users WHERE role = :role',
            ['admin']
        );
        
        if (checkResult.rows.length > 0) {
            console.log('📋 Existing admin users:');
            checkResult.rows.forEach(row => {
                console.log(`  📧 Email: ${row[1]}`);
                console.log(`  👤 Name: ${row[2]} ${row[3]}`);
                console.log(`  🔑 Role: ${row[4]}`);
                console.log(`  🆔 ID: ${row[0]}`);
                console.log('  ---');
            });
            return;
        }
        
        // Insert admin user directly
        await connection.execute(
            `INSERT INTO users (
                id, email, phone, first_name, last_name, password_hash,
                role, email_verified, phone_verified, is_active, is_banned,
                created_at, updated_at
            ) VALUES (
                :id, :email, :phone, :first_name, :last_name, :password_hash,
                :role, '1', '1', '1', '0',
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )`,
            {
                id: userId,
                email: adminEmail,
                phone: phone,
                first_name: firstName,
                last_name: lastName,
                password_hash: hashedPassword,
                role: 'admin'
            },
            { autoCommit: true }
        );
        
        console.log('✅ Admin user created successfully!');
        console.log(`📧 Email: ${adminEmail}`);
        console.log(`🔑 Password: ${adminPassword}`);
        console.log(`👤 User ID: ${userId}`);
        
    } catch (error) {
        console.error('❌ Error creating admin user:', error);
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('🔌 Database connection closed');
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
        process.exit(0);
    }
}

createAdminUser();
