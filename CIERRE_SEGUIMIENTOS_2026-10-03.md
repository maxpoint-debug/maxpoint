# Seguimientos y publicación conjunta

## Objetivo

Cerrar la selección de destinatarios y los mensajes postventa/postreparación; publicar junto con stock/reservas.

- Excluye reservas, anuladas, devueltas y POS. Históricos sin estado mantienen la interpretación Cobrada existente.
- Cuenta postventa desde completadaEn cuando existe, o desde fecha de venta; nunca desde fechaReserva.
- Postreparación requiere Entregado y fecha de entrega: fechaEntrega o un evento Entregado comprobable en timeline. No usa fecha de ingreso. Presupuestos no aprobados/sin intervención se excluyen. Eventos fabricados por importación (`_imp`) no se toman como entrega real, salvo que exista una nueva entrega con actor UID.
- Las nuevas entregas registran fechaEntrega en el día comercial argentino y reinician el seguimiento como pendiente. No migra fechas de históricos ni inventa entregas ausentes; la interfaz informa cuántos casos quedan fuera por falta de fecha.
- Mensajes con primer nombre, equipo, días reales y pregunta por su experiencia. No incluyen IMEI/serie ni presuponen stock/promociones.
- Administración configura un beneficio de hasta 500 caracteres en config/seguimientos desde la tarjeta Beneficio. Vacío lo desactiva. Se conserva en otros dispositivos; ya no hay un 10% inventado por defecto. Se puede escribir 2x1 en fundas cuando el negocio lo apruebe.
- Abrir WhatsApp prepara el texto y no marca contacto. Después de enviarlo, el empleado selecciona Contactado. Teléfonos argentinos se normalizan con código internacional; números incompletos y ventanas bloqueadas se informan.
- Se validan estados de seguimiento, conservando enviado como alias histórico de contactado. Los listeners refrescan la vista después de cambios de ventas/configuración.

## Ajuste de publicación necesario

Se encontró que js/data.js incluía 3.463 registros históricos de clientes, cargados públicamente desde index.html y accesibles por fuera de Firestore. Se retiró esa copia del archivo publicado, preservando los datos completos en un respaldo LOCAL fuera de la carpeta del sitio:

`/private/tmp/maxpoint-respaldo-privado-2026-10-03/datos-historicos.json`

También se conservó el archivo original en el mismo directorio como data.js.original. Guardar el JSON en una ubicación privada permanente; /private/tmp es temporal. NO subir esos respaldos a GitHub/hosting. No se borraron documentos de Firestore. La lista EQUIPOS_APPLE permanece igual.

La importación administrativa ahora elige un JSON local si no hay datos cargados, valida su estructura y pide confirmación antes de importar. Si un guardado falla, se detiene y muestra la orden afectada en lugar de informar una importación completa incorrecta. Los datos elegidos se limpian de memoria al cambiar sesión.

Reemplazar el archivo del sitio no elimina versiones anteriores de GitHub ni copias previas: si el repositorio es público, debe revisarse además su historial. No declarar resuelta esa exposición histórica solo por esta publicación. Celular + orden conserva el acceso elegido y no equivale a una validación por SMS.

## Archivos modificados en este bloque

- js/seguimientos.js: selección, fechas, mensajes, WhatsApp y beneficio.
- js/firebase.js: fecha de entrega, configuración, validaciones y listeners.
- js/state.js: configuración y API placeholder.
- js/render.js: beneficio, aviso de confirmación y casos sin fecha.
- firestore.rules: configuración solo administrativa, fechaEntrega y estados válidos.
- js/data.js: datos históricos fuera del recurso público.
- js/modals.js: importación desde JSON local y parada ante error.
- index.html: versiones de scripts.
- tests/seguimientos.test.cjs, tests/permisos.test.cjs y tests/firestore-rules.test.cjs.
- Este documento y CIERRE_POR_MODULO_2026-10-02.md.

## Publicar ambos bloques juntos

1. Guardar una copia privada de los archivos publicados y reglas actuales. Copiar el respaldo JSON anterior a una ubicación privada permanente FUERA del repositorio.
2. En Firebase Console → Firestore Database → Reglas, publicar el contenido LOCAL ACTUAL de firestore.rules. Incluye stock/reservas y seguimientos. No usar una copia de la entrega anterior.
3. En GitHub → Add file → Upload files, subir index.html y la carpeta js COMPLETA actual, conservando rutas. El archivo js/data.js actual no contiene históricos. No subir el directorio de respaldo ni ningún JSON de clientes. No es necesario volver a subir cliente.html/cotizador.html, que ya fueron publicados.
4. Esperar actualización del sitio y recargar todos los dispositivos. Entrar como administrador en Seguimientos → Beneficio y configurar únicamente una promoción vigente, o dejarlo vacío.
5. Comprobar los recorridos de stock/reservas del documento CIERRE_STOCK_RESERVAS_2026-10-03.md y las pruebas siguientes.

## Qué probar

- Una reserva/anulación/venta POS de hace 90 días no aparece en postventa. Una venta Cobrada con teléfono sí aparece dentro de la ventana.
- Reparación ingresada hace 90 días pero entregada hace 10 no aparece todavía. Entregada hace 60 sí aparece. Si no tiene entrega comprobable, queda fuera y aparece el aviso.
- Abrir WhatsApp: primer nombre, modelo sin IMEI y días correctos. El estado sigue Pendiente hasta seleccionar Contactado después de enviar.
- Configurar 2x1 en fundas desde administración; comprobar el texto desde recepción y otro dispositivo. Desactivarlo dejando vacío; comprobar que no se ofrezca 10% ni otra promoción.
- Un técnico/recepción no cambia el beneficio comercial pero puede registrar el seguimiento si su permiso está habilitado.
- Verificar que el js/data.js servido por el sitio tenga DATOS_HISTORICOS vacío y continúe cargando reparaciones desde Firestore. No importar nuevamente históricos para hacer esta comprobación.

## Validación y riesgos

Pasaron pruebas locales de seguimiento (fechas, destinatarios, textos, beneficio, permisos, WhatsApp, render e importación JSON), permisos, stock/ventas, caja, cotizador, portal/sesiones y sintaxis de todos los JS.

Firestore Emulator pasó con reglas y funciones reales de los dos bloques, guardado de entrega/fechaEntrega, beneficio administrativo, bloqueo anónimo y estados inválidos. No se enviaron mensajes reales, publicaron archivos ni modificaron datos productivos.

Se conservan las ventanas de contacto anteriores (reparación 55–120 días; venta 85–150 y 355–420). Contactado es confirmación manual, no verificación automática de envío. Las fechas de entrega ausentes requieren revisión administrativa; no se completan automáticamente. Los contadores de clientes por identidad y comisiones siguen pendientes del próximo bloque.
