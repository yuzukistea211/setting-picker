import { Dataset, NetworkData, MetricDefinition, CharacterRelationship, NetworkCharacter } from '../types';
import { DEFAULT_DATASET } from '../data/defaultTraits';

const DB_NAME = 'oc_trait_generator_db';
const DB_VERSION = 2;
const STORE_NAME = 'oc_datasets';
const KEY_NAME = 'current_dataset';
const LOCAL_STORAGE_KEY = 'oc_trait_generator_backup';

const STORE_NAME_NETWORK = 'oc_networks';
const KEY_NAME_NETWORK = 'current_network';
const LOCAL_STORAGE_KEY_NETWORK = 'oc_relationship_network_backup';

export const DEFAULT_METRIC_DEFINITIONS: MetricDefinition[] = [
  { id: 'metric-1', name: '好感度' },
  { id: 'metric-2', name: '信任度' }
];

export const DEFAULT_NETWORK_DATA: NetworkData = {
  version: 2,
  updatedAt: Date.now(),
  metricDefinitions: DEFAULT_METRIC_DEFINITIONS,
  characters: [
    {
      id: 'char-a',
      name: '角色A',
      avatarColor: '#111111',
      x: 320,
      y: 280,
    },
    {
      id: 'char-b',
      name: '角色B',
      avatarColor: '#111111',
      x: 640,
      y: 280,
    },
  ],
  relationships: [
    {
      id: 'rel-a-b',
      sourceId: 'char-a',
      targetId: 'char-b',
      surfaceRelation: '朋友',
      sourceToTargetThought: '不太熟的朋友的朋友',
      targetToSourceThought: '好朋友',
      sourceToTargetMetrics: {
        'metric-1': 20,
        'metric-2': -10
      },
      targetToSourceMetrics: {
        'metric-1': 85,
        'metric-2': 90
      },
    },
  ],
};

export function migrateNetworkData(raw: unknown): NetworkData {
  if (!raw || typeof raw !== 'object') return DEFAULT_NETWORK_DATA;

  const rawObj = raw as Record<string, unknown>;

  const metricDefinitions: MetricDefinition[] =
    Array.isArray(rawObj.metricDefinitions) && rawObj.metricDefinitions.length > 0
      ? (rawObj.metricDefinitions as MetricDefinition[])
      : DEFAULT_METRIC_DEFINITIONS;

  // Legacy key mapper for removing Valence, Attachment, Competence, Admiration, Vulnerability
  const legacyKeyMap: Record<string, string> = {
    valence: 'metric-1',
    attachment: 'metric-2',
  };

  const rawRels = Array.isArray(rawObj.relationships) ? rawObj.relationships : [];
  const relationships: CharacterRelationship[] = rawRels.map((item: unknown) => {
    const rel = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const migrateMetrics = (m: unknown): Record<string, number> => {
      const res: Record<string, number> = {};
      if (!m || typeof m !== 'object') return res;
      for (const [k, v] of Object.entries(m as Record<string, unknown>)) {
        if (typeof v === 'number') {
          const mappedKey = legacyKeyMap[k] || k;
          res[mappedKey] = v;
        }
      }
      return res;
    };

    return {
      id: typeof rel.id === 'string' ? rel.id : `rel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sourceId: typeof rel.sourceId === 'string' ? rel.sourceId : '',
      targetId: typeof rel.targetId === 'string' ? rel.targetId : '',
      surfaceRelation: typeof rel.surfaceRelation === 'string' ? rel.surfaceRelation : '',
      sourceToTargetThought: typeof rel.sourceToTargetThought === 'string' ? rel.sourceToTargetThought : '',
      targetToSourceThought: typeof rel.targetToSourceThought === 'string' ? rel.targetToSourceThought : '',
      sourceToTargetMetrics: migrateMetrics(rel.sourceToTargetMetrics),
      targetToSourceMetrics: migrateMetrics(rel.targetToSourceMetrics),
    };
  });

  const rawChars = Array.isArray(rawObj.characters) ? (rawObj.characters as NetworkCharacter[]) : [];

  return {
    version: typeof rawObj.version === 'number' ? rawObj.version : 2,
    updatedAt: typeof rawObj.updatedAt === 'number' ? rawObj.updatedAt : Date.now(),
    metricDefinitions,
    characters: rawChars,
    relationships,
  };
}

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
      if (!db.objectStoreNames.contains(STORE_NAME_NETWORK)) {
        db.createObjectStore(STORE_NAME_NETWORK);
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

export async function loadNetworkData(): Promise<NetworkData> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME_NETWORK, 'readonly');
      const store = tx.objectStore(STORE_NAME_NETWORK);
      const req = store.get(KEY_NAME_NETWORK);

      req.onsuccess = () => {
        if (req.result) {
          const migrated = migrateNetworkData(req.result);
          resolve(migrated);
        } else {
          const localData = loadNetworkFromLocalStorage();
          if (localData) {
            const migrated = migrateNetworkData(localData);
            saveNetworkData(migrated).catch(console.error);
            resolve(migrated);
          } else {
            saveNetworkData(DEFAULT_NETWORK_DATA).catch(console.error);
            resolve(DEFAULT_NETWORK_DATA);
          }
        }
      };

      req.onerror = () => {
        const local = loadNetworkFromLocalStorage();
        resolve(migrateNetworkData(local));
      };
    });
  } catch {
    const local = loadNetworkFromLocalStorage();
    return migrateNetworkData(local);
  }
}

export async function saveNetworkData(networkData: NetworkData): Promise<void> {
  const updated: NetworkData = {
    ...networkData,
    updatedAt: Date.now(),
  };

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_NETWORK, JSON.stringify(updated));
  } catch {
    // ignore
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME_NETWORK, 'readwrite');
      const store = tx.objectStore(STORE_NAME_NETWORK);
      const req = store.put(updated, KEY_NAME_NETWORK);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to save network to IndexedDB, fallback to localStorage', err);
  }
}

function loadNetworkFromLocalStorage(): NetworkData | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_NETWORK);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return null;
}

export async function resetToDefaultNetworkData(): Promise<NetworkData> {
  await saveNetworkData(DEFAULT_NETWORK_DATA);
  return DEFAULT_NETWORK_DATA;
}

