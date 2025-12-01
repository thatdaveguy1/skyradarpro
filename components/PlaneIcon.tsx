
import * as L from 'leaflet';
import { Flight, RouteInfo, FlightMetadata } from '../types';

export const createPlaneIcon = (
    flight: Flight, 
    routeInfo: RouteInfo | undefined, 
    meta: FlightMetadata | undefined,
    isSelected: boolean, 
    isDimmed: boolean = false
) => {
  const rotation = (flight.true_track || 0) - 45; 
  
  let color = '#38bdf8'; // Sky-400
  if (isSelected) color = '#fbbf24'; // Amber-400
  if (isDimmed) color = '#64748b'; // Slate-500
  
  const size = isSelected ? 40 : 32;
  const opacity = isDimmed ? '0.4' : '1';
  
  // --- Data Processing for Tags ---

  // 1. Callsign
  const callsign = flight.callsign?.trim() || flight.icao24.toUpperCase();
  
  // 2. Speed (Knots)
  const velocityKt = flight.velocity ? Math.round(flight.velocity * 1.94384) : 0;
  const speed = `${velocityKt}kt`;
  
  // 3. Altitude & Trend
  const altFeet = (flight.baro_altitude ?? flight.geo_altitude ?? 0) * 3.28084;
  let altStr = '000';
  if (flight.on_ground) {
      altStr = 'GND';
  } else {
      // Flight Level format (Hundreds of feet)
      altStr = String(Math.round(altFeet / 100)).padStart(3, '0');
  }
  
  const vRate = flight.vertical_rate || 0;
  const trend = vRate > 0.5 ? '▲' : vRate < -0.5 ? '▼' : '';

  // 4. Destination (Priority: Meta > RouteInfo)
  let dest = null;
  const rawDest = meta?.destination || routeInfo?.destination;
  
  if (rawDest) {
      // Simple heuristic: if 4 letters starting with K/C, trim to 3. 
      // Otherwise keep as is (IATA or Name)
      if ((rawDest.startsWith('K') || rawDest.startsWith('C')) && rawDest.length === 4) {
          dest = rawDest.substring(1);
      } else {
          dest = rawDest;
      }
  }

  // 5. Aircraft Type Code (Priority: Meta > Explicit Category Logic > Blank)
  // User explicitly requested to NOT show "JET", "HVY" etc.
  let typeCode = '';
  
  if (meta?.aircraftType) {
      typeCode = meta.aircraftType;
  } 
  // If no meta, we default to blank unless it is a specific ground vehicle
  else if (flight.category === 16 || flight.category === 17 || flight.category === 18) {
      typeCode = 'GND';
  }


  // Quadrant Logic for Leader Lines
  const hash = parseInt(flight.icao24.slice(-1), 16);
  let labelPosClass = '';
  let leaderLineClass = '';
  let alignClass = '';
  let borderClass = '';

  // Calculate quadrants to avoid overlapping the icon
  if (hash < 4) { // NE
    labelPosClass = 'left-6 bottom-6 text-left';
    leaderLineClass = 'left-1/2 bottom-1/2 w-8 h-[1px] -rotate-45 origin-left';
    alignClass = 'items-start';
    borderClass = 'border-l-2';
  } else if (hash < 8) { // SE
    labelPosClass = 'left-6 top-6 text-left';
    leaderLineClass = 'left-1/2 top-1/2 w-8 h-[1px] rotate-45 origin-left';
    alignClass = 'items-start';
    borderClass = 'border-l-2';
  } else if (hash < 12) { // SW
    labelPosClass = 'right-6 top-6 text-right';
    leaderLineClass = 'right-1/2 top-1/2 w-8 h-[1px] -rotate-45 origin-right';
    alignClass = 'items-end';
    borderClass = 'border-r-2';
  } else { // NW
    labelPosClass = 'right-6 bottom-6 text-right';
    leaderLineClass = 'right-1/2 bottom-1/2 w-8 h-[1px] rotate-45 origin-right';
    alignClass = 'items-end';
    borderClass = 'border-r-2';
  }

  const showDataBlock = !isDimmed;

  // HTML Structure
  
  const html = `
    <div class="radar-marker-group relative" style="width: ${size}px; height: ${size}px; opacity: ${opacity};">
      <svg viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg" 
           style="transform: rotate(${rotation}deg); width: 100%; height: 100%; display: block;">
        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
      </svg>
      
      ${showDataBlock ? `
        <div class="absolute bg-green-500/40 pointer-events-none ${leaderLineClass}"></div>

        <div class="radar-tag absolute ${labelPosClass} pointer-events-none whitespace-nowrap z-50">
          <div class="flex flex-col ${alignClass} text-[10px] leading-none font-mono font-bold text-green-400 bg-slate-900/90 px-1.5 py-1 rounded-sm ${borderClass} border-green-500/50 shadow-sm min-w-[70px]">
            
            <!-- Row 1: Callsign -->
            <div class="mb-0.5 text-xs text-white drop-shadow-md tracking-tight">
              ${callsign}
            </div>
            
            <!-- Row 2: Type Code (Conditional) -->
            ${typeCode ? `
            <div class="mb-1 text-[9px] text-slate-400 font-normal tracking-wider">
               ${typeCode}
            </div>
            ` : `<div class="mb-1 h-2"></div>` /* Spacer if no type */ }
            
            <!-- Row 3: Metrics & Dest -->
            <div class="flex items-end justify-between w-full gap-3 border-t border-slate-700/50 pt-0.5">
                <div class="flex items-center gap-1.5 text-green-300">
                  <span class="text-white font-bold">${altStr}</span><span class="text-[9px] -ml-0.5">${trend}</span>
                  <span class="opacity-40">|</span>
                  <span>${speed}</span>
                </div>

                ${dest ? `
                <div class="flex items-center gap-1 text-[9px]">
                  <span class="text-sky-500 font-bold">${dest}</span>
                </div>
                ` : ''}
            </div>

          </div>
        </div>
      ` : ''}
    </div>
  `;

  return L.divIcon({
    html: html,
    className: '!overflow-visible',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};
