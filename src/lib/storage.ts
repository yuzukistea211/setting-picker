import { Dataset } from '../types';
import { DEFAULT_DATASET } from '../data/defaultTraits';

const DB_NAME = 'oc_trait_generator_db';
const DB_VERSION = 1;
const STORE_NAME = 'oc_datasets';
const KEY_NAME = 'current_dataset';
const LOCAL_STORAGE_KEY = 'oc_trait_generator_backup';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function loadDataset(): Promise<Dataset> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY_NAME);

      req.onsuccess = () => {
        if (req.result) {
          resolve(req.result as Dataset);
        } else {
          // Fallback to local storage or default
          const localData = loadFromLocalStorage();
          if (localData) {
            saveDataset(localData).catch(console.error);
            resolve(localData);
          } else {
            saveDataset(DEFAULT_DATASET).catch(console.error);
            resolve(DEFAULT_DATASET);
          }
        }
      };

      req.onerror = () => {
        const local = loadFromLocalStorage() || DEFAULT_DATASET;
        resolve(local);
      };
    });
  } catch {
    const local = loadFromLocalStorage() || DEFAULT_DATASET;
    return local;
  }
}

export async function saveDataset(dataset: Dataset): Promise<void> {
  const updated: Dataset = {
    ...dataset,
    updatedAt: Date.now(),
  };

  // Always keep localStorage synced as secondary safe guard
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(updated, KEY_NAME);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to save to IndexedDB, fallback to localStorage', err);
  }
}

function loadFromLocalStorage(): Dataset | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return null;
}

export async function resetToDefaultDataset(): Promise<Dataset> {
  await saveDataset(DEFAULT_DATASET);
  return DEFAULT_DATASET;
}
