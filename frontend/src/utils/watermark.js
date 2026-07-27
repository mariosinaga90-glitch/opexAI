export const addWatermark = (file) => {
  return new Promise((resolve, reject) => {
    // 1. Get Geolocation
    const getCoordinates = () => {
      return new Promise((res) => {
        if (!navigator.geolocation) {
          res(null);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => res({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          (err) => res(null), // On error/denial, return null
          { timeout: 5000, maximumAge: 0, enableHighAccuracy: true }
        );
      });
    };

    getCoordinates().then((coords) => {
      // 2. Read Image
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // 3. Setup Canvas
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Resize if too large (Max 1600px width/height)
          const MAX_SIZE = 1600;
          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          // Draw Original Image
          ctx.drawImage(img, 0, 0, width, height);

          // 4. Prepare Watermark Text
          const dateStr = new Date().toLocaleString('id-ID', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
          });
          
          const coordStr = coords ? `Lat: ${coords.lat.toFixed(6)}, Long: ${coords.lng.toFixed(6)}` : 'Lokasi: Tidak diizinkan/tersedia';
          const text1 = coordStr;
          const text2 = dateStr;

          // Define font size based on image size (min 14, max 40)
          const fontSize = Math.max(14, Math.min(40, Math.floor(width / 30)));
          ctx.font = `bold ${fontSize}px sans-serif`;
          
          // Calculate text dimensions
          const padding = fontSize;
          const boxHeight = (fontSize * 2.5) + padding;
          
          // 5. Draw Semi-transparent Background at the bottom
          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.fillRect(0, height - boxHeight, width, boxHeight);

          // 6. Draw Text
          ctx.fillStyle = 'white';
          ctx.shadowColor = 'black';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          
          ctx.fillText(text1, padding, height - boxHeight + padding + (fontSize * 0.8));
          ctx.fillText(text2, padding, height - boxHeight + padding + (fontSize * 2.1));

          // 7. Convert Canvas to Blob
          canvas.toBlob((blob) => {
            if (blob) {
              // Create a new file from the blob
              const watermarkedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(watermarkedFile);
            } else {
              reject(new Error('Canvas to Blob failed'));
            }
          }, 'image/jpeg', 0.85); // 85% quality JPEG
        };
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsDataURL(file);
    });
  });
};
