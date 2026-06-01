# banco_export/ — Carpeta para validar los bancos

Aquí pones los TSV que descargas de Google Sheets para pasarles el validador.

## Cómo validar (paso a paso)

1. En el Google Sheet, abre la hoja que quieras revisar (`Oraciones_Banco` o
   `Compuestas_Banco`).
2. Menú **Archivo → Descargar → Valores separados por tabulaciones (.tsv)**.
3. Guarda el archivo en ESTA carpeta (`banco_export/`). Por ejemplo:
   `Oraciones_Banco.tsv` o `Compuestas_Banco.tsv`.
4. Abre una terminal en la carpeta del proyecto y ejecuta:

   ```
   node scripts/validar-banco.mjs simples    banco_export/Oraciones_Banco.tsv
   node scripts/validar-banco.mjs compuestas  banco_export/Compuestas_Banco.tsv
   ```

5. Lee el informe:
   - **❌ ERROR** → el motor NO lo entiende; el alumno lo verá mal. Corrígelo
     en el Sheet.
   - **⚠ AVISO** → sospechoso pero no rompe; conviene revisarlo.
   - **✅** → sin problemas.

## Notas

- Los `.tsv` que pongas aquí NO se suben a Git (están en .gitignore): son una
  copia temporal de tus datos para validar. El que cuenta es el Sheet.
- El validador solo LEE: nunca modifica el Sheet ni la app.
