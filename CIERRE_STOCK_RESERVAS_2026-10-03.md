# Stock, partes de pago y reservas

## Objetivo

Cerrar el circuito venta/reserva/completar/anular de equipos sin cambiar operaciones pasadas automáticamente.

- Una venta/reserva con IMEI que coincide exactamente con un único equipo de stock disponible lo vincula y marca Vendido/Reservado en la misma transacción. Si no existe en stock, mantiene la venta habitual de equipos externos/nuevos. Si hay registros duplicados con ese IMEI, estado no disponible o modelo incompatible, bloquea y pide revisar.
- El equipo vinculado no puede liberarse, cambiar de identidad ni borrarse desde la edición genérica. Se libera al anular: reserva → Disponible; venta completada → A revisar. No vuelve automáticamente a Disponible si fue entregado.
- La parte de pago guarda su vínculo de stock en la venta. Al anular, se conserva el registro y queda Pendiente de devolución. Administración/stock puede marcar Devuelto al cliente después de verificar la devolución física. No figura disponible ni se incluye en valoración de stock activo mientras está anulada. Si está vendido/reservado/prestado o vinculado a otra operación, la anulación se bloquea para resolver esa operación primero.
- Reserva totalmente pagada se completa sin otro cobro ni exigir caja abierta. El dinero ya registrado se conserva; si hay saldo, exige pagos exactos y caja abierta.
- Se calculan equivalentes USD desde monto/moneda/cotización y se rechazan valores inválidos o incompatibles. Parte de pago requiere modelo y valor positivo que no supere el precio. Regalos repetidos por llamada directa se rechazan y su stock se restaura una sola vez al anular.
- Completar conserva fechaReserva y establece fecha de venta al día de finalización. Actualiza entidades V2 mediante la sincronización existente.
- Las finanzas de ventas schemaVersion 2 no se editan ni eliminan mediante operaciones genéricas, incluso si no tuvieron efectivo. Se conserva la edición histórica previa en documentos anteriores.

## Archivos modificados

- `js/firebase.js`: transacciones, validaciones y vínculos.
- `firestore.rules`: autorización de stock vinculado y restricciones financieras.
- `js/ventas.js`: edición compatible y campos de identidad vinculada bloqueados.
- `js/stock.js`: formulario de equipo vinculado.
- `js/render.js`: estados de devolución, aviso y valoración.
- `index.html`: estados y versiones de scripts.
- `tests/ventas-stock.test.cjs`, `tests/permisos.test.cjs`, `tests/firestore-rules.test.cjs`.
- Este documento y `CIERRE_POR_MODULO_2026-10-02.md`.

## Publicación

1. Respaldar reglas y archivos publicados actuales.
2. Publicar el contenido actualizado de `firestore.rules` en Firebase Console → Firestore Database → Reglas. Las reglas admiten los campos nuevos y siguen admitiendo las transacciones anteriores; no abren acceso anónimo ni cambian datos.
3. Subir juntos a GitHub `index.html`, `js/firebase.js`, `js/ventas.js`, `js/stock.js` y `js/render.js`, conservando sus rutas. Esperar publicación y recargar TODOS los dispositivos. No mezclar versiones durante operaciones de venta/stock.
4. Probar con un entorno de prueba si existe; en producción verificar próximas operaciones habituales, sin generar cobros ficticios.

## Qué probar

- Reservar un equipo disponible con su IMEI: pasa a Reservado y otra venta con ese IMEI se bloquea.
- Completar con el saldo correcto: pasa a Vendido. Guardar de nuevo no repite cobros ni regalos.
- Completar reserva ya totalmente pagada: dejar pagos nuevos vacíos; comprobar que no se genere otro movimiento.
- Anular reserva vinculada: libera equipo. Anular venta completada: equipo queda A revisar, reversiones quedan en Caja y regalos vuelven al stock.
- Anular con parte de pago: conserva equipo recibido como Pendiente de devolución. Confirmar devolución real marcando Devuelto al cliente; no reactivarlo como Disponible.
- Si la parte de pago fue vendida/reservada, la anulación original debe bloquearse y dejar dinero/stock sin cambios.
- Probar pagos ARS + USD con cotización; verificar saldo y movimientos por moneda.
- Verificar que modelo/IMEI vinculados no se cambien desde edición de venta/stock.

## Validación

Pasaron pruebas locales de ventas/stock (incluye render real), caja, permisos, cotizador, proyecciones públicas y sesión/portal; todos los JS pasan sintaxis.

Firestore Emulator pasó con funciones reales y reglas actualizadas: reserva con seña + parte de pago, completar con regalo, anular con restitución, bloqueos de edición/deleción, importes inválidos, doble finalización/anulación, venta concurrente del mismo equipo, finalización totalmente pagada con caja cerrada y operación cubierta únicamente por parte de pago. Nunca se ejecutó contra producción.

## Riesgos y límites

- Pendiente de publicar y probar con dispositivos reales; las reglas deben actualizarse para que recepción pueda modificar el stock dentro de la transacción de venta.
- Solo se vinculan automáticamente coincidencias EXACTAS de IMEI/serie. Si falta IMEI, hay diferencias de formato o duplicados históricos, requieren revisión; no se corrigen datos automáticamente.
- El vínculo nuevo no reconstruye equipos vendidos en operaciones históricas. Para partes de pago anteriores, anular busca el vínculo ventaOrigenId existente; registros históricos sin ese vínculo siguen requiriendo revisión manual.
- Pendiente de devolución y A revisar no confirman movimiento físico. El personal debe verificar devolución/recepción real antes de disponer de los equipos.
- Una parte de pago mayor que el precio se rechaza: este flujo no registra saldo a favor/devolución adicional al cliente.
- Se conserva la sincronización V2 posterior a la transacción y sus límites actuales. No se conecta consumo de repuestos de taller ni se resuelve unicidad de SKU/barcode del POS en este cambio.

## Siguiente bloque

Seguimientos: excluir reservas/anulaciones/POS, usar entrega real en postreparación y mejorar mensajes postventa con beneficios configurados y aprobados.
