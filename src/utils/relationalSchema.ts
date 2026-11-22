import type {
  AttendanceRecord,
  ChurchEvent,
  Family,
  Member,
  Ministry,
} from '../types/church';

export interface SchemaFieldSpec {
  name: string;
  sqlType: string;
  keyType?: 'PK' | 'FK' | 'UQ';
  nullable: boolean;
  references?: string;
  description: string;
}

export interface SchemaTableSpec {
  tableName: string;
  firestoreCollection: string;
  displayName: string;
  category: 'Personas y Hogares' | 'Vida Ministerial' | 'Operación y Asistencia' | 'Seguridad y Excel';
  purpose: string;
  excelOriginHint: string;
  fields: SchemaFieldSpec[];
  indexes: string[];
}

export interface SchemaRelationshipSpec {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  cardinality: '1:N' | 'N:1' | 'N:M';
  description: string;
}

export const RELATIONAL_TABLES: SchemaTableSpec[] = [
  {
    tableName: 'familias',
    firestoreCollection: '/families/{familyId}',
    displayName: 'Familias / Hogares',
    category: 'Personas y Hogares',
    purpose: 'Agrupa miembros que comparten domicilio, teléfono del hogar y seguimiento pastoral familiar.',
    excelOriginHint: 'Hojas: "Familias", "Hogares", "Directorio Familiar"',
    fields: [
      { name: 'id', sqlType: 'VARCHAR(128)', keyType: 'PK', nullable: false, description: 'Identificador único del hogar' },
      { name: 'apellido_familia', sqlType: 'VARCHAR(120)', nullable: false, description: 'Apellido principal o denominación del núcleo familiar' },
      { name: 'jefe_hogar_nombre', sqlType: 'VARCHAR(140)', nullable: true, description: 'Referente o cabeza de familia' },
      { name: 'direccion', sqlType: 'VARCHAR(240)', nullable: true, description: 'Dirección postal completa' },
      { name: 'ciudad', sqlType: 'VARCHAR(100)', nullable: true, description: 'Ciudad, distrito o zona pastoral' },
      { name: 'telefono_hogar', sqlType: 'VARCHAR(40)', nullable: true, description: 'Teléfono fijo o contacto familiar' },
      { name: 'notas', sqlType: 'TEXT', nullable: true, description: 'Observaciones pastorales del hogar' },
      { name: 'created_at', sqlType: 'TIMESTAMPTZ', nullable: false, description: 'Fecha de creación del registro' },
    ],
    indexes: ['idx_familias_apellido (apellido_familia)', 'idx_familias_ciudad (ciudad)'],
  },
  {
    tableName: 'ministerios',
    firestoreCollection: '/ministries/{ministryId}',
    displayName: 'Ministerios y Grupos',
    category: 'Vida Ministerial',
    purpose: 'Cataloga departamentos, equipos de servicio, grupos de jóvenes, células y escuelas.',
    excelOriginHint: 'Hojas: "Ministerios", "Grupos", "Células", "Servidores"',
    fields: [
      { name: 'id', sqlType: 'VARCHAR(128)', keyType: 'PK', nullable: false, description: 'Identificador del ministerio' },
      { name: 'nombre', sqlType: 'VARCHAR(120)', keyType: 'UQ', nullable: false, description: 'Nombre oficial del ministerio' },
      { name: 'categoria', sqlType: 'VARCHAR(40)', nullable: false, description: 'Área: Alabanza, Enseñanza, Jóvenes, Niños, Diaconado, Misiones, etc.' },
      { name: 'lider_nombre', sqlType: 'VARCHAR(140)', nullable: true, description: 'Coordinador o líder responsable' },
      { name: 'dia_reunion', sqlType: 'VARCHAR(60)', nullable: true, description: 'Día habitual de reunión o ensayo' },
      { name: 'horario', sqlType: 'VARCHAR(60)', nullable: true, description: 'Hora de inicio y fin' },
      { name: 'ubicacion', sqlType: 'VARCHAR(140)', nullable: true, description: 'Salón, templo o casa anfitriona' },
      { name: 'activo', sqlType: 'BOOLEAN', nullable: false, description: 'Estado operativo del ministerio' },
    ],
    indexes: ['idx_ministerios_categoria (categoria)', 'idx_ministerios_activo (activo)'],
  },
  {
    tableName: 'miembros',
    firestoreCollection: '/members/{memberId}',
    displayName: 'Miembros y Visitantes',
    category: 'Personas y Hogares',
    purpose: 'Entidad central del registro eclesial: datos personales, contacto, estado espiritual, bautismo y adscripción familiar/ministerial.',
    excelOriginHint: 'Hoja real: "BASE_DE_DATOS_2026" (N°, Nombres y Apellidos, Tipo ID, Identificación, F. Nac., Barrio, Celular, Profesión, Procedencia, Discipulado, Cargo, Bautizado, Estado Civil, Activo)',
    fields: [
      { name: 'id', sqlType: 'VARCHAR(128)', keyType: 'PK', nullable: false, description: 'Identificador único del miembro' },
      { name: 'codigo_miembro', sqlType: 'VARCHAR(40)', keyType: 'UQ', nullable: false, description: 'Número correlativo o código interno (ej. 001, M-0001)' },
      { name: 'nombres', sqlType: 'VARCHAR(120)', nullable: false, description: 'Nombres completos' },
      { name: 'apellidos', sqlType: 'VARCHAR(120)', nullable: false, description: 'Apellidos completos' },
      { name: 'tipo_documento', sqlType: 'VARCHAR(16)', nullable: false, description: 'CC, TI, D.EXT, RC, PAS u Otro' },
      { name: 'documento_identidad', sqlType: 'VARCHAR(40)', nullable: true, description: 'Número de identificación (sin espacios ni errores de formato)' },
      { name: 'fecha_nacimiento', sqlType: 'DATE', nullable: true, description: 'Fecha de nacimiento (la edad se calcula automáticamente en vivo)' },
      { name: 'genero', sqlType: 'VARCHAR(24)', nullable: false, description: 'Masculino, Femenino, Otro, No especificado' },
      { name: 'estado_civil', sqlType: 'VARCHAR(24)', nullable: false, description: 'Soltero/a, Casado/a, Viudo/a, Divorciado/a, Separado/a, Unión Libre, No especificado' },
      { name: 'telefono', sqlType: 'VARCHAR(40)', nullable: true, description: 'Número de celular / WhatsApp' },
      { name: 'email', sqlType: 'VARCHAR(180)', nullable: true, description: 'Correo electrónico personal' },
      { name: 'direccion', sqlType: 'VARCHAR(240)', nullable: true, description: 'Dirección exacta (manzana, casa, torre, apto)' },
      { name: 'barrio', sqlType: 'VARCHAR(100)', nullable: true, description: 'Barrio o sector (ej. Lorenzo Morales, Nando Marín, Villa Jaidith, Mareigua)' },
      { name: 'profesion_ocupacion', sqlType: 'VARCHAR(120)', nullable: true, description: 'Profesión u ocupación actual' },
      { name: 'procedencia_tipo', sqlType: 'VARCHAR(24)', nullable: false, description: 'Local, Transferido o No especificado' },
      { name: 'iglesia_procedencia', sqlType: 'VARCHAR(140)', nullable: true, description: 'Iglesia local o congregación de origen' },
      { name: 'lugar_procedencia', sqlType: 'VARCHAR(120)', nullable: true, description: 'Ciudad, municipio o país de procedencia' },
      { name: 'discipulado_estado', sqlType: 'VARCHAR(16)', nullable: false, description: 'SI, NO o En Proceso' },
      { name: 'cargo', sqlType: 'VARCHAR(160)', nullable: true, description: 'Cargo(s) o servicio desempeñado (Pastor, Secretaria, Diácono, Músico, Líder, etc.)' },
      { name: 'familia_id', sqlType: 'VARCHAR(128)', keyType: 'FK', nullable: true, references: 'familias(id)', description: 'Vínculo al núcleo familiar agrupado por hogar' },
      { name: 'rol_familiar', sqlType: 'VARCHAR(60)', nullable: true, description: 'Padre, Madre, Hijo/a, etc.' },
      { name: 'estado_membresia', sqlType: 'VARCHAR(32)', nullable: false, description: 'Activo, En Discipulado, Visitante, Nuevo Creyente, Trasladado, Inactivo' },
      { name: 'bautizado', sqlType: 'BOOLEAN', nullable: false, description: 'Indica si cuenta con bautismo registrado' },
      { name: 'fecha_bautismo', sqlType: 'DATE', nullable: true, description: 'Fecha de bautismo en agua' },
      { name: 'fecha_ingreso', sqlType: 'DATE', nullable: true, description: 'Fecha de registro o recepción' },
      { name: 'ministerio_id', sqlType: 'VARCHAR(128)', keyType: 'FK', nullable: true, references: 'ministerios(id)', description: 'Ministerio principal de servicio' },
      { name: 'notas_pastorales', sqlType: 'TEXT', nullable: true, description: 'Observaciones pastorales y seguimiento' },
    ],
    indexes: [
      'idx_miembros_codigo (codigo_miembro)',
      'idx_miembros_apellidos (apellidos, nombres)',
      'idx_miembros_barrio (barrio)',
      'idx_miembros_estado (estado_membresia)',
      'idx_miembros_discipulado (discipulado_estado)',
      'idx_miembros_familia (familia_id)',
      'idx_miembros_ministerio (ministerio_id)',
    ],
  },
  {
    tableName: 'eventos',
    firestoreCollection: '/events/{eventId}',
    displayName: 'Cultos y Eventos',
    category: 'Vida Ministerial',
    purpose: 'Registra servicios dominicales, estudios bíblicos, vigilias, bautismos, conferencias y reuniones administrativas.',
    excelOriginHint: 'Hojas: "Eventos", "Calendario", "Cultos", "Actividades"',
    fields: [
      { name: 'id', sqlType: 'VARCHAR(128)', keyType: 'PK', nullable: false, description: 'Identificador del evento' },
      { name: 'titulo', sqlType: 'VARCHAR(160)', nullable: false, description: 'Nombre del culto o actividad' },
      { name: 'tipo', sqlType: 'VARCHAR(40)', nullable: false, description: 'Culto Dominical, Estudio Bíblico, Oración, Conferencia, Bautismo, etc.' },
      { name: 'fecha', sqlType: 'DATE', nullable: false, description: 'Fecha programada' },
      { name: 'hora_inicio', sqlType: 'TIME', nullable: true, description: 'Hora de inicio' },
      { name: 'hora_fin', sqlType: 'TIME', nullable: true, description: 'Hora estimada de cierre' },
      { name: 'ubicacion', sqlType: 'VARCHAR(160)', nullable: true, description: 'Templo principal, salón anexo o sede externa' },
      { name: 'responsable_nombre', sqlType: 'VARCHAR(140)', nullable: true, description: 'Pastor o líder a cargo' },
      { name: 'ministerio_id', sqlType: 'VARCHAR(128)', keyType: 'FK', nullable: true, references: 'ministerios(id)', description: 'Ministerio organizador' },
      { name: 'estado', sqlType: 'VARCHAR(24)', nullable: false, description: 'Programado, En Curso, Finalizado, Cancelado' },
      { name: 'capacidad_esperada', sqlType: 'INTEGER', nullable: false, description: 'Aforo o asistencia proyectada' },
    ],
    indexes: ['idx_eventos_fecha (fecha DESC)', 'idx_eventos_tipo (tipo)', 'idx_eventos_ministerio (ministerio_id)'],
  },
  {
    tableName: 'asistencias',
    firestoreCollection: '/attendances/{attendanceId}',
    displayName: 'Registros de Asistencia',
    category: 'Operación y Asistencia',
    purpose: 'Tabla transaccional que vincula cada evento con los miembros y visitantes presentes para medir retención y seguimiento.',
    excelOriginHint: 'Hojas: "Asistencia", "Control Dominical", "Lista de Cultos", "Visitantes"',
    fields: [
      { name: 'id', sqlType: 'VARCHAR(128)', keyType: 'PK', nullable: false, description: 'Identificador del registro de asistencia' },
      { name: 'evento_id', sqlType: 'VARCHAR(128)', keyType: 'FK', nullable: false, references: 'eventos(id)', description: 'Culto o actividad correspondiente' },
      { name: 'miembro_id', sqlType: 'VARCHAR(128)', keyType: 'FK', nullable: true, references: 'miembros(id)', description: 'Miembro registrado (NULL si es visitante ocasional)' },
      { name: 'nombre_asistente', sqlType: 'VARCHAR(160)', nullable: false, description: 'Nombre visible del asistente o visitante' },
      { name: 'fecha', sqlType: 'DATE', nullable: false, description: 'Fecha de asistencia' },
      { name: 'tipo_asistente', sqlType: 'VARCHAR(24)', nullable: false, description: 'Miembro, Visitante o Primera Vez' },
      { name: 'presente', sqlType: 'BOOLEAN', nullable: false, description: 'Confirmación de asistencia' },
      { name: 'observaciones', sqlType: 'VARCHAR(400)', nullable: true, description: 'Notas de seguimiento o contacto inicial' },
    ],
    indexes: [
      'idx_asistencias_evento (evento_id)',
      'idx_asistencias_miembro (miembro_id)',
      'idx_asistencias_fecha (fecha DESC)',
    ],
  },
  {
    tableName: 'personal_administrativo',
    firestoreCollection: '/staff/{uid}',
    displayName: 'Personal y Control de Acceso (RBAC)',
    category: 'Seguridad y Excel',
    purpose: 'Administra los permisos del pastor, secretaría y líderes de ministerio con autenticación Google.',
    excelOriginHint: 'Gestión interna del sistema',
    fields: [
      { name: 'uid', sqlType: 'VARCHAR(128)', keyType: 'PK', nullable: false, description: 'UID autenticado de Firebase Auth' },
      { name: 'display_name', sqlType: 'VARCHAR(120)', nullable: false, description: 'Nombre del usuario administrativo' },
      { name: 'email', sqlType: 'VARCHAR(180)', keyType: 'UQ', nullable: false, description: 'Correo institucional verificado' },
      { name: 'role', sqlType: 'VARCHAR(24)', nullable: false, description: 'pastor, secretaria, lider, consulta' },
      { name: 'active', sqlType: 'BOOLEAN', nullable: false, description: 'Control de acceso activo/revocado' },
    ],
    indexes: ['idx_staff_email (email)', 'idx_staff_role (role)'],
  },
  {
    tableName: 'planillas_personalizadas',
    firestoreCollection: '/customSheets/{sheetId}/rows/{rowId}',
    displayName: 'Hojas Excel Adicionales',
    category: 'Seguridad y Excel',
    purpose: 'Preserva cualquier hoja auxiliar del libro de la secretaría (ej. inventario, escuela dominical, visitas, actas) sin perder columnas.',
    excelOriginHint: 'Cualquier otra pestaña adicional dentro del archivo .xlsx',
    fields: [
      { name: 'id', sqlType: 'VARCHAR(128)', keyType: 'PK', nullable: false, description: 'Identificador de la hoja importada' },
      { name: 'nombre_hoja', sqlType: 'VARCHAR(120)', nullable: false, description: 'Nombre original de la pestaña de Excel' },
      { name: 'archivo_origen', sqlType: 'VARCHAR(180)', nullable: false, description: 'Nombre del archivo .xlsx importado' },
      { name: 'columnas', sqlType: 'JSONB', nullable: false, description: 'Lista ordenada de encabezados (máx. 40)' },
      { name: 'total_filas', sqlType: 'INTEGER', nullable: false, description: 'Conteo total de registros importados' },
    ],
    indexes: ['idx_custom_sheets_nombre (nombre_hoja)'],
  },
];

export const RELATIONAL_LINKS: SchemaRelationshipSpec[] = [
  {
    fromTable: 'miembros',
    fromColumn: 'familia_id',
    toTable: 'familias',
    toColumn: 'id',
    cardinality: 'N:1',
    description: 'Varios miembros pertenecen a un mismo núcleo familiar/hogar.',
  },
  {
    fromTable: 'miembros',
    fromColumn: 'ministerio_id',
    toTable: 'ministerios',
    toColumn: 'id',
    cardinality: 'N:1',
    description: 'Cada miembro puede servir en un ministerio principal.',
  },
  {
    fromTable: 'eventos',
    fromColumn: 'ministerio_id',
    toTable: 'ministerios',
    toColumn: 'id',
    cardinality: 'N:1',
    description: 'Un ministerio puede organizar múltiples cultos, reuniones o actividades.',
  },
  {
    fromTable: 'asistencias',
    fromColumn: 'evento_id',
    toTable: 'eventos',
    toColumn: 'id',
    cardinality: 'N:1',
    description: 'Cada culto o evento agrupa múltiples registros individuales de asistencia.',
  },
  {
    fromTable: 'asistencias',
    fromColumn: 'miembro_id',
    toTable: 'miembros',
    toColumn: 'id',
    cardinality: 'N:1',
    description: 'Un miembro tiene un historial acumulativo de asistencias (NULL para visitantes sin ficha).',
  },
];

export function generatePostgresDDL(): string {
  const statements = RELATIONAL_TABLES.map((table) => {
    const colLines = table.fields.map((f) => {
      const parts = [`  ${f.name} ${f.sqlType}`];
      if (f.keyType === 'PK') parts.push('PRIMARY KEY');
      if (f.keyType === 'UQ') parts.push('UNIQUE');
      if (!f.nullable && f.keyType !== 'PK') parts.push('NOT NULL');
      if (f.references) parts.push(`REFERENCES ${f.references} ON DELETE SET NULL`);
      return parts.join(' ');
    });
    const idxLines = table.indexes.map((idx) => {
      const match = idx.match(/^(\S+)\s*\((.+)\)$/);
      if (!match) return '';
      return `CREATE INDEX IF NOT EXISTS ${match[1]} ON ${table.tableName} (${match[2]});`;
    }).filter(Boolean);

    return `CREATE TABLE IF NOT EXISTS ${table.tableName} (\n${colLines.join(',\n')}\n);\n${idxLines.join('\n')}`;
  });

  return `-- Esquema Relacional Normalizado (3FN) — Ekklesia Registro\n-- Compatible con PostgreSQL y sincronizado con Cloud Firestore\n\n${statements.join('\n\n')}`;
}

export interface ChurchDashboardMetrics {
  totalMembers: number;
  activeMembers: number;
  visitorsAndNew: number;
  baptizedMembers: number;
  baptizedRatePercent: number;
  discipledMembers: number;
  transferredMembers: number;
  totalFamilies: number;
  activeMinistries: number;
  membersInMinistries: number;
  upcomingEventsCount: number;
  averageAttendance: number;
  membersByMinistry: { ministerioId: string; nombre: string; categoria: string; count: number }[];
  attendanceByEvent: { eventoId: string; titulo: string; fecha: string; presentes: number; visitantes: number }[];
}

export function computeChurchMetrics(data: {
  members: Member[];
  families: Family[];
  ministries: Ministry[];
  events: ChurchEvent[];
  attendances: AttendanceRecord[];
}): ChurchDashboardMetrics {
  const { members, families, ministries, events, attendances } = data;
  const totalMembers = members.length;
  const activeMembers = members.filter((m) => m.estadoMembresia === 'Activo').length;
  const visitorsAndNew = members.filter(
    (m) =>
      m.estadoMembresia === 'Visitante' ||
      m.estadoMembresia === 'Nuevo Creyente' ||
      m.estadoMembresia === 'En Discipulado'
  ).length;
  const baptizedMembers = members.filter((m) => m.bautizado).length;
  const baptizedRatePercent = totalMembers > 0 ? Math.round((baptizedMembers / totalMembers) * 100) : 0;
  const discipledMembers = members.filter((m) => m.discipuladoEstado === 'SI').length;
  const transferredMembers = members.filter((m) => m.procedenciaTipo === 'Transferido').length;

  const upcomingEventsCount = events.filter(
    (e) => e.estado === 'Programado' || e.estado === 'En Curso'
  ).length;

  const attendanceByEventMap = new Map<string, { presentes: number; visitantes: number }>();
  for (const rec of attendances) {
    if (!rec.presente) continue;
    const current = attendanceByEventMap.get(rec.eventoId) ?? { presentes: 0, visitantes: 0 };
    current.presentes += 1;
    if (rec.tipoAsistente === 'Visitante' || rec.tipoAsistente === 'Primera Vez') {
      current.visitantes += 1;
    }
    attendanceByEventMap.set(rec.eventoId, current);
  }

  const attendanceByEvent = events
    .map((ev) => {
      const counts = attendanceByEventMap.get(ev.id) ?? { presentes: 0, visitantes: 0 };
      return {
        eventoId: ev.id,
        titulo: ev.titulo,
        fecha: ev.fecha,
        presentes: counts.presentes,
        visitantes: counts.visitantes,
      };
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  const eventsWithAttendance = attendanceByEvent.filter((e) => e.presentes > 0);
  const averageAttendance =
    eventsWithAttendance.length > 0
      ? Math.round(
          eventsWithAttendance.reduce((sum, e) => sum + e.presentes, 0) / eventsWithAttendance.length
        )
      : 0;

  const memberCountByMinistry = new Map<string, number>();
  let membersInMinistries = 0;
  for (const m of members) {
    if (m.ministerioId) {
      membersInMinistries += 1;
      memberCountByMinistry.set(m.ministerioId, (memberCountByMinistry.get(m.ministerioId) ?? 0) + 1);
    }
  }

  const membersByMinistry = ministries
    .filter((min) => min.activo)
    .map((min) => ({
      ministerioId: min.id,
      nombre: min.nombre,
      categoria: min.categoria,
      count: memberCountByMinistry.get(min.id) ?? 0,
    }))
    .sort((a, b) => b.count - a.count || a.nombre.localeCompare(b.nombre));

  return {
    totalMembers,
    activeMembers,
    visitorsAndNew,
    baptizedMembers,
    baptizedRatePercent,
    discipledMembers,
    transferredMembers,
    totalFamilies: families.length,
    activeMinistries: ministries.filter((m) => m.activo).length,
    membersInMinistries,
    upcomingEventsCount,
    averageAttendance,
    membersByMinistry,
    attendanceByEvent,
  };
}
