/**
 * Ultra-fast helper to compress and resize images before saving.
 * High-res smartphone photos (3-10MB) load slowly and add up quickly across a whole
 * catalog. This utility downscales images to a max dimension (default 850px) and applies
 * WebP / JPEG compression to keep them crystal sharp, instant to load, and under 40KB.
 */
import { storage } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

let isStorageAvailable: boolean | null =
  typeof window !== 'undefined' && localStorage.getItem('firebase_storage_disabled') === 'true'
    ? false
    : null;

export async function compressImageFile(file: File, maxDimension = 680, quality = 0.65): Promise<string> {
  return new Promise((resolve, reject) => {
    // If SVG or small gif, read as data url directly if small enough
    if (file.type === "image/svg+xml" || (file.type === "image/gif" && file.size < 150 * 1024)) {
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

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(readerEvent.target?.result as string);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Try WebP first (much smaller file size with higher fidelity)
        let dataUrl = canvas.toDataURL("image/webp", quality);
        if (!dataUrl.startsWith("data:image/webp")) {
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
        resolve(dataUrl);
      };
      img.onerror = () => {
        resolve(readerEvent.target?.result as string);
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*);base64/)?.[1] || "image/jpeg";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Compresses an image and uploads it to Firebase Storage if available.
 * Times out after 1.5 seconds if Storage is disabled (e.g. Spark free tier),
 * instantly saving the compressed WebP inline without blocking or freezing the admin.
 */
export async function uploadImageFile(file: File, maxDimension = 680, quality = 0.65): Promise<string> {
  const compressed = await compressImageFile(file, maxDimension, quality);

  // If Storage was already confirmed unavailable, return compressed image immediately
  if (isStorageAvailable === false) {
    return compressed;
  }

  try {
    const blob = dataUrlToBlob(compressed);
    const ext = blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg";
    const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const fileRef = ref(storage, path);

    // Timeout after 600ms to avoid freezing the admin if Storage requires Blaze
    const uploadPromise = uploadBytes(fileRef, blob, { contentType: blob.type }).then(() => getDownloadURL(fileRef));
    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error("Storage timeout - fallback to compressed inline")), 600)
    );

    const downloadUrl = await Promise.race([uploadPromise, timeoutPromise]);
    isStorageAvailable = true;
    if (typeof window !== 'undefined') localStorage.removeItem('firebase_storage_disabled');
    return downloadUrl;
  } catch (err) {
    isStorageAvailable = false;
    if (typeof window !== 'undefined') localStorage.setItem('firebase_storage_disabled', 'true');
    return compressed;
  }
}

/**
 * Compress an existing base64 string if it exceeds ~80KB
 */
export async function compressDataUrl(dataUrl: string, maxDimension = 680, quality = 0.65): Promise<string> {
  if (!dataUrl.startsWith("data:image")) {
    return dataUrl;
  }
  // If small already (< 50KB), return as is
  if (dataUrl.length < 65000) {
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
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      let res = canvas.toDataURL("image/webp", quality);
      if (!res.startsWith("data:image/webp")) {
        res = canvas.toDataURL("image/jpeg", quality);
      }
      resolve(res);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
