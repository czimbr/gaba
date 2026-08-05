/**
 * Remoção de vig (overround) de odds de casas de apostas.
 *
 * Uma casa cota odds cuja soma das probabilidades implícitas passa de 1. Esse
 * excesso é a margem. Para obter a probabilidade "justa" estimada é preciso
 * retirá-la — e o método escolhido muda o resultado de forma relevante,
 * principalmente em azarões.
 *
 * Referência: Shin (1993); Štrumbelj (2014) comparou os métodos e encontrou
 * Shin consistentemente melhor calibrado que a normalização proporcional.
 */

const EPS = 1e-12;

/** Probabilidade implícita bruta (ainda com vig embutido). */
export const impliedFromDecimal = (odds) => 1 / odds;

/** Soma das implícitas. > 1 num book normal; a diferença é a margem. */
export const booksum = (oddsList) => oddsList.reduce((s, o) => s + 1 / o, 0);

/** Margem do book, em pontos de probabilidade. */
export const overround = (oddsList) => booksum(oddsList) - 1;

/**
 * Proporcional (também chamado de multiplicativo). Divide cada implícita pela
 * soma. É o método mais usado e o mais enviesado: distribui a margem
 * proporcionalmente, quando na prática a casa concentra margem no azarão.
 * Resultado: superestima favorito e subestima azarão.
 */
export function multiplicative(oddsList) {
  const S = booksum(oddsList);
  return oddsList.map((o) => 1 / o / S);
}

/**
 * Aditivo. Subtrai margem igual de cada implícita. Trata melhor o azarão que o
 * proporcional, mas pode produzir probabilidade negativa em books muito
 * desequilibrados — nesse caso caímos no proporcional.
 */
export function additive(oddsList) {
  const n = oddsList.length;
  const S = booksum(oddsList);
  const share = (S - 1) / n;
  const p = oddsList.map((o) => 1 / o - share);
  return p.some((x) => x <= EPS) ? multiplicative(oddsList) : p;
}

/**
 * Potência (odds ratio). Acha k tal que Σ qᵢ^k = 1.
 * Como cada qᵢ < 1, elevar a k > 1 reduz a soma — então buscamos k acima de 1.
 */
export function power(oddsList) {
  const q = oddsList.map((o) => 1 / o);
  if (q.some((x) => x >= 1)) return multiplicative(oddsList);

  const soma = (k) => q.reduce((s, x) => s + x ** k, 0);
  let lo = 1, hi = 1;
  for (let i = 0; i < 60 && soma(hi) > 1; i++) hi *= 1.5;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (soma(mid) > 1) lo = mid; else hi = mid;
    if (hi - lo < EPS) break;
  }
  const k = (lo + hi) / 2;
  return q.map((x) => x ** k);
}

/**
 * Shin. Modela a margem como defesa da casa contra apostadores informados:
 * uma fração z do volume seria dinheiro insider. Inverte-se para a
 * probabilidade verdadeira e resolve-se z por bisseção até Σpᵢ = 1.
 *
 *   pᵢ(z) = ( √(z² + 4(1−z)·qᵢ²/S) − z ) / ( 2(1−z) )
 *
 * Em z → 0 a soma tende a √S (acima de 1 quando há margem) e cresce z para
 * baixo — daí a bisseção ser bem-comportada.
 */
export function shin(oddsList) {
  const q = oddsList.map((o) => 1 / o);
  const S = q.reduce((s, x) => s + x, 0);
  if (S <= 1 + EPS) return multiplicative(oddsList);

  const probs = (z) => {
    if (z < EPS) return q.map((x) => x / Math.sqrt(S));
    const d = 2 * (1 - z);
    return q.map((x) => (Math.sqrt(z * z + 4 * (1 - z) * ((x * x) / S)) - z) / d);
  };
  const soma = (z) => probs(z).reduce((s, x) => s + x, 0);

  let lo = 0, hi = 1 - 1e-9;
  if (soma(lo) < 1) return multiplicative(oddsList);
  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2;
    if (soma(mid) > 1) lo = mid; else hi = mid;
    if (hi - lo < EPS) break;
  }
  const z = (lo + hi) / 2;
  const p = probs(z);
  const tot = p.reduce((s, x) => s + x, 0);
  return p.map((x) => x / tot); // normaliza o resíduo numérico
}

export const METODOS = { multiplicative, additive, power, shin };

/**
 * Converte odds decimais num vetor de probabilidades justas.
 * `outcomes` é [{ name, price }]; devolve [{ name, price, fair }].
 */
export function devig(outcomes, metodo = 'shin') {
  const fn = METODOS[metodo];
  if (!fn) throw new Error(`método de devig desconhecido: ${metodo}`);
  if (!outcomes?.length) return [];
  if (outcomes.some((o) => !(o.price > 1))) {
    throw new Error('odds decimais precisam ser > 1');
  }
  const fair = fn(outcomes.map((o) => o.price));
  return outcomes.map((o, i) => ({ ...o, fair: fair[i] }));
}

/**
 * Consenso entre várias casas. Cada casa é devigada isoladamente (devigar a
 * média de odds enviesadas não é a mesma coisa que a média das devigadas) e
 * depois combinamos por mediana, que resiste a uma casa com cotação furada.
 *
 * `sharpBooks` recebe peso extra: a linha da Pinnacle é a referência de
 * eficiência do mercado, e devigar casa recreativa produz valor justo ruim.
 */
export function consensoJusto(bookmakers, { metodo = 'shin', sharpBooks = [], marketKey = 'h2h' } = {}) {
  const porResultado = new Map();
  const usados = [];

  for (const bk of bookmakers ?? []) {
    const market = bk.markets?.find((m) => m.key === marketKey);
    if (!market?.outcomes?.length) continue;

    let devigado;
    try {
      devigado = devig(market.outcomes, metodo);
    } catch { continue; }

    const peso = sharpBooks.includes(bk.key) ? 3 : 1;
    usados.push({ key: bk.key, peso, lastUpdate: market.last_update ?? bk.last_update });

    for (const o of devigado) {
      if (!porResultado.has(o.name)) porResultado.set(o.name, []);
      for (let i = 0; i < peso; i++) porResultado.get(o.name).push(o.fair);
    }
  }

  const outcomes = [...porResultado.entries()].map(([name, xs]) => ({
    name,
    fair: mediana(xs),
    amostras: xs.length,
    dispersao: xs.length > 1 ? Math.max(...xs) - Math.min(...xs) : 0
  }));

  // a mediana não soma exatamente 1; renormaliza
  const tot = outcomes.reduce((s, o) => s + o.fair, 0);
  if (tot > 0) for (const o of outcomes) o.fair /= tot;

  return {
    outcomes,
    books: usados,
    nBooks: new Set(usados.map((u) => u.key)).size,
    temSharp: usados.some((u) => sharpBooks.includes(u.key))
  };
}

export function mediana(xs) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
