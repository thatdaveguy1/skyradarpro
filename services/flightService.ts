
import { Flight, MapBounds, OpenSkyResponse, OpenSkyStateVector, OpenSkyRouteFlight, RouteInfo, FlightEnrichment, ADSBDBAircraft, ADSBDBRoute, FR24FeedTuple, FlightMetadata, FR24FeedResult } from '../types';
import { OPENSKY_CREDENTIALS } from '../constants';

const BASE_URL = 'https://opensky-network.org/api/states/all';
const FLIGHTS_URL = 'https://opensky-network.org/api/flights';

// Helper to convert raw array to typed object
const mapVectorToFlight = (vector: OpenSkyStateVector): Flight => {
  return {
    icao24: vector[0],
    callsign: vector[1]?.trim() || 'N/A',
    origin_country: vector[2],
    time_position: vector[3],
    last_contact: vector[4],
    longitude: vector[5],
    latitude: vector[6],
    baro_altitude: vector[7],
    on_ground: vector[8],
    velocity: vector[9],
    true_track: vector[10],
    vertical_rate: vector[11],
    sensors: vector[12],
    geo_altitude: vector[13],
    squawk: vector[14],
    spi: vector[15],
    position_source: vector[16],
    category: vector[17]
  };
};

export const fetchFlights = async (bounds?: MapBounds): Promise<Flight[]> => {
  let url = BASE_URL;
  
  // Construct URL with query params if bounds exist
  if (bounds) {
    const params = new URLSearchParams({
      lamin: bounds.lamin.toString(),
      lomin: bounds.lomin.toString(),
      lamax: bounds.lamax.toString(),
      lomax: bounds.lomax.toString(),
    });
    url = `${BASE_URL}?${params.toString()}`;
  }

  const processResponse = async (res: Response, source: string) => {
    if (res.status === 429) {
        console.warn(`[${source}] Rate Limit (429) hit.`);
        throw new Error("RATE_LIMIT");
    }
    if (res.status === 401) {
        console.error(`[${source}] Unauthorized (401). Check credentials.`);
        throw new Error("AUTH_FAILED");
    }
    if (!res.ok) {
      console.error(`[${source}] HTTP Error: ${res.status} ${res.statusText}`);
      throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }
    const data: OpenSkyResponse = await res.json();
    if (!data.states) return [];
    return data.states.map(mapVectorToFlight);
  };

  try {
    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa(`${OPENSKY_CREDENTIALS.username}:${OPENSKY_CREDENTIALS.password}`));
    
    const response = await fetch(url, { headers });
    return await processResponse(response, 'OpenSky Auth');

  } catch (authError: any) {
    if (authError.message === "RATE_LIMIT") {
        console.warn("Authenticated request rate limited. Skipping fallback to avoid IP ban.");
        return []; 
    }
    if (authError.message === "AUTH_FAILED") {
         // Credentials likely invalid, logging strictly.
    } else {
        console.warn(`OpenSky Auth fetch failed: ${authError.message}. Attempting anonymous fallback...`);
    }
    
    try {
      const response = await fetch(url);
      return await processResponse(response, 'OpenSky Anon');
    } catch (anonError: any) {
      console.error(`OpenSky Fallback failed: ${anonError.message}`);
      return [];
    }
  }
};

export const getAirportActivity = async (airportIcao: string): Promise<Map<string, RouteInfo>> => {
  const now = Math.floor(Date.now() / 1000);
  const start = now - 7200; 
  const end = now + 7200;  

  const headers = new Headers();
  headers.set('Authorization', 'Basic ' + btoa(`${OPENSKY_CREDENTIALS.username}:${OPENSKY_CREDENTIALS.password}`));

  const fetchEndpoint = async (type: 'departure' | 'arrival') => {
    const url = `${FLIGHTS_URL}/${type}?airport=${airportIcao}&begin=${start}&end=${end}`;
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) {
          console.warn(`Airport activity fetch failed (${type}): ${res.status}`);
          return [];
      }
      const data: OpenSkyRouteFlight[] = await res.json();
      return data;
    } catch (e) {
      console.warn(`Airport activity network error (${type}):`, e);
      return [];
    }
  };

  const [deps, arrs] = await Promise.all([
    fetchEndpoint('departure'),
    fetchEndpoint('arrival')
  ]);

  const routeMap = new Map<string, RouteInfo>();
  
  deps.forEach(f => {
      routeMap.set(f.icao24, {
          origin: f.estDepartureAirport || airportIcao,
          destination: f.estArrivalAirport || null
      });
  });

  arrs.forEach(f => {
      if (!routeMap.has(f.icao24)) {
          routeMap.set(f.icao24, {
              origin: f.estDepartureAirport || null,
              destination: f.estArrivalAirport || airportIcao
          });
      }
  });

  return routeMap;
};

// --- FR24 Logic ---

const NAUTICAL_MILE_TO_KM = 1.852;
const KM_PER_LAT_DEGREE = 111.32;

interface Coordinates {
    lat: number;
    lon: number;
}

interface Bounds {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
}

const calculateBounds = (center: Coordinates, radiusNm: number): Bounds => {
  const radiusKm = radiusNm * NAUTICAL_MILE_TO_KM;
  
  const latDelta = radiusKm / KM_PER_LAT_DEGREE;
  const latRadians = center.lat * (Math.PI / 180);
  const cosLat = Math.max(0.0001, Math.cos(latRadians));
  const lonDelta = radiusKm / (KM_PER_LAT_DEGREE * cosLat);

  return {
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
    minLon: center.lon - lonDelta,
    maxLon: center.lon + lonDelta
  };
};

/**
 * Fetches data from FR24 via a CORS proxy using a localized bounding box.
 */
const fetchFR24Data = async (callsign: string, lat: number, lon: number): Promise<Partial<FlightEnrichment>> => {
  try {
    const bounds = calculateBounds({ lat, lon }, 50); 
    const boundsStr = `${bounds.maxLat.toFixed(4)},${bounds.minLat.toFixed(4)},${bounds.minLon.toFixed(4)},${bounds.maxLon.toFixed(4)}`;

    const baseUrl = `https://data-cloud.flightradar24.com/zones/fcgi/feed.js`;
    // Reduced maxage to 15 mins (900) to keep payload smaller
    const params = new URLSearchParams({
        bounds: boundsStr,
        faa: '1', satellite: '1', mlat: '1', flarm: '1',
        adsb: '1', gnd: '1', air: '1', vehicles: '1',
        estimated: '1', maxage: '900', gliders: '1', stats: '1',
        _: Date.now().toString()
    });
    const targetUrl = `${baseUrl}?${params.toString()}`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}&disableCache=true`;
    
    const response = await fetch(proxyUrl);
    if (!response.ok) return {};
    const json = await response.json();
    if (!json.contents) return {};

    const rawData = JSON.parse(json.contents);
    
    const cleanCallsign = callsign.toUpperCase();
    let match: FR24FeedTuple | null = null;

    for (const key in rawData) {
        if (Array.isArray(rawData[key])) {
            const f = rawData[key] as FR24FeedTuple;
            const frCallsign = (f[16] || '').toUpperCase();
            if (frCallsign === cleanCallsign) {
                match = f;
                break;
            }
        }
    }

    if (!match) return {};

    const result: Partial<FlightEnrichment> = {
        aircraft: {
            type: 'LandPlane',
            icaotype: match[8] || 'UNK',
            manufacturer: 'Unknown', 
            model: match[8] || 'Unknown Model', 
            owner: 'Unknown Airline',
            registered: match[9] || 'N/A',
            url_photo: null
        },
        route: {
            callsign: callsign,
            origin: { 
                name: match[11] || 'Unknown', 
                icao: match[11] || '', 
                iata: match[11] || '', 
                country: '' 
            },
            destination: { 
                name: match[12] || 'Unknown', 
                icao: match[12] || '', 
                iata: match[12] || '', 
                country: '' 
            }
        }
    };

    return result;

  } catch (e) {
    console.warn("FR24 Enrichment fetch failed:", e);
    return {};
  }
};

/**
 * Fetches FR24 feed for the visible map area to enrich flight tags AND fill missing aircraft.
 */
export const fetchFR24Feed = async (bounds: MapBounds): Promise<FR24FeedResult> => {
    const metaMap = new Map<string, FlightMetadata>();
    const flights: Flight[] = [];
    
    try {
        const boundsStr = `${bounds.lamax.toFixed(4)},${bounds.lamin.toFixed(4)},${bounds.lomin.toFixed(4)},${bounds.lomax.toFixed(4)}`;
        const baseUrl = `https://data-cloud.flightradar24.com/zones/fcgi/feed.js`;
        // Reduced maxage to 1800 (30 mins) from 14400 (4 hours) to improve speed
        const params = new URLSearchParams({
            bounds: boundsStr,
            faa: '1', satellite: '1', mlat: '1', flarm: '1',
            adsb: '1', gnd: '1', air: '1', vehicles: '1',
            estimated: '1', maxage: '1800', gliders: '1', stats: '1',
            _: Date.now().toString()
        });
        const targetUrl = `${baseUrl}?${params.toString()}`;
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}&disableCache=true`;

        const response = await fetch(proxyUrl);
        if (!response.ok) {
            console.warn(`FR24 Proxy fetch failed: ${response.status}`);
            return { flights, meta: metaMap };
        }
        
        const json = await response.json();
        if (!json.contents) {
            console.warn("FR24 Proxy returned no contents");
            return { flights, meta: metaMap };
        }
        
        const rawData = JSON.parse(json.contents);
        
        for (const key in rawData) {
            if (Array.isArray(rawData[key])) {
                const f = rawData[key] as FR24FeedTuple;
                
                // FR24 Tuple Parsing
                const hexId = f[0] || key;
                const lat = f[1];
                const lon = f[2];
                const track = f[3];
                const altFt = f[4];
                const speedKt = f[5];
                const squawk = f[6];
                const type = f[8];
                const reg = f[9];
                const origin = f[11];
                const dest = f[12];
                const callsign = f[16];

                // 1. Build Metadata
                const meta: FlightMetadata = {
                    aircraftType: type || null,
                    registration: reg || null,
                    origin: origin || null,
                    destination: dest || null
                };

                // Index by Hex (Primary)
                if (hexId) metaMap.set(hexId.toLowerCase(), meta);
                // Index by Callsign (Secondary)
                if (callsign) metaMap.set(callsign.trim().toUpperCase(), meta);

                // 2. Build Flight Object (Standardized to OpenSky format)
                // Conversions: Feet -> Meters, Knots -> m/s
                const flight: Flight = {
                    icao24: hexId.toLowerCase(),
                    callsign: callsign || 'N/A',
                    origin_country: 'Unknown', // FR24 doesn't provide this easily in feed
                    time_position: Math.floor(Date.now() / 1000),
                    last_contact: Math.floor(Date.now() / 1000),
                    longitude: lon,
                    latitude: lat,
                    baro_altitude: altFt / 3.28084, // ft to meters
                    on_ground: false, // simplified
                    velocity: speedKt / 1.94384, // kt to m/s
                    true_track: track,
                    vertical_rate: 0, // FR24 feed v_speed is often index 15 but not always reliable here
                    sensors: [],
                    geo_altitude: altFt / 3.28084,
                    squawk: squawk,
                    spi: false,
                    position_source: 0,
                    category: 0
                };
                
                // FR24 'on_ground' is index 14 (0 or 1)
                if (f[14] === 1) flight.on_ground = true;

                flights.push(flight);
            }
        }
    } catch (e: any) {
        console.warn(`FR24 Feed Parse/Fetch failed: ${e.message}`);
    }
    
    return { flights, meta: metaMap };
};

export const fetchFlightEnrichment = async (icao24: string, callsign?: string | null, lat?: number | null, lon?: number | null): Promise<FlightEnrichment> => {
  const result: FlightEnrichment = {};
  const promises = [];
  
  const headers = new Headers();
  headers.set('Authorization', 'Basic ' + btoa(`${OPENSKY_CREDENTIALS.username}:${OPENSKY_CREDENTIALS.password}`));

  // 1. ADS-B DB
  if (icao24) {
    promises.push(
      fetch(`https://api.adsbdb.com/v0/aircraft/${icao24}`)
        .then(async (res) => {
           if (!res.ok) return;
           const data = await res.json();
           if (data.response?.aircraft) {
              result.aircraft = data.response.aircraft;
           }
        })
        .catch(() => {})
    );
  }

  if (callsign && callsign.trim() !== 'N/A') {
      const cleanCallsign = callsign.trim();
      promises.push(
        fetch(`https://api.adsbdb.com/v0/callsign/${cleanCallsign}`)
          .then(async (res) => {
            if (!res.ok) return;
            const data = await res.json();
            if (data.response?.route) {
                result.route = data.response.route;
            }
          })
          .catch(() => {})
      );
  }

  await Promise.all(promises);

  // 2. FR24 Fallback (Proxy)
  if ((!result.route || !result.aircraft || !result.aircraft.registered) && callsign && lat && lon) {
      try {
          const fr24Data = await fetchFR24Data(callsign.trim(), lat, lon);
          
          if (!result.route && fr24Data.route) {
              result.route = fr24Data.route;
          }
          if (fr24Data.aircraft) {
              result.aircraft = {
                  ...(result.aircraft || {}),
                  ...(fr24Data.aircraft as ADSBDBAircraft),
                  ...(result.aircraft?.type ? { type: result.aircraft.type } : {}),
                  ...(result.aircraft?.manufacturer ? { manufacturer: result.aircraft.manufacturer } : {}),
                  ...(result.aircraft?.model ? { model: result.aircraft.model } : {}),
              } as ADSBDBAircraft;
          }
      } catch (e) {}
  }

  // 3. OpenSky Fallback
  if (!result.route) {
    const now = Math.floor(Date.now() / 1000);
    const start = now - 86400; 
    const end = now + 7200; 
    
    try {
        const res = await fetch(`https://opensky-network.org/api/flights/aircraft?icao24=${icao24}&begin=${start}&end=${end}`, { headers });
        if (res.ok) {
            const data: OpenSkyRouteFlight[] = await res.json();
            data.sort((a, b) => b.lastSeen - a.lastSeen);
            if (data.length > 0) {
                result.openSkyRoute = data[0];
            }
        }
    } catch (e) {}
  }

  return result;
};
