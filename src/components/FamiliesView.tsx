import React, { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useChurchStore } from '../context/ChurchStoreContext';
import type { Family } from '../types/church';
import { validateFamilyInput } from '../utils/validation';
import { Modal } from './Modal';

const EMPTY_FAMILY: Omit<Family, 'id' | 'ownerUid' | 'createdAt' | 'updatedAt'> = {
  apellidoFamilia: '',
  jefeHogarNombre: '',
  direccion: '',
  ciudad: '',
  telefonoHogar: '',
  notas: '',
};

export function FamiliesView() {
  const { families, members, saveFamily, deleteFamily } = useChurchStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FAMILY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FAMILY);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (fam: Family) => {
    setEditingId(fam.id);
    setForm({
      apellidoFamilia: fam.apellidoFamilia,
      jefeHogarNombre: fam.jefeHogarNombre,
      direccion: fam.direccion,
      ciudad: fam.ciudad,
      telefonoHogar: fam.telefonoHogar,
      notas: fam.notas,
    });
    setErrors({});
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateFamilyInput(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    await saveFamily(form, editingId ?? undefined);
    setModalOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Cada hogar agrupa a los miembros vinculados mediante la llave foránea{' '}
          <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">familia_id</code>.
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-md whitespace-nowrap shrink-0 self-start"
        >
          <Plus className="w-3.5 h-3.5" />
          Nueva Familia
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
                <th className="py-2.5 px-4 font-medium">Familia</th>
                <th className="py-2.5 px-4 font-medium">Referente / Jefe de hogar</th>
                <th className="py-2.5 px-4 font-medium">Dirección y zona</th>
                <th className="py-2.5 px-4 font-medium">Teléfono</th>
                <th className="py-2.5 px-4 font-medium">Integrantes vinculados</th>
                <th className="py-2.5 px-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {families.map((fam) => {
                const linkedMembers = members.filter((m) => m.familiaId === fam.id);
                return (
                  <tr key={fam.id} className="hover:bg-slate-50/75">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">Familia {fam.apellidoFamilia}</div>
                      {fam.notas && (
                        <div className="text-xs text-slate-500 truncate max-w-[240px]">{fam.notas}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700">{fam.jefeHogarNombre || '—'}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      <div>{fam.direccion || 'Sin dirección'}</div>
                      {fam.ciudad && <div className="text-slate-500">{fam.ciudad}</div>}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-600 tabular-nums whitespace-nowrap">
                      {fam.telefonoHogar || '—'}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700">
                      <span className="font-mono font-semibold text-slate-900 tabular-nums">
                        {linkedMembers.length}
                      </span>
                      {linkedMembers.length > 0 && (
                        <span className="text-slate-500 ml-1.5">
                          ({linkedMembers.map((m) => m.nombres).join(', ')})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(fam)}
                          aria-label={`Editar Familia ${fam.apellidoFamilia}`}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteFamily(fam.id)}
                          aria-label={`Eliminar Familia ${fam.apellidoFamilia}`}
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
        title={editingId ? 'Editar núcleo familiar' : 'Registrar nueva familia'}
        onClose={() => setModalOpen(false)}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="fam-apellido" className="block text-xs font-medium text-slate-700 mb-1">
              Apellido de la familia *
            </label>
            <input
              id="fam-apellido"
              type="text"
              value={form.apellidoFamilia}
              onChange={(e) => setForm({ ...form, apellidoFamilia: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
            {errors.apellidoFamilia && <p className="mt-1 text-xs text-rose-700">{errors.apellidoFamilia}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fam-jefe" className="block text-xs font-medium text-slate-700 mb-1">
                Referente / Jefe de hogar
              </label>
              <input
                id="fam-jefe"
                type="text"
                value={form.jefeHogarNombre}
                onChange={(e) => setForm({ ...form, jefeHogarNombre: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label htmlFor="fam-tel" className="block text-xs font-medium text-slate-700 mb-1">
                Teléfono del hogar
              </label>
              <input
                id="fam-tel"
                type="tel"
                value={form.telefonoHogar}
                onChange={(e) => setForm({ ...form, telefonoHogar: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fam-dir" className="block text-xs font-medium text-slate-700 mb-1">
                Dirección
              </label>
              <input
                id="fam-dir"
                type="text"
                value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label htmlFor="fam-ciudad" className="block text-xs font-medium text-slate-700 mb-1">
                Ciudad / Zona pastoral
              </label>
              <input
                id="fam-ciudad"
                type="text"
                value={form.ciudad}
                onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label htmlFor="fam-notas" className="block text-xs font-medium text-slate-700 mb-1">
              Notas pastorales
            </label>
            <textarea
              id="fam-notas"
              rows={2}
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
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
              {editingId ? 'Guardar cambios' : 'Registrar familia'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
