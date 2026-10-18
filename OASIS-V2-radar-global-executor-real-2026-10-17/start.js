/**
 * OASIS V2 - Script de Inicialização
 */
import { iniciarOASIS } from './src/index.js';

try {
  const { app, server, mineradora } = iniciarOASIS();
  console.log('OASIS V2 rodando na porta', process.env.PORT || 10000);
  console.log('Status:', mineradora.status);
  console.log('Modulos:', Object.keys(mineradora.modulos));
} catch (e) {
  console.error('Falha ao iniciar OASIS V2:', e.message);
  process.exit(1);
}