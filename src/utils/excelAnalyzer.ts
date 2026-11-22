import * as XLSX from 'xlsx';
import type {
  AttendanceRecord,
  ChurchEvent,
  CustomSheet,
  DiscipuladoEstado,
  DocumentType,
  EventStatus,
  EventType,
  ExcelColumnInference,
  ExcelImportTarget,
  ExcelSheetAnalysis,
  ExcelWorkbookAnalysis,
  Family,
  Gender,
  InferredColumnType,
  MaritalStatus,
  Member,
  MembershipStatus,
  Ministry,
  MinistryCategory,
  ProcedenciaType,
} from '../types/church';
import { calculateAgeFromDate, clipString, FIELD_LIMITS, generateSafeId } from './validation';

function normalizeKey(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function inferColumnType(values: string[]): InferredColumnType {
  const nonEmpty = values
    .map((v) => v.trim())
    .filter((v) => v.length > 0 && !/^#(VALUE|REF|N\/A|DIV\/0|NAME)!$/i.test(v))
    .slice(0, 40);
  if (nonEmpty.length === 0) return 'texto';

  const emailMatches = nonEmpty.filter((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)).length;
  if (emailMatches / nonEmpty.length >= 0.6) return 'email';

  const boolMatches = nonEmpty.filter((v) =>
    /^(si|sí|no|true|false|1|0|presente|ausente|activo|inactivo|proceso)$/i.test(v)
  ).length;
  if (boolMatches / nonEmpty.length >= 0.7) return 'booleano';

  const dateMatches = nonEmpty.filter((v) =>
    /^(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})$/.test(v)
  ).length;
  if (dateMatches / nonEmpty.length >= 0.6) return 'fecha';

  const phoneMatches = nonEmpty.filter(
    (v) => /^[+\d][\d\s\-()]{6,18}$/.test(v) && !/^\d{4}-\d{2}-\d{2}$/.test(v)
  ).length;
  if (phoneMatches / nonEmpty.length >= 0.6 && nonEmpty.some((v) => v.length >= 7)) {
    const pureNumbers = nonEmpty.filter((v) => /^\d+([.,]\d+)?$/.test(v) && Number(v) < 100000).length;
    if (pureNumbers / nonEmpty.length < 0.8) return 'telefono';
  }

  const numberMatches = nonEmpty.filter((v) => /^-?\d+([.,]\d+)?$/.test(v)).length;
  if (numberMatches / nonEmpty.length >= 0.7) return 'numero';

  return 'texto';
}

function suggestFieldName(header: string): string {
  const n = normalizeKey(header);
  if (n === 'n' || n === 'no' || /(codigo|nro miembro|id miembro)/.test(n)) return 'codigoMiembro';
  if (/nombres? y apellidos?/.test(n) || /^(nombre|nombres|primer nombre)$/.test(n) || /nombre completo|miembro|persona/.test(n)) {
    if (n.includes('miembro activo')) return 'estadoMembresia';
    return 'nombres';
  }
  if (/(apellido|apellidos)/.test(n)) return 'apellidos';
  if (/tipo id|tipo doc/.test(n)) return 'tipoDocumento';
  if (/(dni|cedula|rut|documento|identidad|identificacion|idenficacion|\bci\b)/.test(n)) return 'documentoIdentidad';
  if (/(nacimiento|cumpleanos|fecha nac|f de nac)/.test(n)) return 'fechaNacimiento';
  if (n === 'edad') return 'edadCalculada';
  if (/(genero|sexo)/.test(n)) return 'genero';
  if (/(estado civil|civil)/.test(n)) return 'estadoCivil';
  if (/(telefono|celular|movil|whatsapp|fono)/.test(n)) return 'telefono';
  if (/(correo|email|e mail|mail)/.test(n)) return 'email';
  if (/(barrio|sector|colonia|urbanizacion)/.test(n)) return 'barrio';
  if (/(direccion|domicilio|calle)/.test(n)) return 'direccion';
  if (/(profesion|ocupacion|oficio)/.test(n)) return 'profesionOcupacion';
  if (/iglesia.*procedencia/.test(n)) return 'iglesiaProcedencia';
  if (/lugar.*procedencia/.test(n)) return 'lugarProcedencia';
  if (/procedencia/.test(n)) return 'procedenciaTipo';
  if (/discipulado/.test(n)) return 'discipuladoEstado';
  if (/cargo|rol ministerial/.test(n)) return 'cargo';
  if (/(familia|hogar|apellido familia)/.test(n)) return 'familia';
  if (/(miembro activo|estado membresia|membresia|condicion)/.test(n)) return 'estadoMembresia';
  if (/(bautizado|bautismo)/.test(n)) return n.includes('fecha') ? 'fechaBautismo' : 'bautizado';
  if (/(ministerio|grupo|celula|departamento)/.test(n)) return 'ministerio';
  if (/(evento|culto|servicio|actividad|reunion)/.test(n)) return 'evento';
  if (/(presente|asistio|asistencia)/.test(n)) return 'presente';
  if (/(fecha)/.test(n)) return 'fecha';
  if (/(hora inicio|inicio)/.test(n)) return 'horaInicio';
  if (/(ubicacion|lugar|salon)/.test(n)) return 'ubicacion';
  if (/(lider|responsable|encargado|pastor)/.test(n)) return 'responsable';
  if (/(nota|observacion|comentario)/.test(n)) return 'notas';
  return normalizeKey(header).replace(/\s+/g, '_');
}

function detectTargetTable(sheetName: string, headers: string[]): { target: ExcelImportTarget; confidence: string } {
  const s = normalizeKey(sheetName);
  const joined = headers.map(normalizeKey).join(' | ');

  if (/(asistencia|control|lista|registro culto)/.test(s) || (/(evento|culto)/.test(joined) && /(presente|asistente|asistio)/.test(joined))) {
    return { target: 'asistencias', confidence: 'Alta coincidencia (Asistencia)' };
  }
  if (/(evento|culto|calendario|actividad|agenda)/.test(s) || (/(titulo|culto)/.test(joined) && /(hora|ubicacion|capacidad)/.test(joined))) {
    return { target: 'eventos', confidence: 'Alta coincidencia (Cultos y Eventos)' };
  }
  if (/(ministerio|grupo|celula|equipo|departamento)/.test(s) || (/(lider|dia reunion|horario)/.test(joined) && /(categoria|ministerio)/.test(joined))) {
    return { target: 'ministerios', confidence: 'Alta coincidencia (Ministerios)' };
  }
  if (/(familia|hogar|hogares)/.test(s) || /(apellido familia|jefe hogar|telefono hogar)/.test(joined)) {
    return { target: 'familias', confidence: 'Alta coincidencia (Familias)' };
  }
  if (
    /(miembro|membresia|registro|directorio|feligres|persona|bautismo|visitante|base de datos)/.test(s) ||
    /(nombres|apellidos|documento|dni|cedula|identificacion|idenficacion|bautizado|discipulado|miembro activo)/.test(joined)
  ) {
    return { target: 'miembros', confidence: 'Alta coincidencia (Miembros)' };
  }
  return { target: 'personalizada', confidence: 'Hoja auxiliar (Planilla personalizada)' };
}

function formatExcelDate(val: Date): string {
  // Handle SheetJS midnight dates across UTC and local timezones reliably
  if (val.getUTCHours() === 0 && val.getUTCMinutes() === 0) {
    const y = val.getUTCFullYear();
    const m = String(val.getUTCMonth() + 1).padStart(2, '0');
    const d = String(val.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (val.getHours() === 0 && val.getMinutes() === 0) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const safe = new Date(val.getTime() + 12 * 3600 * 1000);
  const y = safe.getUTCFullYear();
  const m = String(safe.getUTCMonth() + 1).padStart(2, '0');
  const d = String(safe.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function cellToString(val: unknown): string {
  if (val == null) return '';
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    return formatExcelDate(val);
  }
  return String(val).trim();
}

function isBinarySpreadsheetBuffer(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  // ZIP (.xlsx / .xlsm / .ods): PK\x03\x04
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) return true;
  // OLE2 (.xls): D0 CF 11 E0
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) return true;
  return false;
}

export function analyzeWorkbookBuffer(buffer: ArrayBuffer, fileName: string): ExcelWorkbookAnalysis {
  const bytes = new Uint8Array(buffer);
  let workbook: XLSX.WorkBook;
  if (isBinarySpreadsheetBuffer(bytes)) {
    workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  } else {
    let text: string;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      text = new TextDecoder('windows-1252').decode(bytes);
    }
    workbook = XLSX.read(text, { type: 'string', raw: true });
  }
  const sheets: ExcelSheetAnalysis[] = [];
  let totalRows = 0;

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    const rawMatrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: '' });
    const nonEmptyRows = rawMatrix.filter(
      (row) => Array.isArray(row) && row.some((cell) => cellToString(cell) !== '')
    );
    if (nonEmptyRows.length === 0) continue;

    // Locate real header row (first row with >= 3 non-empty cells, skipping title banners/blank rows)
    const headerRowIndex = nonEmptyRows.findIndex(
      (row) => (row as unknown[]).filter((cell) => cellToString(cell) !== '').length >= 3
    );
    const effectiveHeaderIdx = headerRowIndex >= 0 ? headerRowIndex : 0;
    const rawHeaderRow = nonEmptyRows[effectiveHeaderIdx] as unknown[];
    const rawDataRows = nonEmptyRows.slice(effectiveHeaderIdx + 1) as unknown[][];

    // Keep only columns that contain a header or at least one non-empty cell in data rows
    const maxCols = Math.max(
      rawHeaderRow.length,
      ...rawDataRows.map((r) => r.length)
    );
    const activeColIndices: number[] = [];
    for (let c = 0; c < maxCols; c += 1) {
      const hasHeader = cellToString(rawHeaderRow[c]) !== '';
      const hasData = rawDataRows.some((r) => cellToString(r[c]) !== '');
      if (hasHeader || hasData) {
        activeColIndices.push(c);
      }
      if (activeColIndices.length >= FIELD_LIMITS.maxCustomColumns) break;
    }

    const usedHeaderNames = new Set<string>();
    const headers = activeColIndices.map((colIdx, pos) => {
      const base = cellToString(rawHeaderRow[colIdx]) || `Columna_${pos + 1}`;
      let unique = base;
      let suffix = 2;
      while (usedHeaderNames.has(unique)) {
        unique = `${base}_${suffix}`;
        suffix += 1;
      }
      usedHeaderNames.add(unique);
      return unique;
    });

    const dataRows = rawDataRows
      .map((row) => {
        const record: Record<string, string> = {};
        activeColIndices.forEach((colIdx, pos) => {
          record[headers[pos]] = cellToString(row[colIdx]);
        });
        return record;
      })
      .filter((rec) => Object.values(rec).some((v) => v.length > 0));

    const columns: ExcelColumnInference[] = headers.map((header) => {
      const colValues = dataRows.map((r) => r[header] ?? '');
      const nonEmptyValues = colValues.filter((v) => v.length > 0);
      return {
        header,
        inferredType: inferColumnType(colValues),
        nonEmptyCount: nonEmptyValues.length,
        sampleValue: nonEmptyValues[0] ?? '—',
        suggestedField: suggestFieldName(header),
      };
    });

    const detection = detectTargetTable(sheetName, headers);
    totalRows += dataRows.length;

    sheets.push({
      sheetName,
      rowCount: dataRows.length,
      columns,
      suggestedTarget: detection.target,
      confidenceLabel: detection.confidence,
      previewRows: dataRows.slice(0, 5),
      allRows: dataRows,
    });
  }

  return {
    fileName,
    analyzedAt: new Date().toISOString(),
    sheets,
    totalRows,
  };
}

function pickField(row: Record<string, string>, patterns: RegExp[]): string {
  for (const [key, value] of Object.entries(row)) {
    const nk = normalizeKey(key);
    if (patterns.some((p) => p.test(nk)) && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function parseBool(value: string): boolean {
  return /^(si|sí|true|1|x|presente|activo|yes)$/i.test(value.trim());
}

function parseNumber(value: string): number {
  const cleaned = value.replace(/[^0-9.,-]/g, '').replace(',', '.');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeDate(value: string, preferMDY = false): { iso: string; partialHint: string } {
  const trimmed = value.trim();
  if (!trimmed || /^#(VALUE|REF|N\/A|DIV\/0|NAME)!$/i.test(trimmed)) {
    return { iso: '', partialHint: '' };
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const year = Number(trimmed.slice(0, 4));
    if (year >= 1905 && year <= 2100) return { iso: trimmed, partialHint: '' };
    return { iso: '', partialHint: '' };
  }
  const slash = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slash) {
    const p1 = Number(slash[1]);
    const p2 = Number(slash[2]);
    let y = Number(slash[3]);
    if (slash[3].length === 2) {
      y = y > 30 ? 1900 + y : 2000 + y;
    }
    let m: number;
    let d: number;
    if (p1 > 12 && p2 <= 12) {
      d = p1;
      m = p2;
    } else if (p2 > 12 && p1 <= 12) {
      m = p1;
      d = p2;
    } else if (preferMDY) {
      m = p1;
      d = p2;
    } else {
      d = p1;
      m = p2;
    }
    if (y >= 1905 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return {
        iso: `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        partialHint: '',
      };
    }
  }
  // Preserve partial birthday strings like "10/01/" or "13 Feb." in pastoral notes
  return { iso: '', partialHint: trimmed };
}

function splitSpanishFullName(fullName: string): { nombres: string; apellidos: string } {
  const cleaned = fullName.replace(/\s+/g, ' ').trim();
  const parts = cleaned.split(' ');
  if (parts.length <= 1) {
    return { nombres: cleaned || 'Sin nombre', apellidos: 'Sin apellido' };
  }
  if (parts.length === 2) {
    return { nombres: parts[0], apellidos: parts[1] };
  }
  // Keep Spanish surname particles like "de la Hoz" together
  const lower = parts.map((p) => p.toLowerCase());
  const particleIdx = lower.findIndex((p, i) => i >= 1 && (p === 'de' || p === 'del'));
  if (particleIdx >= 2) {
    return {
      nombres: parts.slice(0, particleIdx - 1).join(' '),
      apellidos: parts.slice(particleIdx - 1).join(' '),
    };
  }
  if (parts.length === 3) {
    return { nombres: parts[0], apellidos: parts.slice(1).join(' ') };
  }
  const splitPoint = parts.length - 2;
  return {
    nombres: parts.slice(0, splitPoint).join(' '),
    apellidos: parts.slice(splitPoint).join(' '),
  };
}

function normalizeDocumentType(raw: string): DocumentType {
  const n = normalizeKey(raw).replace(/\s+/g, '');
  if (!n) return 'Otro';
  if (n === 'cc' || n === 'cedula') return 'CC';
  if (n === 'ti' || n === 'tarjetadeidentidad') return 'TI';
  if (n.includes('ext') || n === 'ce' || n === 'ppt' || n === 'pep') return 'D.EXT';
  if (n === 'rc') return 'RC';
  if (n.startsWith('pas')) return 'PAS';
  return 'Otro';
}

function normalizeProcedencia(raw: string): ProcedenciaType {
  const n = normalizeKey(raw);
  if (!n) return 'No especificado';
  if (n.includes('local')) return 'Local';
  if (/(tran|trns|tras|transm)/.test(n)) return 'Transferido';
  return 'No especificado';
}

function normalizeDiscipulado(raw: string): DiscipuladoEstado {
  const n = normalizeKey(raw);
  if (/^(si|yes|1|true)$/.test(n)) return 'SI';
  if (n.includes('proceso') || n.includes('curso')) return 'En Proceso';
  return 'NO';
}

function normalizeMaritalStatus(raw: string): MaritalStatus {
  const n = normalizeKey(raw);
  if (!n) return 'No especificado';
  if (n.startsWith('solter')) return 'Soltero/a';
  if (n.startsWith('casad')) return 'Casado/a';
  if (n.startsWith('union')) return 'Unión Libre';
  if (n.startsWith('viud')) return 'Viudo/a';
  if (n.startsWith('divorc')) return 'Divorciado/a';
  if (n.startsWith('separad')) return 'Separado/a';
  return 'No especificado';
}

function inferMinistryIdFromCargo(cargo: string, existingMinistries: Ministry[]): string {
  const c = normalizeKey(cargo);
  if (!c || c === 'ninguno' || c === 'ninguna') return '';

  const matchers: { pattern: RegExp; keywords: string[] }[] = [
    { pattern: /alabanza|music|pianist/, keywords: ['alabanza', 'musica'] },
    { pattern: /damas/, keywords: ['damas'] },
    { pattern: /caballeros/, keywords: ['caballeros'] },
    { pattern: /discipulado|maestr/, keywords: ['discipulado', 'ensenanza'] },
    { pattern: /accion social/, keywords: ['accion social'] },
    { pattern: /misiones/, keywords: ['misiones'] },
    { pattern: /infantil|ninos/, keywords: ['infantil', 'ninos'] },
    { pattern: /intersec|interces/, keywords: ['intercesion'] },
    { pattern: /secretar|estadist|fiscal|tesorer/, keywords: ['secretaria', 'estadistica', 'administracion'] },
    { pattern: /diacon/, keywords: ['diaconado'] },
    { pattern: /pastor/, keywords: ['discipulado', 'alabanza', 'administracion'] },
  ];

  for (const m of matchers) {
    if (m.pattern.test(c)) {
      const found = existingMinistries.find((min) => {
        const mn = normalizeKey(`${min.nombre} ${min.categoria}`);
        return m.keywords.some((kw) => mn.includes(kw));
      });
      if (found) return found.id;
    }
  }
  return '';
}

export function mapExcelRowsToEntities(params: {
  sheet: ExcelSheetAnalysis;
  target: ExcelImportTarget;
  ownerUid: string;
  existingFamilies: Family[];
  existingMinistries: Ministry[];
  existingMembers: Member[];
  existingEvents: ChurchEvent[];
  fileName: string;
}): {
  families: Family[];
  ministries: Ministry[];
  members: Member[];
  events: ChurchEvent[];
  attendances: AttendanceRecord[];
  customSheet: CustomSheet | null;
} {
  const {
    sheet,
    target,
    ownerUid,
    existingFamilies,
    existingMinistries,
    existingMembers,
    existingEvents,
    fileName,
  } = params;

  const today = new Date().toISOString().slice(0, 10);

  if (target === 'familias') {
    const families: Family[] = sheet.allRows
      .map((row) => {
        const apellido = pickField(row, [/apellido/, /familia/, /hogar/, /nombre/]);
        if (!apellido) return null;
        return {
          id: generateSafeId('fam'),
          ownerUid,
          apellidoFamilia: clipString(apellido, FIELD_LIMITS.nombreCorto),
          jefeHogarNombre: clipString(pickField(row, [/jefe/, /cabeza/, /responsable/, /referente/]), FIELD_LIMITS.nombrePersona),
          direccion: clipString(pickField(row, [/direccion/, /domicilio/]), FIELD_LIMITS.direccion),
          ciudad: clipString(pickField(row, [/ciudad/, /barrio/, /distrito/, /zona/]), FIELD_LIMITS.ciudad),
          telefonoHogar: clipString(pickField(row, [/telefono/, /celular/, /fono/]), FIELD_LIMITS.telefono),
          notas: clipString(pickField(row, [/nota/, /observacion/]), FIELD_LIMITS.notas),
        };
      })
      .filter((x): x is Family => x !== null);
    return { families, ministries: [], members: [], events: [], attendances: [], customSheet: null };
  }

  if (target === 'ministerios') {
    const validCategories: MinistryCategory[] = [
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
    const ministries: Ministry[] = sheet.allRows
      .map((row) => {
        const nombre = pickField(row, [/nombre/, /ministerio/, /grupo/, /departamento/]);
        if (!nombre) return null;
        const rawCat = pickField(row, [/categoria/, /area/, /tipo/]);
        const matchedCat = validCategories.find((c) => normalizeKey(c) === normalizeKey(rawCat)) ?? 'Administración';
        const rawActive = pickField(row, [/activo/, /estado/]);
        return {
          id: generateSafeId('min'),
          ownerUid,
          nombre: clipString(nombre, FIELD_LIMITS.nombreCorto),
          categoria: matchedCat,
          descripcion: clipString(pickField(row, [/descripcion/, /detalle/, /proposito/]), FIELD_LIMITS.descripcionMinisterio),
          liderNombre: clipString(pickField(row, [/lider/, /encargado/, /coordinador/, /responsable/]), FIELD_LIMITS.nombrePersona),
          diaReunion: clipString(pickField(row, [/dia/, /frecuencia/]), FIELD_LIMITS.horario),
          horario: clipString(pickField(row, [/hora/, /horario/]), FIELD_LIMITS.horario),
          ubicacion: clipString(pickField(row, [/ubicacion/, /lugar/, /salon/]), FIELD_LIMITS.nombrePersona),
          activo: rawActive ? !/inactivo|no|false|0/i.test(rawActive) : true,
        };
      })
      .filter((x): x is Ministry => x !== null);
    return { families: [], ministries, members: [], events: [], attendances: [], customSheet: null };
  }

  if (target === 'miembros') {
    const validStatuses: MembershipStatus[] = [
      'Activo', 'Visitante', 'Nuevo Creyente', 'En Discipulado', 'Trasladado', 'Inactivo',
    ];
    const validGenders: Gender[] = ['Masculino', 'Femenino', 'Otro', 'No especificado'];

    // Detect if the sheet uses M/D/YYYY dates (e.g., 11/17/1984)
    const rawBirthDates = sheet.allRows
      .map((r) => pickField(r, [/nacimiento/, /cumple/, /f de nac/]))
      .filter(Boolean);
    const preferMDY = rawBirthDates.some((d) => {
      const m = d.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
      return Boolean(m && Number(m[1]) <= 12 && Number(m[2]) > 12);
    });

    const members: Member[] = sheet.allRows
      .map((row, idx) => {
        const combinedName = pickField(row, [/nombres? y apellidos?/, /nombre completo/]);
        let nombres = combinedName ? '' : pickField(row, [/^nombres?$/, /primer nombre/, /^miembro$/, /persona/]);
        let apellidos = combinedName ? '' : pickField(row, [/^apellidos?$/]);

        if (combinedName) {
          const split = splitSpanishFullName(combinedName);
          nombres = split.nombres;
          apellidos = split.apellidos;
        } else {
          if (!nombres && !apellidos) return null;
          if (nombres && !apellidos && nombres.includes(' ')) {
            const split = splitSpanishFullName(nombres);
            nombres = split.nombres;
            apellidos = split.apellidos;
          }
          if (!apellidos) apellidos = 'Sin apellido';
          if (!nombres) nombres = 'Sin nombre';
        }

        const direccion = clipString(pickField(row, [/direccion/, /domicilio/]), FIELD_LIMITS.direccion);
        const barrio = clipString(pickField(row, [/barrio/, /sector/, /urbanizacion/]), FIELD_LIMITS.barrio);
        const cargo = clipString(pickField(row, [/^cargo$/, /cargo ministerial/]), FIELD_LIMITS.cargo);
        const profesionOcupacion = clipString(pickField(row, [/profesion/, /ocupacion/, /oficio/]), FIELD_LIMITS.profesionOcupacion);
        const procedenciaTipo = normalizeProcedencia(
          pickField(row, [/^procedencia/, /local.*trans/])
        );
        const iglesiaProcedencia = clipString(pickField(row, [/iglesia.*procedencia/]), FIELD_LIMITS.iglesiaProcedencia);
        const lugarProcedencia = clipString(pickField(row, [/lugar.*procedencia/]), FIELD_LIMITS.lugarProcedencia);
        const discipuladoEstado = normalizeDiscipulado(pickField(row, [/discipulado/]));
        const tipoDocumento = normalizeDocumentType(pickField(row, [/tipo id/, /tipo doc/]));

        const famText = pickField(row, [/familia/, /hogar/]);
        const matchedFamily = famText
          ? existingFamilies.find((f) => normalizeKey(f.apellidoFamilia).includes(normalizeKey(famText)))
          : direccion
            ? existingFamilies.find(
                (f) => f.direccion && normalizeKey(f.direccion) === normalizeKey(direccion)
              )
            : undefined;

        const minText = pickField(row, [/ministerio/, /grupo/, /celula/]);
        const matchedMin = minText
          ? existingMinistries.find((m) => normalizeKey(m.nombre).includes(normalizeKey(minText)))
          : undefined;
        const ministerioId = matchedMin?.id || inferMinistryIdFromCargo(cargo, existingMinistries);

        const rawActiveCol = pickField(row, [/miembro activo/]);
        const rawStatusCol = pickField(row, [/estado membresia/, /membresia/, /condicion/]);
        let estadoMembresia: MembershipStatus = 'Activo';
        if (rawStatusCol) {
          estadoMembresia =
            validStatuses.find((s) => normalizeKey(s) === normalizeKey(rawStatusCol)) ?? 'Activo';
        } else if (rawActiveCol) {
          if (parseBool(rawActiveCol)) {
            estadoMembresia = 'Activo';
          } else if (discipuladoEstado === 'En Proceso') {
            estadoMembresia = 'En Discipulado';
          } else {
            estadoMembresia = 'Inactivo';
          }
        } else if (discipuladoEstado === 'En Proceso') {
          estadoMembresia = 'En Discipulado';
        }

        const rawGender = pickField(row, [/genero/, /sexo/]);
        const rawCivil = pickField(row, [/estado civil/, /civil/]);
        let genero: Gender =
          validGenders.find((g) => rawGender && normalizeKey(g).startsWith(normalizeKey(rawGender).slice(0, 3))) ??
          (/^m/i.test(rawGender) ? 'Masculino' : /^f/i.test(rawGender) ? 'Femenino' : 'No especificado');
        if (genero === 'No especificado' && rawCivil) {
          const nc = normalizeKey(rawCivil);
          if (/(soltera|casada|viuda|divorciada|separada)$/.test(nc)) genero = 'Femenino';
          else if (/(soltero|casado|viudo|divorciado|separado)$/.test(nc)) genero = 'Masculino';
        }

        const estadoCivil = normalizeMaritalStatus(rawCivil);

        const bautizadoVal = pickField(row, [/bautizado/]);
        const fechaBautismoRes = normalizeDate(pickField(row, [/fecha bautismo/]), preferMDY);
        const bautizado = bautizadoVal ? parseBool(bautizadoVal) : Boolean(fechaBautismoRes.iso);

        const birthRes = normalizeDate(pickField(row, [/nacimiento/, /cumple/, /f de nac/]), preferMDY);
        const rawNotes = pickField(row, [/nota/, /observacion/, /comentario/]);
        const extraNote = birthRes.partialHint ? `Cumpleaños parcial en planilla: ${birthRes.partialHint}` : '';
        const notasPastorales = clipString(
          [rawNotes, extraNote].filter(Boolean).join(' · '),
          FIELD_LIMITS.notasPastorales
        );

        const rawSeq = pickField(row, [/^n$/, /^no$/, /codigo/, /nro/, /id miembro/]);
        const codigoMiembro = rawSeq
          ? /^\d+$/.test(rawSeq)
            ? `IBM-${rawSeq.padStart(3, '0')}`
            : rawSeq
          : `IBM-${String(existingMembers.length + idx + 1).padStart(3, '0')}`;

        return {
          id: generateSafeId('mem'),
          ownerUid,
          codigoMiembro: clipString(codigoMiembro, FIELD_LIMITS.codigoMiembro),
          nombres: clipString(nombres, FIELD_LIMITS.nombres),
          apellidos: clipString(apellidos, FIELD_LIMITS.apellidos),
          tipoDocumento,
          documentoIdentidad: clipString(
            pickField(row, [/dni/, /cedula/, /rut/, /documento/, /identidad/, /identificacion/, /idenficacion/]),
            FIELD_LIMITS.documentoIdentidad
          ),
          fechaNacimiento: birthRes.iso,
          genero,
          estadoCivil,
          telefono: clipString(pickField(row, [/telefono/, /celular/, /movil/, /whatsapp/]), FIELD_LIMITS.telefono),
          email: clipString(pickField(row, [/correo/, /email/, /mail/]), FIELD_LIMITS.email),
          direccion,
          barrio,
          profesionOcupacion,
          procedenciaTipo,
          iglesiaProcedencia,
          lugarProcedencia,
          discipuladoEstado,
          cargo,
          familiaId: matchedFamily?.id ?? '',
          rolFamiliar: clipString(pickField(row, [/rol familiar/, /parentesco/]), FIELD_LIMITS.rolFamiliar),
          estadoMembresia,
          bautizado,
          fechaBautismo: bautizado ? fechaBautismoRes.iso : '',
          fechaIngreso: normalizeDate(pickField(row, [/ingreso/, /registro/]), preferMDY).iso || today,
          ministerioId,
          notasPastorales,
        };
      })
      .filter((x): x is Member => x !== null);

    return { families: [], ministries: [], members, events: [], attendances: [], customSheet: null };
  }

  if (target === 'eventos') {
    const validTypes: EventType[] = [
      'Culto Dominical', 'Estudio Bíblico', 'Oración', 'Jóvenes', 'Conferencia', 'Bautismo', 'Reunión Administrativa', 'Especial',
    ];
    const validStatuses: EventStatus[] = ['Programado', 'En Curso', 'Finalizado', 'Cancelado'];

    const events: ChurchEvent[] = sheet.allRows
      .map((row) => {
        const titulo = pickField(row, [/titulo/, /evento/, /culto/, /nombre/, /actividad/]);
        if (!titulo) return null;
        const rawType = pickField(row, [/tipo/, /categoria/]);
        const tipo = validTypes.find((t) => normalizeKey(t) === normalizeKey(rawType)) ?? 'Culto Dominical';
        const rawStatus = pickField(row, [/estado/]);
        const estado = validStatuses.find((s) => normalizeKey(s) === normalizeKey(rawStatus)) ?? 'Programado';
        const minText = pickField(row, [/ministerio/, /grupo/]);
        const matchedMin = minText
          ? existingMinistries.find((m) => normalizeKey(m.nombre).includes(normalizeKey(minText)))
          : undefined;
        return {
          id: generateSafeId('evt'),
          ownerUid,
          titulo: clipString(titulo, FIELD_LIMITS.tituloEvento),
          tipo,
          fecha: normalizeDate(pickField(row, [/fecha/])).iso || today,
          horaInicio: clipString(pickField(row, [/hora inicio/, /inicio/, /hora/]) || '10:00', FIELD_LIMITS.fecha),
          horaFin: clipString(pickField(row, [/hora fin/, /fin/]) || '12:00', FIELD_LIMITS.fecha),
          ubicacion: clipString(pickField(row, [/ubicacion/, /lugar/, /salon/]) || 'Templo Principal', FIELD_LIMITS.ubicacion),
          responsableNombre: clipString(pickField(row, [/responsable/, /lider/, /pastor/, /predicador/]), FIELD_LIMITS.nombrePersona),
          ministerioId: matchedMin?.id ?? '',
          estado,
          capacidadEsperada: Math.max(0, Math.min(FIELD_LIMITS.maxCapacidad, Math.round(parseNumber(pickField(row, [/capacidad/, /aforo/, /esperado/]) || '120')))),
          descripcion: clipString(pickField(row, [/descripcion/, /nota/, /detalle/]), FIELD_LIMITS.descripcion),
        };
      })
      .filter((x): x is ChurchEvent => x !== null);
    return { families: [], ministries: [], members: [], events, attendances: [], customSheet: null };
  }

  if (target === 'asistencias') {
    const fallbackEvent = existingEvents[0];
    const attendances: AttendanceRecord[] = sheet.allRows
      .map((row) => {
        const nombreAsistente = pickField(row, [/asistente/, /miembro/, /nombre/, /persona/]);
        if (!nombreAsistente) return null;
        const eventText = pickField(row, [/evento/, /culto/, /servicio/, /actividad/]);
        const matchedEvent =
          (eventText && existingEvents.find((e) => normalizeKey(e.titulo).includes(normalizeKey(eventText)))) ||
          fallbackEvent;
        if (!matchedEvent) return null;

        const matchedMember = existingMembers.find((m) =>
          normalizeKey(`${m.nombres} ${m.apellidos}`).includes(normalizeKey(nombreAsistente))
        );
        const rawPresente = pickField(row, [/presente/, /asistio/, /asistencia/]);
        const rawTipo = pickField(row, [/tipo/]);
        const tipoAsistente = /primera/i.test(rawTipo)
          ? 'Primera Vez'
          : /visitante/i.test(rawTipo) || !matchedMember
            ? 'Visitante'
            : 'Miembro';

        return {
          id: generateSafeId('ast'),
          ownerUid,
          eventoId: matchedEvent.id,
          miembroId: matchedMember?.id ?? '',
          nombreAsistente: clipString(nombreAsistente, FIELD_LIMITS.nombreAsistente),
          fecha: normalizeDate(pickField(row, [/fecha/])).iso || matchedEvent.fecha || today,
          tipoAsistente,
          presente: rawPresente ? parseBool(rawPresente) : true,
          observaciones: clipString(pickField(row, [/observacion/, /nota/]), FIELD_LIMITS.notasCortas),
        };
      })
      .filter((x): x is AttendanceRecord => x !== null);
    return { families: [], ministries: [], members: [], events: [], attendances, customSheet: null };
  }

  const sheetId = generateSafeId('sht');
  const columnas = sheet.columns.map((c) => clipString(c.header, 80)).slice(0, FIELD_LIMITS.maxCustomColumns);
  const rows = sheet.allRows.slice(0, 500).map((row, idx) => ({
    id: generateSafeId('row'),
    ownerUid,
    sheetId,
    rowIndex: idx + 1,
    values: Object.fromEntries(columnas.map((col) => [col, clipString(row[col] ?? '', 300)])),
  }));

  const customSheet: CustomSheet = {
    id: sheetId,
    ownerUid,
    nombreHoja: clipString(sheet.sheetName, FIELD_LIMITS.nombreCorto),
    archivoOrigen: clipString(fileName, 180),
    columnas: columnas.length > 0 ? columnas : ['Columna_1'],
    totalFilas: rows.length,
    rows,
  };

  return { families: [], ministries: [], members: [], events: [], attendances: [], customSheet };
}

export function generateChurchTemplateWorkbookBuffer(): ArrayBuffer {
  const wb = XLSX.utils.book_new();

  const familiasSheet = XLSX.utils.json_to_sheet([
    {
      'Apellido Familia': 'Nuñez Lara',
      'Jefe de Hogar': 'Ronal Jose Nuñez Muñoz',
      Dirección: 'Torre 1 Apto 501',
      Ciudad: 'Leandro Diaz 2 — Valledupar',
      'Teléfono Hogar': '3176829641',
      Notas: 'Familia pastoral de IBM Casa de Dios',
    },
    {
      'Apellido Familia': 'Ibarra Alfaro',
      'Jefe de Hogar': 'Alberto José Ibarra Vergara',
      Dirección: 'Mz 28 Cs 4',
      Ciudad: 'T. Prometida — Valledupar',
      'Teléfono Hogar': '3014798711',
      Notas: 'Participación en Caballeros y Secretaría',
    },
  ]);

  const ministeriosSheet = XLSX.utils.json_to_sheet([
    {
      Nombre: 'Alabanza y Música',
      Categoría: 'Alabanza',
      Líder: 'Jhon Deivis Troya Torres',
      'Día Reunión': 'Jueves',
      Horario: '19:00 - 20:30',
      Ubicación: 'Templo IBM Casa de Dios',
      Activo: 'Sí',
    },
    {
      Nombre: 'Diaconado',
      Categoría: 'Diaconado',
      Líder: 'Miriam Arias de la Hoz',
      'Día Reunión': 'Sábado',
      Horario: '17:00 - 18:30',
      Ubicación: 'Templo IBM Casa de Dios',
      Activo: 'Sí',
    },
  ]);

  const miembrosSheet = XLSX.utils.json_to_sheet([
    {
      'N°': '1',
      'NOMBRES Y APELLIDOS': 'Ronal Jose Nuñez Muñoz',
      'TIPO ID.': 'CC',
      IDENTIFICACIÓN: '1064787971',
      'F. DE NAC.': '1986-07-05',
      DIRECCIÓN: 'Torre 1 Apto 501',
      BARRIO: 'Leandro Diaz 2',
      'N° CELULAR': '3176829641',
      'PROFESIÓN U OCUPACIÓN': 'Pastor',
      'PROCEDENCIA Local/Trans': 'Transferido',
      'IGLESIA DE PROCEDENCIA': 'Palabra de vida',
      'LUGAR DE PROCEDENCIA': 'Valledupar',
      'DISCIPULADO SI/NO': 'SI',
      CARGO: 'Pastor - Musico',
      'BAUTIZADO SI/NO': 'SI',
      'ESTADO CIVIL': 'Casado',
      'MIEMBRO ACTIVO?': 'SI',
      Familia: 'Nuñez Lara',
    },
    {
      'N°': '2',
      'NOMBRES Y APELLIDOS': 'Yesika Judith Alfaro Ibáñez',
      'TIPO ID.': 'CC',
      IDENTIFICACIÓN: '39100591',
      'F. DE NAC.': '1984-03-15',
      DIRECCIÓN: 'Mz 28 Cs 4',
      BARRIO: 'T. Prometida',
      'N° CELULAR': '3043404852',
      'PROFESIÓN U OCUPACIÓN': 'T. Analisis de sistemas',
      'PROCEDENCIA Local/Trans': 'Local',
      'IGLESIA DE PROCEDENCIA': 'IBM Casa de Dios',
      'LUGAR DE PROCEDENCIA': 'Plato',
      'DISCIPULADO SI/NO': 'SI',
      CARGO: 'Secretaria',
      'BAUTIZADO SI/NO': 'SI',
      'ESTADO CIVIL': 'Casada',
      'MIEMBRO ACTIVO?': 'SI',
      Familia: 'Ibarra Alfaro',
    },
  ]);

  const eventosSheet = XLSX.utils.json_to_sheet([
    {
      Título: 'Culto Dominical — IBM Casa de Dios',
      Tipo: 'Culto Dominical',
      Fecha: '2026-11-29',
      'Hora Inicio': '09:30',
      'Hora Fin': '12:00',
      Ubicación: 'Templo IBM Casa de Dios',
      Responsable: 'Pr. Ronal Jose Nuñez Muñoz',
      Estado: 'Programado',
      Capacidad: 120,
    },
  ]);

  XLSX.utils.book_append_sheet(wb, miembrosSheet, 'Miembros');
  XLSX.utils.book_append_sheet(wb, familiasSheet, 'Familias');
  XLSX.utils.book_append_sheet(wb, ministeriosSheet, 'Ministerios');
  XLSX.utils.book_append_sheet(wb, eventosSheet, 'Eventos');

  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
}

export function downloadExcelBuffer(buffer: ArrayBuffer, fileName: string): void {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function exportDatabaseToExcelBuffer(data: {
  members: Member[];
  families: Family[];
  ministries: Ministry[];
  events: ChurchEvent[];
  attendances: AttendanceRecord[];
  customSheets: CustomSheet[];
}): ArrayBuffer {
  const wb = XLSX.utils.book_new();

  const familyNameById = new Map(data.families.map((f) => [f.id, f.apellidoFamilia]));
  const ministryNameById = new Map(data.ministries.map((m) => [m.id, m.nombre]));
  const eventTitleById = new Map(data.events.map((e) => [e.id, e.titulo]));

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      data.members.map((m) => ({
        Código: m.codigoMiembro,
        'NOMBRES Y APELLIDOS': `${m.nombres} ${m.apellidos}`.trim(),
        Nombres: m.nombres,
        Apellidos: m.apellidos,
        'TIPO ID.': m.tipoDocumento,
        IDENTIFICACIÓN: m.documentoIdentidad,
        'F. DE NAC.': m.fechaNacimiento,
        EDAD: calculateAgeFromDate(m.fechaNacimiento) ?? '',
        DIRECCIÓN: m.direccion,
        BARRIO: m.barrio,
        'N° CELULAR': m.telefono,
        Email: m.email,
        'PROFESIÓN U OCUPACIÓN': m.profesionOcupacion,
        'PROCEDENCIA Local/Trans': m.procedenciaTipo,
        'IGLESIA DE PROCEDENCIA': m.iglesiaProcedencia,
        'LUGAR DE PROCEDENCIA': m.lugarProcedencia,
        'DISCIPULADO SI/NO': m.discipuladoEstado,
        CARGO: m.cargo,
        'BAUTIZADO SI/NO': m.bautizado ? 'SI' : 'NO',
        'ESTADO CIVIL': m.estadoCivil,
        'MIEMBRO ACTIVO?': m.estadoMembresia === 'Activo' ? 'SI' : 'NO',
        'Estado Membresía': m.estadoMembresia,
        Familia: familyNameById.get(m.familiaId) ?? '',
        Ministerio: ministryNameById.get(m.ministerioId) ?? '',
        'Notas Pastorales': m.notasPastorales,
      }))
    ),
    'Miembros'
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      data.families.map((f) => ({
        'Apellido Familia': f.apellidoFamilia,
        'Jefe de Hogar': f.jefeHogarNombre,
        Dirección: f.direccion,
        'Barrio / Ciudad': f.ciudad,
        'Teléfono Hogar': f.telefonoHogar,
        Notas: f.notas,
      }))
    ),
    'Familias'
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      data.ministries.map((m) => ({
        Nombre: m.nombre,
        Categoría: m.categoria,
        Líder: m.liderNombre,
        'Día Reunión': m.diaReunion,
        Horario: m.horario,
        Ubicación: m.ubicacion,
        Activo: m.activo ? 'Sí' : 'No',
        Descripción: m.descripcion,
      }))
    ),
    'Ministerios'
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      data.events.map((e) => ({
        Título: e.titulo,
        Tipo: e.tipo,
        Fecha: e.fecha,
        'Hora Inicio': e.horaInicio,
        'Hora Fin': e.horaFin,
        Ubicación: e.ubicacion,
        Responsable: e.responsableNombre,
        Ministerio: ministryNameById.get(e.ministerioId) ?? '',
        Estado: e.estado,
        'Capacidad Esperada': e.capacidadEsperada,
        Descripción: e.descripcion,
      }))
    ),
    'Eventos'
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      data.attendances.map((a) => ({
        Evento: eventTitleById.get(a.eventoId) ?? a.eventoId,
        Fecha: a.fecha,
        Asistente: a.nombreAsistente,
        Tipo: a.tipoAsistente,
        Presente: a.presente ? 'Sí' : 'No',
        Observaciones: a.observaciones,
      }))
    ),
    'Asistencias'
  );

  for (const sheet of data.customSheets) {
    const safeName = sheet.nombreHoja.replace(/[\\/?*[\]]/g, '').slice(0, 31) || 'Planilla';
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(sheet.rows.map((r) => r.values)),
      safeName
    );
  }

  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
}
