// Utility geo helpers used by matching logic
// - haversineDistance(p1, p2) -> meters
// - minDistanceToRouteMeters(point, route) -> meters (route = [{lat,lng},...])
// - indexOfNearestPointOnRoute(point, route) -> index (or -1)
// - isPointNearRoute(point, route, radiusMeters) -> boolean
// - routePassesThroughWaypoints(route, waypoints, toleranceMeters, requireOrder) -> { ok, indices }

const EARTH_RADIUS = 6371000; // meters

export function toRad(deg) {
  return deg * Math.PI / 180;
}

export function haversineDistance(a, b) {
  if (!a || !b) return Infinity;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLat = lat2 - lat1;
  const dLon = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const aa = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return EARTH_RADIUS * c;
}

/**
 * distancePointToSegmentMeters(point, a, b)
 * Uses a simple equirectangular projection approximation which is fine for small distances.
 */
function distancePointToSegmentMeters(point, a, b) {
  // if a == b, return distance to a
  if (!a || !b) return Infinity;
  if (a.lat === b.lat && a.lng === b.lng) {
    return haversineDistance(point, a);
  }

  // Convert degrees to meters using local scale at point latitude
  const latRef = toRad(point.lat);
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos(latRef);

  // Convert to local xy
  const px = (point.lng - a.lng) * metersPerDegLng;
  const py = (point.lat - a.lat) * metersPerDegLat;

  const bx = (b.lng - a.lng) * metersPerDegLng;
  const by = (b.lat - a.lat) * metersPerDegLat;

  const proj = (px * bx + py * by) / (bx * bx + by * by);
  let closestX, closestY;

  if (proj <= 0) {
    closestX = 0; closestY = 0;
  } else if (proj >= 1) {
    closestX = bx; closestY = by;
  } else {
    closestX = proj * bx; closestY = proj * by;
  }

  const dx = px - closestX;
  const dy = py - closestY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * minDistanceToRouteMeters(point, route)
 * route: array of {lat,lng} points. Computes min distance to any segment.
 */
export function minDistanceToRouteMeters(point, route) {
  if (!point || !route || !Array.isArray(route) || route.length === 0) return Infinity;
  let minD = Infinity;
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i];
    const b = route[i + 1];
    const d = distancePointToSegmentMeters(point, a, b);
    if (d < minD) minD = d;
    if (minD === 0) break;
  }
  // Also compare to exact vertices (rarely necessary)
  for (let i = 0; i < route.length; i++) {
    const d2 = haversineDistance(point, route[i]);
    if (d2 < minD) minD = d2;
  }
  return minD;
}

/**
 * indexOfNearestPointOnRoute(point, route)
 * returns index (0..n-1) of the nearest route vertex to point
 */
export function indexOfNearestPointOnRoute(point, route) {
  if (!point || !Array.isArray(route) || route.length === 0) return -1;
  let bestIdx = -1;
  let bestD = Infinity;
  for (let i = 0; i < route.length; i++) {
    const d = haversineDistance(point, route[i]);
    if (d < bestD) { bestD = d; bestIdx = i; }
  }
  return bestIdx;
}

/**
 * isPointNearRoute(point, route, radiusMeters)
 */
export function isPointNearRoute(point, route, radiusMeters = 3000) {
  const minD = minDistanceToRouteMeters(point, route);
  return minD <= (Number(radiusMeters) || 0);
}

/**
 * routePassesThroughWaypoints(route, waypoints, toleranceMeters, requireOrder=true)
 * - waypoints: array of {lat,lng}
 * - finds nearest indices on route for each waypoint, checks distance <= tolerance and order if required
 * returns { ok: boolean, indices: [i1,i2,...], failedAtIndex: n | null }
 */
export function routePassesThroughWaypoints(route, waypoints = [], toleranceMeters = 500, requireOrder = true) {
  if (!Array.isArray(waypoints) || waypoints.length === 0) return { ok: true, indices: [], failedAtIndex: null };
  const indices = [];
  for (let w = 0; w < waypoints.length; w++) {
    const wp = waypoints[w];
    if (!wp) return { ok: false, indices, failedAtIndex: w };
    // Find nearest point index
    let bestIdx = -1;
    let bestD = Infinity;
    for (let i = 0; i < route.length; i++) {
      const d = haversineDistance(wp, route[i]);
      if (d < bestD) { bestD = d; bestIdx = i; }
    }
    if (bestD > toleranceMeters) {
      return { ok: false, indices, failedAtIndex: w };
    }
    indices.push(bestIdx);
  }

  if (requireOrder) {
    for (let i = 1; i < indices.length; i++) {
      if (indices[i] <= indices[i - 1]) {
        return { ok: false, indices, failedAtIndex: i };
      }
    }
  }
  return { ok: true, indices, failedAtIndex: null };
}