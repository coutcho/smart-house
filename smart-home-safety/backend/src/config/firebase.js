/**
 * Firebase Admin SDK Initialization with Transparent In-Memory Emulation Fallback
 * 
 * Supports both:
 * 1. Live Google Cloud Firestore & Firebase Auth via serviceAccountKey.json.
 * 2. High-fidelity in-memory Mock Firestore Store for zero-config testing & offline dev.
 */

const fs = require('fs');
const path = require('path');

let admin = null;
let db = null;
let auth = null;
let messaging = null;
let isEmulated = false;

// Check for service account file
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH 
  ? path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
  : path.resolve(__dirname, 'serviceAccountKey.json');

let hasServiceAccount = fs.existsSync(serviceAccountPath);

if (hasServiceAccount) {
  try {
    admin = require('firebase-admin');
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id
    });
    db = admin.firestore();
    auth = admin.auth();
    messaging = admin.messaging();
    console.log('[Firebase] Connected to live Firebase project:', serviceAccount.project_id);
  } catch (err) {
    console.warn('[Firebase] Warning: Failed to initialize live Firebase SDK. Falling back to in-memory store:', err.message);
    hasServiceAccount = false;
  }
}

if (!hasServiceAccount) {
  isEmulated = true;
  console.log('[Firebase] Running with High-Fidelity In-Memory Firestore & Auth Emulation.');

  // High-fidelity in-memory Firestore emulation
  class MemoryDocumentSnapshot {
    constructor(id, data, exists = true) {
      this.id = id;
      this._data = data ? JSON.parse(JSON.stringify(data)) : null;
      this.exists = exists;
    }
    data() {
      return this._data ? JSON.parse(JSON.stringify(this._data)) : null;
    }
  }

  class MemoryQuerySnapshot {
    constructor(docs) {
      this.docs = docs;
      this.empty = docs.length === 0;
      this.size = docs.length;
    }
    forEach(callback) {
      this.docs.forEach(callback);
    }
  }

  class MemoryCollectionReference {
    constructor(collectionName, store) {
      this.collectionName = collectionName;
      this.store = store;
      this._filters = [];
      this._orderBy = null;
      this._limit = null;
    }

    doc(id) {
      const docId = id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      return new MemoryDocumentReference(this.collectionName, docId, this.store);
    }

    async add(data) {
      const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const docRef = this.doc(docId);
      await docRef.set(data);
      return docRef;
    }

    where(field, op, value) {
      const cloned = new MemoryCollectionReference(this.collectionName, this.store);
      cloned._filters = [...this._filters, { field, op, value }];
      cloned._orderBy = this._orderBy;
      cloned._limit = this._limit;
      return cloned;
    }

    orderBy(field, direction = 'asc') {
      const cloned = new MemoryCollectionReference(this.collectionName, this.store);
      cloned._filters = [...this._filters];
      cloned._orderBy = { field, direction };
      cloned._limit = this._limit;
      return cloned;
    }

    limit(n) {
      const cloned = new MemoryCollectionReference(this.collectionName, this.store);
      cloned._filters = [...this._filters];
      cloned._orderBy = this._orderBy;
      cloned._limit = n;
      return cloned;
    }

    async get() {
      const col = this.store[this.collectionName] || {};
      let items = Object.entries(col).map(([id, data]) => ({ id, ...data }));

      // Apply where filters
      for (const filter of this._filters) {
        items = items.filter(item => {
          const val = item[filter.field];
          switch (filter.op) {
            case '==': return val === filter.value;
            case '!=': return val !== filter.value;
            case '>': return val > filter.value;
            case '>=': return val >= filter.value;
            case '<': return val < filter.value;
            case '<=': return val <= filter.value;
            case 'array-contains': return Array.isArray(val) && val.includes(filter.value);
            case 'in': return Array.isArray(filter.value) && filter.value.includes(val);
            default: return true;
          }
        });
      }

      // Apply ordering
      if (this._orderBy) {
        const { field, direction } = this._orderBy;
        items.sort((a, b) => {
          let va = a[field];
          let vb = b[field];
          if (va instanceof Date) va = va.getTime();
          if (vb instanceof Date) vb = vb.getTime();
          if (va < vb) return direction === 'asc' ? -1 : 1;
          if (va > vb) return direction === 'asc' ? 1 : -1;
          return 0;
        });
      }

      // Apply limit
      if (typeof this._limit === 'number') {
        items = items.slice(0, this._limit);
      }

      const snapshots = items.map(item => new MemoryDocumentSnapshot(item.id, item, true));
      return new MemoryQuerySnapshot(snapshots);
    }

    onSnapshot(callback) {
      // In-memory instant trigger + registration
      this.get().then(snap => callback(snap)).catch(err => console.error(err));
      const listener = () => {
        this.get().then(snap => callback(snap)).catch(err => console.error(err));
      };
      if (!this.store._listeners[this.collectionName]) {
        this.store._listeners[this.collectionName] = [];
      }
      this.store._listeners[this.collectionName].push(listener);
      return () => {
        this.store._listeners[this.collectionName] = this.store._listeners[this.collectionName].filter(l => l !== listener);
      };
    }
  }

  class MemoryDocumentReference {
    constructor(collectionName, id, store) {
      this.collectionName = collectionName;
      this.id = id;
      this.store = store;
    }

    async get() {
      const col = this.store[this.collectionName] || {};
      const data = col[this.id];
      return new MemoryDocumentSnapshot(this.id, data, !!data);
    }

    async set(data, options = {}) {
      if (!this.store[this.collectionName]) {
        this.store[this.collectionName] = {};
      }
      const existing = (options.merge && this.store[this.collectionName][this.id]) || {};
      
      // Process server timestamps
      const sanitized = { ...existing, ...data };
      for (const key of Object.keys(sanitized)) {
        if (sanitized[key] && sanitized[key]._isServerTimestamp) {
          sanitized[key] = new Date().toISOString();
        }
      }

      this.store[this.collectionName][this.id] = sanitized;
      this._notify();
      return { id: this.id };
    }

    async update(data) {
      if (!this.store[this.collectionName] || !this.store[this.collectionName][this.id]) {
        throw new Error(`Document ${this.collectionName}/${this.id} not found.`);
      }
      const current = this.store[this.collectionName][this.id];
      const sanitized = { ...data };
      for (const key of Object.keys(sanitized)) {
        if (sanitized[key] && sanitized[key]._isServerTimestamp) {
          sanitized[key] = new Date().toISOString();
        }
      }
      this.store[this.collectionName][this.id] = { ...current, ...sanitized };
      this._notify();
      return { id: this.id };
    }

    async delete() {
      if (this.store[this.collectionName]) {
        delete this.store[this.collectionName][this.id];
        this._notify();
      }
      return true;
    }

    _notify() {
      const listeners = this.store._listeners[this.collectionName] || [];
      listeners.forEach(fn => fn());
    }
  }

  const globalStore = {
    users: {},
    houses: {},
    sensors: {},
    sensorReadings: {},
    alerts: {},
    emergencyResponses: {},
    devices: {},
    deviceActions: {},
    _listeners: {}
  };

  db = {
    collection: (name) => new MemoryCollectionReference(name, globalStore),
    _rawStore: globalStore
  };

  auth = {
    verifyIdToken: async (token) => {
      if (!token) throw new Error('No token provided');
      if (token.startsWith('mock_user_')) {
        const uid = token.replace('mock_user_', '');
        return { uid, email: `${uid}@smarthome.local`, name: `Resident ${uid}` };
      }
      return { uid: 'USER_PRIMARY_01', email: 'owner@smarthome.local', name: 'Primary Homeowner' };
    }
  };

  messaging = {
    send: async (payload) => {
      console.log('[FCM Emulated] Push Notification Dispatched:', JSON.stringify(payload.notification || payload.data));
      return `mock-fcm-message-${Date.now()}`;
    },
    sendEachForMulticast: async (payload) => {
      console.log(`[FCM Emulated] Multicast push dispatched to ${payload.tokens.length} tokens.`);
      return { successCount: payload.tokens.length, failureCount: 0 };
    }
  };
}

// Universal FieldValue helper
const FieldValue = {
  serverTimestamp: () => ({ _isServerTimestamp: true, date: new Date().toISOString() })
};

module.exports = {
  db,
  auth,
  messaging,
  FieldValue,
  isEmulated
};
