@echo off
echo Arrancando Taller de Sintaxis en http://localhost:8765/
echo (Cierra esta ventana para parar el servidor)
echo.
npx --yes -p http-server http-server -p 8765 -c-1
pause
