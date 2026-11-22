import React, { useMemo, useState } from 'react';
import { Check, Copy, Link2 } from 'lucide-react';
import {
  generatePostgresDDL,
  RELATIONAL_LINKS,
  RELATIONAL_TABLES,
} from '../utils/relationalSchema';

export function SchemaExplorerView() {
  const [selectedTableName, setSelectedTableName] = useState<string>(RELATIONAL_TABLES[2].tableName);
  const [viewMode, setViewMode] = useState<'diccionario' | 'relaciones' | 'sql'>('diccionario');
  const [copiedSql, setCopiedSql] = useState(false);

  const selectedTable = useMemo(
    () => RELATIONAL_TABLES.find((t) => t.tableName === selectedTableName) ?? RELATIONAL_TABLES[0],
    [selectedTableName]
  );

  const sqlScript = useMemo(() => generatePostgresDDL(), []);

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(sqlScript);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    } catch {
      setCopiedSql(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-600 max-w-3xl">
            Estructura normalizada en Tercera Forma Normal (3FN) con <strong className="text-slate-900">{RELATIONAL_TABLES.length} tablas relacionales</strong>, llaves foráneas explícitas e índices para escalar desde decenas hasta miles de miembros.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md self-start shrink-0" role="tablist" aria-label="Vista del modelo de datos">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'diccionario'}
            onClick={() => setViewMode('diccionario')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              viewMode === 'diccionario' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tablas y campos
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'relaciones'}
            onClick={() => setViewMode('relaciones')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              viewMode === 'relaciones' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Relaciones (PK / FK)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'sql'}
            onClick={() => setViewMode('sql')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              viewMode === 'sql' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Script SQL DDL
          </button>
        </div>
      </div>

      {viewMode === 'diccionario' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Table List */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700">
              Entidades del modelo ({RELATIONAL_TABLES.length})
            </div>
            <div className="divide-y divide-slate-100">
              {RELATIONAL_TABLES.map((table) => {
                const active = table.tableName === selectedTable.tableName;
                return (
                  <button
                    key={table.tableName}
                    type="button"
                    onClick={() => setSelectedTableName(table.tableName)}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      active ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={`font-mono text-xs font-semibold ${active ? 'text-blue-900' : 'text-slate-900'}`}>
                        {table.tableName}
                      </span>
                      <span className="text-xs text-slate-500 font-mono tabular-nums">
                        {table.fields.length} campos
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{table.displayName}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">{table.category}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Table Specification */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 space-y-1.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-900">
                  {selectedTable.displayName}{' '}
                  <span className="font-mono text-xs text-blue-900 font-normal">
                    ({selectedTable.tableName})
                  </span>
                </h2>
                <span className="font-mono text-xs text-slate-500">
                  Colección nube: {selectedTable.firestoreCollection}
                </span>
              </div>
              <p className="text-sm text-slate-600">{selectedTable.purpose}</p>
              <p className="text-xs text-slate-500">{selectedTable.excelOriginHint}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                    <th className="py-2.5 px-4 font-medium">Campo</th>
                    <th className="py-2.5 px-4 font-medium">Tipo SQL</th>
                    <th className="py-2.5 px-4 font-medium">Clave / Nulo</th>
                    <th className="py-2.5 px-4 font-medium">Descripción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedTable.fields.map((field) => (
                    <tr key={field.name} className="hover:bg-slate-50/75">
                      <td className="py-2.5 px-4 font-mono text-xs font-medium text-slate-900 whitespace-nowrap">
                        {field.name}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {field.sqlType}
                      </td>
                      <td className="py-2.5 px-4 text-xs whitespace-nowrap">
                        {field.keyType && (
                          <span className="font-mono font-semibold text-blue-900 mr-1.5">
                            {field.keyType}
                          </span>
                        )}
                        <span className="text-slate-500">
                          {field.nullable ? 'Opcional' : 'Obligatorio'}
                        </span>
                        {field.references && (
                          <span className="block font-mono text-[11px] text-slate-500">
                            → {field.references}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-600">{field.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Índices recomendados: </span>
              <span className="font-mono">{selectedTable.indexes.join(' · ')}</span>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'relaciones' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">
              Mapa de integridad referencial entre tablas
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Todas las llaves foráneas evitan duplicación de datos y mantienen consistencia al importar desde Excel.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                  <th className="py-2.5 px-5 font-medium">Tabla origen (FK)</th>
                  <th className="py-2.5 px-4 font-medium">Cardinalidad</th>
                  <th className="py-2.5 px-4 font-medium">Tabla destino (PK)</th>
                  <th className="py-2.5 px-5 font-medium">Propósito en la operación de la iglesia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {RELATIONAL_LINKS.map((rel) => (
                  <tr key={`${rel.fromTable}.${rel.fromColumn}`} className="hover:bg-slate-50/75">
                    <td className="py-3 px-5 font-mono text-xs text-slate-900 whitespace-nowrap">
                      {rel.fromTable}.{rel.fromColumn}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-blue-900 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Link2 className="w-3.5 h-3.5" />
                        {rel.cardinality}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                      {rel.toTable}.{rel.toColumn}
                    </td>
                    <td className="py-3 px-5 text-xs text-slate-600">{rel.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'sql' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Script SQL DDL (PostgreSQL estándar)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Definición lista para documentación técnica, auditoría o migración SQL.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleCopySql()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSql ? 'Copiado' : 'Copiar SQL'}
            </button>
          </div>
          <pre className="p-6 text-xs font-mono text-slate-800 bg-slate-50/70 overflow-x-auto leading-relaxed max-h-[560px]">
            {sqlScript}
          </pre>
        </div>
      )}
    </div>
  );
}
