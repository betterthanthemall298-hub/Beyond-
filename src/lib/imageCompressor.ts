/**
 * Helper to compress and resize images before uploading.
 * High-res smartphone photos (3-10MB) load slowly and add up quickly across a whole
 * catalog. This utility downscales images to a max dimension and applies JPEG
 * compression to keep them sharp, fast to load, and small.
 */

import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export async function compressImageFile(file: File, maxDimension = 900, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    // If SVG or small gif, read as data url directly if small enough
    if (file.type === 'image/svg+xml' || (file.type === 'image/gif' && file.size < 200 * 1024)) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(readerEvent.target?.result as string);
          return;
        }

        // Draw with high quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => {
        // Fallback to original data url if image decoding fails
        resolve(readerEvent.target?.result as string);
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(',');
  const mime = meta.match(/data:(.*);base64/)?.[1] || 'image/jpeg';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Compresses an image and uploads it to Firebase Storage, returning a public download URL.
 * Falls back to an inline (base64) image only if the upload itself fails, so the admin
 * is never blocked from saving just because Storage is briefly unreachable.
 */
export async function uploadImageFile(file: File, maxDimension = 1200, quality = 0.82): Promise<string> {
  const compressed = await compressImageFile(file, maxDimension, quality);
  try {
    const blob = dataUrlToBlob(compressed);
    const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/svg+xml' ? 'svg' : 'jpg';
    const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, blob, { contentType: blob.type });
    return await getDownloadURL(fileRef);
  } catch (err) {
    console.warn('Image upload to Storage failed, saving inline instead:', err);
    return compressed;
  }
}

/**
 * Compress an existing base64 string if it exceeds ~300KB
 */
export async function compressDataUrl(dataUrl: string, maxDimension = 1200, quality = 0.82): Promise<string> {
  if (!dataUrl.startsWith('data:image')) {
    return dataUrl;
  }
  // If small already (< 250KB), return as is
  if (dataUrl.length < 350000) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
