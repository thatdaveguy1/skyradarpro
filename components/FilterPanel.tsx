
import React, { useState } from 'react';
import { FilterOptions } from '../types';
import { Filter, Search, X, ChevronDown, ChevronUp, MapPin } from 'lucide-react';

interface FilterPanelProps {
  filters: FilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<FilterOptions>>;
  airportName?: string | null; // Display resolved name
}

const FilterPanel: React.FC<FilterPanelProps> = ({ filters, setFilters, airportName }) => {
  const [isOpen, setIsOpen] = useState(true);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, search: e.target.value }));
  };

  const handleAirportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, airport: e.target.value }));
  };

  const handleGroundToggle = () => {
    setFilters(prev => ({ ...prev, showGround: !prev.showGround }));
  };

  const handleAltChange = (type: 'min' | 'max', value: string) => {
    const numVal = parseInt(value) || 0;
    setFilters(prev => ({
      ...prev,
      [type === 'min' ? 'minAlt' : 'maxAlt']: numVal
    }));
  };

  return (
    <div className="absolute top-20 right-4 z-[1000] w-72 md:w-80 flex flex-col items-end pointer-events-none">
      <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden transition-all duration-300">
        
        {/* Header / Toggle */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 transition-colors border-b border-slate-700/50"
        >
          <div className="flex items-center gap-2 text-sky-400">
            <Filter size={16} />
            <span className="font-mono font-bold text-sm tracking-wide">RADAR FILTERS</span>
          </div>
          {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>

        {/* Content */}
        {isOpen && (
          <div className="p-4 space-y-4">
            
            {/* Search */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Search Ident / Callsign</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="text"
                  value={filters.search}
                  onChange={handleSearchChange}
                  placeholder="e.g. AC 224, UAL123..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-md py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                />
                {filters.search && (
                   <button onClick={() => setFilters(p => ({...p, search: ''}))} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                     <X size={12} />
                   </button>
                )}
              </div>
            </div>

            {/* Airport / Route Filter */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Airport Filter (Route)</label>
              <div className="relative">
                 <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="text"
                  value={filters.airport}
                  onChange={handleAirportChange}
                  placeholder="e.g. Edmonton, YEG, LHR..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-md py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
                />
                 {filters.airport && (
                   <button onClick={() => setFilters(p => ({...p, airport: ''}))} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                     <X size={12} />
                   </button>
                )}
              </div>
               {airportName && (
                  <div className="flex items-center gap-1 text-[10px] text-green-400 mt-1 pl-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    FILTERING TRAFFIC: {airportName}
                  </div>
               )}
              <p className="text-[9px] text-slate-500">Dims aircraft not flying to/from this location.</p>
            </div>

            {/* Altitude Range */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Altitude (ft)</label>
              <div className="flex items-center gap-2">
                <input 
                  type="number"
                  value={filters.minAlt}
                  onChange={(e) => handleAltChange('min', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md py-1 px-2 text-xs text-white text-center font-mono focus:border-sky-500 outline-none"
                />
                <span className="text-slate-500 text-xs">-</span>
                <input 
                  type="number"
                  value={filters.maxAlt}
                  onChange={(e) => handleAltChange('max', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md py-1 px-2 text-xs text-white text-center font-mono focus:border-sky-500 outline-none"
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="pt-2 border-t border-slate-700/50">
               <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-xs text-slate-300 group-hover:text-white transition-colors">Show Ground Vehicles</span>
                  <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 ${filters.showGround ? 'bg-sky-500' : 'bg-slate-700'}`}>
                    <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200 ${filters.showGround ? 'translate-x-4' : 'translate-x-0'}`}></div>
                  </div>
                  <input type="checkbox" checked={filters.showGround} onChange={handleGroundToggle} className="hidden" />
               </label>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default FilterPanel;
