import React from 'react';
import { Download, Menu, Plus, Upload } from 'lucide-react';
import type { AppSection } from '../types/church';

interface TopBarProps {
  activeSection: AppSection;
  onOpenMobileMenu: () => void;
  onNavigate: (section: AppSection) => void;
  onExportAllExcel: () => void;
  onQuickCreate?: () => void;
  quickCreateLabel?: string;
}

const SECTION_META: Record<AppSection, { group: string; title: string }> = {
  resumen: { group: 'Administración', title: 'Resumen General' },
  miembros: { group: 'Personas y Hogares', title: 'Registro de Miembros' },
  familias: { group: 'Personas y Hogares', title: 'Familias y Hogares' },
  ministerios: { group: 'Vida Ministerial', title: 'Ministerios y Grupos' },
  eventos: { group: 'Actividad', title: 'Cultos y Eventos' },
  asistencia: { group: 'Actividad', title: 'Control de Asistencia' },
  excel: { group: 'Planillas', title: 'Importar y Exportar Excel' },
  modelo: { group: 'Arquitectura', title: 'Modelo de Base de Datos Relacional' },
  equipo: { group: 'Seguridad', title: 'Personal y Roles' },
};

export function TopBar({
  activeSection,
  onOpenMobileMenu,
  onNavigate,
  onExportAllExcel,
  onQuickCreate,
  quickCreateLabel,
}: TopBarProps) {
  const meta = SECTION_META[activeSection];

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-20 shrink-0">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Abrir menú de navegación"
          className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 text-sm min-w-0 truncate">
          <span className="text-slate-500 hidden sm:inline whitespace-nowrap">{meta.group}</span>
          <span className="text-slate-300 hidden sm:inline" aria-hidden="true">/</span>
          <h1 className="font-semibold text-slate-900 truncate">{meta.title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {activeSection !== 'excel' && (
          <button
            type="button"
            onClick={() => onNavigate('excel')}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            Subir Excel
          </button>
        )}
        <button
          type="button"
          onClick={onExportAllExcel}
          aria-label="Exportar base de datos a Excel"
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Exportar .xlsx</span>
        </button>
        {onQuickCreate && quickCreateLabel && (
          <button
            type="button"
            onClick={onQuickCreate}
            aria-label={quickCreateLabel}
            className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="sm:hidden">Nuevo</span>
            <span className="hidden sm:inline">{quickCreateLabel}</span>
          </button>
        )}
      </div>
    </header>
  );
}
