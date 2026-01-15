import { collection, query, where, onSnapshot, doc, runTransaction, serverTimestamp, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

/**
 * createRequest(fields)
 * - fields: { pickup, destination, note, price?, date? }
 * - crée une request dans collection 'requests' avec userId = auth.currentUser.uid et status 'open'
 */
export async function createRequest(fields = {}) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Utilisateur non authentifié');

  const payload = {
    userId: uid,
    pickup: fields.pickup || null,
    destination: fields.destination || null,
    note: fields.note || null,
    price: fields.price ?? null,
    date: fields.date ?? null,
    status: 'open',
    createdAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, 'requests'), payload);
  return ref.id;
}

/**
 * listenIncomingRequests(onChange)
 * - onChange sera appelé avec un objet partiel : { opens } ou { assigned }
 * - Le consumer doit fusionner l'objet dans son état.
 * - Retourne unsubscribe().
 */
export function listenIncomingRequests(onChange) {
  if (typeof onChange !== 'function') {
    console.warn('listenIncomingRequests: onChange n\'est pas une fonction', typeof onChange, onChange);
    try {
      const err = new Error('listenIncomingRequests called with non-function');
      console.warn(err.stack);
    } catch (e) {
      console.warn('listenIncomingRequests: failed to capture stack', e);
    }
    // retourne un unsub noop pour éviter crash chez l'appelant
    return () => {};
  }

  const uid = auth.currentUser?.uid;
  if (!uid) {
    console.warn('listenIncomingRequests: pas d\'utilisateur connecté');
    return () => {};
  }

  const col = collection(db, 'requests');
  const qOpen = query(col, where('status', '==', 'open'));
  const qAssigned = query(col, where('driverId', '==', uid));

  const unsubOpen = onSnapshot(qOpen, (snap) => {
    const opens = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    try { onChange({ opens }); } catch (e) { console.warn('listenIncomingRequests: onChange handler threw', e); }
  }, (err) => console.warn('listen open requests error', err));

  const unsubAssigned = onSnapshot(qAssigned, (snap) => {
    const assigned = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    try { onChange({ assigned }); } catch (e) { console.warn('listenIncomingRequests: onChange handler threw', e); }
  }, (err) => console.warn('listen assigned requests error', err));

  return () => {
    try { unsubOpen(); } catch (e) {}
    try { unsubAssigned(); } catch (e) {}
  };
}

/**
 * listenRequest(...)
 * - Surcharge pratique pour compatibilité :
 *   - listenRequest(requestId, callback)  -> écoute un document requests/{requestId} et appelle callback(obj|null)
 *   - listenRequest(callback)            -> alias vers listenIncomingRequests(callback) (ancien usage possible)
 *
 * Retourne unsubscribe().
 */
export function listenRequest(arg1, arg2) {
  // Case: listenRequest(fn) -> compatibility with previous code expecting incoming-listener
  if (typeof arg1 === 'function' && typeof arg2 === 'undefined') {
    return listenIncomingRequests(arg1);
  }

  const requestId = arg1;
  const callback = arg2;

  if (!requestId) {
    console.warn('listenRequest: requestId missing', requestId);
    if (typeof callback === 'function') {
      try { callback(null); } catch (e) { /* swallow */ }
    }
    return () => {};
  }

  if (typeof callback !== 'function') {
    console.warn('listenRequest: callback is not a function', typeof callback, callback);
    return () => {};
  }

  try {
    const ref = doc(db, 'requests', String(requestId));
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          try { callback(null); } catch (e) { console.warn('listenRequest callback error', e); }
          return;
        }
        try { callback({ id: snap.id, ...snap.data() }); } catch (e) { console.warn('listenRequest callback error', e); }
      },
      (err) => {
        console.warn('listenRequest onSnapshot error', err);
        try { callback(null); } catch (e) { /* swallow */ }
      }
    );
    return unsub;
  } catch (e) {
    console.warn('listenRequest exception', e);
    try { callback(null); } catch (er) { /* swallow */ }
    return () => {};
  }
}

/**
 * acceptRequest(requestId)
 * - Utilise transaction pour éviter double assignation. Met driverId = uid, status = 'assigned', assignedAt.
 */
export async function acceptRequest(requestId) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Utilisateur non authentifié');

  const reqRef = doc(db, 'requests', requestId);

  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(reqRef);
      if (!snap.exists()) throw new Error('Request introuvable');
      const data = snap.data();
      if (data.status !== 'open' && data.status !== 'pending') throw new Error('Request non ouverte');
      if (data.driverId) throw new Error('Request déjà assignée');

      tx.update(reqRef, {
        driverId: uid,
        status: 'accepted',
        assignedAt: serverTimestamp()
      });
    });

    return true;
  } catch (e) {
    throw e;
  }
}

/**
 * rejectRequest / declineRequest(requestId)
 * - Marque l'utilisateur comme ayant décliné (simple journal) ou met status = 'rejected'
 */
export async function rejectRequest(requestId) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Utilisateur non authentifié');
  const reqRef = doc(db, 'requests', requestId);

  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(reqRef);
      if (!snap.exists()) throw new Error('Request introuvable');
      tx.update(reqRef, {
        driverDeclinedBy: uid,
        driverDeclinedAt: serverTimestamp(),
        // éventuel status update
      });
    });
    return true;
  } catch (e) {
    throw e;
  }
}

/**
 * declineRequest kept for compatibility
 */
export const declineRequest = rejectRequest;