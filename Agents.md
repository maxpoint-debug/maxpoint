# AGENTS.md — MaxPoint

## Objetivo

MaxPoint es un sistema de gestión para un servicio técnico y tienda Apple.

La prioridad del proyecto no es tener la arquitectura más moderna, sino aumentar la productividad diaria del negocio sin interrumpir la operación.

Cada cambio debe ahorrar tiempo real.

---

# Filosofía

Antes de agregar una funcionalidad preguntarse:

> ¿Tomy la va a usar varias veces por día?

Si la respuesta es no, probablemente no deba implementarse.

Preferimos un sistema extremadamente rápido y simple antes que uno lleno de funciones.

Nunca convertir MaxPoint en un ERP complejo.

---

# Regla principal

NO romper nunca compatibilidad.

Si existe una función funcionando en producción, debe seguir funcionando.

Las mejoras deben agregarse encima del comportamiento actual hasta poder reemplazarlo de forma segura.

Evolucionar.

Nunca reescribir todo.

---

# Arquitectura

Preferir cambios pequeños.

Evitar refactors masivos.

Evitar mover archivos innecesariamente.

No introducir nuevas dependencias si no aportan un beneficio claro.

No cambiar tecnologías sin autorización explícita.

---

# UI

Mantener la interfaz existente.

No modificar diseño, colores o distribución salvo que el ticket lo solicite.

Toda mejora visual debe respetar el estilo Apple minimalista ya existente.

---

# Código

Priorizar:

- claridad
- simplicidad
- legibilidad

Antes que:

- patrones complejos
- sobreingeniería
- abstracciones innecesarias

Si una solución requiere tocar veinte archivos y existe otra que toca tres, elegir la segunda.

---

# Firestore

Nunca eliminar datos automáticamente.

Nunca modificar colecciones existentes sin mantener compatibilidad.

Evitar migraciones destructivas.

Toda modificación debe ser incremental.

---

# Seguridad

Nunca almacenar contraseñas o PIN de clientes.

Nunca exponer información sensible.

No eliminar validaciones existentes.

---

# Commits

Cada cambio debe resolver un único objetivo.

Un commit = un problema.

No mezclar refactor con nuevas funcionalidades.

---

# Entregas

Cada entrega debe indicar:

## Objetivo

Qué se hizo.

## Archivos modificados

Lista de archivos.

## Qué probar

Pasos concretos.

## Riesgos

Qué podría verse afectado.

---

# Forma de trabajar

Antes de escribir código:

1. Analizar el impacto.
2. Buscar reutilizar código existente.
3. Implementar.
4. Validar.
5. Explicar qué probar.

Nunca asumir.

Nunca inventar.

Nunca borrar código por estética.

---

# Prioridades actuales

1. Fluidez del sistema.
2. WhatsApp.
3. Presupuestos.
4. Reparaciones.
5. Clientes.
6. Equipos.
7. Stock.
8. Caja.
9. Dashboard.
10. Buscador Universal.

Todo lo demás es secundario.

---

# Principio final

Cada cambio debe hacer que el sistema sea más fácil de mantener que ayer.
