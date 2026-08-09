# Lava-Jato 3D — caminho B

Reescrita do simulador com **modelo PBR de verdade** em vez de geometria gerada
por código. É de onde vem o salto de aparência: pintura automotiva *é* reflexo,
e nenhum especular de Blinn-Phong substitui um ambiente espelhado na lataria.

Comparação direta com a versão anterior (`../simulador-lava-jato/`):

| | Procedural (arquivo único) | Aqui |
|---|---|---|
| Triângulos | 5.904 | 91.331 |
| Materiais | Blinn-Phong à mão | PBR (`MeshPhysicalMaterial`) |
| Iluminação | duas luzes fixas | IBL + luz direcional com sombra |
| Reflexo | nenhum | ambiente pré-filtrado (PMREM) |
| Detalhe | vinco pintado no shader | cromado, grade, faixa de pneu, vidro |

## Rodar

```sh
npm install
npm run dev
```

## Assets

- **Modelo:** “Toy Car”, Khronos Group — **CC0 1.0** (domínio público).
  Licença completa em `public/ToyCar-LICENSE.md`.
  O Ferrari dos exemplos do three.js foi descartado de propósito: exige
  atribuição e é carro de marca, o que não convém vendorizar num repositório.
- **Ambiente:** `RoomEnvironment`, que acompanha o three e é gerado por código.
  Nada de HDRI externo, então não há asset de licença incerta no repositório.

## Estado

Isto é a **fundação**, não o jogo. O que já funciona: carga do modelo, PBR com
IBL, sombra projetada, órbita, enquadramento automático pelo tamanho real do
modelo e leitura da malha.

Ainda **não** foi portado da versão anterior: sujeira, bicos, leque, lista de
peças, progresso, som e modo realista.

Um obstáculo já identificado para o porte: o ToyCar vem como **duas malhas**
(carroceria e vidro), então a ideia de tirar a lista de peças dos nomes dos nós
não se sustenta com este modelo. A lista terá de sair de outra divisão — por
região no espaço do modelo ou por material — ou de um modelo com mais peças
nomeadas.

Diferente da versão em arquivo único, esta **não** abre como link: precisa de
`npm install`.
