import sharp from "sharp";

/**
 * Reduces the size and optimizes an image buffer using sharp.
 * 
 * @param buffer - The original image buffer.
 * @param maxWidth - The maximum width to resize to (maintaining aspect ratio).
 * @param quality - The compression quality (0-100).
 * @returns A promise that resolves to the optimized image buffer (as WebP).
 */
export const reduceImage = async (
  buffer: Buffer,
  maxWidth = 1200,
  quality = 80
): Promise<{ buffer: Buffer; mimeType: string; extension: string }> => {
  try {
    // We convert all uploaded images to optimized WebP format for best size/quality ratio
    const optimizedBuffer = await sharp(buffer)
      .resize({
        width: maxWidth,
        withoutEnlargement: true, // Don't scale up images that are already smaller than maxWidth
        fit: "inside", // Maintain aspect ratio
      })
      .webp({ quality }) // Convert to WebP format for optimal compression
      .toBuffer();

    return {
      buffer: optimizedBuffer,
      mimeType: "image/webp",
      extension: "webp",
    };
  } catch (error) {
    console.error("Error reducing image:", error);
    // If optimization fails (e.g. unsupported format), throw an error so the service can handle it
    throw new Error("Failed to optimize and reduce image size.");
  }
};
