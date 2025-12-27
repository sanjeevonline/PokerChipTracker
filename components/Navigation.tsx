
import React from 'react';
import { Button } from './UI';
import { LayoutDashboard, Users, LogOut, User } from 'lucide-react';
import { Group } from '../types';
import { supabase } from '../services/supabaseClient';

interface NavigationProps {
  currentGroup: Group | undefined;
  selectedGroupId: string | null;
  session: any;
  onBackToGroups: () => void;
  onSetView: (view: any) => void;
  onLogout: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentGroup,
  selectedGroupId,
  session,
  onBackToGroups,
  onSetView,
  onLogout
}) => {
  return (
    <nav className="border-b border-neutral-800 bg-black/50 backdrop-blur-lg sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-2 overflow-hidden">
        <div className="flex items-center gap-2 font-bold text-lg sm:text-xl cursor-pointer group min-w-0" onClick={onBackToGroups}>
          <div className="w-7 h-9 sm:w-8 sm:h-10 bg-red-600 rounded border border-red-800 flex items-center justify-center text-black shadow-lg shadow-red-900/20 group-hover:scale-105 transition-transform shrink-0">
            <span className="font-serif text-2xl sm:text-3xl leading-none pb-1">♠</span>
          </div>
          <span className="group-hover:text-white transition-colors flex items-center min-w-0 truncate">
            <span className="hidden xs:inline uppercase tracking-tighter">ChipTracker</span>
            <span className="xs:hidden uppercase tracking-tighter">CT</span>
            {currentGroup && <span className="text-neutral-500 font-normal mx-1 sm:mx-2 shrink-0">/</span>}
            {currentGroup && <span className="text-xs sm:text-sm font-black text-neutral-300 truncate uppercase italic">{currentGroup.name}</span>}
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {selectedGroupId && (
            <div className="flex items-center gap-0.5 sm:gap-1">
              <Button variant="ghost" size="sm" onClick={() => onSetView(1)} icon={<LayoutDashboard size={18} />} className="px-2 sm:px-3 text-[10px] font-black uppercase tracking-widest">
                <span className="hidden lg:inline">Table</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onSetView(5)} icon={<Users size={18} />} className="px-2 sm:px-3 text-[10px] font-black uppercase tracking-widest">
                <span className="hidden lg:inline">Roster</span>
              </Button>
            </div>
          )}

          {supabase && session && (
            <div className="pl-1 sm:pl-2 ml-1 sm:ml-2 border-l border-neutral-800 flex items-center gap-1 sm:gap-2">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest leading-none">Signed in as</span>
                <span className="text-[11px] text-neutral-300 font-bold max-w-[150px] truncate">{session.user.email}</span>
              </div>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-900/20 border border-red-900/50 flex items-center justify-center text-red-500 md:hidden">
                <User size={14} />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                icon={<LogOut size={16} />}
                className="text-red-500 hover:text-red-400 hover:bg-red-900/10 px-2 sm:px-3"
              >
                <span className="hidden sm:inline text-[10px] font-black uppercase">Out</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
