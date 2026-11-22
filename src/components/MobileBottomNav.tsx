import React from 'react';
import { Calendar, CheckSquare, LayoutDashboard, Menu, Users } from 'lucide-react';
import type { AppSection } from '../types/church';

interface MobileBottomNavProps {
  activeSection: AppSection;
  onSelect: (section: AppSection) => void;
  onOpenMenu: () => void;
}

const PRIMARY_TABS: {
  id: AppSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
  { id: 'miembros', label: 'Miembros', icon: Users },
  { id: 'asistencia', label: 'Asistencia', icon: CheckSquare },
  { id: 'eventos', label: 'Eventos', icon: Calendar },
];

export function MobileBottomNav({ activeSection, onSelect, onOpenMenu }: MobileBottomNavProps) {
  const isOverflowActive = !PRIMARY_TABS.some((t) => t.id === activeSection);

  return (
    <nav
      aria-label="Navegación rápida móvil"
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5 h-16">
        {PRIMARY_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelect(tab.id)}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                active ? 'text-blue-900' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-blue-900' : 'text-slate-500'}`} />
              <span className="truncate max-w-[70px]">{tab.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Más secciones y configuración"
          className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
            isOverflowActive ? 'text-blue-900' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Menu className={`w-5 h-5 ${isOverflowActive ? 'text-blue-900' : 'text-slate-500'}`} />
          <span>Más</span>
        </button>
      </div>
    </nav>
  );
}
