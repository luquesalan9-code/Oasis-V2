/**
 * OASIS V2 - Script de Descoberta de Oportunidades
 * Executa consultas às fontes gratuitas e exibe oportunidades verificáveis
 * 
 * USO: node descobrir.js
 * 
 * REQUISITOS:
 * - GitHub: Nenhuma credencial necessária (10 req/hora gratuitas)
 * - Para maior volume: export GITHUB_TOKEN=<token>
 */
import { GerenciadorConectores } from './src/conectores/gerenciador.js';
import { info, aviso } from './src/logs/logger.js';
import radar from './src/radar/radarGlobal.js';
import { mineradora } from './src/core/mineradora.js';

function registrarModulos() {
  const modulos = [
    'config', 'estado', 'logger', 'operacao', 'mineradora',
    'auth', 'validacao', 'radar', 'conectores', 'processos',
    'workers', 'decisao', 'analise', 'orquestrador', 'financeiro',
    'aprovacao', 'persistencia', 'monitoramento', 'interface',
  ];
  for (const nome of modulos) {
    mineradora.modulos[nome] = { nome, status: 'ATIVO' };
  }
}

async function descobrir() {
  info('DESCOBERTA_INICIADA', 'Iniciando descoberta de oportunidades');

  const gerenciador = new GerenciadorConectores();
  const conectores = gerenciador.listarConectores();
  info('CONECTORES', 'Conectores registrados: ' + conectores.length, { conectores });

  // Consultar GitHub (gratuito, sem credencial)
  info('CONSULTANDO', 'Consultando GitHub Issues (gratuito)...');
  const resultado = await gerenciador.consultarPorFonte('github', { query: 'bounty OR reward OR paid', limit: 10 });

  if (!resultado.sucesso) {
    aviso('DESCOBERTA_FALHA', 'Falha ao consultar GitHub', { erro: resultado.erro });
    return;
  }

  info('DESCOBERTA_RESULTADO', 'Encontradas ' + resultado.total + ' oportunidades', { total: resultado.total });

  // Processar e normalizar
  for (const oport of resultado.oportunidades) {
    const resultadoAdicao = radar.adicionarOportunidade(oport);
    if (resultadoAdicao.sucesso) {
      info('OPORTUNIDADE_ENCONTRADA', 'Oportunidade ' + oport.externalId, {
        id: oport.externalId,
        valor: oport.valor,
        url: oport.url,
      });
    }
  }

  // Enfileirar para o orquestrador
  const enfileirado = radar.buscarEEnfileirar({ limite: 100 });
  info('DESCOBERTA_ENFILEIRADO', 'Lote processado pelo radar', { total: enfileirado.total });

  const resumo = radar.obterResumoRadar();
  info('DESCOBERTA_CONCLUIDA', 'Descoberta concluída', { resumo });
}

descobrir().catch(e => {
  console.error('Falha na descoberta:', e.message);
  process.exit(1);
});