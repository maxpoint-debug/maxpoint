# Cierre de sesiones y recuperación del portal

## Objetivo

Corregir dos problemas del recorrido ya implementado, sin agregar fotos ni modificar reglas:

- Al vencer una sesión, la comprobación `sesionActiva()` hacía salir al temporizador antes de ejecutar el cierre. Se bloqueaban guardados, pero no se volvía al login. Ahora se verifica el vencimiento directamente y se invalida el registro compartido entre pestañas.
- Una actualización fallida del portal no tenía recuperación automática. Ahora se conserva una cola de IDs por usuario en el navegador y se reintenta al iniciar sesión/cargar permisos, recuperar conexión y cada 30 segundos mientras exista sesión habilitada. Los errores de publicación no repiten ni revierten la operación de negocio guardada.
- La regeneración administrativa invalida accesos anteriores antes de sobrescribir sus índices, incluso si faltó la publicación después de cambiar teléfono u orden. No elimina documentos.
- El inicio de sesión rechaza un perfil con rol desconocido.

## Archivos modificados

- `js/firebase.js`.
- `index.html`: versión del módulo Firebase 71.
- `tests/sesion-portal.test.cjs`: vencimiento y cola persistente.
- `tests/firestore-rules.test.cjs`: regeneración administrativa de un acceso anterior.
- Este documento y `CIERRE_POR_MODULO_2026-10-02.md`.

## Qué publicar y probar

1. Subir `js/firebase.js` e `index.html` a sus rutas actuales de GitHub. No publicar otras funcionalidades ni cambiar reglas.
2. Recargar todos los dispositivos. Entrar a Administración → Portal → Actualizar portal y cotizador una vez y esperar confirmación.
3. En una reparación habitual, guardar un cambio y comprobarlo en el portal. Verificar también cobro/estado con la operación normal; no crear movimientos ficticios en caja productiva.
4. Desde una sesión de prueba abierta en dos pestañas, dejar una hora sin actividad. Ambas deben volver al login al detectar vencimiento, y no aceptar guardados. La actividad después del vencimiento no debe restaurar la sesión.
5. Al día siguiente debe exigir nuevo ingreso. Varias aperturas el mismo día y distintos dispositivos deben seguir generando un documento `sesionesDiarias/{UID}_{fecha}`.
6. Si aparece un aviso de actualización pendiente del portal, comprobar que después de recuperar conexión/recargar con el mismo usuario el cambio se publique. No repetir el cobro ni el guardado por ese aviso.

## Validación

Pasaron las pruebas locales de sesión/portal, caja, permisos, cotizador y proyecciones públicas, y la comprobación de sintaxis de todos los JS. El circuito de reglas/cobros/ventas y regeneración del portal pasó también en el emulador, con datos ficticios.

El usuario confirmó que publicó las reglas, que los módulos cargan y que portal/cotizador funcionan. Esta confirmación no es una inspección independiente de producción. Este último ajuste todavía requiere la subida y las pruebas anteriores.

## Riesgos y límites

- La cola conserva solo IDs/versiones, sin información personal, y pertenece al navegador/usuario que guardó. Borrar sus datos locales o no volver a abrirlo impide ese reintento; Administración conserva la regeneración completa como recuperación.
- No es un proceso de servidor. Una pestaña cerrada no trabaja en segundo plano, y todavía puede existir una interrupción entre guardar la operación y registrar la tarea local. Si el almacenamiento local falla, se avisa de que no se conservará al cerrar el navegador.
- El timeout de una hora sigue siendo local. Las reglas comprueban sesión diaria, perfil activo y permisos; no observan actividad de teclado/mouse.
- El permiso de ver costos continúa ocultándolos en interfaz; empleados activos todavía leen documentos internos que contienen costos. Separar esos campos requiere un cambio propio en documentos/listeners.
- No se alteraron saldos, pagos, cierres ni datos históricos. Fotografías quedan aplazadas por instrucción del usuario.

## Continuación del cierre por módulos

Esto completa la corrección técnica localizada del recorrido de acceso/portal; falta la verificación publicada. No certifica todos los módulos del sistema. Según el orden acordado, después corresponde stock/parte de pago y reservas, luego seguimientos/mensajes y contadores/identidades. Estos pendientes siguen abiertos y no deben presentarse como resueltos.
