const oracledb = require('oracledb');
const db = require('../config/db');
const { uploadToS3 } = require('../middleware/uploadMiddleware');
const { verifyFaceMatch, validateDocument } = require('../services/rekognitionService');
const { sellerlistings, garagelisting,sellerConfirmation,buyerConfirmation,buyerRefund } = require('../services/userService');

// ==========================================
// HELPER: Parse Egyptian ID Text (From Rekognition Lines)
// ==========================================
function parseIDText(lines) {
    const data = { name: "", address: "" };
    
    // Filter out obvious headers or short garbage text
    const cleanLines = lines.filter(l => 
        !l.includes("جمهورية") && !l.includes("مصر") && !l.includes("وزارة") && 
        !l.includes("بطاقة") && !l.includes("شخصية") && l.length > 3
    );

    // 1. Find ID Number Index (The anchor point)
    const idIndex = cleanLines.findIndex(l => /\d{14}/.test(l));

    if (idIndex > -1) {
        // Address is usually the 2 lines directly ABOVE the ID number
        const addressParts = cleanLines.slice(Math.max(0, idIndex - 2), idIndex);
        data.address = addressParts.join("، "); 
        
        // Name is usually the lines BEFORE the address
        const nameParts = cleanLines.slice(0, Math.max(0, idIndex - 2));
        data.name = nameParts.slice(0, 2).join(" ");
    }
    return data;
}

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
        const avatarUrl = await uploadToS3(file, 'avatars');
        if (!avatarUrl) throw new Error('S3 Upload failed');

        connection = await db.getConnection();
        
        await connection.execute(
            `UPDATE users 
             SET profile_pic_url = :url,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = :u_id`,
            { url: avatarUrl, u_id: userId },
            { autoCommit: true }
        );

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
// 3. UPLOAD KYC DOCUMENT (Legacy)
// ==========================================
async function uploadKYC(req, res) {
  let connection;
  try {
    if (!req.file) return res.status(400).json({ msg: 'No file uploaded' });

    console.log('📄 Uploading KYC Document...');
    const kycUrl = await uploadToS3(req.file, 'kyc');

    if (!kycUrl) throw new Error('Failed to upload to S3');

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

// ==========================================
// 4. VALIDATE ID STEP (AI Check)
// ==========================================
async function validateIDStep(req, res) {
    const { idImage } = req.body;
    if (!idImage) return res.status(400).json({ error: "No image provided" });

    try {
        const buffer = Buffer.from(idImage.replace(/^data:image\/\w+;base64,/, ""), 'base64');
        await validateDocument(buffer); // Throws error if invalid
        res.json({ success: true, message: "ID accepted." });
    } catch (error) {
        console.error("❌ ID Validation Failed:", error.message);
        res.status(400).json({ success: false, error: error.message });
    }
}

// ==========================================
// 5. VERIFY IDENTITY (Final Step + Text Extraction)
// ==========================================
async function verifyIdentity(req, res) {
    const { idImage, selfieImage } = req.body;
    const userId = req.user.id || req.user.userId; 

    if (!idImage || !selfieImage) return res.status(400).json({ error: "Missing images." });

    let connection;
    try {
        console.log(`🔍 Verifying User: ${userId}...`);

        // 1. Run Verification (Rekognition Service)
        const result = await verifyFaceMatch(idImage, selfieImage);

        if (result.isMatch && result.similarity > 80) {
            
            // 2. Get the Extracted Data directly from the result
            const { name, address, idNumber, factoryId } = result.extractedData || {};
            
            console.log(`   📝 Saving Data: Name=[${name}], Addr=[${address}], ID=[${idNumber}]`);

            // 3. Upload Images to S3
            const idBuffer = Buffer.from(idImage.replace(/^data:image\/\w+;base64,/, ""), 'base64');
            const selfieBuffer = Buffer.from(selfieImage.replace(/^data:image\/\w+;base64,/, ""), 'base64');

            const [kycUrl, selfieUrl] = await Promise.all([
                uploadToS3({ buffer: idBuffer, originalname: `id_${userId}.jpg`, mimetype: 'image/jpeg' }, 'kyc'),
                uploadToS3({ buffer: selfieBuffer, originalname: `selfie_${userId}.jpg`, mimetype: 'image/jpeg' }, 'kyc')
            ]);

            // 4. Update Database
            connection = await db.getConnection();
            
            // Guess a "City" for the location field (last word of address)
            const shortCity = (address && address !== "Not Detected") 
                ? address.split(" ").pop() 
                : "Cairo";

            const sql = `
                UPDATE users 
                SET kyc_status = 'verified', 
                    kyc_verified_at = CURRENT_TIMESTAMP,
                    kyc_document_url = :doc_url,
                    profile_pic_url = :selfie_url,
                    kyc_address_from_id = :addr,
                    kyc_name_from_id = :full_name,
                    location_city = NVL(location_city, :short_addr) 
                WHERE id = :u_id
            `;

            await connection.execute(sql, {
                doc_url: kycUrl,
                selfie_url: selfieUrl,
                addr: address,
                full_name: name,
                short_addr: shortCity,
                u_id: userId
            }, { autoCommit: true });

            res.json({ 
                success: true, 
                status: 'verified', 
                message: "Identity verified successfully!",
                extractedData: { name, address, idNumber }
            });

        } else {
            res.status(400).json({ success: false, error: result.message || "Face mismatch." });
        }

    } catch (error) {
        console.error("❌ Verification Error:", error.message);
        res.status(400).json({ success: false, error: error.message }); // Send error to frontend
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
}

// ==========================================
// 6. SELLER LISTINGS
// ==========================================
const sellerListingsController = async (req, res) => {
    try {
        const userId = req.user.id;
        const listings = await sellerlistings(userId);
        res.status(200).json({ data: listings });
    } catch (error) {
        console.error('Error fetching seller listings:', error);
        res.status(400).json({ error: 'Failed to fetch listings' });
    }
}

// ==========================================
// 7. GARAGE LISTINGS
// ==========================================
const garageController = async (req, res) => {
    try {
        const userId = req.user.id;
        const listings = await garagelisting(userId);
        res.status(200).json({ data: listings });
    } catch (error) {
        console.error('Error fetching garage listings:', error);
        res.status(400).json({ error: 'Failed to fetch listings' });
    }
}

const sellerTransferController=async(req,res)=>{
    try{
        const {escrow_id}=req.body;
        const result=await sellerConfirmation(escrow_id);
        res.status(200).json({message:result});
    }
    catch(error){
        console.error('Error during seller transfer:',error);
        res.status(400).json({error:'Failed to confirm transfer'});
    }
};

const buyerReceivedController=async(req,res)=>{
    try{
        const {escrow_id}=req.body;
        const result=await buyerConfirmation(escrow_id);
        res.status(200).json({message:result});
    }
    catch(error){
        console.error('Error during buyer confirmation:',error);
        res.status(400).json({error:'Failed to confirm transfer'});
    }
};

const buyerRefundController=async(req,res)=>{
    try{
        const {user_id,escrow_id,payment_id,vehicle_id,auction_id}=req.body;
        const result=await buyerRefund(user_id,escrow_id,payment_id,vehicle_id,auction_id);
        res.status(200).json({message:result});
    }
    catch(error){
        console.error('Error during buyer refund:',error);
        res.status(400).json({error:'Failed to process refund'});
    }
};

// ✅ EXPORT ALL FUNCTIONS
module.exports = { 
    updateProfile, 
    updateAvatar, 
    uploadKYC,
    validateIDStep,
    verifyIdentity,
    sellerListingsController,
    garageController,
    sellerTransferController,
    buyerReceivedController,
    buyerRefundController
};