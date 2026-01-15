import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  runTransaction,
  query,
  where,
  orderBy,
  onSnapshot,
  limit as limitQuery,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';
import findPermissive from './findMatchingRides';
import findStrict from './findMatchingRidesStrict';
import {
  haversineDistance,
  minDistanceToRouteMeters,
  indexOfNearestPointOnRoute,
} from '../utils/geo';

const REQUESTS = 'requests';
const RIDES = 'rides';
const USERS = 'users';
const CONVERSATIONS = 'conversations';

/* one-time legacy warning flag */
let _createRequestWarned = false;

/* -------------------------
   createRequest
   ------------------------- */
/**
 * createRequest supports two signatures:
 *  - createRequest(userId, passengerCount=1, note='', extras={})
 *  - createRequest(null, userId, passengerCount, note, extras)  // legacy (warn)
 *
 * This version also attempts to include requesterName in the request payload
 * so UIs can display the user's name without an extra lookup.
 */
export async function createRequest(a, b = 1, c = '', d = {}) {
  let userId;
  let passengerCount;
  let note;
  let extras;

  if ((a === null || a === undefined) && typeof b === 'string') {
    if (!_createRequestWarned) {
      console.warn('createRequest called with legacy signature (null, userId, ...). Update callers to createRequest(userId, ...).');
      _createRequestWarned = true;
    }
    userId = b;
    passengerCount = typeof c === 'number' ? c : (parseInt(c, 10) || 1);
    note = typeof d === 'string' ? d : '';
    extras = (arguments.length >= 5 && typeof arguments[4] === 'object') ? arguments[4] : (typeof d === 'object' ? d : {});
  } else {
    userId = a;
    passengerCount = typeof b === 'number' ? b : (parseInt(b, 10) || 1);
    note = typeof c === 'string' ? c : '';
    extras = typeof d === 'object' ? d : {};
  }

  if (!userId) throw new Error('createRequest: userId required');

  // Try to resolve the user's display name to include with the request
  let requesterName = null;
  try {
    const profile = await getUserProfile(userId);
    requesterName = profile?.displayName || profile?.name || null;
  } catch (e) {
    requesterName = null;
  }

  const payload = {
    userId,
    requesterName, // <-- added: display name snapshot to avoid extra reads in driver UI
    passengerCount: Number(passengerCount || 1),
    note: note || null,
    createdAt: serverTimestamp(),
    status: 'open',
    pickup: extras.origin || extras.pickup || null,
    origin: extras.origin || extras.pickup || null,
    destination: extras.destination || extras.dest || null,
    dest: extras.destination || extras.dest || null,
  };

  if (extras.date) {
    const dt = extras.date instanceof Date ? extras.date : new Date(extras.date);
    if (!isNaN(dt.getTime())) payload.date = Timestamp.fromDate(dt);
  }

  const ref = await addDoc(collection(db, REQUESTS), payload);
  return ref.id;
}

/* -------------------------
   createRequestWithPrecheck
   ------------------------- */
/**
 * Finds matching rides first. By default does NOT auto-create an open request.
 *
 * Returns:
 *  - { matched: true, matches } when matches exist
 *  - { matched: false } when no matches and autoCreateOpen === false
 *  - { matched: false, requestId } when no matches and autoCreateOpen === true
 */
export async function createRequestWithPrecheck(
  rideId = null,
  userId,
  passengerCount = 1,
  note = '',
  extras = {},
  options = {}
) {
  const {
    permissive = false,
    permissiveFallback = false,
    dateToleranceHours = 2,
    pickupRadius = 800,
    destRadius = 800,
    maxResults = 50,
    autoCreateOpen = false, // default false: UI must confirm creating open request
  } = options || {};

  const params = {
    origin: extras.origin || extras.pickup || null,
    destination: extras.destination || extras.dest || null,
    date: extras.date || null,
    dateToleranceHours,
    pickupRadius,
    destRadius,
    maxResults,
    permissive,
  };

  console.log('createRequestWithPrecheck params=', params, 'options=', { permissive, permissiveFallback, autoCreateOpen });

  let matches = [];
  try {
    if (!permissive && typeof findStrict?.findMatchingRidesStrict === 'function') {
      matches = await findStrict.findMatchingRidesStrict({ ...params, maxResults });
      console.log('strict matcher results=', matches?.length || 0);
    } else if (typeof findPermissive?.findMatchingRides === 'function') {
      matches = await findPermissive.findMatchingRides({ ...params, maxResults, permissive });
      console.log('permissive matcher results=', matches?.length || 0);
    }

    // optional permissive fallback if strict returned nothing
    if ((!matches || matches.length === 0) && !permissive && permissiveFallback && typeof findPermissive?.findMatchingRides === 'function') {
      console.log('strict returned 0, trying permissive fallback');
      matches = await findPermissive.findMatchingRides({ ...params, maxResults: Math.max(200, maxResults), permissive: true });
      console.log('permissive fallback results=', matches?.length || 0);
    }
  } catch (e) {
    console.warn('createRequestWithPrecheck matcher error', e);
    matches = [];
  }

  if (Array.isArray(matches) && matches.length > 0) {
    return { matched: true, matches };
  }

  if (autoCreateOpen) {
    console.log('No matches — auto-creating open request for user', userId);
    const requestId = await createRequest(userId, passengerCount, note, extras);
    return { matched: false, requestId };
  }

  return { matched: false };
}

/* -------------------------
   Matching wrapper
   ------------------------- */
export async function findMatchingRidesForParams(params = {}, maxResults = 50) {
  const { permissive = true } = params;
  if (!permissive && typeof findStrict?.findMatchingRidesStrict === 'function') {
    return await findStrict.findMatchingRidesStrict({ ...params, maxResults });
  }
  if (typeof findPermissive?.findMatchingRides === 'function') {
    return await findPermissive.findMatchingRides({ ...params, maxResults, permissive });
  }
  return [];
}

/* -------------------------
   Request / ride operations
   ------------------------- */
export async function requestSeat(rideId, userId, passengerCount = 1, note = '') {
  if (!userId) throw new Error('userId required');
  if (!rideId) throw new Error('rideId required for requestSeat');
  const payload = {
    userId,
    rideId: String(rideId),
    passengerCount: Number(passengerCount || 1),
    note: note || null,
    status: 'pending',
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, REQUESTS), payload);
  return ref.id;
}

export async function updateRequest(requestId, data = {}) {
  if (!requestId) throw new Error('updateRequest: requestId missing');
  if (!data || typeof data !== 'object') throw new Error('updateRequest: data must be an object');

  const ref = doc(db, REQUESTS, String(requestId));
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
  return true;
}

/* -------------------------
   Listeners
   ------------------------- */
export function listenRequest(requestId, onUpdate, onError) {
  if (!requestId || typeof onUpdate !== 'function') {
    console.warn('listenRequest invalid args', requestId);
    return () => {};
  }
  try {
    const ref = doc(db, REQUESTS, String(requestId));
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.exists() ? { id: snap.id, ...(snap.data() || {}) } : null;
      try { onUpdate(data); } catch (e) { console.warn('listenRequest handler error', e); }
    }, (err) => {
      console.warn('listenRequest snapshot error', err);
      if (typeof onError === 'function') onError(err);
    });
    return unsub;
  } catch (err) {
    console.warn('listenRequest failed', err);
    return () => {};
  }
}

export function listenRequestsForRide(rideId, onUpdate, onError) {
  if (!rideId || typeof onUpdate !== 'function') {
    console.warn('listenRequestsForRide invalid args', rideId);
    return () => {};
  }
  try {
    const q = query(collection(db, REQUESTS), where('rideId', '==', String(rideId)), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));
      try { onUpdate(rows); } catch (e) { console.warn('listenRequestsForRide handler error', e); }
    }, (err) => {
      console.warn('listenRequestsForRide snapshot error', err);
      if (typeof onError === 'function') onError(err);
    });
    return unsub;
  } catch (err) {
    console.warn('listenRequestsForRide failed', err);
    return () => {};
  }
}

export function listenOpenRequests(paramsOrOnUpdate, maybeOnUpdate, maybeOnError) {
  let params = {};
  let onUpdate = null;
  let onError = null;
  if (typeof paramsOrOnUpdate === 'function') {
    onUpdate = paramsOrOnUpdate;
    onError = maybeOnUpdate;
  } else {
    params = paramsOrOnUpdate || {};
    onUpdate = maybeOnUpdate;
    onError = maybeOnError;
  }
  if (typeof onUpdate !== 'function') {
    console.warn('listenOpenRequests: onUpdate required');
    return () => {};
  }

  const { limit = 100 } = params || {};

  try {
    const q = query(collection(db, REQUESTS), where('status', '==', 'open'), orderBy('createdAt', 'desc'), limitQuery(limit));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));
      try { onUpdate(docs); } catch (e) { console.warn('listenOpenRequests handler error', e); }
    }, (err) => {
      console.warn('listenOpenRequests snapshot error', err);
      if (typeof onError === 'function') onError(err);
    });
    return unsub;
  } catch (err) {
    console.warn('listenOpenRequests failed', err);
    return () => {};
  }
}

/* -------------------------
   Helpers: deterministic conversation & lookup
   ------------------------- */

/**
 * makeDeterministicConversationId(driverId, userId, rideId)
 * Generates a stable conversation id for the pair (optionally bound to rideId).
 */
function makeDeterministicConversationId(driverId, userId, rideId = null) {
  const pair = [String(driverId), String(userId)].sort().join('__');
  return rideId ? `conv_${pair}__ride_${String(rideId)}` : `conv_${pair}`;
}

/**
 * findConversationByParticipants(driverId, userId, rideId = null)
 * Query conversations that contain driverId and filter for userId (and optionally rideId).
 */
export async function findConversationByParticipants(driverId, userId, rideId = null) {
  if (!driverId || !userId) return null;
  try {
    const q = query(collection(db, CONVERSATIONS), where('participants', 'array-contains', String(driverId)), limitQuery(50));
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      const data = d.data();
      const parts = Array.isArray(data.participants) ? data.participants.map(String) : [];
      if (parts.includes(String(userId))) {
        if (rideId) {
          if (data.rideId && String(data.rideId) === String(rideId)) {
            return { id: d.id, ...data };
          }
          // If rideId provided but conv has no rideId, we still may reuse it; return it optionally.
          return { id: d.id, ...data };
        } else {
          return { id: d.id, ...data };
        }
      }
    }
    return null;
  } catch (e) {
    console.warn('findConversationByParticipants error', e);
    return null;
  }
}

/* -------------------------
   Accept / Reject helpers
   ------------------------- */
/**
 * acceptRequestAndCreateConversation(requestId, driverId, initialMessage = '')
 *
 * Ensures a single conversation per driver-user pair (optionally ride-bound).
 * - Reuses existing conversation if found
 * - Otherwise creates conversation with deterministic id inside transaction to avoid duplicates
 * - Updates the request to accepted and sets conversationId
 * - Creates initial message outside transaction
 */
export async function acceptRequestAndCreateConversation(requestId, driverId, initialMessage = '') {
  if (!requestId) throw new Error('requestId required');
  if (!driverId) throw new Error('driverId required');

  const reqRef = doc(db, REQUESTS, String(requestId));
  let conversationId = null;

  // Read request to get userId and rideId
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) throw new Error('request not found');
  const r = reqSnap.data();
  const requesterId = r.userId || r.requesterId || null;
  const rideId = r.rideId || null;
  if (!requesterId) throw new Error('request missing userId');

  // Try to find existing conversation
  const existing = await findConversationByParticipants(driverId, requesterId, rideId);
  if (existing && existing.id) {
    conversationId = existing.id;
  }

  // Deterministic id (used if we need to create)
  const deterministicId = conversationId || makeDeterministicConversationId(driverId, requesterId, rideId);

  // Transaction: create conversation if needed and update request
  await runTransaction(db, async (tx) => {
    const txReqSnap = await tx.get(reqRef);
    if (!txReqSnap.exists()) throw new Error('request not found (tx)');
    const txReq = txReqSnap.data();
    if (txReq.status === 'accepted' || txReq.driverId) throw new Error('request already assigned');

    const convRef = doc(db, CONVERSATIONS, deterministicId);
    const convSnap = await tx.get(convRef);
    if (convSnap.exists()) {
      conversationId = convRef.id;
    } else {
      const participants = Array.from(new Set([String(driverId), String(requesterId)]));
      tx.set(convRef, {
        participants,
        rideId: rideId || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: initialMessage || null,
      });
      conversationId = convRef.id;
    }

    tx.update(reqRef, {
      driverId: String(driverId),
      status: 'accepted',
      assignedAt: serverTimestamp(),
      conversationId,
    });

    // decrement seats on ride if present
    if (txReq.rideId) {
      const rideRef = doc(db, RIDES, String(txReq.rideId));
      const rideSnap = await tx.get(rideRef);
      if (rideSnap.exists()) {
        const rideData = rideSnap.data();
        const seats = (typeof rideData.seatsAvailable === 'number') ? rideData.seatsAvailable : (typeof rideData.seats === 'number' ? rideData.seats : null);
        if (typeof seats === 'number' && seats > 0) {
          tx.update(rideRef, { seatsAvailable: seats - Number(txReq.passengerCount || 1) });
        }
      }
    }
  });

  // Create initial message after transaction (separate write)
  if (initialMessage && initialMessage.trim()) {
    try {
      const msgsCol = collection(db, `${CONVERSATIONS}/${conversationId}/messages`);
      await addDoc(msgsCol, {
        from: String(driverId),
        senderId: String(driverId),
        text: initialMessage.trim(),
        createdAt: serverTimestamp(),
      });
      try {
        const convRef = doc(db, CONVERSATIONS, conversationId);
        await updateDoc(convRef, { lastMessage: initialMessage.trim(), updatedAt: serverTimestamp() });
      } catch (e) {
        console.warn('Failed to update conversation metadata after posting initial message', e);
      }
    } catch (e) {
      console.warn('Failed to create initial message after transaction', e);
    }
  }

  return { conversationId, requestId };
}

export async function rejectRequestForRide(requestId, driverId) {
  if (!requestId) throw new Error('requestId required');
  if (!driverId) throw new Error('driverId required');

  const reqRef = doc(db, REQUESTS, String(requestId));
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(reqRef);
    if (!snap.exists()) throw new Error('request not found');
    tx.update(reqRef, {
      status: 'rejected',
      driverDeclinedBy: driverId,
      driverDeclinedAt: serverTimestamp(),
    });
  });
  return true;
}

/* -------------------------
   Conversations / messages helpers
   ------------------------- */
export function listenUserConversations(uid, onUpdate, onError) {
  if (!uid || typeof onUpdate !== 'function') return () => {};
  try {
    const q = query(collection(db, CONVERSATIONS), where('participants', 'array-contains', uid), orderBy('updatedAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const convs = snap.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));
      try { onUpdate(convs); } catch (e) { console.warn(e); }
    }, (err) => { if (typeof onError === 'function') onError(err); });
    return unsub;
  } catch (e) {
    console.warn('listenUserConversations failed', e);
    return () => {};
  }
}

export function listenConversation(conversationId, onUpdate, onError) {
  if (!conversationId || typeof onUpdate !== 'function') return () => {};
  try {
    const ref = doc(db, CONVERSATIONS, conversationId);
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.exists() ? { id: snap.id, ...(snap.data() || {}) } : null;
      try { onUpdate(data); } catch (e) { console.warn(e); }
    }, (err) => { if (typeof onError === 'function') onError(err); });
    return unsub;
  } catch (e) {
    console.warn('listenConversation failed', e);
    return () => {};
  }
}

export function listenConversationMessages(conversationId, onUpdate, onError) {
  if (!conversationId || typeof onUpdate !== 'function') return () => {};
  try {
    const msgsCol = collection(db, `${CONVERSATIONS}/${conversationId}/messages`);
    const q = query(msgsCol, orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));
      try { onUpdate(msgs); } catch (e) { console.warn(e); }
    }, (err) => { if (typeof onError === 'function') onError(err); });
    return unsub;
  } catch (e) {
    console.warn('listenConversationMessages failed', e);
    return () => {};
  }
}

export async function sendMessage(conversationId, senderId, text, senderName = null) {
  if (!conversationId) throw new Error('conversationId required');
  if (!senderId) throw new Error('senderId required');
  if (typeof text !== 'string' || !text.trim()) throw new Error('text required');
  const msgsCol = collection(db, `${CONVERSATIONS}/${conversationId}/messages`);
  const payload = {
    senderId: String(senderId),
    from: String(senderId),
    senderName: senderName || null,
    text: text.trim(),
    createdAt: serverTimestamp()
  };
  const ref = await addDoc(msgsCol, payload);
  try {
    const convRef = doc(db, CONVERSATIONS, conversationId);
    await updateDoc(convRef, { updatedAt: serverTimestamp(), lastMessage: payload.text, lastMessageSender: senderId });
  } catch (e) {
    console.warn('sendMessage: update conversation failed', e);
  }
  return ref.id;
}

/* -------------------------
   Utility
   ------------------------- */
export async function getUserProfile(uid) {
  if (!uid) return null;
  try {
    const uRef = doc(db, USERS, String(uid));
    const snap = await getDoc(uRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() || {}) };
  } catch (e) {
    console.warn('getUserProfile failed', e);
    return null;
  }
}

export async function markConversationRead(conversationId, userId) {
  if (!conversationId || !userId) throw new Error('conversationId and userId required');
  try {
    const convRef = doc(db, CONVERSATIONS, String(conversationId));
    await updateDoc(convRef, { [`lastRead.${userId}`]: serverTimestamp() });
    return true;
  } catch (e) {
    console.warn('markConversationRead failed', e);
    throw e;
  }
}

/* -------------------------
   Matching requests for a ride (driver view)
   ------------------------- */
export async function findMatchingRequestsForRide(ride = {}, options = {}) {
  const {
    dateToleranceHours = 2,
    pickupRadius = 1000,
    destRadius = 1000,
    maxResults = 200,
  } = options || {};

  if (!ride) return [];

  let rideDate = null;
  if (ride.date) {
    try {
      rideDate = ride.date.toDate ? ride.date.toDate() : new Date(ride.date);
    } catch {
      rideDate = null;
    }
  }

  try {
    const q = query(collection(db, REQUESTS), where('status', '==', 'open'), orderBy('createdAt', 'desc'), limitQuery(maxResults));
    const snap = await getDocs(q);
    const candidates = [];

    snap.forEach((d) => {
      const r = d.data();
      const origin = r.origin || r.pickup || null;
      const destination = r.destination || r.dest || null;
      const reqDate = r.date ? (r.date.toDate ? r.date.toDate() : new Date(r.date)) : null;

      if (!origin || !destination) return;

      if (rideDate && reqDate) {
        const diffH = Math.abs(rideDate.getTime() - reqDate.getTime()) / 3600000;
        if (diffH > dateToleranceHours) return;
      }

      let pickupDist = Infinity;
      if (Array.isArray(ride.route) && ride.route.length > 0) {
        try {
          const idx = indexOfNearestPointOnRoute(origin, ride.route);
          if (idx >= 0 && ride.route[idx]) pickupDist = haversineDistance(origin, ride.route[idx]);
          else pickupDist = minDistanceToRouteMeters(origin, ride.route);
        } catch {
          pickupDist = minDistanceToRouteMeters(origin, ride.route);
        }
      } else if (ride.startLocation) {
        pickupDist = haversineDistance(origin, ride.startLocation);
      } else return;
      if (pickupDist > pickupRadius) return;

      let destDist = Infinity;
      if (Array.isArray(ride.route) && ride.route.length > 0) {
        try {
          const idx2 = indexOfNearestPointOnRoute(destination, ride.route);
          if (idx2 >= 0 && ride.route[idx2]) destDist = haversineDistance(destination, ride.route[idx2]);
          else destDist = minDistanceToRouteMeters(destination, ride.route);
        } catch {
          destDist = minDistanceToRouteMeters(destination, ride.route);
        }
      } else if (ride.endLocation) {
        destDist = haversineDistance(destination, ride.endLocation);
      } else return;
      if (destDist > destRadius) return;

      candidates.push({ id: d.id, ...(r || {}) });
    });

    return candidates;
  } catch (e) {
    console.warn('findMatchingRequestsForRide error', e);
    return [];
  }
}

export function listenMatchingRequestsForRide(ride = {}, onUpdate, onError, options = {}) {
  if (!ride || typeof onUpdate !== 'function') {
    console.warn('listenMatchingRequestsForRide: invalid args');
    return () => {};
  }

  const {
    dateToleranceHours = 2,
    pickupRadius = 1000,
    destRadius = 1000,
    limit = 200,
  } = options || {};

  try {
    const q = query(collection(db, REQUESTS), where('status', '==', 'open'), orderBy('createdAt', 'desc'), limitQuery(limit));
    const unsub = onSnapshot(q, (snap) => {
      try {
        const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));
        const filtered = rows.filter((r) => {
          try {
            const origin = r.origin || r.pickup || null;
            const destination = r.destination || r.dest || null;
            const reqDate = r.date ? (r.date.toDate ? r.date.toDate() : new Date(r.date)) : null;
            if (!origin || !destination) return false;

            if (ride.date && reqDate) {
              const rideDate = ride.date.toDate ? ride.date.toDate() : new Date(ride.date);
              const diffH = Math.abs(rideDate.getTime() - reqDate.getTime()) / 3600000;
              if (diffH > dateToleranceHours) return false;
            }

            let pickupDist = Infinity;
            if (Array.isArray(ride.route) && ride.route.length > 0) {
              const idx = indexOfNearestPointOnRoute(origin, ride.route);
              if (idx >= 0 && ride.route[idx]) pickupDist = haversineDistance(origin, ride.route[idx]);
              else pickupDist = minDistanceToRouteMeters(origin, ride.route);
            } else if (ride.startLocation) {
              pickupDist = haversineDistance(origin, ride.startLocation);
            } else return false;
            if (pickupDist > pickupRadius) return false;

            let destDist = Infinity;
            if (Array.isArray(ride.route) && ride.route.length > 0) {
              const idx2 = indexOfNearestPointOnRoute(destination, ride.route);
              if (idx2 >= 0 && ride.route[idx2]) destDist = haversineDistance(destination, ride.route[idx2]);
              else destDist = minDistanceToRouteMeters(destination, ride.route);
            } else if (ride.endLocation) {
              destDist = haversineDistance(destination, ride.endLocation);
            } else return false;
            if (destDist > destRadius) return false;

            return true;
          } catch (e) {
            console.warn('listenMatchingRequestsForRide filter error', e);
            return false;
          }
        });

        try { onUpdate(filtered); } catch (e) { console.warn('listenMatchingRequestsForRide onUpdate handler error', e); }
      } catch (e) {
        console.warn('listenMatchingRequestsForRide snapshot processing error', e);
        try { if (typeof onError === 'function') onError(e); } catch {}
      }
    }, (err) => {
      console.warn('listenMatchingRequestsForRide snapshot error', err);
      if (typeof onError === 'function') onError(err);
    });

    return unsub;
  } catch (err) {
    console.warn('listenMatchingRequestsForRide failed', err);
    return () => {};
  }
}

/* -------------------------
   Default export
   ------------------------- */
const defaultExport = {
  createRequest,
  createRequestWithPrecheck,
  findMatchingRidesForParams,
  requestSeat,
  updateRequest,
  listenRequest,
  listenRequestsForRide,
  listenOpenRequests,
  acceptRequestAndCreateConversation,
  rejectRequestForRide,
  listenUserConversations,
  listenConversation,
  listenConversationMessages,
  sendMessage,
  getUserProfile,
  markConversationRead,
  findMatchingRequestsForRide,
  listenMatchingRequestsForRide,
  findConversationByParticipants,
  makeDeterministicConversationId,
};

export default defaultExport;
if (typeof module !== 'undefined' && module.exports) module.exports = defaultExport;