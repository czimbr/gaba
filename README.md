# Lucro na Direção

Calculadora de lucro real para motoristas de aplicativo — Uber, 99, InDrive, iFood,
Rappi e afins. Mostra quanto **sobra de verdade** depois de combustível, desgaste,
custos fixos e depreciação, e ajuda a decidir na hora se uma corrida vale a pena.

Roda direto no navegador, sem instalação, sem servidor e sem conta. Tudo fica salvo
no seu próprio aparelho.

## Como usar

Abra o `index.html` no navegador. É isso.

Para usar no celular como se fosse um app, hospede a pasta em qualquer lugar que
sirva arquivos estáticos (GitHub Pages, Netlify, Vercel) e adicione o link à tela
de início.

Servindo localmente, se preferir:

```sh
python3 -m http.server 8000
# abra http://localhost:8000
```

## As quatro abas

### Jornada

Lance o que recebeu em cada plataforma, as horas e os km rodados. A calculadora
devolve:

- **Lucro líquido** do dia, da semana ou do mês
- **Lucro por hora** e **lucro por km** — os números que realmente dizem se valeu
- **Margem de lucro** e **custo por km**
- **Faturamento mínimo**: abaixo disso o período dá prejuízo
- **Km para empatar**: quanto você precisa rodar, no seu R$/km atual, para cobrir
  os custos que não dependem da quilometragem
- Um gráfico de para onde vai cada real que entrou, mais o detalhamento linha a linha

Os custos fixos são **rateados automaticamente** para o período escolhido: no modo
"Dia" entra a fatia diária do seguro, do IPVA, do financiamento e da depreciação.

Dá para salvar a jornada no histórico ou copiar um resumo em texto.

### Vale a pena?

A conta que importa quando a corrida aparece na tela. Você informa o valor
oferecido, os km até o passageiro, os km da corrida e o tempo estimado.

Da corrida saem apenas os custos que **variam com o uso do carro** — combustível,
pneus e revisão. Os custos fixos não entram aqui porque correm mesmo com o carro
parado; eles aparecem no **alvo por hora**, que é o rateio dos fixos somado à sua
meta de lucro. O veredito compara o rendimento da corrida com esse alvo:

| Situação | Veredito |
|---|---|
| Não cobre nem o custo variável | Recusar |
| Rende abaixo de 80% do alvo | Recusar |
| Entre 80% e 100% do alvo | No limite |
| Igual ou acima do alvo | Aceitar |

Também mostra o **valor mínimo justo** — quanto a corrida precisaria pagar, naquele
tempo, para bater o alvo.

### Meu carro

Preenchida uma vez, alimenta todas as contas:

- **Combustível** — gasolina, etanol, diesel, GNV ou elétrico, com preço e consumo
  médio (as unidades mudam junto com o tipo)
- **Desgaste por km** — pneus e revisão, informados por preço e durabilidade, o que
  é mais fiel que uma média mensal chutada
- **Custos fixos mensais** — aluguel (semanal ou mensal), financiamento, seguro,
  IPVA e licenciamento, manutenção imprevista, lavagem, celular e outros
- **Depreciação** — pode ser desligada, para quem aluga o carro
- **Rotina e meta** — dias por mês, horas por dia e sua meta de lucro por hora

Os valores que vêm preenchidos são apenas exemplos plausíveis; troque tudo pelos
seus.

### Histórico

As jornadas salvas, com lucro do mês, lucro acumulado, lucro médio por hora e km
registrados.

## Detalhes que fazem diferença na conta

- **Km rodados são todos os km**, inclusive deslocamento vazio e retorno para casa.
  Contar só os km com passageiro é o erro que mais infla o lucro aparente.
- **Depreciação conta.** O carro perde valor rodando, e ignorar isso é a forma mais
  comum de achar que se está lucrando quando se está consumindo o patrimônio.
- **Pneus e revisão por km, não por mês.** Um jogo de pneus de R$ 1.400 que dura
  45.000 km custa R$ 0,031 por km, independente de quantos meses isso levar.
- **Na decisão da corrida, só o custo marginal.** O seguro do mês já está pago
  quando a corrida aparece; o que ela precisa cobrir é o combustível e o desgaste
  que ela mesma provoca, mais a sua fatia de fixos e lucro por hora.

## Estrutura

```
index.html          marcação das quatro abas
assets/styles.css   tokens de cor, tema claro/escuro, layout
assets/app.js       cálculos, estado, gráfico e persistência
```

Sem dependências, sem build, sem rede. JavaScript puro.

Os dados ficam no `localStorage` do navegador, na chave `lucroNaDirecao.v1`. Nada
sai do aparelho — o que também significa que limpar os dados do navegador apaga o
histórico.

## Acessibilidade

- Tema claro e escuro, seguindo o sistema, com alternador manual que tem a palavra
  final
- As cores do gráfico foram validadas para daltonismo (protanopia, deuteranopia e
  tritanopia) nos dois temas, com separação mínima entre cores vizinhas
- Nenhuma informação depende só da cor: o gráfico tem legenda, rótulos diretos e a
  tabela de detalhamento com todos os valores
- Layout responsivo de 320px para cima, sem rolagem horizontal na página
- Aceita número em formato brasileiro: `1.234,56`, `45,50` e `1.234` funcionam

## Licença

MIT.
