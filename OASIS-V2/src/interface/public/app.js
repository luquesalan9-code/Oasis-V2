const SESSION_KEY = 'oasis-v2-session';
const REFRESH_MS = 5000;
const historyPoints = [];
const $ = selector => document.querySelector(selector);
let sessionToken = sessionStorage.getItem(SESSION_KEY);
let lastDashboard = null;
let refreshRunning = false;
let toastTimer = null;

const blockerLabels = {
  AMBIENTE_NAO_PRODUCAO: 'O servidor ainda não está em ambiente de produção.',
  PERSISTENCIA_DESATIVADA: 'A persistência está desativada.',
  MODO_REAL_NAO_CONFIGURADO: 'O sistema não está configurado em modo REAL.',
  SENHA_ADMIN_BCRYPT_AUSENTE: 'Falta configurar a senha administrativa com hash bcrypt.',
  SEGREDO_JWT_INVALIDO: 'O segredo JWT não atende ao tamanho exigido.',
  EXECUTOR_REAL_NAO_IMPLEMENTADO: 'Ainda não existe um executor real de tarefas.',
  SUPERVISAO_POR_AGENTES_NAO_IMPLEMENTADA: 'A supervisão por agentes ainda não foi implementada.',
  INTEGRACAO_OFICIAL_DE_EXECUCAO_NAO_CONFIGURADA: 'Falta configurar uma integração oficial de execução.',
};

function setText(selector, value) {
  const target = $(selector);
  if (target) target.textContent = value === null || value === undefined || value === '' ? '—' : String(value);
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
    setText('#operation-label', `${health.status || 'Servidor disponível'} · modo REAL`);
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
    INATIVO: 'Inativo', BLOQUEADO: 'Bloqueado', ERRO: 'Erro', ATIVA: 'Ativa', PARADA: 'Parada',
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
  const filter = $('#process-filter').value;
  const search = $('#process-search').value.trim().toLocaleLowerCase('pt-BR');
  const visible = processes.filter(process => {
    const statusMatch = filter === 'todos'
      || (filter === 'ativos' && ['CRIADO', 'NA_FILA', 'DISTRIBUIDO', 'EXECUTANDO', 'VALIDANDO', 'PAUSADO'].includes(process.status))
      || process.status === filter;
    const text = `${process.id} ${process.externalId || ''} ${process.fonte || ''} ${process.titulo || ''}`.toLocaleLowerCase('pt-BR');
    return statusMatch && (!search || text.includes(search));
  });
  const tbody = $('#process-table');
  tbody.replaceChildren();
  setText('#process-count', `${formatNumber(visible.length)} de ${formatNumber(processes.length)} processos`);
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
    row.append(identity, makeCell(process.fonte));
    const status = document.createElement('td');
    const chip = document.createElement('span');
    chip.className = `status-chip ${statusClass(process.status)}`.trim();
    chip.textContent = translatedStatus(process.status);
    status.append(chip);
    row.append(status, makeCell(formatMoney(process.valorEstimado, process.moeda)), makeCell(formatDate(process.atualizadoEm || process.criadoEm, { withDate: true })));
    tbody.append(row);
  });
}

function renderWorkers(workers = []) {
  const available = workers.filter(worker => worker.status === 'DISPONIVEL').length;
  const busy = workers.filter(worker => worker.status === 'OCUPADO' || worker.processosAtivos > 0).length;
  setText('#worker-total', formatNumber(workers.length));
  setText('#worker-available', formatNumber(available));
  setText('#worker-busy', formatNumber(busy));
  setText('#workers-caption', `${formatNumber(workers.length)} workers registrados no estado real do sistema`);
  const tbody = $('#worker-table');
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
}

function renderCurrencies(target, amounts, emptyMessage) {
  target.replaceChildren();
  const currencies = Object.entries(amounts || {}).filter(([, value]) => Number(value) !== 0);
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
  const feed = $('#event-list');
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
}

function renderChart(dashboard) {
  const counts = dashboard.sistema.contadores || {};
  historyPoints.push({
    total: dashboard.processos.length,
    complete: Number(counts.processosConcluidos) || 0,
    busy: dashboard.workers.filter(worker => worker.status === 'OCUPADO' || worker.processosAtivos > 0).length,
  });
  if (historyPoints.length > 24) historyPoints.shift();

  const svg = $('#activity-chart');
  const namespace = 'http://www.w3.org/2000/svg';
  svg.replaceChildren();
  [25, 65, 105, 145].forEach(y => {
    const line = document.createElementNS(namespace, 'line');
    line.setAttribute('x1', '0'); line.setAttribute('x2', '620');
    line.setAttribute('y1', String(y)); line.setAttribute('y2', String(y));
    line.setAttribute('class', 'chart-gridline'); svg.append(line);
  });
  const keys = [['total', 'chart-line-process'], ['complete', 'chart-line-complete'], ['busy', 'chart-line-worker']];
  const max = Math.max(1, ...historyPoints.flatMap(point => [point.total, point.complete, point.busy]));
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
}

function renderReadiness(prontidao) {
  const ready = prontidao.pronta === true;
  setText('#readiness-state', ready ? 'Pronta para operar' : 'Automação bloqueada');
  $('#readiness-state').classList.toggle('ready', ready);
  setText('#readiness-copy', ready
    ? 'Os requisitos operacionais foram verificados.'
    : 'Nenhuma tarefa será iniciada até os requisitos reais estarem completos.');
  const list = $('#blocker-list');
  list.replaceChildren();
  if (ready) {
    const item = document.createElement('li'); item.textContent = 'Todos os requisitos de prontidão estão atendidos.'; list.append(item); return;
  }
  (prontidao.bloqueios || []).forEach(blocker => {
    const item = document.createElement('li');
    item.textContent = blockerLabels[blocker] || blocker;
    list.append(item);
  });
  if (!list.children.length) {
    const item = document.createElement('li'); item.textContent = 'A prontidão real não pôde ser confirmada.'; list.append(item);
  }
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
  renderCurrencies($('#confirmed-breakdown'), totals, 'Nenhum recebimento com evidência confirmada.');
  renderCurrencies($('#finance-breakdown'), dashboard.financeiro.recebimentosConfirmados, 'Nenhum recebimento confirmado.');
  const estimate = dashboard.financeiro.estimativasElegiveis?.resultadoLiquido;
  setText('#estimate-total', estimate === null || estimate === undefined ? '—' : formatMoney(estimate, 'USD'));
  renderWorkers(dashboard.workers || []);
  renderProcessTable(dashboard.processos || []);
  renderEvents(dashboard.processos || []);
  renderReadiness(dashboard.sistema.prontidao || { pronta: false, bloqueios: [] });
  setText('#radar-sources', formatNumber(dashboard.radar.fontes));
  setText('#radar-opportunities', formatNumber(dashboard.radar.oportunidades));
  setText('#radar-cycles', formatNumber(dashboard.radar.lotesProcessados));
  renderChart(dashboard);
  const updated = formatDate(dashboard.atualizadoEm);
  setText('#updated-at', `Atualizado às ${updated}`);
  setText('#footer-status', `última leitura ${updated}`);
  setText('#operation-label', dashboard.sistema.operacaoAtiva ? 'REAL · operação ativa' : 'REAL · automação não iniciada');
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
$('#refresh-button').addEventListener('click', async () => {
  const connected = await refreshHealth();
  if (sessionToken) await refreshDashboard(true);
  else if (connected) showToast('Servidor conectado. Entre para visualizar os dados operacionais.');
});
$('#process-filter').addEventListener('change', () => renderProcessTable(lastDashboard?.processos || []));
$('#process-search').addEventListener('input', () => renderProcessTable(lastDashboard?.processos || []));
$('#menu-button').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', () => {
  document.querySelectorAll('.nav-link').forEach(item => item.classList.remove('active'));
  link.classList.add('active');
  $('#sidebar').classList.remove('open');
}));

refreshHealth().then(() => {
  if (sessionToken) {
    $('#login-overlay').hidden = true;
    refreshDashboard();
  } else {
    showLogin();
  }
});
setInterval(() => {
  refreshHealth();
  refreshDashboard();
}, REFRESH_MS);
