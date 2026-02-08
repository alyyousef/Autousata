const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
require('dotenv').config();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

const uploadToS3 = async (file, folder = 'profiles') => {
  if (!file) return null;
  
  // Create a UNIQUE name every time (timestamp + random number)
  const fileName = `${folder}/${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
  
  console.log(`☁️ [S3 Debug] Preparing to upload: ${fileName}`);
  console.log(`☁️ [S3 Debug] Bucket: ${process.env.AWS_BUCKET_NAME}`);

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  try {
    await s3.send(command);
    const url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    console.log(`✅ [S3 Debug] Upload Success! Link: ${url}`);
    return url;
  } catch (error) {
    console.error('❌ [S3 Debug] S3 Upload Error:', error);
    throw new Error('Image upload failed');
  }
};

module.exports = { upload, uploadToS3 };