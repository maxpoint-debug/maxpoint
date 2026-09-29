# MaxPoint — Estado del proyecto

Actualizado: 11 de septiembre de 2026

## Objetivo actual

Consolidar una Lista Maestra de Reparaciones reutilizable como capa comercial sobre el catálogo técnico, con precios sugeridos trazables, precio público protegido e integración compatible con Recepción, Caja y Administración.

## Implementado

- Lista Maestra de Reparaciones agregada como capa comercial en `serviciosMaestros`, sin reemplazar `catalogo`. Administración permite filtrar, editar, activar/desactivar, marcar recomendado, revisar precio/calidad y crear servicios manuales sin repuesto asociado.
- La propia pantalla `Administración → Lista Maestra de Reparaciones` incluye ahora `Actualizar desde Excel`. El estado vacío explica que debe seleccionarse el archivo técnico, y los errores de lectura/permisos de `serviciosMaestros` se muestran en pantalla en lugar de simular una lista vacía.
- El buscador de Lista Maestra actualiza únicamente el listado de resultados; no reconstruye el campo y conserva el foco mientras se escribe.
- El lector del Excel usa el tipo `array` compatible con SheetJS; se corrigió el error `Unrecognized type uint8array` que impedía procesar el archivo seleccionado.
- La importación informa antes de subir cuántos servicios candidatos detectó, ya no acepta como éxito una sincronización de cero servicios y recarga `serviciosMaestros` explícitamente al terminar. Los módulos de normalización/precio se exponen de forma explícita para evitar una sincronización omitida silenciosamente.
- La configuración del catálogo se actualiza mutando sus campos y no reasignando el objeto global, manteniendo compatibilidad con versiones legacy que podían declararlo como constante (`Assignment to constant variable`).
- Se corrigió la reasignación interna de `mezcla` durante la generación de servicios (declarada originalmente como constante), que detenía la sincronización en la etapa `generar Lista Maestra`.
- Políticas editables en `config/politicasReparacion`: cotización, incentivo técnico inicial de ARS 5.000, logística urgente inicial de ARS 30.000, markup de pantallas media/alta, baterías, piezas simples/normales/complejas, reserva de garantía fija o porcentual, márgenes mínimos y equivalencias de calidad.
- Fórmula comercial separa costo directo estimado, precio calculado y precio público. El modo markup suma contribución fija; el modo margen objetivo calcula `precio = costo directo / (1 - margen/100)`. Los precios públicos manuales no se pisan al actualizar costos o políticas.
- Normalización de pantallas: `INCELL`/`INCELL IC` → Económica; `SOFT OLED`/`SOFT OLED IC` → Recomendada; `SERVICE PACK`, `ONLY GLASS` y `REFURBISHED` → Premium. Calidades ambiguas, Hard OLED y denominaciones no equivalentes quedan `REVISAR` y no se ofrecen automáticamente.
- Reglas de costo fuente comercial: baterías exclusivamente desde `Bateria Sin Flex AmpSentrix`; carcasas hasta 14 Pro/Pro Max desde `Carcasa Sin Flex`, con la excepción de iPhone 14/14 Plus y toda la línea 15 o posterior desde `Carcasa Vidrio con Chapa`; cámara trasera exclusivamente desde `Camara Trasera`, excluyendo marcos, vidrios, herramientas y accesorios JC.
- Para fuentes con variantes de color se crea un único servicio comercial por modelo y se toma el mayor costo técnico disponible para evitar subcotización; los códigos alternativos quedan registrados. Los servicios automáticos anteriores que dejan de cumplir estas reglas se conservan pero se desactivan, sin borrar documentos ni afectar servicios manuales.
- Administración incorpora un borrado total deliberado de `serviciosMaestros`, protegido por rol y doble confirmación (`BORRAR LISTA`), para reiniciar una importación cuando el administrador lo solicita. No toca `catalogo`, reparaciones, ventas ni snapshots históricos.
- Las búsquedas de Lista Maestra, Recepción, Caja y Productos normalizan acentos, mayúsculas, signos y ordenan la coincidencia por palabras; por ejemplo, `bateria 11` encuentra `Batería … iPhone 11`.
- Generación inicial curada desde familias `MODULO`, `BATERIA` y `CARCASA`; flex y componentes sólo entran como candidatos inactivos/revisables cuando corresponden a carga, cámara, parlante o micrófono. `IC`, `ADHESIVO`, `JC`, `HERRAMIENTA`, `TORNILLO` y consumibles permanecen en el catálogo bruto y no se convierten en servicios.
- La importación del Excel ahora conserva código, producto, modelo, color, tipo, categoría, costos USD/ARS, disponibilidad, proveedor y archivo de origen. Actualiza `catalogo` incrementalmente por código, marca ausencias sin borrar documentos y sincroniza costos con servicios relacionados.
- Recepción permite buscar servicios maestros por equipo/familia/calidad, prioriza `Recomendada`, autocompleta falla y presupuesto y permite elegir logística en stock, normal o exclusiva/urgente.
- Las reparaciones creadas desde la Lista Maestra guardan `servicioSnapshot` con servicio/calidad/precio/costo/cotización/incentivo/logística/reserva/regla/repuesto fuente y estado de consumo pendiente.
- Caja incorpora exclusivamente servicios maestros activos a la búsqueda comercial, junto con productos POS; nunca incorpora automáticamente el catálogo técnico completo. Las ventas conservan snapshot del servicio y costo directo estimado.
- Tablero administrativo visible sólo para administrador, con filtros Hoy/Semana/Mes/Año/rango y comparación contra el período anterior equivalente.
- Separación conceptual de fuentes: ventas netas y margen desde `ventas`; cobrado desde `pagos`; flujo y gastos desde `movimientosFinancieros`; conciliación desde `cajas`. Estas fuentes no se suman entre sí.
- KPIs administrativos de ventas, cobros, margen bruto, margen porcentual, operaciones, unidades, ticket promedio, egresos operativos y resultado operativo estimado, siempre separando ARS y USD sin aplicar una cotización actual a historia.
- Análisis por línea de negocio, ranking de productos POS, categorías/subcategorías, día de semana, medios de cobro, cuentas, flujo financiero, gastos e inventario.
- Los productos vendidos conservan costo histórico exacto. Como las ventas POS actuales no guardan snapshot de categoría/subcategoría, el tablero usa la clasificación actual del producto y la identifica como tal.
- Los egresos manuales nuevos distinguen gasto operativo, compra de mercadería, transferencia interna, retiro y compensación. Sólo `gasto_operativo` afecta el resultado operativo estimado.
- Categorías iniciales de gasto: Envíos / Comisionista, Insumos, Publicidad / Marketing, Servicios, Sueldos / Honorarios, Impuestos, Mantenimiento, Compras menores y Otros; cada movimiento conserva subcategoría opcional, cuenta, descripción, usuario y fecha/hora.
- Resumen agregado de cierres por período con cantidad, días, cobrado, promedio diario, mejor/peor día, ingresos, egresos y diferencias. El efectivo inicial se usa exclusivamente para conciliación.
- Apertura persistente de caja con efectivo inicial confirmado manualmente, moneda, observación, usuario y fecha/hora.
- Estado de caja abierta con usuario, apertura, efectivo inicial y efectivo físico esperado calculado sólo con movimientos en efectivo de la moneda de la sesión.
- El estado de Caja destaca al usuario actualmente autenticado y muestra en segundo nivel quién abrió la sesión, evitando confundir al operador actual con el usuario de apertura.
- Los botones de ingreso manual, egreso manual y cierre están dentro del panel de estado de Caja para permanecer siempre visibles durante una sesión abierta.
- Ingresos y egresos manuales integrados en `movimientosFinancieros`, con moneda, medio, cuenta, categoría, descripción y auditoría.
- Cierre de caja con fotografía histórica de apertura, movimientos por medio/cuenta, ingresos/egresos, efectivo esperado, contado, diferencia, usuarios y observaciones.
- Histórico administrativo `Cierres de caja`, visible en el menú lateral dentro de `Administración` sólo para el rol administrador, con filtros por día, mes, año y rango personalizado.
- El listado de cierres muestra fecha, horas de apertura/cierre, efectivo inicial/esperado/contado, diferencia, total cobrado y usuario. El detalle recupera ingresos y egresos por `cajaId` y muestra totales por medio/cuenta, observaciones y usuarios de apertura/cierre, sin modificar datos históricos.
- Se detectó que una publicación parcial podía dejar visible el acceso sin renderizar la pantalla si `index.html`, `js/render.js` y `js/caja.js` quedaban en versiones desincronizadas. Estos archivos, junto con `js/state.js` y `js/firebase.js`, deben publicarse como un mismo cambio.
- Catálogo de productos y servicios con nombre, categoría, subcategoría, SKU, barcode, costo, precio, moneda, control de stock y estado activo.
- Alta y edición de productos; stock inicial con movimiento trazable.
- Inventario con entradas, ajustes positivos/negativos y bloqueo de stock negativo.
- POS rápido con búsqueda por nombre/SKU/barcode, soporte de scanner teclado + Enter, carrito, cantidades y descuentos por ítem/global.
- Cliente opcional con “Consumidor final” predeterminado.
- Pagos simples y combinados, diferenciando medio y cuenta destino.
- Venta transaccional: número humano, snapshots de ítems/costos/precios, pagos, movimientos financieros, stock y auditoría se confirman juntos.
- Protección de doble envío y revalidación de stock dentro de la transacción.
- La capa Firestore recalcula precios, costos y descuentos vigentes antes del commit; un carrito desactualizado se rechaza completo.
- Historial, detalle, resumen diario, margen estimado y totales por medio/cuenta.
- Ticket de navegador para 80 mm, cobro con impresión posterior y reimpresión.
- Anulación administrativa transaccional con restitución de stock, pagos marcados como revertidos y movimientos financieros compensatorios.
- Ventas y stock de equipos anteriores conservados y accesibles.
- Navegación separada: `Caja` y `Operaciones de caja` para el trabajo diario; `Ventas de equipos` permanece como registro administrativo exclusivo para administración.
- Ventas de equipos con resumen mensual de unidades, facturación y margen, más desglose por mes y edición legacy conservada.
- Las ventas nuevas de equipos se registran transaccionalmente con pagos simples o combinados, medio, cuenta destino y moneda ARS/USD.
- Las operaciones nuevas de equipos pueden guardarse como `Reservada`: admiten seña parcial o ningún cobro, muestran saldo pendiente y emiten comprobante de reserva. Sólo los pagos efectivamente ingresados generan documentos en `pagos` y movimientos financieros; una reserva sin seña no exige Caja abierta.
- Las reservas quedan excluidas de unidades vendidas, facturación, margen y comisiones mientras continúen reservadas. El IMEI/serie es opcional al reservar y continúa siendo obligatorio para una venta cobrada.
- `Ventas de equipos` es visible para administrador y técnico. Ambos pueden registrar una venta e imprimir/reimprimir su comprobante; el recepcionista conserva el permiso operativo de venta desde Caja. El bloque superior de estadísticas, costos, margen, edición histórica y anulación se muestra únicamente al administrador; el técnico recibe una vista operativa del listado.
- La cotización ARS/USD puede confirmarse dentro de cada venta de equipo; esto no concede permiso para modificar la cotización global del sistema.
- El precio del equipo se conserva en USD; cada cobro en ARS guarda la cotización aplicada y su equivalencia histórica en USD.
- La parte de pago reduce el saldo monetario a cobrar y conserva el ingreso automático del equipo recibido al stock existente.
- Cada pago de una venta nueva de equipo crea en conjunto su documento en `pagos`, su `movimientoFinanciero` y la auditoría de la venta.
- Las ventas de equipos asentadas en Caja conservan edición de cliente/equipo/costo, pero bloquean importe, estado y parte de pago para evitar desbalances; tampoco pueden borrarse físicamente.
- El botón de eliminar ventas de equipos fue reemplazado por `Anular`: conserva el registro y excluye la operación de métricas activas.
- La anulación de una venta nueva de equipo revierte cada pago con un movimiento financiero negativo en su moneda/cuenta original y deja auditoría; las ventas históricas cambian de estado sin inventar movimientos retroactivos.
- Las ventas de equipos anuladas permanecen visibles, pero quedan excluidas de unidades, facturación y margen del mes actual y de cada resumen mensual.
- Cobro de reparaciones desde Caja o desde Pagos, con uno o varios medios/cuentas.
- Cobro de reparación transaccional: actualiza saldo e historial de la orden y crea `pagos`, `movimientosFinancieros` y auditoría en conjunto.
- El campo `seña` del formulario quedó de sólo lectura y reservado para compatibilidad histórica: los cobros nuevos deben usar `Registrar pago`. En órdenes del esquema operativo (`controlComisionV1`), una seña suelta sin pago estructurado ya no reduce el saldo ni simula dinero ingresado en Caja.
- Cada cobro de reparación genera atómicamente un documento `pagos` y un `movimientosFinancieros` determinístico vinculado mediante `pagoId`/`movimientoFinancieroId` y `cajaId`. El saldo se calcula con pagos aplicados únicos, excluyendo revertidos y duplicados por `pagoId`.
- Libro reciente de Caja basado en movimientos financieros, con totales diarios por moneda, medio y cuenta.
- Acción `Anular` visible directamente en cada venta de accesorios para usuarios administradores.
- Validación operativa aprobada el 05/09/2026: navegación y permisos, resumen/edición de ventas de equipos, cobros simples y combinados de reparaciones, actualización de saldo, reflejo en Caja y anulación de ventas de accesorios.

## Pendiente inmediato

- Agregar anulación individual de cobros de reparación mediante movimiento compensatorio.
- Firestore real y las colecciones nuevas respondieron correctamente en la prueba operativa del 05/09/2026.
- Probar scanner USB, impresión real en ticketera de 80 mm y operación móvil/escritorio.
- Confirmar nombres definitivos de cuentas de cobro y categorías iniciales.
- Evaluar una importación incremental de productos/repuestos sólo después de validar el POS; no hay migración automática.

## Decisiones técnicas importantes

- `ventas` se conserva como colección única. Los documentos POS usan `tipoRegistro: "pos"` y `schemaVersion: 1`; los documentos anteriores no se modifican.
- Las ventas nuevas de equipos usan `tipoRegistro: "equipo"`, `schemaVersion: 2` y `cajaRegistrada: true`; las ventas de equipos anteriores continúan funcionando sin migración.
- Productos comerciales viven en `productos`; `stockActual` es una lectura rápida, respaldada por `movimientosStock`.
- Ítems y pagos se copian dentro de la venta para preservar historia. Cada pago también tiene documento propio en `pagos`.
- Crear y anular ventas usa Firestore Transaction para evitar ventas parciales o stock inconsistente.
- Productos, ajustes y anulaciones requieren rol administrador. Cobrar requiere una sesión activa.
- La impresión ocurre únicamente después del commit exitoso.
- ARS es la moneda inicial; venta, ítems y pagos conservan campos de moneda/cotización.
- Cada producto puede operar en ARS o USD. Una venta conserva una única moneda y el POS bloquea mezclar ambas en el mismo carrito.
- Decisión en análisis: Caja debe ser la vista unificada del dinero, pero una venta y un cobro de reparación no deben convertirse en la misma entidad. Ambos convergen mediante pagos y movimientos financieros con referencia a su origen.

## Colecciones/modelos creados o modificados

- `serviciosMaestros`: nueva capa comercial normalizada, vinculada opcionalmente a `catalogo` por `repuestoFuenteId`/código proveedor.
- `config/politicasReparacion`: reglas de precio, costos directos por defecto, margen mínimo y equivalencias editables de calidad.
- `reparaciones`: ampliada de forma compatible con `servicioSnapshot` opcional; las reparaciones legacy no se modifican.
- `ventas`: los ítems de servicios maestros incorporan `servicioMaestroId` y `servicioSnapshot`; los productos POS conservan su flujo previo.
- `catalogo`: importación ampliada e incremental; los productos ausentes se marcan `disponibleFuente:false` en vez de eliminarse.
- `cajas`: nueva; una sesión persistente por apertura/cierre con fotografía histórica al finalizar.
- `config/cajaActual`: nuevo puntero transaccional para impedir dos cajas abiertas simultáneamente.
- `movimientosFinancieros`: ampliada incrementalmente con `cajaId` para operaciones nuevas y tipos `ingreso_manual`/`egreso_manual`.
- `productos`: nueva.
- `movimientosStock`: nueva.
- `pagos`: nueva.
- `movimientosFinancieros`: nueva.
- `contadores/ventas`: nuevo documento para numeración humana.
- `ventas`: ampliada de forma compatible; sólo los documentos POS reciben el esquema nuevo.
- `ventas`: las nuevas ventas de equipos agregan pagos embebidos, moneda, cotización, total pagado y saldo en USD, sin modificar documentos históricos.
- `pagos`: reutilizada para pagos de ventas de equipos con `origenTipo: "venta_equipo"`.
- `movimientosFinancieros`: reutilizada con `tipo: "ingreso_venta_equipo"` y referencia a la venta.
- `auditoria`: reutilizada, sin cambio destructivo.

## Problemas o deuda técnica detectados

- Las reservas V2 se completan sin duplicar la operación: exigen IMEI/serie, Caja abierta y pago exacto del saldo; convierten la reserva en `Cobrada`, conservan pagos anteriores y descuentan los regalos seleccionados dentro de la misma transacción.
- El archivo técnico disponible es `LISTA - 2026.09.03 - CLIENTES.xlsx` (hoja `PEDIDO`, 2.742 filas), aunque el requerimiento lo identificaba como `REPARACIONES 05_26 -Lista de precios.xlsx`.
- La inspección del archivo detectó 1.099 candidatos comerciales antes de curación: 175 pantallas (52 Soft OLED recomendadas, 33 Incell económicas y 90 calidades a revisar), 206 baterías, 328 carcasas y 390 flex/componentes prefiltrados. Aproximadamente 519 quedan inactivos o requieren revisión por calidad, familia técnica o modelo combinado; no se detectaron pantallas Premium confiables para generar automáticamente.
- El consumo automático de repuesto no está implementado. El snapshot deja `repuestoFuenteId` y `consumoRepuestoEstado:'pendiente'` preparados para vincular posteriormente inventario, costo real y margen real.
- La rentabilidad de reparaciones basada en Lista Maestra es estimada hasta registrar el repuesto realmente utilizado. No debe presentarse como margen real.
- Modelos combinados del proveedor (por ejemplo `13P/13PM`) y flex/componentes comercializables quedan inactivos o en revisión para evitar ofrecer una compatibilidad ambigua.
- La primera importación con la nueva versión debe hacerse desde `Administración → Lista Maestra de Reparaciones → Actualizar desde Excel` para enriquecer el catálogo y generar/sincronizar la lista curada. Debe elegirse `LISTA - 2026.09.03 - CLIENTES.xlsx`; por seguridad del navegador no hay escritura automática por el solo hecho de que el archivo exista en la carpeta del proyecto.
- Las ventanas administrativas de `pagos` y `movimientosFinancieros` están limitadas a 2.000 documentos recientes. Antes de alcanzar ese volumen debe reemplazarse por consultas bajo demanda por período o agregados precalculados.
- Los pagos legacy que sólo viven embebidos en reparaciones no forman parte de la métrica exacta `Cobrado` basada en la colección `pagos`; no se inventan cobros retroactivos.
- El margen de reparaciones no se calcula: falta una relación estructurada y confiable entre cada reparación y los costos de repuestos/servicios utilizados.
- `Resultado operativo estimado` no es ganancia neta: excluye impuestos/costos indirectos no registrados y sólo descuenta movimientos clasificados explícitamente como gasto operativo.
- Las categorías/subcategorías no están en el snapshot de los ítems vendidos; su desglose usa la clasificación actual del catálogo, aunque facturación, unidades, costo y margen sí son históricos.
- Los egresos manuales anteriores a la clasificación `tipoEgreso` quedan fuera de gastos operativos para evitar clasificar incorrectamente transferencias, compras o retiros.
- El cierre usa el listener operativo de los 250 movimientos financieros más recientes; deberá reemplazarse por consulta paginada por `cajaId` antes de superar ese volumen dentro de una sola sesión.
- El cálculo distingue monedas y sólo compara físicamente la moneda principal elegida al abrir; un conteo físico simultáneo ARS/USD requerirá dos sesiones o una ampliación futura explícita.
- Las ventas legacy de equipos no generan movimientos financieros retroactivos; sólo las ventas creadas con el formulario nuevo se asientan en Caja.
- Si una venta histórica se anula, sólo se conserva el cambio de estado y auditoría porque no existen pagos estructurados confiables para revertir.
- El alta del equipo recibido como parte de pago conserva el flujo legacy posterior al guardado de la venta; si esa segunda escritura falla, debe cargarse manualmente en Stock de equipos.
- No hay reglas de Firestore versionadas en esta carpeta; las escrituras nuevas pueden ser rechazadas hasta actualizar las reglas desplegadas.
- La carga de `Cierres de caja` informa ahora los errores de lectura de Firestore en pantalla; debe verificarse que las reglas desplegadas permitan al rol administrador leer `cajas` y consultar `movimientosFinancieros` por `cajaId`.
- Se recibió un error `QUOTA_EXCEEDED` al intentar crear el primer producto. Debe revisarse Firestore Usage/Quotas; el sistema ahora expone también el código técnico del error.
- La carpeta entregada no contiene `.git`, aunque producción se publique mediante GitHub/GitHub Pages; no se puede generar commit ni verificar el flujo de despliegue desde aquí.
- La validación de SKU/barcode duplicado se hace antes de guardar; conviene reforzar unicidad con reglas/índices dedicados si habrá altas concurrentes.
- Categorías se guardan como texto y se derivan del catálogo; todavía no existe administración independiente de categorías.
- La lista de movimientos carga la colección completa y limita sólo la representación; deberá paginarse cuando crezca significativamente.

## Próximo paso recomendado

Validar en Firestore una jornada completa: abrir, cobrar accesorio/reparación/equipo, registrar ingreso y egreso manual, cerrar con y sin diferencia y consultar el cierre desde Administración. Luego implementar la reversión individual de cobros de reparaciones.
