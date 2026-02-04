const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
require('dotenv').config();

// 1. Initialize S3 Client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// 2. Configure Multer (Store file in memory temporarily)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit to 5MB
  fileFilter: (req, file, cb) => {
    // Only allow images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

// 3. Helper function to upload to S3
const uploadToS3 = async (file, folder = 'profiles') => {
  if (!file) return null;

  // Create a unique file name (e.g., profiles/123456789-image.jpg)
  const fileName = `${folder}/${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
    // Remove ACL: 'public-read' if your bucket blocks public ACLs (recommended for new buckets)
  });

  try {
    await s3.send(command);
    // Construct the public URL
    return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw new Error('Image upload failed');
  }
};

module.exports = { upload, uploadToS3 };