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

## 3. Cómo arrancar la app en local (para probarla tú)

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
