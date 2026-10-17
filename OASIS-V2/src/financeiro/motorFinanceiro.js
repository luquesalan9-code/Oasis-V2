/**
 * OASIS V2 - Motor Financeiro
 * Cálculos centralizados de ROI, margem e lucro
 */
export function calcularFinanceiro(valorBruto = 0, custo = 0) {
  const vb = Number(valorBruto) || 0;
  const cs = Number(custo) || 0;
  const lucro = vb - cs;
  return {
    valorBruto: vb,
    custo: cs,
    lucro,
    roi: calcularROI(lucro, cs),
    margem: vb > 0 ? (lucro / vb) * 100 : 0,
  };
}

export function calcularROI(lucro = 0, custo = 0) {
  const cs = Number(custo) || 0;
  if (cs <= 0) return 0;
  return (Number(lucro) || 0) / cs * 100;
}

export function calcularMargem(valorBruto = 0, lucro = 0) {
  const vb = Number(valorBruto) || 0;
  if (vb <= 0) return 0;
  return (Number(lucro) || 0) / vb * 100;
}

export default { calcularFinanceiro, calcularROI, calcularMargem };