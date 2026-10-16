const STANDARD_LOCATION_KEY = "user_selected_location";
const REGISTERED_LOCATION_KEY = "user_registered_location";
const GPS_COORDS_KEY = "user_gps_coords";

export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export interface LocationDetails {
  formatted: string;
  locality: string;
  city: string;
  state?: string;
  pincode?: string;
  lat?: number;
  lng?: number;
}

/**
 * Retrieves the currently active standard location from storage.
 * Defaults to "Coimbatore" if none is set.
 */
export function getStandardLocation(): string {
  try {
    const saved =
      localStorage.getItem(STANDARD_LOCATION_KEY) ||
      localStorage.getItem(REGISTERED_LOCATION_KEY);
    if (saved && saved.trim()) return saved.trim();
  } catch {}
  return "Coimbatore";
}

/**
 * Sets the active standard location across the entire app.
 * Broadcasts an event so all components update in real-time.
 */
export function setStandardLocation(
  location: string,
  isRegistered = false,
): void {
  const trimmed = location.trim();
  if (!trimmed) return;
  try {
    localStorage.setItem(STANDARD_LOCATION_KEY, trimmed);
    if (isRegistered) {
      localStorage.setItem(REGISTERED_LOCATION_KEY, trimmed);
    }
    window.dispatchEvent(
      new CustomEvent("user-location-changed", {
        detail: { location: trimmed },
      }),
    );
  } catch {}
}

/**
 * Saves detected GPS coordinates for distance-based sorting and accurate mapping
 */
export function setGpsCoords(coords: GeoCoordinates): void {
  try {
    localStorage.setItem(GPS_COORDS_KEY, JSON.stringify(coords));
  } catch {}
}

/**
 * Retrieves stored GPS coordinates if available
 */
export function getGpsCoords(): GeoCoordinates | null {
  try {
    const data = localStorage.getItem(GPS_COORDS_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return null;
}

/**
 * Prompts device GPS via navigator.geolocation and reverse-geocodes to an address string.
 * Automatically saves as the standard location unless autoSave=false.
 */
export async function detectGpsLocation(
  autoSave = true,
): Promise<LocationDetails | null> {
  if (typeof window === "undefined" || !navigator.geolocation) {
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setGpsCoords({ lat: latitude, lng: longitude });

        try {
          const res = await fetch(
            `/api/maps/reverse-geocode?lat=${latitude}&lng=${longitude}`,
          );
          if (res.ok) {
            const data = await res.json();
            const locName =
              data.place_name ||
              data.locality ||
              data.city ||
              (data.formatted_address
                ? data.formatted_address
                    .replace(/Coordinates\s*\([^)]*\),?\s*/i, "")
                    .trim()
                : "") ||
              "Local Area";

            const details: LocationDetails = {
              formatted: data.formatted_address || locName,
              locality: data.locality || locName,
              city: data.city || locName,
              state: data.state || "",
              pincode: data.pincode || "",
              lat: latitude,
              lng: longitude,
            };

            if (autoSave && locName) {
              setStandardLocation(locName);
            }

            resolve(details);
            return;
          }
        } catch (err) {
          console.warn("[location] Reverse geocode lookup error:", err);
        }

        // Fallback default if geocoding service has issue
        const fallbackName = "Local Area";
        if (autoSave) setStandardLocation(fallbackName);
        resolve({
          formatted: fallbackName,
          locality: fallbackName,
          city: fallbackName,
          lat: latitude,
          lng: longitude,
        });
      },
      (err) => {
        console.warn("[location] Geolocation error or denied:", err.message);
        resolve(null);
      },
      { timeout: 10000, enableHighAccuracy: true, maximumAge: 60000 },
    );
  });
}

const CITY_ALIASES: Record<string, string[]> = {
  bengaluru: ["bangalore"],
  bangalore: ["bengaluru"],
  chennai: ["madras"],
  madras: ["chennai"],
  mumbai: ["bombay"],
  bombay: ["mumbai"],
  kolkata: ["calcutta"],
  calcutta: ["kolkata"],
  kochi: ["cochin"],
  cochin: ["kochi"],
  gurugram: ["gurgaon"],
  gurgaon: ["gurugram"],
  puducherry: ["pondicherry"],
  pondicherry: ["puducherry"],
  thiruvananthapuram: ["trivandrum"],
  trivandrum: ["thiruvananthapuram"],
  trichy: ["tiruchirappalli"],
  tiruchirappalli: ["trichy"],
  coimbatore: ["kovai"],
  kovai: ["coimbatore"],
};

/**
 * Checks if geolocation permission is granted and auto-detects user's GPS location.
 */
export async function autoDetectLocationIfGranted(): Promise<LocationDetails | null> {
  if (typeof window === "undefined" || !navigator.geolocation) return null;
  try {
    if (navigator.permissions && navigator.permissions.query) {
      const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
      if (status.state === "granted") {
        return await detectGpsLocation(true);
      }
    }
  } catch {}
  return null;
}

const normalizeLoc = (loc: string) =>
  loc
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Module-scoped stop words set to avoid re-allocating Set on every invocation
const STOP_WORDS = new Set([
  "near",
  "opposite",
  "road",
  "street",
  "nagar",
  "colony",
  "layout",
  "tamil",
  "nadu",
  "india",
  "area",
  "main",
  "cross",
  "district",
  "zone",
  "city",
]);

/**
 * Helper to process valid tokens (length >= 3 and not in STOP_WORDS) from a space-normalized string
 * without allocating arrays. Short-circuits and returns true as soon as the callback returns true.
 */
function checkValidWords(
  normStr: string,
  fn: (word: string) => boolean,
): boolean {
  let start = 0;
  const len = normStr.length;
  while (start < len) {
    let end = normStr.indexOf(" ", start);
    if (end === -1) end = len;
    if (end > start) {
      const word = normStr.slice(start, end);
      if (word.length >= 3 && !STOP_WORDS.has(word)) {
        if (fn(word)) return true;
      }
    }
    start = end + 1;
  }
  return false;
}

/**
 * Intelligent locality & city matcher with stop-word boundary filters and city aliases.
 * Prevents false positive substring matches across distinct cities.
 *
 * Performance Optimization:
 * - Pre-allocated module-level STOP_WORDS Set eliminates object creation overhead per invocation.
 * - Zero intermediate array allocations (no `.split(" ")` or temporary word arrays) during token matching.
 */
export function isLocationMatch(
  workerLocality?: string,
  targetLocality?: string,
): boolean {
  if (!targetLocality || !targetLocality.trim()) return true;
  if (!workerLocality || !workerLocality.trim()) return false;

  const wNorm = normalizeLoc(workerLocality);
  const tNorm = normalizeLoc(targetLocality);

  if (!wNorm || !tNorm) return false;
  if (wNorm === tNorm) return true;
  if (wNorm.includes(tNorm) || tNorm.includes(wNorm)) return true;

  // Direct word overlap & target city alias overlap against worker locality
  const directOrTargetAliasMatch = checkValidWords(tNorm, (tw) => {
    // Direct word overlap check against worker words
    const directMatch = checkValidWords(wNorm, (ww) => ww === tw);
    if (directMatch) return true;

    // City alias check for target word
    const aliases = CITY_ALIASES[tw];
    if (aliases) {
      for (let k = 0; k < aliases.length; k++) {
        if (wNorm.includes(aliases[k])) return true;
      }
    }

    return false;
  });

  if (directOrTargetAliasMatch) return true;

  // Worker city alias overlap check against target locality
  return checkValidWords(wNorm, (ww) => {
    const aliases = CITY_ALIASES[ww];
    if (aliases) {
      for (let k = 0; k < aliases.length; k++) {
        if (tNorm.includes(aliases[k])) return true;
      }
    }
    return false;
  });
}

/**
 * Calculates Haversine distance in KM between two geographic coordinates
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

