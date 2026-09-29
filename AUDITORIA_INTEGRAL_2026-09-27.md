# Auditoría integral MaxPoint — 27/09/2026

## Alcance

Auditoría sobre la publicación `https://maxpoint-debug.github.io/maxpoint/` con perfiles administrador, técnico y recepción. Se ejecutaron operaciones reales identificadas con `AUDITORIA-1790561186433` y se conciliaron reparaciones, pagos, movimientos financieros, stock y cierres.

La primera prueba integral cubrió especialmente reparaciones, Caja, ventas de equipos, reservas y regalos. La revisión posterior amplió el alcance a navegación, permisos, POS/accesorios, inventarios, cotizador, seguimientos, clientes, usuarios, comisiones y tablero administrativo. Los módulos de menor prioridad fueron revisados por código y permisos; no todos recibieron una operación destructiva en producción.

## Prueba transaccional ejecutada

1. Apertura de Caja ARS con efectivo inicial $0.
2. Creación de reparación de prueba por $1.000.
3. Cobro por transferencia y verificación de pago + movimiento financiero.
4. Entrega de reparación pagada.
5. Reversión del cobro y movimiento compensatorio por -$1.000.
6. Creación y entrega de garantía sin cargo.
7. Venta de equipo por USD 10 con un regalo seleccionado del inventario.
8. Descuento de una unidad del regalo.
9. Corrección del número de serie por el usuario técnico.
10. Anulación administrativa de la venta, reversión del pago y restitución del regalo.
11. Creación y anulación de una reserva sin seña.
12. Eliminación de reparación y garantía de prueba.
13. Cierre de Caja con diferencia $0.

La venta y la reserva permanecen visibles como anuladas por trazabilidad. Los registros de reparación y garantía fueron eliminados. Los cuatro movimientos financieros de prueba se compensan entre sí. El movimiento de regalo y su restitución también se compensan.

## Resultado de conciliación

- Caja de auditoría: `1e20lrRrsumm6v6P5LZI`.
- Ingreso reparación: ARS 1.000.
- Reversión reparación: ARS -1.000.
- Ingreso venta: USD 10.
- Reversión venta: USD -10.
- Diferencia de cierre: ARS 0.
- Regalo: stock 2 → 1 → 2.
- Pago de venta marcado como revertido.
- Número de serie corregido por técnico: verificado.

## Revalidación posterior a publicación

Publicación de `main` verificada byte a byte para los diez archivos críticos. El despliegue de GitHub Pages finalizó correctamente y luego renovó su caché.

Prueba real identificada como `AUDITORIA-1790563092253`:

1. Inicio de sesión y matriz de permisos comprobados con administrador, técnico y recepción.
2. Apertura de Caja por técnico.
3. Egreso manual ARS 1 con motivo y posterior ingreso compensatorio ARS 1.
4. Ajuste de stock de `Adaptador Jack a Lightning`: 1 → 2 → 1.
5. Reserva de equipo creada y completada por técnico.
6. Venta POS cobrada por técnico.
7. Reserva/venta de equipo anulada por administración.
8. Venta POS anulada por administración.
9. Stock final confirmado en 1, igual al valor inicial.
10. Caja `8FJ0Nun3uW7jtqrDPuer` cerrada con efectivo esperado ARS 0 y diferencia ARS 0.

Registros anulados conservados por trazabilidad:

- Reserva/venta de equipo: `nvSTkGTrExJE92ZzgoZm`.
- Venta POS: `WVFP7ucQwtqTvaEgch6q`.

No quedaron reparaciones, ventas activas, reservas abiertas, cajas abiertas ni diferencias generadas por esta prueba.

## Hallazgos y estado

### A-01 — No existía finalización de reservas

- Severidad: crítica.
- Evidencia: se podía crear `Reservada`, pero no cobrar el saldo ni convertirla en `Cobrada`.
- Impacto: obligaba a duplicar la venta o dejar reservas abiertas indefinidamente.
- Estado: corregido en código local, pero no presente en los JavaScript servidos por GitHub Pages al 27/09/2026.
- Solución: acción `Completar reserva`, IMEI obligatorio, cobro exacto del saldo, Caja abierta, conversión transaccional a venta, descuento de regalos y auditoría.
- Pendiente: publicar y repetir prueba real.

### A-02 — Edición de ventas por técnico

- Severidad: alta.
- Evidencia: el técnico podía vender y consultar, pero no corregir IMEI/serie.
- Estado: corregido y probado en producción.
- Solución: técnico habilitado para editar únicamente datos operativos. Precio, costo, pagos, estado, parte de pago y regalos quedan protegidos.

### A-03 — Actualización técnica aceptaba objetos arbitrarios

- Severidad: alta.
- Evidencia: la interfaz bloqueaba importes, pero `FB.updV` reenviaba todo el objeto recibido.
- Impacto: un usuario técnico con consola del navegador podía intentar cambiar campos financieros.
- Estado: corregido en código local con lista explícita de campos permitidos, pero no presente en el `firebase.js` servido por GitHub Pages al 27/09/2026.
- Pendiente: publicar y validar también reglas Firestore.

### A-04 — Regalos no descontaban inventario

- Severidad: alta.
- Estado: corregido y probado en producción.
- Solución: selección explícita de funda, templado o cable; movimiento `regalo_venta_equipo`; restitución automática al anular.
- Observación: no se descuenta durante una reserva; se descuenta al completarla.

### A-05 — Recepción no podía gestionar reservas desde su vista

- Severidad: alta.
- Evidencia: recepción puede vender, pero no accede a la pantalla administrativa de ventas.
- Estado: corregido en código local, pero no presente en el `pos.js` servido por GitHub Pages al 27/09/2026.
- Solución: `Operaciones de caja` muestra ventas y reservas y ofrece `Completar reserva` según permiso `vender_equipo`.

### A-06 — Deuda histórica mezclada con deuda operativa

- Severidad: alta.
- Evidencia: pantalla Pagos muestra 55 pendientes por ARS 6.900.230; 49 están entregadas. Existen 69 reparaciones marcadas pagadas sin pago estructurado.
- Impacto: la deuda mostrada no representa necesariamente cuentas reales por cobrar.
- Estado: presentación corregida en código local; los registros históricos siguen pendientes de revisión administrativa. El `render.js` publicado todavía no coincide con la versión local.
- Solución: separar deuda operativa de entregas históricas y evitar duplicar reparaciones parciales en dos listas.

### A-07 — Cierres históricos con diferencias importantes

- Severidad: alta.
- Evidencia: 7 de 12 cierres revisados tienen diferencia; acumulado aproximado ARS -2.273.651,66.
- Estado: pendiente de revisión administrativa, no debe corregirse automáticamente.
- Recomendación: mostrar efectivo, transferencias, tarjetas y total cobrado en bloques separados. Nunca comparar total cobrado general contra efectivo contado.

### A-08 — Garantías históricas anómalas

- Severidad: media.
- Evidencia: órdenes `#0147` y `#0178` tienen presupuesto $1 y cobro $1, aunque se interpretan como garantía sin cargo.
- Estado: pendiente de revisión manual.
- Recomendación: conservar trazabilidad y decidir administrativamente si corresponde revertir esos importes.

### A-09 — Parte de pago no es completamente transaccional

- Severidad: alta.
- Evidencia: la venta se guarda primero y el equipo recibido se agrega después mediante una segunda operación independiente.
- Impacto: si falla el alta de stock, la venta queda registrada sin el equipo recibido. Al anular, no se retira automáticamente del stock.
- Estado: corregido en código local, pero no presente en el `firebase.js` servido por GitHub Pages al 27/09/2026.
- Solución: la venta y el alta del equipo recibido ahora se escriben en la misma transacción. Si una operación falla, no se guarda ninguna.
- Pendiente: publicar y probar una venta y una reserva con parte de pago.

### A-10 — Correcciones y anulaciones requieren Caja actual

- Severidad: media.
- Comportamiento: las reversiones posteriores se registran en la Caja actual, sin modificar el cierre original.
- Estado: correcto contablemente.
- Mejora sugerida: mostrar en el movimiento la Caja y fecha de origen de manera visible.

### A-11 — Seguridad depende parcialmente del cliente

- Severidad: alta.
- Evidencia: los permisos JavaScript ocultan acciones, pero no hay reglas Firestore versionadas en este proyecto para auditar.
- Estado: pendiente.
- Recomendación: versionar y probar reglas con emulador para administrador, técnico y recepción. La interfaz nunca debe ser la única barrera.

### A-12 — Credenciales compartidas durante la auditoría

- Severidad: alta.
- Estado: pendiente del propietario.
- Recomendación: cambiar las tres contraseñas, especialmente la administrativa.

### A-13 — Publicación parcial e inconsistente

- Severidad: crítica.
- Evidencia: `index.html` y `js/admin.js` publicados coinciden byte a byte con los archivos locales, pero `js/state.js`, `js/render.js`, `js/pos.js`, `js/ventas.js` y `js/firebase.js` tienen hashes distintos aun consultándolos con un parámetro anticaché.
- Impacto: el HTML anuncia versiones nuevas, pero la lógica servida sigue sin completar reservas, sin mostrar reservas a recepción y sin aplicar la lista blanca financiera del técnico.
- Estado: resuelto. Los diez archivos críticos de `main` coincidieron byte a byte y GitHub Pages renovó la caché antes de la revalidación transaccional.
- Validación obligatoria: comparar los siete hashes y recién después repetir operaciones reales.

### A-14 — Permisos de Caja demasiado implícitos

- Severidad: alta.
- Evidencia: vender equipos tiene permiso explícito, pero abrir/cerrar Caja, crear ventas POS, cobrar reparaciones y registrar movimientos manuales no tienen permisos de negocio separados en `PERMISOS_BASE`.
- Impacto: la aplicación no distingue claramente entre cobrar una operación y administrar dinero manualmente. La seguridad depende además de reglas Firestore no versionadas.
- Criterio recomendado para el taller:
  - Técnico: reparar, cobrar reparaciones, vender/cobrar equipos y accesorios, completar reservas, corregir datos operativos, operar Caja, registrar movimientos justificados y ajustar cantidades de inventario.
  - Recepción: lo anterior, más apertura/cierre operativo de Caja y seguimiento de clientes.
  - Administración: todo lo anterior, más anulaciones, reversiones, egresos/ingresos manuales, costos, inventario, cierres históricos, usuarios y configuración.
- Estado: permisos explícitos publicados y probados con los tres perfiles. Todo movimiento manual de Caja y stock exige motivo y conserva usuario/fecha. Pendiente: replicar las restricciones en reglas Firestore.

### A-15 — Tablero administrativo completo pero desordenado para uso diario

- Severidad: media.
- Evidencia: abre con nueve indicadores y continúa con tablas de líneas, productos, categorías, días de semana, días del mes, evolución mensual, gastos, medios, flujo, cuentas, inventario y alertas. Las alertas aparecen al final.
- Lo correcto: separa ARS/USD, ventas/cobros/flujo y diferencia datos exactos de resultado estimado.
- Lo faltante para un taller: reparaciones activas demoradas, listas para entregar, deuda operativa, garantías/retrabajos, reservas abiertas y diferencias de Caja visibles arriba.
- Estado: primera simplificación implementada localmente. Alertas accionables primero; Caja, reservas, deuda, garantías abiertas y diferencias de cierres visibles en el resumen. El análisis extenso permanece como detalle financiero.
- Orden recomendado: alertas y pendientes accionables; ventas/cobros/margen; Caja y deuda; reparaciones; stock crítico; rankings y análisis histórico al final o bajo detalle.

### A-16 — Dos paneles administrativos superpuestos

- Severidad: media.
- Evidencia: el menú ofrece `Tablero administrativo` y `Balance`. El primero contiene análisis financiero detallado; el segundo abre `Centro de Control` con operación, alertas, comisiones, rentabilidad y stock.
- Impacto: no queda claro cuál debe consultarse cada día y hay indicadores repetidos calculados con lógicas diferentes.
- Estado: corregido en navegación local. Existe una sola entrada `Administración`; abre el resumen operativo y enlaza al `Detalle financiero`. La ruta anterior se conserva internamente por compatibilidad, pero deja de duplicarse en el menú.
- Recomendación: conservar una sola entrada `Administración`, con resumen operativo primero y secciones de detalle financiero debajo. Hasta consolidarlo, renombrar `Balance` a `Centro de control` para evitar prometer una conciliación contable.

### A-17 — Stock de equipos modificable sin permiso de negocio explícito

- Severidad: alta.
- Evidencia: `FB.addSt`, `FB.updSt` y el cambio rápido de estado no verifican un permiso; sólo la eliminación queda restringida a administración. La interfaz permite a cualquier perfil autenticado agregar y editar equipos.
- Impacto: un perfil operativo puede modificar precio de venta, IMEI o estado. El costo se oculta visualmente, pero la función de guardado sigue enviando el campo.
- Estado: corregido, publicado y validado por rol. Administración y técnico pueden gestionar datos operativos; el técnico no puede enviar precios ni costos. Recepción queda en modo consulta.
- Recomendación: administrador gestiona precios/costos; técnico puede actualizar revisión, estado, IMEI y detalles; recepción sólo consulta, salvo decisión operativa expresa.

### A-18 — Protecciones incompletas en funciones sensibles

- Severidad: alta.
- Evidencia: actualización genérica de reparaciones, configuración general/comisiones y varias operaciones de Caja dependen de que la interfaz no las invoque. Algunas funciones sólo comprueban que exista sesión.
- Impacto: ocultar botones no constituye autorización. Desde consola, o si las reglas Firestore son permisivas, podrían enviarse campos no previstos.
- Estado: pendiente.
- Recomendación: validar permiso y lista blanca de campos en cada función, y replicar exactamente esas restricciones en reglas Firestore versionadas.

## Matriz de permisos observada

| Acción | Administrador | Técnico | Recepción |
|---|---:|---:|---:|
| Reparaciones | Sí | Sí | Sí |
| Cobrar reparación | Sí | Sí | Sí |
| Ver ventas equipos | Sí | Sí | No |
| Crear venta | Sí | Sí | Sí |
| Corregir datos de venta | Sí | Sí | No |
| Completar reserva desde Caja | Sí | Sí | Sí |
| Ver costos/margen | Sí | No | No |
| Anular operaciones | Sí | No | No |
| Cierres/administración | Sí | No | No |

## Matriz de permisos recomendada

| Acción | Administrador | Técnico | Recepción |
|---|---:|---:|---:|
| Ingresar y actualizar reparaciones | Sí | Sí | Sí |
| Cobrar reparaciones | Sí | Sí | Sí |
| Vender/cobrar accesorios | Sí | Sí | Sí |
| Vender equipos y completar reservas | Sí | Sí | Sí |
| Corregir IMEI/serie y datos operativos de venta | Sí | Sí | Opcional |
| Ver costos y márgenes | Sí | No | No |
| Anular/revertir cobros y ventas | Sí | No | No |
| Registrar egresos/ingresos manuales justificados | Sí | Sí | Sí |
| Abrir Caja | Sí | Sí | Sí |
| Cerrar Caja | Sí | Sí | Sí |
| Ajustar cantidades de artículos | Sí | Sí | No |
| Ajustar precios, costos, usuarios y configuración | Sí | No | No |

## Casos obligatorios después de la próxima publicación

1. Reserva sin seña → completar por recepción.
2. Reserva con seña ARS → completar saldo combinado.
3. Confirmar que el pago inicial y final no se dupliquen.
4. Confirmar IMEI obligatorio al completar.
5. Confirmar descuento de regalos sólo al completar.
6. Anular la venta completada y verificar restitución de regalos y reversión de todos los pagos.
7. Intentar modificar precio con técnico mediante llamada directa y comprobar que el servidor ignore el campo.
8. Probar reglas Firestore fuera de la interfaz.

## Conclusión

El circuito ya publicado durante la primera prueba de reparaciones, pagos, garantías, Caja, ventas, regalos y reversiones concilió correctamente. El sistema todavía no debe considerarse cerrado: la publicación actual mezcla archivos nuevos y anteriores. Falta publicar de forma consistente, repetir reservas y partes de pago, explicitar los permisos de Caja, ordenar el tablero administrativo y verificar reglas Firestore.
