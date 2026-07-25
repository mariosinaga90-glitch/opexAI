import fs from 'fs';
import path from 'path';

import sharp from 'sharp';

// Create a large 800x600 red PNG
const pngBuffer = await sharp({
  create: {
    width: 800,
    height: 600,
    channels: 4,
    background: { r: 255, g: 0, b: 0, alpha: 1 }
  }
}).png().toBuffer();
fs.writeFileSync('test_large.png', pngBuffer);

// Upload it
const formData = new FormData();
const blob = new Blob([pngBuffer], { type: 'image/png' });
formData.append('file', blob, 'test_large.png');

fetch('http://localhost:3001/api/upload', {
  method: 'POST',
  body: formData
})
.then(res => res.json())
.then(data => {
  console.log(data);
  process.exit(0);
})
.catch(err => {
  console.error(err);
  process.exit(1);
});
