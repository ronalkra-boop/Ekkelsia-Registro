import React, { useMemo, useState } from 'react';
import { Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useChurchStore } from '../context/ChurchStoreContext';
import type {
  DiscipuladoEstado,
  DocumentType,
  Gender,
  MaritalStatus,
  Member,
  MembershipStatus,
  ProcedenciaType,
} from '../types/church';
import { calculateAgeFromDate, validateMemberInput } from '../utils/validation';
import { Modal } from './Modal';

interface MembersViewProps {
  externalOpenNewTrigger?: number;
}

const STATUS_FILTERS: ('Todos' | MembershipStatus)[] = [
  'Todos',
  'Activo',
  'En Discipulado',
  'Visitante',
  'Inactivo',
];

const STATUS_TEXT_CLASS: Record<MembershipStatus, string> = {
  Activo: 'text-emerald-700 font-medium',
  'En Discipulado': 'text-blue-800 font-medium',
  'Nuevo Creyente': 'text-amber-700 font-medium',
  Visitante: 'text-amber-700 font-medium',
  Trasladado: 'text-slate-500 font-medium',
  Inactivo: 'text-rose-700 font-medium',
};

function createEmptyMemberForm(nextSeq: number): Omit<Member, 'id' | 'ownerUid' | 'createdAt' | 'updatedAt'> {
  return {
    codigoMiembro: `IBM-${String(nextSeq).padStart(3, '0')}`,
    nombres: '',
    apellidos: '',
    tipoDocumento: 'CC',
    documentoIdentidad: '',
    fechaNacimiento: '',
    genero: 'No especificado',
    estadoCivil: 'Soltero/a',
    telefono: '',
    email: '',
    direccion: '',
    barrio: '',
    profesionOcupacion: '',
    procedenciaTipo: 'Local',
    iglesiaProcedencia: 'IBM Casa de Dios',
    lugarProcedencia: 'Valledupar',
    discipuladoEstado: 'NO',
    cargo: 'Ninguno',
    familiaId: '',
    rolFamiliar: '',
    estadoMembresia: 'Activo',
    bautizado: false,
    fechaBautismo: '',
    fechaIngreso: new Date().toISOString().slice(0, 10),
    ministerioId: '',
    notasPastorales: '',
  };
}

export function MembersView({ externalOpenNewTrigger }: MembersViewProps) {
  const {
    members,
    families,
    ministries,
    attendances,
    events,
    saveMember,
    deleteMember,
  } = useChurchStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | MembershipStatus>('Todos');
  const [barrioFilter, setBarrioFilter] = useState<string>('Todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [form, setForm] = useState(() => createEmptyMemberForm(members.length + 1));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [detailMember, setDetailMember] = useState<Member | null>(null);

  React.useEffect(() => {
    if (externalOpenNewTrigger && externalOpenNewTrigger > 0) {
      setEditingMemberId(null);
      setForm(createEmptyMemberForm(members.length + 1));
      setErrors({});
      setModalOpen(true);
    }
  }, [externalOpenNewTrigger, members.length]);

  const familyMap = useMemo(() => new Map(families.map((f) => [f.id, f])), [families]);
  const ministryMap = useMemo(() => new Map(ministries.map((m) => [m.id, m])), [ministries]);
  const eventMap = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);

  const barrios = useMemo(() => {
    const unique = new Set<string>();
    for (const m of members) {
      if (m.barrio?.trim()) unique.add(m.barrio.trim());
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'es'));
  }, [members]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (statusFilter !== 'Todos' && m.estadoMembresia !== statusFilter) return false;
      if (barrioFilter !== 'Todos' && (m.barrio || '').trim() !== barrioFilter) return false;
      if (!q) return true;
      const fam = familyMap.get(m.familiaId)?.apellidoFamilia ?? '';
      const min = ministryMap.get(m.ministerioId)?.nombre ?? '';
      return (
        `${m.nombres} ${m.apellidos}`.toLowerCase().includes(q) ||
        m.codigoMiembro.toLowerCase().includes(q) ||
        m.documentoIdentidad.toLowerCase().includes(q) ||
        m.telefono.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.barrio || '').toLowerCase().includes(q) ||
        (m.cargo || '').toLowerCase().includes(q) ||
        (m.profesionOcupacion || '').toLowerCase().includes(q) ||
        (m.iglesiaProcedencia || '').toLowerCase().includes(q) ||
        (m.lugarProcedencia || '').toLowerCase().includes(q) ||
        fam.toLowerCase().includes(q) ||
        min.toLowerCase().includes(q)
      );
    });
  }, [members, search, statusFilter, barrioFilter, familyMap, ministryMap]);

  const openCreate = () => {
    setEditingMemberId(null);
    setForm(createEmptyMemberForm(members.length + 1));
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (member: Member) => {
    setEditingMemberId(member.id);
    const { id: _id, ownerUid: _o, createdAt: _c, updatedAt: _u, ...rest } = member;
    setForm(rest);
    setErrors({});
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateMemberInput(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setSaving(true);
    try {
      await saveMember(form, editingMemberId ?? undefined);
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const memberDetailAttendance = useMemo(
    () => (detailMember ? attendances.filter((a) => a.miembroId === detailMember.id) : []),
    [detailMember, attendances]
  );

  const detailAge = detailMember ? calculateAgeFromDate(detailMember.fechaNacimiento) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <label htmlFor="member-search" className="sr-only">
              Buscar miembro por nombre, cédula, barrio, cargo o profesión
            </label>
            <input
              id="member-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nombre, documento, barrio, cargo, profesión..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800"
            />
          </div>

          <div className="shrink-0">
            <label htmlFor="barrio-filter" className="sr-only">
              Filtrar por barrio
            </label>
            <select
              id="barrio-filter"
              value={barrioFilter}
              onChange={(e) => setBarrioFilter(e.target.value)}
              className="w-full sm:w-48 px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-md text-slate-700"
            >
              <option value="Todos">Todos los barrios ({barrios.length})</option>
              {barrios.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            className="flex items-center gap-1 p-1 bg-slate-100 rounded-md overflow-x-auto max-w-full"
            role="group"
            aria-label="Filtrar por estado de membresía"
          >
            {STATUS_FILTERS.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo Miembro
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span className="tabular-nums">
            Mostrando <strong className="text-slate-900">{filteredMembers.length}</strong> de {members.length} registros
          </span>
          <span className="hidden sm:inline">Base IBM Casa de Dios · Edad calculada automáticamente desde F. de Nac.</span>
        </div>

        {filteredMembers.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm text-slate-600">No se encontraron miembros con los criterios actuales.</p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('Todos');
                setBarrioFilter('Todos');
              }}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
                  <th className="py-2.5 px-3 font-medium whitespace-nowrap">Código</th>
                  <th className="py-2.5 px-3 font-medium min-w-[220px]">Nombre y documento</th>
                  <th className="py-2.5 px-3 font-medium whitespace-nowrap">Celular y barrio</th>
                  <th className="py-2.5 px-3 font-medium">Cargo / Ministerio</th>
                  <th className="py-2.5 px-3 font-medium whitespace-nowrap">Discipulado / Origen</th>
                  <th className="py-2.5 px-3 font-medium whitespace-nowrap">Estado</th>
                  <th className="py-2.5 px-3 font-medium text-right whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMembers.map((member) => {
                  const min = ministryMap.get(member.ministerioId);
                  const fullName = `${member.nombres} ${member.apellidos}`.trim();
                  const age = calculateAgeFromDate(member.fechaNacimiento);
                  const hasCargo = member.cargo && member.cargo.toLowerCase() !== 'ninguno';
                  return (
                    <tr key={member.id} className="hover:bg-slate-50/75">
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-600 whitespace-nowrap tabular-nums">
                        {member.codigoMiembro}
                      </td>
                      <td className="py-2.5 px-3 min-w-[220px]">
                        <div className="font-medium text-slate-900 leading-snug">{fullName}</div>
                        <div className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                          {member.documentoIdentidad
                            ? `${member.tipoDocumento} ${member.documentoIdentidad}`
                            : `${member.tipoDocumento} s/n`}
                          {age !== null ? ` · ${age} años` : ''}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-600">
                        <div className="tabular-nums font-mono whitespace-nowrap">{member.telefono || 'Sin celular'}</div>
                        <div className="text-slate-500 truncate max-w-[140px]">
                          {member.barrio || 'Pendiente'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-700">
                        <div className="font-medium text-slate-800 truncate max-w-[160px]" title={hasCargo ? member.cargo : undefined}>
                          {hasCargo ? member.cargo : <span className="text-slate-400 font-normal">Sin cargo</span>}
                        </div>
                        {min && <div className="text-slate-500 truncate max-w-[160px]">{min.nombre}</div>}
                      </td>
                      <td className="py-2.5 px-3 text-xs whitespace-nowrap">
                        <span
                          className={
                            member.discipuladoEstado === 'SI'
                              ? 'text-emerald-700 font-medium'
                              : member.discipuladoEstado === 'En Proceso'
                                ? 'text-blue-800 font-medium'
                                : 'text-slate-500'
                          }
                        >
                          {member.discipuladoEstado === 'SI'
                            ? 'Discipulado'
                            : member.discipuladoEstado === 'En Proceso'
                              ? 'En Proceso'
                              : 'Sin discipulado'}
                        </span>
                        <div className="text-slate-500 truncate max-w-[145px]">
                          {member.procedenciaTipo}
                          {member.lugarProcedencia ? ` · ${member.lugarProcedencia}` : ''}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-xs whitespace-nowrap">
                        <div className={STATUS_TEXT_CLASS[member.estadoMembresia]}>
                          {member.estadoMembresia}
                        </div>
                        <div className="text-slate-500">
                          {member.bautizado ? 'Bautizado' : 'No bautizado'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => setDetailMember(member)}
                            aria-label={`Ver ficha de ${fullName}`}
                            className="p-1.5 text-slate-500 hover:text-blue-900 hover:bg-slate-100 rounded transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(member)}
                            aria-label={`Editar ${fullName}`}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteMember(member.id)}
                            aria-label={`Eliminar ${fullName}`}
                            className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
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
        )}
      </div>

      <Modal
        open={modalOpen}
        title={editingMemberId ? 'Editar ficha de miembro' : 'Registrar nuevo miembro'}
        subtitle="Campos sincronizados con la planilla general de IBM Casa de Dios."
        onClose={() => setModalOpen(false)}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="m-codigo" className="block text-xs font-medium text-slate-700 mb-1">
                Código *
              </label>
              <input
                id="m-codigo"
                type="text"
                value={form.codigoMiembro}
                onChange={(e) => setForm({ ...form, codigoMiembro: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:border-blue-800"
              />
              {errors.codigoMiembro && <p className="mt-1 text-xs text-rose-700">{errors.codigoMiembro}</p>}
            </div>

            <div>
              <label htmlFor="m-nombres" className="block text-xs font-medium text-slate-700 mb-1">
                Nombres *
              </label>
              <input
                id="m-nombres"
                type="text"
                value={form.nombres}
                onChange={(e) => setForm({ ...form, nombres: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-blue-800"
              />
              {errors.nombres && <p className="mt-1 text-xs text-rose-700">{errors.nombres}</p>}
            </div>

            <div>
              <label htmlFor="m-apellidos" className="block text-xs font-medium text-slate-700 mb-1">
                Apellidos *
              </label>
              <input
                id="m-apellidos"
                type="text"
                value={form.apellidos}
                onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-blue-800"
              />
              {errors.apellidos && <p className="mt-1 text-xs text-rose-700">{errors.apellidos}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <div>
              <label htmlFor="m-tipodoc" className="block text-xs font-medium text-slate-700 mb-1">
                Tipo ID
              </label>
              <select
                id="m-tipodoc"
                value={form.tipoDocumento}
                onChange={(e) => setForm({ ...form, tipoDocumento: e.target.value as DocumentType })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
              >
                <option value="CC">CC</option>
                <option value="TI">TI</option>
                <option value="D.EXT">D.EXT</option>
                <option value="RC">RC</option>
                <option value="PAS">PAS</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <div>
              <label htmlFor="m-doc" className="block text-xs font-medium text-slate-700 mb-1">
                Identificación
              </label>
              <input
                id="m-doc"
                type="text"
                value={form.documentoIdentidad}
                onChange={(e) => setForm({ ...form, documentoIdentidad: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="m-nac" className="block text-xs font-medium text-slate-700 mb-1">
                Fecha nacimiento
              </label>
              <input
                id="m-nac"
                type="date"
                value={form.fechaNacimiento}
                onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="m-gen" className="block text-xs font-medium text-slate-700 mb-1">
                Género
              </label>
              <select
                id="m-gen"
                value={form.genero}
                onChange={(e) => setForm({ ...form, genero: e.target.value as Gender })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
              >
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
                <option value="Otro">Otro</option>
                <option value="No especificado">No especificado</option>
              </select>
            </div>

            <div>
              <label htmlFor="m-civil" className="block text-xs font-medium text-slate-700 mb-1">
                Estado civil
              </label>
              <select
                id="m-civil"
                value={form.estadoCivil}
                onChange={(e) => setForm({ ...form, estadoCivil: e.target.value as MaritalStatus })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
              >
                <option value="Soltero/a">Soltero/a</option>
                <option value="Casado/a">Casado/a</option>
                <option value="Unión Libre">Unión Libre</option>
                <option value="Separado/a">Separado/a</option>
                <option value="Divorciado/a">Divorciado/a</option>
                <option value="Viudo/a">Viudo/a</option>
                <option value="No especificado">No especificado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label htmlFor="m-tel" className="block text-xs font-medium text-slate-700 mb-1">
                N° Celular / WhatsApp
              </label>
              <input
                id="m-tel"
                type="tel"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="m-dir" className="block text-xs font-medium text-slate-700 mb-1">
                Dirección
              </label>
              <input
                id="m-dir"
                type="text"
                value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="m-barrio" className="block text-xs font-medium text-slate-700 mb-1">
                Barrio
              </label>
              <input
                id="m-barrio"
                type="text"
                value={form.barrio}
                onChange={(e) => setForm({ ...form, barrio: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="m-prof" className="block text-xs font-medium text-slate-700 mb-1">
                Profesión u ocupación
              </label>
              <input
                id="m-prof"
                type="text"
                value={form.profesionOcupacion}
                onChange={(e) => setForm({ ...form, profesionOcupacion: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-200">
            <div>
              <label htmlFor="m-proc" className="block text-xs font-medium text-slate-700 mb-1">
                Procedencia (Local/Trans)
              </label>
              <select
                id="m-proc"
                value={form.procedenciaTipo}
                onChange={(e) => setForm({ ...form, procedenciaTipo: e.target.value as ProcedenciaType })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
              >
                <option value="Local">Local</option>
                <option value="Transferido">Transferido</option>
                <option value="No especificado">No especificado</option>
              </select>
            </div>

            <div>
              <label htmlFor="m-iglesia-proc" className="block text-xs font-medium text-slate-700 mb-1">
                Iglesia de procedencia
              </label>
              <input
                id="m-iglesia-proc"
                type="text"
                value={form.iglesiaProcedencia}
                onChange={(e) => setForm({ ...form, iglesiaProcedencia: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="m-lugar-proc" className="block text-xs font-medium text-slate-700 mb-1">
                Lugar de procedencia
              </label>
              <input
                id="m-lugar-proc"
                type="text"
                value={form.lugarProcedencia}
                onChange={(e) => setForm({ ...form, lugarProcedencia: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="m-email" className="block text-xs font-medium text-slate-700 mb-1">
                Correo electrónico
              </label>
              <input
                id="m-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
              {errors.email && <p className="mt-1 text-xs text-rose-700">{errors.email}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-200">
            <div>
              <label htmlFor="m-discip" className="block text-xs font-medium text-slate-700 mb-1">
                Discipulado
              </label>
              <select
                id="m-discip"
                value={form.discipuladoEstado}
                onChange={(e) => setForm({ ...form, discipuladoEstado: e.target.value as DiscipuladoEstado })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
              >
                <option value="SI">SI</option>
                <option value="En Proceso">En Proceso</option>
                <option value="NO">NO</option>
              </select>
            </div>

            <div>
              <label htmlFor="m-cargo" className="block text-xs font-medium text-slate-700 mb-1">
                Cargo en la iglesia
              </label>
              <input
                id="m-cargo"
                type="text"
                placeholder="Ej. Diacono, Lider de Damas"
                value={form.cargo}
                onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="m-fam" className="block text-xs font-medium text-slate-700 mb-1">
                Familia vinculada (FK)
              </label>
              <select
                id="m-fam"
                value={form.familiaId}
                onChange={(e) => setForm({ ...form, familiaId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
              >
                <option value="">Sin familia asignada</option>
                {families.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.apellidoFamilia}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="m-min" className="block text-xs font-medium text-slate-700 mb-1">
                Ministerio principal (FK)
              </label>
              <select
                id="m-min"
                value={form.ministerioId}
                onChange={(e) => setForm({ ...form, ministerioId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
              >
                <option value="">Sin ministerio</option>
                {ministries.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label htmlFor="m-estado" className="block text-xs font-medium text-slate-700 mb-1">
                Miembro activo / Estado
              </label>
              <select
                id="m-estado"
                value={form.estadoMembresia}
                onChange={(e) => setForm({ ...form, estadoMembresia: e.target.value as MembershipStatus })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
              >
                <option value="Activo">Activo</option>
                <option value="En Discipulado">En Discipulado</option>
                <option value="Nuevo Creyente">Nuevo Creyente</option>
                <option value="Visitante">Visitante</option>
                <option value="Trasladado">Trasladado</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>

            <div>
              <label htmlFor="m-rolfam" className="block text-xs font-medium text-slate-700 mb-1">
                Rol en la familia
              </label>
              <input
                id="m-rolfam"
                type="text"
                placeholder="Ej. Esposo, Esposa, Hijo/a"
                value={form.rolFamiliar}
                onChange={(e) => setForm({ ...form, rolFamiliar: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>

            <div className="flex items-end pb-2">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.bautizado}
                  onChange={(e) => setForm({ ...form, bautizado: e.target.checked })}
                  className="rounded border-slate-300 text-blue-900 focus:ring-blue-800"
                />
                Bautizado en agua
              </label>
            </div>

            <div>
              <label htmlFor="m-fbaut" className="block text-xs font-medium text-slate-700 mb-1">
                Fecha de bautismo
              </label>
              <input
                id="m-fbaut"
                type="date"
                disabled={!form.bautizado}
                value={form.fechaBautismo}
                onChange={(e) => setForm({ ...form, fechaBautismo: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md disabled:bg-slate-100"
              />
              {errors.fechaBautismo && <p className="mt-1 text-xs text-rose-700">{errors.fechaBautismo}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="m-notas" className="block text-xs font-medium text-slate-700 mb-1">
              Notas pastorales y observaciones de secretaría
            </label>
            <textarea
              id="m-notas"
              rows={2}
              value={form.notasPastorales}
              onChange={(e) => setForm({ ...form, notasPastorales: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-md disabled:opacity-60"
            >
              {saving ? 'Guardando...' : editingMemberId ? 'Guardar cambios' : 'Guardar miembro'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(detailMember)}
        title={detailMember ? `${detailMember.nombres} ${detailMember.apellidos}` : ''}
        subtitle={
          detailMember
            ? `Código ${detailMember.codigoMiembro} · ${detailMember.estadoMembresia} · ${detailMember.bautizado ? 'Bautizado' : 'No bautizado'}`
            : ''
        }
        onClose={() => setDetailMember(null)}
        size="lg"
      >
        {detailMember && (
          <div className="space-y-6 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-200">
              <div>
                <p className="text-xs text-slate-500">Identificación y edad</p>
                <p className="text-slate-900 mt-0.5 font-mono text-xs tabular-nums">
                  {detailMember.tipoDocumento} {detailMember.documentoIdentidad || 'Sin número'} ·{' '}
                  {detailMember.fechaNacimiento || 'Sin F. de Nac.'}
                  {detailAge !== null ? ` (${detailAge} años)` : ''}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Celular y estado civil</p>
                <p className="text-slate-900 mt-0.5 text-xs">
                  {detailMember.telefono || 'Sin celular'} · {detailMember.estadoCivil}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Dirección y barrio</p>
                <p className="text-slate-900 mt-0.5 text-xs">
                  {detailMember.direccion || 'Sin dirección'}
                  {detailMember.barrio ? ` · Barrio ${detailMember.barrio}` : ''}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Profesión u ocupación</p>
                <p className="text-slate-900 mt-0.5 text-xs">
                  {detailMember.profesionOcupacion || 'No registrada'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Procedencia e iglesia</p>
                <p className="text-slate-900 mt-0.5 text-xs">
                  {detailMember.procedenciaTipo}
                  {detailMember.iglesiaProcedencia ? ` · ${detailMember.iglesiaProcedencia}` : ''}
                  {detailMember.lugarProcedencia ? ` (${detailMember.lugarProcedencia})` : ''}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Discipulado y cargo</p>
                <p className="text-slate-900 mt-0.5 text-xs">
                  Discipulado: {detailMember.discipuladoEstado} · Cargo: {detailMember.cargo || 'Ninguno'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Núcleo familiar</p>
                <p className="text-slate-900 mt-0.5 text-xs">
                  {familyMap.get(detailMember.familiaId)?.apellidoFamilia || 'No asignado'}
                  {detailMember.rolFamiliar ? ` (${detailMember.rolFamiliar})` : ''}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Ministerio vinculado</p>
                <p className="text-slate-900 mt-0.5 text-xs">
                  {ministryMap.get(detailMember.ministerioId)?.nombre || 'Sin asignar'}
                </p>
              </div>
            </div>

            {detailMember.notasPastorales && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Notas pastorales</p>
                <p className="text-sm text-slate-700 leading-relaxed">{detailMember.notasPastorales}</p>
              </div>
            )}

            <div>
              <h3 className="text-xs font-semibold text-slate-900 mb-2">
                Historial de asistencia ({memberDetailAttendance.length})
              </h3>
              {memberDetailAttendance.length === 0 ? (
                <p className="text-xs text-slate-500">Sin asistencias vinculadas aún.</p>
              ) : (
                <ul className="divide-y divide-slate-100 border border-slate-200 rounded-md">
                  {memberDetailAttendance.slice(0, 8).map((a) => (
                    <li key={a.id} className="px-3 py-2 text-xs flex justify-between gap-3">
                      <span className="text-slate-800 truncate">
                        {eventMap.get(a.eventoId)?.titulo || a.eventoId}
                        {a.observaciones ? ` · ${a.observaciones}` : ''}
                      </span>
                      <span className="font-mono text-slate-500 shrink-0 tabular-nums">{a.fecha}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
