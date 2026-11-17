# ZAZO · Operación de feria

Cada ingreso abre un turno de 15 minutos. Tocá **Nuevo turno → grupo de edad → medio de pago → confirmar**. El nombre de pila es opcional. Entregá el número asignado en un cartel. Confirmá QR y transferencias después de ver la acreditación en la cuenta receptora. Usá **Llamado** y después **Ya salió** para liberar cupo. Una renovación suma 15 minutos al saldo o inicia 15 minutos si ya venció.

## Preparación

1. Entrá a Configuración y cargá precio en pesos, cupo, alias y la imagen real del QR. Revisá con la cuenta receptora que el QR y el alias correspondan al puesto.
2. Abrí la misma dirección en ambos iPads con acceso al sitio. El navegador debe quedar visible para que se vean las alertas. Tocá el botón de sonido en cada iPad para activar las alertas sonoras. Llevá cargadores.
3. Prepará carteles numerados y una planilla. Para caja usá **Exportar CSV** al cierre. Si se devuelve dinero, hacé la devolución en el medio de pago y anulá el turno con su motivo en ZAZO. La anulación descuenta todos los cobros del turno.

## Si hay un imprevisto

| Situación | Qué hacer |
| --- | --- |
| Pago pendiente | Esperá la acreditación o acordá otro medio. Si ya se envió el dinero, verificá la cuenta antes de cobrar de nuevo. |
| Operación enviada sin confirmación | Tocá **Reintentar** en la misma tablet. Se reenvía el mismo registro y se evita duplicarlo. Si hubo acreditación, no vuelvas a cobrar. |
| Internet caído | Usá una sola planilla compartida y números con prefijo M. Anotá el medio y el importe acreditado. Mantené los turnos en curso con un reloj independiente y la última información visible. Al volver la conexión, conciliá los ingresos manuales con el CSV. |
| Una tablet falla | Operá desde la otra tablet y revisá si el número o el cobro pendiente ya aparece. |
| Cupo completo | El cupo se libera cuando se confirma la salida o se anula el turno. |
| Demora en el retiro | Marcá **Llamado** y mantené el turno en esa pestaña hasta que el adulto autorizado lo retire. Identificá el retiro con el cartel. |
| Pago duplicado o devolución parcial | Registrá el ajuste aparte en la planilla de caja, con el medio e importe. Conservá la referencia de la devolución. |

### Planilla de contingencia

Imprimí o copiá esta tabla. La hora de vencimiento es la de ingreso más 15 minutos. Conservá los comprobantes en la cuenta receptora.

| Nº | Nombre de pila opcional | Edad | Entrada | Vence | Medio | Importe | Llamado | Salió | Observación |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M001 | | | | | | | | | |
| M002 | | | | | | | | | |
| M003 | | | | | | | | | |

## Servidor local

Requiere Node.js 24. Ejecutá `npm run dev` en una computadora conectada a la misma red privada que los iPads. Los dos iPads deben abrir `http://IP-DE-LA-COMPUTADORA:3000`. El servidor guarda el estado en SQLite. Los datos locales y los del sitio alojado son independientes. Elegí uno como registro principal y usá la planilla si ese registro falla. El servidor local permite acceso a cualquiera que pueda alcanzarlo en la red. Usalo únicamente en una red privada del equipo.

`npm test` comprueba el motor de turnos y cobros. `npm run build` empaqueta el Worker.

## Precio y propina

En **Configuración**, guardá la tarifa general en pesos. En la confirmación de un ingreso o una renovación podés abrir **Editar precio o agregar propina** para ajustar ese cobro. Una cortesía tiene tarifa $0 y admite una propina opcional con su propio medio de pago. El total ingresado incluye la propina y el CSV la desglosa.

## Entrada desde Firebase Hosting

La rama de GitHub contiene el código. El tablero publicado usa un servidor y autenticación privada de Sites. Para usar `https://piccolo-maxpoint.web.app/zazo/` como entrada, reemplazá el destino en la [plantilla de redirección](firebase-hosting/zazo-redirect.json) por la dirección del tablero y agregá esa regla a `hosting.redirects` de la configuración existente del sitio `piccolo-maxpoint` y publicá esa configuración con acceso a ese proyecto. Firebase enviará al navegador al tablero privado. La dirección visible pasará a ser la del tablero después de abrir la entrada.
