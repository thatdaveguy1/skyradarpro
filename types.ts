
export interface Flight {
  icao24: string;
  callsign: string | null;
  origin_country: string;
  time_position: number | null;
  last_contact: number;
  longitude: number | null;
  latitude: number | null;
  baro_altitude: number | null;
  on_ground: boolean;
  velocity: number | null;
  true_track: number | null;
  vertical_rate: number | null;
  sensors: number[] | null;
  geo_altitude: number | null;
  squawk: string | null;
  spi: boolean;
  position_source: number;
  category: number;
}

// OpenSky returns an array of arrays. We map it to this object.
export type OpenSkyStateVector = [
  string, // icao24
  string | null, // callsign
  string, // origin_country
  number | null, // time_position
  number, // last_contact
  number | null, // longitude
  number | null, // latitude
  number | null, // baro_altitude
  boolean, // on_ground
  number | null, // velocity
  number | null, // true_track
  number | null, // vertical_rate
  number[] | null, // sensors
  number | null, // geo_altitude
  string | null, // squawk
  boolean, // spi
  number, // position_source
  number // category
];

export interface OpenSkyResponse {
  time: number;
  states: OpenSkyStateVector[] | null;
}

// For Route Filtering
export interface OpenSkyRouteFlight {
  icao24: string;
  firstSeen: number;
  estDepartureAirport: string;
  lastSeen: number;
  estArrivalAirport: string;
  callsign: string;
}

export interface RouteInfo {
    destination: string | null;
    origin: string | null;
}

export interface FlightMetadata {
    aircraftType: string | null; // e.g. "B738"
    registration: string | null; // e.g. "N12345"
    origin: string | null; // e.g. "JFK"
    destination: string | null; // e.g. "LHR"
}

export interface MapBounds {
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
}

export interface FilterOptions {
  search: string;
  airport: string; // "Route" filter - replaces origin
  minAlt: number; // in feet
  maxAlt: number; // in feet
  showGround: boolean;
}

// --- ADS-B DB Enrichment Types ---

export interface ADSBDBAirport {
  name: string;
  iata: string;
  icao: string;
  country: string;
}

export interface ADSBDBRoute {
  callsign: string;
  origin: ADSBDBAirport;
  destination: ADSBDBAirport;
}

export interface ADSBDBAircraft {
  type: string; // e.g. "LandPlane"
  icaotype: string; // e.g. "B738"
  manufacturer: string; // e.g. "Boeing"
  model: string; // e.g. "737-8H4"
  owner: string; // e.g. "Southwest Airlines"
  registered: string; // e.g. "N8642E"
  url_photo: string | null;
  regid?: string;
}

// --- FlightRadar24 Fallback Types ---

// Standard response used in parsing tuple
export type FR24FeedTuple = [
  string, // 0: id
  number, // 1: lat
  number, // 2: lon
  number, // 3: track
  number, // 4: alt
  number, // 5: speed
  string, // 6: squawk
  string, // 7: radar
  string, // 8: type
  string, // 9: reg
  number, // 10: time
  string, // 11: origin
  string, // 12: dest
  string, // 13: flight
  number, // 14: on_ground
  number, // 15: v_speed
  string, // 16: callsign
  number  // 17: reserved
];

export interface FlightEnrichment {
  aircraft?: ADSBDBAircraft;
  route?: ADSBDBRoute;
  openSkyRoute?: OpenSkyRouteFlight;
}

export interface FR24FeedResult {
    flights: Flight[];
    meta: Map<string, FlightMetadata>;
}
