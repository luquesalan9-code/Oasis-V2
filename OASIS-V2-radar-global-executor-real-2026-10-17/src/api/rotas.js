/**
 * OASIS V2 - API Express com Segurança
 */
import express from 'express';
import { autenticarRequisicao, autenticarLogin } from '../security/auth.js';
import { validacaoProcesso } from '../security/validacao.js';
import { info, erro } from '../logs/logger.js';
import { mineradora } from '../core/mineradora.js';
import { estado } from '../core/estado.js';
import { iniciarOperacao, pararOperacao, obterStatusOperacao, obterProntidaoOperacaoReal, configurarIntervalo } from '../core/operacao.js';
import { processarOportunidades, executarCicloReal, obterResumoOrquestrador, obterFontesRadar } from '../orquestrador/orquestrador.js';
import { registrarWorker } from '../workers/workerManager.js';
import { obterResumoRadar, listarOportunidadesRadar } from '../radar/radarGlobal.js';
import { obterStatusExecutorReal, executarProcessoReal } from '../executores/executorReal.js';
import { validarOportunidade } from '../validacao/validador.js';
import { persistirEstado, carregarEstado } from '../persistencia/persistencia.js';
import { obterMetricas, obterRelatorioFinanceiro, obterRelatorioWorkers, monitorarSaude } from '../monitoramento/monitor.js';
import { criarProcesso } from '../processos/processManager.js';
import { config } from '../core/config.js';
import { obterDestinoCarteira, salvarDestinoCarteira } from '../financeiro/carteira.js';

const router = express.Router();

// Health check público
router.get('/health', (req, res) => {
  res.json({
    sucesso: true,
    servico: 'oasis-v2',
    status: mineradora.status,
    modulos: Object.keys(mineradora.modulos),
    contadores: estado.contadores,
  });
});

// Login (único endpoint público de autenticação)
router.post('/auth/login', async (req, res) => {
  try {
    const { usuario, senha } = req.body || {};
    const resultado = await autenticarLogin(usuario, senha);
    if (!resultado.sucesso) return res.status(401).json(resultado);
    return res.json(resultado);
  } catch (error) {
    erro('AUTH_ERRO', error.message, { rota: req.path });
    return res.status(500).json({ sucesso: false, erro: 'Erro interno de autenticacao' });
  }
});

// Rotas protegidas
router.use('/api', autenticarRequisicao);

// Configuração
router.get('/api/config', (req, res) => {
  res.json({ sucesso: true, config: {
    nome: config.nome,
    versao: config.versao,
    operacao: mineradora.operacao,
    mineradora: {
      ambiente: config.ambiente,
      intervaloCicloMs: config.operacao.intervaloCicloMs,
      persistenciaAtiva: config.persistencia.ativo,
      radarAtivo: config.radar.ativo,
      oportunidadesPorCiclo: config.radar.oportunidadesPorCiclo,
    },
  } });
});

router.post('/api/config/mineradora', (req, res) => {
  const { radarAtivo, oportunidadesPorCiclo, intervaloCicloMs } = req.body || {};
  if (typeof radarAtivo !== 'boolean'
    || !Number.isInteger(oportunidadesPorCiclo) || oportunidadesPorCiclo < 1 || oportunidadesPorCiclo > 100
    || !Number.isInteger(intervaloCicloMs) || intervaloCicloMs < 30000 || intervaloCicloMs > 3600000) {
    return res.status(400).json({
      sucesso: false,
      erro: 'Configuração inválida. O limite do Radar deve ser de 1 a 100 e o intervalo de 30 a 3600 segundos.',
    });
  }
  config.radar.ativo = radarAtivo;
  config.radar.oportunidadesPorCiclo = oportunidadesPorCiclo;
  config.operacao.intervaloCicloMs = configurarIntervalo(intervaloCicloMs);
  info('CONFIG_MINERADORA_ATUALIZADA', 'Parâmetros operacionais atualizados nesta execução', {
    radarAtivo: config.radar.ativo,
    oportunidadesPorCiclo: config.radar.oportunidadesPorCiclo,
    intervaloCicloMs: config.operacao.intervaloCicloMs,
  });
  return res.json({
    sucesso: true,
    persistida: false,
    config: {
      radarAtivo: config.radar.ativo,
      oportunidadesPorCiclo: config.radar.oportunidadesPorCiclo,
      intervaloCicloMs: config.operacao.intervaloCicloMs,
    },
  });
});

// Carteira: guarda um destino de recebimento criptografado localmente.
router.get('/api/carteira/destino', (req, res) => {
  const resultado = obterDestinoCarteira();
  if (!resultado.sucesso) return res.status(resultado.status || 503).json(resultado);
  return res.json(resultado);
});

router.post('/api/carteira/destino', (req, res) => {
  const resultado = salvarDestinoCarteira(req.body || {});
  if (!resultado.sucesso) return res.status(resultado.status || 400).json(resultado);
  return res.json(resultado);
});

// Operação
router.post('/api/operacao/iniciar', (req, res) => {
  const resultado = iniciarOperacao();
  if (!resultado.sucesso) return res.status(400).json(resultado);
  return res.json(resultado);
});

router.get('/api/operacao/prontidao-real', (req, res) => {
  const prontidao = obterProntidaoOperacaoReal();
  res.status(prontidao.pronta ? 200 : 409).json({ sucesso: true, prontidao });
});

router.post('/api/operacao/parar', async (req, res) => {
  const resultado = await pararOperacao();
  if (!resultado.sucesso) return res.status(400).json(resultado);
  return res.json(resultado);
});

router.get('/api/operacao/status', (req, res) => {
  res.json({ sucesso: true, ...obterStatusOperacao() });
});

// Radar
router.get('/api/radar', (req, res) => {
  res.json({ sucesso: true, fontesLista: obterFontesRadar(), ...obterResumoRadar(), oportunidades: listarOportunidadesRadar({ limite: 100 }) });
});

router.get('/api/radar/fontes', (req, res) => {
  res.json({ sucesso: true, fontes: obterFontesRadar() });
});

router.get('/api/radar/oportunidades', (req, res) => {
  res.json({ sucesso: true, oportunidades: listarOportunidadesRadar({ limite: 100 }) });
});

router.post('/api/radar/oportunidades', (req, res) => {
  const { lote } = req.body;
  if (!Array.isArray(lote)) {
    return res.status(400).json({ sucesso: false, erro: 'Lote deve ser um array' });
  }
  const resultado = processarOportunidades(lote);
  const persistencia = persistirEstado();
  if (!persistencia.sucesso) return res.status(503).json({ ...resultado, erro: 'PERSISTENCIA_OBRIGATORIA_FALHOU' });
  res.json(resultado);
});

router.post('/api/radar/executar', async (req, res) => {
  const resultado = await executarCicloReal();
  res.status(resultado.sucesso ? 200 : 409).json(resultado);
});

router.post('/api/processos/:id/executar', async (req, res) => {
  const resultado = await executarProcessoReal(req.params.id);
  const status = resultado.sucesso ? 200 : 409;
  const persistencia = resultado.sucesso ? { persistencia: persistirEstado().sucesso } : {};
  return res.status(status).json({ ...resultado, ...persistencia });
});

// Processos
router.get('/api/processos', (req, res) => {
  res.json({ sucesso: true, total: estado.processos.size, processos: Array.from(estado.processos.values()) });
});

router.get('/api/processos/resumo', (req, res) => {
  res.json({ sucesso: true, total: estado.processos.size });
});

router.post('/api/processos', (req, res) => {
  const validacao = validacaoProcesso(req.body);
  if (!validacao.success) {
    return res.status(400).json({ sucesso: false, erro: 'Validacao falhou', detalhes: validacao.error.issues });
  }
  const processo = criarProcesso(validacao.data);
  const persistencia = persistirEstado();
  if (!persistencia.sucesso) return res.status(503).json({ sucesso: false, erro: 'PERSISTENCIA_OBRIGATORIA_FALHOU' });
  return res.status(201).json({ sucesso: true, processo });
});

// Workers
router.get('/api/workers', (req, res) => {
  res.json({ sucesso: true, total: estado.workers.size, workers: Array.from(estado.workers.values()) });
});

router.post('/api/workers/registrar', (req, res) => {
  const worker = registrarWorker(req.body);
  if (worker?.sucesso === false) return res.status(400).json(worker);
  const persistencia = persistirEstado();
  if (!persistencia.sucesso) return res.status(503).json({ sucesso: false, erro: 'PERSISTENCIA_OBRIGATORIA_FALHOU' });
  res.status(201).json({ sucesso: true, worker });
});

// Financeiro
router.get('/api/financeiro', (req, res) => {
  res.json({ sucesso: true, financeiro: mineradora.financeiro });
});

// Estado geral
router.get('/api/estado', (req, res) => {
  res.json({
    sucesso: true,
    status: mineradora.status,
    contadores: estado.contadores,
    modulos: Object.keys(mineradora.modulos),
    financeiro: mineradora.financeiro,
    radar: {
      fontesLista: obterFontesRadar(),
      ...obterResumoRadar(),
      oportunidadesRecentes: listarOportunidadesRadar({ limite: 50 }).map(item => ({
        externalId: item.externalId,
        fonte: item.fonte,
        plataforma: item.plataforma,
        tipoOportunidade: item.tipoOportunidade,
        titulo: item.titulo || item.title || 'Oportunidade sem título',
        url: item.url || null,
        empresa: item.empresa || '',
        localizacao: item.localizacao || '',
        categoria: item.categoria || '',
        modalidade: item.modalidade || '',
        remuneracaoAnunciada: item.remuneracaoAnunciada || '',
        publicadoEm: item.publicadoEm || item.criadoEm || null,
        tags: item.tags || [],
        requerCandidaturaHumana: item.requerCandidaturaHumana === true,
      })),
      ativo: config.radar.ativo,
      oportunidadesPorCiclo: config.radar.oportunidadesPorCiclo,
      modoConsulta: 'GLOBAL_SOMENTE_LEITURA',
    },
    executorReal: obterStatusExecutorReal(),
    workers: estado.workers.size,
    processos: estado.processos.size,
  });
});

// Visão única e somente leitura para o painel ao vivo.
router.get('/api/dashboard', (req, res) => {
  const processos = Array.from(estado.processos.values())
    .map(processo => ({
      id: processo.id,
      externalId: processo.externalId || null,
      status: processo.status,
      fonte: processo.fonte || processo.plataforma || 'desconhecida',
      titulo: processo.dadosOportunidade?.titulo || processo.dadosOportunidade?.title || processo.title || null,
      moeda: processo.dadosOportunidade?.moeda || processo.dadosOportunidade?.currency || 'USD',
      valorEstimado: Number(processo.valorBrutoEstimado) || 0,
      custoEstimado: Number(processo.custoEstimado) || 0,
      criadoEm: processo.criadoEm || null,
      atualizadoEm: processo.atualizadoEm || null,
      supervisao: processo.supervisao ? {
        responsavel: processo.supervisao.responsavel,
        decisao: processo.supervisao.decisao,
        motivos: processo.supervisao.motivos,
        supervisionadoEm: processo.supervisao.supervisionadoEm,
      } : null,
      eventos: (processo.eventos || []).slice(-5).map(evento => ({
        tipo: evento.tipo,
        em: evento.em,
        motivo: evento.motivo || null,
      })),
    }))
    .sort((a, b) => Date.parse(b.atualizadoEm || b.criadoEm || 0) - Date.parse(a.atualizadoEm || a.criadoEm || 0));
  const workers = Array.from(estado.workers.values()).map(worker => ({
    id: worker.id,
    tipo: worker.tipo,
    especializacao: worker.especializacao || 'geral',
    status: worker.status,
    capacidade: worker.capacidade,
    processosAtivos: (worker.processosAtribuidos || []).length,
  }));

  res.json({
    sucesso: true,
    atualizadoEm: new Date().toISOString(),
    sistema: {
      status: mineradora.status,
      modo: config.operacao.operacao,
      configuracao: {
        ambiente: config.ambiente,
        intervaloCicloMs: config.operacao.intervaloCicloMs,
        persistenciaAtiva: config.persistencia.ativo,
        radarAtivo: config.radar.ativo,
        oportunidadesPorCiclo: config.radar.oportunidadesPorCiclo,
      },
      operacaoAtiva: obterStatusOperacao().ativo,
      prontidao: obterProntidaoOperacaoReal(),
      contadores: { ...estado.contadores },
    },
    radar: {
      fontesLista: obterFontesRadar(),
      ...obterResumoRadar(),
      oportunidadesRecentes: listarOportunidadesRadar({ limite: 50 }).map(item => ({
        externalId: item.externalId,
        fonte: item.fonte,
        plataforma: item.plataforma,
        tipoOportunidade: item.tipoOportunidade,
        titulo: item.titulo || item.title || 'Oportunidade sem título',
        url: item.url || null,
        empresa: item.empresa || '',
        localizacao: item.localizacao || '',
        categoria: item.categoria || '',
        modalidade: item.modalidade || '',
        remuneracaoAnunciada: item.remuneracaoAnunciada || '',
        publicadoEm: item.publicadoEm || item.criadoEm || null,
        tags: item.tags || [],
        requerCandidaturaHumana: item.requerCandidaturaHumana === true,
      })),
      ativo: config.radar.ativo,
      oportunidadesPorCiclo: config.radar.oportunidadesPorCiclo,
      modoConsulta: 'GLOBAL_SOMENTE_LEITURA',
    },
    executorReal: obterStatusExecutorReal(),
    financeiro: obterRelatorioFinanceiro(),
    processos,
    workers,
  });
});

// Validação
router.post('/api/validar/oportunidade', (req, res) => {
  const resultado = validarOportunidade(req.body);
  res.json(resultado);
});

// Persistência
router.post('/api/persistencia/salvar', (req, res) => {
  const resultado = persistirEstado();
  res.json(resultado);
});

router.post('/api/persistencia/carregar', (req, res) => {
  const resultado = carregarEstado();
  res.json(resultado);
});

// Monitoramento
router.get('/api/monitor/metricas', (req, res) => {
  res.json({ sucesso: true, metricas: obterMetricas() });
});

router.get('/api/monitor/financeiro', (req, res) => {
  res.json({ sucesso: true, relatorio: obterRelatorioFinanceiro() });
});

router.get('/api/monitor/workers', (req, res) => {
  res.json({ sucesso: true, relatorio: obterRelatorioWorkers() });
});

router.get('/api/monitor/saude', (req, res) => {
  res.json({ sucesso: true, ...monitorarSaude() });
});

// Erro 404
router.use('*', (req, res) => {
  res.status(404).json({ sucesso: false, erro: 'Rota nao encontrada' });
});

// Tratamento de erros
router.use((err, req, res, next) => {
  erro('API_ERRO', err.message, { rota: req.path });
  res.status(500).json({ sucesso: false, erro: 'Erro interno do servidor' });
});

export default router;


