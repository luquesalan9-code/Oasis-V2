/** OASIS V2 - Interface web servida pelo próprio processo da aplicação. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const diretorio = path.dirname(fileURLToPath(import.meta.url));

export const diretorioPublico = path.join(diretorio, 'public');

export function criarInterface() {
  return {
    paginas: [
      { nome: 'Início', rota: '#inicio' },
      { nome: 'Atividade', rota: '#atividade' },
      { nome: 'Radar', rota: '#radar' },
      { nome: 'Processos', rota: '#processos' },
      { nome: 'Workers', rota: '#workers' },
      { nome: 'Financeiro', rota: '#financeiro' },
      { nome: 'Carteira', rota: '#carteira' },
      { nome: 'Prontidão real', rota: '#prontidao' },
      { nome: 'Config. mineradora', rota: '#mineradora' },
      { nome: 'Config. interface', rota: '#interface' },
    ],
    tema: 'oasis-dark',
    responsiva: true,
    atualizacaoAutomaticaMs: 5000,
  };
}

export default { diretorioPublico, criarInterface };
