import React, { useMemo, useState } from 'react';
import { Check, Plus, Search, Trash2, UserPlus } from 'lucide-react';
import { useChurchStore } from '../context/ChurchStoreContext';
import type { AttendeeType } from '../types/church';
import { validateAttendanceInput } from '../utils/validation';

interface AttendanceViewProps {
  initialEventId?: string;
}

export function AttendanceView({ initialEventId }: AttendanceViewProps) {
  const { events, members, attendances, toggleMemberAttendance, saveAttendance, deleteAttendance } =
    useChurchStore();

  const sortedEvents = useMemo(() => [...events].sort((a, b) => b.fecha.localeCompare(a.fecha)), [events]);
  const [selectedEventId, setSelectedEventId] = useState<string>(
    initialEventId || sortedEvents[0]?.id || ''
  );
  const [memberSearch, setMemberSearch] = useState('');
  const [visitorName, setVisitorName] = useState('');
  const [visitorType, setVisitorType] = useState<AttendeeType>('Primera Vez');
  const [visitorNotes, setVisitorNotes] = useState('');
  const [visitorError, setVisitorError] = useState('');

  React.useEffect(() => {
    if (initialEventId) {
      setSelectedEventId(initialEventId);
    }
  }, [initialEventId]);

  const activeEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) ?? sortedEvents[0] ?? null,
    [events, selectedEventId, sortedEvents]
  );

  const eventAttendances = useMemo(
    () => (activeEvent ? attendances.filter((a) => a.eventoId === activeEvent.id) : []),
    [activeEvent, attendances]
  );

  const presentMemberIds = useMemo(
    () => new Set(eventAttendances.filter((a) => a.presente && a.miembroId).map((a) => a.miembroId)),
    [eventAttendances]
  );

  const presentCount = eventAttendances.filter((a) => a.presente).length;
  const visitorRecords = eventAttendances.filter((a) => !a.miembroId && a.presente);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        `${m.nombres} ${m.apellidos}`.toLowerCase().includes(q) ||
        m.codigoMiembro.toLowerCase().includes(q)
    );
  }, [members, memberSearch]);

  const handleAddVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvent) return;
    const payload = {
      eventoId: activeEvent.id,
      miembroId: '',
      nombreAsistente: visitorName,
      fecha: activeEvent.fecha,
      tipoAsistente: visitorType,
      presente: true,
      observaciones: visitorNotes,
    };
    const errs = validateAttendanceInput(payload);
    if (Object.keys(errs).length > 0) {
      setVisitorError(errs.nombreAsistente || errs.eventoId || 'Completa los campos requeridos.');
      return;
    }
    setVisitorError('');
    await saveAttendance(payload);
    setVisitorName('');
    setVisitorNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Event Selector Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="flex-1 max-w-xl">
          <label htmlFor="att-event-select" className="block text-xs font-medium text-slate-600 mb-1.5">
            Seleccionar culto o evento para tomar lista
          </label>
          <select
            id="att-event-select"
            value={activeEvent?.id ?? ''}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-800"
          >
            {sortedEvents.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.fecha} — {ev.titulo} ({ev.estado})
              </option>
            ))}
          </select>
        </div>

        {activeEvent && (
          <div className="flex items-center gap-6 text-sm shrink-0">
            <div>
              <p className="text-xs text-slate-500">Presentes</p>
              <p className="text-2xl font-semibold font-mono text-slate-900 tabular-nums" data-testid="attendance-present-count">
                {presentCount}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Visitantes</p>
              <p className="text-2xl font-semibold font-mono text-blue-900 tabular-nums">
                {eventAttendances.filter((a) => a.presente && a.tipoAsistente !== 'Miembro').length}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Aforo esperado</p>
              <p className="text-2xl font-semibold font-mono text-slate-500 tabular-nums">
                {activeEvent.capacidadEsperada}
              </p>
            </div>
          </div>
        )}
      </div>

      {!activeEvent ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-sm text-slate-500">
          Programa primero un culto o evento para comenzar a registrar asistencia.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Quick Member Check-in List */}
          <section className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Lista rápida de miembros</h2>
                <p className="text-xs text-slate-500">Haz clic para marcar o desmarcar presencia</p>
              </div>
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <label htmlFor="att-member-search" className="sr-only">
                  Filtrar lista de miembros
                </label>
                <input
                  id="att-member-search"
                  type="search"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Filtrar miembro..."
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
              {filteredMembers.map((member) => {
                const isPresent = presentMemberIds.has(member.id);
                const fullName = `${member.nombres} ${member.apellidos}`;
                return (
                  <div
                    key={member.id}
                    className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/75"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{fullName}</p>
                      <p className="text-xs text-slate-500">
                        <span className="font-mono tabular-nums">{member.codigoMiembro}</span>
                        <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
                        <span>{member.estadoMembresia}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void toggleMemberAttendance(activeEvent.id, member, activeEvent.fecha)}
                      aria-pressed={isPresent}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        isPresent
                          ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                          : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {isPresent && <Check className="w-3.5 h-3.5" />}
                      {isPresent ? 'Presente' : 'Marcar presente'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Visitor Registration + Recorded Visitors */}
          <section className="lg:col-span-5 space-y-5">
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <UserPlus className="w-4 h-4 text-blue-900" />
                <h2 className="text-sm font-semibold text-slate-900">Registrar visitante / invitado</h2>
              </div>
              <form onSubmit={handleAddVisitor} className="space-y-3" noValidate>
                <div>
                  <label htmlFor="vis-name" className="block text-xs font-medium text-slate-700 mb-1">
                    Nombre completo del visitante *
                  </label>
                  <input
                    id="vis-name"
                    type="text"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    placeholder="Ej. Marcos Villanueva"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                  {visitorError && <p className="mt-1 text-xs text-rose-700">{visitorError}</p>}
                </div>

                <div>
                  <label htmlFor="vis-type" className="block text-xs font-medium text-slate-700 mb-1">
                    Tipo de asistente
                  </label>
                  <select
                    id="vis-type"
                    value={visitorType}
                    onChange={(e) => setVisitorType(e.target.value as AttendeeType)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                  >
                    <option value="Primera Vez">Primera Vez</option>
                    <option value="Visitante">Visitante frecuente</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="vis-notes" className="block text-xs font-medium text-slate-700 mb-1">
                    Teléfono u observaciones de seguimiento
                  </label>
                  <input
                    id="vis-notes"
                    type="text"
                    value={visitorNotes}
                    onChange={(e) => setVisitorNotes(e.target.value)}
                    placeholder="Ej. Invitado por familia Paredes, llamar el lunes"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Registrar visitante
                </button>
              </form>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-900">
                  Visitantes registrados en este evento ({visitorRecords.length})
                </h3>
              </div>
              {visitorRecords.length === 0 ? (
                <p className="p-5 text-xs text-slate-500">
                  Aún no se han registrado visitantes sin ficha en este evento.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {visitorRecords.map((rec) => (
                    <li key={rec.id} className="px-5 py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">{rec.nombreAsistente}</p>
                        <p className="text-xs text-slate-500">
                          <span className="text-amber-700 font-medium">{rec.tipoAsistente}</span>
                          {rec.observaciones ? ` · ${rec.observaciones}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void deleteAttendance(rec.id)}
                        aria-label={`Eliminar asistencia de ${rec.nombreAsistente}`}
                        className="p-1 text-slate-400 hover:text-rose-700 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
