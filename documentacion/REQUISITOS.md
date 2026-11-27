# Requisitos de Control de Asistencia

> **Actualización:** el sistema es **genérico** (sirve para cualquier grupo, taller, escuela, etc.), lo usa
> **una sola persona desde el celular**, sin internet, con los datos en el teléfono. Se descartaron
> coordinadores, bitácora, nube y Excel (el reporte es PDF). La zona horaria y un nombre opcional se
> configuran en Ajustes. Las horas se muestran **en palabras** ("7 h 38 min", "22 h"), sin dos puntos, y las
> comparaciones también ("3 h 36 min menos que el promedio"). No hay datos de ejemplo en la app. Lo que sigue es el levantamiento original; donde choque con esto, manda esta nota.

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
- **Elegir varias personas** y marcarlas a una misma hora (entrada o salida), además de marcar a todos de una vez. Marcación **en bloque** para días normales ("los que faltan entraron a las 9:00", "todos los presentes
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

**Resumen mensual** (hecho): pestaña Mes junto a Semana. Suma los días del 1 al último de cada mes (una semana que
cruza dos meses se reparte según la fecha de cada día), con total por persona, desglose semana por semana y PDF.
**Cada semana empieza siempre en cero**; el mes acumula aparte, y lo de una semana nunca se arrastra a la siguiente.


**Reporte semanal para entregar** (para que el ente superior gestione los pagos; el reporte solo lleva horas):
resumen del equipo (días, normales, extra tras turno, extra de día sin turno, total) y, por empleado,
cada día con sus **horas de entrada y salida**, el desglose y el total de la semana. Excel con hoja
Resumen y hoja Detalle (totales con fórmulas) y PDF con firma del coordinador.


- Resumen **semanal y mensual**, exportable a **Excel y PDF**, con el mismo desglose.
  El mensual es la suma de las semanas (por definir cómo se reparte una semana que cruza dos meses).
- Historial por semana y mes.

## 11. Registro de visitas (módulo opcional)

Para lugares que reciben visitantes (nació para un museo): contar quién viene, de dónde y con qué recorridos.
Viene **encendido por defecto** (pestaña **Visitas**); se puede apagar en Ajustes o en la bienvenida, y lo ya registrado se conserva. La asistencia del personal sigue igual.

- **Visita** = un grupo que llega. Tipos de visitante configurables (por defecto *Institución*, *Medio* y
  *Particulares*; se agregan otros a mano: empresa, gobierno…). Los tipos "con nombre" piden el nombre
  (se elige de una lista que se llena sola; se pueden corregir, unir y ocultar). *Particulares* no tiene nombre.
- **Siempre** se anota la visita, haga recorrido o no, con el número de personas.
- **Recorrido** = visita guiada, con hora y guía (el guía sale de la lista de personas de la asistencia). Un recorrido
  puede juntar **varios grupos**. Un recorrido sin grupos desaparece.
- **Detalle opcional:** por edad (por defecto Niños 0–12, Adolescentes 13–17, Adultos 18–59, Adultos mayores
  60+; editables), por sexo (Mujeres/Hombres, aparte de la edad) y extras (personas con discapacidad, visitantes
  extranjeros; apagados por defecto). Si se detalla por edad, el total se suma solo. Lo no detallado sale como
  "sin detallar".
- **Informes** semanal y mensual en pantalla, **PDF y Excel**: total de personas, por tipo, edad, sexo, recorridos
  (y promedio de personas por recorrido, por guía), lista de instituciones/medios/otros con visitas, personas y
  recorridos, y día por día. El Excel tiene hojas Resumen, Por día, Instituciones y medios, Recorridos y Visitas
  (detalle plano para filtrar). También hay Excel de las horas del personal (semana y mes).
- La misma persona y el mismo teléfono llevan visitas y asistencia; entra en la copia de seguridad.

## Pendientes por definir

- Encabezado o logo del ente superior en los reportes.
- Reparto de una semana que cruza dos meses en el resumen mensual.
- Hosting, dominio y primer usuario (ver `PLAN.md`).
