
import React, { useEffect, useState } from 'react';
import { Flight, FlightEnrichment } from '../types';
import { fetchFlightEnrichment } from '../services/flightService';
import { AIRPORTS } from '../constants';
import { 
  Plane, Navigation, Activity, X, Globe, Gauge, 
  ArrowUp, ArrowRight, Hash, Clock, MapPin, 
  Radio, Database, AlertCircle, Signal, Cpu, Ruler,
  Building, User
} from 'lucide-react';

interface FlightDetailsProps {
  flight: Flight | null;
  onClose: () => void;
}

const FlightDetails: React.FC<FlightDetailsProps> = ({ flight, onClose }) => {
  const [enrichment, setEnrichment] = useState<FlightEnrichment | null>(null);
  const [loadingEnrichment, setLoadingEnrichment] = useState(false);

  useEffect(() => {
    if (flight) {
      setEnrichment(null);
      setLoadingEnrichment(true);
      fetchFlightEnrichment(flight.icao24, flight.callsign, flight.latitude, flight.longitude)
        .then(setEnrichment)
        .finally(() => setLoadingEnrichment(false));
    }
  }, [flight]);

  if (!flight) return null;

  // --- Helpers for Data Formatting ---

  const formatTime = (ts: number | null) => {
    if (!ts) return 'N/A';
    return new Date(ts * 1000).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getPositionSource = (source: number) => {
    const sources = ['ADS-B', 'ASTERIX', 'MLAT', 'FLARM'];
    return sources[source] || `UNKNOWN (${source})`;
  };

  const getCategoryDescription = (cat: number) => {
    const categories: Record<number, string> = {
      0: 'No Info', 1: 'No Info', 2: 'Light', 3: 'Small', 4: 'Large', 5: 'High Vortex', 
      6: 'Heavy', 7: 'High Perf', 8: 'Rotorcraft', 9: 'Glider', 10: 'Lighter-than-air', 
      11: 'Parachutist', 12: 'Ultralight', 13: 'Reserved', 14: 'UAV', 15: 'Space', 
      16: 'Surface Emergency', 17: 'Surface Service', 18: 'Point Obstacle', 19: 'Cluster Obstacle'
    };
    return categories[cat] || `Unknown (${cat})`;
  };

  const DataRow = ({ icon: Icon, label, value, subValue, highlight = false }: any) => (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-800 last:border-0 group hover:bg-slate-800/30 px-2 -mx-2 rounded transition-colors">
      <div className="flex items-center gap-3 text-slate-400">
        {Icon && <Icon size={14} strokeWidth={2} />}
        <span className="text-[10px] uppercase tracking-widest font-bold opacity-80">{label}</span>
      </div>
      <div className="text-right">
        <div className={`text-sm ${highlight ? 'text-sky-400 font-bold' : 'text-slate-200'} font-mono`}>{value}</div>
        {subValue && <div className="text-[10px] text-slate-500 font-mono mt-0.5">{subValue}</div>}
      </div>
    </div>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <div className="mt-6 mb-2 flex items-center gap-2">
      <div className="h-[1px] bg-slate-700 flex-1"></div>
      <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{title}</span>
      <div className="h-[1px] bg-slate-700 flex-1"></div>
    </div>
  );

  // --- Derived Route Logic ---
  const route = enrichment?.route;
  const osRoute = enrichment?.openSkyRoute;
  
  const hasRouteData = !!route || !!osRoute;
  
  // Helpers to resolve display values
  const getOriginCode = () => route?.origin.iata || osRoute?.estDepartureAirport || '---';
  const getOriginName = () => {
      if (route?.origin.name && route.origin.name !== 'Unknown') return route.origin.name;
      if (osRoute?.estDepartureAirport) {
          const match = AIRPORTS.find(a => a.code === osRoute.estDepartureAirport);
          return match?.name || osRoute.estDepartureAirport;
      }
      return 'Unknown Origin';
  };

  const getDestCode = () => route?.destination.iata || osRoute?.estArrivalAirport || '---';
  const getDestName = () => {
      if (route?.destination.name && route.destination.name !== 'Unknown') return route.destination.name;
      if (osRoute?.estArrivalAirport) {
           const match = AIRPORTS.find(a => a.code === osRoute.estArrivalAirport);
           return match?.name || osRoute.estArrivalAirport;
      }
      return 'Unknown Destination';
  };

  return (
    <div className="absolute top-0 right-0 h-full w-full md:w-[400px] bg-[#0b1120]/95 backdrop-blur-xl border-l border-slate-700/50 shadow-2xl z-[1200] flex flex-col text-slate-300 transform transition-transform duration-300">
      
      {/* Header */}
      <div className="flex items-start justify-between p-6 pb-4 bg-gradient-to-b from-slate-800/50 to-transparent">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full ${flight.on_ground ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`}></div>
            <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
              {flight.on_ground ? 'ON GROUND' : 'ACTIVE TRACK'}
            </span>
          </div>
          <h2 className="text-4xl font-black text-white font-mono tracking-tighter">
            {flight.callsign?.trim() || 'N/A'}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] font-mono text-sky-400 border border-slate-700">
              {flight.icao24.toUpperCase()}
            </span>
            <span className="text-xs text-slate-400 truncate max-w-[200px]">
              {flight.origin_country}
            </span>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 bg-slate-800/50 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors border border-slate-700"
        >
          <X size={20} />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6">
        
        {/* Primary Metrics HUD */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-800/40 p-3 rounded border border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <ArrowUp size={14} />
              <span className="text-[10px] uppercase font-bold">Baro Alt</span>
            </div>
            <div className="text-2xl font-mono text-white font-bold">
              {flight.baro_altitude ? Math.round(flight.baro_altitude * 3.28084).toLocaleString() : '---'}
              <span className="text-xs text-slate-500 ml-1 font-normal">ft</span>
            </div>
          </div>
          <div className="bg-slate-800/40 p-3 rounded border border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Activity size={14} />
              <span className="text-[10px] uppercase font-bold">Ground Spd</span>
            </div>
            <div className="text-2xl font-mono text-white font-bold">
              {flight.velocity ? Math.round(flight.velocity * 1.94384) : '---'}
              <span className="text-xs text-slate-500 ml-1 font-normal">kt</span>
            </div>
          </div>
        </div>

        {/* --- FLIGHT PLAN (Merged Sources) --- */}
        {hasRouteData ? (
           <>
            <SectionHeader title="Flight Plan" />
            <div className="bg-slate-800/20 rounded-lg p-3 border border-slate-700/50 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Origin</div>
                    <div className="text-lg text-white font-mono font-bold leading-none">{getOriginCode()}</div>
                    <div className="text-[10px] text-slate-400 truncate">{getOriginName()}</div>
                </div>
                <div className="flex flex-col items-center justify-center px-2">
                    <ArrowRight size={16} className="text-sky-500" />
                </div>
                <div className="flex-1 min-w-0 text-right">
                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Destination</div>
                    <div className="text-lg text-white font-mono font-bold leading-none">{getDestCode()}</div>
                    <div className="text-[10px] text-slate-400 truncate">{getDestName()}</div>
                </div>
            </div>
           </>
        ) : loadingEnrichment ? (
            <div className="mt-4 text-center">
                 <span className="text-xs text-slate-600 animate-pulse">Loading Route Info...</span>
            </div>
        ) : null}

        {/* --- AIRCRAFT REGISTRY (Enrichment + Fallback) --- */}
        <SectionHeader title="Aircraft Registry" />
        {enrichment?.aircraft ? (
          <>
            <div className="space-y-1 mb-2">
               {enrichment.aircraft.url_photo && (
                   <div className="w-full h-32 bg-slate-800 rounded mb-3 overflow-hidden border border-slate-700 relative">
                       <img src={enrichment.aircraft.url_photo} alt="Aircraft" className="w-full h-full object-cover" />
                       <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-1 text-[8px] text-white/70 text-center">Source: ADS-B DB</div>
                   </div>
               )}
            </div>
            <DataRow 
              icon={Plane} 
              label="Type Code" 
              value={enrichment.aircraft.icaotype} 
              highlight
            />
            <DataRow 
              icon={Database} 
              label="Model" 
              value={enrichment.aircraft.model} 
            />
            <DataRow 
              icon={Hash} 
              label="Registration" 
              value={enrichment.aircraft.registered || enrichment.aircraft.regid || 'N/A'} 
              highlight
            />
            <DataRow 
              icon={Building} 
              label="Manufacturer" 
              value={enrichment.aircraft.manufacturer} 
            />
             <DataRow 
              icon={User} 
              label="Owner" 
              value={enrichment.aircraft.owner} 
            />
          </>
        ) : (
            // Fallback if no detailed registry data found
            <DataRow 
              icon={Plane} 
              label="Type Info" 
              value={`Category: ${getCategoryDescription(flight.category)}`}
              subValue="Detailed registration unavailable"
            />
        )}


        <SectionHeader title="Flight Dynamics" />
        <DataRow 
          icon={ArrowUp} 
          label="Vertical Rate" 
          value={flight.vertical_rate ? `${flight.vertical_rate.toFixed(1)} m/s` : 'Level'} 
          subValue={flight.vertical_rate ? `${(flight.vertical_rate * 196.85).toFixed(0)} fpm` : null}
          highlight={flight.vertical_rate !== 0}
        />
        <DataRow 
          icon={Navigation} 
          label="True Track" 
          value={flight.true_track !== null ? `${flight.true_track.toFixed(2)}°` : 'N/A'}
        />
        <DataRow 
          icon={Ruler} 
          label="Geo Altitude" 
          value={flight.geo_altitude ? `${Math.round(flight.geo_altitude)} m` : 'N/A'}
          subValue={flight.geo_altitude ? `${Math.round(flight.geo_altitude * 3.28084)} ft` : null}
        />

        <SectionHeader title="Position & Time" />
        <DataRow 
          icon={MapPin} 
          label="Coordinates" 
          value={flight.latitude && flight.longitude ? `${flight.latitude.toFixed(4)}, ${flight.longitude.toFixed(4)}` : 'No Fix'} 
        />
        <DataRow 
          icon={Clock} 
          label="Last Contact" 
          value={formatTime(flight.last_contact)}
          subValue={`${Math.floor(Date.now()/1000 - flight.last_contact)}s ago`}
        />
        <DataRow 
          icon={Clock} 
          label="Position Time" 
          value={formatTime(flight.time_position)} 
        />
        <DataRow 
          icon={Globe} 
          label="Origin Country" 
          value={flight.origin_country} 
        />

        <SectionHeader title="Transponder & System" />
        <DataRow 
          icon={Hash} 
          label="ICAO24 (HEX)" 
          value={flight.icao24.toUpperCase()} 
        />
        <DataRow 
          icon={Radio} 
          label="Squawk" 
          value={flight.squawk || 'N/A'} 
        />
        <DataRow 
          icon={AlertCircle} 
          label="SPI (Ident)" 
          value={flight.spi ? 'ACTIVE' : 'Inactive'} 
          highlight={flight.spi}
        />
        <DataRow 
          icon={Database} 
          label="Source" 
          value={getPositionSource(flight.position_source)} 
          subValue={`Type ID: ${flight.position_source}`}
        />
        <DataRow 
          icon={Signal} 
          label="Sensors" 
          value={flight.sensors && flight.sensors.length > 0 ? flight.sensors.join(', ') : 'None'} 
        />

      </div>
      
      {/* Footer */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 text-[10px] text-slate-600 font-mono text-center uppercase">
        Data Sources: OpenSky Network • ADS-B DB • FlightRadar24
      </div>
    </div>
  );
};

export default FlightDetails;
