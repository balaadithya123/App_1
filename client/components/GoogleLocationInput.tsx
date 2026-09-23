import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  MapPin,
  Navigation,
  Loader2,
  Check,
  ExternalLink,
  RefreshCw,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { setStandardLocation, detectGpsLocation } from "@/lib/location";

// Comprehensive database of prominent Tamil Nadu & Indian cities, towns, and coverage areas
export const POPULAR_PLACES = [
  // C
  {
    name: "Chennai",
    state: "Tamil Nadu",
    district: "Chennai",
    lat: 13.0827,
    lng: 80.2707,
  },
  {
    name: "Coimbatore",
    state: "Tamil Nadu",
    district: "Coimbatore",
    lat: 11.0168,
    lng: 76.9558,
  },
  {
    name: "Cuddalore",
    state: "Tamil Nadu",
    district: "Cuddalore",
    lat: 11.748,
    lng: 79.7714,
  },
  {
    name: "Chengalpattu",
    state: "Tamil Nadu",
    district: "Chengalpattu",
    lat: 12.6939,
    lng: 79.9757,
  },
  {
    name: "Chidambaram",
    state: "Tamil Nadu",
    district: "Cuddalore",
    lat: 11.3992,
    lng: 79.6934,
  },
  {
    name: "Coonoor",
    state: "Tamil Nadu",
    district: "Nilgiris",
    lat: 11.353,
    lng: 76.7959,
  },
  {
    name: "Chettipalayam",
    state: "Tamil Nadu",
    district: "Coimbatore",
    lat: 10.925,
    lng: 77.0392,
  },
  {
    name: "Courtallam",
    state: "Tamil Nadu",
    district: "Tenkasi",
    lat: 8.9304,
    lng: 77.2725,
  },

  // T
  {
    name: "Tiruchirappalli (Trichy)",
    state: "Tamil Nadu",
    district: "Tiruchirappalli",
    lat: 10.7905,
    lng: 78.7047,
  },
  {
    name: "Tirunelveli",
    state: "Tamil Nadu",
    district: "Tirunelveli",
    lat: 8.7139,
    lng: 77.7567,
  },
  {
    name: "Tiruppur",
    state: "Tamil Nadu",
    district: "Tiruppur",
    lat: 11.1085,
    lng: 77.3411,
  },
  {
    name: "Thanjavur",
    state: "Tamil Nadu",
    district: "Thanjavur",
    lat: 10.787,
    lng: 79.1378,
  },
  {
    name: "Thoothukudi (Tuticorin)",
    state: "Tamil Nadu",
    district: "Thoothukudi",
    lat: 8.7642,
    lng: 78.1348,
  },
  {
    name: "Theni",
    state: "Tamil Nadu",
    district: "Theni",
    lat: 10.0104,
    lng: 77.4768,
  },
  {
    name: "Tenkasi",
    state: "Tamil Nadu",
    district: "Tenkasi",
    lat: 8.9594,
    lng: 77.315,
  },
  {
    name: "Tiruvarur",
    state: "Tamil Nadu",
    district: "Tiruvarur",
    lat: 10.7725,
    lng: 79.6365,
  },
  {
    name: "Tiruvannamalai",
    state: "Tamil Nadu",
    district: "Tiruvannamalai",
    lat: 12.2253,
    lng: 79.0747,
  },
  {
    name: "Tiruvallur",
    state: "Tamil Nadu",
    district: "Tiruvallur",
    lat: 13.1438,
    lng: 79.9079,
  },
  {
    name: "Thillai Nagar",
    state: "Tamil Nadu",
    district: "Tiruchirappalli",
    lat: 10.8256,
    lng: 78.6853,
  },
  {
    name: "T. Nagar",
    state: "Tamil Nadu",
    district: "Chennai",
    lat: 13.0418,
    lng: 80.2341,
  },

  // M
  {
    name: "Madurai",
    state: "Tamil Nadu",
    district: "Madurai",
    lat: 9.9252,
    lng: 78.1198,
  },
  {
    name: "Mayiladuthurai",
    state: "Tamil Nadu",
    district: "Mayiladuthurai",
    lat: 11.1018,
    lng: 79.6522,
  },
  {
    name: "Mettupalayam",
    state: "Tamil Nadu",
    district: "Coimbatore",
    lat: 11.3,
    lng: 76.95,
  },
  {
    name: "Manapparai",
    state: "Tamil Nadu",
    district: "Tiruchirappalli",
    lat: 10.6074,
    lng: 78.4167,
  },
  {
    name: "Mannargudi",
    state: "Tamil Nadu",
    district: "Tiruvarur",
    lat: 10.6637,
    lng: 79.4442,
  },
  {
    name: "Musiri",
    state: "Tamil Nadu",
    district: "Tiruchirappalli",
    lat: 10.9419,
    lng: 78.4528,
  },
  {
    name: "Mumbai",
    state: "Maharashtra",
    district: "Mumbai",
    lat: 19.076,
    lng: 72.8777,
  },

  // S
  {
    name: "Salem",
    state: "Tamil Nadu",
    district: "Salem",
    lat: 11.6643,
    lng: 78.146,
  },
  {
    name: "Sivakasi",
    state: "Tamil Nadu",
    district: "Virudhunagar",
    lat: 9.4533,
    lng: 77.7972,
  },
  {
    name: "Srirangam",
    state: "Tamil Nadu",
    district: "Tiruchirappalli",
    lat: 10.8624,
    lng: 78.6923,
  },
  {
    name: "Sivaganga",
    state: "Tamil Nadu",
    district: "Sivaganga",
    lat: 9.8433,
    lng: 78.4809,
  },
  {
    name: "Sankarankovil",
    state: "Tamil Nadu",
    district: "Tenkasi",
    lat: 9.1725,
    lng: 77.5325,
  },

  // E
  {
    name: "Erode",
    state: "Tamil Nadu",
    district: "Erode",
    lat: 11.341,
    lng: 77.7172,
  },
  {
    name: "Ennore",
    state: "Tamil Nadu",
    district: "Chennai",
    lat: 13.2,
    lng: 80.32,
  },
  {
    name: "Edappadi",
    state: "Tamil Nadu",
    district: "Salem",
    lat: 11.5833,
    lng: 77.8333,
  },

  // K
  {
    name: "Kanchipuram",
    state: "Tamil Nadu",
    district: "Kanchipuram",
    lat: 12.8342,
    lng: 79.7036,
  },
  {
    name: "Karur",
    state: "Tamil Nadu",
    district: "Karur",
    lat: 10.9601,
    lng: 78.0766,
  },
  {
    name: "Kumbakonam",
    state: "Tamil Nadu",
    district: "Thanjavur",
    lat: 10.9602,
    lng: 79.3845,
  },
  {
    name: "Karaikudi",
    state: "Tamil Nadu",
    district: "Sivaganga",
    lat: 10.0735,
    lng: 78.7732,
  },
  {
    name: "Kanyakumari",
    state: "Tamil Nadu",
    district: "Kanyakumari",
    lat: 8.0883,
    lng: 77.5385,
  },
  {
    name: "Kovilpatti",
    state: "Tamil Nadu",
    district: "Thoothukudi",
    lat: 9.17,
    lng: 77.87,
  },
  {
    name: "Krishnagiri",
    state: "Tamil Nadu",
    district: "Krishnagiri",
    lat: 12.5266,
    lng: 78.214,
  },
  {
    name: "Kodaikanal",
    state: "Tamil Nadu",
    district: "Dindigul",
    lat: 10.2381,
    lng: 77.4892,
  },
  {
    name: "Kattur",
    state: "Tamil Nadu",
    district: "Tiruchirappalli",
    lat: 10.793,
    lng: 78.745,
  },
  {
    name: "KK Nagar",
    state: "Tamil Nadu",
    district: "Tiruchirappalli",
    lat: 10.7712,
    lng: 78.6948,
  },
  {
    name: "Kochi",
    state: "Kerala",
    district: "Ernakulam",
    lat: 9.9312,
    lng: 76.2673,
  },

  // V
  {
    name: "Vellore",
    state: "Tamil Nadu",
    district: "Vellore",
    lat: 12.9165,
    lng: 79.1325,
  },
  {
    name: "Viluppuram",
    state: "Tamil Nadu",
    district: "Viluppuram",
    lat: 11.9401,
    lng: 79.4861,
  },
  {
    name: "Virudhunagar",
    state: "Tamil Nadu",
    district: "Virudhunagar",
    lat: 9.568,
    lng: 77.9624,
  },
  {
    name: "Vaniyambadi",
    state: "Tamil Nadu",
    district: "Tirupathur",
    lat: 12.6825,
    lng: 78.62,
  },
  {
    name: "Valparai",
    state: "Tamil Nadu",
    district: "Coimbatore",
    lat: 10.3264,
    lng: 76.9554,
  },

  // D
  {
    name: "Dindigul",
    state: "Tamil Nadu",
    district: "Dindigul",
    lat: 10.3673,
    lng: 77.9803,
  },
  {
    name: "Dharmapuri",
    state: "Tamil Nadu",
    district: "Dharmapuri",
    lat: 12.1211,
    lng: 78.1582,
  },
  {
    name: "Devakottai",
    state: "Tamil Nadu",
    district: "Sivaganga",
    lat: 9.95,
    lng: 78.82,
  },
  {
    name: "Dharapuram",
    state: "Tamil Nadu",
    district: "Tiruppur",
    lat: 10.73,
    lng: 77.53,
  },
  {
    name: "Delhi",
    state: "Delhi",
    district: "New Delhi",
    lat: 28.6139,
    lng: 77.209,
  },

  // N
  {
    name: "Nagercoil",
    state: "Tamil Nadu",
    district: "Kanyakumari",
    lat: 8.1833,
    lng: 77.4119,
  },
  {
    name: "Namakkal",
    state: "Tamil Nadu",
    district: "Namakkal",
    lat: 11.2189,
    lng: 78.1674,
  },
  {
    name: "Nagapattinam",
    state: "Tamil Nadu",
    district: "Nagapattinam",
    lat: 10.7672,
    lng: 79.8449,
  },
  {
    name: "Neyveli",
    state: "Tamil Nadu",
    district: "Cuddalore",
    lat: 11.5996,
    lng: 79.4866,
  },

  // P
  {
    name: "Puducherry",
    state: "Puducherry",
    district: "Puducherry",
    lat: 11.9416,
    lng: 79.8083,
  },
  {
    name: "Pollachi",
    state: "Tamil Nadu",
    district: "Coimbatore",
    lat: 10.658,
    lng: 77.008,
  },
  {
    name: "Palani",
    state: "Tamil Nadu",
    district: "Dindigul",
    lat: 10.45,
    lng: 77.5167,
  },
  {
    name: "Paramakudi",
    state: "Tamil Nadu",
    district: "Ramanathapuram",
    lat: 9.54,
    lng: 78.59,
  },
  {
    name: "Pattukkottai",
    state: "Tamil Nadu",
    district: "Thanjavur",
    lat: 10.43,
    lng: 79.32,
  },
  {
    name: "Perambalur",
    state: "Tamil Nadu",
    district: "Perambalur",
    lat: 11.2333,
    lng: 78.8833,
  },
  {
    name: "Pudukkottai",
    state: "Tamil Nadu",
    district: "Pudukkottai",
    lat: 10.3797,
    lng: 78.8208,
  },
  {
    name: "Peelamedu",
    state: "Tamil Nadu",
    district: "Coimbatore",
    lat: 11.028,
    lng: 77.012,
  },

  // R
  {
    name: "Ramanathapuram",
    state: "Tamil Nadu",
    district: "Ramanathapuram",
    lat: 9.3639,
    lng: 78.8395,
  },
  {
    name: "Ranipet",
    state: "Tamil Nadu",
    district: "Ranipet",
    lat: 12.9272,
    lng: 79.333,
  },
  {
    name: "Rajapalayam",
    state: "Tamil Nadu",
    district: "Virudhunagar",
    lat: 9.45,
    lng: 77.55,
  },
  {
    name: "Rasipuram",
    state: "Tamil Nadu",
    district: "Namakkal",
    lat: 11.47,
    lng: 78.18,
  },
  {
    name: "Rameswaram",
    state: "Tamil Nadu",
    district: "Ramanathapuram",
    lat: 9.2876,
    lng: 79.3129,
  },
  {
    name: "RS Puram",
    state: "Tamil Nadu",
    district: "Coimbatore",
    lat: 11.008,
    lng: 76.948,
  },

  // H
  {
    name: "Hosur",
    state: "Tamil Nadu",
    district: "Krishnagiri",
    lat: 12.7409,
    lng: 77.8253,
  },
  {
    name: "Hyderabad",
    state: "Telangana",
    district: "Hyderabad",
    lat: 17.385,
    lng: 78.4867,
  },

  // A
  {
    name: "Ariyalur",
    state: "Tamil Nadu",
    district: "Ariyalur",
    lat: 11.1401,
    lng: 79.0786,
  },
  {
    name: "Ambur",
    state: "Tamil Nadu",
    district: "Tirupathur",
    lat: 12.7904,
    lng: 78.7166,
  },
  {
    name: "Arakkonam",
    state: "Tamil Nadu",
    district: "Ranipet",
    lat: 13.0786,
    lng: 79.6677,
  },
  {
    name: "Anna Nagar",
    state: "Tamil Nadu",
    district: "Chennai",
    lat: 13.085,
    lng: 80.21,
  },
  {
    name: "Ambattur",
    state: "Tamil Nadu",
    district: "Chennai",
    lat: 13.1143,
    lng: 80.1548,
  },
  {
    name: "Avadi",
    state: "Tamil Nadu",
    district: "Tiruvallur",
    lat: 13.1172,
    lng: 80.1008,
  },

  // B
  {
    name: "Bengaluru (Bangalore)",
    state: "Karnataka",
    district: "Bengaluru",
    lat: 12.9716,
    lng: 77.5946,
  },
  {
    name: "Bhavani",
    state: "Tamil Nadu",
    district: "Erode",
    lat: 11.45,
    lng: 77.68,
  },

  // O / G
  {
    name: "Ooty (Udhagamandalam)",
    state: "Tamil Nadu",
    district: "Nilgiris",
    lat: 11.4102,
    lng: 76.695,
  },
  {
    name: "Gandhipuram",
    state: "Tamil Nadu",
    district: "Coimbatore",
    lat: 11.018,
    lng: 76.968,
  },
];

interface GoogleLocationInputProps {
  name?: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  value?: string;
  required?: boolean;
  autoDetectGPSOnMount?: boolean;
  setAsStandardOnSelect?: boolean;
  onChange?: (
    location: string,
    details?: { lat: number; lng: number; city: string; formatted: string },
  ) => void;
  helperText?: string;
}

export default function GoogleLocationInput({
  name = "location",
  label = "Service Location / Area",
  placeholder = "Type starting letter (e.g., 'c' for Chennai, Coimbatore)...",
  defaultValue = "",
  value: controlledValue,
  required = false,
  autoDetectGPSOnMount = false,
  setAsStandardOnSelect = true,
  onChange,
  helperText,
}: GoogleLocationInputProps) {
  const [query, setQuery] = useState(controlledValue ?? defaultValue);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsAutoDetected, setGpsAutoDetected] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    formatted: string;
    locality: string;
    city: string;
    state: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [apiSuggestions, setApiSuggestions] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const autoDetectAttemptedRef = useRef(false);

  useEffect(() => {
    if (controlledValue !== undefined) {
      setQuery(controlledValue);
    }
  }, [controlledValue]);

  // Click outside listener for suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute local matching suggestions instantly starting from 1 character
  const localMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const startsWith: typeof POPULAR_PLACES = [];
    const contains: typeof POPULAR_PLACES = [];

    for (const p of POPULAR_PLACES) {
      const nameLower = p.name.toLowerCase();
      const distLower = p.district.toLowerCase();
      if (nameLower.startsWith(q) || distLower.startsWith(q)) {
        startsWith.push(p);
      } else if (nameLower.includes(q) || distLower.includes(q)) {
        contains.push(p);
      }
    }

    return [...startsWith, ...contains].slice(0, 8);
  }, [query]);

  // Quick 2 to 3 pills displayed directly for fast 1-tap selection
  const topPills = useMemo(() => {
    return localMatches.slice(0, 3);
  }, [localMatches]);

  // Debounced geocoding search for external/street addresses
  useEffect(() => {
    const q = query.trim();
    if (!q || q.length < 2 || selectedLocation?.formatted === q) {
      setApiSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/maps/geocode?address=${encodeURIComponent(q)}`,
        );
        const data = await res.json();
        if (data.status === "OK" && Array.isArray(data.results)) {
          setApiSuggestions(data.results.slice(0, 4));
        } else {
          setApiSuggestions([]);
        }
      } catch (err) {
        console.warn("Geocoding lookup error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, selectedLocation?.formatted]);

  // Handle GPS location detection
  const handleDetectLocation = async (isAuto = false) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      if (!isAuto) setErrorMsg("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setErrorMsg("");

    try {
      const details = await detectGpsLocation(setAsStandardOnSelect);
      if (details) {
        const locName =
          details.locality || details.city || details.formatted || "Local Area";
        setQuery(locName);
        setGpsAutoDetected(true);
        const locObj = {
          formatted: details.formatted,
          locality: details.locality || locName,
          city: details.city || locName,
          state: details.state || "",
          lat: details.lat ?? 11.0168,
          lng: details.lng ?? 76.9558,
        };
        setSelectedLocation(locObj);
        setIsOpen(false);
        if (onChange) {
          onChange(locName, {
            lat: locObj.lat,
            lng: locObj.lng,
            city: locObj.city,
            formatted: locObj.formatted,
          });
        }
      } else if (!isAuto) {
        setErrorMsg(
          "Unable to retrieve location. Please check browser permissions or select a city below.",
        );
      }
    } catch {
      if (!isAuto) setErrorMsg("Could not detect GPS location.");
    } finally {
      setIsLocating(false);
    }
  };

  // Auto-detect GPS on mount if requested and no value exists yet
  useEffect(() => {
    if (
      autoDetectGPSOnMount &&
      !autoDetectAttemptedRef.current &&
      !query.trim()
    ) {
      autoDetectAttemptedRef.current = true;
      void handleDetectLocation(true);
    }
  }, [autoDetectGPSOnMount, query]);

  const handleSelectLocalPlace = (place: (typeof POPULAR_PLACES)[0]) => {
    const cleanName = place.name.replace(/\s*\([^)]*\)/, "").trim();
    setQuery(cleanName);
    setGpsAutoDetected(false);
    const locObj = {
      formatted: `${cleanName}, ${place.district}, ${place.state}`,
      locality: cleanName,
      city: place.district || cleanName,
      state: place.state,
      lat: place.lat,
      lng: place.lng,
    };
    setSelectedLocation(locObj);
    setIsOpen(false);
    setErrorMsg("");

    if (setAsStandardOnSelect) {
      setStandardLocation(cleanName, true);
    }

    if (onChange) {
      onChange(cleanName, {
        lat: locObj.lat,
        lng: locObj.lng,
        city: locObj.city,
        formatted: locObj.formatted,
      });
    }
  };

  const handleSelectApiSuggestion = (item: any) => {
    const locName = item.locality || item.city || item.formatted_address;
    setQuery(locName);
    setGpsAutoDetected(false);
    const locObj = {
      formatted: item.formatted_address,
      locality: item.locality || locName,
      city: item.city || locName,
      state: item.state || "",
      lat: item.location?.lat ?? 10.7905,
      lng: item.location?.lng ?? 78.7047,
    };
    setSelectedLocation(locObj);
    setIsOpen(false);
    setErrorMsg("");

    if (setAsStandardOnSelect) {
      setStandardLocation(locName, true);
    }

    if (onChange) {
      onChange(locName, {
        lat: locObj.lat,
        lng: locObj.lng,
        city: item.city || locName,
        formatted: item.formatted_address,
      });
    }
  };

  const handleBlur = () => {
    // If the query matches a top suggestion, auto-complete cleanly
    const trimmed = query.trim().toLowerCase();
    if (trimmed && localMatches.length > 0) {
      const exact = localMatches.find(
        (m) =>
          m.name.toLowerCase() === trimmed ||
          m.name.toLowerCase().startsWith(trimmed),
      );
      if (exact && query.trim().length <= 3) {
        handleSelectLocalPlace(exact);
      }
    }
  };

  const hasSuggestions = localMatches.length > 0 || apiSuggestions.length > 0;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {label && (
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-xs font-bold text-[#2C2C2C] dark:text-[#F4F4F5]">
            {label}
            {!required && (
              <span className="ml-1 font-normal text-[#989EA7]">
                (optional)
              </span>
            )}
          </label>
          <button
            type="button"
            onClick={() => handleDetectLocation(false)}
            disabled={isLocating}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary hover:bg-primary/20 transition disabled:opacity-50 cursor-pointer"
          >
            {isLocating ? (
              <>
                <Loader2 size={12} className="animate-spin text-primary" />
                <span>Accessing GPS...</span>
              </>
            ) : (
              <>
                <Navigation size={12} className="text-primary" />
                <span>Auto-Detect GPS</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Input Field with GPS Indicator */}
      <div className="relative flex items-center">
        <div className="pointer-events-none absolute left-3.5 flex items-center text-primary">
          <MapPin size={16} />
        </div>
        <input
          name={name}
          type="text"
          required={required}
          value={query}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            setGpsAutoDetected(false);
            setIsOpen(true);
            setErrorMsg("");
            if (onChange) {
              onChange(val);
            }
          }}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
          onBlur={handleBlur}
          placeholder={
            isLocating ? "Detecting your GPS location..." : placeholder
          }
          className="h-11 w-full rounded-[12px] border border-[#E7ECF1] dark:border-[#242424] bg-[#F6F9FC] dark:bg-[#141414] pl-9.5 pr-20 text-xs sm:text-sm text-[#2C2C2C] dark:text-[#F4F4F5] outline-none focus:border-primary focus:bg-white dark:focus:bg-[#0A0A0A] transition placeholder:text-[#989EA7]"
        />

        {/* Right side status / refresh action */}
        <div className="absolute right-2.5 flex items-center gap-1">
          {isLocating ? (
            <Loader2 size={14} className="animate-spin text-primary" />
          ) : isSearching ? (
            <Loader2 size={14} className="animate-spin text-[#989EA7]" />
          ) : (
            <button
              type="button"
              onClick={() => handleDetectLocation(false)}
              title="Refresh GPS Location"
              aria-label="Refresh GPS Location"
              className="flex h-7 w-7 items-center justify-center rounded-full text-[#989EA7] hover:bg-black/5 dark:hover:bg-white/10 hover:text-primary transition cursor-pointer"
            >
              <RefreshCw size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Instant 2-3 Place Suggestion Quick Chips */}
      {topPills.length > 0 && query.trim() && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold text-[#989EA7]">
            Suggestions:
          </span>
          {topPills.map((place) => {
            const cleanName = place.name.replace(/\s*\([^)]*\)/, "").trim();
            const isSelected =
              query.trim().toLowerCase() === cleanName.toLowerCase();
            return (
              <button
                key={place.name}
                type="button"
                onClick={() => handleSelectLocalPlace(place)}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition cursor-pointer ${
                  isSelected
                    ? "bg-primary text-white"
                    : "border border-[#E7ECF1] dark:border-[#242424] bg-white dark:bg-[#141414] text-[#2C2C2C] dark:text-[#F4F4F5] hover:border-primary/50 hover:bg-primary/5"
                }`}
              >
                <MapPin
                  size={10}
                  className={isSelected ? "text-white" : "text-primary"}
                />
                <span>{cleanName}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Auto-detected GPS Pill Notice */}
      {gpsAutoDetected && query && !isLocating && (
        <div className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
          <Sparkles
            size={12}
            className="shrink-0 text-emerald-600 dark:text-emerald-400"
          />
          <span>Auto-accessed via GPS. Stored as your standard location.</span>
        </div>
      )}

      {/* Dropdown Suggestions */}
      {isOpen && hasSuggestions && query.trim().length > 0 && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-[14px] border border-[#E7ECF1] dark:border-[#242424] bg-white dark:bg-[#141414] p-1.5 shadow-lg backdrop-blur-md">
          <div className="px-2.5 py-1 text-[10px] font-bold tracking-wider text-[#989EA7] uppercase">
            Suggested Place Names ({localMatches.length + apiSuggestions.length}
            )
          </div>

          {/* Local High-Confidence Places */}
          {localMatches.map((place, idx) => (
            <button
              key={`local-${idx}`}
              type="button"
              onClick={() => handleSelectLocalPlace(place)}
              className="flex w-full items-start gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-xs transition hover:bg-[#F6F9FC] dark:hover:bg-[#1C1C1C] cursor-pointer"
            >
              <MapPin size={14} className="mt-0.5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[#2C2C2C] dark:text-[#F4F4F5] truncate">
                  {place.name}
                </p>
                <p className="text-[11px] text-[#67696D] dark:text-[#A1A1AA] truncate">
                  {place.district}, {place.state}
                </p>
              </div>
            </button>
          ))}

          {/* External Geocoded API Results */}
          {apiSuggestions.map((item, idx) => (
            <button
              key={`api-${idx}`}
              type="button"
              onClick={() => handleSelectApiSuggestion(item)}
              className="flex w-full items-start gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-xs transition hover:bg-[#F6F9FC] dark:hover:bg-[#1C1C1C] cursor-pointer border-t border-[#E7ECF1]/50 dark:border-[#242424]/50"
            >
              <MapPin size={14} className="mt-0.5 shrink-0 text-sky-500" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[#2C2C2C] dark:text-[#F4F4F5] truncate">
                  {item.locality || item.city || "Area"}
                </p>
                <p className="text-[11px] text-[#67696D] dark:text-[#A1A1AA] truncate">
                  {item.formatted_address}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Selected Location Details Card */}
      {selectedLocation && (
        <div className="mt-2 flex items-center justify-between rounded-[10px] border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs text-[#2C2C2C] dark:text-[#F4F4F5]">
          <div className="flex items-center gap-1.5 truncate">
            <Check size={13} className="text-primary shrink-0" />
            <span className="font-bold">
              {selectedLocation.locality || selectedLocation.city}
            </span>
            <span className="text-[11px] text-[#67696D] dark:text-[#A1A1AA] truncate">
              ({selectedLocation.formatted})
            </span>
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
        <div className="mt-1 flex items-center gap-1 text-xs text-red-500 font-medium">
          <AlertCircle size={12} />
          <span>{errorMsg}</span>
        </div>
      )}

      {helperText && !errorMsg && !gpsAutoDetected && (
        <p className="mt-1 text-xs text-[#67696D] dark:text-[#A1A1AA]">
          {helperText}
        </p>
      )}
    </div>
  );
}
