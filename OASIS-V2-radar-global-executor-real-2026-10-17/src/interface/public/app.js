const SESSION_KEY = 'oasis-v2-session';
const REFRESH_MS = 5000;
const INTERFACE_SETTINGS_KEY = 'oasis-v2-interface-settings';
const DEFAULT_INTERFACE_SETTINGS = { refreshMs: REFRESH_MS, density: 'normal', contrast: 'normal', reduceMotion: false };
const historyPoints = [];
const $ = selector => document.querySelector(selector);
let sessionToken = sessionStorage.getItem(SESSION_KEY);
let lastDashboard = null;
let refreshRunning = false;
let toastTimer = null;
let refreshTimer = null;
const PAGE_SUFFIX = '-pagina';

function readInterfaceSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(INTERFACE_SETTINGS_KEY) || '{}');
    return {
      refreshMs: [5000, 10000, 30000].includes(parsed.refreshMs) ? parsed.refreshMs : DEFAULT_INTERFACE_SETTINGS.refreshMs,
      density: ['normal', 'compact'].includes(parsed.density) ? parsed.density : DEFAULT_INTERFACE_SETTINGS.density,
      contrast: ['normal', 'high'].includes(parsed.contrast) ? parsed.contrast : DEFAULT_INTERFACE_SETTINGS.contrast,
      reduceMotion: parsed.reduceMotion === true,
    };
  } catch {
    return { ...DEFAULT_INTERFACE_SETTINGS };
  }
}

let interfaceSettings = readInterfaceSettings();

function elementsForId(id) {
  return [document.getElementById(id), document.getElementById(`${id}${PAGE_SUFFIX}`)].filter(Boolean);
}

function inputValue(id) {
  const control = document.getElementById(id);
  return control instanceof HTMLInputElement || control instanceof HTMLSelectElement ? control.value : '';
}

function setButtonsDisabled(id, disabled) {
  elementsForId(id).forEach(element => {
    if (element instanceof HTMLButtonElement) element.disabled = disabled;
  });
}

const blockerLabels = {
  AMBIENTE_NAO_PRODUCAO: 'O servidor ainda não está em ambiente de produção.',
  PERSISTENCIA_DESATIVADA: 'A persistência está desativada.',
  MODO_REAL_NAO_CONFIGURADO: 'O sistema não está configurado em modo REAL.',
  SENHA_ADMIN_BCRYPT_AUSENTE: 'Falta configurar a senha administrativa com hash bcrypt.',
  SEGREDO_JWT_INVALIDO: 'O segredo JWT não atende ao tamanho exigido.',
  EXECUTOR_REAL_NAO_IMPLEMENTADO: 'Nenhum worker real com executor foi registrado.',
  SUPERVISAO_POR_AGENTES_NAO_IMPLEMENTADA: 'A supervisão determinística interna ainda não foi inicializada.',
  INTEGRACAO_OFICIAL_DE_EXECUCAO_NAO_CONFIGURADA: 'Falta instalar e autorizar um adaptador oficial de execução.',
};
const supervisionLabels = {
  PERMISSOES_NAO_COMPROVADAS: 'permissões não comprovadas',
  EVIDENCIA_OFICIAL_NAO_VERIFICADA: 'evidência oficial não verificada',
  REMUNERACAO_NAO_COMPROVADA: 'remuneração não comprovada',
};

function setText(selector, value) {
  const id = selector.startsWith('#') ? selector.slice(1) : selector;
  const text = value === null || value === undefined || value === '' ? '—' : String(value);
  elementsForId(id).forEach(target => { target.textContent = text; });
}

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(Number(value) || 0);
}

function formatMoney(value, currency = 'USD') {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(Number(value) || 0);
  } catch {
    return `${formatNumber(value)} ${currency}`;
  }
}

function formatDate(value, options = {}) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: options.withDate ? '2-digit' : undefined,
    month: options.withDate ? '2-digit' : undefined,
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3500);
}

function showLogin(message = '') {
  $('#login-overlay').hidden = false;
  const error = $('#login-error');
  error.textContent = message;
  error.hidden = !message;
}

function clearSession(message = '') {
  sessionToken = null;
  sessionStorage.removeItem(SESSION_KEY);
  $('#wallet-form')?.reset();
  showLogin(message);
}

async function getJson(url, options = {}) {
  const headers = new Headers(options.headers || {});
  if (sessionToken) headers.set('Authorization', `Bearer ${sessionToken}`);
  const response = await fetch(url, { ...options, headers, cache: 'no-store' });
  let body = {};
  try { body = await response.json(); } catch { /* resposta vazia */ }
  if (response.status === 401 && url.startsWith('/api/')) {
    clearSession('Sua sessão expirou. Entre novamente.');
  }
  if (!response.ok) {
    const error = Object.assign(new Error(body.erro || `Falha ao consultar o servidor (${response.status})`), {
      status: response.status,
    });
    throw error;
  }
  return body;
}

async function refreshHealth() {
  try {
    const health = await getJson('/health');
    $('#connection-dot').classList.remove('offline');
    setText('#connection-label', 'OASIS ONLINE');
    setText('#operation-label', 'Servidor conectado · modo REAL');
    setText('#footer-status', 'conectado ao servidor');
    return true;
  } catch {
    $('#connection-dot').classList.add('offline');
    setText('#connection-label', 'OASIS OFFLINE');
    setText('#operation-label', 'Não foi possível alcançar o servidor');
    setText('#footer-status', 'sem conexão');
    return false;
  }
}

function translatedStatus(status) {
  const labels = {
    CRIADO: 'Criado', NA_FILA: 'Na fila', DISTRIBUIDO: 'Distribuído', EXECUTANDO: 'Executando',
    VALIDANDO: 'Validando', CONCLUIDO: 'Concluído', FALHOU: 'Falhou', QUARENTENA: 'Quarentena',
    PAUSADO: 'Pausado', CANCELADO: 'Cancelado', DISPONIVEL: 'Disponível', OCUPADO: 'Ocupado',
    INATIVO: 'Inativo', BLOQUEADO: 'Bloqueado', ERRO: 'Erro', ATIVO: 'Ativa', CONSULTANDO: 'Consultando', ATIVA: 'Ativa', PARADA: 'Parada',
  };
  return labels[status] || status || 'Sem status';
}

function statusClass(status) {
  if (['CONCLUIDO', 'DISPONIVEL'].includes(status)) return 'ok';
  if (['QUARENTENA', 'PAUSADO', 'NA_FILA', 'CRIADO', 'DISTRIBUIDO', 'VALIDANDO'].includes(status)) return 'warn';
  if (['FALHOU', 'ERRO', 'BLOQUEADO'].includes(status)) return 'bad';
  if (['EXECUTANDO', 'OCUPADO'].includes(status)) return 'violet';
  return '';
}

function makeCell(text, className = '') {
  const cell = document.createElement('td');
  if (className) cell.className = className;
  cell.textContent = text === null || text === undefined || text === '' ? '—' : String(text);
  return cell;
}

function renderProcessTable(processes = []) {
  ['', PAGE_SUFFIX].forEach(suffix => {
    const tbody = document.getElementById(`process-table${suffix}`);
    if (!tbody) return;
    const filter = inputValue(`process-filter${suffix}`) || 'todos';
    const search = inputValue(`process-search${suffix}`).trim().toLocaleLowerCase('pt-BR');
    const visible = processes.filter(process => {
      const statusMatch = filter === 'todos'
        || (filter === 'ativos' && ['CRIADO', 'NA_FILA', 'DISTRIBUIDO', 'EXECUTANDO', 'VALIDANDO', 'PAUSADO'].includes(process.status))
        || process.status === filter;
      const text = `${process.id} ${process.externalId || ''} ${process.fonte || ''} ${process.titulo || ''}`.toLocaleLowerCase('pt-BR');
      return statusMatch && (!search || text.includes(search));
    });
    tbody.replaceChildren();
    const count = document.getElementById(`process-count${suffix}`);
    if (count) count.textContent = `${formatNumber(visible.length)} de ${formatNumber(processes.length)} processos`;
    if (!visible.length) {
      const row = document.createElement('tr');
      const cell = makeCell(processes.length ? 'Nenhum processo corresponde ao filtro.' : 'Nenhum processo registrado até agora.', 'empty-state');
      cell.colSpan = 5;
      row.append(cell);
      tbody.append(row);
      return;
    }
    visible.slice(0, 100).forEach(process => {
      const row = document.createElement('tr');
      const identity = document.createElement('td');
      identity.className = 'process-name';
      identity.textContent = process.titulo || process.id;
      const external = document.createElement('small');
      external.textContent = process.externalId && process.externalId !== process.id ? process.externalId : process.id;
      identity.append(external);
      if (process.supervisao) {
        const audit = document.createElement('small');
        const decision = process.supervisao.decisao === 'QUARENTENA' ? 'quarentena' : 'fila local';
        const reasons = (process.supervisao.motivos || []).map(reason => supervisionLabels[reason] || reason);
        audit.textContent = `Supervisão: ${decision}${reasons.length ? ` · ${reasons.join(', ')}` : ''}`;
        identity.append(audit);
      }
      row.append(identity, makeCell(process.fonte));
      const status = document.createElement('td');
      const chip = document.createElement('span');
      chip.className = `status-chip ${statusClass(process.status)}`.trim();
      chip.textContent = translatedStatus(process.status);
      status.append(chip);
      row.append(status, makeCell(formatMoney(process.valorEstimado, process.moeda)), makeCell(formatDate(process.atualizadoEm || process.criadoEm, { withDate: true })));
      tbody.append(row);
    });
  });
}

function renderWorkers(workers = []) {
  const available = workers.filter(worker => worker.status === 'DISPONIVEL').length;
  const busy = workers.filter(worker => worker.status === 'OCUPADO' || worker.processosAtivos > 0).length;
  setText('#worker-total', formatNumber(workers.length));
  setText('#worker-available', formatNumber(available));
  setText('#worker-busy', formatNumber(busy));
  setText('#workers-caption', `${formatNumber(workers.length)} workers registrados no estado real do sistema`);
  ['', PAGE_SUFFIX].forEach(suffix => {
    const tbody = document.getElementById(`worker-table${suffix}`);
    if (!tbody) return;
    tbody.replaceChildren();
    if (!workers.length) {
      const row = document.createElement('tr');
      const cell = makeCell('Nenhum worker real foi registrado.', 'empty-state');
      cell.colSpan = 4;
      row.append(cell);
      tbody.append(row);
      return;
    }
    workers.forEach(worker => {
      const row = document.createElement('tr');
      row.append(makeCell(worker.id), makeCell(worker.especializacao));
      const status = document.createElement('td');
      const chip = document.createElement('span');
      chip.className = `status-chip ${statusClass(worker.status)}`.trim();
      chip.textContent = translatedStatus(worker.status);
      status.append(chip);
      row.append(status, makeCell(`${formatNumber(worker.processosAtivos)}/${formatNumber(worker.capacidade)}`));
      tbody.append(row);
    });
  });
}

function renderCurrencies(targetId, amounts, emptyMessage) {
  const currencies = Object.entries(amounts || {}).filter(([, value]) => Number(value) !== 0);
  elementsForId(targetId).forEach(target => {
    target.replaceChildren();
    if (!currencies.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state compact-empty';
      empty.textContent = emptyMessage;
      target.append(empty);
      return;
    }
    currencies.forEach(([currency, amount]) => {
      const row = document.createElement('div');
      row.className = 'currency-row';
      const label = document.createElement('span');
      label.textContent = currency;
      const value = document.createElement('strong');
      value.textContent = formatMoney(amount, currency);
      row.append(label, value);
      target.append(row);
    });
  });
}

function renderEvents(processes = []) {
  const entries = processes.flatMap(process => (process.eventos || []).map(event => ({ ...event, processId: process.id, title: process.titulo })))
    .sort((a, b) => Date.parse(b.em || 0) - Date.parse(a.em || 0));
  const unique = [];
  const seen = new Set();
  entries.forEach(event => {
    const key = `${event.processId}|${event.tipo}|${event.em}`;
    if (!seen.has(key)) { seen.add(key); unique.push(event); }
  });
  elementsForId('event-list').forEach(feed => {
    feed.replaceChildren();
    if (!unique.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'Nenhum evento de processo foi registrado.';
      feed.append(empty);
      return;
    }
    unique.slice(0, 12).forEach(event => {
      const row = document.createElement('div');
      row.className = 'event-row';
      const icon = document.createElement('span');
      const status = event.tipo === 'TRANSICAO_STATUS' ? (event.para || '') : event.tipo;
      icon.className = `event-icon ${['CONCLUIDO'].includes(status) ? 'good' : status === 'QUARENTENA' ? 'quarantine' : ['FALHOU', 'ERRO'].includes(status) ? 'bad' : ''}`.trim();
      icon.textContent = status === 'CONCLUIDO' ? '✓' : status === 'FALHOU' ? '!' : status === 'QUARENTENA' ? '◇' : '•';
      const copy = document.createElement('div');
      copy.className = 'event-copy';
      const title = document.createElement('strong');
      title.textContent = `${event.processId} · ${translatedStatus(status)}`;
      const detail = document.createElement('small');
      detail.textContent = event.motivo || 'Evento operacional registrado';
      copy.append(title, detail);
      const time = document.createElement('time');
      time.className = 'event-time';
      time.dateTime = event.em || '';
      time.textContent = formatDate(event.em);
      row.append(icon, copy, time);
      feed.append(row);
    });
  });
}

function renderChart(dashboard) {
  const counts = dashboard.sistema.contadores || {};
  historyPoints.push({
    total: dashboard.processos.length,
    complete: Number(counts.processosConcluidos) || 0,
    busy: dashboard.workers.filter(worker => worker.status === 'OCUPADO' || worker.processosAtivos > 0).length,
  });
  if (historyPoints.length > 24) historyPoints.shift();

  const namespace = 'http://www.w3.org/2000/svg';
  const keys = [['total', 'chart-line-process'], ['complete', 'chart-line-complete'], ['busy', 'chart-line-worker']];
  const max = Math.max(1, ...historyPoints.flatMap(point => [point.total, point.complete, point.busy]));
  elementsForId('activity-chart').forEach(svg => {
    svg.replaceChildren();
    [25, 65, 105, 145].forEach(y => {
      const line = document.createElementNS(namespace, 'line');
      line.setAttribute('x1', '0'); line.setAttribute('x2', '620');
      line.setAttribute('y1', String(y)); line.setAttribute('y2', String(y));
      line.setAttribute('class', 'chart-gridline'); svg.append(line);
    });
    keys.forEach(([key, className]) => {
      const path = document.createElementNS(namespace, 'polyline');
      const coords = historyPoints.map((point, index) => {
        const x = historyPoints.length === 1 ? 310 : 8 + index * 604 / (historyPoints.length - 1);
        const y = 145 - (point[key] / max) * 118;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
      path.setAttribute('points', coords);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-width', '2.5');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      path.setAttribute('class', className);
      svg.append(path);
    });
  });
}

function renderReadiness(prontidao, operationActive = false) {
  const ready = prontidao.pronta === true;
  setText('#readiness-state', ready ? 'Pronta para operar' : 'Automação bloqueada');
  $('#readiness-state').classList.toggle('ready', ready);
  setText('#readiness-copy', ready
    ? 'Os requisitos operacionais foram verificados.'
    : 'Nenhuma tarefa será iniciada até os requisitos reais estarem completos.');
  ['', PAGE_SUFFIX].forEach(suffix => {
    const state = document.getElementById(`readiness-state${suffix}`);
    if (state) state.classList.toggle('ready', ready);
    const list = document.getElementById(`blocker-list${suffix}`);
    if (list) {
      list.replaceChildren();
      const blockers = ready ? [] : (prontidao.bloqueios || []);
      if (ready) {
        const item = document.createElement('li'); item.textContent = 'Todos os requisitos de prontidão estão atendidos.'; list.append(item);
      } else {
        blockers.forEach(blocker => {
          const item = document.createElement('li');
          item.textContent = blockerLabels[blocker] || blocker;
          list.append(item);
        });
        if (!list.children.length) {
          const item = document.createElement('li'); item.textContent = 'A prontidão real não pôde ser confirmada.'; list.append(item);
        }
      }
    }
    setButtonsDisabled(`start-operation${suffix.replace(PAGE_SUFFIX, '')}`, !sessionToken || !ready || operationActive);
    setButtonsDisabled(`stop-operation${suffix.replace(PAGE_SUFFIX, '')}`, !sessionToken || !operationActive);
  });
}

function renderDashboard(dashboard) {
  lastDashboard = dashboard;
  const totals = dashboard.financeiro.saldoConfirmado || {};
  const currencies = Object.entries(totals).filter(([, amount]) => Number(amount) !== 0);
  if (!currencies.length) {
    setText('#confirmed-balance', 'Sem recebimentos');
  } else if (currencies.length === 1) {
    setText('#confirmed-balance', formatMoney(currencies[0][1], currencies[0][0]));
  } else {
    setText('#confirmed-balance', `${currencies.length} moedas`);
  }
  renderCurrencies('confirmed-breakdown', totals, 'Nenhum recebimento com evidência confirmada.');
  renderCurrencies('finance-breakdown', dashboard.financeiro.recebimentosConfirmados, 'Nenhum recebimento confirmado.');
  const estimate = dashboard.financeiro.estimativasElegiveis?.resultadoLiquido;
  setText('#estimate-total', estimate === null || estimate === undefined ? '—' : formatMoney(estimate, 'USD'));
  renderWorkers(dashboard.workers || []);
  renderProcessTable(dashboard.processos || []);
  renderEvents(dashboard.processos || []);
  renderReadiness(dashboard.sistema.prontidao || { pronta: false, bloqueios: [] }, dashboard.sistema.operacaoAtiva === true);
  setText('#radar-sources', formatNumber(dashboard.radar.fontes));
  setText('#radar-opportunities', formatNumber(dashboard.radar.oportunidades));
  setText('#radar-cycles', formatNumber(dashboard.radar.lotesProcessados));
  setText('#radar-enabled-page', dashboard.radar.ativo ? 'Ativo' : 'Inativo');
  setText('#radar-limit-page', formatNumber(dashboard.radar.oportunidadesPorCiclo));
  setText('#radar-mode-page', dashboard.radar.modoConsulta === 'GLOBAL_SOMENTE_LEITURA' ? 'Global · somente leitura' : 'Desconhecido');
  renderRadarGlobal(dashboard.radar);
  const mineradoraForm = $('#mineradora-settings-form');
  if (mineradoraForm && mineradoraForm.dataset.dirty !== 'true') {
    const settings = dashboard.sistema.configuracao || {};
    $('#mineradora-radar-enabled').checked = settings.radarAtivo === true;
    $('#mineradora-batch-size').value = settings.oportunidadesPorCiclo || 10;
    $('#mineradora-cycle-seconds').value = Math.round((settings.intervaloCicloMs || 30000) / 1000);
  }
  setText('#mineradora-environment-page', dashboard.sistema.configuracao?.ambiente);
  setText('#mineradora-persistence-page', dashboard.sistema.configuracao?.persistenciaAtiva ? 'Ativa' : 'Inativa');
  setText('#mineradora-operation-page', dashboard.sistema.modo);
  renderChart(dashboard);
  const updated = formatDate(dashboard.atualizadoEm);
  setText('#updated-at', `Atualizado às ${updated}`);
  setText('#footer-status', `última leitura ${updated}`);
  setText('#operation-label', dashboard.sistema.operacaoAtiva ? 'REAL · operação ativa' : 'REAL · automação não iniciada');
  setButtonsDisabled('run-radar', !sessionToken || dashboard.radar.ativo === false);
  setButtonsDisabled('start-operation', !sessionToken || dashboard.sistema.prontidao?.pronta !== true || dashboard.sistema.operacaoAtiva);
  setButtonsDisabled('stop-operation', !sessionToken || !dashboard.sistema.operacaoAtiva);
}

function renderRadarGlobal(radarData = {}) {
  const sourceList = document.getElementById('radar-global-sources');
  const opportunityList = document.getElementById('radar-global-opportunities');
  if (!sourceList || !opportunityList) return;

  sourceList.replaceChildren();
  const sources = Array.isArray(radarData.fontesLista) ? radarData.fontesLista : [];
  if (!sources.length) {
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.textContent = 'As fontes ainda não foram carregadas.';
    sourceList.append(empty);
  }
  sources.forEach(source => {
    const row = document.createElement('li');
    row.className = 'radar-source-row';
    const identity = document.createElement('div');
    identity.className = 'radar-source-identity';
    const name = document.createElement('strong');
    name.textContent = source.nome || source.id || 'Fonte';
    const endpoint = document.createElement('small');
    endpoint.textContent = source.baseURL || 'Feed oficial';
    identity.append(name, endpoint);
    const status = document.createElement('span');
    status.className = `status-chip ${source.status === 'ATIVO' ? 'ok' : source.status === 'ERRO' ? 'bad' : 'warn'}`;
    status.textContent = translatedStatus(source.status || 'INATIVO');
    row.append(identity, status);
    sourceList.append(row);
  });

  opportunityList.replaceChildren();
  const opportunities = Array.isArray(radarData.oportunidadesRecentes) ? radarData.oportunidadesRecentes : [];
  if (!opportunities.length) {
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.textContent = 'Nenhuma oportunidade encontrada ainda. Use “Consultar agora” para buscar nas fontes globais.';
    opportunityList.append(empty);
    return;
  }

  opportunities.forEach(opportunity => {
    const item = document.createElement('li');
    item.className = 'radar-opportunity';
    const heading = document.createElement('div');
    heading.className = 'radar-opportunity-heading';
    const title = document.createElement(opportunity.url?.startsWith('https://') ? 'a' : 'span');
    title.className = 'radar-opportunity-title';
    title.textContent = opportunity.titulo || 'Oportunidade sem título';
    if (title instanceof HTMLAnchorElement) {
      title.href = opportunity.url;
      title.target = '_blank';
      title.rel = 'noopener noreferrer';
    }
    const source = document.createElement('span');
    source.className = 'radar-opportunity-source';
    source.textContent = opportunity.plataforma || opportunity.fonte || 'Fonte';
    heading.append(title, source);
    item.append(heading);

    const details = document.createElement('p');
    details.className = 'radar-opportunity-details';
    details.textContent = [opportunity.empresa, opportunity.localizacao, opportunity.modalidade]
      .filter(Boolean).join(' · ') || opportunity.categoria || 'Anúncio global';
    item.append(details);

    const compensation = document.createElement('p');
    compensation.className = 'radar-opportunity-compensation';
    compensation.textContent = opportunity.remuneracaoAnunciada
      ? `Remuneração anunciada: ${opportunity.remuneracaoAnunciada} · ainda não verificada`
      : 'Remuneração não informada';
    item.append(compensation);

    const footer = document.createElement('small');
    footer.className = 'radar-opportunity-footer';
    footer.textContent = `Publicado ${formatDate(opportunity.publicadoEm)} · candidatura exige revisão humana`;
    item.append(footer);
    opportunityList.append(item);
  });
}

async function refreshDashboard(showErrors = false) {
  if (!sessionToken || refreshRunning) return;
  refreshRunning = true;
  try {
    await refreshHealth();
    const dashboard = await getJson('/api/dashboard');
    renderDashboard(dashboard);
  } catch (error) {
    if (error.status !== 401 && showErrors) showToast(error.message);
  } finally {
    refreshRunning = false;
  }
}

const pageTitles = {
  inicio: 'Visão geral',
  atividade: 'Atividade',
  radar: 'Radar',
  processos: 'Processos',
  workers: 'Workers',
  financeiro: 'Financeiro',
  carteira: 'Carteira',
  prontidao: 'Prontidão real',
  mineradora: 'Configurações da mineradora',
  interface: 'Configurações da interface',
};

function createInfoCard(title, message, rows = []) {
  const card = document.createElement('article');
  card.className = 'panel compact-panel module-info-card';
  const heading = document.createElement('div');
  heading.className = 'panel-title';
  const icon = document.createElement('span');
  icon.className = 'round-icon violet';
  icon.textContent = 'i';
  const titleElement = document.createElement('h2');
  titleElement.textContent = title;
  heading.append(icon, titleElement);
  card.append(heading);
  rows.forEach(row => {
    const line = document.createElement('div');
    line.className = 'metric-pair';
    const label = document.createElement('span');
    label.textContent = row.label;
    const value = document.createElement('strong');
    value.textContent = row.value || '—';
    if (row.id) value.id = row.id;
    line.append(label, value);
    card.append(line);
  });
  const copy = document.createElement('p');
  copy.className = 'muted small';
  copy.textContent = message;
  card.append(copy);
  return card;
}

function createRadarGlobalPanel() {
  const panel = document.createElement('article');
  panel.className = 'panel table-panel radar-global-panel';
  const heading = document.createElement('div');
  heading.className = 'panel-title';
  const icon = document.createElement('span');
  icon.className = 'round-icon blue';
  icon.textContent = '◎';
  const title = document.createElement('h2');
  title.textContent = 'Oportunidades globais';
  heading.append(icon, title);
  const sourceHeading = document.createElement('h3');
  sourceHeading.className = 'radar-subheading';
  sourceHeading.textContent = 'Fontes oficiais';
  const sourceList = document.createElement('ul');
  sourceList.id = 'radar-global-sources';
  sourceList.className = 'radar-source-list';
  const opportunityHeading = document.createElement('h3');
  opportunityHeading.className = 'radar-subheading';
  opportunityHeading.textContent = 'Descobertas recentes';
  const opportunityList = document.createElement('ul');
  opportunityList.id = 'radar-global-opportunities';
  opportunityList.className = 'radar-opportunity-list';
  const note = document.createElement('p');
  note.className = 'muted small';
  note.textContent = 'As fontes mostram anúncios públicos; salário, elegibilidade e pagamento precisam ser confirmados. O Radar não envia candidaturas.';
  panel.append(heading, sourceHeading, sourceList, opportunityHeading, opportunityList, note);
  return panel;
}

function cloneModulePanel(selector) {
  const source = document.querySelector(selector);
  if (!source) return null;
  const copy = source.cloneNode(true);
  if (copy.id) copy.id += PAGE_SUFFIX;
  copy.querySelectorAll('[id]').forEach(element => { element.id += PAGE_SUFFIX; });
  return copy;
}

function createSelect(id, values) {
  const select = document.createElement('select');
  select.id = id;
  select.name = id;
  values.forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.append(option);
  });
  return select;
}

function createInput(id, type, options = {}) {
  const input = document.createElement('input');
  input.id = id;
  input.name = id;
  input.type = type;
  Object.entries(options).forEach(([key, value]) => {
    if (key === 'value') input.value = value;
    else if (key === 'checked') input.checked = value;
    else if (key === 'required') input.required = value;
    else input.setAttribute(key, String(value));
  });
  return input;
}

function createFormField(labelText, control, help = '') {
  const field = document.createElement('div');
  field.className = 'settings-field';
  if (control.type === 'checkbox') {
    const label = document.createElement('label');
    label.className = 'checkbox-field';
    label.htmlFor = control.id;
    label.append(control, document.createTextNode(labelText));
    field.append(label);
  } else {
    const label = document.createElement('label');
    label.htmlFor = control.id;
    label.textContent = labelText;
    field.append(label, control);
  }
  if (help) {
    const note = document.createElement('small');
    note.textContent = help;
    field.append(note);
  }
  return field;
}

function createSettingsPanel(title, description, formId) {
  const panel = document.createElement('article');
  panel.className = 'panel compact-panel settings-panel';
  const heading = document.createElement('h2');
  heading.textContent = title;
  const copy = document.createElement('p');
  copy.className = 'muted small';
  copy.textContent = description;
  const form = document.createElement('form');
  form.id = formId;
  form.className = 'settings-form';
  panel.append(heading, copy, form);
  return { panel, form };
}

function appendSettingsSubmit(form, label, statusId) {
  const actions = document.createElement('div');
  actions.className = 'settings-actions';
  const button = document.createElement('button');
  button.className = 'action-button primary-action';
  button.type = 'submit';
  button.textContent = label;
  const status = document.createElement('p');
  status.id = statusId;
  status.className = 'settings-feedback';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  actions.append(button, status);
  form.append(actions);
}

function createMineradoraSettingsPanel() {
  const { panel, form } = createSettingsPanel(
    'Parâmetros operacionais',
    'Alterações valem para o processo atual do servidor e voltam aos valores do arquivo de ambiente após reiniciar.',
    'mineradora-settings-form',
  );
  form.append(
    createFormField('Radar habilitado', createInput('mineradora-radar-enabled', 'checkbox')),
    createFormField('Oportunidades por ciclo', createInput('mineradora-batch-size', 'number', { min: 1, max: 100, required: true }), 'De 1 a 100 itens.'),
    createFormField('Intervalo de ciclo (segundos)', createInput('mineradora-cycle-seconds', 'number', { min: 30, max: 3600, step: 30, required: true }), 'De 30 segundos a 1 hora.'),
  );
  appendSettingsSubmit(form, 'Salvar na sessão do servidor', 'mineradora-config-feedback');
  return panel;
}

function createInterfaceSettingsPanel() {
  const { panel, form } = createSettingsPanel(
    'Preferências visuais',
    'Estas opções ficam salvas somente neste navegador e não alteram as operações da mineradora.',
    'interface-settings-form',
  );
  form.append(
    createFormField('Atualização automática', createSelect('interface-refresh', [['5000', 'A cada 5 segundos'], ['10000', 'A cada 10 segundos'], ['30000', 'A cada 30 segundos']])),
    createFormField('Densidade', createSelect('interface-density', [['normal', 'Confortável'], ['compact', 'Compacta']])),
    createFormField('Contraste', createSelect('interface-contrast', [['normal', 'Padrão'], ['high', 'Alto']])),
    createFormField('Reduzir animações', createInput('interface-reduce-motion', 'checkbox')),
  );
  appendSettingsSubmit(form, 'Salvar neste navegador', 'interface-config-feedback');
  return panel;
}

function createWalletFormPanel() {
  const { panel, form } = createSettingsPanel(
    'Adicionar destino bancário',
    'Os dados serão criptografados no servidor e os números completos não serão exibidos novamente. Salvar um destino não realiza transferências.',
    'wallet-form',
  );
  form.append(
    createFormField('Banco ou instituição', createInput('wallet-bank-input', 'text', { maxlength: 80, autocomplete: 'organization', required: true })),
    createFormField('Titular da conta', createInput('wallet-holder-input', 'text', { maxlength: 120, autocomplete: 'name', required: true })),
    createFormField('Tipo de conta', createSelect('wallet-type-input', [['corrente', 'Corrente'], ['poupanca', 'Poupança'], ['pagamento', 'Conta de pagamento']])),
    createFormField('Agência', createInput('wallet-agency-input', 'text', { maxlength: 20, autocomplete: 'off', required: true })),
    createFormField('Número da conta', createInput('wallet-account-input', 'text', { maxlength: 32, autocomplete: 'off', required: true })),
    createFormField('Dígito', createInput('wallet-digit-input', 'text', { maxlength: 2, autocomplete: 'off' })),
    createFormField('Moeda de recebimento', createSelect('wallet-currency-input', [['BRL', 'Real brasileiro (BRL)'], ['USD', 'Dólar americano (USD)'], ['EUR', 'Euro (EUR)']])),
    createFormField('Tipo de chave PIX (opcional)', createSelect('wallet-pix-type-input', [['', 'Sem chave PIX'], ['cpf', 'CPF'], ['cnpj', 'CNPJ'], ['email', 'E-mail'], ['telefone', 'Telefone'], ['aleatoria', 'Chave aleatória']])),
    createFormField('Chave PIX (opcional)', createInput('wallet-pix-input', 'text', { maxlength: 120, autocomplete: 'off' })),
  );
  appendSettingsSubmit(form, 'Salvar destino criptografado', 'wallet-config-feedback');
  return panel;
}

function createWalletSummaryPanel() {
  return createInfoCard('Destino salvo', 'Somente os dados mascarados são retornados ao painel. Para trocar o destino, preencha o formulário e salve novamente.', [
    { label: 'Banco', id: 'wallet-bank' },
    { label: 'Titular', id: 'wallet-holder' },
    { label: 'Agência', id: 'wallet-agency' },
    { label: 'Conta', id: 'wallet-account' },
    { label: 'Moeda', id: 'wallet-currency' },
    { label: 'PIX', id: 'wallet-pix' },
    { label: 'Proteção', id: 'wallet-encryption' },
  ]);
}

function buildDetailPages() {
  const host = $('#module-pages');
  const pages = [
    {
      id: 'atividade', description: 'Eventos de processos e leituras observadas pelo painel.',
      panels: ['#atividade', '.feed-panel'],
    },
    {
      id: 'radar', description: 'Fontes, descobertas e parâmetros atuais da consulta.',
      panels: ['#radar'],
      custom: [createRadarGlobalPanel()],
      info: () => createInfoCard('Configuração atual', 'O Radar consulta APIs públicas oficiais de vagas remotas e GitHub. Os anúncios são dados não verificados; nenhuma candidatura ou execução externa é iniciada.', [
        { label: 'Fontes', value: 'GitHub · Remote OK · Remotive · Arbeitnow' },
        { label: 'Radar', id: 'radar-enabled-page' },
        { label: 'Modo', id: 'radar-mode-page' },
        { label: 'Limite de itens por consulta', id: 'radar-limit-page' },
        { label: 'Execução externa', value: 'Desativada' },
      ]),
    },
    {
      id: 'processos', description: 'Acompanhe os estados, estimativas e decisões de supervisão dos processos.',
      panels: ['#processos'],
      info: () => createInfoCard('Como os processos avançam', 'A supervisão determinística verifica permissões, evidências e remuneração. Itens sem comprovação permanecem em quarentena; a fila exibida aqui é local e não executa tarefas externas.'),
    },
    {
      id: 'workers', description: 'Capacidade e disponibilidade dos workers registrados de verdade.',
      panels: ['#workers-summary', '#workers'],
      info: () => createInfoCard('Estado dos executores', 'O motor de execução exige worker real, autorização vigente e adaptador oficial. Nenhum provedor externo está conectado por padrão.'),
    },
    {
      id: 'financeiro', description: 'Consulte recebimentos confirmados e valores ainda estimados.',
      panels: ['.balance-panel', '#financeiro'],
      info: () => createInfoCard('Critério financeiro', 'Estimativas não são receita. O saldo inclui somente recebimentos confirmados com aprovação e evidência registrada.'),
    },
    {
      id: 'carteira', description: 'Cadastre o banco de recebimento e consulte o destino salvo com os dados mascarados.',
      panels: [], custom: [createWalletFormPanel(), createWalletSummaryPanel()],
      info: () => createInfoCard('Uso e proteção', 'O destino é armazenado cifrado com AES-256-GCM e só pode ser consultado com sessão autenticada. O cadastro ainda não conecta a um provedor de pagamentos nem envia transferências.'),
    },
    {
      id: 'prontidao', description: 'Veja os bloqueios operacionais e controle a automação com segurança.',
      panels: ['#prontidao'],
      info: () => createInfoCard('Controles de segurança', 'Iniciar automação só fica habilitado quando todos os requisitos reais forem atendidos. Parar encerra a automação ativa pelo endpoint protegido.'),
    },
    {
      id: 'mineradora', description: 'Ajuste o Radar e o intervalo de ciclo usados pelo servidor nesta execução.',
      panels: [], custom: [createMineradoraSettingsPanel()],
      info: () => createInfoCard('Estado do servidor', 'A configuração exibida vem do processo atual. Para manter valores após reiniciar, configure as variáveis de ambiente do servidor.', [
        { label: 'Ambiente', id: 'mineradora-environment-page' },
        { label: 'Persistência', id: 'mineradora-persistence-page' },
        { label: 'Modo de operação', id: 'mineradora-operation-page' },
      ]),
    },
    {
      id: 'interface', description: 'Personalize a atualização e a aparência do painel neste navegador.',
      panels: [], custom: [createInterfaceSettingsPanel()],
      info: () => createInfoCard('Preferências locais', 'As preferências ficam no armazenamento local deste navegador. Elas não são enviadas ao servidor e podem ser redefinidas limpando os dados do site.'),
    },
  ];

  pages.forEach(page => {
    const view = document.createElement('section');
    view.className = 'page-view module-page';
    view.dataset.pageView = page.id;
    view.hidden = true;
    const heading = document.createElement('section');
    heading.className = 'page-heading';
    const copy = document.createElement('div');
    const eyebrow = document.createElement('p');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = 'MÓDULO OASIS';
    const title = document.createElement('h1');
    title.textContent = pageTitles[page.id];
    const description = document.createElement('p');
    description.className = 'subheading';
    description.textContent = page.description;
    copy.append(eyebrow, title, description);
    heading.append(copy);
    view.append(heading);

    const grid = document.createElement('div');
    grid.className = 'detail-grid';
    (page.panels || []).forEach(selector => {
      const panel = cloneModulePanel(selector);
      if (panel) grid.append(panel);
    });
    (page.custom || []).forEach(panel => grid.append(panel));
    if (page.info) grid.append(page.info());
    view.append(grid);
    host.append(view);
  });
}

function showPage(page) {
  const current = Object.hasOwn(pageTitles, page) ? page : 'inicio';
  document.querySelectorAll('[data-page-view]').forEach(view => {
    if (view instanceof HTMLElement) view.hidden = view.dataset.pageView !== current;
  });
  document.querySelectorAll('.nav-link').forEach(link => {
    if (!(link instanceof HTMLAnchorElement)) return;
    link.classList.toggle('active', link.dataset.page === current);
    if (link.dataset.page === current) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.title = `${pageTitles[current]} · OASIS V2`;
  $('#sidebar').classList.remove('open');
}

function navigateToPage(page) {
  if (!Object.hasOwn(pageTitles, page)) return false;
  history.pushState(null, '', `#${page}`);
  showPage(page);
  if (page === 'carteira' && sessionToken) loadWalletSummary();
  return true;
}

buildDetailPages();
showPage(location.hash.slice(1) || 'inicio');

document.body.addEventListener('click', event => {
  if (!(event.target instanceof Element)) return;
  const link = event.target.closest('a[href^="#"]');
  if (!(link instanceof HTMLAnchorElement)) return;
  const page = link.dataset.page || link.getAttribute('href').slice(1);
  if (navigateToPage(page)) event.preventDefault();
});
window.addEventListener('popstate', () => showPage(location.hash.slice(1) || 'inicio'));

function scheduleRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(async () => {
    await refreshHealth();
    if (sessionToken) await refreshDashboard();
    scheduleRefresh();
  }, interfaceSettings.refreshMs);
}

function applyInterfaceSettings() {
  document.documentElement.classList.toggle('compact-ui', interfaceSettings.density === 'compact');
  document.documentElement.classList.toggle('high-contrast-ui', interfaceSettings.contrast === 'high');
  document.documentElement.classList.toggle('reduced-motion-ui', interfaceSettings.reduceMotion);
  const refresh = $('#interface-refresh');
  const density = $('#interface-density');
  const contrast = $('#interface-contrast');
  const reduceMotion = $('#interface-reduce-motion');
  if (refresh) refresh.value = String(interfaceSettings.refreshMs);
  if (density) density.value = interfaceSettings.density;
  if (contrast) contrast.value = interfaceSettings.contrast;
  if (reduceMotion) reduceMotion.checked = interfaceSettings.reduceMotion;
  scheduleRefresh();
}

async function loadWalletSummary() {
  if (!sessionToken) return;
  try {
    const result = await getJson('/api/carteira/destino');
    const destino = result.destino;
    setText('#wallet-bank', result.configurado ? destino.banco : 'Nenhum destino cadastrado');
    setText('#wallet-holder', result.configurado && destino.titularCadastrado ? 'Titular cadastrado' : '—');
    setText('#wallet-agency', result.configurado ? destino.agenciaMascarada : '—');
    setText('#wallet-account', result.configurado ? `${destino.tipoConta} · ${destino.contaMascarada}` : '—');
    setText('#wallet-currency', result.configurado ? destino.moeda : '—');
    setText('#wallet-pix', result.configurado && destino.pixConfigurado ? `${destino.tipoPix} · ${destino.pixMascarado}` : 'Não configurado');
    setText('#wallet-encryption', result.criptografiaAtiva ? 'Criptografia ativa' : 'Indisponível');
    setText('#wallet-config-feedback', result.configurado ? 'Destino salvo e protegido. Você pode substituí-lo preenchendo o formulário.' : 'Criptografia pronta. Cadastre o destino bancário abaixo.');
  } catch (error) {
    setText('#wallet-bank', 'Carteira indisponível');
    setText('#wallet-holder', '—');
    setText('#wallet-agency', '—');
    setText('#wallet-account', '—');
    setText('#wallet-currency', '—');
    setText('#wallet-pix', '—');
    setText('#wallet-encryption', 'Chave de criptografia necessária');
    setText('#wallet-config-feedback', error.message);
  }
}

$('#mineradora-settings-form').addEventListener('input', event => {
  event.currentTarget.dataset.dirty = 'true';
});
$('#mineradora-settings-form').addEventListener('change', event => {
  event.currentTarget.dataset.dirty = 'true';
});
$('#mineradora-settings-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const feedback = $('#mineradora-config-feedback');
  button.disabled = true;
  feedback.textContent = 'Salvando…';
  try {
    const result = await getJson('/api/config/mineradora', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        radarAtivo: $('#mineradora-radar-enabled').checked,
        oportunidadesPorCiclo: Number($('#mineradora-batch-size').value),
        intervaloCicloMs: Number($('#mineradora-cycle-seconds').value) * 1000,
      }),
    });
    form.dataset.dirty = 'false';
    feedback.textContent = result.persistida === false
      ? 'Salvo para esta execução do servidor; após reiniciar, serão usados os valores do ambiente.'
      : 'Configuração salva.';
    showToast('Configurações da mineradora atualizadas.');
    await refreshDashboard(true);
  } catch (error) {
    feedback.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

$('#interface-settings-form').addEventListener('submit', event => {
  event.preventDefault();
  const feedback = $('#interface-config-feedback');
  try {
    interfaceSettings = {
      refreshMs: Number($('#interface-refresh').value),
      density: $('#interface-density').value,
      contrast: $('#interface-contrast').value,
      reduceMotion: $('#interface-reduce-motion').checked,
    };
    localStorage.setItem(INTERFACE_SETTINGS_KEY, JSON.stringify(interfaceSettings));
    applyInterfaceSettings();
    feedback.textContent = 'Preferências salvas neste navegador.';
    showToast('Preferências da interface atualizadas.');
  } catch {
    feedback.textContent = 'O navegador não permitiu salvar as preferências locais.';
  }
});

$('#wallet-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const feedback = $('#wallet-config-feedback');
  button.disabled = true;
  feedback.textContent = 'Criptografando e salvando…';
  try {
    await getJson('/api/carteira/destino', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        banco: $('#wallet-bank-input').value,
        titular: $('#wallet-holder-input').value,
        tipoConta: $('#wallet-type-input').value,
        agencia: $('#wallet-agency-input').value,
        conta: $('#wallet-account-input').value,
        digito: $('#wallet-digit-input').value,
        moeda: $('#wallet-currency-input').value,
        tipoPix: $('#wallet-pix-type-input').value || undefined,
        chavePix: $('#wallet-pix-input').value,
      }),
    });
    form.reset();
    feedback.textContent = 'Destino salvo criptografado. A OASIS não realizou nenhuma transferência.';
    showToast('Destino bancário protegido foi salvo.');
    await loadWalletSummary();
  } catch (error) {
    feedback.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

$('#login-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = $('#login-form button[type="submit"]');
  const error = $('#login-error');
  error.hidden = true;
  button.disabled = true;
  button.textContent = 'Verificando…';
  try {
    const result = await getJson('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: $('#username').value.trim(), senha: $('#password').value }),
    });
    sessionToken = result.token;
    sessionStorage.setItem(SESSION_KEY, sessionToken);
    $('#password').value = '';
    $('#login-overlay').hidden = true;
    await refreshDashboard(true);
    await loadWalletSummary();
    showToast('Painel conectado ao estado real da OASIS.');
  } catch (loginError) {
    error.textContent = loginError.message === 'LOGIN_NAO_CONFIGURADO'
      ? 'O acesso administrativo ainda não foi configurado neste servidor.'
      : loginError.message === 'Credenciais invalidas' || loginError.status === 401
        ? 'Usuário ou senha inválidos.'
        : loginError.message;
    error.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = 'Entrar';
  }
});

$('#logout-button').addEventListener('click', () => clearSession('Sessão encerrada. Entre novamente para ver os dados.'));
elementsForId('run-radar').forEach(button => button.addEventListener('click', async event => {
  if (!(event.currentTarget instanceof HTMLButtonElement)) return;
  const button = event.currentTarget;
  button.disabled = true;
  button.textContent = 'Consultando…';
  try {
    const result = await getJson('/api/radar/executar', { method: 'POST' });
    setText('#radar-message', `Consulta global concluída: ${formatNumber(result.descobertas)} anúncios; ${formatNumber(result.novasVagasRemotas)} vagas remotas novas; ${formatNumber(result.emQuarentena)} tarefas em quarentena.`);
    showToast('Consulta global do Radar concluída. Nenhuma candidatura foi enviada.');
    await refreshDashboard(true);
  } catch (error) {
    setText('#radar-message', error.message === 'Nenhuma fonte conseguiu responder'
      ? 'Nenhuma fonte respondeu. Verifique a conexão e tente novamente.'
      : `Consulta não concluída: ${error.message}`);
    showToast(error.message);
  } finally {
    button.textContent = 'Consultar agora';
    button.disabled = !sessionToken || lastDashboard?.radar?.ativo === false;
  }
}));
elementsForId('start-operation').forEach(button => button.addEventListener('click', async event => {
  if (!(event.currentTarget instanceof HTMLButtonElement)) return;
  const button = event.currentTarget;
  button.disabled = true;
  try {
    await getJson('/api/operacao/iniciar', { method: 'POST' });
    showToast('Automação iniciada.');
  } catch (error) {
    showToast(error.message === 'OPERACAO_REAL_NAO_PRONTA'
      ? 'A automação continua bloqueada pelos requisitos listados em Prontidão real.'
      : error.message);
  } finally {
    await refreshDashboard(true);
  }
}));
elementsForId('stop-operation').forEach(button => button.addEventListener('click', async event => {
  if (!(event.currentTarget instanceof HTMLButtonElement)) return;
  const button = event.currentTarget;
  button.disabled = true;
  try {
    await getJson('/api/operacao/parar', { method: 'POST' });
    showToast('Automação parada.');
  } catch (error) {
    showToast(error.message);
  } finally {
    await refreshDashboard(true);
  }
}));
$('#refresh-button').addEventListener('click', async () => {
  const connected = await refreshHealth();
  if (sessionToken) await refreshDashboard(true);
  else if (connected) showToast('Servidor conectado. Entre para visualizar os dados operacionais.');
});
elementsForId('process-filter').forEach(control => control.addEventListener('change', () => renderProcessTable(lastDashboard?.processos || [])));
elementsForId('process-search').forEach(control => control.addEventListener('input', () => renderProcessTable(lastDashboard?.processos || [])));
$('#menu-button').addEventListener('click', () => $('#sidebar').classList.toggle('open'));

refreshHealth().then(() => {
  if (sessionToken) {
    $('#login-overlay').hidden = true;
    refreshDashboard();
    loadWalletSummary();
  } else {
    showLogin();
  }
});
applyInterfaceSettings();
