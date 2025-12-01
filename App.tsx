
import React, { useState } from 'react';
import Map from './components/Map';
import Header from './components/Header';
import FlightDetails from './components/FlightDetails';
import FilterPanel from './components/FilterPanel';
import { Flight, FilterOptions } from './types';

function App() {
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    airport: '', // Replaced origin
    minAlt: 0,
    maxAlt: 60000,
    showGround: false,
  });
  const [airportName, setAirportName] = useState<string | null>(null);

  const handleFlightSelect = (flight: Flight) => {
    setSelectedFlight(flight);
  };

  const handleCloseDetails = () => {
    setSelectedFlight(null);
  };

  return (
    <div className="w-full h-screen overflow-hidden bg-slate-900 flex flex-col">
      <Header />
      
      <div className="flex-1 relative">
        <Map 
          onFlightSelect={handleFlightSelect} 
          selectedFlightId={selectedFlight?.icao24 || null} 
          filters={filters}
          setResolvedAirportName={setAirportName}
        />
        
        <FilterPanel 
           filters={filters} 
           setFilters={setFilters} 
           airportName={airportName}
        />
        
        <FlightDetails 
          flight={selectedFlight} 
          onClose={handleCloseDetails} 
        />
      </div>
    </div>
  );
}

export default App;
