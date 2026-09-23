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
