
// Standalone Worker - Version 11.3
// ABSOLUTELY NO LOCAL IMPORTS ALLOWED

/**
 * ARCHITECTURAL RULE:
 * This worker must be 100% isolated. We extract 'tf' from the faceapi bundle.
 */
let faceapi: any;
let tf: any;

const log = (msg: string) => self.postMessage({ type: 'log', payload: { message: msg } });

// GLOBAL ERROR PROXY - MUST BE REGISTERED BEFORE IMPORTS
self.onerror = (msg, url, line, col, error) => {
    const errorDetail = `[FATAL:THREAD] ${msg} at ${line}:${col}. URL: ${url}`;
    self.postMessage({ 
        type: 'error', 
        payload: { message: errorDetail } 
    });
};

// ATOMIC BOOT SIGNAL: Tell main thread we are ALIVE before trying to import
self.postMessage({ type: 'log', payload: { message: '[PHASE:BOOT] Thread container active.' } });

(async () => {
    try {
        const workerEnv = {
            origin: self.origin,
            secure: self.isSecureContext,
            offscreen: typeof OffscreenCanvas !== 'undefined'
        };
        
        log(`[PHASE:BOOT] Resolving neural modules from esm.sh...`);
        // @ts-ignore
        const faceMod = await import('https://esm.sh/@vladmandic/face-api@1.7.12?deps=@tensorflow/tfjs@4.22.0');
        faceapi = faceMod;
        tf = faceapi.tf;
        
        tf.env().set('DEBUG', false);

        const MODEL_BASE_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';
        let modelsLoaded = false;
        let registry: Record<string, any> = {};
        let isPaused = false;

        const ensureModels = async () => {
            if (modelsLoaded) return;
            log("[PHASE:SHARD] Requesting neural weights from CDN...");
            try {
                const t0 = performance.now();
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_BASE_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_BASE_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_BASE_URL)
                ]);
                modelsLoaded = true;
                log(`[PHASE:SHARD] Shards resident in memory (${Math.round(performance.now() - t0)}ms).`);
            } catch (e: any) {
                log(`[PHASE:SHARD] FATAL: Weight acquisition failed. ${e.message}`);
                throw new Error(`CDN Weight Load Failed: ${e.message}`);
            }
        };

        const cosineSimilarity = (vecA: Float32Array, vecB: Float32Array): number => {
            let dotProduct = 0, normA = 0, normB = 0;
            for (let i = 0; i < vecA.length; i++) {
                dotProduct += vecA[i] * vecB[i];
                normA += vecA[i] * vecA[i];
                normB += vecB[i] * vecB[i];
            }
            const denom = (Math.sqrt(normA) * Math.sqrt(normB));
            return denom === 0 ? 0 : dotProduct / denom;
        };

        onmessage = async (e) => {
            const { type, payload } = e.data;

            switch (type) {
                case 'init':
                    try {
                        log("[PHASE:HAL] Negotiating GPU Compute context...");
                        await tf.setBackend(payload.forceCpu ? 'cpu' : 'webgl');
                        await tf.ready();
                        log(`[PHASE:HAL] Driver: ${tf.getBackend().toUpperCase()}`);
                        await ensureModels();
                        self.postMessage({ type: 'ready', payload: { backend: tf.getBackend(), env: workerEnv } });
                    } catch (err: any) {
                        log(`[PHASE:HAL] WARN: GPU Lock - ${err.message}. Reverting to CPU.`);
                        try {
                            await tf.setBackend('cpu');
                            await tf.ready();
                            await ensureModels();
                            self.postMessage({ type: 'ready', payload: { backend: 'cpu', env: workerEnv } });
                        } catch (fatal: any) {
                            log(`[PHASE:HAL] FATAL: System Unstable - ${fatal.message}`);
                            self.postMessage({ type: 'error', payload: { message: `Engine Failure: ${fatal.message}` } });
                        }
                    }
                    break;

                case 'scan':
                    const { photos, threshold, isDiagnostic } = payload;
                    isPaused = false;
                    log(`[PHASE:RUN] Starting sequence: ${photos.length} items.`);
                    
                    const sessionStart = performance.now();
                    for (let i = 0; i < photos.length; i++) {
                        if (isPaused) break;
                        const photo = photos[i];

                        try {
                            const bitmap = await createImageBitmap(photo.file);
                            const tensor = tf.browser.fromPixels(bitmap);
                            
                            const tInf0 = performance.now();
                            const results = await faceapi.detectAllFaces(tensor).withFaceLandmarks().withFaceDescriptors();
                            const tInf1 = performance.now();
                            
                            if (isDiagnostic) {
                                log(`[INFERENCE] Node: ${photo.file.name} | Found: ${results.length} | Compute: ${Math.round(tInf1 - tInf0)}ms`);
                            }

                            if (results.length > 0 && !isDiagnostic) {
                                for (const res of results) {
                                    const emb = new Float32Array(res.descriptor);
                                    let bestMatchId = null;
                                    let bestScore = -1;

                                    for (const id of Object.keys(registry)) {
                                        const score = cosineSimilarity(emb, registry[id].representativeEmbedding);
                                        if (score > bestScore && score >= threshold) {
                                            bestScore = score;
                                            bestMatchId = id;
                                        }
                                    }

                                    if (bestMatchId) {
                                        const idObj = registry[bestMatchId];
                                        idObj.count++;
                                        for (let j = 0; j < 128; j++) {
                                            idObj.representativeEmbedding[j] = (idObj.representativeEmbedding[j] * 0.9) + (emb[j] * 0.1);
                                        }
                                    } else {
                                        const newId = `cluster_${Math.random().toString(36).substr(2, 9)}`;
                                        registry[newId] = {
                                            id: newId,
                                            representativeEmbedding: emb,
                                            count: 1
                                        };
                                        log(`[PHASE:RUN] Cluster Created: ${newId}`);
                                    }
                                }
                            }
                            
                            tensor.dispose();
                            bitmap.close();

                            if (i % 10 === 0 || i === photos.length - 1) {
                                const elapsed = (performance.now() - sessionStart) / 1000;
                                self.postMessage({ 
                                    type: 'progress', 
                                    payload: { 
                                        index: i, 
                                        total: photos.length,
                                        velocity: (i + 1) / (elapsed || 0.1),
                                        registrySize: Object.keys(registry).length,
                                        currentFile: photo.file.name,
                                        lastLog: `Processed ${i+1}/${photos.length} items...`
                                    } 
                                });
                            }
                        } catch (err: any) {
                            log(`[NODE:ERR] Block ${photo.file.name} skipped: ${err.message}`);
                        }
                    }
                    self.postMessage({ type: 'complete', payload: { registry, backend: tf.getBackend() } });
                    break;

                case 'pause':
                    isPaused = true;
                    break;
            }
        };

        log("[PHASE:BOOT] Message channel open.");
    } catch (bootErr: any) {
        self.postMessage({ type: 'error', payload: { message: `[PHASE:BOOT] FATAL_BOOT_FAULT: ${bootErr.message}` } });
    }
})();
