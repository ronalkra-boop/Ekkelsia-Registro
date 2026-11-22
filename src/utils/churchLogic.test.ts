import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  calculateAgeFromDate,
  validateAttendanceInput,
  validateEventInput,
  validateMemberInput,
} from './validation';
import {
  computeChurchMetrics,
  generatePostgresDDL,
  RELATIONAL_TABLES,
} from './relationalSchema';
import {
  analyzeWorkbookBuffer,
  exportDatabaseToExcelBuffer,
  generateChurchTemplateWorkbookBuffer,
  mapExcelRowsToEntities,
} from './excelAnalyzer';
import {
  SEED_ATTENDANCES,
  SEED_EVENTS,
  SEED_FAMILIES,
  SEED_MEMBERS,
  SEED_MINISTRIES,
} from '../data/seedData';

test('validateMemberInput catches empty required fields and invalid email', () => {
  const errs = validateMemberInput({
    nombres: '',
    apellidos: '   ',
    codigoMiembro: '',
    email: 'correo-invalido',
  });
  assert.ok(errs.nombres);
  assert.ok(errs.apellidos);
  assert.ok(errs.codigoMiembro);
  assert.ok(errs.email);

  const ok = validateMemberInput({
    nombres: 'Laura',
    apellidos: 'Campos',
    codigoMiembro: 'IBM-099',
    email: 'laura@iglesia.org',
    bautizado: true,
    fechaNacimiento: '1990-01-01',
    fechaBautismo: '2015-06-12',
  });
  assert.deepEqual(ok, {});
});

test('calculateAgeFromDate computes clean ages and guards invalid Excel formulas', () => {
  const ref = new Date('2026-11-21T12:00:00Z');
  assert.equal(calculateAgeFromDate('1986-07-05', ref), 40);
  assert.equal(calculateAgeFromDate('2000-04-08', ref), 26);
  assert.equal(calculateAgeFromDate('2011-11-27', ref), 14);
  assert.equal(calculateAgeFromDate('', ref), null);
  assert.equal(calculateAgeFromDate('#VALUE!', ref), null);
  assert.equal(calculateAgeFromDate('1899-12-30', ref), null);
});

test('validateAttendanceInput requires valid event id, attendee name, and date', () => {
  const errs = validateAttendanceInput({
    eventoId: '',
    nombreAsistente: '   ',
    fecha: '',
  });
  assert.ok(errs.eventoId);
  assert.ok(errs.nombreAsistente);
  assert.ok(errs.fecha);

  const valid = validateAttendanceInput({
    eventoId: 'evt_culto_nov15',
    nombreAsistente: 'Ronal Jose Nuñez Muñoz',
    fecha: '2026-11-20',
  });
  assert.deepEqual(valid, {});
});

test('validateEventInput validates title, date, and capacity', () => {
  const bad = validateEventInput({ titulo: '', fecha: '', capacidadEsperada: -10 });
  assert.ok(bad.titulo);
  assert.ok(bad.fecha);
  assert.ok(bad.capacidadEsperada);
});

test('computeChurchMetrics calculates relational KPIs accurately for IBM Casa de Dios seed', () => {
  assert.equal(SEED_MEMBERS.length, 60);
  assert.equal(SEED_FAMILIES.length, 13);
  assert.equal(SEED_MINISTRIES.length, 10);

  const metrics = computeChurchMetrics({
    members: SEED_MEMBERS,
    families: SEED_FAMILIES,
    ministries: SEED_MINISTRIES,
    events: SEED_EVENTS,
    attendances: SEED_ATTENDANCES,
  });

  assert.equal(metrics.totalMembers, 60);
  assert.equal(metrics.totalFamilies, 13);
  assert.equal(metrics.activeMinistries, 10);
  assert.ok(metrics.discipledMembers >= 40);
  assert.ok(metrics.transferredMembers >= 20);
  assert.ok(metrics.membersInMinistries > 0);
  assert.ok(metrics.averageAttendance >= 10);
  assert.equal(metrics.membersByMinistry.length, 10);
});

test('generatePostgresDDL includes all 7 relational tables, IBM columns, and excludes donaciones', () => {
  assert.equal(RELATIONAL_TABLES.length, 7);
  const ddl = generatePostgresDDL();
  for (const table of RELATIONAL_TABLES) {
    assert.ok(ddl.includes(`CREATE TABLE IF NOT EXISTS ${table.tableName}`));
  }
  assert.ok(!ddl.includes('CREATE TABLE IF NOT EXISTS donaciones'));
  assert.ok(ddl.includes('barrio VARCHAR(100)'));
  assert.ok(ddl.includes('tipo_documento VARCHAR(16)'));
  assert.ok(ddl.includes('discipulado_estado VARCHAR(16)'));
  assert.ok(ddl.includes('REFERENCES familias(id)'));
  assert.ok(ddl.includes('REFERENCES eventos(id)'));
});

test('BASE_DE_DATOS_2026 CSV is analyzed and mapped cleanly across all 60 real records', () => {
  const csvPath = path.resolve(process.cwd(), 'public/assets/aistudio/BASE_DE_DATOS_2026_ae4e50d8');
  const nodeBuf = fs.readFileSync(csvPath);
  const arrayBuf = nodeBuf.buffer.slice(nodeBuf.byteOffset, nodeBuf.byteOffset + nodeBuf.byteLength);

  const analysis = analyzeWorkbookBuffer(arrayBuf, 'BASE_DE_DATOS_2026.csv');
  assert.equal(analysis.sheets.length, 1);

  const sheet = analysis.sheets[0];
  assert.equal(sheet.suggestedTarget, 'miembros');
  assert.equal(sheet.columns.length, 18);
  assert.equal(sheet.rowCount, 60);

  const mapped = mapExcelRowsToEntities({
    sheet,
    target: 'miembros',
    ownerUid: 'u_test',
    existingFamilies: SEED_FAMILIES,
    existingMinistries: SEED_MINISTRIES,
    existingMembers: [],
    existingEvents: SEED_EVENTS,
    fileName: 'BASE_DE_DATOS_2026.csv',
  });

  assert.equal(mapped.members.length, 60);

  // Verify Pastor Ronal (row 41)
  const pastor = mapped.members.find((m) => m.documentoIdentidad === '1064787971');
  assert.ok(pastor);
  assert.equal(pastor.tipoDocumento, 'CC');
  assert.equal(pastor.barrio, 'Leandro Diaz 2');
  assert.equal(pastor.fechaNacimiento, '1986-07-05');
  assert.equal(pastor.procedenciaTipo, 'Transferido');
  assert.equal(pastor.discipuladoEstado, 'SI');
  assert.equal(pastor.estadoMembresia, 'Activo');
  assert.equal(pastor.familiaId, 'fam_nunez_lara');

  // Verify typo normalization ("Trnsferido " on Angel David, "Tranferido" on Herminia, "Transmitido" on Luz Vega)
  const angel = mapped.members.find((m) => m.documentoIdentidad === '1127605914');
  assert.ok(angel);
  assert.equal(angel.procedenciaTipo, 'Transferido');
  assert.equal(angel.cargo, 'Pianista');

  const herminia = mapped.members.find((m) => m.documentoIdentidad === '22408132');
  assert.ok(herminia);
  assert.equal(herminia.procedenciaTipo, 'Transferido');

  const luzVega = mapped.members.find((m) => m.documentoIdentidad === '26945089');
  assert.ok(luzVega);
  assert.equal(luzVega.procedenciaTipo, 'Transferido');

  // Verify unnumbered row Luz Karina Lopez Garcia was captured
  const luzKarina = mapped.members.find((m) => m.documentoIdentidad === '100326514');
  assert.ok(luzKarina);
  assert.equal(luzKarina.barrio, 'Paramo');

  // Verify Malory ("Proceso" -> En Proceso -> En Discipulado)
  const malory = mapped.members.find((m) => m.nombres === 'Malory');
  assert.ok(malory);
  assert.equal(malory.discipuladoEstado, 'En Proceso');
  assert.equal(malory.estadoMembresia, 'En Discipulado');

  // Verify partial dates preserved in notasPastorales and no #VALUE! in fechaNacimiento
  const alexis = mapped.members.find((m) => m.nombres === 'Alexis');
  assert.ok(alexis);
  assert.equal(alexis.fechaNacimiento, '');
  assert.ok(alexis.notasPastorales.includes('10/01/'));

  for (const m of mapped.members) {
    assert.ok(!m.fechaNacimiento.includes('#VALUE!'));
    assert.ok(!m.fechaNacimiento.includes('127'));
  }
});

test('Excel workbook template generation, analysis, and relational mapping round-trip', () => {
  const templateBuf = generateChurchTemplateWorkbookBuffer();
  const analysis = analyzeWorkbookBuffer(templateBuf, 'plantilla_secretaria.xlsx');

  assert.equal(analysis.sheets.length, 4);
  const membersSheet = analysis.sheets.find((s) => s.sheetName === 'Miembros');
  const familiesSheet = analysis.sheets.find((s) => s.sheetName === 'Familias');
  const eventsSheet = analysis.sheets.find((s) => s.sheetName === 'Eventos');

  assert.ok(membersSheet);
  assert.equal(membersSheet.suggestedTarget, 'miembros');
  assert.equal(membersSheet.rowCount, 2);

  assert.ok(familiesSheet);
  assert.equal(familiesSheet.suggestedTarget, 'familias');

  assert.ok(eventsSheet);
  assert.equal(eventsSheet.suggestedTarget, 'eventos');

  const mappedFamilies = mapExcelRowsToEntities({
    sheet: familiesSheet,
    target: 'familias',
    ownerUid: 'u1',
    existingFamilies: [],
    existingMinistries: [],
    existingMembers: [],
    existingEvents: [],
    fileName: 'plantilla_secretaria.xlsx',
  });
  assert.equal(mappedFamilies.families.length, 2);

  const mappedMembers = mapExcelRowsToEntities({
    sheet: membersSheet,
    target: 'miembros',
    ownerUid: 'u1',
    existingFamilies: mappedFamilies.families,
    existingMinistries: SEED_MINISTRIES,
    existingMembers: SEED_MEMBERS,
    existingEvents: SEED_EVENTS,
    fileName: 'plantilla_secretaria.xlsx',
  });
  assert.equal(mappedMembers.members.length, 2);
  assert.equal(mappedMembers.members[0].familiaId, mappedFamilies.families[0].id);

  const exportedBuf = exportDatabaseToExcelBuffer({
    members: SEED_MEMBERS,
    families: SEED_FAMILIES,
    ministries: SEED_MINISTRIES,
    events: SEED_EVENTS,
    attendances: SEED_ATTENDANCES,
    customSheets: [],
  });
  const exportedAnalysis = analyzeWorkbookBuffer(exportedBuf, 'exportado.xlsx');
  assert.equal(exportedAnalysis.sheets.length, 5);
});
