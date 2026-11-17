# Piccolo · Reservas V2 (rama de desarrollo)

## Estado
El panel `admin/reservas.html` está implementado en código, **no desplegado ni probado contra Firebase de producción**. La web pública en `main` sigue intacta.

## Reglas comerciales
- La consulta no bloquea nada.
- Solo el administrador autenticado que registra una seña suficiente confirma la reserva.
- La transacción de Firestore crea la reserva y un lock por equipo físico por fecha: `inventoryLocks/{YYYY-MM-DD}_{productId}`.
- Los combos incluyen todos los `componentProductIds` y la selección de cada `componentGroups`.
- La cancelación elimina los locks únicamente si pertenecen a la reserva; no realiza devoluciones de dinero.
- Una segunda confirmación de la misma consulta o de un equipo ocupado falla sin bloquear parcialmente.

## Requisitos antes de producción
1. Revisar datos existentes de `reservations`, `inventoryLocks`, `dateBlocks` y `productBlocks`. El sistema nuevo usa IDs determinísticos; migrar reservas previas para evitar solapamientos.
2. Verificar el formato de bloqueos manuales: hoy el backend consulta `dateBlocks/{fecha}` y sus campos; todavía **no integra `productBlocks`**, por lo que no debe ponerse en producción si esos bloqueos se utilizan.
3. Revisar permisos de las reglas de Firestore; el borrador `firestore.rules` respeta `admins/{uid}.active`, pero no debe publicarse sin revisar contra las reglas actuales.
4. Confirmar disponibilidad de Cloud Functions (plan Blaze, facturación) y que los administradores puedan iniciar sesión.
5. Ejecutar pruebas con Firebase Emulator Suite: dos confirmaciones concurrentes del mismo equipo y día, combos con componentes compartidos, cancelación, usuarios no administradores y fecha bloqueada.
6. Configurar el sitio para que las llamadas a Functions apunten al proyecto `piccolo-maxpoint`. El frontend usa región `southamerica-east1`.

## Despliegue posterior a pruebas
Desde el directorio `piccolo`:
```sh
cd functions && npm install && cd ..
firebase use piccolo-maxpoint
firebase deploy --only functions:piccolo --project piccolo-maxpoint
```
**No ejecutar deploy de reglas** sin verificar el borrador y la configuración actual de producción.

## Limitaciones actuales
- Registro manual de seña: no se verifica automáticamente la transferencia bancaria.
- No se integra aún `productBlocks` ni reservas históricas.
- No hay consulta pública de disponibilidad ni retenciones temporales.
- El importe mínimo se calcula sobre el precio del catálogo actual; no incluye traslado ni adicionales.
- La pantalla lista hasta 100 consultas y reservas recientes.
