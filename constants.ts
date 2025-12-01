
export const OPENSKY_CREDENTIALS = {
  username: "thatdaveguy-api-client",
  password: "HG9Wr236cTf8Hr4UGKHyKGtCpNfKZ2SB"
};

export const REFRESH_INTERVAL_MS = 30000; // 30 seconds to strictly respect OpenSky rate limits
export const MIN_ZOOM_FOR_API = 5; // Prevent fetching data when zoomed out too far (saves API calls)

// CartoDB Dark Matter tiles for that sleek radar look
export const MAP_TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
export const MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export const Z_INDEX = {
  MAP: 0,
  CONTROLS: 1000,
  OVERLAY: 1100,
};

// Mappings for smart search (Common airlines IATA/Names to ICAO)
export const AIRLINE_MAPPINGS: Record<string, string> = {
  'AC': 'ACA', 'AIRCANADA': 'ACA', 'ROUGE': 'ROU',
  'UA': 'UAL', 'UNITED': 'UAL',
  'AA': 'AAL', 'AMERICAN': 'AAL',
  'DL': 'DAL', 'DELTA': 'DAL',
  'WS': 'WJA', 'WESTJET': 'WJA', 'ENCORE': 'WEN',
  'BA': 'BAW', 'BRITISH': 'BAW', 'SPEEDBIRD': 'BAW',
  'LH': 'DLH', 'LUFTHANSA': 'DLH',
  'AF': 'AFR', 'AIRFRANCE': 'AFR',
  'KL': 'KLM', 'KLM': 'KLM',
  'QF': 'QFA', 'QANTAS': 'QFA',
  'NZ': 'ANZ', 'AIRNZ': 'ANZ',
  'EK': 'UAE', 'EMIRATES': 'UAE',
  'QR': 'QTR', 'QATAR': 'QTR',
  'SQ': 'SIA', 'SINGAPORE': 'SIA',
  'CX': 'CPA', 'CATHAY': 'CPA',
  'JL': 'JAL', 'JAPAN': 'JAL',
  'NH': 'ANA', 'ALLNIPPON': 'ANA',
  'KE': 'KAL', 'KOREAN': 'KAL',
  'WN': 'SWA', 'SOUTHWEST': 'SWA',
  'B6': 'JBU', 'JETBLUE': 'JBU',
  'AS': 'ASA', 'ALASKA': 'ASA',
  'NK': 'NKS', 'SPIRIT': 'NKS',
  'F9': 'FFT', 'FRONTIER': 'FFT',
  'FX': 'FDX', 'FEDEX': 'FDX',
  'UPS': 'UPS',
};

// Mapping for ICAO prefix to airline name for UI display
export const AIRLINE_NAMES: Record<string, string> = {
  'ACA': 'AIR CANADA',
  'ROU': 'AIR CANADA ROUGE',
  'WJA': 'WESTJET',
  'WEN': 'WESTJET ENCORE',
  'UAL': 'UNITED',
  'AAL': 'AMERICAN',
  'DAL': 'DELTA',
  'BAW': 'BRITISH AIRWAYS',
  'DLH': 'LUFTHANSA',
  'AFR': 'AIR FRANCE',
  'KLM': 'KLM',
  'QFA': 'QANTAS',
  'ANZ': 'AIR NEW ZEALAND',
  'UAE': 'EMIRATES',
  'QTR': 'QATAR',
  'SIA': 'SINGAPORE',
  'CPA': 'CATHAY PACIFIC',
  'JAL': 'JAPAN AIRLINES',
  'ANA': 'ALL NIPPON',
  'KAL': 'KOREAN AIR',
  'SWA': 'SOUTHWEST',
  'JBU': 'JETBLUE',
  'ASA': 'ALASKA',
  'NKS': 'SPIRIT',
  'FFT': 'FRONTIER',
  'FDX': 'FEDEX',
  'UPS': 'UPS',
  'JZA': 'JAZZ',
  'MAL': 'MORNINGSTAR',
  'CNK': 'SUNWEST',
  'CJT': 'CARGOJET',
};

export interface Airport {
  code: string; // ICAO
  iata: string;
  name: string;
  lat: number;
  lon: number;
  keywords: string[];
}

export const AIRPORTS: Airport[] = [
  { code: 'CYEG', iata: 'YEG', name: 'Edmonton International', lat: 53.3097, lon: -113.5797, keywords: ['edmonton', 'yeg'] },
  { code: 'CYYZ', iata: 'YYZ', name: 'Toronto Pearson', lat: 43.6777, lon: -79.6248, keywords: ['toronto', 'pearson', 'yyz'] },
  { code: 'CYVR', iata: 'YVR', name: 'Vancouver International', lat: 49.1947, lon: -123.1762, keywords: ['vancouver', 'yvr'] },
  { code: 'CYUL', iata: 'YUL', name: 'Montreal Trudeau', lat: 45.4690, lon: -73.7447, keywords: ['montreal', 'yul'] },
  { code: 'CYYC', iata: 'YYC', name: 'Calgary International', lat: 51.1215, lon: -114.0076, keywords: ['calgary', 'yyc'] },
  { code: 'EGLL', iata: 'LHR', name: 'London Heathrow', lat: 51.4700, lon: -0.4543, keywords: ['london', 'heathrow', 'lhr'] },
  { code: 'KJFK', iata: 'JFK', name: 'John F. Kennedy', lat: 40.6413, lon: -73.7781, keywords: ['new york', 'jfk', 'kennedy'] },
  { code: 'KLAX', iata: 'LAX', name: 'Los Angeles International', lat: 33.9416, lon: -118.4085, keywords: ['los angeles', 'lax'] },
  { code: 'KORD', iata: 'ORD', name: 'O\'Hare International', lat: 41.9742, lon: -87.9073, keywords: ['chicago', 'ord', 'ohare'] },
  { code: 'OMDB', iata: 'DXB', name: 'Dubai International', lat: 25.2532, lon: 55.3657, keywords: ['dubai', 'dxb'] },
];

export const resolveAirport = (query: string): Airport | null => {
  if (!query) return null;
  const q = query.toLowerCase().trim();
  
  return AIRPORTS.find(a => 
    a.code.toLowerCase() === q || 
    a.iata.toLowerCase() === q || 
    a.keywords.some(k => q.includes(k))
  ) || null;
};
