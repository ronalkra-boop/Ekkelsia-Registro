import type { Member } from '../types/church';
import { calculateAgeFromDate } from './validation';

export const CHILD_MAX_AGE = 17;
export const YOUTH_MAX_AGE = 25;

export type GenderSegmentFilter = 'Todos' | 'Masculino' | 'Femenino';
export type AgeSegmentFilter = 'Todos' | 'NinosJovenes';
export type BaptismSegmentFilter = 'Todos' | 'Bautizados' | 'NoBautizados';

export interface MemberSegmentFilters {
  gender: GenderSegmentFilter;
  ageGroup: AgeSegmentFilter;
  baptism: BaptismSegmentFilter;
}

export const EMPTY_SEGMENT_FILTERS: MemberSegmentFilters = {
  gender: 'Todos',
  ageGroup: 'Todos',
  baptism: 'Todos',
};

export interface MemberSegmentationSummary {
  baseTotal: number;
  hombres: number;
  hombresPct: number;
  mujeres: number;
  mujeresPct: number;
  ninosYJovenes: number;
  menoresCount: number;
  jovenesCount: number;
  ninosYJovenesPct: number;
  bautizados: number;
  bautizadosPct: number;
  noBautizados: number;
  noBautizadosPct: number;
}

/**
 * Determines whether a member belongs to "Niños y jóvenes" (0–25 años),
 * also including minors with RC or TI document types when birth date is missing.
 */
export function isChildOrYouthMember(member: Member, referenceDate: Date = new Date()): boolean {
  const age = calculateAgeFromDate(member.fechaNacimiento, referenceDate);
  if (age !== null) {
    return age <= YOUTH_MAX_AGE;
  }
  return member.tipoDocumento === 'TI' || member.tipoDocumento === 'RC';
}

/**
 * Determines whether a member is a minor (0–17 años, or RC/TI without birth date).
 */
export function isMinorMember(member: Member, referenceDate: Date = new Date()): boolean {
  const age = calculateAgeFromDate(member.fechaNacimiento, referenceDate);
  if (age !== null) {
    return age <= CHILD_MAX_AGE;
  }
  return member.tipoDocumento === 'TI' || member.tipoDocumento === 'RC';
}

export function filterMembersBySegments(
  members: Member[],
  filters: MemberSegmentFilters,
  referenceDate: Date = new Date()
): Member[] {
  return members.filter((m) => {
    if (filters.gender !== 'Todos' && m.genero !== filters.gender) return false;
    if (filters.ageGroup === 'NinosJovenes' && !isChildOrYouthMember(m, referenceDate)) return false;
    if (filters.baptism === 'Bautizados' && !m.bautizado) return false;
    if (filters.baptism === 'NoBautizados' && m.bautizado) return false;
    return true;
  });
}

function toPercent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

/**
 * Computes orthogonal demographic and baptism counts over the base member list
 * (already narrowed by search, status, and barrio). Each dimension reflects the
 * other active dimensions so pastors/secretaries can cross-segment cleanly
 * (e.g., "Niños y jóvenes" + "No bautizados") while keeping sibling options switchable.
 */
export function computeMemberSegmentation(
  baseMembers: Member[],
  activeFilters: MemberSegmentFilters = EMPTY_SEGMENT_FILTERS,
  referenceDate: Date = new Date()
): MemberSegmentationSummary {
  const forGender = filterMembersBySegments(
    baseMembers,
    { ...activeFilters, gender: 'Todos' },
    referenceDate
  );
  const forAge = filterMembersBySegments(
    baseMembers,
    { ...activeFilters, ageGroup: 'Todos' },
    referenceDate
  );
  const forBaptism = filterMembersBySegments(
    baseMembers,
    { ...activeFilters, baptism: 'Todos' },
    referenceDate
  );

  const hombres = forGender.filter((m) => m.genero === 'Masculino').length;
  const mujeres = forGender.filter((m) => m.genero === 'Femenino').length;

  let menoresCount = 0;
  let jovenesCount = 0;
  for (const m of forAge) {
    if (!isChildOrYouthMember(m, referenceDate)) continue;
    if (isMinorMember(m, referenceDate)) {
      menoresCount += 1;
    } else {
      jovenesCount += 1;
    }
  }
  const ninosYJovenes = menoresCount + jovenesCount;

  const bautizados = forBaptism.filter((m) => m.bautizado).length;
  const noBautizados = forBaptism.length - bautizados;

  return {
    baseTotal: baseMembers.length,
    hombres,
    hombresPct: toPercent(hombres, forGender.length),
    mujeres,
    mujeresPct: toPercent(mujeres, forGender.length),
    ninosYJovenes,
    menoresCount,
    jovenesCount,
    ninosYJovenesPct: toPercent(ninosYJovenes, forAge.length),
    bautizados,
    bautizadosPct: toPercent(bautizados, forBaptism.length),
    noBautizados,
    noBautizadosPct: toPercent(noBautizados, forBaptism.length),
  };
}
