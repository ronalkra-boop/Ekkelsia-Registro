import type {
  AttendanceRecord,
  ChurchEvent,
  Family,
  Member,
  Ministry,
} from '../types/church';

/**
 * Verbatim length limits synchronized with firebase-blueprint.json and firestore.rules.
 */
export const FIELD_LIMITS = {
  id: 128,
  codigoMiembro: 40,
  nombres: 120,
  apellidos: 120,
  documentoIdentidad: 40,
  fecha: 20,
  telefono: 40,
  email: 180,
  direccion: 240,
  barrio: 100,
  ciudad: 100,
  profesionOcupacion: 120,
  iglesiaProcedencia: 140,
  lugarProcedencia: 120,
  cargo: 160,
  rolFamiliar: 60,
  notasPastorales: 1000,
  notas: 600,
  notasCortas: 400,
  nombreCorto: 120,
  nombrePersona: 140,
  nombreAsistente: 160,
  tituloEvento: 160,
  ubicacion: 160,
  descripcion: 600,
  descripcionMinisterio: 500,
  horario: 60,
  maxCustomColumns: 40,
  maxCapacidad: 50000,
} as const;

export const VALID_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

export function clipString(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') {
    return value == null ? '' : String(value).trim().slice(0, maxLen);
  }
  return value.trim().slice(0, maxLen);
}

export function generateSafeId(prefix: string): string {
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16) || 'rec';
  const rand = Math.random().toString(36).slice(2, 8);
  const stamp = Date.now().toString(36);
  return `${cleanPrefix}_${stamp}_${rand}`;
}

export function isValidEmailFormat(email: string): boolean {
  if (!email.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Calculates age in whole years from an ISO YYYY-MM-DD birthdate.
 * Returns null if missing, partial, or outside sensible bounds (0-120),
 * preventing Excel #VALUE! or 127.0 date-serial artifacts.
 */
export function calculateAgeFromDate(fechaNacimiento: string, referenceDate: Date = new Date()): number | null {
  if (!fechaNacimiento || !/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento.trim())) return null;
  const [yStr, mStr, dStr] = fechaNacimiento.trim().split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  const day = Number(dStr);
  if (year < 1905 || month < 1 || month > 12 || day < 1 || day > 31) return null;

  let age = referenceDate.getFullYear() - year;
  const refMonth = referenceDate.getMonth() + 1;
  const refDay = referenceDate.getDate();
  if (refMonth < month || (refMonth === month && refDay < day)) {
    age -= 1;
  }
  if (age < 0 || age > 120) return null;
  return age;
}

export function validateMemberInput(
  input: Partial<Omit<Member, 'id' | 'ownerUid' | 'createdAt' | 'updatedAt'>>
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!input.nombres || !input.nombres.trim()) {
    errors.nombres = 'El nombre es obligatorio.';
  } else if (input.nombres.trim().length > FIELD_LIMITS.nombres) {
    errors.nombres = `Máximo ${FIELD_LIMITS.nombres} caracteres.`;
  }

  if (!input.apellidos || !input.apellidos.trim()) {
    errors.apellidos = 'Los apellidos son obligatorios.';
  } else if (input.apellidos.trim().length > FIELD_LIMITS.apellidos) {
    errors.apellidos = `Máximo ${FIELD_LIMITS.apellidos} caracteres.`;
  }

  if (!input.codigoMiembro || !input.codigoMiembro.trim()) {
    errors.codigoMiembro = 'El código de miembro es obligatorio.';
  } else if (input.codigoMiembro.trim().length > FIELD_LIMITS.codigoMiembro) {
    errors.codigoMiembro = `Máximo ${FIELD_LIMITS.codigoMiembro} caracteres.`;
  }

  if (input.email && !isValidEmailFormat(input.email)) {
    errors.email = 'Ingresa un correo electrónico válido.';
  }

  if (input.bautizado && input.fechaBautismo && input.fechaNacimiento && input.fechaBautismo < input.fechaNacimiento) {
    errors.fechaBautismo = 'La fecha de bautismo no puede ser anterior al nacimiento.';
  }

  if (input.notasPastorales && input.notasPastorales.length > FIELD_LIMITS.notasPastorales) {
    errors.notasPastorales = `Máximo ${FIELD_LIMITS.notasPastorales} caracteres.`;
  }

  return errors;
}

export function validateFamilyInput(
  input: Partial<Omit<Family, 'id' | 'ownerUid' | 'createdAt' | 'updatedAt'>>
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!input.apellidoFamilia || !input.apellidoFamilia.trim()) {
    errors.apellidoFamilia = 'El apellido o nombre de la familia es obligatorio.';
  } else if (input.apellidoFamilia.trim().length > FIELD_LIMITS.nombreCorto) {
    errors.apellidoFamilia = `Máximo ${FIELD_LIMITS.nombreCorto} caracteres.`;
  }

  if (input.direccion && input.direccion.length > FIELD_LIMITS.direccion) {
    errors.direccion = `Máximo ${FIELD_LIMITS.direccion} caracteres.`;
  }

  return errors;
}

export function validateMinistryInput(
  input: Partial<Omit<Ministry, 'id' | 'ownerUid' | 'createdAt' | 'updatedAt'>>
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!input.nombre || !input.nombre.trim()) {
    errors.nombre = 'El nombre del ministerio es obligatorio.';
  } else if (input.nombre.trim().length > FIELD_LIMITS.nombreCorto) {
    errors.nombre = `Máximo ${FIELD_LIMITS.nombreCorto} caracteres.`;
  }

  if (!input.categoria) {
    errors.categoria = 'Selecciona una categoría.';
  }

  return errors;
}

export function validateEventInput(
  input: Partial<Omit<ChurchEvent, 'id' | 'ownerUid' | 'createdAt' | 'updatedAt'>>
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!input.titulo || !input.titulo.trim()) {
    errors.titulo = 'El título del culto o evento es obligatorio.';
  } else if (input.titulo.trim().length > FIELD_LIMITS.tituloEvento) {
    errors.titulo = `Máximo ${FIELD_LIMITS.tituloEvento} caracteres.`;
  }

  if (!input.fecha || input.fecha.trim().length < 4) {
    errors.fecha = 'La fecha es obligatoria.';
  }

  const cap = Number(input.capacidadEsperada ?? 0);
  if (Number.isNaN(cap) || cap < 0 || cap > FIELD_LIMITS.maxCapacidad) {
    errors.capacidadEsperada = `Debe estar entre 0 y ${FIELD_LIMITS.maxCapacidad}.`;
  }

  return errors;
}

export function validateAttendanceInput(
  input: Partial<Omit<AttendanceRecord, 'id' | 'ownerUid' | 'createdAt' | 'updatedAt'>>
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!input.eventoId || !VALID_ID_REGEX.test(input.eventoId)) {
    errors.eventoId = 'Debes seleccionar un evento válido.';
  }

  if (!input.nombreAsistente || !input.nombreAsistente.trim()) {
    errors.nombreAsistente = 'El nombre del asistente es obligatorio.';
  } else if (input.nombreAsistente.trim().length > FIELD_LIMITS.nombreAsistente) {
    errors.nombreAsistente = `Máximo ${FIELD_LIMITS.nombreAsistente} caracteres.`;
  }

  if (!input.fecha || input.fecha.trim().length < 4) {
    errors.fecha = 'La fecha es obligatoria.';
  }

  return errors;
}

export function sanitizeMemberPayload(
  input: Omit<Member, 'id' | 'createdAt' | 'updatedAt'>
): Omit<Member, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    ownerUid: clipString(input.ownerUid, FIELD_LIMITS.id),
    codigoMiembro: clipString(input.codigoMiembro, FIELD_LIMITS.codigoMiembro),
    nombres: clipString(input.nombres, FIELD_LIMITS.nombres),
    apellidos: clipString(input.apellidos, FIELD_LIMITS.apellidos),
    tipoDocumento: input.tipoDocumento || 'CC',
    documentoIdentidad: clipString(input.documentoIdentidad, FIELD_LIMITS.documentoIdentidad),
    fechaNacimiento: clipString(input.fechaNacimiento, FIELD_LIMITS.fecha),
    genero: input.genero,
    estadoCivil: input.estadoCivil,
    telefono: clipString(input.telefono, FIELD_LIMITS.telefono),
    email: clipString(input.email, FIELD_LIMITS.email),
    direccion: clipString(input.direccion, FIELD_LIMITS.direccion),
    barrio: clipString(input.barrio, FIELD_LIMITS.barrio),
    profesionOcupacion: clipString(input.profesionOcupacion, FIELD_LIMITS.profesionOcupacion),
    procedenciaTipo: input.procedenciaTipo || 'Local',
    iglesiaProcedencia: clipString(input.iglesiaProcedencia, FIELD_LIMITS.iglesiaProcedencia),
    lugarProcedencia: clipString(input.lugarProcedencia, FIELD_LIMITS.lugarProcedencia),
    discipuladoEstado: input.discipuladoEstado || 'NO',
    cargo: clipString(input.cargo, FIELD_LIMITS.cargo),
    familiaId: VALID_ID_REGEX.test(input.familiaId || '') ? input.familiaId : '',
    rolFamiliar: clipString(input.rolFamiliar, FIELD_LIMITS.rolFamiliar),
    estadoMembresia: input.estadoMembresia,
    bautizado: Boolean(input.bautizado),
    fechaBautismo: input.bautizado ? clipString(input.fechaBautismo, FIELD_LIMITS.fecha) : '',
    fechaIngreso: clipString(input.fechaIngreso, FIELD_LIMITS.fecha),
    ministerioId: VALID_ID_REGEX.test(input.ministerioId || '') ? input.ministerioId : '',
    notasPastorales: clipString(input.notasPastorales, FIELD_LIMITS.notasPastorales),
  };
}
