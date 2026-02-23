export type ViewMode = 'single' | 'dual' | 'gallery' | 'mixed';
export type PlaybackMode = 'story_arc' | 'random' | 'on_this_day' | 'seasonal' | 'directory' | 'linear' | 'oldest' | 'newest' | 'forgotten';

export interface Insight {
    id: string;
    text: string;
    category: 'privacy' | 'forensics' | 'narrative' | 'power-user' | 'stats';
    requiresCount?: boolean;
}

export interface LibraryMetrics {
    totalFiles: number;
    imageCount: number;
    videoCount: number;
    totalSize: number;
    temporalSpans: Record<string, number>; 
    resolutionBuckets: Record<string, number>; 
    unscannedCount: number;
}

export interface AiFace {
    box: [number, number, number, number];
    embedding: number[];
    landmarks?: any;
}

export interface ForensicData {
    suggestedTimestamp?: number;
    suggestedLocation?: { latitude: number; longitude: number };
    confidence: number;
    method: 'filename_regex' | 'folder_anchor' | 'temporal_interpolation' | 'user_defined' | 'exif_recovery';
    isApplied: boolean;
    exif?: any;
}

export interface AiData {
    faces?: AiFace[];
    caption?: string;
    tags?: string[];
    scene?: string;
    theme?: string;
    enriched?: boolean;
    dateScanned?: number;
    objects?: Record<string, number>;
    palette?: string[];
    quality?: { brightness: number; contrast: number; sharpness: number; score: number };
    ocr?: string;
    isDuplicate?: boolean;
    duplicateOf?: string;
    lastShown?: number;
    viewCount?: number;
    forensic?: ForensicData;
}

export interface MediaFile {
    id: string;
    file: File;
    url: string;
    timestamp: number;
    latitude?: number;
    longitude?: number;
    aiData?: AiData;
    exif?: any;
    handle?: FileSystemFileHandle;
    parentHandle?: FileSystemDirectoryHandle;
    exifError?: boolean;
    restoreHandle?: FileSystemDirectoryHandle;
    isSidecar?: boolean;
}

export interface Person {
    id: string;
    name: string;
    coverFileId: string;
    fileIds: Set<string>;
    representativeEmbedding: number[];
    count: number;
    embeddings: number[][];
    blacklistEmbeddings?: number[][];
    lastModified?: number;
}

export interface Proposal {
    id: string;
    personId: string;
    fileId: string;
    face: AiFace;
    confidence: number;
    timestamp: number;
}

export interface DiscoveryState {
    isProcessing: boolean;
    currentIndex: number;
    totalFiles: number;
    lastAction?: string;
    metadataProgress?: number;
    isComplete?: boolean;
    lastError?: string;
    lastSuccessTime?: number;
    startTimeOfCurrentItem?: number;
    stuckOnId?: string;
    currentFile?: string;
    itemsProcessed?: number;
    enrichmentType?: 'identity' | 'insights' | 'meta_mining';
}

export interface AngelaModeSettings {
    interval: number;
    speed: number;
    viewMode: ViewMode;
    playbackMode: PlaybackMode;
    kenBurnsEnabled?: boolean;
    newsEnabled?: boolean;
    newsInterval?: number;
    enableRemoveFromView?: boolean;
    showMetadataBubbles?: boolean;
    showTechnicalSpecs?: boolean;
    showTemporalDistance?: boolean;
    leftHandedMode?: boolean;
    mixedRatioSingle?: number;
    mixedRatioDual?: number;
}

export interface SystemActionStep {
    id: string;
    label: string;
    status: 'waiting' | 'running' | 'completed' | 'failed';
    log?: string[];
}

export interface SystemActionState {
    isActive: boolean;
    title: string;
    description: string;
    steps: SystemActionStep[];
    canDismiss?: boolean;
    action?: { label: string; onClick: () => void };
}

export interface ActiveFilter {
    type: 'person' | 'multi_person' | 'date_range' | 'geo_cluster' | 'complex' | 'theme';
    name: string;
    value: any;
    _cachedSet?: Set<string>;
}

export interface AlbumAsset {
    fileId: string;
    manualOrder: number;
}

export interface SearchStrategy {
    peopleIds: string[];
    keywords: string[];
    dateRange?: { start: string; end: string };
}

export interface Album {
    id: string;
    title: string;
    description: string;
    coverPhotoId: string;
    createdAt: number;
    updatedAt: number;
    assets: AlbumAsset[];
    smartRules: {
        isLiving: boolean;
        autoAddThreshold: number;
        strategy: SearchStrategy;
    };
    uiSettings: {
        vibe: 'cinematic' | 'documentary' | 'energetic';
        sortMode: 'manual' | 'date';
    };
}

export interface IngestionEntry {
    id: string;
    name: string;
    timestamp: number;
    count: number;
    status: 'processing' | 'completed' | 'failed';
}

export interface ErrorLogEntry {
    timestamp: Date;
    folderPath: string;
    fileName: string;
    errorMessage: string;
}

export interface AiDiagnosticLog {
    step: string;
    status: 'pending' | 'success' | 'error' | 'warning';
    message: string;
    details?: string;
}

export interface PortableIndexData {
    header: PDXHeader;
    payload: PDXPayload;
}

export interface PDXHeader {
    app: string;
    version: string;
    pdx_spec: string;
    file_type: string;
    encoding: string;
    created_at: number;
    modified_at: number;
    origin_folder: string;
    fingerprint?: string;
}

export interface PDXPerson {
    id: string;
    name: string;
    coverFileId: string;
    fileIds: string[];
    embeddings: number[][];
    representativeEmbedding: number[];
}

export interface PDXPayload {
    identities: PDXPerson[];
    catalog: Record<string, AiData>;
    exifOverrides: Record<string, any>;
    system_logs: string[];
    albums?: Album[];
}

export interface PDXPackage {
    header: PDXHeader;
    payload: PDXPayload;
}

export interface NeuralActivity {
    id: string;
    timestamp: number;
    type: 'match' | 'cluster_created' | 'inference' | 'meta_mined';
    label: string;
    fileName: string;
    fileId: string;
}

export interface AiSettings {
    matchThreshold: number;
    inputSize: number;
    detectionThreshold: number;
    useTinyDetector: boolean;
}

export interface AnalysisOptions {
    detectFaces: boolean;
    generateCaptions: boolean;
    enrichInsights: boolean;
    useCloud: boolean;
    highPriority: boolean;
    samplingRate?: number;
    folderScout?: boolean;
    stage2_ocr?: boolean;
    stage2_quality?: boolean;
    stage2_palette?: boolean;
    stage2_duplicates?: boolean;
}

export type NewsSource = 'AP' | 'Reuters' | 'BBC';

export interface ForensicLog {
    timestamp: number;
    level: 'info' | 'success' | 'warn' | 'error';
    module: string;
    message: string;
}

export interface ForensicTestResult {
    id: string;
    name: string;
    status: 'idle' | 'running' | 'passed' | 'failed';
    metric?: string;
    error?: string;
}

export interface PublicMemory {
    id: string;
    url: string;
    sourceTitle: string;
    sourceUrl: string;
    caption: string;
    type: 'image' | 'video';
    isSelected: boolean;
}

export interface SystemHealthMetrics {
    jsHeapSizeLimit: number;
    totalJSHeapSize: number;
    usedJSHeapSize: number;
    fps: number;
    maxFrameTime: number;
    domNodes: number;
    storageUsage: number;
    storageQuota: number;
    ioLatency: number;
    storageDetails: {
        indexedDB?: number;
        cache?: number;
        serviceWorker?: number;
    };
    isOnline: boolean;
    networkType: string;
    rtt: number;
    longTaskCount: number;
    activeHandles: number;
    totalAiRequests: number;
    aiThroughput: string;
    aiEngineStats: {
        backend: string;
        numTensors: number;
        numBytes: number;
        isLoaded: boolean;
    };
    platform: string;
    userAgent: string;
    cpuCores: number;
    deviceMemory: number;
    screenResolution: string;
    webGLRenderer: string;
}

export interface FileSystemHandle {
    kind: 'file' | 'directory';
    name: string;
}

export interface FileSystemFileHandle extends FileSystemHandle {
    kind: 'file';
    getFile(): Promise<File>;
    createWritable(): Promise<FileSystemWritableFileStream>;
    move(dest: FileSystemDirectoryHandle | string, name?: string): Promise<void>;
}

export interface FileSystemDirectoryHandle extends FileSystemHandle {
    kind: 'directory';
    values(): AsyncIterableIterator<FileSystemHandle>;
    getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
    getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
    removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
}

export interface FileSystemWritableFileStream extends WritableStream {
    write(data: any): Promise<void>;
    close(): Promise<void>;
}

declare global {
  interface Window {
    dispatchSystemLog: (msg: string) => void;
    showDirectoryPicker: (options?: any) => Promise<FileSystemDirectoryHandle>;
    showOpenFilePicker: (options?: any) => Promise<FileSystemFileHandle[]>;
    showSaveFilePicker: (options?: any) => Promise<FileSystemFileHandle>;
    faceapi: any;
    cast: any;
    chrome: any;
    __onGCastApiAvailable: (isAvailable: boolean) => void;
    piexif: any;
    exifr: any;
    isSecureContext: boolean;
    crossOriginIsolated: boolean;
  }
}