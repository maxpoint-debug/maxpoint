# MaxPoint — Estado y plan de cierre

> Documento histórico reemplazado por `CIERRE_ACTUALIZACION_2026-09-03.md`. Se conserva para no perder las decisiones y riesgos registrados durante la estabilización.

Última actualización: 29 de agosto de 2026  
Estado informado por Tomy: el sistema se está usando en la operación diaria y no se observan inconsistencias grandes.

## Objetivo de cierre

Cerrar el desarrollo estable de MaxPoint lo antes posible, sin reescrituras ni nuevas funciones secundarias.

El cierre queda limitado a:

1. Terminar y validar el cotizador online, especialmente precios y descuentos.
2. Terminar y validar la consulta de cliente.
3. Hacer una prueba final corta de los flujos que ya se usan.
4. Corregir solamente errores que bloqueen o produzcan datos incorrectos.
5. Congelar el desarrollo y pasar a mantenimiento.

## En qué paso estamos

MaxPoint está en etapa de estabilización final, no en etapa de construcción inicial.

El sistema principal ya contiene y conecta:

- autenticación, usuarios y roles;
- reparaciones, estados, cobros, recibos y entregas;
- clientes y equipos compatibles con los registros anteriores;
- repuestos, ventas y stock;
- WhatsApp y seguimientos;
- cotizador interno y actualización de su lista de valores;
- centro de control, moneda y comisiones;
- auditoría y notificaciones internas;
- cotizador público (`cotizador.html`);
- consulta pública de reparaciones (`cliente.html`).

La experiencia de uso real sin inconsistencias grandes es la señal más importante para no reabrir arquitectura ni agregar módulos. Falta certificar los dos frentes públicos y luego cerrar.

## Estado por frente

### 1. Sistema interno — operativo, pendiente de prueba final

El núcleo está implementado y en uso. No se propone refactor ni rediseño.

Para el cierre solo se debe comprobar una vez:

- crear, editar y buscar una reparación;
- registrar pago parcial y total;
- pasar una reparación a lista y entregada;
- generar recibo y abrir WhatsApp;
- verificar que cliente y equipo sigan vinculados;
- confirmar que cada rol vea y edite únicamente lo que corresponde;
- confirmar que no haya errores visibles en consola durante esos recorridos.

### 2. Cotizador online — último desarrollo prioritario

Ya existe el recorrido completo: selección de modelo y capacidad, batería, estado, fallas, resultado y envío por WhatsApp. Los modelos y el catálogo se leen desde Firestore.

Pendientes antes de aprobarlo:

- definir y cargar la lista oficial de valores base por modelo y capacidad;
- definir una única tabla oficial de descuentos;
- corregir la evaluación de fallas adicionales: actualmente `getDescuentoProblema()` devuelve “requiere revisión presencial” antes de ejecutar las reglas específicas cuando el valor no es `ok`;
- revisar coincidencias del catálogo por modelo para evitar tomar un repuesto de otro modelo con nombre parecido;
- eliminar o aprobar expresamente los valores estimados escritos en el código (batería, estética, pantalla, cámara, botones y otras piezas);
- validar que el cotizador interno y el público produzcan el mismo valor cuando reciben los mismos datos;
- probar al menos un caso sano, batería menor a 90 %, pantalla rota, modelo Pro/Pro Max y falla que requiera revisión presencial;
- confirmar el número de WhatsApp y el texto final.

Importante: los precios reales viven en Firestore y no están versionados en esta carpeta. Por eso el repositorio permite revisar la fórmula, pero no certificar que los valores vigentes estén bien sin comparar la colección `usados` y el catálogo contra la lista comercial aprobada.

### 3. Parte de cliente — implementada, pendiente de seguridad y validación

La página permite buscar reparaciones por teléfono, ver activas, historial, estado, presupuesto, seña, saldo y garantía estimada.

Pendientes antes de aprobarla:

- probar números guardados con distintos formatos (con espacios, guiones, prefijo y sin prefijo);
- confirmar los nombres de estado reales: la página pública y el sistema interno no usan exactamente todas las mismas etiquetas;
- calcular el saldo con el historial real de pagos y no solamente con `presupuesto - sena`, si existen pagos posteriores;
- definir qué datos históricos se deben mostrar al cliente;
- revisar las reglas desplegadas de Firestore. La carpeta no contiene un archivo de reglas que permita certificar que un visitante solo pueda leer los datos previstos;
- decidir si conocer un número de teléfono es autenticación suficiente. Hoy cualquier persona que conozca el número puede consultar sus reparaciones;
- probar ausencia de resultados, error de red, reparación activa, entregada y garantía vencida.

### 4. Cierre del sistema — pendiente

Después de aprobar cotizador y cliente:

- ejecutar la prueba final de humo;
- guardar una copia de seguridad/exportación de Firestore;
- registrar versión y fecha desplegada;
- conservar una copia de los archivos publicados;
- congelar funcionalidades nuevas;
- atender desde entonces solo errores operativos, seguridad y cambios indispensables de precios.

## Orden recomendado para terminar rápido

### Paso 1 — Congelar alcance

No agregar dashboard nuevo, ERP, reportes secundarios ni refactors. La documentación amplia de comisiones y control queda como evolución futura, no como condición del cierre actual.

### Paso 2 — Cerrar precios del cotizador

Tomy entrega o aprueba:

- lista base por modelo/capacidad;
- descuentos oficiales;
- criterio para “revisión presencial”;
- número y mensaje de WhatsApp.

Luego se corrige la fórmula, se carga la lista y se compara una matriz pequeña de casos esperados contra resultados reales.

### Paso 3 — Cerrar cliente

Se corrige la normalización del teléfono, los saldos/estados y se verifica la privacidad real de Firestore. Después se prueba desde un teléfono como cliente.

### Paso 4 — Prueba final y congelamiento

Se recorren los flujos internos críticos sin modificar diseño ni estructura. Si pasan, se declara versión estable y termina el desarrollo activo.

## Definición de “terminado”

MaxPoint se considera cerrado cuando:

- la tabla de precios y descuentos tiene aprobación comercial;
- cotizador interno y público coinciden en los casos de prueba;
- cliente ve información correcta sin exponer información ajena;
- los flujos internos críticos pasan una prueba final;
- existe respaldo y registro de la versión desplegada;
- no quedan errores bloqueantes o de datos conocidos.

No es requisito para cerrar:

- perfeccionar toda la arquitectura;
- completar cada idea de `REGLAS_OPERATIVAS_Y_COMISIONES.txt`;
- rediseñar la interfaz;
- incorporar funciones de uso eventual;
- limpiar código que hoy funciona solo por estética.

## Riesgos registrados

1. **Precios no verificables solo desde el código.** La base vigente está en Firestore.
2. **Diferencia entre cotizador interno y público.** Usan reglas parecidas, pero no una única función compartida.
3. **Descuentos públicos incompletos.** Hay una salida anticipada en la función de fallas adicionales.
4. **Consulta por teléfono exacto.** Variaciones de formato pueden devolver “sin resultados”.
5. **Saldo público simplificado.** Puede no representar todos los pagos registrados.
6. **Privacidad dependiente de Firestore.** Las reglas desplegadas no están disponibles en esta carpeta.
7. **Sin control de versión local.** Esta carpeta no está inicializada como repositorio Git; dificulta identificar exactamente qué versión fue publicada y volver atrás.

## Registro de decisiones

- 29/08/2026 — Se registra que el sistema está en uso real y no presenta inconsistencias grandes según Tomy.
- 29/08/2026 — Se prioriza terminar cotizador online, luego cliente y finalmente cerrar el desarrollo.
- 29/08/2026 — Se congela el alcance: no se abrirán funciones nuevas antes del cierre.
- 29/08/2026 — Se considera la documentación de comisiones y control como evolución compatible, no como bloqueo para cerrar la versión operativa actual.

## Próximo insumo necesario

Para empezar el último desarrollo sin inventar valores hace falta una lista aprobada con:

- modelo;
- capacidad;
- valor base de toma en USD;
- descuento de batería;
- descuento de pantalla;
- descuentos por cámara, Face ID, carcasa, vidrio de cámara y botones;
- casos que siempre deben quedar “sujetos a revisión presencial”.
