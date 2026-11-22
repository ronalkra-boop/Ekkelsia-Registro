export type StaffRole = 'pastor' | 'secretaria' | 'lider' | 'consulta';

export type DocumentType = 'CC' | 'TI' | 'D.EXT' | 'RC' | 'PAS' | 'Otro';

export type Gender = 'Masculino' | 'Femenino' | 'Otro' | 'No especificado';

export type MaritalStatus =
  | 'Soltero/a'
  | 'Casado/a'
  | 'Viudo/a'
  | 'Divorciado/a'
  | 'Separado/a'
  | 'Unión Libre'
  | 'No especificado';

export type ProcedenciaType = 'Local' | 'Transferido' | 'No especificado';

export type DiscipuladoEstado = 'SI' | 'NO' | 'En Proceso';

export type MembershipStatus =
  | 'Activo'
  | 'Visitante'
  | 'Nuevo Creyente'
  | 'En Discipulado'
  | 'Trasladado'
  | 'Inactivo';

export type MinistryCategory =
  | 'Alabanza'
  | 'Enseñanza'
  | 'Jóvenes'
  | 'Niños'
  | 'Diaconado'
  | 'Misiones'
  | 'Administración'
  | 'Células'
  | 'Damas'
  | 'Caballeros'
  | 'Intercesión'
  | 'Acción Social';

export type EventType =
  | 'Culto Dominical'
  | 'Estudio Bíblico'
  | 'Oración'
  | 'Jóvenes'
  | 'Conferencia'
  | 'Bautismo'
  | 'Reunión Administrativa'
  | 'Especial';

export type EventStatus = 'Programado' | 'En Curso' | 'Finalizado' | 'Cancelado';

export type AttendeeType = 'Miembro' | 'Visitante' | 'Primera Vez';

export type AppSection =
  | 'resumen'
  | 'miembros'
  | 'familias'
  | 'ministerios'
  | 'eventos'
  | 'asistencia'
  | 'excel'
  | 'modelo'
  | 'equipo';

export interface StaffProfile {
  uid: string;
  displayName: string;
  email: string;
  role: StaffRole;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Family {
  id: string;
  ownerUid: string;
  apellidoFamilia: string;
  direccion: string;
  ciudad: string;
  telefonoHogar: string;
  jefeHogarNombre: string;
  notas: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Ministry {
  id: string;
  ownerUid: string;
  nombre: string;
  categoria: MinistryCategory;
  descripcion: string;
  liderNombre: string;
  diaReunion: string;
  horario: string;
  ubicacion: string;
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Member {
  id: string;
  ownerUid: string;
  codigoMiembro: string;
  nombres: string;
  apellidos: string;
  tipoDocumento: DocumentType;
  documentoIdentidad: string;
  fechaNacimiento: string;
  genero: Gender;
  estadoCivil: MaritalStatus;
  telefono: string;
  email: string;
  direccion: string;
  barrio: string;
  profesionOcupacion: string;
  procedenciaTipo: ProcedenciaType;
  iglesiaProcedencia: string;
  lugarProcedencia: string;
  discipuladoEstado: DiscipuladoEstado;
  cargo: string;
  familiaId: string;
  rolFamiliar: string;
  estadoMembresia: MembershipStatus;
  bautizado: boolean;
  fechaBautismo: string;
  fechaIngreso: string;
  ministerioId: string;
  notasPastorales: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChurchEvent {
  id: string;
  ownerUid: string;
  titulo: string;
  tipo: EventType;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  ubicacion: string;
  responsableNombre: string;
  ministerioId: string;
  estado: EventStatus;
  capacidadEsperada: number;
  descripcion: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AttendanceRecord {
  id: string;
  ownerUid: string;
  eventoId: string;
  miembroId: string;
  nombreAsistente: string;
  fecha: string;
  tipoAsistente: AttendeeType;
  presente: boolean;
  observaciones: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomSheetRow {
  id: string;
  ownerUid: string;
  sheetId: string;
  rowIndex: number;
  values: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomSheet {
  id: string;
  ownerUid: string;
  nombreHoja: string;
  archivoOrigen: string;
  columnas: string[];
  totalFilas: number;
  rows: CustomSheetRow[];
  createdAt?: string;
  updatedAt?: string;
}

export type ExcelImportTarget =
  | 'miembros'
  | 'familias'
  | 'ministerios'
  | 'eventos'
  | 'asistencias'
  | 'personalizada';

export type InferredColumnType = 'texto' | 'numero' | 'fecha' | 'email' | 'telefono' | 'booleano';

export interface ExcelColumnInference {
  header: string;
  inferredType: InferredColumnType;
  nonEmptyCount: number;
  sampleValue: string;
  suggestedField: string;
}

export interface ExcelSheetAnalysis {
  sheetName: string;
  rowCount: number;
  columns: ExcelColumnInference[];
  suggestedTarget: ExcelImportTarget;
  confidenceLabel: string;
  previewRows: Record<string, string>[];
  allRows: Record<string, string>[];
}

export interface ExcelWorkbookAnalysis {
  fileName: string;
  analyzedAt: string;
  sheets: ExcelSheetAnalysis[];
  totalRows: number;
}
