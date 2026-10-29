import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export interface UploadResult {
  downloadUrl: string;
  storagePath: string;
  isFallback: boolean;
  size: number;
}

/**
 * Resilient upload utility that handles Firebase Storage uploads with strict
 * deterministic timeout (6 seconds) and seamless high-quality DataURL fallback.
 * Prevents infinite spinners when Firebase Storage bucket is unprovisioned (404),
 * unreachable, or misconfigured.
 */
export async function uploadFileResilient(params: {
  storagePath: string;
  file: File | Blob;
  fileName?: string;
  contentType?: string;
  onProgress?: (percent: number) => void;
  timeoutMs?: number;
}): Promise<UploadResult> {
  const {
    storagePath,
    file,
    fileName = 'file',
    contentType = file.type || 'application/octet-stream',
    onProgress,
    timeoutMs = 6000,
  } = params;

  if (onProgress) onProgress(15);

  // 1. Try Firebase Cloud Storage with strict timeout race
  try {
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file, { contentType });

    const uploadPromise = new Promise<string>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snap) => {
          if (onProgress && snap.totalBytes > 0) {
            const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 85);
            onProgress(Math.max(15, Math.min(85, pct)));
          }
        },
        (error) => {
          reject(error);
        },
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          } catch (err) {
            reject(err);
          }
        }
      );
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        try {
          uploadTask.cancel();
        } catch {
          // ignore cancel error
        }
        reject(new Error(`Storage upload timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      // Clean up timer if upload settles first
      uploadPromise.finally(() => clearTimeout(timer)).catch(() => {});
    });

    const downloadUrl = await Promise.race([uploadPromise, timeoutPromise]);
    if (onProgress) onProgress(100);

    return {
      downloadUrl,
      storagePath,
      isFallback: false,
      size: file.size,
    };
  } catch (storageError: any) {
    console.warn(
      `[Storage] Upload to "${storagePath}" failed or timed out (${storageError?.code || storageError?.message}). Switching to embedded data fallback.`
    );

    // 2. Fallback: convert file to compressed DataURL for instant local/offline persistence
    if (onProgress) onProgress(60);

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file for fallback storage'));
      reader.readAsDataURL(file);
    });

    if (onProgress) onProgress(100);

    return {
      downloadUrl: dataUrl,
      storagePath: 'embedded_fallback',
      isFallback: true,
      size: file.size,
    };
  }
}
