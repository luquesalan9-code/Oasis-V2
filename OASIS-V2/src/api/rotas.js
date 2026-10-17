/**
 * OASIS V2 - API Express com Segurança
 */
import express from 'express';
import { autenticarRequisicao, autenticarLogin } from '../security/auth.js';
import { validacaoProcesso } from '../security/validacao.js';
import { info, erro } from '../logs/logger.js';
import { mineradora } from '../core/mineradora.js';
import { estado } from '../core/estado.js';
import { iniciarOperacao, pararOperacao, obterStatusOperacao, obterProntidaoOperacaoReal } from '../core/operacao.js';
import { processarOportunidades, executarCicloReal, obterResumoOrquestrador } from '../orquestrador/orquestrador.js';
import { registrarWorker } from '../workers/workerManager.js';
import { obterResumoRadar } from '../radar/radarGlobal.js';
import { validarOportunidade } from '../validacao/validador.js';
import { persistirEstado, carregarEstado } from '../persistencia/persistencia.js';
import { obterMetricas, obterRelatorioFinanceiro, obterRelatorioWorkers, monitorarSaude } from '../monitoramento/monitor.js';
import { criarProcesso } from '../processos/processManager.js';
import { config } from '../core/config.js';

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
  res.json({ sucesso: true, config: { nome: config.nome, versao: config.versao, operacao: mineradora.operacao } });
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
  res.json({ sucesso: true, ...obterResumoRadar() });
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
    radar: obterResumoRadar(),
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
      operacaoAtiva: obterStatusOperacao().ativo,
      prontidao: obterProntidaoOperacaoReal(),
      contadores: { ...estado.contadores },
    },
    radar: obterResumoRadar(),
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


