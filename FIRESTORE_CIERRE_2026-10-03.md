# Firestore: cierre de permisos — 03/10/2026

## Objetivo

Reemplazar las reglas proporcionadas (`allow read, write: if true`) por autorización en Firestore, conservar permisos editables y mantener portal cliente y cotizador mediante documentos públicos separados. Preparado y validado localmente; NO desplegado ni probado contra datos de producción.

## Archivos modificados en esta etapa

- `firestore.rules`: perfiles activos, roles y matriz configurable, autoría, protección de registros financieros, sesiones diarias y vistas públicas.
- `firebase.json`: configuración de reglas y emulador local; sin asociación a proyecto productivo.
- `js/firebase.js`: listeners internos después del login; publicación de vistas públicas y actualización después de operaciones.
- `js/publico-core.js`: campos públicos explícitos y clave de acceso derivada del celular y orden.
- `js/cotizador-core.js`: compatibilidad con valores calculados del cotizador público.
- `js/portal-admin.js`: botón para generar/actualizar las vistas públicas desde Administración.
- `cliente.html`, `cotizador.html`, `index.html`: acceso a las nuevas vistas y versiones de scripts.
- `tests/publico.test.cjs`, `tests/firestore-rules.test.cjs`: pruebas de vistas públicas y reglas reales en emulador.
- `CIERRE_POR_MODULO_2026-10-02.md` y este documento: estado y publicación.

## Publicación en orden

1. Guardar una copia de las reglas actuales y de los archivos publicados. Confirmar que el administrador existente tiene documento `usuarios/{UID}` con rol `administrador` o `admin`, y no está inactivo. Estas reglas no permiten crear un primer administrador desde un cliente sin perfil.
2. Publicar los scripts internos actualizados, `index.html` y `js/publico-core.js`. Mantener temporalmente las versiones anteriores de las páginas públicas `cliente.html` y `cotizador.html`. Recargar todos los dispositivos internos: las operaciones financieras deben incrementar la revisión de caja.
3. Entrar como administrador, ir a Administración → Portal y pulsar **Actualizar portal y cotizador**. Esperar la confirmación. Revisar en Firestore que existan `portalAccesos`, `portalIndices` y `cotizadorPublico`. No pegar las reglas nuevas antes de completar este paso.
4. Publicar `cliente.html` y `cotizador.html` nuevos junto con los scripts correspondientes. Probar celular + orden reales, historial de ese cliente y cálculos de cotización. El portal no tiene fallback a la colección privada.
5. Publicar el contenido de `firestore.rules` en Firebase Console → Firestore Database → Reglas. La configuración local no publica nada por sí sola.
6. Repetir los controles siguientes con usuarios reales y pestaña privada. Si falla, revisar el error antes de considerar cerrado el módulo.

## Qué probar

- Sin sesión, no se pueden consultar ni escribir reparaciones, ventas, usuarios, costos, caja ni otras colecciones internas.
- Administrador puede cambiar permisos; técnico y recepción respetan la matriz al escribir. Usuario inactivo o rol desconocido queda bloqueado.
- Abrir caja, cobrar reparación, revertir cobro, vender accesorio y anular, reservar/vender equipo y anular, registrar ingreso/egreso y cerrar. Verificar importes, stock e historial.
- Portal acepta celular + orden válidos; combinación incorrecta no entrega historial. Verificar que no aparezcan teléfono, DNI, IMEI, PIN, costos ni notas internas en los documentos públicos.
- Cambiar teléfono de una orden y comprobar que el acceso anterior se deshabilita. Revisar nuevas reparaciones, cobros, entregas y eliminación de una orden en el portal.
- Cotizador mantiene descuentos y redondeos anteriores.
- Al día siguiente se requiere nuevo login. Una hora de inactividad cierra la sesión del navegador. Varias aperturas/dispositivos no suman días adicionales.

## Validación realizada

Pasaron `node tests/caja.test.cjs`, `node tests/permisos.test.cjs`, `node tests/publico.test.cjs` y la comprobación de sintaxis de todos los JS.

`tests/firestore-rules.test.cjs` pasó con las reglas reales en Firestore Emulator, proyecto ficticio `demo-maxpoint-rules`. Incluye lecturas/escrituras anónimas denegadas, perfiles, permiso editable, protección de costos, publicaciones públicas, invalidación de acceso anterior, registro diario y circuito real de funciones de Caja/POS/reparación/reserva/anulación. Dependencias de prueba y Java se instalaron temporalmente fuera del proyecto; no se agregaron dependencias a la aplicación.

## Riesgos y límites concretos

- Mientras las reglas proporcionadas sigan publicadas, la base continúa abierta. Los cambios locales no protegen producción.
- Las reglas autorizan documentos completos: los empleados activos todavía leen documentos internos necesarios para los listeners actuales, incluidos campos de costo. Ocultar esos campos por rol requiere separar documentos y ajustar listeners; el permiso visual de costos no da confidencialidad de lectura. Referencia: https://firebase.google.com/docs/firestore/security/rules-fields
- Celular + orden es una credencial compartida de acceso elegida para el portal. El hash evita identificadores legibles/enumeración por listado, pero no agrega entropía ni equivale a validar por SMS. Quien conoce la combinación puede consultar el historial correspondiente.
- Las vistas se actualizan desde el navegador del empleado. Cerrar la pestaña, perder conexión o un error después de guardar puede dejar una actualización pendiente; se avisa y Administración puede regenerarlas. No hay sincronización garantizada mediante servidor. Más de 400 órdenes para un cliente requiere publicación paginada y se informa como error, sin truncar silenciosamente.
- La renovación diaria se verifica también en reglas por `auth_time`; el timeout de una hora se aplica en el navegador, no por reglas de Firestore.
- Las reglas protegen permisos, campos e inmutabilidad, pero no recalculan toda la contabilidad desde el historial. Los cálculos y comprobaciones de concurrencia siguen en las transacciones existentes.
- No se eliminaron datos históricos, migraron colecciones destructivamente ni publicaron reglas. La prueba de navegador/dispositivos productivos queda pendiente del despliegue coordinado.
