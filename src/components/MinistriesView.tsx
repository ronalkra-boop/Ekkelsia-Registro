import React, { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useChurchStore } from '../context/ChurchStoreContext';
import type { Ministry, MinistryCategory } from '../types/church';
import { validateMinistryInput } from '../utils/validation';
import { Modal } from './Modal';

const CATEGORIES: MinistryCategory[] = [
  'Alabanza',
  'Enseñanza',
  'Jóvenes',
  'Niños',
  'Diaconado',
  'Damas',
  'Caballeros',
  'Intercesión',
  'Acción Social',
  'Misiones',
  'Administración',
  'Células',
];

const EMPTY_MINISTRY: Omit<Ministry, 'id' | 'ownerUid' | 'createdAt' | 'updatedAt'> = {
  nombre: '',
  categoria: 'Enseñanza',
  descripcion: '',
  liderNombre: '',
  diaReunion: '',
  horario: '',
  ubicacion: '',
  activo: true,
};

export function MinistriesView() {
  const { ministries, members, saveMinistry, deleteMinistry } = useChurchStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_MINISTRY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_MINISTRY);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (m: Ministry) => {
    setEditingId(m.id);
    setForm({
      nombre: m.nombre,
      categoria: m.categoria,
      descripcion: m.descripcion,
      liderNombre: m.liderNombre,
      diaReunion: m.diaReunion,
      horario: m.horario,
      ubicacion: m.ubicacion,
      activo: m.activo,
    });
    setErrors({});
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateMinistryInput(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    await saveMinistry(form, editingId ?? undefined);
    setModalOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Departamentos, grupos de servicio y células vinculados con miembros y eventos.
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-md whitespace-nowrap shrink-0 self-start"
        >
          <Plus className="w-3.5 h-3.5" />
          Nuevo Ministerio
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {ministries.map((min) => {
          const memberCount = members.filter((m) => m.ministerioId === min.id).length;
          return (
            <article key={min.id} className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">
                      <span>{min.categoria}</span>
                      <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
                      <span className={min.activo ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                        {min.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </p>
                    <h2 className="text-base font-semibold text-slate-900 mt-1">{min.nombre}</h2>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(min)}
                      aria-label={`Editar ${min.nombre}`}
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteMinistry(min.id)}
                      aria-label={`Eliminar ${min.nombre}`}
                      className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {min.descripcion && (
                  <p className="text-xs text-slate-600 leading-relaxed">{min.descripcion}</p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Líder responsable</span>
                  <span className="font-medium text-slate-900">{min.liderNombre || 'Por asignar'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Reunión</span>
                  <span className="tabular-nums">
                    {min.diaReunion || 'Variable'} {min.horario ? `· ${min.horario}` : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ubicación</span>
                  <span>{min.ubicacion || 'Templo'}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-500">Servidores vinculados</span>
                  <span className="font-mono font-semibold text-blue-900 tabular-nums">{memberCount}</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <Modal
        open={modalOpen}
        title={editingId ? 'Editar ministerio' : 'Nuevo ministerio o grupo'}
        onClose={() => setModalOpen(false)}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="min-nombre" className="block text-xs font-medium text-slate-700 mb-1">
              Nombre del ministerio *
            </label>
            <input
              id="min-nombre"
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
            {errors.nombre && <p className="mt-1 text-xs text-rose-700">{errors.nombre}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="min-cat" className="block text-xs font-medium text-slate-700 mb-1">
                Categoría
              </label>
              <select
                id="min-cat"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value as MinistryCategory })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="min-lider" className="block text-xs font-medium text-slate-700 mb-1">
                Líder / Coordinador
              </label>
              <input
                id="min-lider"
                type="text"
                value={form.liderNombre}
                onChange={(e) => setForm({ ...form, liderNombre: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="min-dia" className="block text-xs font-medium text-slate-700 mb-1">
                Día de reunión
              </label>
              <input
                id="min-dia"
                type="text"
                value={form.diaReunion}
                onChange={(e) => setForm({ ...form, diaReunion: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label htmlFor="min-hora" className="block text-xs font-medium text-slate-700 mb-1">
                Horario
              </label>
              <input
                id="min-hora"
                type="text"
                value={form.horario}
                onChange={(e) => setForm({ ...form, horario: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label htmlFor="min-ubic" className="block text-xs font-medium text-slate-700 mb-1">
                Ubicación
              </label>
              <input
                id="min-ubic"
                type="text"
                value={form.ubicacion}
                onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label htmlFor="min-desc" className="block text-xs font-medium text-slate-700 mb-1">
              Descripción
            </label>
            <textarea
              id="min-desc"
              rows={2}
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => setForm({ ...form, activo: e.target.checked })}
              className="rounded border-slate-300"
            />
            Ministerio activo
          </label>

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
              {editingId ? 'Guardar cambios' : 'Crear ministerio'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
