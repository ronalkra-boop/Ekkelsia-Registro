import React, { useState } from 'react';
import { X } from 'lucide-react';
import { ChurchStoreProvider, useChurchStore } from './context/ChurchStoreContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { OverviewView } from './components/OverviewView';
import { MembersView } from './components/MembersView';
import { FamiliesView } from './components/FamiliesView';
import { MinistriesView } from './components/MinistriesView';
import { EventsView } from './components/EventsView';
import { AttendanceView } from './components/AttendanceView';
import { ExcelImportView } from './components/ExcelImportView';
import { SchemaExplorerView } from './components/SchemaExplorerView';
import { TeamAccessView } from './components/TeamAccessView';
import { downloadExcelBuffer, exportDatabaseToExcelBuffer } from './utils/excelAnalyzer';
import type { AppSection } from './types/church';

function ChurchAppShell() {
  const [activeSection, setActiveSection] = useState<AppSection>('resumen');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openNewMemberTrigger, setOpenNewMemberTrigger] = useState(0);
  const [attendanceEventId, setAttendanceEventId] = useState<string | undefined>(undefined);

  const {
    members,
    families,
    ministries,
    events,
    attendances,
    customSheets,
    feedbackBanner,
    clearFeedback,
  } = useChurchStore();

  const handleExportAllExcel = () => {
    const buf = exportDatabaseToExcelBuffer({
      members,
      families,
      ministries,
      events,
      attendances,
      customSheets,
    });
    downloadExcelBuffer(buf, `ekklesia_registro_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleOpenNewMemberFromAnywhere = () => {
    setActiveSection('miembros');
    setOpenNewMemberTrigger((n) => n + 1);
  };

  const handleOpenAttendanceForEvent = (eventId: string) => {
    setAttendanceEventId(eventId);
    setActiveSection('asistencia');
  };

  const handleSelectSection = (section: AppSection) => {
    clearFeedback();
    setActiveSection(section);
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <Sidebar
        activeSection={activeSection}
        onSelect={handleSelectSection}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          activeSection={activeSection}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onNavigate={handleSelectSection}
          onExportAllExcel={handleExportAllExcel}
          onQuickCreate={activeSection === 'resumen' ? handleOpenNewMemberFromAnywhere : undefined}
          quickCreateLabel={activeSection === 'resumen' ? 'Nuevo Miembro' : undefined}
        />

        {feedbackBanner && (
          <div
            role="status"
            className={`px-4 sm:px-6 lg:px-8 py-2.5 text-xs border-b flex items-center justify-between gap-4 ${
              feedbackBanner.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            <span>{feedbackBanner.message}</span>
            <button
              type="button"
              onClick={clearFeedback}
              aria-label="Descartar notificación"
              className="p-1 hover:opacity-75"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1440px] w-full mx-auto">
          {activeSection === 'resumen' && (
            <OverviewView
              onNavigate={handleSelectSection}
              onOpenNewMember={handleOpenNewMemberFromAnywhere}
              onOpenAttendanceForEvent={handleOpenAttendanceForEvent}
            />
          )}
          {activeSection === 'miembros' && (
            <MembersView externalOpenNewTrigger={openNewMemberTrigger} />
          )}
          {activeSection === 'familias' && <FamiliesView />}
          {activeSection === 'ministerios' && <MinistriesView />}
          {activeSection === 'eventos' && (
            <EventsView onOpenAttendanceForEvent={handleOpenAttendanceForEvent} />
          )}
          {activeSection === 'asistencia' && <AttendanceView initialEventId={attendanceEventId} />}
          {activeSection === 'excel' && <ExcelImportView />}
          {activeSection === 'modelo' && <SchemaExplorerView />}
          {activeSection === 'equipo' && <TeamAccessView />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ChurchStoreProvider>
        <ChurchAppShell />
      </ChurchStoreProvider>
    </ErrorBoundary>
  );
}
