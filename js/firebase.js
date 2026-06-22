import { FIREBASE_CONFIG, USE_DUMMY } from './config.js';

let _db = null, _usersRef = null, _printersRef = null, _statusRef = null;

if (!USE_DUMMY) {
  firebase.initializeApp(FIREBASE_CONFIG);
  _db          = firebase.database();
  _usersRef    = _db.ref("users");
  _printersRef = _db.ref("printers");
  _statusRef   = _db.ref("status");
}

export const db          = _db;
export const usersRef    = _usersRef;
export const printersRef = _printersRef;
export const statusRef   = _statusRef;
