import {
  collection,
  query,
  orderBy,
  getDocs,
  limit,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  haversineDistance,
  minDistanceToRouteMeters,
  indexOfNearestPointOnRoute,
  routePassesThroughWaypoints,
} from '../utils/geo';

const RIDES = 'rides';

function safeData(d) {
  try { return d && typeof d.data === 'function' ? (d.data() || {}) : (d || {}); } catch (e) { return {}; }
}

function matchDate(rideDateTimestamp, desiredDate, toleranceHours = 6) {
  if (!rideDateTimestamp || !desiredDate) return false;
  const rideDate = rideDateTimestamp.toDate ? rideDateTimestamp.toDate() : (rideDateTimestamp instanceof Date ? rideDateTimestamp : new Date(rideDateTimestamp));
  const diffMs = Math.abs(rideDate.getTime() - desiredDate.getTime());
  const tolMs = Math.max(0, Number(toleranceHours) || 6) * 3600 * 1000;
  return diffMs <= tolMs;
}

function getNearestRouteIndexWithinTolerance(point, route, toleranceMeters = 800) {
  if (!point || !Array.isArray(route) || route.length === 0) return -1;
  const idx = indexOfNearestPointOnRoute(point, route);
  if (typeof idx === 'number' && idx >= 0) {
    const d = haversineDistance(point, route[idx]);
    if (d <= toleranceMeters) return idx;
  }
  let bestIdx = -1;
  let bestDist = Infinity;
  for (let i = 0; i < route.length; i++) {
    const p = route[i];
    if (!p || typeof p.lat !== 'number') continue;
    const dist = haversineDistance(point, p);
    if (dist < bestDist) { bestDist = dist; bestIdx = i; }
  }
  return bestDist <= toleranceMeters ? bestIdx : -1;
}

/**
 * findMatchingRides(params)
 *
 * Par défaut : permissive = true (tolérances larges, acceptation rides sans date/without seats)
 * Pour un comportement strict, appeler avec permissive=false et ajuster les tolérances.
 */
export async function findMatchingRides({
  origin = null,
  destination = null,
  waypoints = null,
  date = null,
  dateToleranceHours = 6,
  pickupRadius = 8000,      // plus permissif par défaut
  destRadius = 8000,        // plus permissif par défaut
  waypointToleranceMeters = 800,
  requireWaypointOrder = false, // permissif
  stopToleranceMeters = 800,
  requireStopsOrder = false,    // permissif
  maxResults = 50,
  permissive = true,
} = {}) {
  try {
    const desiredDate = date ? (date instanceof Date ? date : new Date(date)) : null;
    const isOriginGeo = origin && typeof origin === 'object' && typeof origin.lat === 'number' && typeof origin.lng === 'number';
    const isDestGeo = destination && typeof destination === 'object' && typeof destination.lat === 'number' && typeof destination.lng === 'number';

    const ridesCol = collection(db, RIDES);
    let candidates = [];

    // Fast-path label match if user passed strings
    if (!isOriginGeo && !isDestGeo && origin && destination && typeof origin === 'string' && typeof destination === 'string') {
      try {
        const q = query(ridesCol, where('origin', '==', origin), where('destination', '==', destination), orderBy('createdAt', 'desc'), limit(maxResults));
        const snap = await getDocs(q);
        snap.forEach(d => candidates.push({ id: d.id, ...safeData(d) }));
        if (desiredDate) candidates = candidates.filter(r => matchDate(r.date, desiredDate, dateToleranceHours));
        if (candidates.length) return candidates.slice(0, maxResults);
      } catch (e) {
        console.warn('findMatchingRides exact label query failed', e);
      }
    }

    // initial fetch: prune by latitude band if origin geo available
    async function fetchByLatRange(center, radiusMeters, limitCount = 1200) {
      const dLat = radiusMeters / 111320;
      const minLat = center.lat - dLat;
      const maxLat = center.lat + dLat;
      try {
        const q = query(ridesCol, where('startLocation.lat', '>=', minLat), where('startLocation.lat', '<=', maxLat), orderBy('createdAt', 'desc'), limit(limitCount));
        const snap = await getDocs(q);
        const rows = [];
        snap.forEach(d => rows.push({ id: d.id, ...safeData(d) }));
        return rows;
      } catch (e) {
        console.warn('fetchByLatRange failed', e);
        return [];
      }
    }

    if (isOriginGeo) {
      const rows = await fetchByLatRange(origin, Math.max(pickupRadius, 10000), 1200);
      candidates.push(...rows);
    }

    // fallback: fetch recent rides
    if (candidates.length === 0) {
      try {
        const q = query(ridesCol, orderBy('createdAt', 'desc'), limit(1200));
        const snap = await getDocs(q);
        snap.forEach(d => candidates.push({ id: d.id, ...safeData(d) }));
      } catch (e) {
        console.warn('findMatchingRides: fallback fetch failed', e);
      }
    }

    // dedupe
    const uniq = {};
    const uniqueCandidates = [];
    for (const r of candidates) {
      if (!r || !r.id) continue;
      if (!uniq[r.id]) { uniq[r.id] = true; uniqueCandidates.push(r); }
    }

    const results = [];

    for (const ride of uniqueCandidates) {
      try {
        if (!ride) continue;
        if (ride.isActive === false) {
          // skip explicitly inactive rides
          console.debug('skip inactive ride', ride.id);
          continue;
        }

        // seats: prefer seatsAvailable, fallback to seats, else unknown -> assume available (permissive)
        const seatsAvailable = (typeof ride.seatsAvailable === 'number') ? ride.seatsAvailable
          : (typeof ride.seats === 'number' ? ride.seats : null);

        if (typeof seatsAvailable === 'number' && seatsAvailable <= 0) {
          console.debug('skip ride, no seats', ride.id, 'seatsAvailable=', seatsAvailable);
          if (!permissive) continue;
        }

        // date check (only if desiredDate provided)
        if (desiredDate) {
          if (!ride.date) {
            console.debug('ride has no date (permissive ok)', ride.id);
            if (!permissive) continue;
          } else if (!matchDate(ride.date, desiredDate, dateToleranceHours)) {
            console.debug('ride date mismatch', ride.id);
            if (!permissive) continue;
          }
        }

        // waypoint check
        if (Array.isArray(waypoints) && waypoints.length > 0) {
          if (!Array.isArray(ride.route) || ride.route.length === 0) {
            console.debug('ride has no route but waypoints requested (permissive ok)', ride.id);
            if (!permissive) continue;
          } else {
            const wpCheck = routePassesThroughWaypoints(ride.route, waypoints, waypointToleranceMeters, requireWaypointOrder);
            if (!wpCheck.ok) {
              console.debug('ride fails waypoint check', ride.id, wpCheck);
              if (!permissive) continue;
            }
          }
        }

        // compute distances/indices
        let originIdx = -1, destIdx = -1;
        let originDist = Infinity, destDist = Infinity;

        if (Array.isArray(ride.route) && ride.route.length > 0) {
          if (isOriginGeo) {
            originIdx = getNearestRouteIndexWithinTolerance(origin, ride.route, stopToleranceMeters);
            originDist = originIdx >= 0 ? haversineDistance(origin, ride.route[originIdx]) : minDistanceToRouteMeters(origin, ride.route);
            if (originIdx === -1 && originDist > pickupRadius) {
              console.debug('origin too far from route', ride.id, originDist);
              if (!permissive) continue;
            }
          }
          if (isDestGeo) {
            destIdx = getNearestRouteIndexWithinTolerance(destination, ride.route, stopToleranceMeters);
            destDist = destIdx >= 0 ? haversineDistance(destination, ride.route[destIdx]) : minDistanceToRouteMeters(destination, ride.route);
            if (destIdx === -1 && destDist > destRadius) {
              console.debug('dest too far from route', ride.id, destDist);
              if (!permissive) continue;
            }
          }
          if (isOriginGeo && isDestGeo && originIdx !== -1 && destIdx !== -1 && requireStopsOrder) {
            if (!(originIdx < destIdx)) {
              console.debug('route order mismatch', ride.id, originIdx, destIdx);
              if (!permissive) continue;
            }
          }
        } else {
          // no route: use startLocation/endLocation
          if (isOriginGeo) {
            if (!ride.startLocation || typeof ride.startLocation.lat !== 'number') {
              console.debug('ride missing startLocation', ride.id);
              if (!permissive) continue;
            } else {
              originDist = haversineDistance(origin, { lat: ride.startLocation.lat, lng: ride.startLocation.lng });
              if (originDist > pickupRadius) {
                console.debug('origin too far from startLocation', ride.id, originDist);
                if (!permissive) continue;
              }
            }
          }
          if (isDestGeo) {
            if (!ride.endLocation || typeof ride.endLocation.lat !== 'number') {
              console.debug('ride missing endLocation', ride.id);
              if (!permissive) continue;
            } else {
              destDist = haversineDistance(destination, { lat: ride.endLocation.lat, lng: ride.endLocation.lng });
              if (destDist > destRadius) {
                console.debug('dest too far from endLocation', ride.id, destDist);
                if (!permissive) continue;
              }
            }
          }
        }

        // scoring (smaller = better)
        let score = 0;
        if (isOriginGeo) score += (Array.isArray(ride.route) && ride.route.length > 0) ? originDist : originDist;
        if (isDestGeo) score += (Array.isArray(ride.route) && ride.route.length > 0) ? destDist : destDist;
        if (desiredDate && ride.date) {
          const rideDate = ride.date.toDate ? ride.date.toDate() : new Date(ride.date);
          const diffMs = Math.abs(rideDate.getTime() - desiredDate.getTime());
          score += diffMs / 1000;
        }
        if (typeof seatsAvailable !== 'number') score += 1000; // small penalty for unknown seats

        results.push({ ride, score });
      } catch (err) {
        console.warn('error checking ride', ride && ride.id, err);
      }
    }

    results.sort((a, b) => a.score - b.score);
    return results.slice(0, Math.min(maxResults, results.length)).map(x => x.ride);
  } catch (e) {
    console.warn('findMatchingRides unexpected error', e);
    return [];
  }
}

export default { findMatchingRides };