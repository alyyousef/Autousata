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
// These only run if the AI model passes first.
// ==============================================================================

/**
 * HELPER 1: Strict Face Position Check
 * Ensures a face exists and is located on the LEFT side of the card.
 */
async function performStrictFaceCheck(imageBuffer) {
    console.log("   Addon Check 1: Verifying Face Position...");
    const faceParams = { Image: { Bytes: imageBuffer } };
    const faceResult = await rekognition.detectFaces(faceParams).promise();

    if (faceResult.FaceDetails.length === 0) {
        throw new Error("Validation Failed: No face detected on the document.");
    }

    // Get the largest/most prominent face
    const face = faceResult.FaceDetails.reduce((prev, current) => 
        (prev.BoundingBox.Height * prev.BoundingBox.Width > current.BoundingBox.Height * current.BoundingBox.Width) ? prev : current
    );

    console.log(`   -> Face found at horizontal position: ${face.BoundingBox.Left.toFixed(2)} (0.0=Left, 1.0=Right)`);

    // AWS coordinates: 0.0 is far left, 1.0 is far right.
    // The center point of the face should be in the left half (< 0.5).
    const faceCenterPoint = face.BoundingBox.Left + (face.BoundingBox.Width / 2);
    
    // We give a little padding, so < 0.55 means it's generally on the left side.
    if (faceCenterPoint >= 0.55) {
        throw new Error("Validation Failed: Face detected on the wrong side. Egyptian IDs have the photo on the left.");
    }
    console.log("   ✅ Face Position verified (Left Side).");
    return true;
}

/**
 * HELPER 2: Strict Text & Data Layout Check
 * Verifies Arabic text presence and the critical 14-digit number.
 */
async function performStrictTextDataCheck(imageBuffer) {
    console.log("   Addon Check 2: Verifying Text & 14-Digit ID...");
    const textParams = { Image: { Bytes: imageBuffer } };
    const textResult = await rekognition.detectText(textParams).promise();

    // 1. Extract all detected text (Fixed Typo Here)
    const detectedBlocks = textResult.TextDetections; 
    const fullTextString = detectedBlocks.map(t => t.DetectedText).join(' ');

    // --- Rule B: The 14-Digit National ID Number ---
    // We look for a distinct "WORD" block that is exactly 14 digits.
    const fourteenDigitRegex = /^\d{14}$/;
    const foundIdNumber = detectedBlocks.some(block => 
        block.Type === 'WORD' && fourteenDigitRegex.test(block.DetectedText)
    );

    if (!foundIdNumber) {
         // Fallback check: sometimes OCR adds spaces (e.g., "2990101 1234567"). 
         // Strip spaces from the whole text and look for a 14-digit sequence.
         const digitsOnly = fullTextString.replace(/\D/g, '');
         // We need at least one sequence of 14 digits to exist.
         if (digitsOnly.length < 14 || !/\d{14}/.test(digitsOnly)) {
             console.error("   ❌ 14-digit number missing. Digits found:", digitsOnly.substring(0, 20) + "...");
             throw new Error("Validation Failed: The required 14-digit National ID number was not found at the bottom of the card.");
         }
         console.log("   ✅ 14-Digit ID Number found (via fallback numeric scan).");
    } else {
         console.log("   ✅ 14-Digit ID Number found distinctly.");
    }


    // --- Rule C: Presence of Arabic Text Fields (Name/Address) ---
    // We don't need to read the exact name, but we must ensure there is a significant 
    // amount of Arabic characters, which corresponds to the Name and Address lines.
    // Arabic Unicode range: \u0600-\u06FF
    const arabicRegex = /[\u0600-\u06FF]/g;
    const arabicCharacterCount = (fullTextString.match(arabicRegex) || []).length;
    
    console.log(`   -> Found ${arabicCharacterCount} Arabic characters.`);

    // Threshold: An ID should easily have 20+ Arabic characters.
    if (arabicCharacterCount < 20) {
        throw new Error("Please Put an Egyptian ID");
    }
    console.log("   ✅ Arabic Text Fields confirmed.");

    return true;
}


// ==============================================================================
// 🚀 MAIN VALIDATION FUNCTION (The Hybrid Controller)
// ==============================================================================

async function validateDocument(imageBuffer) {
    console.log("\n============================================");
    console.log("🛡️ STARTING HYBRID 2-STAGE VALIDATION");
    console.log("============================================");

    // ----- STAGE 1: THE AI MODEL GATEKEEPER -----
    console.log("1️⃣ STAGE 1: Custom AI Model Check...");
    try {
        const params = {
            Image: { Bytes: imageBuffer },
            ProjectVersionArn: CUSTOM_MODEL_ARN,
            MinConfidence: 65 // Confidence Threshold
        };

        const result = await rekognition.detectCustomLabels(params).promise();
        const customLabels = result.CustomLabels || [];

        const match = customLabels.find(l => 
            (l.Name.toLowerCase().includes('egypt') || l.Name.toLowerCase().includes('id')) 
            && l.Confidence >= 65
        );

        if (!match) {
            // 🚨 STAGE 1 FAILED - REJECT IMMEDIATELY
            console.error("❌ STAGE 1 FAILED: AI Model did not accept the document.");
            if (customLabels.length > 0) {
                 console.log(`   (Model saw: ${customLabels.map(l => `${l.Name} @ ${Math.round(l.Confidence)}%`).join(', ')})`);
            }
            throw new Error("Verification Failed: Our AI system does not recognize this as a valid Egyptian ID.");
        }

        console.log(`✅ STAGE 1 PASSED: Model accepted as '${match.Name}' (${Math.round(match.Confidence)}%)`);

    } catch (err) {
        // Catch AWS system errors specifically
        if (err.code === 'ResourceNotReadyException') throw new Error("System Error: AI Model is starting, please try again in 2 minutes.");
        if (err.code === 'ResourceNotFoundException') throw new Error("System Error: Model Configuration Error (wrong ARN).");
        // Throw validation error back up
        throw err; 
    }


    // ----- STAGE 2: THE SUPPORT CODE (STRICT LAYOUT CHECK) -----
    // This only runs if Stage 1 passed without throwing an error.
    console.log("\n2️⃣ STAGE 2: Running Strict Layout & Data Support Code...");
    try {
        // Run both checks in parallel for speed
        await Promise.all([
            performStrictFaceCheck(imageBuffer),
            performStrictTextDataCheck(imageBuffer)
        ]);

        console.log("\n🎉 FINAL RESULT: All Checks Passed. Document Accepted.");
        return true;

    } catch (supportError) {
        // 🚨 STAGE 2 FAILED - REJECT
        // Even though the AI liked it, it failed the strict rules.
        console.error(`❌ STAGE 2 FAILED: ${supportError.message}`);
        // Re-throw the specific error message from the support code
        throw supportError;
    }
}


/**
 * MAIN VERIFICATION FLOW (Unchanged, just calls the new validateDocument)
 */
async function verifyFaceMatch(sourceBase64, targetBase64) {
    try {
        // 0. Hash Check
        const hash1 = crypto.createHash('md5').update(sourceBase64).digest('hex');
        const hash2 = crypto.createHash('md5').update(targetBase64).digest('hex');
        if (hash1 === hash2) return { isMatch: false, message: "Security Alert: You cannot use the same image file twice." };

        const sourceBuffer = Buffer.from(sourceBase64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
        const targetBuffer = Buffer.from(targetBase64.replace(/^data:image\/\w+;base64,/, ""), 'base64');

        // 1. Run the new Hybrid Validation
        await validateDocument(sourceBuffer);

        // 2. Face Matching (Only happens if Step 1 passes)
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
                confidence: result.FaceMatches[0].Face.Confidence
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