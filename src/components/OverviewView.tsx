import React, { useMemo } from 'react';
import { ArrowRight, Calendar, Database, FileSpreadsheet, UserPlus } from 'lucide-react';
import { useChurchStore } from '../context/ChurchStoreContext';
import { computeChurchMetrics } from '../utils/relationalSchema';
import type { AppSection } from '../types/church';

interface OverviewViewProps {
  onNavigate: (section: AppSection) => void;
  onOpenNewMember: () => void;
  onOpenAttendanceForEvent: (eventId: string) => void;
}

export function OverviewView({
  onNavigate,
  onOpenNewMember,
  onOpenAttendanceForEvent,
}: OverviewViewProps) {
  const { members, families, ministries, events, attendances, isCloudMode, seedCloudWorkspace } =
    useChurchStore();

  const metrics = useMemo(
    () =>
      computeChurchMetrics({
        members,
        families,
        ministries,
        events,
        attendances,
      }),
    [members, families, ministries, events, attendances]
  );

  const ministryMap = useMemo(() => new Map(ministries.map((m) => [m.id, m.nombre])), [ministries]);

  const upcomingEvents = useMemo(
    () =>
      events
        .filter((e) => e.estado === 'Programado' || e.estado === 'En Curso')
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .slice(0, 4),
    [events]
  );

  const recentAttendanceEvents = useMemo(() => {
    const withAttendance = metrics.attendanceByEvent.filter((e) => e.presentes > 0);
    return (withAttendance.length > 0 ? withAttendance : metrics.attendanceByEvent).slice(0, 3);
  }, [metrics.attendanceByEvent]);

  const recentMembers = useMemo(
    () => [...members].sort((a, b) => (b.fechaIngreso || '').localeCompare(a.fechaIngreso || '')).slice(0, 5),
    [members]
  );

  const maxMinistryCount = metrics.membersByMinistry[0]?.count || 1;

  return (
    <div className="space-y-8">
      {isCloudMode && members.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-slate-900">
              Tu base de datos en la nube está lista y vacía
            </h2>
            <p className="text-sm text-slate-600">
              Puedes subir el archivo Excel de la secretaría o cargar un conjunto inicial de ejemplo para probar todas las tablas relacionadas.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('excel')}
              className="px-3.5 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap"
            >
              Importar Excel
            </button>
            <button
              type="button"
              onClick={() => void seedCloudWorkspace()}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap"
            >
              Cargar datos de ejemplo
            </button>
          </div>
        </div>
      )}

      {/* Primary KPI Strip */}
      <section aria-label="Indicadores principales" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Membresía registrada</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900 font-mono tabular-nums">
            {metrics.totalMembers}
          </p>
          <p className="mt-2 text-xs text-slate-600">
            <span className="text-emerald-700 font-medium tabular-nums">{metrics.activeMembers} activos</span>
            <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
            <span className="tabular-nums">{metrics.discipledMembers} discipulados</span>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Familias y hogares</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900 font-mono tabular-nums">
            {metrics.totalFamilies}
          </p>
          <p className="mt-2 text-xs text-slate-600">
            <span className="tabular-nums">{metrics.baptizedMembers} bautizados ({metrics.baptizedRatePercent}%)</span>
            <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
            <span className="tabular-nums">{metrics.transferredMembers} transferidos</span>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Ministerios activos</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900 font-mono tabular-nums">
            {metrics.activeMinistries}
          </p>
          <p className="mt-2 text-xs text-slate-600">
            <span className="tabular-nums">{metrics.membersInMinistries} servidores vinculados</span>
            <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
            <span className="tabular-nums">{ministries.length} registrados</span>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Asistencia promedio por culto</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900 font-mono tabular-nums">
            {metrics.averageAttendance}
          </p>
          <p className="mt-2 text-xs text-slate-600">
            <span className="tabular-nums">{attendances.filter((a) => a.presente).length} asistencias totales</span>
            <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
            <span className="tabular-nums">{metrics.upcomingEventsCount} próximos</span>
          </p>
        </div>
      </section>

      {/* Quick Workflows Strip */}
      <section aria-label="Acciones rápidas" className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('excel')}
          className="text-left bg-white border border-blue-200 hover:border-blue-400 rounded-lg p-5 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <FileSpreadsheet className="w-5 h-5 text-blue-900" />
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-900 transition-colors" />
          </div>
          <h2 className="mt-3 text-sm font-semibold text-slate-900">Subir y analizar Excel de secretaría</h2>
          <p className="mt-1 text-xs text-slate-600 leading-relaxed">
            Carga tu archivo .xlsx o .xls aquí mismo para analizar cada hoja, detectar columnas e importar registros.
          </p>
        </button>

        <button
          type="button"
          onClick={onOpenNewMember}
          className="text-left bg-white border border-slate-200 hover:border-blue-300 rounded-lg p-5 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <UserPlus className="w-5 h-5 text-blue-800" />
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-800 transition-colors" />
          </div>
          <h2 className="mt-3 text-sm font-semibold text-slate-900">Registrar nuevo miembro</h2>
          <p className="mt-1 text-xs text-slate-600 leading-relaxed">
            Crea una ficha personal vinculada a su núcleo familiar, estado de bautismo y ministerio.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('modelo')}
          className="text-left bg-white border border-slate-200 hover:border-blue-300 rounded-lg p-5 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <Database className="w-5 h-5 text-blue-800" />
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-800 transition-colors" />
          </div>
          <h2 className="mt-3 text-sm font-semibold text-slate-900">Explorar modelo relacional</h2>
          <p className="mt-1 text-xs text-slate-600 leading-relaxed">
            Revisa las 7 tablas normalizadas, llaves foráneas, índices recomendados y script SQL DDL.
          </p>
        </button>
      </section>

      {/* Main Split: Ministries Participation + Upcoming Services */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Participación por ministerio</h2>
              <p className="text-xs text-slate-500 mt-0.5">Miembros asignados a cada área de servicio</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('ministerios')}
              className="text-xs font-medium text-blue-800 hover:text-blue-900 whitespace-nowrap"
            >
              Ver ministerios
            </button>
          </div>

          <div className="p-5 space-y-4">
            {metrics.membersByMinistry.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">
                Aún no hay ministerios registrados.
              </p>
            ) : (
              metrics.membersByMinistry.slice(0, 6).map((item) => {
                const pct = item.count > 0 ? Math.max(8, Math.round((item.count / maxMinistryCount) * 100)) : 0;
                return (
                  <div key={item.ministerioId} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-4 text-sm">
                      <span className="font-medium text-slate-800 truncate">{item.nombre}</span>
                      <span className="text-xs text-slate-500 tabular-nums shrink-0">
                        <span>{item.categoria}</span>
                        <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
                        <span className="font-mono font-semibold text-slate-900">
                          {item.count} {item.count === 1 ? 'miembro' : 'miembros'}
                        </span>
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-sm overflow-hidden">
                      <div
                        className="h-full bg-blue-900 rounded-sm"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {recentMembers.length > 0 && (
            <div className="border-t border-slate-200">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-medium text-slate-600">
                <span>Últimos ingresos y seguimiento pastoral</span>
                <button
                  type="button"
                  onClick={() => onNavigate('miembros')}
                  className="text-blue-800 hover:text-blue-900 font-medium"
                >
                  Ver directorio
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500">
                      <th className="py-2.5 px-5 font-medium">Código</th>
                      <th className="py-2.5 px-3 font-medium">Miembro</th>
                      <th className="py-2.5 px-3 font-medium">Ministerio</th>
                      <th className="py-2.5 px-5 font-medium text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentMembers.map((mem) => (
                      <tr key={mem.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-5 font-mono text-xs text-slate-600 whitespace-nowrap tabular-nums">
                          {mem.codigoMiembro}
                        </td>
                        <td className="py-2.5 px-3 text-slate-900 truncate max-w-[200px]">
                          {mem.nombres} {mem.apellidos}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-slate-600 truncate max-w-[180px]">
                          {ministryMap.get(mem.ministerioId) || 'Sin asignar'}
                        </td>
                        <td className="py-2.5 px-5 text-right text-xs font-medium text-slate-700 whitespace-nowrap">
                          {mem.estadoMembresia}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Próximos cultos y actividades</h2>
              <p className="text-xs text-slate-500 mt-0.5">Agenda ministerial sincronizada</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('eventos')}
              className="text-xs font-medium text-blue-800 hover:text-blue-900 whitespace-nowrap"
            >
              Ver agenda
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {upcomingEvents.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                No hay eventos programados próximamente.
              </div>
            ) : (
              upcomingEvents.map((evt) => (
                <div key={evt.id} className="px-5 py-3.5 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{evt.titulo}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      <span className="font-mono tabular-nums">{evt.fecha}</span>
                      <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{evt.horaInicio}</span>
                      <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
                      <span>{evt.ubicacion}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenAttendanceForEvent(evt.id)}
                    className="text-xs font-medium text-blue-800 hover:text-blue-900 whitespace-nowrap shrink-0"
                  >
                    Asistencia
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-slate-200 px-5 py-4 bg-slate-50/70">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
              <span className="font-medium text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Asistencia reciente por evento
              </span>
              <button
                type="button"
                onClick={() => onNavigate('asistencia')}
                className="text-blue-800 hover:text-blue-900 font-medium"
              >
                Abrir control
              </button>
            </div>
            <div className="space-y-2">
              {recentAttendanceEvents.map((row) => (
                <div key={row.eventoId} className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 truncate pr-3">{row.titulo}</span>
                  <span className="font-mono tabular-nums text-slate-900 whitespace-nowrap">
                    {row.presentes} presentes
                    {row.visitantes > 0 ? ` (${row.visitantes} vis.)` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
