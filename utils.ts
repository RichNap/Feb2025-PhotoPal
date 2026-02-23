export const generateFileId = (file: File, path?: string): string => {
    const cleanPath = path || file.webkitRelativePath || file.name;
    return `${cleanPath}-${file.size}-${file.lastModified}`;
};

/**
 * generateFileSignature: A persistent identifier based on data footprint.
 * Survives OS-level timestamp drift (e.g. unzipping Google Takeout).
 */
export const generateFileSignature = (file: { name: string, size: number }, path?: string): string => {
    const cleanPath = path || (file as any).webkitRelativePath || file.name;
    return `${cleanPath}_${file.size}`;
};

export const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

export const shuffle = <T,>(array: T[]): T[] => {
  const next = [...array];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

/**
 * getRotationFromExif: Maps EXIF orientation values (1-8) to degrees and flip status.
 */
export const getRotationFromExif = (orientation?: number): { deg: number; flipped: boolean } => {
    if (!orientation || orientation <= 1) return { deg: 0, flipped: false };
    switch (orientation) {
        case 3: return { deg: 180, flipped: false };
        case 6: return { deg: 90, flipped: true };
        case 8: return { deg: 270, flipped: true };
        case 2: return { deg: 0, flipped: false }; 
        case 4: return { deg: 180, flipped: false }; 
        case 5: return { deg: 90, flipped: true }; 
        case 7: return { deg: 270, flipped: true }; 
        default: return { deg: 0, flipped: false };
    }
};

/**
 * getProxyUrl: Bypasses CORS/Referer locks for professional web assets.
 */
export const getProxyUrl = (url: string, width?: number): string => {
    if (!url) return '';
    if (url.startsWith('blob:') || url.startsWith('data:')) return url;
    
    const cleanUrl = url.replace(/^https?:\/\//, '');
    let proxy = `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&default=ssl:raw.githubusercontent.com/google-fonts/icons/main/angular/photo_library/materialicons/24px.svg`;
    
    if (width) proxy += `&w=${width}&fit=cover`;
    
    return proxy;
};

/**
 * extractBasenameFromId: Optimized filename extraction for ID reconciliation.
 * v2.2: Simplified slice logic for high-frequency reconciliation passes.
 */
export const extractBasenameFromId = (id: string) => {
    if (!id) return '';
    
    // 1. Isolate the filename from any path segments
    const lastSlash = Math.max(id.lastIndexOf('/'), id.lastIndexOf('\\'));
    let namePart = lastSlash !== -1 ? id.substring(lastSlash + 1) : id;
    
    // 2. Strip the standard '-size-timestamp' suffix
    // Instead of regex, use lastIndexOf for high-performance loops
    const firstSuffixDash = namePart.lastIndexOf('-', namePart.lastIndexOf('-') - 1);
    if (firstSuffixDash !== -1 && !isNaN(parseInt(namePart.charAt(firstSuffixDash + 1)))) {
        return namePart.substring(0, firstSuffixDash);
    }
    
    return namePart;
};

export const isVideoFile = (name: string): boolean => {
    const ext = name.split('.').pop()?.toLowerCase();
    return ['mp4', 'mov', 'webm', 'avi', 'm4v', '3gp'].includes(ext || '');
};

export const normalizeBox = (box: [number, number, number, number]): [number, number, number, number] => {
    return box;
};

export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denom = (Math.sqrt(normA) * Math.sqrt(normB));
  return denom === 0 ? 0 : dotProduct / denom;
};

export const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export const averageEmbedding = (embeddings: number[][]): number[] => {
    if (embeddings.length === 0) return [];
    const len = embeddings[0].length;
    const avg = new Array(len).fill(0);
    embeddings.forEach(emb => {
        for (let i = 0; i < len; i++) avg[i] += emb[i];
    });
    return avg.map(v => v / embeddings.length);
};

export const generateUUID = (): string => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const pruneEmbeddings = (existing: number[][], newEmbs: number[][], limit: number): number[][] => {
    const combined = [...existing, ...newEmbs];
    if (combined.length <= limit) return combined;
    return combined.slice(-limit);
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const getTimestamp = (): string => {
    return new Date().toLocaleTimeString();
};

export const isMediaFile = (name: string): boolean => {
    const ext = name.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'tiff', 'gif', 'mp4', 'mov', 'webm', 'm4v', '3gp'].includes(ext || '');
};

export const debugLog = (msg: string) => console.log(`[DEBUG] ${msg}`);

/**
 * yieldToMain: High-performance thread yielding.
 * Processes in chunks to reduce context switching overhead.
 * v6.0: Uses requestIdleCallback with setTimeout fallback.
 */
export const yieldToMain = async (currentIndex: number, chunkSize: number = 500): Promise<void> => {
    if (currentIndex % chunkSize === 0) {
        if ('requestIdleCallback' in window) {
            return new Promise(resolve => (window as any).requestIdleCallback(() => resolve()));
        }
        return new Promise(resolve => setTimeout(resolve, 0));
    }
};

export const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
};