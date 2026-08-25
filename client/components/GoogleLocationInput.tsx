import React, { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, Loader2, Check, ExternalLink } from "lucide-react";

interface GoogleLocationInputProps {
  name?: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  value?: string;
  required?: boolean;
  onChange?: (location: string, details?: { lat: number; lng: number; city: string; formatted: string }) => void;
  helperText?: string;
}

export default function GoogleLocationInput({
  name = "location",
  label = "Service Location / Area",
  placeholder = "e.g. Kattur, Tiruchirappalli or search address...",
  defaultValue = "",
  value: controlledValue,
  required = false,
  onChange,
  helperText,
}: GoogleLocationInputProps) {
  const [query, setQuery] = useState(controlledValue ?? defaultValue);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    formatted: string;
    locality: string;
    city: string;
    state: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (controlledValue !== undefined) {
      setQuery(controlledValue);
    }
  }, [controlledValue]);

  // Click outside listener for suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced geocoding search
  useEffect(() => {
    if (!query.trim() || query.length < 2 || selectedLocation?.formatted === query) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setErrorMsg("");
      try {
        const res = await fetch(`/api/maps/geocode?address=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.status === "OK" && Array.isArray(data.results)) {
          setSuggestions(data.results);
          setIsOpen(true);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.warn("Geocoding lookup error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  // Handle GPS location detection
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setErrorMsg("");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`/api/maps/reverse-geocode?lat=${latitude}&lng=${longitude}`);
          const data = await res.json();
          if (data.status === "OK") {
            const locName = data.locality || data.city || data.formatted_address;
            setQuery(locName);
            const locObj = {
              formatted: data.formatted_address,
              locality: data.locality,
              city: data.city,
              state: data.state,
              lat: latitude,
              lng: longitude,
            };
            setSelectedLocation(locObj);
            setIsOpen(false);
            if (onChange) {
              onChange(locName, { lat: latitude, lng: longitude, city: data.city, formatted: data.formatted_address });
            }
          } else {
            setQuery(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }
        } catch (err) {
          setErrorMsg("Could not resolve address for current coordinates.");
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        setErrorMsg("Unable to retrieve location. Please check browser permissions or type manually.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSelectSuggestion = (item: any) => {
    const locName = item.locality || item.city || item.formatted_address;
    setQuery(locName);
    const locObj = {
      formatted: item.formatted_address,
      locality: item.locality,
      city: item.city,
      state: item.state,
      lat: item.location?.lat ?? 10.7905,
      lng: item.location?.lng ?? 78.7047,
    };
    setSelectedLocation(locObj);
    setIsOpen(false);
    if (onChange) {
      onChange(locName, { lat: locObj.lat, lng: locObj.lng, city: item.city, formatted: item.formatted_address });
    }
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {label && (
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-[13px] font-bold text-foreground">
            {label}
            {!required && <span className="ml-1 font-normal text-muted-foreground">(optional)</span>}
          </label>
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={isLocating}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline disabled:opacity-50"
          >
            {isLocating ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Navigation size={12} />
            )}
            <span>Use My GPS</span>
          </button>
        </div>
      )}

      <div className="relative flex items-center">
        <div className="pointer-events-none absolute left-3 flex items-center text-muted-foreground">
          <MapPin size={16} />
        </div>
        <input
          name={name}
          type="text"
          required={required}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (onChange) {
              onChange(e.target.value);
            }
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="h-11 w-full rounded-lg border border-border bg-background pl-9 pr-10 text-sm text-foreground outline-hidden focus:border-primary focus:ring-1 focus:ring-primary"
        />
        {isSearching && (
          <div className="absolute right-3 flex items-center text-muted-foreground">
            <Loader2 size={15} className="animate-spin" />
          </div>
        )}
      </div>

      {/* Dropdown Suggestions */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-lg backdrop-blur-md">
          <div className="px-2 py-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Google Maps Suggested Locations
          </div>
          {suggestions.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectSuggestion(item)}
              className="flex w-full items-start gap-2.5 rounded-md px-3 py-2 text-left text-xs transition hover:bg-secondary"
            >
              <MapPin size={14} className="mt-0.5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground truncate">
                  {item.locality || item.city || "Selected Area"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {item.formatted_address}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Selected Location Pill / Map Preview */}
      {selectedLocation && (
        <div className="mt-2 flex items-center justify-between rounded-md border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs text-foreground">
          <div className="flex items-center gap-1.5 truncate">
            <Check size={14} className="text-primary shrink-0" />
            <span className="font-semibold">{selectedLocation.locality || selectedLocation.city}</span>
            <span className="text-muted-foreground truncate">({selectedLocation.formatted})</span>
          </div>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${selectedLocation.lat},${selectedLocation.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline shrink-0"
          >
            <span>View Map</span>
            <ExternalLink size={11} />
          </a>
        </div>
      )}

      {errorMsg && (
        <p className="mt-1 text-xs text-red-500">{errorMsg}</p>
      )}

      {helperText && !errorMsg && (
        <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}
