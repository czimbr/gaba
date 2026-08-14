# Turma do Rio — Plano do Canal

Canal de historinhas animadas 2D para crianças de 3 a 6 anos, em português brasileiro, com personagens da fauna brasileira.

## 1. Conceito

**Nome de trabalho:** Turma do Rio

Um grupo de bichinhos brasileiros vive na beira de um rio na floresta. Em cada episódio, um probleminha do dia a dia (um brinquedo que se perde, um amigo que fica bravo, um medo de tempestade) vira uma pequena aventura, resolvida com curiosidade, gentileza e ajuda dos amigos.

**Por que esse conceito:**

- **Fauna brasileira é diferencial real.** O nicho infantil em português é dominado por conteúdo traduzido/genérico. Capivara, tucano e bicho-preguiça são imediatamente reconhecíveis, queridos, e quase não têm concorrência direta como protagonistas.
- **Formas redondas e simples** — capivara e perereca são basicamente círculos com orelhas. Isso não é detalhe: é o que torna a animação 2D viável para uma pessoa só.
- **Reassistibilidade.** Criança pequena assiste o mesmo episódio dezenas de vezes. Personagens fixos, bordões e músicas recorrentes alimentam isso — e é daí que vem o volume de views no nicho.

## 2. Público-alvo

- **Faixa principal:** 3 a 6 anos (pré-escola).
- **Quem aperta o play:** os pais. O canal precisa parecer confiável e seguro para um adulto que avalia em 5 segundos: arte caprichada, título claro, sem gritaria nem cores estridentes demais.
- **Idioma:** português brasileiro, com fala pausada e vocabulário simples (frases curtas, repetição intencional).

## 3. Personagens

| Personagem | Bicho | Personalidade | Papel nas histórias |
|---|---|---|---|
| **Nina** | Capivara | Curiosa, corajosa, às vezes afobada | Protagonista. Quem tem a ideia — e quem erra primeiro |
| **Tuca** | Tucano | Falante, exagerado, coração mole | O amigo que dramatiza tudo e alivia com humor |
| **Pipo** | Perereca | Pequeno, tímido, observador | Quem enxerga a solução que ninguém viu |
| **Dona Lu** | Bicho-preguiça | Calma, sábia, fala deee-vaaa-gar | A adulta da turma. Nunca dá a resposta pronta; faz a pergunta certa |

**Diretrizes visuais:**

- Formas geométricas simples (círculos e cápsulas), contorno grosso e uniforme, olhos grandes.
- Paleta por personagem: Nina em tons de marrom-caramelo, Tuca preto com bico colorido, Pipo verde-folha, Dona Lu cinza-lilás. Fundos em tons pastel para os personagens saltarem.
- Cada personagem precisa ser reconhecível em silhueta — teste antes de fechar o design.

## 4. Formato dos episódios

**Duração:** 4 a 6 minutos. Curto o bastante para produzir sozinho, longo o bastante para o algoritmo valorizar o tempo de exibição.

**Estrutura fixa (a criança aprende o ritmo e isso prende):**

1. **Abertura fria (0:00–0:15)** — começa dentro da ação, nunca com "olá amiguinhos". Ex.: o barquinho já está escapando rio abaixo.
2. **Vinheta musical (0:15–0:30)** — 10–15 segundos, sempre a mesma música.
3. **O probleminha (0:30–1:30)** — apresentado de forma visual e concreta.
4. **Três tentativas (1:30–4:00)** — regra de três: duas tentativas falham de um jeito engraçado, a terceira funciona. É a espinha dorsal de quase toda história pré-escolar que funciona.
5. **Resolução + moral leve (4:00–4:45)** — a lição aparece na ação, nunca em sermão. Dona Lu resume em uma frase, no máximo.
6. **Musiquinha de encerramento (4:45–5:15)** — recap cantado do que aconteceu, sempre na mesma melodia com letra adaptada por episódio.

**Temas da primeira temporada (10 episódios):** pedir ajuda, esperar a vez, medo de tempestade, dividir o lanche, dizer desculpa, coisas que não saem como planejado, medo do escuro, um amigo novo diferente, perder no jogo, saudade.

## 5. Regras do YouTube para conteúdo infantil — leia antes de tudo

Isto muda toda a estratégia e não é opcional:

- **Marcação "conteúdo para crianças" é obrigatória por lei (COPPA).** Todo vídeo do canal deve ser marcado assim. Não marcar conteúdo infantil corretamente pode gerar multa da FTC e punição do canal.
- **Sem anúncios personalizados** nesses vídeos: o RPM real fica na faixa de **US$ 1–4**, não os US$ 15–30 de nichos adultos. A conta do nicho infantil fecha por **volume** (crianças reassistem muito) e, mais tarde, por licenciamento e produtos — não por RPM alto.
- **Sem comentários, sem notificações, sem tela final clicável** em conteúdo para crianças. O crescimento vem de: página inicial, "assistir a seguir", playlists e YouTube Kids.
- **O YouTube pune ativamente conteúdo infantil de baixa qualidade** (política de qualidade de conteúdo infantil): vídeos feitos em massa, sem valor educativo, com títulos caça-clique. Capricho e propósito educativo não são só ética — são requisito de distribuição.
- **Monetização:** exige 1.000 inscritos + 4.000 horas assistidas (ou 10M views em Shorts). No infantil, o caminho realista é: consistência por 6–12 meses antes de qualquer receita relevante.

## 6. Fluxo de produção (uma pessoa)

Por episódio, nesta ordem:

1. **Roteiro** — a partir do modelo em `episodios/`. Usar o Claude para rascunhar seguindo a estrutura da seção 4; revisar à mão sempre (ritmo de leitura em voz alta, vocabulário da faixa etária).
2. **Storyboard** — miniaturas toscas de cada cena, no papel mesmo. 15–25 quadros por episódio.
3. **Arte** — personagens e fundos vetoriais no **Inkscape** (gratuito) ou **Krita**. Personagens desenhados uma vez, em peças separadas (cabeça, corpo, braços, bocas), reaproveitados para sempre.
4. **Narração e vozes** — gravação própria com microfone decente + **Audacity**, ou TTS de qualidade (ElevenLabs) para a narração. Vozes dos personagens: gravar você mesmo variando tom rende mais carisma que TTS.
5. **Animação** — animação de recorte (cutout): mover as peças dos personagens, sem redesenhar quadro a quadro. Opções gratuitas: **Blender (Grease Pencil)** ou **OpenToonz**; caminho mais rápido: animar direto no editor de vídeo com keyframes de posição/rotação.
6. **Música e efeitos** — biblioteca de áudio do YouTube (gratuita e liberada) para começar; uma vinheta própria simples é o primeiro investimento que vale a pena.
7. **Edição final** — **DaVinci Resolve** (gratuito). Cortes no ritmo da narração, efeitos sonoros em cada ação (criança pequena responde muito a som).
8. **Thumbnail e título** — rosto do personagem grande, emoção clara, no máximo 4–5 palavras no título. O pai decide o clique, a criança decide se fica.

**Ritmo realista:** 1 episódio por semana ou quinzena. Consistência ganha de frequência. Produzir em lote: roteirizar 3–4 episódios de uma vez, depois gravar todas as vozes de uma vez.

## 7. Crescimento

- **Consistência de universo:** mesma vinheta, mesmos bordões ("Deee-vaaa-gar…", da Dona Lu), mesma musiquinha final. Isso constrói marca com criança pequena.
- **Playlists desde o dia 1:** "Todas as historinhas da Turma do Rio" — sessões longas de reprodução são o principal motor no infantil.
- **Shorts como isca:** cortes de 30–60s dos momentos engraçados do Tuca, apontando para o episódio completo.
- **Título para o pai, thumbnail para a criança:** "Nina aprende a pedir ajuda 🛶 Turma do Rio" — o pai vê valor educativo, a criança vê a capivara.
- **Não perseguir tendência:** episódio atemporal continua rendendo views por anos; é o ativo do nicho.

## 8. Primeiro marco

Antes de pensar em canal, existir **um episódio pronto** de ponta a ponta. O roteiro piloto está em [`episodios/ep01-o-barquinho-da-nina.md`](episodios/ep01-o-barquinho-da-nina.md).

Checklist do piloto:

- [ ] Ler o roteiro em voz alta e cronometrar (meta: 4–5 min)
- [ ] Desenhar os 4 personagens em peças separadas (Inkscape/Krita)
- [ ] Desenhar 3 fundos: beira do rio, rio com correnteza, poça entre pedras
- [ ] Storyboard das ~20 cenas
- [ ] Gravar narração e vozes
- [ ] Animar e editar
- [ ] Compor/escolher vinheta e musiquinha final
- [ ] Thumbnail + título + marcação "conteúdo para crianças"
