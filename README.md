# Comparativo de Smartphones

App web para comparar smartphones da linha atual de 15 marcas: Apple, Samsung, Motorola, Xiaomi, Poco, Realme, Google, OnePlus, Nothing, Honor, Oppo, Vivo (Jovi), Infinix, Tecno e Asus.

Abra o `index.html` no navegador. Não precisa instalar nada nem rodar servidor. Para publicar, ative o GitHub Pages na branch `main` (pasta raiz).

## O que tem

- **Catálogo**: 96 aparelhos com busca, filtros por marca, faixa, preço e recursos, e 9 formas de ordenar.
- **Comparar**: até 4 aparelhos lado a lado, com silhuetas na mesma escala, vencedor por quesito e cerca de 50 linhas de ficha técnica.
- **Rankings**: os 8 melhores em nota geral, custo-benefício, câmera, desempenho, bateria, tela, autonomia medida e tempo de carga.
- **Marcas**: médias por marca, faixa de preço, política de atualização e presença no Brasil.
- **Preço × nota**: dispersão com a linha de nota esperada pelo preço.
- **Base de preço**: Brasil (R$) ou global (US$). Rankings, filtros e custo-benefício seguem a base escolhida.

## Dados

| Dado | Fonte |
|---|---|
| Ficha técnica, benchmarks, testes de bateria e notas de 0 a 100 | [NanoReview](https://nanoreview.net/en/phone-list/antutu-rating) |
| Menor preço atual no Brasil | [Oficina da Net](https://www.oficinadanet.com.br/smartphones) |
| Preço oficial de lançamento no Brasil | Tecnoblog, Canaltech, MacMagazine, Showmetech, Fast Company Brasil |
| Preço de lançamento em dólar | NanoReview, SamMobile, Droid Life |

Preços coletados em 10/10/2026, com o dólar a R$ 5,25.

### Limites conhecidos

- 44 dos 96 aparelhos têm preço no Brasil. Google, OnePlus e Nothing não vendem oficialmente no país, e vários modelos de Honor, Oppo, Vivo, Infinix, Tecno e Asus não tinham preço brasileiro publicado.
- O "menor preço atual" inclui marketplaces. Em Xiaomi e Poco ele costuma vir de vendedores importadores, bem abaixo do preço oficial.
- O preço em dólar de alguns modelos é uma conversão do preço de outro mercado feita pela fonte, então pode haver inversões, como um modelo "Pro" mais barato que o comum.
- Os aparelhos anunciados em setembro e outubro de 2026 ainda não têm teste de bateria nem brilho medido. As notas deles usam a ficha declarada.
- As ilustrações são esquemáticas. Elas seguem as proporções reais e a cor de cada aparelho, mas não são fotos.

## Como as leituras são calculadas

- **Rótulos**: 90 ou mais é Excelente, 80 a 89 Muito bom, 70 a 79 Bom, 55 a 69 Regular, abaixo de 55 Fraco.
- **Custo-benefício**: regressão linear da nota geral sobre o logaritmo do preço, na base escolhida. O valor mostrado é quantos pontos o aparelho fica acima ou abaixo da nota esperada para o preço dele.
- **Pontos fortes e fracos**: regras sobre a ficha (por exemplo, carga de 80 W ou mais, 6 anos ou mais de atualização, ausência de teleobjetiva em topo de linha). Estão na função `proscons` em `src/app.js`.

## Estrutura

```
index.html            página pronta, gerada pelo build
data/raw/phones.jsonl ficha bruta de cada aparelho
data/phones.json      base normalizada, gerada pelo build
scripts/build.py      normaliza os dados, aplica preços do Brasil e monta o index.html
src/                  body.html, styles.css e app.js
```

## Atualizar

1. Edite `data/raw/phones.jsonl` para incluir ou corrigir aparelhos.
2. Ajuste os preços do Brasil no dicionário `BR` e o câmbio em `USD_BRL`, em `scripts/build.py`.
3. Rode `python3 scripts/build.py`.
