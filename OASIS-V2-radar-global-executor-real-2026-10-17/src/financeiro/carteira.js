/** Destino de recebimento local, criptografado com AES-256-GCM. */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { config } from '../core/config.js';

const texto = (limite = 120) => z.string().trim().min(1).max(limite)
  .refine(valor => !temCaractereDeControle(valor), 'Texto inválido');
const identificador = (limite) => z.string().trim().min(1).max(limite)
  .regex(/^[0-9A-Za-z.-]+$/)
  .refine(valor => !temCaractereDeControle(valor), 'Identificador inválido');

function temCaractereDeControle(valor) {
  return Array.from(valor).some(caractere => {
    const codigo = caractere.codePointAt(0) || 0;
    return codigo <= 31 || codigo === 127;
  });
}

const destinoSchema = z.object({
  banco: texto(80),
  titular: texto(120),
  tipoConta: z.enum(['corrente', 'poupanca', 'pagamento']),
  agencia: identificador(20),
  conta: identificador(32),
  digito: z.string().trim().max(2).regex(/^[0-9A-Za-z]*$/),
  moeda: z.enum(['BRL', 'USD', 'EUR']),
  tipoPix: z.enum(['cpf', 'cnpj', 'email', 'telefone', 'aleatoria']).optional(),
  chavePix: z.string().trim().max(120).optional().default(''),
}).strict().superRefine((destino, ctx) => {
  if (Boolean(destino.chavePix) !== Boolean(destino.tipoPix)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['chavePix'], message: 'Informe o tipo e a chave PIX juntos.' });
  }
  if (temCaractereDeControle(destino.chavePix)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['chavePix'], message: 'Chave PIX inválida.' });
  }
});

function obterChave() {
  const encoded = config.carteira.chaveCriptografia;
  if (!encoded) return null;
  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32 || key.toString('base64') !== encoded) {
    throw new Error('CHAVE_CARTEIRA_INVALIDA');
  }
  return key;
}

export function validarDestinoCarteira(input) {
  return destinoSchema.safeParse(input);
}

export function criptografarDestinoCarteira(destino, chave) {
  if (!Buffer.isBuffer(chave) || chave.length !== 32) throw new Error('CHAVE_CARTEIRA_INVALIDA');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', chave, iv);
  const conteudo = Buffer.concat([cipher.update(JSON.stringify(destino), 'utf8'), cipher.final()]);
  return {
    versao: 1,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    conteudo: conteudo.toString('base64'),
  };
}

export function descriptografarDestinoCarteira(envelope, chave) {
  if (!Buffer.isBuffer(chave) || chave.length !== 32 || envelope?.versao !== 1) {
    throw new Error('ARQUIVO_CARTEIRA_INVALIDO');
  }
  const decipher = createDecipheriv('aes-256-gcm', chave, Buffer.from(envelope.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
  const conteudo = Buffer.concat([
    decipher.update(Buffer.from(envelope.conteudo, 'base64')),
    decipher.final(),
  ]).toString('utf8');
  const parsed = JSON.parse(conteudo);
  const validacao = destinoSchema.safeParse(parsed);
  if (!validacao.success) throw new Error('ARQUIVO_CARTEIRA_INVALIDO');
  return validacao.data;
}

function mascarar(valor, visiveis = 4) {
  if (!valor) return 'Não informado';
  const semEspacos = valor.replace(/\s/g, '');
  return `${'•'.repeat(Math.max(4, semEspacos.length - visiveis))}${semEspacos.slice(-visiveis)}`;
}

export function resumirDestinoCarteira(destino) {
  return {
    banco: destino.banco,
    tipoConta: destino.tipoConta,
    moeda: destino.moeda,
    agenciaMascarada: mascarar(destino.agencia, 2),
    contaMascarada: mascarar(`${destino.conta}${destino.digito}`, 4),
    titularCadastrado: true,
    pixConfigurado: Boolean(destino.chavePix),
    tipoPix: destino.tipoPix || null,
    pixMascarado: destino.chavePix ? mascarar(destino.chavePix, 2) : null,
  };
}

function arquivoCarteira() {
  return path.resolve(config.carteira.arquivo);
}

export function obterDestinoCarteira() {
  try {
    const chave = obterChave();
    if (!chave) return { sucesso: false, status: 503, erro: 'Configure OASIS_VAULT_KEY para habilitar a carteira criptografada.' };
    const arquivo = arquivoCarteira();
    if (!fs.existsSync(arquivo)) return { sucesso: true, criptografiaAtiva: true, configurado: false, destino: null };
    const envelope = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
    const destino = descriptografarDestinoCarteira(envelope, chave);
    return { sucesso: true, criptografiaAtiva: true, configurado: true, destino: resumirDestinoCarteira(destino) };
  } catch {
    return { sucesso: false, status: 503, erro: 'Não foi possível abrir a carteira. Verifique a chave e o arquivo criptografado.' };
  }
}

export function salvarDestinoCarteira(input) {
  const validacao = validarDestinoCarteira(input);
  if (!validacao.success) {
    return { sucesso: false, status: 400, erro: 'Confira os campos bancários e tente novamente.', detalhes: validacao.error.issues.map(issue => ({ campo: issue.path.join('.'), mensagem: issue.message })) };
  }
  let temporario = null;
  try {
    const chave = obterChave();
    if (!chave) return { sucesso: false, status: 503, erro: 'Configure OASIS_VAULT_KEY para habilitar a carteira criptografada.' };
    const arquivo = arquivoCarteira();
    temporario = `${arquivo}.${process.pid}.${randomBytes(8).toString('hex')}.tmp`;
    fs.mkdirSync(path.dirname(arquivo), { recursive: true, mode: 0o700 });
    fs.writeFileSync(temporario, JSON.stringify(criptografarDestinoCarteira(validacao.data, chave)), {
      encoding: 'utf8', flag: 'wx', mode: 0o600,
    });
    fs.renameSync(temporario, arquivo);
    return { sucesso: true, criptografiaAtiva: true, configurado: true, destino: resumirDestinoCarteira(validacao.data) };
  } catch {
    if (temporario && fs.existsSync(temporario)) {
      try { fs.unlinkSync(temporario); } catch { /* limpeza best-effort */ }
    }
    return { sucesso: false, status: 503, erro: 'Não foi possível salvar a carteira criptografada.' };
  }
}

export default { obterDestinoCarteira, salvarDestinoCarteira };
