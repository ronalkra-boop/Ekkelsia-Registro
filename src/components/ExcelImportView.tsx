import React, { useRef, useState } from 'react';
import { CheckCircle2, Download, FileSpreadsheet, Trash2, Upload } from 'lucide-react';
import { useChurchStore } from '../context/ChurchStoreContext';
import type {
  AttendanceRecord,
  ChurchEvent,
  CustomSheet,
  ExcelImportTarget,
  ExcelWorkbookAnalysis,
  Family,
  Member,
  Ministry,
} from '../types/church';
import {
  analyzeWorkbookBuffer,
  downloadExcelBuffer,
  exportDatabaseToExcelBuffer,
  generateChurchTemplateWorkbookBuffer,
  mapExcelRowsToEntities,
} from '../utils/excelAnalyzer';

const TARGET_LABELS: Record<ExcelImportTarget, string> = {
  miembros: 'Tabla: Miembros',
  familias: 'Tabla: Familias',
  ministerios: 'Tabla: Ministerios',
  eventos: 'Tabla: Eventos / Cultos',
  asistencias: 'Tabla: Asistencias',
  personalizada: 'Guardar como Planilla Personalizada',
};

export function ExcelImportView() {
  const {
    user,
    families,
    ministries,
    members,
    events,
    attendances,
    customSheets,
    importEntitiesBatch,
    deleteCustomSheet,
  } = useChurchStore();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [analysis, setAnalysis] = useState<ExcelWorkbookAnalysis | null>(null);
  const [targetBySheet, setTargetBySheet] = useState<Record<string, ExcelImportTarget>>({});
  const [selectedSheets, setSelectedSheets] = useState<Record<string, boolean>>({});
  const [activePreviewSheet, setActivePreviewSheet] = useState<string>('');
  const [parseError, setParseError] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState('');

  const loadBuffer = (buffer: ArrayBuffer, fileName: string) => {
    try {
      setParseError('');
      setImportSuccessMsg('');
      const result = analyzeWorkbookBuffer(buffer, fileName);
      if (result.sheets.length === 0) {
        setParseError('El archivo no contiene hojas con datos legibles.');
        return;
      }
      setAnalysis(result);
      const nextTargets: Record<string, ExcelImportTarget> = {};
      const nextSelected: Record<string, boolean> = {};
      for (const sheet of result.sheets) {
        nextTargets[sheet.sheetName] = sheet.suggestedTarget;
        nextSelected[sheet.sheetName] = true;
      }
      setTargetBySheet(nextTargets);
      setSelectedSheets(nextSelected);
      setActivePreviewSheet(result.sheets[0].sheetName);
    } catch (err) {
      setParseError(
        err instanceof Error
          ? `No se pudo leer el archivo Excel: ${err.message}`
          : 'Formato de archivo no compatible.'
      );
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    loadBuffer(buffer, file.name);
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    loadBuffer(buffer, file.name);
  };

  const handleLoadSampleWorkbook = () => {
    const buf = generateChurchTemplateWorkbookBuffer();
    loadBuffer(buf, 'planilla_secretaria_ejemplo.xlsx');
  };

  const handleLoadUploadedSpreadsheet = async () => {
    try {
      setParseError('');
      const resp = await fetch('/assets/aistudio/BASE_DE_DATOS_2026_ae4e50d8');
      if (!resp.ok) {
        throw new Error(`No se pudo cargar el archivo adjunto (HTTP ${resp.status}).`);
      }
      const buf = await resp.arrayBuffer();
      loadBuffer(buf, 'BASE_DE_DATOS_2026.csv');
    } catch (err) {
      setParseError(
        err instanceof Error ? err.message : 'No se pudo cargar la planilla BASE_DE_DATOS_2026.'
      );
    }
  };

  const handleDownloadTemplate = () => {
    const buf = generateChurchTemplateWorkbookBuffer();
    downloadExcelBuffer(buf, 'plantilla_iglesia_ekklesia.xlsx');
  };

  const handleExportFullDatabase = () => {
    const buf = exportDatabaseToExcelBuffer({
      members,
      families,
      ministries,
      events,
      attendances,
      customSheets,
    });
    downloadExcelBuffer(buf, `respaldo_iglesia_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleConfirmImport = async () => {
    if (!analysis) return;
    setImporting(true);
    try {
      const ownerUid = user?.uid ?? 'demo_church_owner';
      const newFamilies: Family[] = [];
      const newMinistries: Ministry[] = [];
      const newMembers: Member[] = [];
      const newEvents: ChurchEvent[] = [];
      const newAttendances: AttendanceRecord[] = [];
      const newCustomSheets: CustomSheet[] = [];

      // Process parent tables first (families, ministries) so child tables (members, events) link by name!
      const orderedSheets = [...analysis.sheets]
        .filter((s) => selectedSheets[s.sheetName])
        .sort((a, b) => {
          const order: Record<ExcelImportTarget, number> = {
            familias: 1,
            ministerios: 2,
            miembros: 3,
            eventos: 4,
            asistencias: 5,
            personalizada: 6,
          };
          return order[targetBySheet[a.sheetName]] - order[targetBySheet[b.sheetName]];
        });

      for (const sheet of orderedSheets) {
        const target = targetBySheet[sheet.sheetName] ?? 'personalizada';
        const mapped = mapExcelRowsToEntities({
          sheet,
          target,
          ownerUid,
          existingFamilies: [...families, ...newFamilies],
          existingMinistries: [...ministries, ...newMinistries],
          existingMembers: [...members, ...newMembers],
          existingEvents: [...events, ...newEvents],
          fileName: analysis.fileName,
        });
        newFamilies.push(...mapped.families);
        newMinistries.push(...mapped.ministries);
        newMembers.push(...mapped.members);
        newEvents.push(...mapped.events);
        newAttendances.push(...mapped.attendances);
        if (mapped.customSheet) newCustomSheets.push(mapped.customSheet);
      }

      const importedCount = await importEntitiesBatch({
        families: newFamilies,
        ministries: newMinistries,
        members: newMembers,
        events: newEvents,
        attendances: newAttendances,
        customSheets: newCustomSheets,
      });

      setImportSuccessMsg(
        `Se importaron ${importedCount} registros desde "${analysis.fileName}" hacia las tablas seleccionadas.`
      );
      setAnalysis(null);
    } finally {
      setImporting(false);
    }
  };

  const previewSheetObj = analysis?.sheets.find((s) => s.sheetName === activePreviewSheet) ?? analysis?.sheets[0];

  return (
    <div className="space-y-6">
      {/* Upload & Actions Panel */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900">
              Cargar y analizar el libro Excel de la secretaría
            </h2>
            <p className="text-sm text-slate-600 max-w-2xl">
              Sube tu archivo <code className="font-mono text-xs">.xlsx</code>, <code className="font-mono text-xs">.xls</code> o <code className="font-mono text-xs">.csv</code> directamente aquí. El sistema lee todas sus pestañas, infiere tipos de columna y las relaciona con las tablas de la iglesia sin perder hojas adicionales.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar plantilla .xlsx
            </button>
            <button
              type="button"
              onClick={handleExportFullDatabase}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Exportar base completa
            </button>
          </div>
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => void handleDrop(e)}
          className="border-2 border-dashed border-slate-300 hover:border-blue-800 rounded-lg p-8 text-center bg-slate-50/60 transition-colors"
        >
          <Upload className="w-8 h-8 text-blue-900 mx-auto" />
          <p className="mt-3 text-sm font-medium text-slate-900">
            Arrastra aquí el archivo Excel de la secretaría o selecciónalo desde tu equipo
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Soporta libros con múltiples hojas (.xlsx, .xls, .csv) · Procesamiento instantáneo en el navegador
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => void handleFileChange(e)}
            className="hidden"
            aria-label="Seleccionar archivo Excel"
          />

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-md"
            >
              Seleccionar archivo Excel
            </button>
            <button
              type="button"
              onClick={() => void handleLoadUploadedSpreadsheet()}
              className="px-4 py-2 text-xs font-medium text-blue-900 bg-white border border-blue-300 hover:bg-blue-50 rounded-md"
            >
              Analizar archivo subido (BASE_DE_DATOS_2026)
            </button>
            <button
              type="button"
              onClick={handleLoadSampleWorkbook}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md"
            >
              Probar plantilla multi-hoja (4 hojas)
            </button>
          </div>
        </div>

        {parseError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800">
            {parseError}
          </div>
        )}

        {importSuccessMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{importSuccessMsg}</span>
          </div>
        )}
      </section>

      {/* Interactive Workbook Analysis Results */}
      {analysis && (
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden" data-testid="excel-analysis-panel">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Análisis del archivo: {analysis.fileName}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                {analysis.sheets.length} hojas detectadas · {analysis.totalRows} filas totales listas para mapear
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setAnalysis(null)}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md"
              >
                Descartar
              </button>
              <button
                type="button"
                disabled={importing}
                onClick={() => void handleConfirmImport()}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-md disabled:opacity-60"
              >
                {importing ? 'Importando...' : 'Confirmar importación'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border-b border-slate-200">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                  <th className="py-2.5 px-4 font-medium w-12">Usar</th>
                  <th className="py-2.5 px-4 font-medium">Hoja de Excel</th>
                  <th className="py-2.5 px-4 font-medium">Filas / Columnas</th>
                  <th className="py-2.5 px-4 font-medium">Diagnóstico automático</th>
                  <th className="py-2.5 px-4 font-medium">Destino en base de datos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analysis.sheets.map((sheet) => (
                  <tr
                    key={sheet.sheetName}
                    className={activePreviewSheet === sheet.sheetName ? 'bg-blue-50/40' : 'hover:bg-slate-50/75'}
                  >
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedSheets[sheet.sheetName])}
                        onChange={(e) =>
                          setSelectedSheets((prev) => ({ ...prev, [sheet.sheetName]: e.target.checked }))
                        }
                        aria-label={`Incluir hoja ${sheet.sheetName}`}
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => setActivePreviewSheet(sheet.sheetName)}
                        className="font-medium text-blue-900 hover:underline text-left"
                      >
                        {sheet.sheetName}
                      </button>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 tabular-nums">
                      {sheet.rowCount} filas · {sheet.columns.length} cols
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">{sheet.confidenceLabel}</td>
                    <td className="py-3 px-4">
                      <select
                        aria-label={`Tabla destino para hoja ${sheet.sheetName}`}
                        value={targetBySheet[sheet.sheetName]}
                        onChange={(e) =>
                          setTargetBySheet((prev) => ({
                            ...prev,
                            [sheet.sheetName]: e.target.value as ExcelImportTarget,
                          }))
                        }
                        className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                      >
                        {(Object.keys(TARGET_LABELS) as ExcelImportTarget[]).map((k) => (
                          <option key={k} value={k}>
                            {TARGET_LABELS[k]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {previewSheetObj && (
            <div className="p-6 space-y-5">
              <div>
                <h4 className="text-xs font-semibold text-slate-900 mb-2">
                  Estructura detectada en la hoja "{previewSheetObj.sheetName}"
                </h4>
                <div className="overflow-x-auto border border-slate-200 rounded-md">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <th className="py-2 px-3 font-medium">Encabezado Excel</th>
                        <th className="py-2 px-3 font-medium">Tipo inferido</th>
                        <th className="py-2 px-3 font-medium">Campo sugerido</th>
                        <th className="py-2 px-3 font-medium">Muestra</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewSheetObj.columns.map((col) => (
                        <tr key={col.header}>
                          <td className="py-2 px-3 font-medium text-slate-900">{col.header}</td>
                          <td className="py-2 px-3 font-mono text-slate-600">{col.inferredType}</td>
                          <td className="py-2 px-3 font-mono text-blue-900">{col.suggestedField}</td>
                          <td className="py-2 px-3 text-slate-600 truncate max-w-[220px]">
                            {col.sampleValue}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {previewSheetObj.previewRows.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 mb-2">
                    Vista previa (primeras {previewSheetObj.previewRows.length} filas)
                  </h4>
                  <div className="overflow-x-auto border border-slate-200 rounded-md">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                          {previewSheetObj.columns.map((col) => (
                            <th key={col.header} className="py-2 px-3 font-medium whitespace-nowrap">
                              {col.header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewSheetObj.previewRows.map((row, idx) => (
                          <tr key={idx}>
                            {previewSheetObj.columns.map((col) => (
                              <td key={col.header} className="py-2 px-3 text-slate-700 whitespace-nowrap">
                                {row[col.header] || '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Custom Sheets Archive */}
      {customSheets.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">
              Planillas personalizadas importadas ({customSheets.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Hojas auxiliares conservadas con todas sus columnas originales.
            </p>
          </div>
          <div className="divide-y divide-slate-200">
            {customSheets.map((sheet) => (
              <div key={sheet.id} className="p-5 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">{sheet.nombreHoja}</h4>
                    <p className="text-xs text-slate-500">
                      Origen: {sheet.archivoOrigen} · {sheet.totalFilas} filas · {sheet.columnas.length} columnas
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void deleteCustomSheet(sheet.id)}
                    aria-label={`Eliminar planilla ${sheet.nombreHoja}`}
                    className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {sheet.rows.length > 0 && (
                  <div className="overflow-x-auto border border-slate-200 rounded-md">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                          {sheet.columnas.map((c) => (
                            <th key={c} className="py-2 px-3 font-medium whitespace-nowrap">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sheet.rows.slice(0, 10).map((r) => (
                          <tr key={r.id}>
                            {sheet.columnas.map((c) => (
                              <td key={c} className="py-2 px-3 text-slate-700 whitespace-nowrap">
                                {r.values[c] || '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
