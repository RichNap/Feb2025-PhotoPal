
import type { MediaFile, Person, AiData, Album, IngestionEntry, Proposal } from './types';

const DB_NAME = 'PhotoPalDB';
const DB_VERSION = 3; 
const FILES_STORE = 'files_cache';
const PEOPLE_STORE = 'people_cache';
const HIDDEN_STORE = 'hidden_files';
const ALBUMS_STORE = 'albums';
const HISTORY_STORE = 'ingestion_history';
const PROPOSALS_STORE = 'proposals_cache';
const THUMBS_STORE = 'thumbnails_cache';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(new Error('Failed to open IndexedDB.'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(FILES_STORE)) db.createObjectStore(FILES_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(PEOPLE_STORE)) db.createObjectStore(PEOPLE_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(HIDDEN_STORE)) db.createObjectStore(HIDDEN_STORE);
      if (!db.objectStoreNames.contains(ALBUMS_STORE)) db.createObjectStore(ALBUMS_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(HISTORY_STORE)) db.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(PROPOSALS_STORE)) db.createObjectStore(PROPOSALS_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(THUMBS_STORE)) db.createObjectStore(THUMBS_STORE);
    };
  });
};

export const getAllThumbnailKeys = async (): Promise<string[]> => {
    const database = await openDB();
    const tx = database.transaction(THUMBS_STORE, 'readonly');
    const req = tx.objectStore(THUMBS_STORE).getAllKeys();
    return new Promise((resolve) => {
        req.onsuccess = () => resolve(req.result as string[]);
        req.onerror = () => resolve([]);
    });
};

export const saveThumbnail = async (id: string, blob: Blob) => {
  const database = await openDB();
  const tx = database.transaction(THUMBS_STORE, 'readwrite');
  tx.objectStore(THUMBS_STORE).put(blob, id);
  return new Promise<void>((resolve) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve(); 
  });
};

export const getThumbnail = async (id: string): Promise<Blob | null> => {
  const database = await openDB();
  const tx = database.transaction(THUMBS_STORE, 'readonly');
  const req = tx.objectStore(THUMBS_STORE).get(id);
  return new Promise((resolve) => {
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
};

export const saveFileAnalysis = async (map: Record<string, AiData>, geoMap?: Record<string, { lat?: number; lon?: number }>, exifMap?: Record<string, any>) => {
  const database = await openDB();
  const tx = database.transaction(FILES_STORE, 'readwrite');
  const store = tx.objectStore(FILES_STORE);
  for (const [id, aiData] of Object.entries(map)) {
    const geo = geoMap?.[id];
    const exif = exifMap?.[id];
    store.put({ id, ...aiData, latitude: geo?.lat, longitude: geo?.lon, exif: exif || aiData.forensic?.exif });
  }
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const enrichMediaFiles = async (files: MediaFile[]) => {
  const database = await openDB();
  const tx = database.transaction(FILES_STORE, 'readonly');
  const store = tx.objectStore(FILES_STORE);
  
  await Promise.all(files.map(async (f) => {
    return new Promise<void>((resolve) => {
      const req = store.get(f.id);
      req.onsuccess = () => {
        if (req.result) {
          const { id, latitude, longitude, exif, ...aiData } = req.result;
          f.aiData = { ...f.aiData, ...aiData };
          if (latitude !== undefined) f.latitude = latitude;
          if (longitude !== undefined) f.longitude = longitude;
          if (exif !== undefined) f.exif = { ...f.exif, ...exif };
        }
        resolve();
      };
      req.onerror = () => resolve();
    });
  }));
};

export const savePeople = async (people: Person[]) => {
  const database = await openDB();
  const tx = database.transaction(PEOPLE_STORE, 'readwrite');
  const store = tx.objectStore(PEOPLE_STORE);
  for (const p of people) {
    store.put({ ...p, fileIds: Array.from(p.fileIds) });
  }
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const loadAllPeople = async (): Promise<Person[]> => {
  const database = await openDB();
  const tx = database.transaction(PEOPLE_STORE, 'readonly');
  const store = tx.objectStore(PEOPLE_STORE);
  const req = store.getAll();
  return new Promise((resolve, reject) => {
    req.onsuccess = () => {
      const results: Person[] = (req.result || []).map((p: any) => ({
        ...p,
        fileIds: new Set<string>(p.fileIds || [])
      }));
      resolve(results);
    };
    req.onerror = () => reject(req.error);
  });
};

export const deletePeople = async (ids: string[]) => {
  const database = await openDB();
  const tx = database.transaction(PEOPLE_STORE, 'readwrite');
  const store = tx.objectStore(PEOPLE_STORE);
  ids.forEach(id => store.delete(id));
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const mergePeopleBatch = async (people: Person[]): Promise<Person[]> => {
  await savePeople(people);
  return loadAllPeople();
};

export const saveHiddenFileId = async (id: string) => {
  const database = await openDB();
  const tx = database.transaction(HIDDEN_STORE, 'readwrite');
  const store = tx.objectStore(HIDDEN_STORE);
  store.put(true, id);
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const saveHiddenFileIdsBatch = async (ids: string[]) => {
  const database = await openDB();
  const tx = database.transaction(HIDDEN_STORE, 'readwrite');
  const store = tx.objectStore(HIDDEN_STORE);
  for (const id of ids) {
    store.put(true, id);
  }
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const removeHiddenFileId = async (id: string) => {
  const database = await openDB();
  const tx = database.transaction(HIDDEN_STORE, 'readwrite');
  const store = tx.objectStore(HIDDEN_STORE);
  store.delete(id);
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const loadHiddenFileIds = async (): Promise<Set<string>> => {
  const database = await openDB();
  const tx = database.transaction(HIDDEN_STORE, 'readonly');
  const store = tx.objectStore(HIDDEN_STORE);
  const req = store.getAllKeys();
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(new Set(req.result as string[]));
    req.onerror = () => reject(req.error);
  });
};

export const purgeFileRecords = async (fileId: string) => {
  const database = await openDB();
  const tx = database.transaction([FILES_STORE, HIDDEN_STORE, PROPOSALS_STORE, THUMBS_STORE], 'readwrite');
  tx.objectStore(FILES_STORE).delete(fileId);
  tx.objectStore(HIDDEN_STORE).delete(fileId);
  tx.objectStore(THUMBS_STORE).delete(fileId);
  const proposalsStore = tx.objectStore(PROPOSALS_STORE);
  const req = proposalsStore.getAll();
  req.onsuccess = () => {
    const list = req.result || [];
    list.forEach((p: any) => {
      if (p.fileId === fileId) proposalsStore.delete(p.id);
    });
  };
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const saveAlbums = async (albums: Album[]) => {
  const database = await openDB();
  const tx = database.transaction(ALBUMS_STORE, 'readwrite');
  const store = tx.objectStore(ALBUMS_STORE);
  albums.forEach(a => store.put(a));
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const loadAlbums = async (): Promise<Album[]> => {
  const database = await openDB();
  const tx = database.transaction(ALBUMS_STORE, 'readonly');
  const store = tx.objectStore(ALBUMS_STORE);
  const req = store.getAll();
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
};

export const clearAnalysisData = async () => {
  const database = await openDB();
  const tx = database.transaction([FILES_STORE, PEOPLE_STORE, THUMBS_STORE], 'readwrite');
  tx.objectStore(FILES_STORE).clear();
  tx.objectStore(PEOPLE_STORE).clear();
  tx.objectStore(THUMBS_STORE).clear();
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const clearAllData = async () => {
  const database = await openDB();
  const stores = [FILES_STORE, PEOPLE_STORE, HIDDEN_STORE, ALBUMS_STORE, HISTORY_STORE, PROPOSALS_STORE, THUMBS_STORE];
  const tx = database.transaction(stores, 'readwrite');
  stores.forEach(s => tx.objectStore(s).clear());
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const clearSession = () => {};

export const updateFileStats = async (id: string) => {
  const database = await openDB();
  const tx = database.transaction(FILES_STORE, 'readwrite');
  const store = tx.objectStore(FILES_STORE);
  const req = store.get(id);
  return new Promise<void>((resolve) => {
    req.onsuccess = () => {
      if (req.result) {
        const data = req.result;
        data.lastShown = Date.now();
        data.viewCount = (data.viewCount || 0) + 1;
        store.put(data);
      }
      resolve();
    };
    req.onerror = () => resolve();
  });
};

export const loadIngestionHistory = async (): Promise<IngestionEntry[]> => {
  const database = await openDB();
  const tx = database.transaction(HISTORY_STORE, 'readonly');
  const store = tx.objectStore(HISTORY_STORE);
  const req = store.getAll();
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
};

export const loadProposals = async (): Promise<Proposal[]> => {
  const database = await openDB();
  const tx = database.transaction(PROPOSALS_STORE, 'readonly');
  const store = tx.objectStore(PROPOSALS_STORE);
  const req = store.getAll();
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
};

export const saveProposals = async (proposals: Proposal[]) => {
  const database = await openDB();
  const tx = database.transaction(PROPOSALS_STORE, 'readwrite');
  const store = tx.objectStore(PROPOSALS_STORE);
  proposals.forEach(p => store.put(p));
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const deleteProposals = async (ids: string[]) => {
  const database = await openDB();
  const tx = database.transaction(PROPOSALS_STORE, 'readwrite');
  const store = tx.objectStore(PROPOSALS_STORE);
  ids.forEach(id => store.delete(id));
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};
