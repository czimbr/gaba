/* ============================================================
   Lucro na Direção — calculadora de lucro para motoristas de app
   Vanilla JS, sem dependências. Tudo fica no localStorage.
   ============================================================ */
(() => {
  'use strict';

  const KEY = 'lucroNaDirecao.v1';
  const SEMANAS_MES = 4.345;

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ─────────────── formatação e parsing pt-BR ─────────────── */

  const _brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const money = n => _brl.format(Number.isFinite(n) ? n : 0);
  const dec = (n, d = 1) => new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: d, maximumFractionDigits: d
  }).format(Number.isFinite(n) ? n : 0);
  const pct = n => `${dec(Number.isFinite(n) ? n : 0, 1)}%`;

  /** Aceita "1.234,56", "45,50", "11.5" e "1.234" (milhar). */
  function parseNum(v) {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    if (v == null) return 0;
    let s = String(v).trim().replace(/[^\d.,-]/g, '');
    if (!s || s === '-') return 0;
    const c = s.lastIndexOf(','), d = s.lastIndexOf('.');
    if (c > -1 && d > -1) {
      s = c > d ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    } else if (c > -1) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (d > -1) {
      // ponto sozinho: 3 dígitos depois = separador de milhar ("1.234")
      const after = s.length - d - 1;
      if (after === 3 && d > 0) s = s.replace(/\./g, '');
    }
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  }

  /** Número para dentro do input: sem símbolo, vírgula decimal, sem zeros à toa. */
  function toInput(n) {
    if (!Number.isFinite(n) || n === 0) return '';
    const casas = Number.isInteger(n) ? 0 : (Math.abs(n) < 1 ? 3 : 2);
    return dec(n, casas);
  }

  /* ─────────────── modelo ─────────────── */

  const FUEL = {
    gasolina: { preco: 'por litro', consumo: 'km/L',   un: 'L'   },
    etanol:   { preco: 'por litro', consumo: 'km/L',   un: 'L'   },
    diesel:   { preco: 'por litro', consumo: 'km/L',   un: 'L'   },
    gnv:      { preco: 'por m³',    consumo: 'km/m³',  un: 'm³'  },
    eletrico: { preco: 'por kWh',   consumo: 'km/kWh', un: 'kWh' }
  };

  const PLATAFORMAS = ['Uber', '99', 'InDrive', 'Uber Entregas', 'iFood',
                       'Rappi', 'Lalamove', 'Particular', 'Outro'];

  const CFG_PADRAO = {
    combustivel: 'gasolina', precoCombustivel: 6.29, consumo: 11,
    pneuPreco: 1400, pneuDuracao: 45000, revisaoPreco: 450, revisaoIntervalo: 10000,
    aluguel: 0, aluguelPeriodo: 'semana', financiamento: 0, seguro: 180,
    ipva: 1400, manutencaoMensal: 150, lavagem: 120, celular: 60, outrosFixos: 0,
    usarDepreciacao: true, valorVeiculo: 75000, depreciacaoAnual: 8,
    diasPorMes: 26, horasPorDia: 10, metaHora: 25
  };

  const JOR_PADRAO = {
    periodo: 'dia',
    ganhos: [{ p: 'Uber', v: 0 }, { p: '99', v: 0 }],
    gorjetas: 0, horas: 0, km: 0,
    pedagio: 0, estacionamento: 0, alimentacao: 0,
    lavagemAvulsa: 0, multas: 0, outrosGastos: 0
  };

  const COR_PADRAO = { valor: 0, minutos: 0, kmDeslocamento: 0, kmCorrida: 0 };

  const EXTRAS = ['pedagio', 'estacionamento', 'alimentacao', 'lavagemAvulsa', 'multas', 'outrosGastos'];

  let state = carregar();

  function carregar() {
    const base = {
      cfg: { ...CFG_PADRAO }, jornada: structuredClone(JOR_PADRAO),
      corrida: { ...COR_PADRAO }, historico: [], tema: null
    };
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return base;
      const s = JSON.parse(raw);
      return {
        cfg: { ...CFG_PADRAO, ...(s.cfg || {}) },
        jornada: { ...structuredClone(JOR_PADRAO), ...(s.jornada || {}) },
        corrida: { ...COR_PADRAO, ...(s.corrida || {}) },
        historico: Array.isArray(s.historico) ? s.historico : [],
        tema: s.tema ?? null
      };
    } catch { return base; }
  }

  let saveTimer;
  function salvar() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* sem espaço/privado */ }
    }, 250);
  }

  /* ─────────────── cálculos ─────────────── */

  function derivados() {
    const c = state.cfg;
    const combPorKm = c.consumo > 0 ? c.precoCombustivel / c.consumo : 0;
    const pneuPorKm = c.pneuDuracao > 0 ? c.pneuPreco / c.pneuDuracao : 0;
    const revPorKm  = c.revisaoIntervalo > 0 ? c.revisaoPreco / c.revisaoIntervalo : 0;
    const desgastePorKm = pneuPorKm + revPorKm;
    const aluguelMes = c.aluguelPeriodo === 'semana' ? c.aluguel * SEMANAS_MES : c.aluguel;
    const fixosMes = aluguelMes + c.financiamento + c.seguro + c.ipva / 12 +
                     c.manutencaoMensal + c.lavagem + c.celular + c.outrosFixos;
    const depMes = c.usarDepreciacao ? c.valorVeiculo * (c.depreciacaoAnual / 100) / 12 : 0;
    const horasMes = c.diasPorMes * c.horasPorDia;
    return {
      combPorKm, pneuPorKm, revPorKm, desgastePorKm,
      variavelPorKm: combPorKm + desgastePorKm,
      aluguelMes, fixosMes, depMes,
      fixoPorHora: horasMes > 0 ? (fixosMes + depMes) / horasMes : 0
    };
  }

  const fatorPeriodo = () => {
    if (state.jornada.periodo === 'mes') return 1;
    if (state.jornada.periodo === 'semana') return 1 / SEMANAS_MES;
    return state.cfg.diasPorMes > 0 ? 1 / state.cfg.diasPorMes : 0;
  };

  const LABEL_PERIODO = { dia: 'dia', semana: 'semana', mes: 'mês' };

  function calcJornada() {
    const c = state.cfg, j = state.jornada, d = derivados(), f = fatorPeriodo();
    const km = j.km, horas = j.horas;

    const receitaApps = j.ganhos.reduce((s, g) => s + g.v, 0);
    const receita = receitaApps + j.gorjetas;

    const cComb   = km * d.combPorKm;
    const litros  = c.consumo > 0 ? km / c.consumo : 0;
    const cPneu   = km * d.pneuPorKm;
    const cRev    = km * d.revPorKm;
    const cDesg   = cPneu + cRev;
    const cFixo   = d.fixosMes * f;
    const cDep    = d.depMes * f;
    const cExtras = EXTRAS.reduce((s, k) => s + j[k], 0);

    const custo = cComb + cDesg + cFixo + cDep + cExtras;
    const lucro = receita - custo;

    const receitaPorKm = km > 0 ? receita / km : 0;
    const margemVariavel = receitaPorKm - d.variavelPorKm;

    return {
      receita, receitaApps, cComb, litros, cPneu, cRev, cDesg, cFixo, cDep, cExtras,
      custo, lucro, km, horas, d,
      lucroPorHora: horas > 0 ? lucro / horas : 0,
      lucroPorKm:   km > 0 ? lucro / km : 0,
      custoPorKm:   km > 0 ? custo / km : 0,
      receitaPorKm,
      receitaPorHora: horas > 0 ? receita / horas : 0,
      margem: receita > 0 ? lucro / receita * 100 : 0,
      kmEquilibrio: margemVariavel > 0 ? (cFixo + cDep + cExtras) / margemVariavel : 0,
      completo: receita > 0 && km > 0 && horas > 0
    };
  }

  function calcCorrida() {
    const c = state.cfg, o = state.corrida, d = derivados();
    const kmTotal = o.kmDeslocamento + o.kmCorrida;
    const horas = o.minutos / 60;
    const custoComb = kmTotal * d.combPorKm;
    const custoDesg = kmTotal * d.desgastePorKm;
    const custo = custoComb + custoDesg;
    const lucro = o.valor - custo;
    // O que sobra na corrida precisa cobrir o rateio dos fixos E a meta de lucro.
    const alvo = d.fixoPorHora + c.metaHora;
    return {
      kmTotal, horas, custoComb, custoDesg, custo, lucro, d, alvo,
      porHora: horas > 0 ? lucro / horas : 0,
      rsPorKm: kmTotal > 0 ? o.valor / kmTotal : 0,
      valorJusto: custo + alvo * horas,
      meta: c.metaHora,
      completo: o.valor > 0 && kmTotal > 0 && o.minutos > 0
    };
  }

  /* ─────────────── séries do gráfico ─────────────── */
  /* Ordem FIXA, nunca ciclada. Vizinhos validados para CVD nos dois modos. */
  const SERIES = [
    { k: 'lucro', nome: 'Lucro líquido',       cor: '--s1' },
    { k: 'comb',  nome: 'Combustível',          cor: '--s2' },
    { k: 'desg',  nome: 'Pneus e revisão',      cor: '--s3' },
    { k: 'fixo',  nome: 'Fixos e depreciação',  cor: '--s4' },
    { k: 'extra', nome: 'Gastos do dia',        cor: '--s5' }
  ];

  let corCache = {};
  function lerCores() {
    const cs = getComputedStyle(document.documentElement);
    corCache = {};
    for (const s of SERIES) corCache[s.cor] = cs.getPropertyValue(s.cor).trim();
  }
  const corDe = v => corCache[v] || '#888';

  /** Branco ou tinta, escolhido pela luminância do preenchimento. */
  function inkSobre(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
    if (!m) return '#fff';
    const lin = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
    const L = .2126 * lin(parseInt(m[1], 16)) + .7152 * lin(parseInt(m[2], 16)) + .0722 * lin(parseInt(m[3], 16));
    return (1.05 / (L + .05)) >= 4.5 ? '#ffffff' : '#0b0b0b';
  }

  /* ─────────────── tooltip ─────────────── */

  const tip = $('#tip');
  function mostrarTip(html, ev) {
    tip.innerHTML = html; tip.hidden = false;
    const r = tip.getBoundingClientRect();
    const x = Math.min(Math.max(8, ev.clientX - r.width / 2), innerWidth - r.width - 8);
    tip.style.left = `${x}px`;
    tip.style.top = `${Math.max(8, ev.clientY - r.height - 12)}px`;
  }
  const esconderTip = () => { tip.hidden = true; };

  /* ─────────────── render: jornada ─────────────── */

  function renderGanhos() {
    const box = $('#ganhosList');
    box.innerHTML = '';
    state.jornada.ganhos.forEach((g, i) => {
      const row = document.createElement('div');
      row.className = 'ganho';
      row.innerHTML = `
        <label class="field">
          <span class="field__label">Plataforma</span>
          <span class="field__wrap"><select data-g-plat="${i}">${
            PLATAFORMAS.map(p => `<option${p === g.p ? ' selected' : ''}>${p}</option>`).join('')
          }</select></span>
        </label>
        <label class="field">
          <span class="field__label">Quanto recebeu</span>
          <span class="field__wrap"><i class="field__pre">R$</i>
            <input type="text" inputmode="decimal" data-g-val="${i}" value="${toInput(g.v)}" placeholder="0,00"></span>
        </label>
        <button type="button" class="ganho__del" data-g-del="${i}"
                aria-label="Remover ${g.p}" title="Remover">×</button>`;
      box.appendChild(row);
    });
  }

  function tile(label, valor, dir, nota) {
    return `<div class="tile">
      <span class="tile__label">${label}</span>
      <span class="tile__value"${dir ? ` data-dir="${dir}"` : ''}>${valor}</span>
      ${nota ? `<span class="tile__note">${nota}</span>` : ''}
    </div>`;
  }

  function renderJornada() {
    const r = calcJornada(), c = state.cfg;
    const per = LABEL_PERIODO[state.jornada.periodo];

    // hero
    const hv = $('#heroValue');
    $('#heroLabel').textContent = r.lucro < 0 ? 'Prejuízo' : 'Lucro líquido';
    hv.textContent = money(Math.abs(r.lucro) < 0.005 ? 0 : r.lucro);
    hv.dataset.dir = !r.completo ? '' : (r.lucro > 0 ? 'up' : r.lucro < 0 ? 'down' : '');
    $('#heroSub').textContent = !r.completo
      ? 'Informe os ganhos, as horas e os km para ver o resultado.'
      : `Por ${per} · ${money(r.receita)} de receita − ${money(r.custo)} de custos`;

    // tiles
    const metaOk = r.lucroPorHora >= c.metaHora;
    $('#tiles').innerHTML = [
      tile('Lucro por hora', money(r.lucroPorHora),
        r.lucroPorHora > 0 ? 'up' : r.lucroPorHora < 0 ? 'down' : '',
        c.metaHora > 0 ? `Meta ${money(c.metaHora)}/h · ${metaOk ? 'batida' : 'abaixo'}` : ''),
      tile('Lucro por km', money(r.lucroPorKm), r.lucroPorKm > 0 ? 'up' : r.lucroPorKm < 0 ? 'down' : ''),
      tile('Margem de lucro', pct(r.margem), r.margem > 0 ? 'up' : r.margem < 0 ? 'down' : ''),
      tile('Custo por km', money(r.custoPorKm), '', `Recebendo ${money(r.receitaPorKm)}/km`),
      tile('Faturamento por hora', money(r.receitaPorHora)),
      tile('Faturamento mínimo', money(r.custo), '', `Abaixo disso o ${per} dá prejuízo`),
      tile('Combustível', money(r.cComb), '', `${dec(r.litros, 1)} ${FUEL[c.combustivel].un} · ${money(r.d.combPorKm)}/km`),
      tile('Km para empatar', r.kmEquilibrio > 0 ? `${dec(r.kmEquilibrio, 0)} km` : '—', '',
        r.kmEquilibrio > 0 ? `No seu R$/km atual` : 'Receita por km não cobre o custo variável')
    ].join('');

    renderChart(r);
    renderDetalhe(r);
    const totExtras = r.cExtras;
    $('#extrasTag').textContent = totExtras > 0 ? money(totExtras) : '';
  }

  function renderChart(r) {
    const bar = $('#chartBar'), marker = $('#chartMarker');
    const lucroPos = r.lucro > 0;
    const base = Math.max(r.receita, r.custo);

    const valores = {
      lucro: lucroPos ? r.lucro : 0,
      comb: r.cComb, desg: r.cDesg, fixo: r.cFixo + r.cDep, extra: r.cExtras
    };
    const mostrar = SERIES.filter(s => valores[s.k] > base * 0.001 && valores[s.k] > 0.005);

    $('#chartSub').textContent = r.lucro < 0
      ? 'Seus custos passaram do que entrou. A marca mostra onde a receita parou.'
      : `Divisão de cada real que entrou por ${LABEL_PERIODO[state.jornada.periodo]}.`;

    if (!base || !mostrar.length) {
      bar.className = 'chart__empty';
      bar.textContent = 'Sem dados suficientes para o gráfico.';
      bar.removeAttribute('aria-label');
      marker.hidden = true;
      $('#chartLegend').innerHTML = '';
      return;
    }

    bar.className = 'chart__bar';
    bar.innerHTML = '';
    bar.setAttribute('aria-label',
      `Divisão de ${money(base)}: ` +
      mostrar.map(s => `${s.nome} ${money(valores[s.k])}, ${pct(valores[s.k] / base * 100)}`).join('; '));

    let acumulado = 0;
    for (const s of mostrar) {
      const v = valores[s.k], p = v / base * 100;
      const hex = corDe(s.cor);
      const seg = document.createElement('div');
      seg.className = 'chart__seg';
      seg.style.cssText = `flex: 0 0 ${p}%; background: ${hex};`;
      seg.dataset.inicio = String(acumulado);
      seg.dataset.fim = String(acumulado + p);
      acumulado += p;
      const lab = document.createElement('span');
      lab.style.color = inkSobre(hex);
      lab.textContent = pct(p);
      seg.appendChild(lab);
      seg.addEventListener('mouseenter', e => mostrarTip(
        `${s.nome}<br><b>${money(v)}</b> · ${pct(p)}`, e));
      seg.addEventListener('mousemove', e => mostrarTip(
        `${s.nome}<br><b>${money(v)}</b> · ${pct(p)}`, e));
      seg.addEventListener('mouseleave', esconderTip);
      bar.appendChild(seg);
    }

    // marca da receita quando há prejuízo
    let marca = null;
    if (r.lucro < 0 && r.receita > 0) {
      marca = Math.min(96, Math.max(4, r.receita / base * 100));
      marker.hidden = false;
      marker.querySelector('span').style.left = `${marca}%`;
      const b = marker.querySelector('b');
      b.style.left = `${marca}%`;
      b.textContent = `Receita ${money(r.receita)}`;
    } else {
      marker.hidden = true;
    }

    // rótulo direto só quando cabe com folga e a marca não o atravessa — nunca cortado
    requestAnimationFrame(() => {
      $$('.chart__seg', bar).forEach(seg => {
        const lab = seg.firstElementChild;
        if (!lab) return;
        lab.style.display = '';
        const cortado = marca !== null &&
          marca > +seg.dataset.inicio && marca < +seg.dataset.fim;
        if (cortado || lab.scrollWidth + 10 > seg.getBoundingClientRect().width) {
          lab.style.display = 'none';
        }
      });
    });

    $('#chartLegend').innerHTML = mostrar.map(s =>
      `<li><i style="background: var(${s.cor})"></i>${s.nome} <b>${money(valores[s.k])}</b></li>`
    ).join('');
  }

  function renderDetalhe(r) {
    const tb = $('#detalhe tbody');
    const linha = (nome, valor, opts = {}) => {
      const { cor, sub, total, sinal } = opts;
      const cls = [total ? 'is-total' : '', sub ? 'is-sub' : ''].filter(Boolean).join(' ');
      const vcls = sinal ? (valor > 0 ? 'pos' : valor < 0 ? 'neg' : '') : '';
      const porKm = r.km > 0 ? money(Math.abs(valor) / r.km) : '—';
      const share = r.receita > 0 ? pct(Math.abs(valor) / r.receita * 100) : '—';
      return `<tr class="${cls}">
        <td>${cor ? `<i class="dot" style="background: var(${cor})"></i>` : ''}${nome}</td>
        <td class="num ${vcls}">${money(valor)}</td>
        <td class="num">${porKm}</td>
        <td class="num">${share}</td></tr>`;
    };

    const rows = [];
    for (const g of state.jornada.ganhos) if (g.v) rows.push(linha(g.p, g.v, { sub: true }));
    if (state.jornada.gorjetas) rows.push(linha('Gorjetas e extras', state.jornada.gorjetas, { sub: true }));
    rows.push(linha('Receita total', r.receita, { total: true }));
    rows.push(linha('Combustível', -r.cComb, { cor: '--s2' }));
    rows.push(linha('Pneus', -r.cPneu, { cor: '--s3', sub: true }));
    rows.push(linha('Revisão e óleo', -r.cRev, { cor: '--s3', sub: true }));
    rows.push(linha(`Custos fixos (${LABEL_PERIODO[state.jornada.periodo]})`, -r.cFixo, { cor: '--s4' }));
    if (r.cDep) rows.push(linha('Depreciação (rateio)', -r.cDep, { cor: '--s4', sub: true }));
    if (r.cExtras) rows.push(linha('Gastos do dia', -r.cExtras, { cor: '--s5' }));
    rows.push(linha('Custo total', -r.custo, { total: true }));
    rows.push(linha(r.lucro < 0 ? 'Prejuízo' : 'Lucro líquido', r.lucro, { total: true, sinal: true }));
    tb.innerHTML = rows.join('');
  }

  /* ─────────────── render: corrida ─────────────── */

  function renderCorrida() {
    const r = calcCorrida();
    const v = $('#verdict'), t = $('#verdictTitle'), s = $('#verdictSub');
    const icon = v.querySelector('.verdict__icon');

    if (!r.completo) {
      v.dataset.state = 'idle'; icon.textContent = '–';
      t.textContent = 'Preencha a corrida';
      s.textContent = 'Informe valor, km da corrida e tempo estimado.';
    } else if (r.lucro <= 0) {
      v.dataset.state = 'critical'; icon.textContent = '✕';
      t.textContent = 'Recusar — não paga nem o custo';
      s.textContent = `A corrida custa ${money(r.custo)} em combustível e desgaste.`;
    } else if (r.porHora >= r.alvo) {
      v.dataset.state = 'good'; icon.textContent = '✓';
      t.textContent = 'Aceitar';
      s.textContent = `Rende ${money(r.porHora)} por hora — o alvo é ${money(r.alvo)}/h.`;
    } else if (r.porHora >= r.alvo * 0.8) {
      v.dataset.state = 'warning'; icon.textContent = '!';
      t.textContent = 'No limite';
      s.textContent = `Rende ${money(r.porHora)}/h, um pouco abaixo do alvo de ${money(r.alvo)}/h.`;
    } else {
      v.dataset.state = 'critical'; icon.textContent = '✕';
      t.textContent = 'Recusar — rende pouco pelo tempo';
      s.textContent = `Só ${money(r.porHora)} por hora contra o alvo de ${money(r.alvo)}/h.`;
    }

    $('#corridaTiles').innerHTML = [
      tile('Sobra na corrida', money(r.lucro), r.lucro > 0 ? 'up' : r.lucro < 0 ? 'down' : '',
        'Depois de combustível e desgaste'),
      tile('Rendimento por hora', money(r.porHora),
        r.completo ? (r.porHora >= r.alvo ? 'up' : 'down') : '',
        `Alvo ${money(r.alvo)}/h`),
      tile('Valor mínimo justo', money(r.valorJusto), '', 'Para bater o alvo neste tempo'),
      tile('R$ por km oferecido', money(r.rsPorKm), '', `Custo variável ${money(r.d.variavelPorKm)}/km`)
    ].join('');

    $('#corridaTable tbody').innerHTML = `
      <tr><td>Valor oferecido</td><td class="num">${money(state.corrida.valor)}</td></tr>
      <tr class="is-sub"><td>Distância total</td><td class="num">${dec(r.kmTotal, 1)} km</td></tr>
      <tr class="is-sub"><td>Combustível</td><td class="num neg">${money(-r.custoComb)}</td></tr>
      <tr class="is-sub"><td>Pneus e revisão</td><td class="num neg">${money(-r.custoDesg)}</td></tr>
      <tr class="is-total"><td>Sobra da corrida</td><td class="num ${r.lucro >= 0 ? 'pos' : 'neg'}">${money(r.lucro)}</td></tr>
      <tr class="is-sub"><td>Rateio dos fixos por hora</td><td class="num">${money(r.d.fixoPorHora)}</td></tr>
      <tr class="is-sub"><td>Sua meta de lucro por hora</td><td class="num">${money(r.meta)}</td></tr>
      <tr class="is-total"><td>Alvo por hora</td><td class="num">${money(r.alvo)}</td></tr>`;
  }

  /* ─────────────── render: meu carro ─────────────── */

  function renderCarro() {
    const c = state.cfg, d = derivados(), u = FUEL[c.combustivel];
    $$('[data-fuel-price-unit]').forEach(e => e.textContent = u.preco);
    $$('[data-fuel-consumo-unit]').forEach(e => e.textContent = u.consumo);

    $('#custoKmCombustivel').innerHTML = c.consumo > 0
      ? `Custo de combustível: <b>${money(d.combPorKm)} por km</b> — cada 100 km gastam <b>${money(d.combPorKm * 100)}</b>.`
      : 'Informe o consumo médio para calcular o custo por km.';

    $('#custoKmDesgaste').innerHTML =
      `Desgaste: <b>${money(d.desgastePorKm)} por km</b> (pneus ${money(d.pneuPorKm)} + revisão ${money(d.revPorKm)}).
       Com o combustível, seu <b>custo variável é ${money(d.variavelPorKm)} por km</b>.`;

    $('#totalFixos').innerHTML =
      `Custos fixos: <b>${money(d.fixosMes)} por mês</b> — ${money(c.diasPorMes > 0 ? d.fixosMes / c.diasPorMes : 0)} por dia trabalhado.`;

    $('#totalDepreciacao').innerHTML = c.usarDepreciacao
      ? `Depreciação: <b>${money(d.depMes)} por mês</b> — ${money(c.diasPorMes > 0 ? d.depMes / c.diasPorMes : 0)} por dia.`
      : 'Depreciação desligada. Use assim se o carro é alugado.';

    $('#resumoCarro').innerHTML =
      `Seus custos fixos e a depreciação equivalem a <b>${money(d.fixoPorHora)} por hora</b> trabalhada.
       Somando a meta de ${money(c.metaHora)}/h, cada hora na rua precisa sobrar
       <b>${money(d.fixoPorHora + c.metaHora)}</b> depois do combustível e do desgaste —
       cerca de <b>${money((d.fixoPorHora + c.metaHora) * c.horasPorDia)}</b> por jornada de ${dec(c.horasPorDia, 0)} h.`;
  }

  /* ─────────────── render: histórico ─────────────── */

  function renderHistorico() {
    const h = state.historico.slice().sort((a, b) => b.iso.localeCompare(a.iso));
    const tb = $('#histTable tbody');
    $('#histEmpty').hidden = h.length > 0;

    if (!h.length) {
      tb.innerHTML = '';
      $('#histTiles').innerHTML = '';
      return;
    }

    const agora = new Date();
    const chaveMes = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
    const doMes = h.filter(e => e.iso.startsWith(chaveMes));
    const soma = (arr, k) => arr.reduce((s, e) => s + (e[k] || 0), 0);

    const lucroMes = soma(doMes, 'lucro');
    const horasTot = soma(h, 'horas');
    const lucroTot = soma(h, 'lucro');

    $('#histTiles').innerHTML = [
      tile('Lucro no mês', money(lucroMes), lucroMes > 0 ? 'up' : lucroMes < 0 ? 'down' : '',
        `${doMes.length} ${doMes.length === 1 ? 'jornada' : 'jornadas'}`),
      tile('Lucro acumulado', money(lucroTot), lucroTot > 0 ? 'up' : lucroTot < 0 ? 'down' : ''),
      tile('Lucro médio por hora', money(horasTot > 0 ? lucroTot / horasTot : 0), '',
        `${dec(horasTot, 0)} h registradas`),
      tile('Km registrados', `${dec(soma(h, 'km'), 0)} km`)
    ].join('');

    tb.innerHTML = h.map(e => {
      const [y, m, dd] = e.iso.split('-');
      const rh = e.horas > 0 ? e.lucro / e.horas : 0;
      return `<tr>
        <td>${dd}/${m}/${y}</td>
        <td>${LABEL_PERIODO[e.periodo] || e.periodo}</td>
        <td class="num">${money(e.receita)}</td>
        <td class="num">${money(e.custo)}</td>
        <td class="num ${e.lucro >= 0 ? 'pos' : 'neg'}">${money(e.lucro)}</td>
        <td class="num">${money(rh)}</td>
        <td class="num"><button type="button" class="row-del" data-hist-del="${e.id}"
            aria-label="Remover jornada de ${dd}/${m}/${y}" title="Remover">×</button></td>
      </tr>`;
    }).join('');
  }

  /* ─────────────── ligações de UI ─────────────── */

  function preencherInputs() {
    for (const el of $$('[data-cfg]')) {
      const k = el.dataset.cfg, v = state.cfg[k];
      if (el.type === 'checkbox') el.checked = !!v;
      else if (el.tagName === 'SELECT') el.value = v;
      else el.value = toInput(v);
    }
    for (const el of $$('[data-jor]')) el.value = toInput(state.jornada[el.dataset.jor]);
    for (const el of $$('[data-cor]')) el.value = toInput(state.corrida[el.dataset.cor]);
    $$('.seg__btn').forEach(b => b.classList.toggle('is-on', b.dataset.periodo === state.jornada.periodo));
    renderGanhos();
  }

  function renderTudo() {
    renderJornada(); renderCorrida(); renderCarro(); renderHistorico();
  }

  function flash(msg) {
    const f = $('#flash');
    f.textContent = msg;
    clearTimeout(flash._t);
    flash._t = setTimeout(() => { f.textContent = ''; }, 3500);
  }

  function ligar() {
    // configuração
    document.addEventListener('input', e => {
      const el = e.target;
      if (el.dataset.cfg) {
        const k = el.dataset.cfg;
        state.cfg[k] = el.type === 'checkbox' ? el.checked
                     : el.tagName === 'SELECT' ? el.value
                     : parseNum(el.value);
        salvar(); renderCarro(); renderJornada(); renderCorrida();
      } else if (el.dataset.jor) {
        state.jornada[el.dataset.jor] = parseNum(el.value);
        salvar(); renderJornada();
      } else if (el.dataset.cor) {
        state.corrida[el.dataset.cor] = parseNum(el.value);
        salvar(); renderCorrida();
      } else if (el.dataset.gVal != null) {
        state.jornada.ganhos[+el.dataset.gVal].v = parseNum(el.value);
        salvar(); renderJornada();
      }
    });

    document.addEventListener('change', e => {
      const el = e.target;
      if (el.dataset.gPlat != null) {
        state.jornada.ganhos[+el.dataset.gPlat].p = el.value;
        salvar(); renderGanhos(); renderJornada();
      }
    });

    document.addEventListener('click', e => {
      const t = e.target.closest('button');
      if (!t) return;

      if (t.dataset.periodo) {
        state.jornada.periodo = t.dataset.periodo;
        $$('.seg__btn').forEach(b => b.classList.toggle('is-on', b === t));
        salvar(); renderJornada(); return;
      }
      if (t.dataset.gDel != null) {
        state.jornada.ganhos.splice(+t.dataset.gDel, 1);
        if (!state.jornada.ganhos.length) state.jornada.ganhos.push({ p: 'Uber', v: 0 });
        salvar(); renderGanhos(); renderJornada(); return;
      }
      if (t.dataset.histDel) {
        state.historico = state.historico.filter(x => x.id !== t.dataset.histDel);
        salvar(); renderHistorico(); return;
      }

      switch (t.id) {
        case 'addGanho': {
          const usadas = state.jornada.ganhos.map(g => g.p);
          const nova = PLATAFORMAS.find(p => !usadas.includes(p)) || 'Outro';
          state.jornada.ganhos.push({ p: nova, v: 0 });
          salvar(); renderGanhos(); break;
        }
        case 'limparJornada':
          state.jornada = { ...structuredClone(JOR_PADRAO), periodo: state.jornada.periodo };
          salvar(); preencherInputs(); renderJornada();
          flash('Jornada limpa.');
          break;
        case 'salvarJornada': salvarJornada(); break;
        case 'copiarResumo': copiarResumo(); break;
        case 'resetCfg':
          state.cfg = { ...CFG_PADRAO };
          salvar(); preencherInputs(); renderTudo();
          break;
        case 'limparHistorico':
          if (state.historico.length && confirm('Apagar todas as jornadas salvas?')) {
            state.historico = []; salvar(); renderHistorico();
          }
          break;
        case 'themeToggle': alternarTema(); break;
      }
    });

    // abas
    $$('.tab').forEach(tab => tab.addEventListener('click', () => {
      $$('.tab').forEach(t => t.setAttribute('aria-selected', String(t === tab)));
      $$('.panel').forEach(p => p.hidden = p.id !== tab.getAttribute('aria-controls'));
      if (tab.id === 'tab-jornada') renderJornada();
      scrollTo({ top: 0, behavior: 'smooth' });
    }));

    addEventListener('scroll', esconderTip, { passive: true });
    addEventListener('resize', () => renderJornada());

    // segue o tema do sistema enquanto o usuário não escolher um
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (!state.tema) { aplicarTema(null); renderJornada(); }
    });
  }

  function salvarJornada() {
    const r = calcJornada();
    if (!r.completo) { flash('Preencha ganhos, horas e km antes de salvar.'); return; }
    const d = new Date();
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    state.historico.push({
      id: `${Date.now()}-${state.historico.length}`,
      iso, periodo: state.jornada.periodo,
      receita: r.receita, custo: r.custo, lucro: r.lucro, horas: r.horas, km: r.km
    });
    salvar(); renderHistorico();
    flash('Jornada salva no histórico.');
  }

  function copiarResumo() {
    const r = calcJornada(), per = LABEL_PERIODO[state.jornada.periodo];
    const txt = [
      `RESUMO DA JORNADA (${per})`,
      `Receita: ${money(r.receita)}`,
      `Combustível: ${money(r.cComb)} (${dec(r.litros, 1)} ${FUEL[state.cfg.combustivel].un})`,
      `Pneus e revisão: ${money(r.cDesg)}`,
      `Custos fixos: ${money(r.cFixo)}`,
      r.cDep ? `Depreciação: ${money(r.cDep)}` : null,
      r.cExtras ? `Gastos do dia: ${money(r.cExtras)}` : null,
      `Custo total: ${money(r.custo)}`,
      `${r.lucro < 0 ? 'PREJUÍZO' : 'LUCRO'}: ${money(r.lucro)}`,
      `Por hora: ${money(r.lucroPorHora)} · Por km: ${money(r.lucroPorKm)} · Margem: ${pct(r.margem)}`,
      `${dec(r.km, 0)} km em ${dec(r.horas, 1)} h`
    ].filter(Boolean).join('\n');

    const ok = () => flash('Resumo copiado.');
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(txt).then(ok, () => fallback());
    } else fallback();

    function fallback() {
      const ta = document.createElement('textarea');
      ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); ok(); }
      catch { flash('Não foi possível copiar automaticamente.'); }
      ta.remove();
    }
  }

  /* ─────────────── tema ─────────────── */

  function aplicarTema(t) {
    if (t) document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
    const escuro = t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches);
    $('[data-theme-icon]').textContent = escuro ? '☾' : '☀';
    lerCores();
  }

  function alternarTema() {
    const escuro = document.documentElement.getAttribute('data-theme') === 'dark' ||
      (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
    state.tema = escuro ? 'light' : 'dark';
    aplicarTema(state.tema);
    salvar(); renderJornada();
  }

  /* ─────────────── início ─────────────── */

  aplicarTema(state.tema);
  preencherInputs();
  ligar();
  renderTudo();
})();
