# Primera versión (Django): solo como referencia

Esta fue la primera versión del sistema, pensada para un computador o la nube (varios coordinadores,
bitácora, Excel y PDF). Se reemplazó por la **app para el celular** de la carpeta [`docs/`](../docs/LEEME.md),
que es la versión vigente. Se conserva porque contiene ideas que pueden servir (reportes en Excel,
bitácora, varios usuarios) y su lógica de horas tiene pruebas equivalentes a las de la app.

```bash
cd legado-django
pip install -r requirements.txt
python manage.py migrate && python manage.py cargar_ejemplo && python manage.py runserver
pytest
```
