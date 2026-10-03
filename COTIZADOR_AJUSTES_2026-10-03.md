# Cotizador: reinicio y parámetros por modelo

## Objetivo

Corregir Nueva cotización y permitir parámetros comerciales por modelo, compartidos entre capacidades. Explicitar si los descuentos por fallas salen del catálogo o de los importes configurados.

El reinicio fallaba por asignar `extras`, variable inexistente en el módulo público. Los importes que no coincidían con parámetros se explican por la prioridad anterior del catálogo: batería, pantalla y otras fallas elegían costos de repuestos; los parámetros eran respaldo. Sin un ejemplo de producción no se puede certificar que esa sea la única causa de todos los valores observados.

## Archivos modificados

- `cotizador.html`: reinicio completo y umbral de batería por modelo.
- `js/cotizador-core.js`: resolución por modelo, origen explícito de descuentos, cámara frontal y carcasa configurables.
- `js/cotizador.js`: selección y guardado administrativo por modelo, preservación de otros modelos, validación de importes.
- `index.html`: controles de configuración y versiones de scripts.
- `tests/cotizador.test.cjs`: regresiones de reinicio, cálculos y guardado.
- Este documento.

## Publicar y configurar

Subir `index.html`, `cotizador.html`, `js/cotizador.js` y `js/cotizador-core.js` juntos a sus rutas actuales en GitHub. Recargar administración y cotizador público. No cambiar reglas de Firestore: se conserva `config/cotizador` y los permisos existentes.

En la pantalla de actualización de base de usados, sección Parámetros comerciales:

1. Elegir un modelo en Configurar parámetros para.
2. Elegir Importes configurados aquí como origen de descuentos.
3. Revisar TODOS los importes y el umbral de batería para ese modelo y guardar. Los campos iniciales provienen de parámetros generales; no se asignaron precios nuevos arbitrarios.
4. Repetir para otros modelos. El mismo modelo comparte parámetros entre capacidades; variantes Pro, Pro Max, mini y Plus se configuran aparte.

Los equipos sin configuración propia siguen usando parámetros generales. El origen anterior Catálogo de repuestos permanece por compatibilidad hasta cambiarlo expresamente. También se puede seleccionar Importes configurados aquí en Parámetros generales.

## Qué probar

- Completar una cotización y pulsar Nueva cotización. Debe volver al paso inicial, limpiar equipo, descripción de falla, batería y resultado anterior.
- Guardar batería USD 40 para iPhone 13 con origen Importes configurados aquí. Con batería bajo el umbral y sin otras fallas, debe descontar USD 40 tanto en 128 GB como 256 GB, aunque el repuesto tenga otro costo.
- Configurar pantalla y comprobar que el importe guardado se aplique exactamente, sujeto al redondeo elegido.
- Verificar que iPhone 13 Pro conserve su configuración y que guardar parámetros generales no borre los de otros modelos.
- Comprobar cámara frontal, carcasa y valores cero: cero significa sin descuento en modalidad de importes configurados.
- Comparar cotizador interno y público para el mismo equipo y estado.

## Validación y riesgos

Pasaron pruebas de cotizador, vistas públicas, permisos y caja, más sintaxis de los scripts modificados y módulo público. No se modificaron reglas ni datos productivos, ni se realizó publicación. Falta prueba en navegador después de subir los archivos y configurar importes reales.

Cambiar el origen altera deliberadamente los descuentos; revisar los importes de cada modelo antes de guardar. El total mínimo y redondeo siguen aplicándose. Los parámetros completos quedan guardados como configuración propia: cambios futuros a generales no modifican modelos que ya tienen configuración.

## Próxima etapa propuesta: fotos y ficha del equipo

No implementada en este cambio. Flujo propuesto:

- En recepción, foto opcional del estado del equipo asociada a la orden, con fecha y autor.
- En Tus equipos, abrir ficha con modelo, capacidad, color y número de serie/IMEI; evitar agrupar dos dispositivos distintos solo porque comparten modelo.
- Mantener fotos e ingresos anteriores si el equipo vuelve al taller.
- Al entregar, sugerir foto opcional del estado final sin bloquear la entrega.
- Configurar almacenamiento y reglas para que las fotos se consulten con el acceso correspondiente del portal. La proyección pública actual no incluye serie/IMEI: deberá ampliarse explícitamente junto con sus reglas y pruebas.
