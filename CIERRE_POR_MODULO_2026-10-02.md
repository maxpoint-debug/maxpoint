# MaxPoint — Cierre por módulo · 02/10/2026

Revisión del código local y documentación anterior. No certifica producción ni reglas desplegadas. No se realizaron escrituras en Firestore ni operaciones de negocio. Validación: sintaxis de los 23 archivos JS y reproducciones locales de seguimientos inválidos y resumen truncado de Caja.

## Prioridades

P0: corregir datos, dinero o acceso. P1: cerrar recorridos diarios. P2: mejoras posteriores que no bloquean operación.

| Parte | Falta cerrar | Prioridad | Criterio de cierre |
|---|---|---|---|
| Fluidez y publicación | Confirmar versión publicada, publicar archivos relacionados juntos, respaldo y posibilidad de volver a una versión anterior. No hay `.git` en esta carpeta. | P0 | Versión identificada y recorrido diario completo sin errores. |
| Sesiones y permisos | Probar vencimiento diario/inactividad y días únicos entre dispositivos. Revisar todas las funciones sensibles y restricciones de campos. La matriz editable no gobierna todos los controles: existen comprobaciones directas de rol y funciones de configuración que no validan su permiso. Obtener/versionar reglas reales. | P0 | Cada acción permitida/prohibida coincide en interfaz, función de escritura y reglas; sesionesDiarias no admite registros de otro usuario. |
| WhatsApp y seguimientos | Filtrar reservas, anuladas, devueltas y POS del postventa de equipos. Postreparación usa fecha de ingreso y no exige entrega. Implementar el mensaje cálido solicitado y beneficios comerciales aprobados. Revisar ventanas de contacto y estados de envío. | P0 / P1 | Ninguna operación inválida recibe seguimiento; mensajes correctos por cliente, equipo y etapa. |
| Presupuestos / Lista Maestra | Verificar precios comerciales reales, importación incremental, preservación de precios manuales y servicios ambiguos inactivos. Consumo de repuesto pendiente; no hay costo real de reparación. | P1 | Casos aprobados coinciden con precios ofrecidos; costos estimados identificados. |
| Reparaciones | Protección en FB.add/FB.upd para permisos, campos y reglas de entrega: la actualización genérica no aplica todas las validaciones de actualizarReparacion. Revisar garantías históricas documentadas sin corregir automáticamente. Numeración nextOrden se obtiene de memoria y puede colisionar entre altas simultáneas. | P0 / P1 | Alta simultánea sin número repetido; entrega/cobro/garantía y cambios de técnico preservan controles. |
| Clientes | renderCli agrupa por nombre, mezclando homónimos; se deriva de reparaciones y omite compradores sin reparación. Entidades V2 se sincronizan después de confirmar operación; un fallo se registra en consola sin reparación automática. | P1 | Identidad estable, homónimos separados, compradores visibles; inconsistencias V2 detectables. |
| Equipos | Consolidar vínculo entre cliente, IMEI/serie, ventas y reparaciones sin depender del nombre. | P1 | Historial del mismo equipo consistente y sin mezclar equipos/clientes distintos. |
| Stock de equipos | Alta de parte de pago ya es transaccional en código local. La anulación de venta no revierte ni marca el equipo recibido en parte de pago. Revisar vínculo entre venta de equipo existente y su estado en stock. | P0 / P1 | Venta/reserva/anulación dejan stock correcto y trazable; probar antes de definir una reversión automática. |
| Stock POS y repuestos | Verificar unicidad concurrente de SKU/barcode, regalos y reversiones. El consumo de repuesto por reparación todavía no está conectado. | P1 | Stock inicial/final concilia con movimientos, sin negativos ni doble descuento. |
| Caja y Pagos | Resumen depende de los últimos 250 movimientos globales. FB.cerrarCaja acepta el resumen enviado por cliente; otro cobro posterior a abrir el modal puede dejar la foto desactualizada. Un campo de efectivo contado vacío se convierte en cero. Revisar deuda histórica con administración. | P0 | Cierre utiliza todos los movimientos de esa caja y un corte consistente, valida conteo explícito y no omite operaciones concurrentes. |
| Ventas de equipos / reservas | Completar reserva y revertir cobros ya existen. Validar partes de pago, señas combinadas, regalos y anulaciones; verificar fecha comercial usada al completar una reserva para métricas/seguimientos. | P1 | Recorrido completo sin duplicar venta/pagos y con fecha coherente. |
| POS | Probar ticketera 80 mm, scanner real y móviles. Verificar concurrencia con cierre y anulaciones. | P1 | Cobro confirmado una vez; impresión fallida no repite venta; stock y dinero concilian. |
| Administración y contadores | Ventanas de 2.000 pagos/movimientos y 500 cajas no cubren historia ilimitada. Contadores agrupan personas por nombre aunque ingresos guardan UID; renombres u homónimos alteran el desglose. Ventas no refrescan equipoAdmin/admin/bal desde su listener. Unificar criterio de fechas de fin versus ingreso y métricas/comisiones. | P1 | Conteos por identidad y fecha definida; filtros históricos completos o limitación visible; actualización consistente. |
| Comisiones | Verificar aprobación concurrente y ajustes por garantía/reversión posterior. Conciliar período de ingreso usado en comisiones con fecha de finalización mostrada en contadores. Confirmar si marcar pagada debe generar egreso en Caja. | P1 | Liquidación sin duplicados y con trazabilidad de ajustes/pago. |
| Cotizador público e interno | Ya comparten cotizador-core.js: la deuda de fórmulas separadas quedó desactualizada. Falta certificar valores y descuentos reales en Firestore, WhatsApp y matriz de casos. | P1 | Mismos datos producen mismos resultados y coinciden con tabla comercial aprobada. |
| Portal cliente | Celular + orden implementado en interfaz. Consultas descargan reparaciones por teléfono antes de validar orden: no constituye restricción de servidor. Falta revisión de lectura pública y prueba real. Todavía excluye clientes que solo compraron equipos. | P0 / P1 | Datos públicos delimitados por servidor; orden incorrecta rechazada; saldo/ofertas/estados correctos. |
| Buscador universal | Ventas se muestran sin filtrar permiso ver_ventas_equipos; importes USD se formatean con pesos. Clientes derivados solo de reparaciones. | P1 / P2 | Resultados respetan permisos, moneda y tipos de operación. |
| Notificaciones y auditoría | Listener de auditoría carga colección completa incluso fuera de sesión; revisar permisos, alcance y paginación. Errores de varios listeners se silencian. | P1 | Error visible y acceso por rol, sin confundir falta de permiso con lista vacía. |

## Hallazgos reproducidos

- Seguimientos: una venta Anulada y una Reservada de hace 90 días aparecen ambas en calcSeguimientos().
- Caja: 251 cobros de efectivo de 1, con solo 250 cargados, producen esperado 250 y no 251. El listener es global, por lo que también pueden desplazar movimientos otras cajas.
- Los 23 archivos JavaScript pasan comprobación de sintaxis. Esto no certifica comportamiento en navegador ni Firestore.

## Documentación anterior

PROJECT_STATUS.md conserva pendientes ya implementados (reversión individual, finalización de reserva, parte de pago transaccional). La auditoría del 27/09 contiene una revalidación exitosa posterior pero también conclusiones previas incompatibles. Usar esa auditoría como evidencia fechada, no como estado actual de publicación. Los importes/diferencias históricas informados allí deben volver a consultarse antes de actuar.

## Orden de trabajo propuesto

1. Respaldo/versionado y evidencia de publicación.
2. Caja: movimientos completos y cierre consistente.
3. Permisos en funciones/reglas y lectura del portal.
4. Stock/parte de pago y reservas.
5. Seguimientos y mensajes postventa.
6. Identidades de clientes/técnicos, contadores y comisiones.
7. Precios/cotizador y prueba operativa final.

Cada entrega resuelve un único objetivo, preserva datos históricos e incluye prueba concreta. No se propone reescritura, cambio de tecnología ni rediseño.


## Avance 03/10 — Caja

Implementado localmente el primer cierre técnico:

- Listener completo de movimientos por cajaId para el efectivo esperado; el libro reciente de POS conserva su ventana de 250.
- Cierre recalculado con lecturas del servidor, sin aceptar totales del modal.
- Revisión de movimientos incrementada en las ocho operaciones financieras (movimientos manuales, equipos, reservas, POS, cobros y reversiones). Si cambia durante el cierre, se rechaza el cierre sin modificar la caja.
- Campo de efectivo contado obligatorio; cero explícito permitido, vacío rechazado.
- Carga/error de movimientos se muestra y evita cerrar con datos no disponibles.
- Pruebas reproducibles: `node tests/caja.test.cjs`. 304 movimientos, ARS/USD, transferencia, reversión, totales manipulados, campo vacío, caja distinta, cambio concurrente, diferencia y fallo de red.

No se modificaron cierres históricos ni se asignaron movimientos sin cajaId automáticamente. Los movimientos no vinculados requieren revisión administrativa.

Publicar index.html, js/caja.js y js/firebase.js juntos. Todos los dispositivos deben recargar: versiones anteriores no incrementan la revisión de movimientos. Las reglas deben permitir la consulta por cajaId y la actualización transaccional incremental de revisionMovimientos para los roles que operan Caja. No se verificaron reglas ni se realizó prueba de integración contra Firestore.

Prueba real pendiente: caja de prueba con movimientos simples/combinados, cobro desde otro dispositivo durante cierre, cero contado, cierre con diferencia y consulta del cierre. El contador de revisión protege escrituras a través de las funciones actualizadas; reforzar en reglas Firestore como siguiente paso.

Referencia técnica consultada: [Transacciones de Firestore](https://firebase.google.com/docs/firestore/manage-data/transactions) y [API de Firestore](https://firebase.google.com/docs/reference/js/firestore). Las transacciones revalidan documentos leídos; la consulta de movimientos se verifica mediante la revisión de la caja, porque no está dentro de la misma transacción Web.

## Avance 03/10 — Permisos y accesos

Estado: controles locales implementados y probados; reglas desplegadas pendientes de obtener. No se publicó ni se modificó Firestore.

### Objetivo

Conectar los permisos configurables con las funciones de escritura, preservar controles financieros y bloquear operaciones después del vencimiento de sesión.

- Se agregaron permisos explícitos de repuestos, seguimientos, catálogo, importación histórica y edición financiera de ventas, con valores iniciales compatibles con la operación actual.
- Puede() rechaza roles/permisos desconocidos. Técnico y recepción esperan la configuración de permisos; un error al leerla bloquea acciones, sin restaurar permisos predeterminados silenciosamente. Administración mantiene acceso para recuperar configuración.
- La configuración se escucha después de autenticar y se limpia al cambiar usuario. Guardados que consultan sesión/permisos también comprueban vencimiento diario y por inactividad.
- Catálogo, configuración de catálogo/comisiones y creación legacy de ventas ahora requieren permiso explícito.
- Seguimientos usa su propio permiso: recepción puede registrar estado sin editar datos de la venta. Errores de escritura se muestran.
- Ventas y stock filtran campos operativos y consultan editar_costos, sin asumir por nombre de rol que técnico/recepción pueden editar costos. Finanzas de ventas con Caja registrada no se modifican por edición genérica.
- Reparaciones se actualizan con lectura transaccional y auditoría: no permite inventar pagos, autorizar saldos/cortesías sin permiso, reasignar terminales sin permiso ni entregar órdenes operativas con cierre incompleto. Campos derivados se recalculan y timeline conserva actor real. La importación administrativa mantiene compatibilidad histórica.
- Se dejó de capturar/mostrar/imprimir PIN de clientes y se filtran campos conocidos de credenciales en guardados/importación de reparaciones. Los campos históricos no se eliminan automáticamente.
- Buscador deja de mostrar ventas de equipos a usuarios sin ver_ventas_equipos.

### Archivos

js/state.js, js/firebase.js, js/modals.js, js/render.js, js/seguimientos.js, js/buscador.js, index.html, tests/permisos.test.cjs y este documento.

### Validación

- node tests/permisos.test.cjs: permisos por rol/configuración; seguimiento de recepción; configuración protegida; costos y campos financieros; cobros inventados; entrega y reasignación; PIN; autoría; rol desconocido; error de carga; sesión vencida.
- node tests/caja.test.cjs: regresiones de Caja siguen pasando.
- Comprobación de sintaxis en los 23 archivos JS.
- Las pruebas usan simulación de persistencia. No son integración con Firestore ni navegador real.

### Qué probar después de publicar

1. Administrador cambia un permiso de técnico/recepción; comprobar denegación y habilitación sin recargar la otra sesión.
2. Recepción marca seguimiento de venta y no puede editar sus importes.
3. Técnico corrige IMEI/stock y no cambia costo cuando editar_costos está deshabilitado.
4. Alta de reparación, cobro, entrega y garantía; comprobar timeline y saldos.
5. Simular error de lectura de config/permisosRoles: técnicos/recepción no deben obtener permisos por omisión.
6. Desde otra pestaña y al vencer sesión, comprobar que la escritura sea rechazada.

### Riesgos y límites

- Las reglas actuales deben permitir a los usuarios internos activos leer config/permisosRoles; permitir su escritura solo a administración. Si bloquean esa lectura, técnico/recepción no podrán operar hasta corregirlas.
- Las listas blancas y controles JavaScript no sustituyen reglas. Falta verificar accesos a usuarios, pagos, movimientos, stock, auditoría, sesionesDiarias y datos públicos del portal.
- Celular + orden fue la modalidad elegida por el propietario. La consulta pública sigue descargando documentos por teléfono antes de validar la orden: requiere protección de servidor específica para no entregar documentos internos completos. No se publicaron reglas genéricas que pudieran romperla.
- No se alteraron deudas, cierres, registros históricos ni permisos desplegados. Publicar los archivos relacionados juntos y recargar dispositivos.

### Información solicitada

Contenido actual de Firebase Console → Firestore Database → Reglas. Conservar la versión real y preparar cambios incrementales antes de publicar; no asumir una base de reglas que no está disponible.

## Avance 03/10 — reglas reales y datos públicos separados

Recibida la configuración real: lectura y escritura abiertas para todos. Preparadas reglas en `firestore.rules`, probadas satisfactoriamente en emulador con flujos reales de caja y permisos. Portal/cotizador ahora usan vistas públicas con campos limitados; publicación inicial desde Administración. Este avance reemplaza el diagnóstico anterior de consultas públicas a reparaciones privadas.

No desplegado. Seguir el orden y las pruebas de `FIRESTORE_CIERRE_2026-10-03.md`. Quedan explícitos los límites de lectura de costos entre empleados, sincronización de vistas desde navegador y timeout local de inactividad. Permisos se considera preparado para publicación, no cerrado en producción.

## Actualización confirmada por el usuario — 03/10

El usuario informa reglas publicadas y carga correcta de módulos, portal y cotizador. También informa completada la publicación/configuración del ajuste del cotizador. Fotos aplazadas expresamente.

Revisión final de acceso/portal: corregidos el cierre visual por vencimiento, el reintento persistente de publicación desde el mismo navegador/usuario y la invalidación de accesos antiguos durante regeneración. Detalle y pruebas en `CIERRE_ACCESOS_2026-10-03.md`. Este ajuste requiere publicar `index.html` y `js/firebase.js`; no requiere nuevas reglas. Los otros pendientes de la tabla no se consideran cerrados por esta confirmación.

## Avance 03/10 — stock, parte de pago y reservas

Preparado localmente y probado en emulador: vínculo de equipo disponible por IMEI, estados transaccionales Reservado/Vendido, protección de identidad/stock vinculados, anulación con parte de pago pendiente de devolución, restitución de regalos, reserva pagada sin cobro extra y fecha de venta al completar. Sin migraciones históricas automáticas.

Requiere nuevas reglas y publicación de los cinco archivos de aplicación detallados en `CIERRE_STOCK_RESERVAS_2026-10-03.md`. No publicado por el agente. Se mantienen las limitaciones sobre vínculos históricos ausentes, formato/duplicados de IMEI y consumo de repuestos/POS, que no deben confundirse con objetivos resueltos.

## Avance 03/10 — seguimientos y subida conjunta

Corregidos destinatarios, fecha real de entrega/finalización, mensajes cálidos sin IMEI ni promociones inventadas, beneficio persistente administrativo y confirmación manual de contacto. Compatible con estado histórico enviado. Pruebas locales y emulador pasaron; pendiente publicación junto con stock/reservas.

Hallazgo adicional de publicación: data.js incluía los históricos de clientes como recurso público. Conservados fuera del sitio y retirada la copia del JS; importación local administrativa preservada. Reemplazar el archivo no retira versiones anteriores de GitHub; revisar exposición en historial si el repositorio es público. La protección del servidor no cubría esa copia estática.

Guía única de subida, respaldo, archivos y pruebas en `CIERRE_SEGUIMIENTOS_2026-10-03.md`. Fotos siguen aplazadas. Contadores/identidades/comisiones continúan como siguiente bloque y no se consideran cerrados.
