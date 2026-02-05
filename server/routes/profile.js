const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');
const { authenticate } = require('../middleware/auth');
const { upload, uploadToS3 } = require('../middleware/uploadMiddleware'); // <--- S3 Import

// ==========================================
// 1. UPDATE PROFILE INFO (Name & Location)
// ==========================================
router.put('/profile', authenticate, async (req, res) => {
    let connection;
    try {
        const { name, location } = req.body;
        const userId = req.user.id; // From auth middleware

        // Logic: Split "Ahmed Tamer" into First/Last name for Oracle
        let firstName = '';
        let lastName = '';
        
        if (name) {
            const parts = name.trim().split(' ');
            firstName = parts[0];
            lastName = parts.slice(1).join(' ') || ''; // " " if no last name
        }

        const city = location?.city || '';

        connection = await oracledb.getConnection();

        // Update the User in Oracle
        const sql = `
            UPDATE users 
            SET first_name = :fn, 
                last_name = :ln, 
                location_city = :city,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :uid
        `;

        await connection.execute(sql, {
            fn: firstName,
            ln: lastName,
            city: city,
            uid: userId
        }, { autoCommit: true });

        // Fetch the updated user to return to frontend
        const result = await connection.execute(
            `SELECT id, first_name, last_name, email, phone, role, profile_pic_url, location_city 
             FROM users WHERE id = :uid`,
            [userId]
        );

        const updatedUser = result.rows[0];

        // Map Oracle Array to JSON object
        const userJson = {
            id: updatedUser[0],
            name: `${updatedUser[1]} ${updatedUser[2]}`, // Recombine Name
            email: updatedUser[3],
            phone: updatedUser[4],
            role: updatedUser[5],
            avatar: updatedUser[6], // profile_pic_url
            location: { city: updatedUser[7] }
        };

        res.json({
            message: 'Profile updated successfully',
            user: userJson
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    } finally {
        if (connection) await connection.close();
    }
});

// ==========================================
// 2. UPDATE AVATAR (Image Upload)
// ==========================================
// Note: We use 'upload.single' to catch the file from the request
router.put('/profile/avatar', authenticate, upload.single('avatar'), async (req, res) => {
    let connection;
    try {
        const userId = req.user.id;
        const file = req.file; // This is the file sent from Frontend

        if (!file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        // 1. Upload to S3
        console.log("Uploading avatar to S3...");
        const avatarUrl = await uploadToS3(file, 'avatars');

        if (!avatarUrl) {
            throw new Error('S3 Upload failed');
        }

        // 2. Update Oracle Database
        connection = await oracledb.getConnection();
        
        const sql = `
            UPDATE users 
            SET profile_pic_url = :url,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :uid
        `;

        await connection.execute(sql, {
            url: avatarUrl,
            uid: userId
        }, { autoCommit: true });

        // 3. Return success
        res.json({
            message: 'Profile picture updated successfully',
            avatar: avatarUrl
        });

    } catch (error) {
        console.error('Update avatar error:', error);
        res.status(500).json({ error: 'Failed to update profile picture' });
    } finally {
        if (connection) await connection.close();
    }
});

// ==========================================
// 3. VERIFICATION ROUTES (Placeholders)
// ==========================================
// Note: These are paused because your current Oracle Schema 
// does not have 'verification_code' columns in the USERS table.
// We can add those columns later if you need SMS/Email verification.

router.post('/profile/verify-phone', authenticate, async (req, res) => {
    res.status(501).json({ message: "Phone verification pending database update." });
});

router.post('/profile/verify-email', authenticate, async (req, res) => {
    res.status(501).json({ message: "Email verification pending database update." });
});

module.exports = router;