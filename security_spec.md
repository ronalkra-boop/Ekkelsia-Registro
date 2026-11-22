# Especificación de Seguridad — Ekklesia Registro (Firestore Rules TDD)

## 1. Invariantes de Datos
1. **Verificación de identidad obligatoria**: Toda operación de lectura o escritura requiere `request.auth != null` y `request.auth.token.email_verified == true`.
2. **Aislamiento de PII**: Los documentos en `/staff/{uid}` y `/members/{memberId}` nunca tienen lectura abierta (`isSignedIn()`). Solo el propietario (`ownerUid == request.auth.uid`) o el administrador verificado pueden consultarlos.
3. **Integridad de propietario e inmutabilidad**: Todo documento operativo exige `ownerUid == request.auth.uid` en creación e impide cambiar `ownerUid` o `createdAt` en actualizaciones.
4. **Integridad temporal**: `createdAt == request.time` en `create` y `updatedAt == request.time` en `create`/`update`.
5. **Integridad referencial**: Un registro en `/attendances/{attendanceId}` exige que su `eventoId` exista en `/events/{eventoId}`. Una fila en `/customSheets/{sheetId}/rows/{rowId}` exige que el documento padre `/customSheets/{sheetId}` exista y pertenezca al mismo propietario.
6. **Bloqueo de estados terminales**: En `/events/{eventId}`, si `estado` ya es `'Finalizado'` o `'Cancelado'`, solo un administrador puede modificarlo.
7. **Consultas seguras sin lectura O(n)**: Todos los `allow list` evalúan `resource.data.ownerUid == request.auth.uid` o `isBootstrappedAdmin()` sin invocar `get()` ni `exists()`.

## 2. "Dirty Dozen" — 12 Payloads Maliciosos que deben retornar PERMISSION_DENIED
1. **Shadow Field Injection** en `/members/m1`: incluir campo fantasma `isAdmin: true`.
2. **Identity Spoofing** en `/families/f1`: crear familia con `ownerUid: "victim_uid"` distinto de `request.auth.uid`.
3. **Unverified Email Admin Spoof**: token con `email: "ronalkra@gmail.com"` pero `email_verified: false`.
4. **ID Poisoning**: intentar `create` en `/members/../../evil` o ID > 128 caracteres.
5. **Value Poisoning / Denial of Wallet**: enviar `notasPastorales` con cadena de 2000 caracteres (> 1000 maxLength).
6. **Timestamp Forgery**: enviar `createdAt` como fecha cliente distinta a `request.time`.
7. **Immutable Field Tampering**: intentar modificar `ownerUid` o `createdAt` durante un `update` de `/events/e1`.
8. **Self-Assigned Role Escalation**: usuario no admin intentando escribir `role: "pastor"` en `/staff/{uid}`.
9. **Orphan Attendance Write**: crear `/attendances/a1` con `eventoId: "evento_inexistente"`.
10. **Terminal State Bypass**: usuario no admin intentando reabrir un evento con `estado: "Finalizado"`.
11. **Unbounded Array Attack**: crear `/customSheets/s1` con `columnas` de 50 elementos (> 40).
12. **Blanket PII List Scrape**: usuario no propietario intentando `list` de `/members` o `get` de `/staff/otro_uid`.
