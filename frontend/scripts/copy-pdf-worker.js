/**
 * Copia o pdf.worker.min.mjs do node_modules para public/
 * Garante que a versão do worker seja sempre a mesma do pacote pdfjs-dist instalado.
 * Executado automaticamente via postinstall e antes do build.
 */
import { copyFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const src = resolve(__dirname, '..', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');
const dest = resolve(__dirname, '..', 'public', 'pdf.worker.min.mjs');

if (existsSync(src)) {
  copyFileSync(src, dest);
  console.log(`[copy-pdf-worker] Worker copiado com sucesso: ${dest}`);
} else {
  console.warn(`[copy-pdf-worker] AVISO: Worker não encontrado em ${src}. Pulando cópia.`);
}
