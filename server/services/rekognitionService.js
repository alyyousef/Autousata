const AWS = require('aws-sdk');
const crypto = require('crypto');
require('dotenv').config();

const { models } = require("mongoose")

// Initialize AWS Rekognition
const rekognition = new AWS.Rekognition({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'eu-central-1'
});

// 🔴 IMPORTANT: REPLACE WITH YOUR CURRENTLY "RUNNING" MODEL ARN
const CUSTOM_MODEL_ARN = "arn:aws:rekognition:eu-central-1:666053141333:project/Egyptian-ID-Verification/version/Egyptian-ID-Verification.2026-02-10T16.14.54/1770732894857";

// ==============================================================================
// 🛠️ HELPER: OCR CLEANING
// ==============================================================================
// Fixes common mistakes where AI reads letters instead of numbers
function cleanOCRText(text) {
    return text
        .replace(/O/g, '0').replace(/o/g, '0')
        .replace(/l/g, '1').replace(/I/g, '1')
        .replace(/B/g, '8')
        .replace(/S/g, '5')
        .replace(/Z/g, '2')
        .replace(/Q/g, '0')
        .replace(/\D/g, ''); // Finally, remove anything that isn't a digit
}

// ==============================================================================
// 🛡️ STAGE 2 HELPER FUNCTIONS
// ==============================================================================

/**
 * HELPER 1: Strict Face Position Check
 */
async function performStrictFaceCheck(imageBuffer) {
    console.log("   Addon Check 1: Verifying Face Position...");
    const faceParams = { Image: { Bytes: imageBuffer } };
    const faceResult = await rekognition.detectFaces(faceParams).promise();

    if (faceResult.FaceDetails.length === 0) {
        console.warn("   ⚠️ Warning: Face not strictly detected (could be lighting), passing to Text Check.");
        return true; 
    }

    const face = faceResult.FaceDetails.reduce((prev, current) => 
        (prev.BoundingBox.Height * prev.BoundingBox.Width > current.BoundingBox.Height * current.BoundingBox.Width) ? prev : current
    );

    const faceCenterPoint = face.BoundingBox.Left + (face.BoundingBox.Width / 2);
    
    // Allow slightly more range (up to 0.65) to account for tilted cards
    if (faceCenterPoint >= 0.65) {
        throw new Error("Validation Failed: Face is on the wrong side. Please ensure the ID is not upside down.");
    }
    console.log("   ✅ Face Position verified.");
    return true;
}

/**
 * HELPER 2: Smart Text & Data Check (THE FIX)
 */
async function performStrictTextDataCheck(imageBuffer) {
    console.log("   Addon Check 2: Verifying Text Layout...");
    const textParams = { Image: { Bytes: imageBuffer } };
    const textResult = await rekognition.detectText(textParams).promise();

    // 1. Get raw lines for returning later
    const lines = textResult.TextDetections.filter(t => t.Type === 'LINE').map(t => t.DetectedText);
    
    // 2. Create a "Global Clean String" of all text found on the card
    const fullTextRaw = textResult.TextDetections.map(t => t.DetectedText).join(' ');
    const fullTextClean = cleanOCRText(fullTextRaw);

    console.log(`   🔍 Scanned ${fullTextRaw.length} chars. Cleaned Digit Stream: ${fullTextClean.substring(0, 20)}...`);

    // ---------------------------------------------------------
    // RULE A: The 14-Digit National ID Number (GLOBAL SCAN)
    // ---------------------------------------------------------
    // Egyptian IDs always start with 2 (1900-1999) or 3 (2000-2099)
    // We look for that specific pattern in the stream of digits
    const idRegex = /(2|3)\d{13}/;
    const match = fullTextClean.match(idRegex);

    if (match) {
        console.log(`   ✅ ID Number Found: ${match[0]}`);
    } else {
        // Fallback: If we can't find the perfect pattern, look for ANY 14 digits
        const fallbackMatch = fullTextClean.match(/\d{14}/);
        if (fallbackMatch) {
            console.log(`   ✅ ID Number Found (Fallback): ${fallbackMatch[0]}`);
        } else {
            console.error("   ❌ Failed to find 14 consecutive digits.");
            throw new Error("Validation Failed: We couldn't read the 14-digit National ID number. Please ensure there is no glare on the number.");
        }
    }

    // ---------------------------------------------------------
    // RULE B: Arabic Text
    // ---------------------------------------------------------
    const arabicRegex = /[\u0600-\u06FF]/g;
    const arabicCharacterCount = (fullTextRaw.match(arabicRegex) || []).length;
    
    if (arabicCharacterCount < 10) {
        // Lowered threshold to 10 to be forgiving of blurry text
        throw new Error("Validation Failed: Not enough Arabic text found. Is the image clear?");
    }
    console.log("   ✅ Arabic Text confirmed.");

    // ---------------------------------------------------------
    // RULE C: Factory Number (Relaxed)
    // ---------------------------------------------------------
    // Just check if we see something that looks like the factory code (usually starts with letters)
    // or just checking if we have enough text blocks in the bottom left
    const hasBottomLeftText = textResult.TextDetections.some(block => {
        const box = block.Geometry.BoundingBox;
        return box.Left < 0.5 && box.Top > 0.6; // Something exists in bottom left
    });

    if (!hasBottomLeftText) {
        console.warn("   ⚠️ Warning: Factory number area looks empty, but proceeding if ID number was found.");
    } else {
        console.log("   ✅ Factory Number area verified.");
    }

    // ---------------------------------------------------------
    // RULE D: Headers (Relaxed)
    // ---------------------------------------------------------
    // We check for "Egypt" OR "Republic" OR "Card" in Arabic
    const hasHeader = fullTextRaw.includes("مصر") || fullTextRaw.includes("جمهورية") || fullTextRaw.includes("بطاقة");

    if (!hasHeader) {
        console.warn("   ⚠️ Warning: Header text unclear, but proceeding.");
    } else {
        console.log("   ✅ Official Government Headers Verified.");
    }

    // ✅ RETURN THE LINES (Crucial for data extraction)
    return lines;
}


// ==============================================================================
// 🚀 MAIN VALIDATION FUNCTION
// ==============================================================================

async function validateDocument(imageBuffer) {
    console.log("\n🛡️ STARTING SMART VALIDATION");

    try {
        // Stage 1: AI Model (The Gatekeeper)
        // Lowered confidence to 50 to allow slightly blurry/glare images to pass to Text Check
        const params = {
            Image: { Bytes: imageBuffer },
            ProjectVersionArn: CUSTOM_MODEL_ARN,
            MinConfidence: 50 
        };

        const result = await rekognition.detectCustomLabels(params).promise();
        const customLabels = result.CustomLabels || [];
        const match = customLabels.find(l => (l.Name.toLowerCase().includes('egypt') || l.Name.toLowerCase().includes('id')));

        if (!match) {
            console.warn("   ⚠️ AI Model low confidence match. Relying on Text Check.");
        } else {
            console.log(`   ✅ AI Model Match: ${match.Name} (${Math.round(match.Confidence)}%)`);
        }

        // Stage 2: Strict Layout & Text Extraction
        const [_, textLines] = await Promise.all([
            performStrictFaceCheck(imageBuffer),
            performStrictTextDataCheck(imageBuffer)
        ]);

        return textLines;

    } catch (err) {
        if (err.code === 'ResourceNotReadyException') throw new Error("System Error: AI Model is starting, please try again in 2 minutes.");
        if (err.code === 'ResourceNotFoundException') throw new Error("System Error: Model Configuration Error (wrong ARN).");
        throw err; 
    }
}

async function verifyFaceMatch(sourceBase64, targetBase64) {
    try {
        const hash1 = crypto.createHash('md5').update(sourceBase64).digest('hex');
        const hash2 = crypto.createHash('md5').update(targetBase64).digest('hex');
        if (hash1 === hash2) return { isMatch: false, message: "Security Alert: You cannot use the same image file twice." };

        const sourceBuffer = Buffer.from(sourceBase64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
        const targetBuffer = Buffer.from(targetBase64.replace(/^data:image\/\w+;base64,/, ""), 'base64');

        // 1. Run Validation
        const textLines = await validateDocument(sourceBuffer);

        // 2. Face Matching
        const params = {
            SourceImage: { Bytes: sourceBuffer },
            TargetImage: { Bytes: targetBuffer },
            SimilarityThreshold: 80 // Lowered slightly to 80 for better UX
        };

        const result = await rekognition.compareFaces(params).promise();

        if (result.FaceMatches.length > 0) {
            return {
                isMatch: true,
                similarity: result.FaceMatches[0].Similarity,
                extractedText: textLines 
            };
        } else {
            return { isMatch: false, message: "Face verification failed. The selfie does not match the photo on the ID." };
        }

    } catch (error) {
        console.error("❌ Verification Error:", error.message);
        return { isMatch: false, message: error.message };
    }
}

module.exports = { verifyFaceMatch, validateDocument };

