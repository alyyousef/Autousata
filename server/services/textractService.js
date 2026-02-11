const AWS = require('aws-sdk');
require('dotenv').config();

const textract = new AWS.Textract({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'eu-central-1'
});

/**
 * Extracts Name, Address, and ID Number from an Egyptian ID using AWS Textract.
 * @param {Buffer} imageBuffer - The image file buffer
 */
async function extractIDData(imageBuffer) {
    console.log("📝 Starting Textract OCR extraction...");

    const params = {
        Document: { Bytes: imageBuffer },
        FeatureTypes: ["LAYOUT"] // Use LAYOUT to understand the document structure
    };

    try {
        const data = await textract.analyzeDocument(params).promise();
        const lines = data.Blocks.filter(b => b.BlockType === 'LINE').map(b => b.Text);

        console.log("   -> Raw Text Lines Found:", lines);

        // --- PARSING LOGIC FOR EGYPTIAN ID ---
        let extractedData = {
            firstName: "",
            lastName: "",
            address: "",
            nationalId: "",
            factoryNo: ""
        };

        // 1. National ID (14 digits)
        const idRegex = /\b\d{14}\b/;
        const idLine = lines.find(l => idRegex.test(l));
        if (idLine) {
            extractedData.nationalId = idLine.match(idRegex)[0];
        }

        // 2. Name Extraction
        // The name is usually the first 2-3 lines on the right side.
        // We skip lines that contain specific keywords like "Republic", "Egypt", "Card".
        const nameKeywordsToSkip = ["جمهورية", "مصر", "العربية", "بطاقة", "تحقيق", "شخصية", "وزارة", "الداخلية"];
        
        // Filter out header lines
        const contentLines = lines.filter(line => 
            !nameKeywordsToSkip.some(keyword => line.includes(keyword))
        );

        // Assume first 2 remaining lines are the name parts
        if (contentLines.length >= 2) {
            extractedData.firstName = contentLines[0]; // First line (First Name)
            extractedData.lastName = contentLines[1];  // Second line (Father/Grandfather Name)
        }

        // 3. Address Extraction
        // Address is usually below the name lines and above the ID number.
        // It often contains numbers (street num) or words like "Street", "Gov", "Center".
        // We take the lines between the Name and the ID Number.
        const idIndex = contentLines.findIndex(l => l.includes(extractedData.nationalId));
        
        if (idIndex > 2) {
            // The lines between Name (index 0,1) and ID Number are likely the address
            // We join them with a comma
            const addressLines = contentLines.slice(2, idIndex);
            extractedData.address = addressLines.join(", ");
        } else {
             // Fallback: Just grab the 3rd and 4th lines if parsing fails
             extractedData.address = contentLines.slice(2, 4).join(", ");
        }

        console.log("   ✅ Extracted Data:", extractedData);
        return extractedData;

    } catch (error) {
        console.error("❌ Textract Error:", error);
        return null; // Don't break the whole verification if OCR fails, just return null
    }
}

module.exports = { extractIDData };