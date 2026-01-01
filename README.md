# É Top? - Jogo de Festa

Uma aplicação web estática do jogo de festa **"É Top?"** - um jogo de trivia e apostas para 2 a 10 jogadores.

## 🎮 Como Jogar

### Objetivo
Seja o primeiro jogador a coletar **4 cartas** (pontos de vitória) ou seja o último jogador restante no jogo!

### Regras

1. **Início do Jogo**
   - Cada jogador começa com **4 vidas** (❤️) e **0 cartas** (🃏)
   - Os jogadores jogam em turnos no sentido horário
   - Cada rodada começa com o jogador **à esquerda de quem venceu o último ponto**

2. **Durante seu Turno**
   Você pode escolher:
   - **Adivinhar**: Tente nomear um item que está no Top 10
   - **Passar**: Fique seguro e não arrisque perder vidas (mas não pode ganhar a carta da rodada)
   - Ao passar, você está **fora da rodada** e **não pode desafiar**

3. **Sistema de Desafio**
   - Quando um jogador faz uma adivinhação, qualquer outro jogador pode **Desafiar**
   - O resultado do palpite **só é resolvido quando há desafio**
   - Se o palpite estiver **CORRETO**: O desafiante perde 1 vida e é removido da rodada
   - Se o palpite estiver **INCORRETO**: O adivinhador perde 1 vida e o desafiante ganha 1 carta
   - O Top 10 completo **só é revelado quando há desafio**

4. **Vencendo uma Rodada**
   - Desafie com sucesso um palpite incorreto
   - Seja o último jogador ativo quando todos os outros passaram ou foram eliminados
   - Se **todos passarem**, o **último jogador que palpitou** ganha a carta da rodada

5. **Eliminação**
   - Perder todas as 4 vidas elimina você do jogo

6. **Fim do Jogo**
   - Um jogador coleta 4 cartas, OU
   - Apenas um jogador permanece no jogo

## 🚀 Como Executar

### Opção 1: Abrir Localmente
1. Clone ou baixe este repositório
2. Abra o arquivo `index.html` em um navegador web moderno
3. Não requer servidor web ou instalação!

### Opção 2: GitHub Pages
1. Faça fork deste repositório
2. Vá em Settings > Pages
3. Selecione a branch principal como fonte
4. Acesse sua página em: `https://seu-usuario.github.io/ehtop/`

## 📁 Estrutura do Projeto

```
ehtop/
├── index.html          # Estrutura HTML principal
├── styles.css          # Estilos e design responsivo
├── game.js             # Lógica do jogo e gerenciamento de estado
├── questions.json      # Dados das perguntas (facilmente extensível)
└── README.md          # Esta documentação
```

## 🎨 Características

- ✅ Design responsivo (funciona em mobile e desktop)
- ✅ Interface colorida e divertida no estilo festa
- ✅ 5 perguntas de exemplo incluídas
- ✅ Sistema de pontuação visual (corações e cartas)
- ✅ Animações suaves e feedback visual
- ✅ Aplicação de página única (SPA)
- ✅ Totalmente estático - perfeito para GitHub Pages

## 🔧 Adicionando Novas Perguntas

Edite o arquivo `questions.json` para adicionar novos temas e perguntas:

```json
{
  "decks": [
    {
      "theme": "Nome do Tema",
      "questions": [
        {
          "id": 1,
          "category": "Descrição da categoria",
          "top10": [
            "Item 1",
            "Item 2",
            ...
            "Item 10"
          ]
        }
      ]
    }
  ]
}
```

## 🎯 Perguntas Incluídas

1. Especialidades de engenharia com mais graduados nos EUA
2. Animais terrestres mais altos
3. Atores de cinema que mais 'mataram' pessoas na tela
4. Jogos de tabuleiro mais vendidos da história
5. Países mais populosos do mundo

## 🌐 Compatibilidade

- Chrome, Firefox, Safari, Edge (versões modernas)
- Dispositivos móveis (iOS e Android)
- Tablets e Desktop

## 📝 Licença

Este projeto é de código aberto e está disponível para uso pessoal e educacional.

## 🎉 Divirta-se!

Reúna seus amigos e comece a jogar **É Top?**! Boa sorte! 🎲
