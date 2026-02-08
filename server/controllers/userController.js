const oracledb = require('oracledb');
const db = require('../config/db');
const { uploadToS3 } = require('../middleware/uploadMiddleware');

// ==========================================
// 1. UPDATE TEXT PROFILE
// ==========================================
async function updateProfile(req, res) {
    const userId = req.user.id; 
    const { firstName, lastName, phone, location } = req.body;
    const city = location ? location.city : null;

    let connection;

    try {
        console.log(`📝 Updating profile for User ID: ${userId}`);
        
        connection = await db.getConnection();

        const result = await connection.execute(
            `BEGIN
                sp_update_profile(:u_id, :fn, :ln, :ph, :ct, :status);
             END;`,
            {
                u_id: userId,
                fn: firstName,
                ln: lastName,
                ph: phone,
                ct: city,
                status: { dir: oracledb.BIND_OUT, type: oracledb.STRING }
            }
        );

        if (result.outBinds.status === 'SUCCESS') {
            res.json({
                message: 'Profile updated successfully',
                user: {
                    id: userId,
                    firstName,
                    lastName,
                    email: req.user.email,
                    phone,
                    location: { city },
                    role: req.user.role,
                    profileImage: req.user.profileImage
                }
            });
        } else {
            res.status(400).json({ error: 'Update failed: ' + result.outBinds.status });
        }

    } catch (err) {
        console.error('❌ Profile Update Error:', err);
        res.status(500).json({ error: 'Server error during update' });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
}

// ==========================================
// 2. UPDATE AVATAR
// ==========================================
async function updateAvatar(req, res) {
    const userId = req.user.id;
    const file = req.file; 
    let connection;

    if (!file) {
        return res.status(400).json({ error: 'No image file provided' });
    }

    try {
        console.log(`📸 Uploading avatar for User ID: ${userId}`);

        // A. Upload to AWS S3
        const avatarUrl = await uploadToS3(file, 'avatars');
        if (!avatarUrl) throw new Error('S3 Upload failed');

        // B. Update Database Record
        connection = await db.getConnection();
        
        const sql = `
            UPDATE users 
            SET profile_pic_url = :url,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :u_id
        `;

        await connection.execute(sql, {
            url: avatarUrl,
            u_id: userId
        }, { autoCommit: true });

        // C. Respond
        res.json({
            message: 'Profile picture updated successfully',
            avatar: avatarUrl
        });

    } catch (error) {
        console.error('❌ Avatar Update Error:', error);
        res.status(500).json({ error: 'Failed to update profile picture' });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
}

// ==========================================
// 3. UPLOAD KYC DOCUMENT
// ==========================================
async function uploadKYC(req, res) {
  let connection;
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }

    // 1. Upload PDF to S3 'kyc' folder
    console.log('📄 Uploading KYC Document...');
    const kycUrl = await uploadToS3(req.file, 'kyc');

    if (!kycUrl) {
      throw new Error('Failed to upload to S3');
    }

    // 2. Update User Record in DB
    connection = await oracledb.getConnection();
    
    await connection.execute(
      `UPDATE users 
       SET kyc_document_url = :kycUrl, 
           kyc_status = 'pending' 
       WHERE id = :id`,
      { kycUrl, id: req.user.id },
      { autoCommit: true }
    );

    res.json({ 
      msg: 'KYC Document uploaded successfully', 
      kycStatus: 'pending',
      kycDocumentUrl: kycUrl 
    });

  } catch (err) {
    console.error('❌ KYC Upload Error:', err);
    res.status(500).send('Server Error during KYC upload');
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { console.error(e); }
    }
  }
}

// ✅ EXPORT ALL FUNCTIONS CORRECTLY
module.exports = { 
    updateProfile, 
    updateAvatar, 
    uploadKYC 
};
