// Almacenamiento: todo vive en el teléfono (localStorage), en una sola clave.
const CLAVE = 'asistencia:v1';

/** Registro de visitas (museos, tiendas, eventos…): tipos de visitante, nombres, rangos de edad, visitas y recorridos. */
export function visitasPorDefecto() {
  return {
    activo: true,        // viene encendido; se puede apagar en Ajustes (lo ya registrado se conserva)
    elegido: false,      // true cuando la persona lo encendió o apagó a propósito
    tipos: [
      { id: 'inst', nombre: 'Institución', conNombre: true, archivado: false },
      { id: 'medio', nombre: 'Medio', conNombre: true, archivado: false },
      { id: 'part', nombre: 'Particulares', conNombre: false, archivado: false },   // sin nombre: solo se cuentan personas
    ],
    entidades: [],       // { id, tipoId, nombre, archivado }: instituciones, medios, etc. con nombre
    edades: [
      { id: 'ninos', nombre: 'Niños', rango: '0 a 12 años', archivado: false },
      { id: 'adolescentes', nombre: 'Adolescentes', rango: '13 a 17 años', archivado: false },
      { id: 'adultos', nombre: 'Adultos', rango: '18 a 59 años', archivado: false },
      { id: 'mayores', nombre: 'Adultos mayores', rango: '60 años o más', archivado: false },
    ],
    usarSexo: true,
    sexos: [{ id: 'm', nombre: 'Mujeres' }, { id: 'h', nombre: 'Hombres' }],
    extras: [{ id: 'disc', nombre: 'Personas con discapacidad', activo: false }, { id: 'ext', nombre: 'Visitantes extranjeros', activo: false }],
    registros: [],       // { id, fecha, hora, tipoId, entidadId|null, personas, edades:{id:n}, sexos:{id:n}, extras:{id:n}, recorridoId|null }
    recorridos: [],      // { id, fecha, hora, guiaId|null }  (un recorrido puede juntar varios grupos)
  };
}

export function estadoInicial() {
  return {
    v: 1, contador: 1,
    empleados: [],
    turnos: [{ id: 1, nombre: 'General', inicio: '09:00', fin: '16:00', dias: [0, 1, 2, 3, 4], desde: null, hasta: null }],
    excepciones: [],      // { fecha, turnoId|null, inicio|null, fin|null }
    disponibilidad: [],   // { id, empId, dia, desde, hasta, vigente }
    tramos: [],           // { id, empId, fecha, entrada, salida|null }  (minutos)
    avisos: {},           // 'fecha|empId' -> 0..3
    cierres: [],          // { semana, version, fecha, filas:[{empId, nombre, dias, normales, extra, sinTurno, total}] }
    correcciones: [],     // { fecha, empId, motivo, cuando }  cambios hechos en semanas ya cerradas
    ultimaCopia: null,    // fecha de la última copia de seguridad
    // organizacion y descripcion: salen en la app y el PDF. zona: '' = la del teléfono. bienvenida: ya se mostró el primer paso.
    ajustes: { organizacion: '', descripcion: '', zona: '', bienvenida: false },
    visitas: visitasPorDefecto(),
  };
}

/** Completa lo que falte (datos de versiones anteriores o copias viejas). */
export function conPorDefecto(d) {
  const base = estadoInicial();
  const visitas = { ...base.visitas, ...(d.visitas || {}) };
  if (!visitas.elegido) visitas.activo = true;    // si nunca se eligió, rige lo de fábrica: encendido
  return { ...base, ...d, ajustes: { ...base.ajustes, ...(d.ajustes || {}) }, visitas };
}

export function cargar() {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (crudo) return conPorDefecto(JSON.parse(crudo));
  } catch (e) { /* sin almacenamiento: se arranca vacío */ }
  return estadoInicial();
}

export function guardar(st) {
  try { localStorage.setItem(CLAVE, JSON.stringify(st)); return true; }
  catch (e) { return false; }
}

export const nuevoId = st => st.contador++;

export async function pedirPersistencia() {
  try { if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist(); } catch (e) { /* nada */ }
  return false;
}
