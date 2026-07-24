import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists inside the persistent data volume
// relative to this file: backend/src/routes/upload.js -> backend/uploads
const uploadDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, and PDF are allowed.'));
    }
  }
});

/**
 * Generate timestamp string in WIB (UTC+7) timezone
 * Format: DD/MM/YYYY HH:mm:ss WIB
 */
function getTimestampWIB() {
  const now = new Date();
  const wibOffset = 7 * 60; // WIB = UTC+7 in minutes
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const wibTime = new Date(utc + (wibOffset * 60000));

  const day = String(wibTime.getDate()).padStart(2, '0');
  const month = String(wibTime.getMonth() + 1).padStart(2, '0');
  const year = wibTime.getFullYear();
  const hours = String(wibTime.getHours()).padStart(2, '0');
  const minutes = String(wibTime.getMinutes()).padStart(2, '0');
  const seconds = String(wibTime.getSeconds()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds} WIB`;
}

/**
 * Add timestamp watermark to an image file using sharp
 * Positions the timestamp at the bottom-right corner with a semi-transparent background
 */
async function addTimestampWatermark(filePath) {
  const image = sharp(filePath);
  const metadata = await image.metadata();
  const { width, height } = metadata;

  // Scale font size proportionally to image dimensions (min 14px, max 36px)
  const fontSize = Math.max(14, Math.min(36, Math.round(width * 0.025)));
  const padding = Math.round(fontSize * 0.6);
  const timestamp = getTimestampWIB();

  // Estimate text width based on character count and font size
  const textWidth = Math.round(timestamp.length * fontSize * 0.6);
  const textHeight = Math.round(fontSize * 1.4);
  const boxWidth = textWidth + padding * 2;
  const boxHeight = textHeight + padding * 2;

  // SVG overlay with semi-transparent dark background and white text
  const svgOverlay = `
    <svg width="${boxWidth}" height="${boxHeight}">
      <rect x="0" y="0" width="${boxWidth}" height="${boxHeight}" rx="4" ry="4" fill="rgba(0,0,0,0.55)" />
      <text
        x="${padding}"
        y="${padding + fontSize}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${fontSize}"
        font-weight="bold"
        fill="white"
        filter="drop-shadow(1px 1px 1px rgba(0,0,0,0.5))"
      >${timestamp}</text>
    </svg>
  `;

  // Position: bottom-right corner with margin
  const margin = Math.round(width * 0.02);
  const left = Math.max(0, width - boxWidth - margin);
  const top = Math.max(0, height - boxHeight - margin);

  // Composite the watermark overlay onto the original image
  const watermarkedBuffer = await sharp(filePath)
    .composite([{
      input: Buffer.from(svgOverlay),
      top: top,
      left: left,
    }])
    .toBuffer();

  // Overwrite the original file with the watermarked version
  fs.writeFileSync(filePath, watermarkedBuffer);
}

const router = Router();

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Add timestamp watermark to image files (skip PDFs)
    const isImage = ['image/jpeg', 'image/png'].includes(req.file.mimetype);
    if (isImage) {
      try {
        await addTimestampWatermark(req.file.path);
        console.log(`Timestamp watermark added to: ${req.file.filename}`);
      } catch (watermarkErr) {
        console.error('Failed to add watermark, keeping original file:', watermarkErr.message);
        // Continue without watermark — don't block the upload
      }
    }
    
    // Create the public URL
    const fileUrl = `/uploads/${req.file.filename}`;
    
    res.json({
      success: true,
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

export default router;

