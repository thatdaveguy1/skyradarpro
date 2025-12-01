import React from 'react';
import { Radar } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <div className="absolute top-0 left-0 w-full z-[1100] p-4 pointer-events-none">
      <div className="flex items-center justify-between">
        <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-lg border border-slate-700/50 shadow-xl pointer-events-auto flex items-center gap-3">
          <div className="relative">
            <Radar className="text-sky-400 w-6 h-6 animate-spin-slow" />
            <span className="absolute top-0 right-0 w-2 h-2 bg-sky-400 rounded-full animate-ping"></span>
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-none tracking-tight">SkyRadar <span className="text-sky-400">Pro</span></h1>
            <p className="text-slate-400 text-[10px] font-mono tracking-wider">LIVE TRAFFIC</p>
          </div>
        </div>
        
        {/* Optional: Add search or other controls here */}
        <div className="hidden md:block pointer-events-auto">
             <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-lg border border-slate-700/50 shadow-xl text-slate-300 text-xs font-mono">
                DATA: OPENSKY NETWORK
             </div>
        </div>
      </div>
    </div>
  );
};

export default Header;