
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, ZoomControl, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import { Flight, MapBounds, FilterOptions, RouteInfo, FlightMetadata } from '../types';
import { createPlaneIcon } from './PlaneIcon';
import { MAP_ATTRIBUTION, MAP_TILE_URL, REFRESH_INTERVAL_MS, AIRLINE_MAPPINGS, resolveAirport, MIN_ZOOM_FOR_API } from '../constants';
import { fetchFlights, getAirportActivity, fetchFR24Feed } from '../services/flightService';
import { AlertTriangle, Loader2, EyeOff } from 'lucide-react';

interface MapProps {
  onFlightSelect: (flight: Flight) => void;
  selectedFlightId: string | null;
  filters: FilterOptions;
  setResolvedAirportName: (name: string | null) => void;
}

// Helper to normalize search query (Air Canada -> ACA)
const normalizeSearch = (query: string): string[] => {
  if (!query) return [];
  const clean = query.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const variations = [clean];
  
  // Airline mappings (Prefix matching)
  for (const [key, code] of Object.entries(AIRLINE_MAPPINGS)) {
      if (clean.startsWith(key)) {
          const flightNum = clean.slice(key.length);
          if (flightNum === '' || /^\d+$/.test(flightNum)) {
               variations.push(code + flightNum);
          }
      }
  }
  return variations;
};

const MapActions: React.FC<{ 
    airportFilter: string, 
    onResolve: (name: string | null, icao: string | null) => void 
}> = ({ airportFilter, onResolve }) => {
    const map = useMap();
    const lastFilter = useRef<string>('');

    useEffect(() => {
        if (!airportFilter) {
            onResolve(null, null);
            lastFilter.current = '';
            return;
        }

        if (airportFilter === lastFilter.current) return;
        lastFilter.current = airportFilter;

        const airport = resolveAirport(airportFilter);
        if (airport) {
            map.flyTo([airport.lat, airport.lon], 10, { duration: 2 });
            onResolve(airport.name, airport.code);
        } else {
            if (airportFilter.length === 4) {
                 onResolve("Custom Airport", airportFilter.toUpperCase());
            } else {
                 onResolve(null, null);
            }
        }
    }, [airportFilter, map, onResolve]);

    return null;
};

const MapController: React.FC<{ 
  setFlights: React.Dispatch<React.SetStateAction<Flight[]>>;
  setFlightMeta: React.Dispatch<React.SetStateAction<Map<string, FlightMetadata>>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setPausedReason: React.Dispatch<React.SetStateAction<string | null>>;
}> = ({ setFlights, setFlightMeta, setIsLoading, setError, setPausedReason }) => {
  const map = useMapEvents({
    moveend: () => {
      fetchData();
    },
  });

  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef<number>(0);
  const fetchIdRef = useRef<number>(0);

  const fetchData = useCallback(async () => {
    const now = Date.now();
    
    if (document.hidden) return;

    if (map.getZoom() < MIN_ZOOM_FOR_API) {
        setPausedReason("ZOOM IN TO VIEW TRAFFIC");
        setIsLoading(false);
        return;
    } else {
        setPausedReason(null);
    }
    
    if (lastFetchTimeRef.current !== 0 && now - lastFetchTimeRef.current < 15000) {
        return;
    }

    if (isFetchingRef.current) return;
    
    try {
      lastFetchTimeRef.current = now;
      isFetchingRef.current = true;
      
      const currentFetchId = ++fetchIdRef.current;
      
      setIsLoading(true);
      setError(null);

      const center = map.getCenter();
      const bounds = map.getBounds();
      
      let south = Math.max(-90, bounds.getSouth());
      let north = Math.min(90, bounds.getNorth());
      let west = bounds.getWest();
      let east = bounds.getEast();

      if ((east - west) > 170) {
          west = -180;
          east = 180;
      } else {
          const normalize = (lon: number) => ((lon + 180) % 360 + 360) % 360 - 180;
          const normWest = normalize(west);
          const normEast = normalize(east);

          if (normWest > normEast) {
              west = -180;
              east = 180;
          } else {
              west = Math.max(-180, normWest);
              east = Math.min(180, normEast);
          }
      }

      const mapBounds: MapBounds = {
        lamin: south,
        lomin: west,
        lamax: north,
        lomax: east,
      };
      
      // PROGRESSIVE LOADING STRATEGY
      // 1. Kick off both requests in parallel
      const openSkyPromise = fetchFlights(mapBounds);
      const fr24Promise = fetchFR24Feed(mapBounds);

      // 2. Handle OpenSky First (Fastest Path)
      let openSkyFlights: Flight[] = [];
      try {
        openSkyFlights = await openSkyPromise;
        // Immediate render with OpenSky data
        if (currentFetchId === fetchIdRef.current) {
            setFlights(openSkyFlights);
        }
      } catch (e) {
        console.warn("OpenSky fetch failed temporarily", e);
      }

      // 3. Handle FR24 and Merge (Enriched Path)
      try {
        const fr24Data = await fr24Promise;
        
        if (currentFetchId !== fetchIdRef.current) {
            return; // Abandon if a newer fetch started
        }

        console.log(`[DATA MERGE] OpenSky: ${openSkyFlights.length}, FR24: ${fr24Data.flights.length}`);

        const mergedMap = new Map<string, Flight>();
        
        // Base layer: FR24
        fr24Data.flights.forEach(f => mergedMap.set(f.icao24, f));
        
        // Top layer: OpenSky (Prefer OpenSky positions)
        openSkyFlights.forEach(f => mergedMap.set(f.icao24, f));
        
        setFlights(Array.from(mergedMap.values()));
        setFlightMeta(fr24Data.meta);

      } catch (e) {
         console.warn("FR24 feed failed", e);
         if (openSkyFlights.length === 0 && currentFetchId === fetchIdRef.current) {
             setError("Unable to fetch flight data.");
         }
      }

    } catch (error: any) {
       console.error("Map update failed:", error);
       if (fetchIdRef.current === fetchIdRef.current) {
           setError("Connection failed. Retrying...");
       }
    } finally {
      if (fetchIdRef.current === fetchIdRef.current) {
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    }
  }, [map, setFlights, setFlightMeta, setIsLoading, setError, setPausedReason]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handleVisibilityChange = () => {
        if (!document.hidden) {
            fetchData();
        }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(fetchData, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  return null;
};

const FlightMap: React.FC<MapProps> = ({ onFlightSelect, selectedFlightId, filters, setResolvedAirportName }) => {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [flightMeta, setFlightMeta] = useState<Map<string, FlightMetadata>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pausedReason, setPausedReason] = useState<string | null>(null);
  const [routeData, setRouteData] = useState<Map<string, RouteInfo>>(new Map());
  const [resolvedAirportCode, setResolvedAirportCode] = useState<string | null>(null);

  const defaultCenter: L.LatLngExpression = [53.5461, -113.4938]; 
  const defaultZoom = 8; 
  const FLIGHT_LIMIT = 200; // Increased limit since we have more data sources

  const handleAirportResolve = useCallback((name: string | null, icao: string | null) => {
      setResolvedAirportName(name);
      setResolvedAirportCode(icao);
  }, [setResolvedAirportName]);

  useEffect(() => {
      if (resolvedAirportCode) {
          setIsLoading(true);
          getAirportActivity(resolvedAirportCode).then(data => {
              setRouteData(data);
              setIsLoading(false);
          });
      } else {
          setRouteData(new Map());
      }
  }, [resolvedAirportCode]);

  // HARD FILTERING (Removes flight from list completely)
  const hardFiltered = flights.filter(f => {
    // Ground Filter: If filters.showGround is false, hide anything on ground
    // Use both OpenSky 'on_ground' boolean and Categories 16-18
    if (!filters.showGround) {
        if (f.on_ground) return false;
        if ([16, 17, 18].includes(f.category)) return false;
    }
    
    // Altitude Filter
    const alt = (f.baro_altitude ?? f.geo_altitude ?? 0) * 3.28084;
    // Allow small margin of error for altitude 0
    if (alt < filters.minAlt || alt > filters.maxAlt) return false;
    
    return true;
  });

  const searchTerms = normalizeSearch(filters.search);
  
  // SOFT FILTERING (Dims non-matching flights)
  const checkIsMatch = (f: Flight): boolean => {
    // If no active filters, everything matches
    if (!filters.search && !resolvedAirportCode) return true;

    // Search Matching
    let matchesSearch = false;
    if (filters.search) {
      const cs = (f.callsign || f.icao24).toUpperCase();
      const meta = flightMeta.get(f.icao24.toLowerCase()) || flightMeta.get(cs.trim());
      
      const searchString = [
          cs, 
          meta?.registration?.toUpperCase(), 
          meta?.aircraftType?.toUpperCase(),
          meta?.origin?.toUpperCase(),
          meta?.destination?.toUpperCase()
      ].filter(Boolean).join(' ');

      matchesSearch = searchTerms.some(term => searchString.includes(term));
    } else {
      matchesSearch = true; 
    }

    // Route Matching
    let matchesRoute = false;
    if (resolvedAirportCode) {
        matchesRoute = routeData.has(f.icao24);
    } else {
        matchesRoute = true;
    }

    return matchesSearch && matchesRoute;
  };

  const processedFlights = hardFiltered
    .map(f => ({ flight: f, isMatch: checkIsMatch(f) }))
    .sort((a, b) => {
      // Prioritize matched flights
      if (a.isMatch && !b.isMatch) return -1;
      if (!a.isMatch && b.isMatch) return 1;
      return 0;
    });

  const displayFlights = processedFlights.slice(0, FLIGHT_LIMIT);
  const hasActiveSoftFilter = !!filters.search || !!resolvedAirportCode;

  return (
    <div className="w-full h-full relative bg-slate-900">
       <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[1000] flex flex-col items-center gap-2 pointer-events-none transition-opacity duration-300">
         {isLoading && !pausedReason && (
          <div className="bg-slate-800/80 backdrop-blur text-sky-400 px-4 py-1 rounded-full text-xs font-mono border border-slate-700 shadow-lg flex items-center gap-2">
             <Loader2 className="w-3 h-3 animate-spin" />
             UPDATING RADAR
          </div>
         )}
         {pausedReason && (
          <div className="bg-slate-800/80 backdrop-blur text-amber-400 px-4 py-1 rounded-full text-xs font-mono border border-amber-700/50 shadow-lg flex items-center gap-2">
             <EyeOff className="w-3 h-3" />
             {pausedReason}
          </div>
         )}
         {error && (
           <div className="bg-rose-900/80 backdrop-blur text-rose-200 px-4 py-1 rounded-full text-xs font-mono border border-rose-700 shadow-lg flex items-center gap-2">
             <AlertTriangle className="w-3 h-3" />
             {error}
           </div>
         )}
       </div>
      
      {flights.length > FLIGHT_LIMIT && !pausedReason && (
        <div className="absolute bottom-6 left-4 md:left-16 z-[1000] pointer-events-none">
           <div className="bg-amber-900/80 text-amber-100 text-[10px] px-3 py-1 rounded font-mono border border-amber-700/50 shadow-lg">
              HIGH TRAFFIC: SHOWING NEAREST {FLIGHT_LIMIT}
           </div>
        </div>
      )}

      <MapContainer 
        center={defaultCenter} 
        zoom={defaultZoom} 
        style={{ width: '100%', height: '100%', background: '#0f172a' }}
        zoomControl={false}
        minZoom={3}
        maxBounds={[[-90,-180], [90,180]]}
        worldCopyJump={true}
      >
        <ZoomControl position="bottomright" />
        <TileLayer
          attribution={MAP_ATTRIBUTION}
          url={MAP_TILE_URL}
        />
        <MapController 
            setFlights={setFlights} 
            setFlightMeta={setFlightMeta}
            setIsLoading={setIsLoading} 
            setError={setError}
            setPausedReason={setPausedReason}
        />
        <MapActions airportFilter={filters.airport} onResolve={handleAirportResolve} />
        
        {displayFlights.map(({ flight, isMatch }) => {
           const isDimmed = hasActiveSoftFilter && !isMatch;
           const routeInfo = routeData.get(flight.icao24);
           
           // Priority Lookup for Metadata
           const meta = flightMeta.get(flight.icao24.toLowerCase()) || 
                        (flight.callsign ? flightMeta.get(flight.callsign.trim().toUpperCase()) : undefined);

           return (
            flight.latitude && flight.longitude ? (
              <Marker
                key={flight.icao24}
                position={[flight.latitude, flight.longitude]}
                icon={createPlaneIcon(flight, routeInfo, meta, selectedFlightId === flight.icao24, isDimmed)}
                eventHandlers={{
                  click: () => onFlightSelect(flight),
                }}
              />
            ) : null
          );
        })}
      </MapContainer>
    </div>
  );
};

export default FlightMap;
