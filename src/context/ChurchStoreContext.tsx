import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleAuthProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  SEED_ATTENDANCES,
  SEED_EVENTS,
  SEED_FAMILIES,
  SEED_MEMBERS,
  SEED_MINISTRIES,
  SEED_STAFF,
} from '../data/seedData';
import type {
  AttendanceRecord,
  ChurchEvent,
  CustomSheet,
  CustomSheetRow,
  Family,
  Member,
  Ministry,
  StaffProfile,
  StaffRole,
} from '../types/church';
import { generateSafeId, sanitizeMemberPayload } from '../utils/validation';

const BOOTSTRAPPED_ADMIN_EMAIL = 'ronalkra@gmail.com';

interface ChurchStoreContextValue {
  user: User | null;
  authReady: boolean;
  isCloudMode: boolean;
  syncingCloud: boolean;
  activeRole: StaffRole;
  setPreviewRole: (role: StaffRole) => void;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  seedCloudWorkspace: () => Promise<void>;

  families: Family[];
  ministries: Ministry[];
  members: Member[];
  events: ChurchEvent[];
  attendances: AttendanceRecord[];
  customSheets: CustomSheet[];
  staffList: StaffProfile[];

  saveFamily: (data: Omit<Family, 'id' | 'ownerUid' | 'createdAt' | 'updatedAt'>, existingId?: string) => Promise<Family>;
  deleteFamily: (id: string) => Promise<void>;

  saveMinistry: (data: Omit<Ministry, 'id' | 'ownerUid' | 'createdAt' | 'updatedAt'>, existingId?: string) => Promise<Ministry>;
  deleteMinistry: (id: string) => Promise<void>;

  saveMember: (data: Omit<Member, 'id' | 'ownerUid' | 'createdAt' | 'updatedAt'>, existingId?: string) => Promise<Member>;
  deleteMember: (id: string) => Promise<void>;

  saveEvent: (data: Omit<ChurchEvent, 'id' | 'ownerUid' | 'createdAt' | 'updatedAt'>, existingId?: string) => Promise<ChurchEvent>;
  deleteEvent: (id: string) => Promise<void>;

  saveAttendance: (data: Omit<AttendanceRecord, 'id' | 'ownerUid' | 'createdAt' | 'updatedAt'>, existingId?: string) => Promise<AttendanceRecord>;
  toggleMemberAttendance: (eventoId: string, member: Member, fecha: string) => Promise<void>;
  deleteAttendance: (id: string) => Promise<void>;

  importEntitiesBatch: (payload: {
    families: Family[];
    ministries: Ministry[];
    members: Member[];
    events: ChurchEvent[];
    attendances: AttendanceRecord[];
    customSheets: CustomSheet[];
  }) => Promise<number>;
  deleteCustomSheet: (sheetId: string) => Promise<void>;

  feedbackBanner: { type: 'success' | 'error'; message: string } | null;
  clearFeedback: () => void;
}

const ChurchStoreContext = createContext<ChurchStoreContextValue | null>(null);

function tsToIso(val: unknown): string {
  if (val && typeof val === 'object' && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return typeof val === 'string' ? val : new Date().toISOString();
}

export function ChurchStoreProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [previewRole, setPreviewRole] = useState<StaffRole>('pastor');
  const [cloudRole, setCloudRole] = useState<StaffRole>('pastor');
  const [feedbackBanner, setFeedbackBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [families, setFamilies] = useState<Family[]>(SEED_FAMILIES);
  const [ministries, setMinistries] = useState<Ministry[]>(SEED_MINISTRIES);
  const [members, setMembers] = useState<Member[]>(SEED_MEMBERS);
  const [events, setEvents] = useState<ChurchEvent[]>(SEED_EVENTS);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>(SEED_ATTENDANCES);
  const [customSheets, setCustomSheets] = useState<CustomSheet[]>([]);
  const [staffList, setStaffList] = useState<StaffProfile[]>(SEED_STAFF);

  const isCloudMode = Boolean(user && user.emailVerified);
  const currentOwnerUid = user?.uid ?? 'demo_church_owner';

  const notify = useCallback((type: 'success' | 'error', message: string) => {
    setFeedbackBanner({ type, message });
  }, []);

  const clearFeedback = useCallback(() => setFeedbackBanner(null), []);

  useEffect(() => {
    if (!feedbackBanner || feedbackBanner.type !== 'success') return;
    const timer = window.setTimeout(() => setFeedbackBanner(null), 5000);
    return () => window.clearTimeout(timer);
  }, [feedbackBanner]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);

      if (!nextUser) {
        setFamilies(SEED_FAMILIES);
        setMinistries(SEED_MINISTRIES);
        setMembers(SEED_MEMBERS);
        setEvents(SEED_EVENTS);
        setAttendances(SEED_ATTENDANCES);
        setCustomSheets([]);
        setStaffList(SEED_STAFF);
        return;
      }

      if (nextUser.emailVerified) {
        const isBootAdmin = nextUser.email === BOOTSTRAPPED_ADMIN_EMAIL;
        const staffRef = doc(db, 'staff', nextUser.uid);
        try {
          const snap = await getDoc(staffRef);
          if (snap.exists()) {
            const data = snap.data() as StaffProfile;
            setCloudRole(isBootAdmin ? 'pastor' : data.role);
          } else {
            const assignedRole: StaffRole = isBootAdmin ? 'pastor' : 'consulta';
            await setDoc(staffRef, {
              uid: nextUser.uid,
              displayName: (nextUser.displayName || nextUser.email || 'Usuario').slice(0, 120),
              email: (nextUser.email || '').slice(0, 180),
              role: assignedRole,
              active: true,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            setCloudRole(assignedRole);
          }
        } catch (err) {
          console.error('Staff profile initialization notice:', err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady || !user || !user.emailVerified) return;

    setSyncingCloud(true);
    const uid = user.uid;
    const isBootAdmin = user.email === BOOTSTRAPPED_ADMIN_EMAIL;

    const buildQuery = (colName: string) =>
      isBootAdmin
        ? collection(db, colName)
        : query(collection(db, colName), where('ownerUid', '==', uid));

    const unsubs: Unsubscribe[] = [];

    unsubs.push(
      onSnapshot(
        buildQuery('families'),
        (snap) => {
          setFamilies(
            snap.docs.map((d) => ({
              ...(d.data() as Omit<Family, 'id'>),
              id: d.id,
              createdAt: tsToIso(d.data().createdAt),
              updatedAt: tsToIso(d.data().updatedAt),
            }))
          );
          setSyncingCloud(false);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'families')
      )
    );

    unsubs.push(
      onSnapshot(
        buildQuery('ministries'),
        (snap) => {
          setMinistries(
            snap.docs.map((d) => ({
              ...(d.data() as Omit<Ministry, 'id'>),
              id: d.id,
              createdAt: tsToIso(d.data().createdAt),
              updatedAt: tsToIso(d.data().updatedAt),
            }))
          );
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'ministries')
      )
    );

    unsubs.push(
      onSnapshot(
        buildQuery('members'),
        (snap) => {
          setMembers(
            snap.docs.map((d) => {
              const raw = d.data() as Partial<Omit<Member, 'id'>>;
              return {
                ownerUid: raw.ownerUid ?? uid,
                codigoMiembro: raw.codigoMiembro ?? '',
                nombres: raw.nombres ?? '',
                apellidos: raw.apellidos ?? '',
                tipoDocumento: raw.tipoDocumento ?? 'CC',
                documentoIdentidad: raw.documentoIdentidad ?? '',
                fechaNacimiento: raw.fechaNacimiento ?? '',
                genero: raw.genero ?? 'No especificado',
                estadoCivil: raw.estadoCivil ?? 'No especificado',
                telefono: raw.telefono ?? '',
                email: raw.email ?? '',
                direccion: raw.direccion ?? '',
                barrio: raw.barrio ?? '',
                profesionOcupacion: raw.profesionOcupacion ?? '',
                procedenciaTipo: raw.procedenciaTipo ?? 'No especificado',
                iglesiaProcedencia: raw.iglesiaProcedencia ?? '',
                lugarProcedencia: raw.lugarProcedencia ?? '',
                discipuladoEstado: raw.discipuladoEstado ?? 'NO',
                cargo: raw.cargo ?? '',
                familiaId: raw.familiaId ?? '',
                rolFamiliar: raw.rolFamiliar ?? '',
                estadoMembresia: raw.estadoMembresia ?? 'Activo',
                bautizado: Boolean(raw.bautizado),
                fechaBautismo: raw.fechaBautismo ?? '',
                fechaIngreso: raw.fechaIngreso ?? '',
                ministerioId: raw.ministerioId ?? '',
                notasPastorales: raw.notasPastorales ?? '',
                id: d.id,
                createdAt: tsToIso(d.data().createdAt),
                updatedAt: tsToIso(d.data().updatedAt),
              };
            })
          );
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'members')
      )
    );

    unsubs.push(
      onSnapshot(
        buildQuery('events'),
        (snap) => {
          setEvents(
            snap.docs.map((d) => ({
              ...(d.data() as Omit<ChurchEvent, 'id'>),
              id: d.id,
              createdAt: tsToIso(d.data().createdAt),
              updatedAt: tsToIso(d.data().updatedAt),
            }))
          );
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'events')
      )
    );

    unsubs.push(
      onSnapshot(
        buildQuery('attendances'),
        (snap) => {
          setAttendances(
            snap.docs.map((d) => ({
              ...(d.data() as Omit<AttendanceRecord, 'id'>),
              id: d.id,
              createdAt: tsToIso(d.data().createdAt),
              updatedAt: tsToIso(d.data().updatedAt),
            }))
          );
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'attendances')
      )
    );

    const staffQuery = isBootAdmin
      ? collection(db, 'staff')
      : query(collection(db, 'staff'), where('uid', '==', uid));
    unsubs.push(
      onSnapshot(
        staffQuery,
        (snap) => {
          setStaffList(
            snap.docs.map((d) => ({
              ...(d.data() as StaffProfile),
              uid: d.id,
              createdAt: tsToIso(d.data().createdAt),
              updatedAt: tsToIso(d.data().updatedAt),
            }))
          );
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'staff')
      )
    );

    unsubs.push(
      onSnapshot(
        buildQuery('customSheets'),
        (snap) => {
          const sheets = snap.docs.map((d) => ({
            id: d.id,
            ownerUid: String(d.data().ownerUid || uid),
            nombreHoja: String(d.data().nombreHoja || d.id),
            archivoOrigen: String(d.data().archivoOrigen || ''),
            columnas: Array.isArray(d.data().columnas) ? (d.data().columnas as string[]) : [],
            totalFilas: Number(d.data().totalFilas || 0),
            rows: [] as CustomSheetRow[],
            createdAt: tsToIso(d.data().createdAt),
            updatedAt: tsToIso(d.data().updatedAt),
          }));
          setCustomSheets(sheets);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'customSheets')
      )
    );

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [authReady, user]);

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
      notify('success', 'Sesión iniciada con Google. Sincronización en tiempo real activa.');
    } catch (error) {
      notify(
        'error',
        error instanceof Error ? `No se pudo iniciar sesión: ${error.message}` : 'Error al iniciar sesión.'
      );
    }
  }, [notify]);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
    notify('success', 'Sesión cerrada. Regresaste al entorno local de demostración.');
  }, [notify]);

  const saveFamily = useCallback(
    async (data: Omit<Family, 'id' | 'ownerUid' | 'createdAt' | 'updatedAt'>, existingId?: string) => {
      const id = existingId || generateSafeId('fam');
      const record: Family = { ...data, id, ownerUid: currentOwnerUid };

      if (!isCloudMode) {
        setFamilies((prev) =>
          existingId ? prev.map((f) => (f.id === id ? record : f)) : [record, ...prev]
        );
        notify('success', existingId ? 'Familia actualizada.' : 'Familia registrada correctamente.');
        return record;
      }

      const ref = doc(db, 'families', id);
      try {
        if (existingId) {
          await updateDoc(ref, {
            apellidoFamilia: data.apellidoFamilia,
            direccion: data.direccion,
            ciudad: data.ciudad,
            telefonoHogar: data.telefonoHogar,
            jefeHogarNombre: data.jefeHogarNombre,
            notas: data.notas,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(ref, {
            ...data,
            ownerUid: currentOwnerUid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        notify('success', existingId ? 'Familia actualizada en la nube.' : 'Familia registrada en tiempo real.');
        return record;
      } catch (err) {
        handleFirestoreError(err, existingId ? OperationType.UPDATE : OperationType.CREATE, `families/${id}`);
      }
    },
    [currentOwnerUid, isCloudMode, notify]
  );

  const deleteFamily = useCallback(
    async (id: string) => {
      if (!isCloudMode) {
        setFamilies((prev) => prev.filter((f) => f.id !== id));
        setMembers((prev) => prev.map((m) => (m.familiaId === id ? { ...m, familiaId: '' } : m)));
        notify('success', 'Familia eliminada.');
        return;
      }
      try {
        await deleteDoc(doc(db, 'families', id));
        notify('success', 'Familia eliminada de la base de datos.');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `families/${id}`);
      }
    },
    [isCloudMode, notify]
  );

  const saveMinistry = useCallback(
    async (data: Omit<Ministry, 'id' | 'ownerUid' | 'createdAt' | 'updatedAt'>, existingId?: string) => {
      const id = existingId || generateSafeId('min');
      const record: Ministry = { ...data, id, ownerUid: currentOwnerUid };

      if (!isCloudMode) {
        setMinistries((prev) =>
          existingId ? prev.map((m) => (m.id === id ? record : m)) : [record, ...prev]
        );
        notify('success', existingId ? 'Ministerio actualizado.' : 'Ministerio creado.');
        return record;
      }

      const ref = doc(db, 'ministries', id);
      try {
        if (existingId) {
          await updateDoc(ref, {
            nombre: data.nombre,
            categoria: data.categoria,
            descripcion: data.descripcion,
            liderNombre: data.liderNombre,
            diaReunion: data.diaReunion,
            horario: data.horario,
            ubicacion: data.ubicacion,
            activo: data.activo,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(ref, {
            ...data,
            ownerUid: currentOwnerUid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        notify('success', existingId ? 'Ministerio actualizado.' : 'Ministerio registrado.');
        return record;
      } catch (err) {
        handleFirestoreError(err, existingId ? OperationType.UPDATE : OperationType.CREATE, `ministries/${id}`);
      }
    },
    [currentOwnerUid, isCloudMode, notify]
  );

  const deleteMinistry = useCallback(
    async (id: string) => {
      if (!isCloudMode) {
        setMinistries((prev) => prev.filter((m) => m.id !== id));
        setMembers((prev) => prev.map((m) => (m.ministerioId === id ? { ...m, ministerioId: '' } : m)));
        notify('success', 'Ministerio eliminado.');
        return;
      }
      try {
        await deleteDoc(doc(db, 'ministries', id));
        notify('success', 'Ministerio eliminado.');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `ministries/${id}`);
      }
    },
    [isCloudMode, notify]
  );

  const saveMember = useCallback(
    async (data: Omit<Member, 'id' | 'ownerUid' | 'createdAt' | 'updatedAt'>, existingId?: string) => {
      const id = existingId || generateSafeId('mem');
      const sanitized = sanitizeMemberPayload({ ...data, ownerUid: currentOwnerUid });
      const record: Member = { ...sanitized, id };

      if (!isCloudMode) {
        setMembers((prev) =>
          existingId ? prev.map((m) => (m.id === id ? record : m)) : [record, ...prev]
        );
        notify('success', existingId ? 'Ficha de miembro actualizada.' : 'Nuevo miembro registrado.');
        return record;
      }

      const ref = doc(db, 'members', id);
      try {
        if (existingId) {
          const { ownerUid: _ignoreOwner, ...updatable } = sanitized;
          await updateDoc(ref, {
            ...updatable,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(ref, {
            ...sanitized,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        notify('success', existingId ? 'Miembro actualizado en tiempo real.' : 'Miembro registrado en tiempo real.');
        return record;
      } catch (err) {
        handleFirestoreError(err, existingId ? OperationType.UPDATE : OperationType.CREATE, `members/${id}`);
      }
    },
    [currentOwnerUid, isCloudMode, notify]
  );

  const deleteMember = useCallback(
    async (id: string) => {
      if (!isCloudMode) {
        setMembers((prev) => prev.filter((m) => m.id !== id));
        notify('success', 'Miembro eliminado del registro.');
        return;
      }
      try {
        await deleteDoc(doc(db, 'members', id));
        notify('success', 'Miembro eliminado del registro.');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `members/${id}`);
      }
    },
    [isCloudMode, notify]
  );

  const saveEvent = useCallback(
    async (data: Omit<ChurchEvent, 'id' | 'ownerUid' | 'createdAt' | 'updatedAt'>, existingId?: string) => {
      const id = existingId || generateSafeId('evt');
      const record: ChurchEvent = { ...data, id, ownerUid: currentOwnerUid };

      if (!isCloudMode) {
        setEvents((prev) =>
          existingId ? prev.map((e) => (e.id === id ? record : e)) : [record, ...prev]
        );
        notify('success', existingId ? 'Evento actualizado.' : 'Culto / evento programado.');
        return record;
      }

      const ref = doc(db, 'events', id);
      try {
        if (existingId) {
          await updateDoc(ref, {
            titulo: data.titulo,
            tipo: data.tipo,
            fecha: data.fecha,
            horaInicio: data.horaInicio,
            horaFin: data.horaFin,
            ubicacion: data.ubicacion,
            responsableNombre: data.responsableNombre,
            ministerioId: data.ministerioId,
            estado: data.estado,
            capacidadEsperada: data.capacidadEsperada,
            descripcion: data.descripcion,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(ref, {
            ...data,
            ownerUid: currentOwnerUid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        notify('success', existingId ? 'Evento actualizado.' : 'Evento creado en la nube.');
        return record;
      } catch (err) {
        handleFirestoreError(err, existingId ? OperationType.UPDATE : OperationType.CREATE, `events/${id}`);
      }
    },
    [currentOwnerUid, isCloudMode, notify]
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      if (!isCloudMode) {
        setEvents((prev) => prev.filter((e) => e.id !== id));
        setAttendances((prev) => prev.filter((a) => a.eventoId !== id));
        notify('success', 'Evento eliminado.');
        return;
      }
      try {
        await deleteDoc(doc(db, 'events', id));
        notify('success', 'Evento eliminado.');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `events/${id}`);
      }
    },
    [isCloudMode, notify]
  );

  const saveAttendance = useCallback(
    async (data: Omit<AttendanceRecord, 'id' | 'ownerUid' | 'createdAt' | 'updatedAt'>, existingId?: string) => {
      const id = existingId || generateSafeId('ast');
      const record: AttendanceRecord = { ...data, id, ownerUid: currentOwnerUid };

      if (!isCloudMode) {
        setAttendances((prev) =>
          existingId ? prev.map((a) => (a.id === id ? record : a)) : [record, ...prev]
        );
        return record;
      }

      const ref = doc(db, 'attendances', id);
      try {
        if (existingId) {
          await updateDoc(ref, {
            miembroId: data.miembroId,
            nombreAsistente: data.nombreAsistente,
            fecha: data.fecha,
            tipoAsistente: data.tipoAsistente,
            presente: data.presente,
            observaciones: data.observaciones,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(ref, {
            ...data,
            ownerUid: currentOwnerUid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        return record;
      } catch (err) {
        handleFirestoreError(err, existingId ? OperationType.UPDATE : OperationType.CREATE, `attendances/${id}`);
      }
    },
    [currentOwnerUid, isCloudMode]
  );

  const toggleMemberAttendance = useCallback(
    async (eventoId: string, member: Member, fecha: string) => {
      const existing = attendances.find((a) => a.eventoId === eventoId && a.miembroId === member.id);
      if (existing) {
        await saveAttendance(
          {
            eventoId: existing.eventoId,
            miembroId: existing.miembroId,
            nombreAsistente: existing.nombreAsistente,
            fecha: existing.fecha,
            tipoAsistente: existing.tipoAsistente,
            presente: !existing.presente,
            observaciones: existing.observaciones,
          },
          existing.id
        );
      } else {
        await saveAttendance({
          eventoId,
          miembroId: member.id,
          nombreAsistente: `${member.nombres} ${member.apellidos}`,
          fecha,
          tipoAsistente: member.estadoMembresia === 'Visitante' ? 'Visitante' : 'Miembro',
          presente: true,
          observaciones: '',
        });
      }
    },
    [attendances, saveAttendance]
  );

  const deleteAttendance = useCallback(
    async (id: string) => {
      if (!isCloudMode) {
        setAttendances((prev) => prev.filter((a) => a.id !== id));
        notify('success', 'Registro de asistencia eliminado.');
        return;
      }
      try {
        await deleteDoc(doc(db, 'attendances', id));
        notify('success', 'Registro de asistencia eliminado.');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `attendances/${id}`);
      }
    },
    [isCloudMode, notify]
  );

  const importEntitiesBatch = useCallback(
    async (payload: {
      families: Family[];
      ministries: Ministry[];
      members: Member[];
      events: ChurchEvent[];
      attendances: AttendanceRecord[];
      customSheets: CustomSheet[];
    }) => {
      const totalImported =
        payload.families.length +
        payload.ministries.length +
        payload.members.length +
        payload.events.length +
        payload.attendances.length +
        payload.customSheets.reduce((sum, s) => sum + s.rows.length, 0);

      if (!isCloudMode) {
        if (payload.families.length) setFamilies((prev) => [...payload.families, ...prev]);
        if (payload.ministries.length) setMinistries((prev) => [...payload.ministries, ...prev]);
        if (payload.members.length) setMembers((prev) => [...payload.members, ...prev]);
        if (payload.events.length) setEvents((prev) => [...payload.events, ...prev]);
        if (payload.attendances.length) setAttendances((prev) => [...payload.attendances, ...prev]);
        if (payload.customSheets.length) setCustomSheets((prev) => [...payload.customSheets, ...prev]);
        notify('success', `Importación completada: ${totalImported} registros incorporados al sistema.`);
        return totalImported;
      }

      // Sequential parent-before-child writes to guarantee relational exists() rules pass
      try {
        for (const fam of payload.families) {
          const { id, createdAt: _c, updatedAt: _u, ...rest } = fam;
          await setDoc(doc(db, 'families', id), {
            ...rest,
            ownerUid: currentOwnerUid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        for (const min of payload.ministries) {
          const { id, createdAt: _c, updatedAt: _u, ...rest } = min;
          await setDoc(doc(db, 'ministries', id), {
            ...rest,
            ownerUid: currentOwnerUid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        for (const mem of payload.members) {
          const { id, createdAt: _c, updatedAt: _u, ...rest } = mem;
          await setDoc(doc(db, 'members', id), {
            ...sanitizeMemberPayload({ ...rest, ownerUid: currentOwnerUid }),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        for (const evt of payload.events) {
          const { id, createdAt: _c, updatedAt: _u, ...rest } = evt;
          await setDoc(doc(db, 'events', id), {
            ...rest,
            ownerUid: currentOwnerUid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        for (const ast of payload.attendances) {
          const { id, createdAt: _c, updatedAt: _u, ...rest } = ast;
          await setDoc(doc(db, 'attendances', id), {
            ...rest,
            ownerUid: currentOwnerUid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        for (const sheet of payload.customSheets) {
          await setDoc(doc(db, 'customSheets', sheet.id), {
            ownerUid: currentOwnerUid,
            nombreHoja: sheet.nombreHoja,
            archivoOrigen: sheet.archivoOrigen,
            columnas: sheet.columnas,
            totalFilas: sheet.rows.length,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          for (const row of sheet.rows.slice(0, 100)) {
            await setDoc(doc(db, 'customSheets', sheet.id, 'rows', row.id), {
              ownerUid: currentOwnerUid,
              sheetId: sheet.id,
              rowIndex: row.rowIndex,
              values: row.values,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        }
        notify('success', `Importación en la nube completada: ${totalImported} registros sincronizados.`);
        return totalImported;
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'excel_import_batch');
      }
    },
    [currentOwnerUid, isCloudMode, notify]
  );

  const deleteCustomSheet = useCallback(
    async (sheetId: string) => {
      if (!isCloudMode) {
        setCustomSheets((prev) => prev.filter((s) => s.id !== sheetId));
        notify('success', 'Planilla personalizada eliminada.');
        return;
      }
      try {
        await deleteDoc(doc(db, 'customSheets', sheetId));
        notify('success', 'Planilla eliminada.');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `customSheets/${sheetId}`);
      }
    },
    [isCloudMode, notify]
  );

  const seedCloudWorkspace = useCallback(async () => {
    if (!isCloudMode) return;
    await importEntitiesBatch({
      families: SEED_FAMILIES.map((f) => ({ ...f, ownerUid: currentOwnerUid })),
      ministries: SEED_MINISTRIES.map((m) => ({ ...m, ownerUid: currentOwnerUid })),
      members: SEED_MEMBERS.map((m) => ({ ...m, ownerUid: currentOwnerUid })),
      events: SEED_EVENTS.map((e) => ({ ...e, ownerUid: currentOwnerUid })),
      attendances: SEED_ATTENDANCES.map((a) => ({ ...a, ownerUid: currentOwnerUid })),
      customSheets: [],
    });
  }, [currentOwnerUid, importEntitiesBatch, isCloudMode]);

  const value = useMemo<ChurchStoreContextValue>(
    () => ({
      user,
      authReady,
      isCloudMode,
      syncingCloud,
      activeRole: isCloudMode ? cloudRole : previewRole,
      setPreviewRole,
      signInWithGoogle,
      signOutUser,
      seedCloudWorkspace,
      families,
      ministries,
      members,
      events,
      attendances,
      customSheets,
      staffList,
      saveFamily,
      deleteFamily,
      saveMinistry,
      deleteMinistry,
      saveMember,
      deleteMember,
      saveEvent,
      deleteEvent,
      saveAttendance,
      toggleMemberAttendance,
      deleteAttendance,
      importEntitiesBatch,
      deleteCustomSheet,
      feedbackBanner,
      clearFeedback,
    }),
    [
      user,
      authReady,
      isCloudMode,
      syncingCloud,
      cloudRole,
      previewRole,
      signInWithGoogle,
      signOutUser,
      seedCloudWorkspace,
      families,
      ministries,
      members,
      events,
      attendances,
      customSheets,
      staffList,
      saveFamily,
      deleteFamily,
      saveMinistry,
      deleteMinistry,
      saveMember,
      deleteMember,
      saveEvent,
      deleteEvent,
      saveAttendance,
      toggleMemberAttendance,
      deleteAttendance,
      importEntitiesBatch,
      deleteCustomSheet,
      feedbackBanner,
      clearFeedback,
    ]
  );

  return <ChurchStoreContext.Provider value={value}>{children}</ChurchStoreContext.Provider>;
}

export function useChurchStore(): ChurchStoreContextValue {
  const ctx = useContext(ChurchStoreContext);
  if (!ctx) {
    throw new Error('useChurchStore must be used inside ChurchStoreProvider');
  }
  return ctx;
}
