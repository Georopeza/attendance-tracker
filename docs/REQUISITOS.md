# Requisitos de Sala Tricolor

Documento de referencia: recoge lo pedido por el coordinador y las decisiones ya confirmadas.
Si algo cambia, se actualiza aquí primero.

## 1. Propósito y alcance

- Herramienta interna de la **coordinación** para marcar asistencia y totalizar horas por semana y mes.
- Son 6 empleados (la plantilla es variable). **No hay pagos ni precios**: los totales semanales se
  entregan a un ente superior que los gestiona.
- **Los empleados no tienen acceso** al sistema ni marcan nada. La coordinación registra todo.

## 2. Usuarios y accesos

- Varios coordinadores, **todos iguales**: ven y editan todo, y pueden crear otros accesos.
- Usuario y contraseña. Un solo rol por ahora (el rol "consulta" del planteamiento inicial queda fuera
  salvo que se pida más adelante).
- **En la nube**, con varios coordinadores viendo los cambios en **tiempo real**.
- Hora de **Venezuela** (`America/Caracas`, UTC−4, sin horario de verano). Se guarda en UTC.

## 3. Registro de asistencia

- El coordinador marca entrada y salida de cada empleado, cada día.
- **Sin escribir horas a mano**: botón "Entró ahora" / "Salió ahora" que toma la hora actual, con
  corrección rápida de ±15 min y deshacer.
- Un empleado puede **ir y volver el mismo día** (por ejemplo 8–11 y 14–16): cada día es una lista de
  **tramos** que se suman.
- Marcación **en bloque** para días normales ("los que faltan entraron a las 9:00", "todos los presentes
  salieron a las 16:00"), y luego se corrigen las excepciones.
- La semana va de **lunes a domingo**. A veces se trabaja sábado y domingo; entonces se marca ese día.
- **No existe asignación de turnos a personas.** Cada empleado tiene libertad de venir o no; se marcan
  las horas de quien vino.

## 4. Cálculo de horas

- **Turno** = molde de horario (hoy uno solo, 9:00–16:00, configurable; a veces 16:30 por excepción de
  fecha). El modelo admite varios turnos: cada tramo se mide contra el turno en el que cae.
- **Normales**: dentro del turno. **Extra**: después del fin del turno.
- **Llegar antes del inicio no cuenta** (ni normal ni extra).
- **Día sin turno** (por defecto sábado y domingo): **todo es extra**, con otro color y desglosado
  ("de 7 h extra, 5 h fueron en sábado").
- **Redondeo sobre el total del día**: fracción de 0–15 min baja a la hora, 45–59 sube, 16–44 queda
  **exacto y marcado "por revisar"** para que la coordinación decida (ajuste manual con motivo en bitácora).
- Resumen semanal por persona: horas normales, extra tras turno, extra de día sin turno, total y días asistidos.

Ejemplos de referencia (turno 9:00–16:00):

| Caso | Resultado |
|---|---|
| 8:00–11:00 y 14:00–16:00 | 4:00 normales (la hora antes de las 9 no cuenta) |
| 9:02–16:40 | 6:58 normales + 0:40 extra = 7:38, por revisar |
| 9:00–15:50 | 6:50, sube a 7:00 |
| Sábado 9:00–14:00 | 5:00 extra de día sin turno |

## 5. Disponibilidad

- La **registra la coordinación** (los empleados se lo comentan).
- Por día de la semana y franja horaria; puede haber **varias franjas** el mismo día; con **vigencia por
  fecha** para no alterar el pasado.
- Cuadrícula del equipo (quién viene qué día, a qué hora, y cuántas personas por día) y ficha por
  empleado, con "copiar de otro empleado".

## 6. Equilibrio y sugerencia

- Promedio del equipo **por semana**, con **horas totales** (normales + extra).
- Se ve quién está por encima o por debajo del promedio.
- **Sugerencia** para el siguiente turno: disponibles ordenados de menos a más horas acumuladas en la
  semana. Es solo una ayuda: no asigna ni obliga.
- Se puede **guardar a quién se avisó** (sin avisar, avisado, aceptó, no puede) como nota.

## 7. Desglose semanal por empleado

- En el resumen semanal, "Ver semana" abre un calendario lunes–domingo de ese empleado con tramos,
  normales, extra y total de cada día, y la suma que justifica el total semanal.
- Desde el desglose se puede **corregir un día** (editar sus tramos) con confirmación y bitácora.
- Solo semanal: el resumen mensual no lleva desglose por día.

## 8. Cierre de semana

- La semana se **cierra** al entregarla; se guarda una copia de lo entregado.
- Una semana cerrada **sigue siendo editable**: pide un **motivo**, muestra la **diferencia contra lo
  entregado** y cada nuevo cierre es una **versión**.

## 9. Orden y seguridad de los datos

- **Archivar en lugar de eliminar** (empleados con historial). Solo se elimina de verdad lo que no tiene
  horas asociadas.
- **Confirmación** antes de archivar, borrar o editar semanas cerradas.
- **Bitácora**: quién, cuándo, valor anterior, valor nuevo, motivo.
- **Validaciones**: salida posterior a la entrada; sin cruce de tramos ni de franjas de disponibilidad;
  un archivado no aparece en tarjetas ni sugerencias. Avisos (no bloqueos): asistencia en un día sin
  disponibilidad, días "por revisar".
- CRUD completo de todo lo que se registra.

## 10. Reportes

**Reporte semanal para entregar** (para que el ente superior gestione los pagos; el reporte solo lleva horas):
resumen del equipo (días, normales, extra tras turno, extra de día sin turno, total) y, por empleado,
cada día con sus **horas de entrada y salida**, el desglose y el total de la semana. Excel con hoja
Resumen y hoja Detalle (totales con fórmulas) y PDF con firma del coordinador.


- Resumen **semanal y mensual**, exportable a **Excel y PDF**, con el mismo desglose.
  El mensual es la suma de las semanas (por definir cómo se reparte una semana que cruza dos meses).
- Historial por semana y mes.

## Pendientes por definir

- Encabezado o logo del ente superior en los reportes.
- Reparto de una semana que cruza dos meses en el resumen mensual.
- Hosting, dominio y primer usuario (ver `PLAN.md`).
