const AWS = require('aws-sdk');
const crypto = require('crypto');
require('dotenv').config();

// Initialize AWS Rekognition
const rekognition = new AWS.Rekognition({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'eu-central-1'
});

// 🔴 IMPORTANT: REPLACE WITH YOUR CURRENTLY "RUNNING" MODEL ARN
const CUSTOM_MODEL_ARN = "arn:aws:rekognition:eu-central-1:666053141333:project/Egyptian-ID-Verification/version/Egyptian-ID-Verification.2026-02-10T16.14.54/1770732894857";

// ==============================================================================
// 🛡️ STAGE 2 HELPER FUNCTIONS: THE "SUPPORT CODE"
// ==============================================================================

/**
 * HELPER 1: Strict Face Position Check
 */
async function performStrictFaceCheck(imageBuffer) {
    console.log("   Addon Check 1: Verifying Face Position...");
    const faceParams = { Image: { Bytes: imageBuffer } };
    const faceResult = await rekognition.detectFaces(faceParams).promise();

    if (faceResult.FaceDetails.length === 0) {
        throw new Error("Validation Failed: We didn't find a face on the document, so rejected.");
    }

    const face = faceResult.FaceDetails.reduce((prev, current) => 
        (prev.BoundingBox.Height * prev.BoundingBox.Width > current.BoundingBox.Height * current.BoundingBox.Width) ? prev : current
    );

    console.log(`   -> Face found at position: ${face.BoundingBox.Left.toFixed(2)} (Target: < 0.55)`);

    const faceCenterPoint = face.BoundingBox.Left + (face.BoundingBox.Width / 2);
    
    if (faceCenterPoint >= 0.55) {
        throw new Error("Validation Failed: We found a face but it was on the RIGHT side (Egyptian IDs have it on the LEFT), so rejected.");
    }
    console.log("   ✅ Face Position verified.");
    return true;
}

/**
 * HELPER 2: Strict Text & Data Layout Check
 * Returns the detected text lines if successful.
 */
async function performStrictTextDataCheck(imageBuffer) {
    console.log("   Addon Check 2: Verifying Text Layout & Security Features...");
    const textParams = { Image: { Bytes: imageBuffer } };
    const textResult = await rekognition.detectText(textParams).promise();

    // ✅ CAPTURE ALL LINES for extraction later
    const detectedBlocks = textResult.TextDetections; 
    const lines = detectedBlocks.filter(t => t.Type === 'LINE').map(t => t.DetectedText);
    const fullTextString = lines.join(' ');

    // ---------------------------------------------------------
    // RULE A: The 14-Digit National ID Number
    // ---------------------------------------------------------
    const fourteenDigitRegex = /^\d{14}$/;
    const foundIdNumber = detectedBlocks.some(block => 
        block.Type === 'WORD' && fourteenDigitRegex.test(block.DetectedText)
    );

    if (!foundIdNumber) {
         const digitsOnly = fullTextString.replace(/\D/g, '');
         if (digitsOnly.length < 14 || !/\d{14}/.test(digitsOnly)) {
             console.error(`   ❌ Failed Rule A: Digits found: ${digitsOnly.substring(0,15)}...`);
             throw new Error("Validation Failed: We didn't find the 14-digit National ID number, so rejected.");
         }
         console.log("   ✅ 14-Digit ID Number found (via fallback).");
    } else {
         console.log("   ✅ 14-Digit ID Number found.");
    }

    // ---------------------------------------------------------
    // RULE B: Presence of Arabic Text
    // ---------------------------------------------------------
    const arabicRegex = /[\u0600-\u06FF]/g;
    const arabicCharacterCount = (fullTextString.match(arabicRegex) || []).length;
    
    if (arabicCharacterCount < 20) {
        throw new Error(`Validation Failed: We didn't find enough Arabic text (found ${arabicCharacterCount} chars, needed 20+), so rejected.`);
    }
    console.log("   ✅ Arabic Text Fields confirmed.");

    // ---------------------------------------------------------
    // RULE C: The 9-Character Factory Number (Bottom Left)
    // ---------------------------------------------------------
    const foundFactoryNumber = detectedBlocks.find(block => {
        const box = block.Geometry.BoundingBox;
        const isBottomLeft = box.Left < 0.45 && box.Top > 0.65;
        const cleanText = block.DetectedText.replace(/[^A-Z0-9]/gi, '');
        // Allow length 8-10 to account for minor OCR errors
        const isCorrectFormat = (cleanText.length >= 8 && cleanText.length <= 10) && /\d/.test(cleanText);
        return isBottomLeft && isCorrectFormat;
    });

    if (!foundFactoryNumber) {
        const cornerText = detectedBlocks.filter(b => b.Geometry.BoundingBox.Left < 0.45 && b.Geometry.BoundingBox.Top > 0.65)
                                         .map(b => b.DetectedText).join(', ');
        console.error(`   ❌ Failed Rule C: Text in corner was [${cornerText}]`);
        throw new Error("Validation Failed: We didn't find the Factory Number (Bottom Left), so rejected.");
    }
    console.log(`   ✅ Factory Number Found: ${foundFactoryNumber.DetectedText}`);

    // ---------------------------------------------------------
    // RULE D: Official Headers Check (Top Right)
    // ---------------------------------------------------------
    const hasRepublic = fullTextString.includes("جمهورية") && fullTextString.includes("مصر");
    const hasCardType = fullTextString.includes("بطاقة") && fullTextString.includes("تحقيق");

    if (!hasRepublic || !hasCardType) {
        console.error(`   ❌ Failed Rule D: Header status (Republic: ${hasRepublic}, CardType: ${hasCardType})`);
        throw new Error("Validation Failed: We didn't find the official headers 'جمهورية مصر العربية' or 'بطاقة تحقيق شخصية', so rejected.");
    }
    console.log("   ✅ Official Government Headers Verified.");

    // ✅ RETURN THE LINES (Crucial for data extraction)
    return lines;
}


// ==============================================================================
// 🚀 MAIN VALIDATION FUNCTION
// ==============================================================================

async function validateDocument(imageBuffer) {
    console.log("\n============================================");
    console.log("🛡️ STARTING HYBRID 2-STAGE VALIDATION");
    console.log("============================================");

    // ----- STAGE 1: AI MODEL -----
    console.log("1️⃣ STAGE 1: Custom AI Model Check...");
    try {
        const params = {
            Image: { Bytes: imageBuffer },
            ProjectVersionArn: CUSTOM_MODEL_ARN,
            MinConfidence: 65 
        };

        const result = await rekognition.detectCustomLabels(params).promise();
        const customLabels = result.CustomLabels || [];

        const match = customLabels.find(l => 
            (l.Name.toLowerCase().includes('egypt') || l.Name.toLowerCase().includes('id')) 
            && l.Confidence >= 65
        );

        if (!match) {
            console.error("❌ STAGE 1 FAILED.");
            throw new Error("Validation Failed: The AI Model didn't recognize this as an Egyptian ID, so rejected.");
        }
        console.log(`✅ STAGE 1 PASSED: Model accepted as '${match.Name}' (${Math.round(match.Confidence)}%)`);

    } catch (err) {
        if (err.code === 'ResourceNotReadyException') throw new Error("System Error: AI Model is starting, please try again in 2 minutes.");
        if (err.code === 'ResourceNotFoundException') throw new Error("System Error: Model Configuration Error (wrong ARN).");
        throw err; 
    }

    // ----- STAGE 2: STRICT LAYOUT -----
    console.log("\n2️⃣ STAGE 2: Running Strict Layout Checks...");
    try {
        // Run checks in parallel, capture the lines from the text check
        const [_, textLines] = await Promise.all([
            performStrictFaceCheck(imageBuffer),
            performStrictTextDataCheck(imageBuffer)
        ]);

        console.log("\n🎉 FINAL RESULT: All Checks Passed. Document Accepted.");
        
        // Return the lines so the controller can use them
        return textLines;

    } catch (supportError) {
        console.error(`❌ STAGE 2 FAILED: ${supportError.message}`);
        throw supportError;
    }
}

async function verifyFaceMatch(sourceBase64, targetBase64) {
    try {
        const hash1 = crypto.createHash('md5').update(sourceBase64).digest('hex');
        const hash2 = crypto.createHash('md5').update(targetBase64).digest('hex');
        if (hash1 === hash2) return { isMatch: false, message: "Security Alert: You cannot use the same image file twice." };

        const sourceBuffer = Buffer.from(sourceBase64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
        const targetBuffer = Buffer.from(targetBase64.replace(/^data:image\/\w+;base64,/, ""), 'base64');

        // 1. Run Hybrid Validation & Get Text
        const textLines = await validateDocument(sourceBuffer);

        // 2. Face Matching
        const params = {
            SourceImage: { Bytes: sourceBuffer },
            TargetImage: { Bytes: targetBuffer },
            SimilarityThreshold: 85
        };

        const result = await rekognition.compareFaces(params).promise();

        if (result.FaceMatches.length > 0) {
            return {
                isMatch: true,
                similarity: result.FaceMatches[0].Similarity,
                confidence: result.FaceMatches[0].Face.Confidence,
                extractedText: textLines // ✅ Send text back to controller
            };
        } else {
            return { isMatch: false, message: "Face verification failed. The selfie does not match the photo on the ID." };
        }

    } catch (error) {
        console.error("❌ Final Verification Error:", error.message);
        return { isMatch: false, message: error.message };
    }
}

module.exports = { verifyFaceMatch, validateDocument };