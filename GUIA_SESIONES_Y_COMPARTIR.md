# Guía rápida: sesiones de Claude Code y compartir la app

## 1. Cómo abrir el proyecto y recuperar el chat anterior

Claude Code guarda el historial de conversaciones **por carpeta de proyecto**.
Cada vez que abres Claude Code dentro de la misma carpeta, puedes volver a ese historial.

### Pasos

1. Abre **Claude Code** (la app de escritorio o la terminal).
2. Asegúrate de que el directorio de trabajo es tu proyecto:
   ```
   C:\Users\Usuario\Proyectos\proyecto_taller-sintaxis
   ```
   Si no lo es, escribe en la terminal de Claude Code:
   ```
   cd C:\Users\Usuario\Proyectos\proyecto_taller-sintaxis
   ```
3. Una vez dentro del proyecto, escribe el comando:
   ```
   /sessions
   ```
   Se abrirá una lista con las sesiones anteriores. Haz clic en la que quieras retomar.

> **Nota:** el historial se conserva en tu máquina local. Si desinstalaras Claude Code o borraras los archivos de configuración de `C:\Users\Usuario\.claude\`, perderías el historial.

---

## 2. Cómo compartir la app con otra persona desde cualquier parte

La app vive en **GitHub Pages**. Cualquier persona con el enlace puede usarla sin instalar nada.

### Tu enlace de GitHub Pages

```
https://<tu-usuario-github>.github.io/proyecto_taller-sintaxis/index.html
```

> Sustituye `<tu-usuario-github>` por tu nombre de usuario real en GitHub.  
> Si no lo recuerdas, ábrelo en el navegador: https://github.com — tu usuario aparece arriba a la derecha.

### Cómo funciona

- Cada vez que haces `git push` desde tu ordenador, GitHub actualiza automáticamente la versión pública.
- La persona a la que se lo pases solo necesita el enlace; no hace falta que tenga cuenta en GitHub.

### Si GitHub Pages no estuviera activado (solo la primera vez)

1. Ve a tu repositorio en GitHub.
2. Haz clic en **Settings** (engranaje).
3. En el menú izquierdo, elige **Pages**.
4. En *Branch*, selecciona **main** y la carpeta **/ (root)**.
5. Guarda. Al cabo de un minuto el enlace estará activo.

---

## 3. Compartir la app con OTRO PROFESOR (cada uno con su cuaderno)

Lo de arriba sirve para que alguien **use** tu app. Esto es otra cosa: que un
compañero de departamento la use **con sus alumnos**, y que las notas de sus
alumnos vayan a **su** cuaderno, no al tuyo.

Llamamos **cuaderno** a la pareja «Google Sheet + su Apps Script publicado».
El tuyo es el que la app usa por defecto.

### Lo que tiene que tener tu compañero (una sola vez)

1. **Su copia del Sheet** — que la haga desde el tuyo: *Archivo → Hacer una copia*.
2. **Su Apps Script publicado** sobre esa copia, con su propia URL terminada en `/exec`.
3. **Su clave de profesor**, con el menú *Fijar clave de profesor*.

Sin esas tres cosas no hay cuaderno que enlazar. Es trabajo suyo (o tuyo
ayudándole), pero se hace una vez y no se vuelve a tocar.

### Cómo lo das de alta (tu parte: un minuto)

1. Pídele **la URL de su despliegue** (*Implementar → Gestionar implementaciones*;
   es la que acaba en `/exec`).
2. Abre `js/core/cuadernos.js` y añade un bloque como el que ya hay:

   ```javascript
   {
     id: 'lucia',                      // minúsculas, sin acentos ni espacios
     nombre: 'Prof.ª Lucía Martínez',  // lo que verán ella y sus alumnos
     url: 'https://script.google.com/macros/s/…/exec'
   }
   ```

3. `git commit` y `git push`. En un minuto está publicado.
4. Dile que entre en su panel del profesor → caja **🎒 Enlace para mis alumnos**
   → botón **Copiar**. Ese es el enlace que reparte en su Classroom:
   `…/index.html?prof=lucia`.

**El `id` no se cambia nunca** una vez repartido el enlace: los dispositivos ya
asignados dejarían de reconocerlo.

### Qué ve el alumno

- La primera vez que entra por el enlace de su profesora, un aviso en ámbar:
  «Has entrado con el enlace de Prof.ª Lucía Martínez», con un botón para
  volver atrás si se ha equivocado de enlace.
- A partir de ahí, un distintivo discreto en la pantalla de nombre y correo:
  «📓 Cuaderno de Prof.ª Lucía Martínez».
- **Tus alumnos no ven nada de esto**: con el cuaderno de casa no se pinta nada.

### Problemas típicos y su solución

| Situación | Qué hacer |
|---|---|
| Un iPad quedó apuntando al cuaderno equivocado | Que abra el enlace correcto (el de su profesor). El enlace más reciente siempre manda. |
| «A mí no me sale ningún distintivo» | Entonces está en el cuaderno de casa. Si debía estar en otro, que abra el enlace de su profesor. |
| Un ordenador compartido por dos clases | Se queda con el del último enlace abierto. Que cada clase abra su enlace al empezar. |
| Un compañero se va del centro | Borra su bloque de la lista y sube. Los dispositivos que lo tuvieran vuelven solos al cuaderno de casa. |

**Sobre el iPad con la app instalada**: comprobado en agosto de 2026 que la
asignación sobrevive a instalar la app en la pantalla de inicio. Si aun así
algún dispositivo apareciera sin su distintivo, la solución es siempre la
misma: volver a abrir el enlace del profesor.

### Lo que NO hace falta

- **No hay que redesplegar tu Apps Script**: todo esto vive en el navegador.
- **No hay que tocar nada de las notas ni de los exámenes.**
- El compañero **no necesita GitHub** ni saber nada técnico.

---

## 4. Cómo arrancar la app en local (para probarla tú)

Abre una terminal en la carpeta del proyecto y ejecuta:

```
npx -p http-server http-server -p 8765 -c-1
```

Luego abre en el navegador:

```
http://localhost:8765/index.html
```

Para parar el servidor, pulsa `Ctrl + C` en la terminal.

---

*Guarda este archivo donde quieras. Si lo mueves fuera del proyecto, sigue siendo válido.*
