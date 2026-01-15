// Ajoute dans src/services/firestore.js

import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

export function listenRequestsForRide(rideId, callback, onError = null) {
  if (!rideId || typeof callback !== 'function') return () => {};
  try {
    const reqCol = collection(db, 'requests');
    const q = query(reqCol, where('rideId', '==', String(rideId)), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const rows = [];
      snap.forEach(d => rows.push({ id: d.id, ...d.data() }));
      callback(rows);
    }, (err) => {
      console.warn('listenRequestsForRide snapshot error', err);
      if (typeof onError === 'function') onError(err);
    });
    return unsub;
  } catch (e) {
    console.warn('listenRequestsForRide exception', e);
    if (typeof onError === 'function') onError(e);
    return () => {};
  }
}

export async function rejectRequestForRide(requestId, driverId) {
  if (!requestId) throw new Error('requestId required');
  try {
    const ref = doc(db, 'requests', String(requestId));
    await updateDoc(ref, {
      status: 'rejected',
      rejectedBy: driverId || null,
      rejectedAt: serverTimestamp(),
    });
    return true;
  } catch (e) {
    console.warn('rejectRequestForRide error', e);
    throw e;
  }
}