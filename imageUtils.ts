
import { debugLog } from './utils';
import * as db from './db';

/**
 * Generates an optimized Blob strictly under the hardware buffer limit.
 * Implements a robust fallback protocol for CORS/Canvas restrictions.
 */
export const generateOptimizedBlob = async (
    file: File, 
    quality: number = 0.6,
    maxWidth: number = 1280
): Promise<Blob> => {
    let source: ImageBitmap | HTMLImageElement | null = null;
    let objectUrl: string | null = null;

    try {
        try {
           source = await createImageBitmap(file);
        } catch (e) {
           source = new Image();
           objectUrl = URL.createObjectURL(file);
           source.src = objectUrl;
           await new Promise((res, rej) => {
               (source as HTMLImageElement).onload = res;
               (source as HTMLImageElement).onerror = () => rej(new Error("Browser image decoder failed"));
           });
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Canvas context initialization failed");

        const originalWidth = (source as any).width || (source as any).naturalWidth;
        const originalHeight = (source as any).height || (source as any).naturalHeight;
        
        const scale = Math.min(1, maxWidth / originalWidth);
        canvas.width = originalWidth * scale;
        canvas.height = originalHeight * scale;
        
        ctx.drawImage(source as any, 0, 0, canvas.width, canvas.height);
        
        return await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error("Canvas toBlob serialization failed"));
            }, 'image/jpeg', quality);
        });

    } catch (err) {
        console.warn("[Optimization] Hardware resize bypassed. Fallback to raw file.", err);
        return file;
    } finally {
        if (source instanceof ImageBitmap) source.close();
        if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
};

/**
 * getCachedThumbnail: Fast LOD resolution for Grid/Gallery views.
 * Attempts to retrieve from DB, else generates and saves.
 */
export const getCachedThumbnail = async (id: string, file: File, size: number = 300): Promise<string> => {
    // 1. Check persistent cache
    const cached = await db.getThumbnail(id);
    if (cached) return URL.createObjectURL(cached);

    // 2. Generate new if missing
    try {
        const thumbBlob = await generateOptimizedBlob(file, 0.75, size);
        await db.saveThumbnail(id, thumbBlob);
        return URL.createObjectURL(thumbBlob);
    } catch (e) {
        return URL.createObjectURL(file);
    }
};

/**
 * Legacy support for DataURI if needed for small assets (< 32KB)
 */
export const generateOptimizedDataUri = async (file: File, maxLength: number, mimeType: string): Promise<string> => {
    const blob = await generateOptimizedBlob(file, 0.5, 800);
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
    });
};
