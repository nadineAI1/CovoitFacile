// src/services/drivers.js
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  collection,
  addDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * getDriverProfile(uid)
 */
export async function getDriverProfile(uid) {
  if (!uid) throw new Error('uid required');
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * listenDriverProfile(uid, callback)
 */
export function listenDriverProfile(uid, callback) {
  if (!uid || typeof callback !== 'function') {
    console.warn('listenDriverProfile: invalid args');
    return () => {};
  }
  const ref = doc(db, 'users', uid);
  const unsub = onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) return callback(null);
      callback({ id: snap.id, ...snap.data() });
    },
    (err) => {
      console.warn('listenDriverProfile error', err);
      callback(null);
    }
  );
  return unsub;
}

/**
 * createOrUpdateDriverProfile(uid, data)
 */
export async function createOrUpdateDriverProfile(uid, data = {}) {
  if (!uid) throw new Error('uid required');
  const ref = doc(db, 'users', uid);
  await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
  return true;
}

/**
 * toggleAvailability(uid, available)
 */
export async function toggleAvailability(uid, available) {
  if (!uid) throw new Error('uid required');
  const ref = doc(db, 'users', uid);
  await updateDoc(ref, { available: !!available, updatedAt: serverTimestamp() });
  return true;
}

/**
 * createVerificationRequest(uid, fieldsSubmitted, meta)
 * legacy / no-image version (keeps using fields only)
 */
export async function createVerificationRequest(uid, fieldsSubmitted = {}, meta = {}) {
  if (!uid) throw new Error('uid required');
  if (!fieldsSubmitted || !fieldsSubmitted.licenseNumber || !fieldsSubmitted.vehiclePlate) {
    throw new Error('licenseNumber and vehiclePlate are required in fieldsSubmitted');
  }

  const payload = {
    userId: uid,
    fieldsSubmitted,
    meta: meta || {},
    status: 'pending',
    createdAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, 'verificationRequests'), payload);

  // mark users/{uid} with pending status and store submitted fields (merge)
  await setDoc(doc(db, 'users', uid), {
    verificationRequestedAt: serverTimestamp(),
    verificationStatus: 'pending',
    licenseNumber: fieldsSubmitted.licenseNumber || null,
    vehiclePlate: fieldsSubmitted.vehiclePlate || null,
    vehicleModel: fieldsSubmitted.vehicleModel || null,
  }, { merge: true });

  return ref.id;
}

/**
 * createVerificationRequestWithThumbs(uid, fieldsSubmitted, thumbsBase64Array, meta)
 * - thumbsBase64Array: array of base64 strings (no data URI prefix), e.g. [idBase64, vehicleBase64]
 *
 * WARNING:
 * - Storing base64 images in Firestore increases doc size.
 * - Ensure total size < ~1_048_576 bytes (prudent: keep < 700_000).
 */
export async function createVerificationRequestWithThumbs(uid, fieldsSubmitted = {}, thumbsBase64Array = [], meta = {}) {
  if (!uid) throw new Error('uid required');
  if (!fieldsSubmitted || !fieldsSubmitted.licenseNumber) {
    throw new Error('licenseNumber is required in fieldsSubmitted');
  }
  // thumbsBase64Array may be empty (we handle that)
  const thumbsObj = {};
  if (Array.isArray(thumbsBase64Array)) {
    if (thumbsBase64Array[0]) thumbsObj.thumb0 = thumbsBase64Array[0];
    if (thumbsBase64Array[1]) thumbsObj.thumb1 = thumbsBase64Array[1];
  }

  const payload = {
    userId: uid,
    fieldsSubmitted,
    thumbs: thumbsObj,
    meta: meta || {},
    status: 'pending',
    createdAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, 'verificationRequests'), payload);

  // mark users/{uid} as pending and store fields
  await setDoc(doc(db, 'users', uid), {
    verificationRequestedAt: serverTimestamp(),
    verificationStatus: 'pending',
    licenseNumber: fieldsSubmitted.licenseNumber || null,
    vehiclePlate: fieldsSubmitted.vehiclePlate || null,
    vehicleModel: fieldsSubmitted.vehicleModel || null,
  }, { merge: true });

  return ref.id;
}