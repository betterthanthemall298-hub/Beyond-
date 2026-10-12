/**
 * High-fidelity image processor for Beyond Store.
 * Preserves uploaded image quality at Full HD (FHD 1080p / 1920px max dimension)
 * and ultra-crisp WebP fidelity (90%), maintaining sharp fabric textures,
 * intricate garment prints, and true-to-life colors.
 */
import { storage } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Remove any legacy local storage flag that previously locked out storage
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('firebase_storage_disabled');
  } catch {}
}

/**
 * Standard Full HD (FHD) max dimension is 1920px.
 * Default quality is 0.92 (92%) for razor-sharp fabric textures, intricate prints, and vivid colors.
 */
export async function compressImageFile(
  file: File,
  maxDimension = 1920,
  quality = 0.92
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If SVG or animated GIF, read as data URL directly without modification
    if (file.type === "image/svg+xml" || (file.type === "image/gif" && file.size < 1024 * 1024)) {
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
        const originalWidth = img.naturalWidth || img.width;
        const originalHeight = img.naturalHeight || img.height;

        // If the file is already within FHD dimensions and under 600KB,
        // preserve 100% exact original file bytes without touching or re-encoding!
        if (
          originalWidth <= maxDimension &&
          originalHeight <= maxDimension &&
          file.size <= 600 * 1024 &&
          (file.type === 'image/webp' || file.type === 'image/jpeg' || file.type === 'image/png')
        ) {
          resolve(readerEvent.target?.result as string);
          return;
        }

        let width = originalWidth;
        let height = originalHeight;

        // Only downscale if the image exceeds FHD (1920px).
        // If image is already <= 1920px, keep its 100% original dimensions completely intact!
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
        const ctx = canvas.getContext("2d", { alpha: true });
        if (!ctx) {
          resolve(readerEvent.target?.result as string);
          return;
        }

        // High quality bicubic filtering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP first with high-fidelity (0.92) for crisp Full HD
        let dataUrl = canvas.toDataURL("image/webp", quality);
        if (!dataUrl.startsWith("data:image/webp")) {
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }

        // Adaptive safety: if resulting data URL is exceptionally large (> 650KB base64),
        // apply a graceful tuning pass so it stays comfortably under Firestore document limits
        if (dataUrl.length > 650000) {
          let tuned = canvas.toDataURL("image/webp", 0.88);
          if (!tuned.startsWith("data:image/webp")) {
            tuned = canvas.toDataURL("image/jpeg", 0.88);
          }
          if (tuned.length < dataUrl.length) {
            dataUrl = tuned;
          }
        }
        if (dataUrl.length > 550000) {
          let tuned = canvas.toDataURL("image/webp", 0.84);
          if (!tuned.startsWith("data:image/webp")) {
            tuned = canvas.toDataURL("image/jpeg", 0.84);
          }
          if (tuned.length < dataUrl.length) {
            dataUrl = tuned;
          }
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
 * Uploads an image with Full HD (1080p/1920px) resolution and high quality (0.92).
 * If Firebase Storage is accessible, uploads the WebP blob and returns the CDN URL;
 * otherwise instantly returns the high-fidelity inline WebP data URL.
 */
export async function uploadImageFile(
  file: File,
  maxDimension = 1920,
  quality = 0.92
): Promise<string> {
  const compressed = await compressImageFile(file, maxDimension, quality);

  try {
    const blob = dataUrlToBlob(compressed);
    const ext = blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg";
    const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const fileRef = ref(storage, path);

    // Timeout after 8s to avoid freezing the UI if Storage is unconfigured
    const uploadPromise = uploadBytes(fileRef, blob, { contentType: blob.type }).then(() => getDownloadURL(fileRef));
    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error("Storage timeout - fallback to high-res inline")), 8000)
    );

    const downloadUrl = await Promise.race([uploadPromise, timeoutPromise]);
    return downloadUrl;
  } catch (err) {
    // Graceful fallback to high-fidelity FHD inline data URL
    return compressed;
  }
}

/**
 * Compress an existing base64 string if it exceeds FHD dimensions
 */
export async function compressDataUrl(
  dataUrl: string,
  maxDimension = 1920,
  quality = 0.92
): Promise<string> {
  if (!dataUrl.startsWith("data:image")) {
    return dataUrl;
  }
  // If small already (< 100KB), return as is
  if (dataUrl.length < 120000) {
    return dataUrl;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;
      if (width <= maxDimension && height <= maxDimension) {
        resolve(dataUrl);
        return;
      }
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
      const ctx = canvas.getContext("2d", { alpha: true });
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
