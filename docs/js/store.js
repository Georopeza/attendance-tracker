// Almacenamiento: todo vive en el teléfono (localStorage), en una sola clave.
const CLAVE = 'asistencia:v1';
const CLAVE_ANTIGUA = 'sala-tricolor:v1';

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
    ajustes: { organizacion: '', zona: '' },  // nombre que aparece en la app y el PDF; zona horaria ('' = la del teléfono)
  };
}

/** Completa lo que falte (datos de versiones anteriores o copias viejas). */
export function conPorDefecto(d) {
  const base = estadoInicial();
  return { ...base, ...d, ajustes: { ...base.ajustes, ...(d.ajustes || {}) } };
}

export function cargar() {
  try {
    const crudo = localStorage.getItem(CLAVE) || localStorage.getItem(CLAVE_ANTIGUA);
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
