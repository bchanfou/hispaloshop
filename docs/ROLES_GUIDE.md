# Guía de Roles y Funciónes — HispaloShop

Explicado de forma sencilla para que cualquier persona, sin importar su experiencia, entienda que hace cada rol y como navegar el proyecto.

---

## Los seis roles del proyecto

Cada persona que trabaja en HispaloShop tiene un papel diferente. Es como una obra de teatro: cada actor tiene su guión, sus escenas y su función.

---

## 1. Manager / Product Owner

**El capitan del barco**

Eres el que decide a donde va el barco. No tocas los remos, pero decides la direccion, la velocidad y las paradas.

### Qué hace

- Define que se construye y en que orden
- Aprueba o rechaza funcionalidades
- Se asegura de que el negocio funcióne
- Habla con los clientes y con el equipo
- Revisa los numeros y los resultados

### Cómo un cuento

Imagina que estas construyendo un castillo de LEGO muy grande. Tu eres el que tiene el plaño de como debe quedar al final. No pones las piezas tu mismo, pero dices que parte va primero, que parte va despues, y como debe quedar el resultado final.

### Archivos importantes

| Archivo | Para que sirve |
|---------|---------------|
| `AI_READ_FIRST.md` | Primer archivo a leer. Las reglas del proyecto. |
| `MEGA_PLAN.md` | El plan completo: que se vende, a quien, cuanto cuesta |
| `ROADMAP_LAUNCH.md` | En que orden se construye todo |
| `docs/ai/03_BUSINESS_MODEL.md` | Modelos de precios, comisiones y países |
| `README.md` | Presentación general del proyecto |

### Por donde empezar

1. Leer `AI_READ_FIRST.md`
2. Leer `MEGA_PLAN.md`
3. Revisar `ROADMAP_LAUNCH.md`

---

## 2. Desarrollador

**El constructor de código**

Eres el que pone las piezas juntas para que todo funcióne. Sin ti no hay producto.

### Qué hace

- Escribe el código del frontend (lo que ve el usuario)
- Escribe el código del backend (el servidor)
- Resuelve bugs y errores
- Conecta el frontend con el backend
- Crea y mantiene los tests

### Cómo un cuento

Eres el constructor de LEGO. Tienes miles de piezas distintas y sabes como combinarlas para construir lo que el capitan (manager) quiere. Cada pieza que colocas hace que el castillo sea mas grande y funciónal.

### Archivos importantes

| Archivo / Carpeta | Para que sirve |
|-------------------|---------------|
| `AI_READ_FIRST.md` | Reglas. DEBE leerse primero. |
| `docs/ai/00_AI_MAP.md` | Mapa de reglas y decisiones cerradas |
| `DESIGN_SYSTEM.md` | Que colores y estilos se pueden usar |
| `frontend/src/` | Todo el código React del usuario |
| `frontend/src/pages/` | Las pantallas de la app |
| `frontend/src/components/` | Las piezas de UI reutilizables |
| `backend/main.py` | Punto de entrada del servidor |
| `backend/routes/` | Las rutas de la API |
| `backend/services/` | La logica de negocio |
| `.github/workflows/` | Los robots automaticos de CI/CD |

### Por donde empezar

1. Leer `AI_READ_FIRST.md`
2. Leer `docs/ai/00_AI_MAP.md`
3. Seguir `QUICKSTART.md` para arrancar el proyecto

---

## 3. Designer / UI

**El artista del proyecto**

Eres el que decide como se ve todo. Sin ti todo seria feo y dificil de usar.

### Qué hace

- Disena como se ven las pantallas
- Define colores, tipografia y espaciados
- Crea componentes visuales
- Se asegura de que sea facil de usar (UX)
- Revisa que el diseño sea consistente

### Cómo un cuento

Eres el artista que decora el castillo de LEGO. El constructor lo ha construido, pero tu decides que color tiene cada torre, como estan organizados los jardines y si la entrada parece bonita e invitadora. Sin ti, el castillo existiria pero nadie querria visitarlo.

### Archivos importantes

| Archivo / Carpeta | Para que sirve |
|-------------------|---------------|
| `DESIGN_SYSTEM.md` | Las reglas de diseño. OBLIGATORIO leer primero. |
| `docs/ai/01_DNA.md` | El caracter y la personalidad de la marca |
| `frontend/src/components/` | Los componentes visuales del proyecto |
| `frontend/tailwind.config.js` | La paleta de colores y estilos disponibles |
| `frontend/src/styles/` | Los estilos globales |

### Reglas de diseño clave

De `DESIGN_SYSTEM.md`:

- Paleta principal: blanco, negro, stone (gris calido)
- Sin emojis en la UI de la aplicacion
- Sin banderas. Los países se muestran como texto: `ES — España`
- Sin colores inventados fuera del sistema definido

### Por donde empezar

1. Leer `DESIGN_SYSTEM.md` completo
2. Leer `docs/ai/01_DNA.md`
3. Revisar `frontend/src/components/`

---

## 4. QA / Tester

**El inspector de calidad**

Eres el ultimo filtro antes de que algo llegue a los usuarios. Tu trabajo es encontrar lo que está roto antes de que lo encuentren ellos.

### Qué hace

- Prueba que las funcionalidades funciónen como se espera
- Ejecuta tests automaticos
- Reporta bugs con detalle
- Verifica que las correcciones funciónan
- Revisa que la app sea usable en distintos dispositivos

### Cómo un cuento

Eres el inspector de calidad de una fabrica de juguetes. Antes de que un juguete llegue a la tienda, tu lo pruebas: compruebas que no tiene piezas rotas, que las instrucciones son claras y que es seguro para los niños. Si encuentras un problema, lo devuelves a la fabrica para que lo arreglen.

### Archivos importantes

| Archivo / Carpeta | Para que sirve |
|-------------------|---------------|
| `tests/` | Tests de integracion del proyecto |
| `frontend/e2e/` | Tests end-to-end con Playwright |
| `backend/tests/` | Tests del servidor Python |
| `.github/workflows/` | Automatización que corre los tests en cada PR |
| `TESTING.md` | Guía de como ejecutar los tests |

### Cómo ejecutar los tests

**Tests del frontend:**
```bash
cd frontend
npm test
```

**Tests E2E:**
```bash
cd frontend
npx playwright test
```

**Tests del backend:**
```bash
cd backend
pytest
```

### Por donde empezar

1. Leer `TESTING.md`
2. Revisar `.github/workflows/` para entender que tests corren automaticamente
3. Explorar `tests/` y `frontend/e2e/`

---

## 5. IA / Copilot

**El asistente inteligente**

Puedes hacer muchas cosas, pero primero DEBES leer todas las reglas. Sin leerlas, puedes romper cosas importantes sin darte cuenta.

### Qué hace

- Ayuda a escribir código
- Sugiere soluciones a problemas
- Genera documentación
- Automatiza tareas repetitivas
- Explica partes del código

### Cómo un cuento

Eres el asistente magico que puede hacer casi cualquier cosa que le pidas. Pero hay un libro de reglas que DEBES leer antes de empezar. Si no lees las reglas, podrias destruir sin querer algo muy importante. El libro esta en `AI_READ_FIRST.md` y en `docs/ai/00_AI_MAP.md`.

### Reglas criticas (de `docs/ai/00_AI_MAP.md`)

- OpenAI esta PROHIBIDO. No usar en ningun caso.
- No inventar colores fuera de `DESIGN_SYSTEM.md`
- No crear documentos nuevos en la raiz del repositorio
- No cambiar precios o planes sin actualizar el documento de negocio primero
- Países como texto + código: `ES — España`, no banderas

### Archivos importantes

| Archivo | Para que sirve |
|---------|---------------|
| `AI_READ_FIRST.md` | PRIMER archivo. Obligatorio antes de todo. |
| `docs/ai/00_AI_MAP.md` | Mapa de reglas, decisiones cerradas y fuente de verdad |
| `.claude/README.md` | Checklist obligatorio antes de hacer cualquier cambio |
| `.github/copilot-instructions.md` | Instrucciones especificas para GitHub Copilot |
| `DESIGN_SYSTEM.md` | Reglas de diseño que no se pueden violar |

### Checklist antes de proponer un cambio

Extraido de `docs/ai/00_AI_MAP.md`:

1. Respeta las reglas duras?
2. Afecta ES/KR/US? (asumir si por defecto)
3. Impacta pricing/planes/comisiones? Si es asi, actualizar doc de negocio primero.
4. Contradice MEGA_PLAN o ROADMAP? Si es asi, detener y escalar.
5. Introduce colores/emojis/banderas en la UI? Si es asi, rechazar.
6. Se esta creando un doc en la raiz? Si es asi, mover a `docs/` o `docs/ai/`.

### Por donde empezar

1. Leer `AI_READ_FIRST.md` (obligatorio)
2. Leer `docs/ai/00_AI_MAP.md` (obligatorio)
3. Leer `.claude/README.md`
4. Leer `docs/ai/READING_ORDER.md`

---

## 6. Principiante / Nuevo

**El que acaba de llegar**

Hay un camino especial para ti. Si sigues estos pasos en orden, en poco tiempo entendera todo sin agobio.

### Ruta de aprendizaje paso a paso

**Semana 1: Entender el proyecto**

1. Lee `README.md` — De que trata HispaloShop en general
2. Lee `AI_READ_FIRST.md` — Las reglas basicas del proyecto
3. Lee `docs/ai/00_AI_MAP.md` — El mapa completo de reglas y estructura
4. Abre `docs/MAP.html` en tu navegador — El mapa visual interactivo

**Semana 2: Entender el negocio**

5. Lee `MEGA_PLAN.md` — Que se vende y a quien
6. Lee `ROADMAP_LAUNCH.md` — Que está hecho y que falta
7. Lee `DESIGN_SYSTEM.md` — Como debe verse la app

**Semana 3: Entender el código**

8. Sigue `QUICKSTART.md` para arrancar el proyecto
9. Explora `frontend/src/pages/` para ver las pantallas
10. Explora `backend/routes/` para ver la API

### Conceptos basicos

**Que es HispaloShop?**

Una red social de comercio local que conecta productores, importadores, influencers y consumidores alrededor de alimentos reales. Lanza simultaneamente en ES (España), KR (Corea) y US (Estados Unidos).

**Que es el frontend?**

La parte que ven los usuarios. Esta construido con React (JavaScript). Son las pantallas, los botones, los formularios.

**Que es el backend?**

El servidor que guarda los datos y procesa las operaciones. Esta construido con FastAPI (Python). Recibe las peticiones del frontend y devuelve los datos.

**Que es un workflow de GitHub Actions?**

Un robot automatico que se activa cuando alguien hace un cambio en el código. Verifica que todo este bien antes de que los cambios lleguen a produccion.

### Glosario basico

| Termino | Significado simple |
|---------|--------------------|
| PR (Pull Request) | Propuesta de cambio en el código para revision |
| CI/CD | Robot automatico que verifica y despliega el código |
| API | La puerta de comunicacion entre frontend y backend |
| Componente | Pieza reutilizable de la interfaz (botones, tarjetas) |
| Hook | Logica reutilizable en React |
| Endpoint | Una URL especifica de la API para una función |
| Schema | La forma que tienen los datos (que campos tiene un usuario, etc.) |
| Seed | Datos de prueba para arrancar la base de datos |

### Por donde empezar

1. Abrir `docs/MAP.html` en el navegador para ver el mapa visual
2. Leer `README.md`
3. Leer `AI_READ_FIRST.md`
4. Seguir `QUICKSTART.md`

---

## Mapa de archivo a rol

| Archivo / Carpeta | Manager | Dev | Designer | QA | IA | Nuevo |
|-------------------|:-------:|:---:|:--------:|:--:|:--:|:-----:|
| AI_READ_FIRST.md | SI | SI | SI | SI | SI | SI |
| docs/ai/00_AI_MAP.md | SI | SI | — | — | SI | SI |
| MEGA_PLAN.md | SI | SI | — | — | — | — |
| ROADMAP_LAUNCH.md | SI | SI | — | — | — | SI |
| DESIGN_SYSTEM.md | — | SI | SI | — | SI | SI |
| frontend/src/ | — | SI | SI | — | — | SI |
| backend/ | — | SI | — | — | — | SI |
| tests/ | — | SI | — | SI | — | — |
| .github/workflows/ | — | SI | — | SI | SI | — |
| .claude/README.md | — | SI | — | — | SI | — |

---

## Ver el mapa interactivo

Para una experiencia visual completa, abre el mapa interactivo:

```
docs/MAP.html
```

El mapa muestra todas estas regiónes y archivos en un formato visual navegable, con zoom, búsqueda, filtros y explicaciónes al hacer clic en cada elemento.
