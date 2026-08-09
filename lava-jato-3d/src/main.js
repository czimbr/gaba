/**
 * Lava-Jato 3D — fundação do caminho B.
 *
 * Troca do container: em vez de gerar o carro por código num arquivo único,
 * carrega um modelo PBR de verdade e ilumina com IBL. É daqui que vem o salto
 * de aparência — pintura automotiva É reflexo, e nenhum especular de
 * Blinn-Phong substitui um ambiente espelhado na lataria.
 *
 * O ambiente é o RoomEnvironment, que vem dentro do three e é gerado por
 * código: IBL real sem baixar HDRI nem lidar com licença de asset.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Sujeira, PARTES } from './sujeira.js';
import { BICOS, montarPainel, atualizarPainel } from './ui.js';

const app = document.getElementById('app');

/* ── renderizador ── */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;   // sem isso o reflexo estoura em branco
renderer.toneMappingExposure = 1.15;
app.appendChild(renderer.domElement);

const cena = new THREE.Scene();
cena.background = new THREE.Color(0x0d1013);

/* ── IBL: o que faz a lataria parecer lataria ── */
const pmrem = new THREE.PMREMGenerator(renderer);
const ambiente = pmrem.fromScene(new RoomEnvironment(), 0.04);
cena.environment = ambiente.texture;

/* ── câmera e órbita ── */
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.01, 100);
camera.position.set(0.34, 0.20, 0.42);

const orbita = new OrbitControls(camera, renderer.domElement);
orbita.enableDamping = true;
orbita.dampingFactor = 0.08;
orbita.minDistance = 0.12;
orbita.maxDistance = 1.4;
orbita.maxPolarAngle = Math.PI * 0.52;   // não deixa passar por baixo do chão

/* ── luz principal, só para a sombra projetada ── */
const sol = new THREE.DirectionalLight(0xffffff, 2.2);
sol.position.set(0.5, 0.9, 0.35);
sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048);
sol.shadow.bias = -0.0006;
sol.shadow.normalBias = 0.004;
cena.add(sol);

/* ── chão ── */
const chao = new THREE.Mesh(
  new THREE.CircleGeometry(3, 64).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0x0b0e11, roughness: 0.45, metalness: 0.0 })
);
chao.receiveShadow = true;
cena.add(chao);

/* ── modelo ── */
const aviso = document.getElementById('aviso');
let carro = null, sujeira = null;
const pecas = [];

// caminho relativo ao base: em Pages de projeto o site não fica na raiz
new GLTFLoader().load(
  `${import.meta.env.BASE_URL}ToyCar.glb`,
  (gltf) => {
    carro = gltf.scene;

    let tris = 0, verts = 0;
    // o ToyCar vem como cena de vitrine, com um pano de veludo por baixo
    const pano = carro.getObjectByName('Fabric');
    if (pano) pano.visible = false;

    carro.traverse((o) => {
      if (!o.isMesh || !o.visible || o.name === 'Fabric') return;
      o.castShadow = true;
      o.receiveShadow = true;
      const g = o.geometry;
      verts += g.attributes.position.count;
      tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
      pecas.push(o);
    });

    // o modelo vem em metros de brinquedo; encaixa numa caixa conhecida
    const caixa = new THREE.Box3().setFromObject(carro);
    const tam = caixa.getSize(new THREE.Vector3());
    const centro = caixa.getCenter(new THREE.Vector3());
    carro.position.sub(centro);
    carro.position.y += tam.y / 2;
    cena.add(carro);

    // enquadra a câmera pelo tamanho real do modelo
    const raio = tam.length() / 2;
    orbita.target.set(0, tam.y / 2, 0);
    camera.position.set(raio * 1.5, raio * 1.05, raio * 1.7);
    orbita.minDistance = raio * 0.7;
    orbita.maxDistance = raio * 6;
    sol.position.set(raio * 2, raio * 3.2, raio * 1.6);
    const s = sol.shadow.camera;
    s.left = -raio * 2; s.right = raio * 2; s.top = raio * 2; s.bottom = -raio * 2;
    s.near = 0.01; s.far = raio * 12; s.updateProjectionMatrix();
    chao.scale.setScalar(raio * 4);

    sujeira = new Sujeira(carro, new THREE.Box3().setFromObject(carro));
    montarPainel(sujeira);
    atualizarPainel(sujeira);

    document.getElementById('mTris').textContent = Math.round(tris).toLocaleString('pt-BR');
    document.getElementById('mVerts').textContent = verts.toLocaleString('pt-BR');
    document.getElementById('mPecas').textContent = String(sujeira.ativas.length);
    aviso.style.display = 'none';
    window.__pronto = true;
  },
  undefined,
  (e) => { aviso.textContent = 'Falhou ao carregar o modelo'; console.error(e); }
);

/* ── laço ── */
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* ── jato ── */
const raio = new THREE.Raycaster();
const ponteiro = new THREE.Vector2();
let jatoAtivo = false, temMira = false, acumulado = 0;

const paraNDC = (e) => {
  ponteiro.x = (e.clientX / innerWidth) * 2 - 1;
  ponteiro.y = -(e.clientY / innerHeight) * 2 + 1;
  temMira = true;
};
renderer.domElement.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;             // botão direito fica com a órbita
  paraNDC(e); jatoAtivo = true;
  orbita.enabled = false;                  // não gira enquanto lava
});
renderer.domElement.addEventListener('pointermove', paraNDC);
const soltar = () => { jatoAtivo = false; orbita.enabled = true; };
addEventListener('pointerup', soltar);
addEventListener('pointercancel', soltar);

let ultimo = performance.now();

renderer.setAnimationLoop(() => {
  const agora = performance.now();
  const dt = Math.min(0.05, (agora - ultimo) / 1000);
  ultimo = agora;

  if (sujeira && jatoAtivo && temMira) {
    raio.setFromCamera(ponteiro, camera);
    const hits = raio.intersectObject(carro, true);
    if (hits.length) {
      sujeira.jato(hits[0].point, raio.ray.direction, BICOS[window.__bico ?? 2], dt);
      acumulado += dt;
      if (acumulado > 0.15) {
        acumulado = 0;
        sujeira.apurar();
        atualizarPainel(sujeira);
      }
    }
  }

  orbita.update();
  renderer.render(cena, camera);
});

window.__diag = () => ({
  pronto: !!window.__pronto,
  malhas: pecas.map((m) => m.name),
  contagem: sujeira ? sujeira.contagem() : null,
  pct: sujeira ? +(sujeira.pctTotal * 100).toFixed(1) : null,
  pecas: sujeira ? PARTES.map((n, i) => `${n}=${Math.round(sujeira.pctPeca[i+1]*100)}%`) : null
});
window.__lavar = (v) => {                 // gancho de teste
  for (const m of sujeira.malhas) {
    for (let i = 0; i < m.suj.length; i++) { sujeira.somaPeca[m.parte[i]] -= m.suj[i] - v; m.suj[i] = v; }
    m.attr.needsUpdate = true;
  }
  sujeira.apurar(); atualizarPainel(sujeira);
};
