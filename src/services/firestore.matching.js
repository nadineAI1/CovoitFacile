// --- Ajoute ces fonctions dans src/services/firestore.js (ou colle ce fichier et exporte depuis firestore.js) ---

import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, runTransaction, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const RIDES = 'rides';
const REQUESTS = 'requests';
const CONVERSATIONS = 'conversations';


export async function findMatchingRides({ origin, destination }) {
  if (!origin && !destination) return [];
  try {
    const col = collection(db, RIDES);

    if (origin && destination) {
      const q = query(col, where('origin', '==', origin), where('destination', '==', destination));
      const snap = await getDocs(q);
      const rows = [];
      snap.forEach(d => rows.push({ id: d.id, ...d.data() }));
      if (rows.length) return rows;
    }

    if (origin) {
      const q2 = query(col, where('origin', '==', origin));
      const snap2 = await getDocs(q2);
      const rows2 = [];
      snap2.forEach(d => rows2.push({ id: d.id, ...d.data() }));
      if (rows2.length) return rows2;
    }

   
    return [];
  } catch (e) {
    console.warn('findMatchingRides error', e);
    return [];
  }
}


export async function requestSeat(rideId = null, userId, passengerCount = 1, note = '') {
  if (!userId) throw new Error('userId requis');
  try {
    const payload = {
      userId,
      passengerCount: Number(passengerCount) || 1,
      note: note || null,
      status: rideId ? 'pending' : 'open',
      rideId: rideId || null,
      createdAt: serverTimestamp(),
    };
    const ref = await addDoc(collection(db, REQUESTS), payload);
    return ref.id;
  } catch (e) {
    console.warn('requestSeat error', e);
    throw e;
  }
}


export function listenRequestsForRide(rideId, callback) {
  if (!rideId) {
    console.warn('listenRequestsForRide: missing rideId');
    try { callback([]); } catch(e) {}
    return () => {};
  }
  if (typeof callback !== 'function') {
    console.warn('listenRequestsForRide: callback is not a function', callback);
    return () => {};
  }

  try {
    const q = query(collection(db, REQUESTS), where('rideId', '==', String(rideId)));
    const unsub = onSnapshot(q, (snap) => {
      const rows = [];
      snap.forEach(d => rows.push({ id: d.id, ...d.data() }));
      try { callback(rows); } catch (e) { console.warn('listenRequestsForRide callback error', e); }
    }, (err) => {
      console.warn('listenRequestsForRide error', err);
      try { callback([]); } catch (e) {}
    });

    return unsub;
  } catch (e) {
    console.warn('listenRequestsForRide exception', e);
    try { callback([]); } catch (er) {}
    return () => {};
  }
}


export async function acceptRequestAndCreateConversation(requestId, driverId) {
  if (!requestId || !driverId) throw new Error('requestId et driverId requis');
  const reqRef = doc(db, REQUESTS, String(requestId));

  try {
    let conversationId = null;
    await runTransaction(db, async (tx) => {
      const reqSnap = await tx.get(reqRef);
      if (!reqSnap.exists()) throw new Error('Request introuvable');
      const r = reqSnap.data();
      if (r.driverId) throw new Error('Request déjà assignée');
      // Allow accept only if pending or open
      if (!(r.status === 'pending' || r.status === 'open')) throw new Error('Request non ouverte/pending');

      // create conversation doc first (so we have id)
      const convRef = doc(collection(db, CONVERSATIONS));
      conversationId = convRef.id;
      tx.set(convRef, {
        participants: [driverId, r.userId],
        rideId: r.rideId || null,
        createdAt: serverTimestamp()
      });

      // update request
      tx.update(reqRef, {
        driverId,
        status: 'accepted',
        assignedAt: serverTimestamp(),
        conversationId,
      });

      // Optionnel : decrement seatsAvailable on ride (si présent) - si tu veux gérer la capacité
      if (r.rideId) {
        const rideRef = doc(db, RIDES, String(r.rideId));
        const rideSnap = await tx.get(rideRef);
        if (rideSnap.exists()) {
          const rideData = rideSnap.data();
          if (typeof rideData.seatsAvailable === 'number' && rideData.seatsAvailable > 0) {
            tx.update(rideRef, { seatsAvailable: rideData.seatsAvailable - Number(r.passengerCount || 1) });
          }
        }
      }
    });

    return { conversationId };
  } catch (e) {
    console.warn('acceptRequestAndCreateConversation error', e);
    throw e;
  }
}


export async function rejectRequestForRide(requestId, driverId) {
  if (!requestId || !driverId) throw new Error('requestId et driverId requis');
  const reqRef = doc(db, REQUESTS, String(requestId));
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(reqRef);
      if (!snap.exists()) throw new Error('Request introuvable');
      const r = snap.data();
      // simple journal, on peut aussi set status = 'rejected'
      tx.update(reqRef, {
        driverDeclinedBy: driverId,
        driverDeclinedAt: serverTimestamp(),
        status: 'rejected'
      });
    });
    return true;
  } catch (e) {
    console.warn('rejectRequestForRide error', e);
    throw e;
  }
}