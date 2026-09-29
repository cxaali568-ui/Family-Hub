/**
 * High-performance client-side image compression & thumbnail generation
 * Ensures fast upload, reduced Firebase bandwidth, and responsive album grid.
 */

export class ImageCompressionService {
  /**
   * Generates a thumbnail for gallery grid (max width/height ~400px)
   */
  async createThumbnail(
    file: File,
    maxDim: number = 400,
    quality: number = 0.8
  ): Promise<{ blob: Blob; width: number; height: number }> {
    return this.resizeImage(file, maxDim, quality);
  }

  /**
   * Generates an optimized display image if image is excessively large (max width/height ~1920px)
   */
  async optimizeDisplayImage(
    file: File,
    maxDim: number = 1920,
    quality: number = 0.85
  ): Promise<{ blob: Blob; width: number; height: number }> {
    return this.resizeImage(file, maxDim, quality);
  }

  private resizeImage(
    file: File,
    maxDim: number,
    quality: number
  ): Promise<{ blob: Blob; width: number; height: number }> {
    return new Promise((resolve, reject) => {
      // If file is not an image (e.g. text/pdf), return original
      if (!file.type.startsWith('image/')) {
        resolve({ blob: file, width: 0, height: 0 });
        return;
      }

      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        let { width, height } = img;

        if (width <= maxDim && height <= maxDim) {
          // No downsizing needed
          resolve({ blob: file, width, height });
          return;
        }

        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve({ blob: file, width, height });
          return;
        }

        // Use high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, width, height });
            } else {
              resolve({ blob: file, width, height });
            }
          },
          mime,
          quality
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        // Fallback to original file
        resolve({ blob: file, width: 0, height: 0 });
      };

      img.src = objectUrl;
    });
  }
}

export const imageCompressionService = new ImageCompressionService();
