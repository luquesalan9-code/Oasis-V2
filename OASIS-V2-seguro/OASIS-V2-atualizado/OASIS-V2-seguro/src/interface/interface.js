/**
 * OASIS V2 - Interface Web Principal
 * Painel integrado com estado real do sistema
 */
import { info } from '../logs/logger.js';

export function criarInterface() {
  return {
    paginas: [
      { nome: 'Início', rota: '/', desc: 'Painel executivo' },
      { nome: 'Radar Global', rota: '/radar', desc: 'Oportunidades detectadas' },
      { nome: 'Oportunidades', rota: '/oportunidades', desc: 'Lista detalhada' },
      { nome: 'Candidaturas', rota: '/candidaturas', desc: 'Aprovações pendentes' },
      { nome: 'Processos', rota: '/processos', desc: 'Fila de trabalho' },
      { nome: 'Workers', rota: '/workers', desc: 'Recursos de execução' },
      { nome: 'Motores', rota: '/motores', desc: 'Capacidades de tarefa' },
      { nome: 'Cérebro IA', rota: '/ia', desc: 'Decisões e aprendizado' },
      { nome: 'Ganhos', rota: '/ganhos', desc: 'Receitas confirmadas' },
      { nome: 'Financeiro', rota: '/financeiro', desc: 'Ledger e relatórios' },
      { nome: 'Ativos', rota: '/ativos', desc: 'Recursos e moedas' },
      { nome: 'Falhas', rota: '/falhas', desc: 'Alertas e erros' },
      { nome: 'Integrações', rota: '/integracoes', desc: 'Conectores' },
      { nome: 'Aprovações', rota: '/aprovacoes', desc: 'Fluxo de autorização' },
      { nome: 'Relatórios', rota: '/relatorios', desc: 'Exports e analytics' },
      { nome: 'Segurança', rota: '/seguranca', desc: 'Configurações de permissão' },
      { nome: 'Configurações', rota: '/configuracoes', desc: 'Preferências do sistema' },
    ],
    tema: 'dark-tech',
    responsivo: true,
    integradoComAPI: true,
  };
}

export function gerarHTMLPainel(estado) {
  return '<!DOCTYPE html><html><head><title>OASIS V2</title></head><body>' +
    '<h1>Mineradora OASIS V2</h1>' +
    '<div>Status: ' + (estado.status || 'ATIVA') + '</div>' +
    '<div>Processos: ' + (estado.processos || 0) + '</div>' +
    '<div>Workers: ' + (estado.workers || 0) + '</div>' +
    '<div>Receita Confirmada: $' + (estado.receitaConfirmada || 0) + '</div>' +
    '</body></html>';
}

export default { criarInterface, gerarHTMLPainel };