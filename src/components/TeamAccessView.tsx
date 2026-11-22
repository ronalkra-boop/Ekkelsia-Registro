import React from 'react';
import { ShieldCheck, Users } from 'lucide-react';
import { useChurchStore } from '../context/ChurchStoreContext';
import type { StaffRole } from '../types/church';

const ROLE_MATRIX: {
  role: StaffRole;
  title: string;
  permissions: string;
}[] = [
  {
    role: 'pastor',
    title: 'Pastor / Administrador',
    permissions: 'Acceso completo a miembros, notas pastorales, familias, ministerios, eventos, importación Excel y gestión de usuarios.',
  },
  {
    role: 'secretaria',
    title: 'Secretaría General',
    permissions: 'Alta y edición de miembros, familias, eventos, asistencia y carga/exportación de planillas Excel.',
  },
  {
    role: 'lider',
    title: 'Líder de Ministerio',
    permissions: 'Consulta de integrantes de su ministerio, programación de actividades y toma de lista de asistencia.',
  },
  {
    role: 'consulta',
    title: 'Consulta (Solo lectura)',
    permissions: 'Visualización de reportes agregados y agenda de eventos sin permisos de modificación.',
  },
];

export function TeamAccessView() {
  const {
    user,
    isCloudMode,
    activeRole,
    setPreviewRole,
    signInWithGoogle,
    signOutUser,
    staffList,
    seedCloudWorkspace,
    members,
  } = useChurchStore();

  return (
    <div className="space-y-6">
      {/* Cloud Auth Card */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-slate-900">
            <ShieldCheck className="w-5 h-5 text-blue-900" />
            <h2 className="text-base font-semibold">
              {isCloudMode ? 'Sincronización en tiempo real activa' : 'Conectar equipo a la base en la nube'}
            </h2>
          </div>
          <p className="text-sm text-slate-600 max-w-2xl">
            {isCloudMode
              ? `Sesión iniciada como ${user?.email}. Todos los cambios de miembros, familias, ministerios, asistencia e importaciones de Excel se guardan y sincronizan en tiempo real.`
              : 'Inicia sesión con Google para habilitar persistencia en tiempo real en la nube entre el pastor, la secretaría y el equipo de liderazgo.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {isCloudMode ? (
            <>
              {members.length === 0 && (
                <button
                  type="button"
                  onClick={() => void seedCloudWorkspace()}
                  className="px-4 py-2 text-xs font-medium text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-md whitespace-nowrap"
                >
                  Cargar datos iniciales a la nube
                </button>
              )}
              <button
                type="button"
                onClick={() => void signOutUser()}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap"
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-md whitespace-nowrap"
            >
              Iniciar sesión con Google
            </button>
          )}
        </div>
      </section>

      {/* Role Matrix */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Matriz de roles administrativos</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Define responsabilidades claras para cada perfil de la iglesia.
            </p>
          </div>
          {!isCloudMode && (
            <div className="flex items-center gap-2 text-xs">
              <label htmlFor="preview-role-select" className="text-slate-600">
                Rol de vista previa:
              </label>
              <select
                id="preview-role-select"
                value={activeRole}
                onChange={(e) => setPreviewRole(e.target.value as StaffRole)}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              >
                {ROLE_MATRIX.map((r) => (
                  <option key={r.role} value={r.role}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {ROLE_MATRIX.map((item) => (
            <div key={item.role} className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="sm:w-56 shrink-0">
                <span className="text-sm font-medium text-slate-900">{item.title}</span>
                {activeRole === item.role && (
                  <span className="ml-2 text-xs font-medium text-blue-900">· Activo</span>
                )}
              </div>
              <p className="text-xs text-slate-600 flex-1">{item.permissions}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Staff Directory */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-900">
            Personal registrado ({staffList.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                <th className="py-2.5 px-5 font-medium">Nombre</th>
                <th className="py-2.5 px-4 font-medium">Correo</th>
                <th className="py-2.5 px-4 font-medium">Rol asignado</th>
                <th className="py-2.5 px-5 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffList.map((person) => (
                <tr key={person.uid}>
                  <td className="py-3 px-5 font-medium text-slate-900">{person.displayName}</td>
                  <td className="py-3 px-4 text-xs text-slate-600 font-mono">{person.email}</td>
                  <td className="py-3 px-4 text-xs text-slate-700 capitalize">{person.role}</td>
                  <td className="py-3 px-5 text-xs">
                    <span className={person.active ? 'text-emerald-700 font-medium' : 'text-rose-700 font-medium'}>
                      {person.active ? 'Habilitado' : 'Suspendido'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
