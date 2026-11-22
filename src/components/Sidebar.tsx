import React from 'react';
import {
  BookOpen,
  Calendar,
  CheckSquare,
  Database,
  FileSpreadsheet,
  HeartHandshake,
  Home,
  LayoutDashboard,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import type { AppSection } from '../types/church';
import { useChurchStore } from '../context/ChurchStoreContext';
import { PWAInstallButton } from './PWAInstallButton';

interface SidebarProps {
  activeSection: AppSection;
  onSelect: (section: AppSection) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_GROUPS: {
  label: string;
  items: { id: AppSection; label: string; icon: React.ComponentType<{ className?: string }> }[];
}[] = [
  {
    label: 'Operación diaria',
    items: [
      { id: 'resumen', label: 'Resumen General', icon: LayoutDashboard },
      { id: 'miembros', label: 'Miembros', icon: Users },
      { id: 'familias', label: 'Familias y Hogares', icon: Home },
      { id: 'ministerios', label: 'Ministerios', icon: HeartHandshake },
    ],
  },
  {
    label: 'Actividad ministerial',
    items: [
      { id: 'eventos', label: 'Cultos y Eventos', icon: Calendar },
      { id: 'asistencia', label: 'Asistencia', icon: CheckSquare },
    ],
  },
  {
    label: 'Excel y arquitectura',
    items: [
      { id: 'excel', label: 'Importar / Exportar Excel', icon: FileSpreadsheet },
      { id: 'modelo', label: 'Modelo Relacional', icon: Database },
      { id: 'equipo', label: 'Personal y Roles', icon: ShieldCheck },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  pastor: 'Pastor',
  secretaria: 'Secretaría',
  lider: 'Liderazgo',
  consulta: 'Consulta',
};

export function Sidebar({ activeSection, onSelect, mobileOpen, onCloseMobile }: SidebarProps) {
  const { user, isCloudMode, activeRole, signInWithGoogle, signOutUser } = useChurchStore();

  const content = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 w-[256px] shrink-0">
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-md bg-blue-900 text-white flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="font-semibold text-base tracking-tight text-slate-900 whitespace-nowrap truncate">
            Ekklesia Registro
          </span>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Cerrar menú lateral"
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-md"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6" aria-label="Navegación principal">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-2 text-xs font-medium text-slate-500">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(item.id);
                        onCloseMobile();
                      }}
                      aria-current={active ? 'page' : undefined}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-md transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-blue-50 text-blue-900 font-semibold'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-blue-800' : 'text-slate-500'}`} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200 space-y-2.5 shrink-0">
        <PWAInstallButton variant="sidebar" />
        <div className="text-xs space-y-1 pt-1">
          <div className="font-medium text-slate-900 truncate">
            {user ? user.displayName || user.email : 'Espacio de demostración'}
          </div>
          <div className="text-slate-500 flex items-center gap-1.5 truncate">
            <span>Rol: {ROLE_LABELS[activeRole] ?? activeRole}</span>
            <span aria-hidden="true">·</span>
            <span>{isCloudMode ? 'Nube activa' : 'Modo local'}</span>
          </div>
        </div>
        {user ? (
          <button
            type="button"
            onClick={() => void signOutUser()}
            className="w-full px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
          >
            Cerrar sesión
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="w-full px-3 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap"
          >
            Conectar con Google
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block h-screen sticky top-0">{content}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{content}</div>
        </div>
      )}
    </>
  );
}
