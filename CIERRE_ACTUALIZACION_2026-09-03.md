# MaxPoint — Cierre de actualización

Fecha de cierre documental: 3 de septiembre de 2026  
Estado: desarrollo cerrado; pendiente de confirmación operativa y despliegue

## Objetivo

Dejar cerrada y documentada la última actualización disponible en esta carpeta antes de comenzar un objetivo nuevo.

La actualización mantiene la arquitectura y los datos existentes. No incluye migraciones destructivas ni eliminación automática de registros.

## Qué se hizo

### Cotizador

- Se centralizó en `js/cotizador-core.js` la interpretación de modelos, la selección de repuestos y el cálculo de descuentos.
- El cotizador interno y el público consumen la misma función de cálculo.
- Se agregó configuración del cotizador desde Firestore, manteniendo valores predeterminados cuando no existe configuración.
- La coincidencia de repuestos diferencia generación y variante (por ejemplo, Pro y Pro Max) y aplica criterios de calidad antes del precio.
- Cuando falta un repuesto obligatorio, el resultado puede quedar sujeto a revisión presencial en vez de inventar un costo.
- Se incorporó la carga de varias listas de usados en una sesión, su consolidación y una vista previa antes de actualizar la base.
- Para modelos repetidos, la consolidación conserva el menor valor detectado.
- Se mantuvieron el envío por WhatsApp y la impresión del resultado.

### Reparaciones y cobros

- Los pagos registrados pasan a ser la fuente del total cobrado en reparaciones nuevas.
- Los registros anteriores que sólo tienen seña siguen siendo compatibles y se interpretan sin migración masiva.
- Se calculan de forma consistente total cobrado, saldo y estado de pago.
- Las reparaciones sujetas al control nuevo requieren cierre operativo antes de ser entregadas.
- La entrega con saldo exige autorización administrativa y motivo registrado.
- Se conservan las restricciones de permisos para reasignar o eliminar operaciones.

### Operación diaria

- Se mantuvo la gestión de stock y la generación de una lista de equipos disponibles para copiar a WhatsApp.
- Se mantuvieron los seguimientos posreparación y posventa, incluyendo sus estados y acceso por WhatsApp.
- Se agregó orden natural por modelo para mejorar la lectura de listados.

## Archivos modificados

Archivos identificados como parte de la actualización más reciente por su fecha local:

- `index.html`
- `cotizador.html`
- `js/cotizador-core.js`
- `js/cotizador.js`
- `js/helpers.js`
- `js/modals.js`
- `js/seguimientos.js`
- `js/stock.js`

Documentación de cierre:

- `CIERRE_ACTUALIZACION_2026-09-03.md`
- `ESTADO_Y_PLAN_DE_CIERRE.md`

El archivo `LISTA - 2026.09.03 - CLIENTES.xlsx` no se describe como código ni se incorpora a una migración automática. Puede contener información de clientes y debe tratarse como dato sensible.

## Validaciones realizadas

- `node --check` completado correctamente sobre todos los archivos JavaScript de la carpeta.
- Verificada la carga de `js/cotizador-core.js` antes de los consumidores, tanto en el sistema interno como en el cotizador público.
- Verificado en una prueba aislada el reconocimiento diferenciado de modelos Pro y Pro Max.
- Verificado el criterio de selección de pantalla por modelo y calidad con un catálogo representativo.
- Verificados un caso sano y un caso con descuentos/revisión presencial en el núcleo compartido.

Estas validaciones comprueban estructura y lógica local. No reemplazan una prueba en navegador con los datos reales de Firestore.

## Qué probar

Antes de considerar la versión publicada como certificada:

1. Abrir el sistema interno y confirmar que no haya errores en consola.
2. Cotizar el mismo equipo y condiciones en el cotizador interno y en `cotizador.html`; ambos deben devolver el mismo resultado.
3. Probar un equipo sano, batería menor al umbral, pantalla rota, Pro, Pro Max y una falla sin repuesto coincidente.
4. Cargar dos listas con al menos un modelo repetido, revisar la vista previa y confirmar que conserve el menor valor antes de actualizar Firestore.
5. Registrar una seña y un pago posterior en una reparación; comprobar total cobrado, saldo y recibo.
6. Intentar entregar una reparación controlada con saldo y confirmar que solicite autorización administrativa.
7. Copiar la lista de stock disponible y abrir un seguimiento por WhatsApp.
8. Confirmar permisos con un usuario administrador y uno no administrador.
9. Realizar una copia de seguridad de Firestore antes del despliegue, si todavía no existe.

## Riesgos

- Los precios, el catálogo y la configuración comercial vigentes viven en Firestore y no pueden certificarse sólo con estos archivos.
- El importador interpreta texto libre; la vista previa debe revisarse antes de reemplazar la base de usados.
- La precisión de la selección de repuestos depende de que el catálogo tenga nombres y tipos coherentes.
- Los flujos con datos reales, permisos y WhatsApp requieren prueba manual en navegador.
- No hay reglas de Firestore en esta carpeta, por lo que su seguridad desplegada no fue auditada en este cierre.
- Esta carpeta no es un repositorio Git. No existe un commit, etiqueta o historial local con el que identificar o restaurar exactamente esta versión.

## Decisión de cierre

Se cierra el desarrollo de esta actualización para no mezclarlo con el próximo objetivo.

El cierre documental no afirma que haya sido desplegada ni que las pruebas manuales anteriores hayan sido ejecutadas. Hasta registrar esas confirmaciones, el estado correcto es: **desarrollo cerrado, publicación pendiente de certificar**.
