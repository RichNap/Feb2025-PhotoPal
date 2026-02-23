import type { MediaFile, PlaybackMode, ForensicData } from './types';

// Advanced Heuristic Patterns
const YEAR_PATTERN = /\b(19|20)\d{2}\b/;
const MONTH_PATTERN = /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/i;
const SEASON_PATTERN = /\b(spring|summer|fall|autumn|winter|xmas|christmas)/i;

const FILENAME_DATE_PATTERN = /\b(19|20)\d{2}[-_]?(0[1-9]|1[0-2])[-_]?(0[1-9]|[12]\d|3[01])\b/;
const MESSAGING_DATE_PATTERN = /(?:whatsapp|signal)[-_]image[-_]((?:19|20)\d{2})[-_]?(0[1-9]|1[0-2])[-_]?(0[1-9]|[12]\d|3[01])/i;
const SCREENSHOT_PATTERN = /screenshot[-_]?((?:19|20)\d{2})[-_]?(0[1-9]|1[0-2])[-_]?(0[1-9]|[12]\d|3[01])/i;
const EPOCH_STAMP_PATTERN = /\b(1[2-7]\d{8,11})\b/;

const INVALID_DATE_STRINGS = new Set([
    '0000:00:00 00:00:00',
    '0000:00:00',
    '0000-00-00',
    '    :  :     :  :  ',
    '0001:01:01',
    '1970:01:01',
    '2000:01:01 00:00:00', // Common CMOS reset
    '2000:01:01'
]);

const MONTH_MAP: Record<string, number> = {
    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
    'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
};

const SEASON_MAP: Record<string, [number, number]> = {
    'spring': [2, 4], 'summer': [5, 7], 'fall': [8, 10], 'autumn': [8, 10],
    'winter': [11, 1], 'xmas': [11, 11], 'christmas': [11, 11]
};

const dateComponentCache = new Map<number, { m: number, d: number }>();

export interface DateForensics {
    date: Date | null;
    confidence: number;
    source: 'EXIF' | 'FILENAME' | 'FOLDER' | 'SYSTEM' | 'USER_DEFINED' | 'INFERRED' | 'EXIF_COMPARATIVE';
}

class DateResolutionEngine {
    public isSaneDate(d: Date): boolean {
        if (!d || isNaN(d.getTime())) return false;
        const year = d.getFullYear();
        if (year <= 1970) return false;
        
        // Block 2000-01-01 (Common hardware default/reset date)
        if (year === 2000 && d.getMonth() === 0 && d.getDate() === 1) return false;
        
        const tenYearsFuture = Date.now() + (10 * 365 * 24 * 60 * 60 * 1000);
        if (d.getTime() > tenYearsFuture) return false; 
        return true;
    }

    public isInsaneString(val: any): boolean {
        if (typeof val !== 'string') return false;
        const trimmed = val.trim();
        return INVALID_DATE_STRINGS.has(trimmed) || trimmed.startsWith('0000');
    }

    public extractYearFromPath(path?: string): number | null {
        if (!path) return null;
        const segments = path.split(/[/\\]/);
        for (let i = segments.length - 2; i >= 0; i--) {
            const match = segments[i].match(YEAR_PATTERN);
            if (match) return parseInt(match[0], 10);
        }
        return null;
    }

    public extractYearFromFilename(name: string): number | null {
        const match = name.match(YEAR_PATTERN);
        if (match) return parseInt(match[0], 10);
        return null;
    }

    public parseFilename(name: string): Date | null {
        if (!name) return null;
        const lowName = name.toLowerCase();
        const msgMatch = lowName.match(MESSAGING_DATE_PATTERN);
        if (msgMatch) {
            const res = new Date(parseInt(msgMatch[1]), parseInt(msgMatch[2]) - 1, parseInt(msgMatch[3]));
            if (this.isSaneDate(res)) return res;
        }
        const ssMatch = lowName.match(SCREENSHOT_PATTERN);
        if (ssMatch) {
            const res = new Date(parseInt(ssMatch[1]), parseInt(ssMatch[2]) - 1, parseInt(ssMatch[3]));
            if (this.isSaneDate(res)) return res;
        }
        const stdMatch = name.match(FILENAME_DATE_PATTERN);
        if (stdMatch) {
            const raw = stdMatch[0].replace(/[-_]/g, '');
            const y = parseInt(raw.substring(0, 4));
            const m = parseInt(raw.substring(4, 6)) - 1;
            const d = parseInt(raw.substring(6, 8));
            const resolved = new Date(y, m, d);
            if (this.isSaneDate(resolved)) return resolved;
        }
        const epochMatch = name.match(EPOCH_STAMP_PATTERN);
        if (epochMatch) {
            let val = parseInt(epochMatch[1], 10);
            if (val < 10000000000) val *= 1000;
            const res = new Date(val);
            if (this.isSaneDate(res)) return res;
        }
        return null;
    }

    public parseFolderName(folderName: string, folderHint?: Date | null): Date | null {
        if (!folderName) return null;
        const dateMatch = folderName.match(FILENAME_DATE_PATTERN);
        if (dateMatch) {
            const raw = dateMatch[0].replace(/[-_]/g, '');
            const res = new Date(parseInt(raw.substring(0, 4)), parseInt(raw.substring(4, 6)) - 1, parseInt(raw.substring(6, 8)));
            if (this.isSaneDate(res)) return res;
        }
        const yearMatch = folderName.match(YEAR_PATTERN);
        if (!yearMatch) return null;
        const startYear = parseInt(yearMatch[0], 10);
        let startMonth = 0; 
        const monthMatch = folderName.match(MONTH_PATTERN);
        const seasonMatch = folderName.match(SEASON_PATTERN);
        if (monthMatch) {
            const prefix = monthMatch[0].toLowerCase().substring(0, 3);
            startMonth = MONTH_MAP[prefix] ?? 0;
        } else if (seasonMatch) {
            const seasonKey = seasonMatch[0].toLowerCase();
            const range = SEASON_MAP[seasonKey];
            if (range) {
                if (seasonKey === 'winter' && folderHint) { startMonth = folderHint.getMonth() <= 2 ? 0 : 11; }
                else { startMonth = range[0]; }
            }
        }
        const resolved = new Date(startYear, startMonth, 1);
        return this.isSaneDate(resolved) ? resolved : null;
    }

    public resolveOldestSaneExifDate(exif: any): { date: Date; isComparative: boolean } | null {
        if (!exif) return null;
        // v1.8.1: Prioritize ModifyDate as the primary "most accurate" source per user request.
        // We still check others if ModifyDate is missing or insane.
        const tags = ['ModifyDate', 'DateTimeOriginal', 'CreateDate'];
        let bestDate: Date | null = null;
        let sourceTag: string | null = null;

        for (const tag of tags) {
            const val = exif[tag];
            if (val && !this.isInsaneString(val)) {
                const d = new Date(val);
                if (this.isSaneDate(d)) {
                    bestDate = d;
                    sourceTag = tag;
                    break; // Found the prioritized "most accurate" date
                }
            }
        }

        if (!bestDate) return null;
        return { date: bestDate, isComparative: sourceTag !== 'DateTimeOriginal' };
    }
}

const engine = new DateResolutionEngine();
const mediaForensicsCache = new Map<string, DateForensics>();

export const resolveDateForensics = (media: MediaFile, folderAnchor?: Date | null): DateForensics => {
    if (!media) return { date: null, confidence: 0, source: 'SYSTEM' };
    
    if (mediaForensicsCache.has(media.id)) {
        const cached = mediaForensicsCache.get(media.id)!;
        if (media.aiData?.forensic?.suggestedTimestamp && cached.source !== 'USER_DEFINED' && cached.source !== 'EXIF' && cached.source !== 'EXIF_COMPARATIVE') {
             mediaForensicsCache.delete(media.id);
        } else {
             return cached;
        }
    }

    // v1.8.2: Pre-calculate candidates for conditional weighting
    const exifForensic = media.exif ? engine.resolveOldestSaneExifDate(media.exif) : null;
    
    let folderDate: Date | null = null;
    const path = media.file?.webkitRelativePath || media.url || '';
    const segments = path.split(/[/\\]/);
    for (let i = segments.length - 2; i >= Math.max(0, segments.length - 5); i--) {
        const d = engine.parseFolderName(segments[i], folderAnchor);
        if (d) {
            folderDate = d;
            break;
        }
    }

    // v1.8.2: The "Mistake Correction" Logic
    // "Only if EXIF is older than Folder Context, then EXIF has top priority"
    const useExifAsTopPriority = exifForensic && folderDate && exifForensic.date.getTime() < folderDate.getTime();

    if (useExifAsTopPriority && exifForensic) {
        const forensics: DateForensics = { 
            date: exifForensic.date, 
            confidence: 1.0, 
            source: exifForensic.isComparative ? 'EXIF_COMPARATIVE' : 'EXIF' 
        };
        mediaForensicsCache.set(media.id, forensics);
        return forensics;
    }

    let result: Date | null = null;
    let confidence = 0;
    let source: DateForensics['source'] = 'SYSTEM';

    // Tier 1: User / AI Suggestion (Always high if present)
    if (media.aiData?.forensic?.suggestedTimestamp) {
        result = new Date(media.aiData.forensic.suggestedTimestamp);
        confidence = 1.0; 
        source = 'USER_DEFINED';
    }

    // Tier 2: Filename Parsing
    if ((!result || !engine.isSaneDate(result)) && media.file?.name) {
        result = engine.parseFilename(media.file.name);
        if (result) {
            confidence = 0.90;
            source = 'FILENAME';
        }
    }

    // Tier 3: Folder Context
    if ((!result || !engine.isSaneDate(result)) && folderDate) {
        result = folderDate;
        confidence = 0.85;
        source = 'FOLDER';
    }

    // Tier 4: EXIF (Fallback if not used as top priority)
    if ((!result || !engine.isSaneDate(result)) && exifForensic) {
        result = exifForensic.date;
        confidence = 0.80;
        source = exifForensic.isComparative ? 'EXIF_COMPARATIVE' : 'EXIF';
    }

    // Tier 5: Filename Year Fallback
    if ((!result || !engine.isSaneDate(result)) && media.file?.name) {
        const y = engine.extractYearFromFilename(media.file.name);
        if (y) {
            result = new Date(y, 0, 1);
            confidence = 0.70;
            source = 'FILENAME';
        }
    }

    // Tier 6: System File Stats
    if (!result || !engine.isSaneDate(result)) {
        const statsDate = new Date(media.file.lastModified);
        if (engine.isSaneDate(statsDate)) {
            result = statsDate;
            confidence = 0.25;
            source = 'SYSTEM';
        } else {
            result = new Date(1980, 0, 1);
            confidence = 0.10;
            source = 'SYSTEM';
        }
    }

    const forensics: DateForensics = { date: result, confidence, source };
    mediaForensicsCache.set(media.id, forensics);
    return forensics;
};

export const getDateFromMedia = (media: MediaFile, folderAnchor?: Date | null): Date | null => {
    return resolveDateForensics(media, folderAnchor).date;
};

export const recoverTemporalContext = async (files: MediaFile[], onProgress?: (percent: number) => void) => {
    const folderGroups = new Map<string, MediaFile[]>();
    files.forEach(f => {
        const path = f.file.webkitRelativePath || f.file.name;
        const dir = path.split(/[/\\]/).slice(0, -1).join('/') || 'Root';
        const group = folderGroups.get(dir) || [];
        group.push(f);
        folderGroups.set(dir, group);
    });

    const groups = Array.from(folderGroups.entries());
    const CHUNK_SIZE = 100; // v5.9.1: Increased chunk size
    let lastUiUpdate = 0;
    
    for (let i = 0; i < groups.length; i += CHUNK_SIZE) {
        const chunk = groups.slice(i, i + CHUNK_SIZE);
        
        chunk.forEach(([dir, group]) => {
            let anchor: Date | null = null;
            for (const f of group) {
                const d = getDateFromMedia(f);
                if (d && engine.isSaneDate(d)) { anchor = d; break; }
            }
            group.forEach(f => {
                const resolved = resolveDateForensics(f, anchor);
                if (resolved.date) f.timestamp = resolved.date.getTime();
            });
        });

        const now = performance.now();
        if (onProgress && (now - lastUiUpdate > 500 || i === 0 || i + CHUNK_SIZE >= groups.length)) {
            onProgress(Math.round((i / groups.length) * 100));
            lastUiUpdate = now;
            // Yield to main thread
            await new Promise(r => setTimeout(r, 0));
        }
    }
    
    if (onProgress) onProgress(100);
};

const getCachedDateParts = (ts: number) => {
    let parts = dateComponentCache.get(ts);
    if (!parts) {
        const date = new Date(ts);
        parts = { m: date.getMonth(), d: date.getDate() };
        dateComponentCache.set(ts, parts);
    }
    return parts;
};

export const getPlaybackOrder = (mode: PlaybackMode, indices: number[], mediaFiles: MediaFile[]): number[] => {
    const list = [...indices];
    switch (mode) {
        case 'story_arc': return list.sort((a, b) => (mediaFiles[a]?.timestamp || 0) - (mediaFiles[b]?.timestamp || 0) || a - b);
        case 'linear': return list.sort((a, b) => (mediaFiles[a]?.file?.name || '').localeCompare(mediaFiles[b]?.file?.name || '') || a - b);
        case 'oldest': return list.sort((a, b) => (mediaFiles[a]?.timestamp || 0) - (mediaFiles[b]?.timestamp || 0) || a - b);
        case 'newest': return list.sort((a, b) => (mediaFiles[b]?.timestamp || 0) - (mediaFiles[a]?.timestamp || 0) || b - a);
        case 'random': 
            // v1.8.0: Deterministic shuffle based on file ID to prevent reshuffling on metadata updates
            return list.sort((a, b) => {
                const idA = mediaFiles[a]?.id || '';
                const idB = mediaFiles[b]?.id || '';
                // Simple hash-based stable sort
                let h1 = 0, h2 = 0;
                for (let i = 0; i < idA.length; i++) h1 = ((h1 << 5) - h1) + idA.charCodeAt(i);
                for (let i = 0; i < idB.length; i++) h2 = ((h2 << 5) - h2) + idB.charCodeAt(i);
                return h1 - h2;
            });
        case 'on_this_day':
            const today = new Date();
            const targetMonth = today.getMonth();
            const targetDay = today.getDate();
            return list.filter(idx => {
                const ts = mediaFiles[idx]?.timestamp;
                if (!ts) return false;
                const p = getCachedDateParts(ts);
                return p.m === targetMonth && p.d === targetDay;
            }).sort((a, b) => (mediaFiles[b]?.timestamp || 0) - (mediaFiles[a]?.timestamp || 0) || b - a);
        case 'directory':
            return list.sort((a, b) => {
                const pathA = mediaFiles[a]?.url || '';
                const pathB = mediaFiles[b]?.url || '';
                return pathA.localeCompare(pathB) || a - b;
            });
        default: return list;
    }
};

export const calculateJumpIndex = (
    currentIndex: number, 
    playbackOrder: number[], 
    mediaFiles: MediaFile[], 
    playbackMode: PlaybackMode, 
    direction: 'forward' | 'rewind'
): { index: number; message: string } => {
    const len = playbackOrder.length;
    if (len === 0) return { index: 0, message: 'Queue Empty' };
    
    const currentFile = mediaFiles[playbackOrder[currentIndex]];
    if (!currentFile) return { index: 0, message: 'Error' };

    // v1.8.0: Context-Aware "Chapter" Jumping
    if (playbackMode === 'directory') {
        const currentDir = (currentFile.url || '').split(/[/\\]/).slice(0, -1).join('/');
        let targetIdx = currentIndex;
        const step = direction === 'forward' ? 1 : -1;

        while (true) {
            targetIdx = (targetIdx + step + len) % len;
            if (targetIdx === currentIndex) break; // Wrapped around
            
            const candidate = mediaFiles[playbackOrder[targetIdx]];
            const candidateDir = (candidate?.url || '').split(/[/\\]/).slice(0, -1).join('/');
            
            if (candidateDir !== currentDir) {
                // If rewinding, we want to find the START of the previous directory
                if (direction === 'rewind') {
                    let startOfPrev = targetIdx;
                    while (true) {
                        const prevIdx = (startOfPrev - 1 + len) % len;
                        const prevFile = mediaFiles[playbackOrder[prevIdx]];
                        if ((prevFile?.url || '').split(/[/\\]/).slice(0, -1).join('/') !== candidateDir) break;
                        startOfPrev = prevIdx;
                        if (startOfPrev === currentIndex) break;
                    }
                    targetIdx = startOfPrev;
                }
                const date = new Date(candidate.timestamp);
                return { index: targetIdx, message: candidateDir.split('/').pop() || date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) };
            }
        }
    }

    if (playbackMode === 'story_arc' || playbackMode === 'oldest' || playbackMode === 'newest') {
        const currentDate = new Date(currentFile.timestamp).toDateString();
        let targetIdx = currentIndex;
        const step = direction === 'forward' ? 1 : -1;

        while (true) {
            targetIdx = (targetIdx + step + len) % len;
            if (targetIdx === currentIndex) break;
            
            const candidate = mediaFiles[playbackOrder[targetIdx]];
            const candidateDate = new Date(candidate.timestamp).toDateString();
            
            if (candidateDate !== currentDate) {
                if (direction === 'rewind') {
                    let startOfPrev = targetIdx;
                    while (true) {
                        const prevIdx = (startOfPrev - 1 + len) % len;
                        const prevFile = mediaFiles[playbackOrder[prevIdx]];
                        if (new Date(prevFile.timestamp).toDateString() !== candidateDate) break;
                        startOfPrev = prevIdx;
                        if (startOfPrev === currentIndex) break;
                    }
                    targetIdx = startOfPrev;
                }
                const date = new Date(candidate.timestamp);
                return { index: targetIdx, message: date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) };
            }
        }
    }

    // Fallback to percentage jump
    const stepSize = Math.max(1, Math.min(len, Math.max(10, Math.floor(len * 0.05))));
    const step = direction === 'forward' ? stepSize : -stepSize;
    let targetIndex = (currentIndex + step + len) % len;
    const targetFile = mediaFiles[playbackOrder[targetIndex]];
    const date = new Date(targetFile.timestamp);
    return { index: targetIndex, message: date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) };
};
