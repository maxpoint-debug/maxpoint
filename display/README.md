# MaxPoint Display — prototipo aislado

## Estado
Primera pantalla HTML 16:9. No modifica el sistema existente, no accede a Firebase ni publica datos reales. Está en una rama de desarrollo.

## Campos confirmados en el código actual
Colección Firestore `stock`, un documento por equipo:
- `modelo`, `capacidad`, `color`, `detalles`
- `precio_venta` (en la interfaz actual se muestra como ARS)
- `estado` (publicar solamente `Disponible`)
- `ventaActivaId` (no publicar si tiene una operación activa)

Nunca exportar `imei`, `precio_costo`, `notas`, ni datos de clientes.

## Próxima integración (pendiente)
Crear un proceso de servidor con permisos mínimos que genere un feed público reducido `{ "products": [...] }` a partir de `stock` y permita su lectura sin autenticar el TV con una cuenta administrativa. No abrir lectura pública de la colección `stock` ni debilitar `firestore.rules`.

El feed debe excluir equipos no disponibles, operaciones activas y precios inválidos. Publicar sólo modelo, capacidad, precio final ARS y, si corresponde, una imagen de producto previamente aprobada.

Configurar `CONFIG.feedUrl` en `display/index.html` cuando exista ese feed. El reproductor refresca cada 120 segundos y conserva el último catálogo si falla la red.

## Medios
Agregar rutas de MP4 aprobados a `CONFIG.videos`. No hay videos ni logos integrados en esta etapa.

## Pruebas
1. Abrir `display/index.html`: sin feed ni precios reales no debe mostrar fichas de venta.
2. Con feed de prueba, un equipo `Disponible` y precio positivo aparece.
3. Un equipo `Reservado`, `Vendido` o con `ventaActivaId` no aparece.
4. Si el feed falla, se conserva la última lista.
5. Probar reproducción y suspensión/encendido en Noblex antes de empaquetar APK.

## Riesgos
No confundir demo con integración real. No publicar ni mergear sin revisión del feed, permisos y pruebas en TV.