import {
  collection,
  getDocs,
  query,
  limit as limitQuery,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  haversineDistance,
  minDistanceToRouteMeters,
  indexOfNearestPointOnRoute,
} from '../utils/geo';

/**
 * STRICT MATCHER – VERSION CORRIGÉE ET SÉCURISÉE
 */
export async function findMatchingRidesStrict({
  origin,
  destination,
  date, // optionnel
  dateToleranceHours = 2,
  pickupRadius = 800,   // en mètres
  destRadius = 800,     // en mètres
  maxResults = 50,
}) {
  if (!origin || !destination) {
    console.warn('findMatchingRidesStrict: missing origin or destination');
    return [];
  }

  // 🔒 NETTOYAGE CRITIQUE DES COORDONNÉES
  const cleanOrigin = {
    lat: Number(origin.lat),
    lng: Number(origin.lng),
  };

  const cleanDestination = {
    lat: Number(destination.lat),
    lng: Number(destination.lng),
  };

  if (
    isNaN(cleanOrigin.lat) ||
    isNaN(cleanOrigin.lng) ||
    isNaN(cleanDestination.lat) ||
    isNaN(cleanDestination.lng)
  ) {
    console.warn('findMatchingRidesStrict: invalid coordinates after cleaning');
    return [];
  }

  // ---------------- DATE ----------------
  let dateObj = null;
  if (date) {
    const d = date instanceof Date ? date : new Date(date);
    if (!isNaN(d.getTime())) dateObj = d;
  }

  try {
    const q = query(collection(db, 'rides'), limitQuery(maxResults));
    const snapshot = await getDocs(q);

    const results = [];

    snapshot.forEach((docSnap) => {
      const ride = docSnap.data();

      // Ignore ride inactif UNIQUEMENT si false
      if (ride.isActive === false) return;

      // ---------------- DATE CHECK ----------------
      if (dateObj && ride.date) {
        let rideDate = null;
        try {
          rideDate = ride.date.toDate ? ride.date.toDate() : new Date(ride.date);
        } catch {
          rideDate = null;
        }

        if (rideDate) {
          const diffHours =
            Math.abs(rideDate.getTime() - dateObj.getTime()) / 3600000;
          if (diffHours > dateToleranceHours) return;
        }
      }

      // ---------------- PICKUP DISTANCE ----------------
      let pickupDist = Infinity;

      const ridePickup =
        ride.startLocation ||
        ride.pickup ||
        ride.origin ||
        null;

      if (Array.isArray(ride.route) && ride.route.length > 0) {
        try {
          const idx = indexOfNearestPointOnRoute(cleanOrigin, ride.route);
          if (idx >= 0 && ride.route[idx]) {
            pickupDist = haversineDistance(
              cleanOrigin,
              { lat: ride.route[idx].lat, lng: ride.route[idx].lng }
            );
          } else {
            pickupDist = minDistanceToRouteMeters(cleanOrigin, ride.route);
          }
        } catch (e) {
          pickupDist = minDistanceToRouteMeters(cleanOrigin, ride.route);
        }
      } else if (
        ridePickup &&
        typeof ridePickup.lat === 'number' &&
        typeof ridePickup.lng === 'number'
      ) {
        pickupDist = haversineDistance(
          cleanOrigin,
          { lat: ridePickup.lat, lng: ridePickup.lng }
        );
      }

      if (isNaN(pickupDist) || pickupDist > pickupRadius) return;

      // ---------------- DESTINATION DISTANCE ----------------
      let destDist = Infinity;

      const rideDest =
        ride.endLocation ||
        ride.dest ||
        ride.destination ||
        null;

      if (Array.isArray(ride.route) && ride.route.length > 0) {
        try {
          const idx2 = indexOfNearestPointOnRoute(cleanDestination, ride.route);
          if (idx2 >= 0 && ride.route[idx2]) {
            destDist = haversineDistance(
              cleanDestination,
              { lat: ride.route[idx2].lat, lng: ride.route[idx2].lng }
            );
          } else {
            destDist = minDistanceToRouteMeters(cleanDestination, ride.route);
          }
        } catch (e) {
          destDist = minDistanceToRouteMeters(cleanDestination, ride.route);
        }
      } else if (
        rideDest &&
        typeof rideDest.lat === 'number' &&
        typeof rideDest.lng === 'number'
      ) {
        destDist = haversineDistance(
          cleanDestination,
          { lat: rideDest.lat, lng: rideDest.lng }
        );
      }

      if (isNaN(destDist) || destDist > destRadius) return;

      // ---------------- MATCH OK ----------------
      results.push({
        id: docSnap.id,
        ...ride,
        _debug: {
          pickupDist: Math.round(pickupDist),
          destDist: Math.round(destDist),
        },
      });
    });

    console.log('STRICT MATCH RESULTS =', results.length, results);
    return results;
  } catch (e) {
    console.warn('findMatchingRidesStrict error:', e);
    return [];
  }
}

export default {
  findMatchingRidesStrict,
};
