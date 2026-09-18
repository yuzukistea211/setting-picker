import {
  RelationshipNetworkData,
  NetworkCharacter,
  CharacterRelationship,
  DEFAULT_DIRECTIONAL_METRICS,
} from '../types';

const DB_NAME = 'oc_relationship_network_db';
const DB_VERSION = 1;
const STORE_NAME = 'network_store';
const RECORD_KEY = 'active_network';

// Fallback initial sample data based on user prompt example
export const INITIAL_SAMPLE_NETWORK: RelationshipNetworkData = {
  version: '1.0',
  updatedAt: Date.now(),
  characters: [
    {
      id: 'char-a',
      name: '角色 A (雷恩)',
      notes: '表面寡言，內心縝密謹慎，重視個人界線',
      color: '#1e293b',
      createdAt: Date.now() - 100000,
      traits: [
        { name: '過度警覺', intensity: '強烈', axis: '防禦機制' },
        { name: '策略性思維', intensity: '中等', axis: '思考方式' },
      ],
    },
    {
      id: 'char-b',
      name: '角色 B (莉莉絲)',
      notes: '性格熱情外向，善於社交，對周遭人抱持善意信任',
      color: '#0f766e',
      createdAt: Date.now() - 80000,
      traits: [
        { name: '外向尋求', intensity: '強烈', axis: '社交需求' },
        { name: '高度共情', intensity: '中等', axis: '情緒調節' },
      ],
    },
  ],
  relationships: [
    {
      id: 'rel-sample-1',
      characterAId: 'char-a',
      characterBId: 'char-b',
      surfaceRelation: '朋友',
      aToB: {
        trueThought: '不太熟的朋友的朋友',
        metrics: {
          valence: 15,
          attachment: -30,
          competence: 45,
          admiration: 10,
          vulnerability: -65,
        },
      },
      bToA: {
        trueThought: '好朋友',
        metrics: {
          valence: 85,
          attachment: 70,
          competence: 60,
          admiration: 50,
          vulnerability: 40,
        },
      },
      updatedAt: Date.now() - 50000,
    },
  ],
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });
}

/**
 * Save the entire relationship network to IndexedDB
 */
export async function saveNetworkToIDB(data: RelationshipNetworkData): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const putRequest = store.put(data, RECORD_KEY);

      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error || new Error('Save error'));
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn('IndexedDB save failed, falling back to localStorage:', err);
    try {
      localStorage.setItem(`idb_fallback_${RECORD_KEY}`, JSON.stringify(data));
    } catch {
      // ignore
    }
  }
}

/**
 * Load the relationship network from IndexedDB
 */
export async function loadNetworkFromIDB(): Promise<RelationshipNetworkData> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getRequest = store.get(RECORD_KEY);

      getRequest.onsuccess = () => {
        db.close();
        if (getRequest.result && Array.isArray(getRequest.result.characters)) {
          resolve(getRequest.result as RelationshipNetworkData);
        } else {
          // Check localStorage fallback
          try {
            const fallback = localStorage.getItem(`idb_fallback_${RECORD_KEY}`);
            if (fallback) {
              const parsed = JSON.parse(fallback);
              if (parsed && Array.isArray(parsed.characters)) {
                resolve(parsed);
                return;
              }
            }
          } catch {
            // ignore
          }
          resolve(INITIAL_SAMPLE_NETWORK);
        }
      };

      getRequest.onerror = () => {
        db.close();
        resolve(INITIAL_SAMPLE_NETWORK);
      };
    });
  } catch (err) {
    console.warn('IndexedDB load failed, using sample network:', err);
    try {
      const fallback = localStorage.getItem(`idb_fallback_${RECORD_KEY}`);
      if (fallback) {
        const parsed = JSON.parse(fallback);
        if (parsed && Array.isArray(parsed.characters)) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_SAMPLE_NETWORK;
  }
}

/**
 * Clear the network store in IndexedDB
 */
export async function clearNetworkIDB(): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const clearRequest = store.delete(RECORD_KEY);

      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn('IndexedDB delete failed:', err);
  } finally {
    try {
      localStorage.removeItem(`idb_fallback_${RECORD_KEY}`);
    } catch {
      // ignore
    }
  }
}
