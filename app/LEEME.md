# Sala Tricolor (app para el celular)

Aplicación web instalable (PWA) para llevar la asistencia y las horas. Funciona sin internet y
**todos los datos se guardan solo en el teléfono**. No hay servidor ni cuentas.

## Qué incluye
Hoy (marcar en el momento o al final del día), resumen semanal con desglose por día, cierre de semana,
corrección de días, empleados, turnos, disponibilidad, sugerencia de quién debería venir, reporte semanal
en PDF (compartir o descargar) y copia de seguridad.

## Probarla en un computador
```bash
cd app && python3 -m http.server 8080      # luego abrir http://localhost:8080
node --test pruebas/*.test.js              # pruebas de la lógica (desde la raíz del repositorio)
```

## Publicarla (para instalarla en el teléfono)
Hay que servir la carpeta `app/` desde cualquier hosting de archivos estáticos con HTTPS
(Cloudflare Pages, Netlify, GitHub Pages...). Directorio de publicación: `app`. Sin paso de compilación.
Después, en el teléfono: abrir el enlace → "Agregar a pantalla de inicio".

## Si se cambia el código
- Estilos: `frontend/construir-app.sh` (Tailwind compilado a `app/css/app.css`).
- Subir el número `VERSION` de `app/sw.js` para que los teléfonos descarguen la versión nueva.

## Datos
Se guardan en el almacenamiento del navegador del teléfono (clave `sala-tricolor:v1`). La pantalla
**Más → Copia de seguridad** exporta e importa un archivo `.json`.
