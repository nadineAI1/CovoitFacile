const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Trigger: new request -> notify driver
 */
exports.onRequestCreated = functions.firestore.document('requests/{reqId}').onCreate(async (snap, context) => {
  const req = snap.data();
  const rideId = req.rideId;
  if (!rideId) return null;
  const rideSnap = await db.collection('rides').doc(rideId).get();
  if (!rideSnap.exists) return null;
  const ride = rideSnap.data();
  const driverId = ride.driverId;
  if (!driverId) return null;
  const driverSnap = await db.collection('users').doc(driverId).get();
  if (!driverSnap.exists) return null;
  const driver = driverSnap.data();

  const payload = {
    notification: {
      title: 'Nouvelle demande',
      body: `Nouvelle demande pour ${ride.origin || ''} → ${ride.destination || ''}`,
    },
    data: { type: 'request_created', rideId: String(rideId), requestId: context.params.reqId },
  };

  if (driver.fcmToken) {
    try {
      await messaging.sendToDevice(driver.fcmToken, payload);
    } catch (err) {
      console.error('FCM send error', err);
    }
  }

  return null;
});

/**
 * Trigger: request updated -> notify passenger
 */
exports.onRequestUpdated = functions.firestore.document('requests/{reqId}').onUpdate(async (change, context) => {
  const before = change.before.data();
  const after = change.after.data();

  if (before.status !== after.status) {
    const passengerId = after.userId;
    if (!passengerId) return null;
    const passengerSnap = await db.collection('users').doc(passengerId).get();
    const passenger = passengerSnap.exists ? passengerSnap.data() : null;
    if (!passenger) return null;

    const payload = {
      notification: {
        title: after.status === 'accepted' ? 'Demande acceptée' : 'Demande mise à jour',
        body: after.status === 'accepted' ? 'Ta demande a été acceptée par le conducteur.' : `Ta demande est ${after.status}.`,
      },
      data: { type: 'request_updated', requestId: context.params.reqId, status: after.status },
    };

    if (passenger.fcmToken) {
      try {
        await messaging.sendToDevice(passenger.fcmToken, payload);
      } catch (err) {
        console.error('FCM send error', err);
      }
    }
  }

  return null;
});

/**
 * Callable function: deleteConversation
 * - data: { conversationId }
 * - context.auth.uid must be participant of the conversation
 *
 * This runs with admin privileges and will delete all messages (in batches) then the conversation doc.
 */
exports.deleteConversation = functions.https.onCall(async (data, context) => {
  const uid = context.auth && context.auth.uid;
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'La requête doit être authentifiée.');
  }

  const conversationId = data && data.conversationId;
  if (!conversationId) {
    throw new functions.https.HttpsError('invalid-argument', 'conversationId requis.');
  }

  const convRef = db.collection('conversations').doc(String(conversationId));
  const convSnap = await convRef.get();
  if (!convSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Conversation introuvable.');
  }

  const conv = convSnap.data();
  const participants = Array.isArray(conv.participants) ? conv.participants : [];
  if (!participants.includes(uid)) {
    throw new functions.https.HttpsError('permission-denied', 'Vous n\'êtes pas autorisé à supprimer cette conversation.');
  }

  try {
    // Delete messages in batches (500 per batch)
    const messagesCol = convRef.collection('messages');
    while (true) {
      const snap = await messagesCol.limit(500).get();
      if (snap.empty) break;
      const batch = db.batch();
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }

    // delete conversation doc
    await convRef.delete();

    return { success: true };
  } catch (err) {
    console.error('deleteConversation error', err);
    throw new functions.https.HttpsError('internal', 'Erreur lors de la suppression.');
  }
});