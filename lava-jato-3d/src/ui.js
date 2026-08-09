import { PARTES } from './sujeira.js';

/** Leque em unidades do modelo — o ToyCar tem ~0,17 de comprimento. */
export const BICOS = [
  { ang: '0°',    cor: '#e5484d', nome: 'Vermelho', leque: .006, espessura: .006, poder: 2.3 },
  { ang: '15°',   cor: '#f5c518', nome: 'Amarelo',  leque: .020, espessura: .006, poder: 1.35 },
  { ang: '25°',   cor: '#35c47a', nome: 'Verde',    leque: .030, espessura: .009, poder: .85 },
  { ang: '40°',   cor: '#e8eaec', nome: 'Branco',   leque: .044, espessura: .013, poder: .52 },
  { ang: 'Sabão', cor: '#2a3138', nome: 'Preto',    leque: .052, espessura: .030, poder: .10 }
];

window.__bico = 2;
let els = [];

let ativas = [];

export function montarPainel(s) {
  const alvo = document.getElementById('jogo');
  alvo.innerHTML = `
    <div class="bicos" id="bicos" role="group" aria-label="Escolha do bico"></div>
    <div class="lista">
      <div class="lista__topo"><span>Peças</span><b id="cont">0 de ${s.ativas.length}</b></div>
      <div id="pecas"></div>
    </div>`;

  const bicos = document.getElementById('bicos');
  BICOS.forEach((b, i) => {
    const el = document.createElement('button');
    el.type = 'button'; el.className = 'bico';
    el.style.setProperty('--cor', b.cor);
    el.setAttribute('aria-pressed', String(i === window.__bico));
    el.innerHTML = `<i></i><b>${b.ang}</b>`;
    el.title = `${b.ang} ${b.nome}`;
    el.onclick = () => {
      window.__bico = i;
      [...bicos.children].forEach((c, k) => c.setAttribute('aria-pressed', String(k === i)));
    };
    bicos.appendChild(el);
  });

  const lista = document.getElementById('pecas');
  els = [];
  ativas = s.ativas;
  ativas.forEach((id) => {
    const nome = PARTES[id - 1];
    const el = document.createElement('div');
    el.className = 'peca';
    el.innerHTML = `<span>${nome}</span><b>0%</b><i><s></s></i>`;
    lista.appendChild(el);
    els.push({ id, raiz: el, pct: el.querySelector('b'), barra: el.querySelector('s') });
  });
}

export function atualizarPainel(s) {
  let feitas = 0;
  for (const e of els) {
    const p = e.id;
    if (s.pronta[p]) feitas++;
    e.raiz.classList.toggle('pronta', !!s.pronta[p]);
    e.barra.style.width = `${s.pctPeca[p] * 100}%`;
    e.pct.textContent = `${Math.floor(s.pctPeca[p] * 100)}%`;
  }
  document.getElementById('cont').textContent = `${feitas} de ${els.length}`;
  document.getElementById('mLimpo').textContent = `${Math.round(s.pctTotal * 100)}%`;
}
