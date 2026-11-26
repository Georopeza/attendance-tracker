// Datos de ejemplo (para probar la app). Las fechas se calculan a partir de hoy.
import { estadoInicial } from './store.js';
import { ahora, lunesDe, sumarDias } from './fechas.js';

export function datosEjemplo() {
  const st = estadoInicial(), hoy = ahora().fecha, lun = lunesDe(hoy), ant = sumarDias(lun, -7);
  let id = 10;
  const emp = n => { const e = { id: id++, nombre: n, archivado: false }; st.empleados.push(e); return e.id; };
  const [ana, luis, maria, carlos, rosa, jose] = ['Ana Pérez', 'Luis Mora', 'María Rojas', 'Carlos Díaz', 'Rosa Linares', 'José Silva'].map(emp);
  const completo = [['09:00', '16:00']];
  const disp = {
    [ana]: { 0: completo, 1: completo, 2: completo },
    [luis]: { 0: completo, 1: completo, 2: completo, 3: completo, 4: completo, 5: [['09:00', '13:00']] },
    [maria]: { 1: completo, 2: [['09:00', '12:00'], ['14:00', '16:00']], 3: completo },
    [carlos]: { 0: completo, 3: completo, 4: completo },
    [rosa]: { 0: completo, 1: completo, 2: completo, 3: [['09:00', '13:00']], 4: completo },
    [jose]: { 4: completo, 5: completo, 6: completo },
  };
  for (const [empId, dias] of Object.entries(disp)) for (const [dia, fr] of Object.entries(dias)) for (const [d, h] of fr) {
    st.disponibilidad.push({ id: id++, empId: Number(empId), dia: Number(dia), desde: d, hasta: h, vigente: ant });
  }
  const m = s => { const [h, mi] = s.split(':').map(Number); return h * 60 + mi; };
  const dia = (empId, base, n, ...tr) => tr.forEach(([e, s]) => st.tramos.push({ id: id++, empId, fecha: sumarDias(base, n), entrada: m(e), salida: s ? m(s) : null }));
  const T = ['09:00', '16:00'];
  // semana anterior
  dia(ana, ant, 0, T); dia(ana, ant, 1, ['09:00', '17:00']); dia(ana, ant, 2, T);
  dia(luis, ant, 0, T); dia(luis, ant, 1, ['09:02', '16:40']); dia(luis, ant, 2, T); dia(luis, ant, 3, T); dia(luis, ant, 4, T); dia(luis, ant, 5, ['09:00', '13:00']);
  dia(maria, ant, 1, T); dia(maria, ant, 2, ['09:00', '12:00'], ['14:00', '16:00']); dia(maria, ant, 3, T);
  dia(carlos, ant, 0, T); dia(carlos, ant, 3, ['09:00', '17:00']); dia(carlos, ant, 4, T);
  dia(rosa, ant, 0, T); dia(rosa, ant, 1, T); dia(rosa, ant, 2, T); dia(rosa, ant, 3, ['09:00', '13:00']); dia(rosa, ant, 4, ['09:00', '17:00']);
  dia(jose, ant, 4, T); dia(jose, ant, 5, ['09:00', '14:00']); dia(jose, ant, 6, ['09:00', '15:00']);
  // esta semana (solo días ya pasados)
  const pasados = Math.max(0, hoy > lun ? Math.min(6, Math.round((new Date(hoy) - new Date(lun)) / 864e5)) : 0);
  const fil = [[ana, [0, 1]], [luis, [0, 1, 2]], [maria, [1, 2]], [carlos, [0]], [rosa, [0, 1, 2]]];
  for (const [e, ds] of fil) for (const d of ds) if (d < pasados) dia(e, lun, d, T);
  st.contador = id;
  return st;
}
