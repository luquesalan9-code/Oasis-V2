import { describe, expect, it } from 'vitest';
import {
  criptografarDestinoCarteira,
  descriptografarDestinoCarteira,
  resumirDestinoCarteira,
  validarDestinoCarteira,
} from '../../src/financeiro/carteira.js';

const chave = Buffer.alloc(32, 23);
const destino = {
  banco: 'Banco Exemplo',
  titular: 'Pessoa Exemplo',
  tipoConta: 'corrente',
  agencia: '1234',
  conta: '567890',
  digito: '1',
  moeda: 'BRL',
  tipoPix: 'email',
  chavePix: 'recebimento@example.com',
};

describe('carteira de recebimento', () => {
  it('cifra os dados e recupera o destino com a mesma chave', () => {
    const envelope = criptografarDestinoCarteira(destino, chave);
    expect(JSON.stringify(envelope)).not.toContain(destino.conta);
    expect(descriptografarDestinoCarteira(envelope, chave)).toEqual(destino);
  });

  it('rejeita alterações no conteúdo cifrado', () => {
    const envelope = criptografarDestinoCarteira(destino, chave);
    envelope.conteudo = Buffer.from('conteudo alterado').toString('base64');
    expect(() => descriptografarDestinoCarteira(envelope, chave)).toThrow();
  });

  it('valida os dados bancários e mascara os campos no resumo', () => {
    expect(validarDestinoCarteira(destino).success).toBe(true);
    expect(validarDestinoCarteira({ ...destino, banco: '' }).success).toBe(false);
    const resumo = resumirDestinoCarteira(destino);
    expect(resumo.contaMascarada).not.toContain(destino.conta);
    expect(resumo.pixMascarado).not.toContain(destino.chavePix);
    expect(resumo.banco).toBe(destino.banco);
  });
});
