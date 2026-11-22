import React, { useMemo, useState } from 'react';
import { CheckSquare, Pencil, Plus, Trash2 } from 'lucide-react';
import { useChurchStore } from '../context/ChurchStoreContext';
import type { ChurchEvent, EventStatus, EventType } from '../types/church';
import { validateEventInput } from '../utils/validation';
import { Modal } from './Modal';

interface EventsViewProps {
  onOpenAttendanceForEvent: (eventId: string) => void;
}

const EVENT_TYPES: EventType[] = [
  'Culto Dominical',
  'Estudio Bíblico',
  'Oración',
  'Jóvenes',
  'Conferencia',
  'Bautismo',
  'Reunión Administrativa',
  'Especial',
];

const EVENT_STATUS_CLASS: Record<EventStatus, string> = {
  Programado: 'text-blue-800 font-medium',
  'En Curso': 'text-emerald-700 font-medium',
  Finalizado: 'text-slate-600 font-medium',
  Cancelado: 'text-rose-700 font-medium',
};

const EMPTY_EVENT: Omit<ChurchEvent, 'id' | 'ownerUid' | 'createdAt' | 'updatedAt'> = {
  titulo: '',
  tipo: 'Culto Dominical',
  fecha: new Date().toISOString().slice(0, 10),
  horaInicio: '10:00',
  horaFin: '12:00',
  ubicacion: 'Templo Principal',
  responsableNombre: '',
  ministerioId: '',
  estado: 'Programado',
  capacidadEsperada: 180,
  descripcion: '',
};

export function EventsView({ onOpenAttendanceForEvent }: EventsViewProps) {
  const { events, ministries, attendances, saveEvent, deleteEvent } = useChurchStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_EVENT);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const ministryMap = useMemo(() => new Map(ministries.map((m) => [m.id, m.nombre])), [ministries]);
  const sortedEvents = useMemo(() => [...events].sort((a, b) => b.fecha.localeCompare(a.fecha)), [events]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_EVENT);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (evt: ChurchEvent) => {
    setEditingId(evt.id);
    const { id: _id, ownerUid: _o, createdAt: _c, updatedAt: _u, ...rest } = evt;
    setForm(rest);
    setErrors({});
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateEventInput(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    await saveEvent(form, editingId ?? undefined);
    setModalOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Registro de servicios dominicales, estudios bíblicos, ceremonias y actividades con control de asistencia vinculado.
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-md whitespace-nowrap shrink-0 self-start"
        >
          <Plus className="w-3.5 h-3.5" />
          Programar Evento
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
                <th className="py-2.5 px-4 font-medium">Fecha y hora</th>
                <th className="py-2.5 px-4 font-medium">Culto / Actividad</th>
                <th className="py-2.5 px-4 font-medium">Responsable y ministerio</th>
                <th className="py-2.5 px-4 font-medium">Estado</th>
                <th className="py-2.5 px-4 font-medium text-right">Asistencia</th>
                <th className="py-2.5 px-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedEvents.map((evt) => {
                const presentes = attendances.filter((a) => a.eventoId === evt.id && a.presente).length;
                return (
                  <tr key={evt.id} className="hover:bg-slate-50/75">
                    <td className="py-3 px-4 font-mono text-xs text-slate-700 whitespace-nowrap tabular-nums">
                      <div>{evt.fecha}</div>
                      <div className="text-slate-500">
                        {evt.horaInicio}–{evt.horaFin}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{evt.titulo}</div>
                      <div className="text-xs text-slate-500">
                        {evt.tipo} · {evt.ubicacion}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700">
                      <div>{evt.responsableNombre || 'Sin asignar'}</div>
                      <div className="text-slate-500">
                        {ministryMap.get(evt.ministerioId) || 'Congregación general'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs whitespace-nowrap">
                      <span className={EVENT_STATUS_CLASS[evt.estado]}>{evt.estado}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs whitespace-nowrap tabular-nums">
                      <span className="font-semibold text-slate-900">{presentes}</span>
                      <span className="text-slate-400"> / {evt.capacidadEsperada}</span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenAttendanceForEvent(evt.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-900 hover:bg-blue-50 rounded transition-colors"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          Lista
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(evt)}
                          aria-label={`Editar ${evt.titulo}`}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteEvent(evt.id)}
                          aria-label={`Eliminar ${evt.titulo}`}
                          className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        title={editingId ? 'Editar culto o evento' : 'Programar nuevo culto o evento'}
        onClose={() => setModalOpen(false)}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="ev-titulo" className="block text-xs font-medium text-slate-700 mb-1">
                Título del evento *
              </label>
              <input
                id="ev-titulo"
                type="text"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
              {errors.titulo && <p className="mt-1 text-xs text-rose-700">{errors.titulo}</p>}
            </div>

            <div>
              <label htmlFor="ev-tipo" className="block text-xs font-medium text-slate-700 mb-1">
                Tipo
              </label>
              <select
                id="ev-tipo"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as EventType })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label htmlFor="ev-fecha" className="block text-xs font-medium text-slate-700 mb-1">
                Fecha *
              </label>
              <input
                id="ev-fecha"
                type="date"
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
              {errors.fecha && <p className="mt-1 text-xs text-rose-700">{errors.fecha}</p>}
            </div>
            <div>
              <label htmlFor="ev-hi" className="block text-xs font-medium text-slate-700 mb-1">
                Hora inicio
              </label>
              <input
                id="ev-hi"
                type="time"
                value={form.horaInicio}
                onChange={(e) => setForm({ ...form, horaInicio: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label htmlFor="ev-hf" className="block text-xs font-medium text-slate-700 mb-1">
                Hora fin
              </label>
              <input
                id="ev-hf"
                type="time"
                value={form.horaFin}
                onChange={(e) => setForm({ ...form, horaFin: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label htmlFor="ev-cap" className="block text-xs font-medium text-slate-700 mb-1">
                Aforo esperado
              </label>
              <input
                id="ev-cap"
                type="number"
                min={0}
                value={form.capacidadEsperada}
                onChange={(e) => setForm({ ...form, capacidadEsperada: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="ev-ubic" className="block text-xs font-medium text-slate-700 mb-1">
                Ubicación
              </label>
              <input
                id="ev-ubic"
                type="text"
                value={form.ubicacion}
                onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label htmlFor="ev-resp" className="block text-xs font-medium text-slate-700 mb-1">
                Responsable / Predicador
              </label>
              <input
                id="ev-resp"
                type="text"
                value={form.responsableNombre}
                onChange={(e) => setForm({ ...form, responsableNombre: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label htmlFor="ev-min" className="block text-xs font-medium text-slate-700 mb-1">
                Ministerio organizador (FK)
              </label>
              <select
                id="ev-min"
                value={form.ministerioId}
                onChange={(e) => setForm({ ...form, ministerioId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
              >
                <option value="">Congregación general</option>
                {ministries.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="ev-estado" className="block text-xs font-medium text-slate-700 mb-1">
                Estado
              </label>
              <select
                id="ev-estado"
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value as EventStatus })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
              >
                <option value="Programado">Programado</option>
                <option value="En Curso">En Curso</option>
                <option value="Finalizado">Finalizado</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="ev-desc" className="block text-xs font-medium text-slate-700 mb-1">
                Descripción
              </label>
              <input
                id="ev-desc"
                type="text"
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-md"
            >
              {editingId ? 'Guardar cambios' : 'Programar evento'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
