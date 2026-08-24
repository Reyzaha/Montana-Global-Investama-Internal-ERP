import { AttendanceLocation, LocationValidationResult } from "../types/attendance.types";

/**
 * Calculates the great-circle distance between two points on Earth using the Haversine formula.
 * @returns distance in meters
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Validates user GPS coordinates against active company attendance locations.
 */
export function validateAttendanceLocation(
  userLat: number,
  userLon: number,
  locations: AttendanceLocation[],
): LocationValidationResult {
  const activeLocations = locations.filter((loc) => loc.isActive);

  if (activeLocations.length === 0) {
    return {
      isValid: false,
      distanceMeters: 0,
      errorMessage: "No active attendance locations are currently configured.",
    };
  }

  let closestLocation = activeLocations[0];
  let minDistance = calculateHaversineDistance(
    userLat,
    userLon,
    closestLocation.latitude,
    closestLocation.longitude,
  );

  for (let i = 1; i < activeLocations.length; i++) {
    const loc = activeLocations[i];
    const dist = calculateHaversineDistance(userLat, userLon, loc.latitude, loc.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      closestLocation = loc;
    }
  }

  if (minDistance <= closestLocation.radiusMeters) {
    return {
      isValid: true,
      location: closestLocation,
      distanceMeters: minDistance,
    };
  }

  const distanceFormatted =
    minDistance >= 1000
      ? `${(minDistance / 1000).toFixed(2)} km`
      : `${minDistance} m`;

  return {
    isValid: false,
    location: closestLocation,
    distanceMeters: minDistance,
    errorMessage: `You are outside the allowed attendance area. Distance: ${distanceFormatted} (Allowed radius: ${closestLocation.radiusMeters} m from ${closestLocation.name}).`,
  };
}

/**
 * Retrieves the user's current GPS position via the Browser Geolocation API.
 */
export function getCurrentGpsPosition(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(
              new Error(
                "Location permission is required to check in. Please allow location access in your browser.",
              ),
            );
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error("Location information is unavailable. Please try again."));
            break;
          case error.TIMEOUT:
            reject(new Error("The request to get user location timed out. Please try again."));
            break;
          default:
            reject(new Error(error.message || "An unknown error occurred while detecting location."));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  });
}
