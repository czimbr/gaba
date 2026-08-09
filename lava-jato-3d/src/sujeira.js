/**
 * Sujeira sobre um modelo PBR carregado.
 *
 * Vai por vértice, não por textura: com 68 mil vértices o espaçamento fica em
 * ~0,5 mm, melhor que a textura de 1536² da versão anterior — e sem UV, sem
 * costura e sem atlas. O modelo tem só duas malhas, então a lista de peças não
 * sai dos nomes dos nós: sai de classificação por região e normal.
 */

import * as THREE from 'three';

export const PARTES = [
  'Teto', 'Vidros', 'Capô', 'Traseira',
  'Lateral esquerda', 'Lateral direita', 'Rodas', 'Para-choques'
];
const NP = PARTES.length;

/** Grade uniforme: sem ela cada passada varreria os 68 mil vértices. */
class Grade {
  constructor(pos, celula) {
    this.c = celula; this.m = new Map();
    for (let i = 0; i < pos.length / 3; i++) {
      const k = this.chave(pos[i*3], pos[i*3+1], pos[i*3+2]);
      let a = this.m.get(k); if (!a) this.m.set(k, a = []);
      a.push(i);
    }
  }
  chave(x, y, z) {
    return `${Math.floor(x/this.c)},${Math.floor(y/this.c)},${Math.floor(z/this.c)}`;
  }
  perto(x, y, z, r) {
    const n = Math.ceil(r / this.c), out = [];
    const cx = Math.floor(x/this.c), cy = Math.floor(y/this.c), cz = Math.floor(z/this.c);
    for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) for (let k = -n; k <= n; k++) {
      const a = this.m.get(`${cx+i},${cy+j},${cz+k}`);
      if (a) out.push(a);
    }
    return out;
  }
}

export class Sujeira {
  constructor(carro, caixa) {
    this.malhas = [];
    this.somaPeca = new Float64Array(NP + 1);
    this.iniPeca = new Float64Array(NP + 1);
    this.pctPeca = new Float64Array(NP + 1);
    this.pronta = new Uint8Array(NP + 1);
    this.pctTotal = 0;

    const tam = caixa.getSize(new THREE.Vector3());
    const cen = caixa.getCenter(new THREE.Vector3());
    // eixo mais longo é o comprimento; Y é a vertical por convenção do glTF
    const eixoL = tam.x > tam.z ? 'x' : 'z';
    const eixoW = eixoL === 'x' ? 'z' : 'x';
    this.eixoL = eixoL; this.eixoW = eixoW; this.caixa = caixa; this.tam = tam; this.cen = cen;

    carro.updateWorldMatrix(true, true);
    carro.traverse((o) => {
      if (!o.isMesh || !o.visible) return;
      this.preparar(o);
    });

    this.iniPeca.set(this.somaPeca);
    // Peça sem vértice nenhum apareceria como 100% de saída e mentiria na
    // lista. A classificação depende do modelo, então em vez de confiar nela
    // eu descarto o que ficou vazio.
    this.ativas = [];
    for (let p = 1; p <= NP; p++) if (this.iniPeca[p] > 0) this.ativas.push(p);
    this.apurar();
  }

  /** Classifica os vértices e cria o atributo de sujeira. */
  preparar(malha) {
    const g = malha.geometry;
    const n = g.attributes.position.count;
    const suj = new Float32Array(n);
    const parte = new Uint8Array(n);
    const mundo = new Float32Array(n * 3);

    const p = new THREE.Vector3(), nr = new THREE.Vector3();
    const mn = new THREE.Matrix3().getNormalMatrix(malha.matrixWorld);
    const vidro = /glass|vidro/i.test(malha.name);
    const { tam, cen, eixoL, eixoW } = this;
    const meioL = tam[eixoL] / 2, meioW = tam[eixoW] / 2;

    for (let i = 0; i < n; i++) {
      p.fromBufferAttribute(g.attributes.position, i).applyMatrix4(malha.matrixWorld);
      mundo[i*3] = p.x; mundo[i*3+1] = p.y; mundo[i*3+2] = p.z;
      nr.fromBufferAttribute(g.attributes.normal, i).applyMatrix3(mn).normalize();

      const u = (p[eixoL] - cen[eixoL]) / meioL;      // -1 a 1 no comprimento
      const w = (p[eixoW] - cen[eixoW]) / meioW;      // -1 a 1 na largura
      const v = (p.y - this.caixa.min.y) / tam.y;     // 0 a 1 na altura

      let id;
      if (vidro) id = 2;
      else if (v < 0.30) id = Math.abs(u) > 0.60 ? 8 : 7;   // para-choques ou rodas/chassi
      else if (nr.y > 0.55) id = Math.abs(u) < 0.32 ? 1 : (u > 0 ? 3 : 4);
      else if (Math.abs(u) > 0.78) id = u > 0 ? 3 : 4;
      else id = w < 0 ? 5 : 6;

      parte[i] = id;
      // mais sujo embaixo, com variação para não sair uniforme
      const ruido = Math.abs(Math.sin(p.x * 91.7 + p.z * 57.3) * Math.cos(p.y * 73.1));
      suj[i] = Math.min(1, 0.72 + (1 - v) * 0.26 + ruido * 0.18);
      this.somaPeca[id] += suj[i];
    }

    g.setAttribute('aSuj', new THREE.BufferAttribute(suj, 1));
    const raio = Math.max(tam.x, tam.y, tam.z);
    this.malhas.push({
      malha, suj, parte, mundo,
      attr: g.attributes.aSuj,
      grade: new Grade(mundo, raio * 0.06)
    });
    this.injetar(malha);
  }

  /**
   * Injeta a sujeira no material PBR do modelo. Trocar o material perderia
   * albedo, normal e roughness que vieram do glTF — que é justamente o motivo
   * de ter trocado de container.
   */
  injetar(malha) {
    const mats = Array.isArray(malha.material) ? malha.material : [malha.material];
    for (const m of mats) {
      m.onBeforeCompile = (s) => {
        s.vertexShader = s.vertexShader
          .replace('#include <common>', `#include <common>
            attribute float aSuj; varying float vSuj; varying vec3 vMundo;`)
          .replace('#include <begin_vertex>', `#include <begin_vertex>
            vSuj = aSuj; vMundo = (modelMatrix * vec4(position, 1.0)).xyz;`);
        s.fragmentShader = s.fragmentShader
          .replace('#include <common>', `#include <common>
            varying float vSuj; varying vec3 vMundo;
            float hsh(vec3 p){ p = fract(p*0.3183099 + vec3(0.71,0.113,0.419)); p *= 17.0;
              return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
            float rud(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
              return mix(mix(mix(hsh(i),hsh(i+vec3(1,0,0)),f.x),mix(hsh(i+vec3(0,1,0)),hsh(i+vec3(1,1,0)),f.x),f.y),
                         mix(mix(hsh(i+vec3(0,0,1)),hsh(i+vec3(1,0,1)),f.x),mix(hsh(i+vec3(0,1,1)),hsh(i+vec3(1,1,1)),f.x),f.y),f.z); }`)
          .replace('#include <map_fragment>', `#include <map_fragment>
            float g = rud(vMundo*260.0)*0.62 + rud(vMundo*840.0)*0.38;
            float suj = clamp(vSuj*(0.55+1.05*g), 0.0, 1.0);
            vec3 corSuj = mix(vec3(0.155,0.115,0.070), vec3(0.055,0.040,0.026),
                              smoothstep(0.60,0.95,g)*vSuj);
            diffuseColor.rgb = mix(diffuseColor.rgb, corSuj, suj);`)
          // Aqui é o ponto que importa: a struct `material` já existe e é ela
          // que a iluminação usa. Tingir só o diffuseColor não bastava — a
          // pintura do modelo é metálica, e metal multiplica o difuso por
          // (1 - metalness), então a sujeira ia embora justamente onde o carro
          // é mais bonito. O verniz por cima lavava o resto.
          .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
            material.diffuseColor = mix(material.diffuseColor, corSuj, suj);
            material.roughness = clamp(mix(material.roughness, 0.95, suj), 0.04, 1.0);
            material.specularColor = mix(material.specularColor, vec3(0.04), suj);
            #ifdef USE_CLEARCOAT
              material.clearcoat = mix(material.clearcoat, 0.0, suj);
              material.clearcoatRoughness = mix(material.clearcoatRoughness, 0.9, suj);
            #endif`);
      };
      // sem isso o three reaproveita o programa sem a injeção
      m.customProgramCacheKey = () => 'lavajato-sujeira';
      m.needsUpdate = true;
    }
  }

  /** Aplica o leque num ponto do mundo. Devolve true se mexeu em alguma coisa. */
  jato(ponto, dir, bico, dt) {
    const A = bico.leque * 0.5, B = bico.espessura * 0.5;
    const R = Math.max(A, B);
    const poder = bico.poder * dt * 3.2;
    // eixos do leque: achatado no plano perpendicular ao jato
    const eixo = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));
    if (eixo.lengthSq() < 1e-8) eixo.set(1, 0, 0);
    eixo.normalize();
    const perp = new THREE.Vector3().crossVectors(dir, eixo).normalize();

    let mexeu = false;
    for (const m of this.malhas) {
      let tocou = false;
      for (const balde of m.grade.perto(ponto.x, ponto.y, ponto.z, R)) {
        for (const i of balde) {
          const dx = m.mundo[i*3] - ponto.x, dy = m.mundo[i*3+1] - ponto.y, dz = m.mundo[i*3+2] - ponto.z;
          const ta = (dx*eixo.x + dy*eixo.y + dz*eixo.z) / A;
          const tb = (dx*perp.x + dy*perp.y + dz*perp.z) / B;
          const tc = (dx*dir.x + dy*dir.y + dz*dir.z) / (R * 1.6);   // profundidade
          const q = ta*ta + tb*tb + tc*tc;
          if (q > 1) continue;
          const antes = m.suj[i];
          if (antes <= 0) continue;
          let dep = antes - poder * (1 - q ** 2.6);
          if (dep < 0.02) dep = 0;
          if (dep !== antes) {
            m.suj[i] = dep;
            this.somaPeca[m.parte[i]] -= antes - dep;
            tocou = true;
          }
        }
      }
      if (tocou) { m.attr.needsUpdate = true; mexeu = true; }
    }
    return mexeu;
  }

  apurar() {
    const novas = [];
    let s = 0, t = 0;
    for (const p of this.ativas) {
      s += this.somaPeca[p]; t += this.iniPeca[p];
      this.pctPeca[p] = Math.max(0, Math.min(1, 1 - this.somaPeca[p] / this.iniPeca[p]));
      if (!this.pronta[p] && this.pctPeca[p] >= 0.995) { this.pronta[p] = 1; novas.push(p); }
    }
    this.pctTotal = t > 0 ? Math.max(0, Math.min(1, 1 - s / t)) : 0;
    return novas;
  }

  /** Diagnóstico: quantos vértices caíram em cada peça. */
  contagem() {
    const c = new Array(NP + 1).fill(0);
    for (const m of this.malhas) for (const p of m.parte) c[p]++;
    return PARTES.map((n, i) => `${n}=${c[i + 1]}`);
  }
}
