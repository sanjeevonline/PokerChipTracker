
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
    <nav className="border-b border-neutral-900 bg-black/70 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3 overflow-hidden">
        <div className="flex items-center gap-2.5 font-bold text-lg cursor-pointer group min-w-0" onClick={onBackToGroups}>
          <div className="w-7 h-9 bg-red-600 rounded-lg border border-red-800 flex items-center justify-center text-black shadow-xl shadow-red-950/40 group-hover:scale-105 transition-all shrink-0">
            <span className="font-serif text-2xl leading-none pb-1">♠</span>
          </div>
          <span className="group-hover:text-white transition-colors flex items-center min-w-0 truncate">
            <span className="hidden xs:inline font-black uppercase tracking-tighter text-base">ChipTracker</span>
            <span className="xs:hidden font-black uppercase tracking-tighter text-sm">CT</span>
            {currentGroup && <span className="text-neutral-700 font-light mx-2 shrink-0">/</span>}
            {currentGroup && <span className="text-xs font-black text-neutral-400 truncate uppercase tracking-tight italic">{currentGroup.name}</span>}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {selectedGroupId && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => onSetView(1)} icon={<LayoutDashboard size={18} />} className="px-2.5 py-2 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                <span className="hidden lg:inline ml-0.5">Table</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onSetView(5)} icon={<Users size={18} />} className="px-2.5 py-2 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                <span className="hidden lg:inline ml-0.5">Roster</span>
              </Button>
            </div>
          )}

          {supabase && session && (
            <div className="pl-2 ml-1 border-l border-neutral-800 flex items-center gap-2">
              <div className="hidden md:flex flex-col items-end mr-1">
                <span className="text-[9px] text-neutral-600 font-black uppercase tracking-widest leading-none mb-1">User</span>
                <span className="text-[11px] text-neutral-300 font-bold max-w-[140px] truncate">{session.user.email}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-red-900/10 border border-red-900/30 flex items-center justify-center text-red-500 md:hidden shadow-inner">
                <User size={16} />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                icon={<LogOut size={16} />}
                className="text-red-500 hover:text-red-400 hover:bg-red-900/10 px-2 h-8"
              >
                <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Out</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
