(() => {
"use strict";

/* ---------- Configuração ---------- */
const W = 1280, H = 720;            // 16:9, a mesma proporção da imagem de fundo e da tela do PC
const HUD_H = 118;                  // faixa de cima com a barra de cards
// Grade encaixada na terra da imagem de fundo (Fundo/fundo_do_jogo): começa depois da calçada do castelo
const G = { left:292, top:180, cw:100, ch:94, rows:5, cols:9 };
G.right = G.left + G.cw * G.cols;   // 1192 (daqui para a direita é a entrada dos monstros)
G.bottom = G.top + G.ch * G.rows;   // 650
/* DUAS_ARENAS: cada lado tem a sua arena e o seu castelo, ligadas por PORTOES (um em cada arena).
   No jogo, a arena do inimigo fica "longe" (vazio) para que ninguém ataque de uma arena para a outra. */
const CAMPO = { vazio: 1200 };
const MW = W * 2 + CAMPO.vazio;          // a arena do inimigo começa em W + vazio
const PORTAO_X = W - 48;                  // portão da arena da esquerda (no jogo); o da outra fica em MW - PORTAO_X
const PORTAO_INIMIGO = MW - G.left;       // portão do castelo do outro lado
const NUCLEO = { x: 150, y: 405 };   // portão do castelo: é o que os monstros atacam (a vida da barra de cima é a do castelo)
const LINHAS = "ABCDE";
const ATK = 1.0;                     // tempo entre golpes do Lodoso
const reduzMov = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Personagens com sprite sheet ----------
   Cada personagem tem sua pasta, e cada animação é um PNG com os quadros em grade
   (da esquerda para a direita, de cima para baixo).
   Para adicionar o ataque do Esqueleto: crie Esqueleto/atacando/atacando.png
   e descomente a linha "atacar" abaixo, ajustando cols, quadros e o tamanho do quadro. */
const PERSONAGENS = {
  esqueleto: {
    nome: "Esqueleto",
    desc: "Anda até o castelo e golpeia quem estiver na frente",
    cores: ["#dfe5f0", "#6f7c99"],   // fundo do retrato no card
    cor: "#e8dfc8",       // cor das partículas quando ele morre
    escala: 0.56,         // tamanho no campo
    velocidade: 34,       // pixels por segundo andando
    vida: 180,
    sons: {
      aparecer: "Esqueleto/som/esqueleto",  // sem extensão: o jogo tenta .mp3, .wav, .ogg e .m4a
      volume: 0.8,                          // de 0 a 1
      atacar: "Esqueleto/atacando/som",     // toca a cada golpe no guerreiro
      volumeAtacar: 0.7,                    // de 0 a 1
      morrer: "Esqueleto/morrendo/som",     // toca uma vez quando ele morre
      volumeMorrer: 0.8                     // de 0 a 1
    },
    anims: {
      andar: {
        src: "Esqueleto/andando/andando_1.png",
        cols: 8, quadros: 50,             // 8 por linha, 50 no total (7 linhas)
        cw: 1212, ch: 1708,               // tamanho de cada quadro (imagem grande, em alta resolução)
        ax: 635, ay: 1666,                // ponto dos pés dentro do quadro
        escala: 0.1138,                   // encolhe só esta animação (a folha é bem maior que as outras)
        fps: 23.5,                        // ajustado para o pé apoiado acompanhar o chão na velocidade 34
        olhaDireita: true
      },
      atacar: {                           // socos enquanto está parado em frente a um guerreiro (apague para voltar ao bote simples)
        src: "Esqueleto/atacando/atacando.png",
        cols: 8, quadros: 25,
        cw: 189, ch: 193,
        ax: 52, ay: 189,
        fps: 12,
        olhaDireita: true
      },
      morrer: {                           // queda ao perder toda a vida (apague este bloco para voltar ao tombo simples)
        src: "Esqueleto/morrendo/morrendo.png",
        cols: 8, quadros: 19,
        cw: 235, ch: 195,
        ax: 132, ay: 183,
        fps: 10,
        caido: 1.2,                       // segundos parado no chão antes de sumir
        olhaDireita: true
      },
    }
  },
  esqueletoFogo: {
    nome: "Esqueleto de Fogo",
    desc: "Mais forte e resistente, seus golpes queimam",
    cores: ["#ffd79a", "#b8431a"],
    cor: "#ff7a1e",
    escala: 0.47,          // a imagem nova é maior, então a escala é menor
    velocidade: 30,       // um pouco mais lento...
    vida: 240,            // ...porém mais resistente
    sons: {
      aparecer: "Esqueleto de Fogo/som/Esqueleto de fogo",  // toca uma vez quando ele entra
      volume: 0.8,
      ambiente: "Esqueleto de Fogo/som/fogo",  // fogo contínuo: um só para todos, enquanto houver algum vivo
      volumeAmbiente: 0.5,
      atacar: "Esqueleto de Fogo/socando/som",  // toca a cada golpe no guerreiro
      volumeAtacar: 0.7,
      morrer: "Esqueleto de Fogo/caindo/som",   // toca uma vez quando ele morre
      volumeMorrer: 0.8
    },
    dano: 35,             // e queima mais forte
    efeito: null,         // troque para "fogo" para ligar chamas no corpo, brasas e brilho no chão
    // pontos do corpo em cada quadro (x,y a partir dos pés), de onde as chamas nascem
    corpo: [
      [-56,-23,38,-77,20,-174,22,-49,5,-111,44,-72,-5,-156,13,-135,10,-123,2,-141,11,-162,22,-29,13,-53,-42,-65,17,-12,-18,-136,-20,-102,-9,-111,32,-86,-34,-153,37,-81,-30,-143,-5,-107,25,-166,39,-87,7,-147,-21,-172,46,-75,-31,-154,18,-154,-29,-45,-51,-61,-24,-164,-60,-64,-25,-113,-26,-96],
      [5,-58,-6,-72,-38,-66,-22,-46,-5,-162,39,-80,-48,-17,-25,-144,-33,-148,9,-123,42,-72,-7,-138,-46,-63,43,-72,42,-10,17,-123,10,-139,-13,-178,-24,-134,-50,-68,22,-75,-36,-35,-9,-110,-32,-156,-3,-123,-3,-147,-8,-99,18,-121,-59,-36,-11,-100,16,-41,11,-148,3,-61,-47,-20,22,-29,13,-39],
      [6,-149,-13,-92,9,-60,9,-139,7,-16,-4,-61,-5,-9,-4,-88,-31,-158,20,-168,14,-47,-16,-38,7,-140,-23,-54,1,-103,-12,-131,-16,-94,-21,-101,-10,-47,-7,-151,14,-172,-5,-8,-4,-143,-34,-13,-2,-75,8,-149,-18,-102,-2,-80,4,-37,-2,-135,-29,-163,7,-166,-3,-123,6,-168,7,-9,7,-61],
      [3,-146,15,-70,-5,-21,-2,-46,-5,-138,4,-108,-13,-68,17,-170,7,-124,9,-155,-15,-167,15,-162,-14,-137,-10,-11,-10,-67,-10,-38,14,-10,-16,-173,24,-169,3,-52,-6,-78,-8,-42,-15,-141,6,-178,-12,-12,-19,-141,12,-71,-23,-145,5,-175,15,-137,-15,-67,0,-121,-2,-166,-5,-26,8,-105,-18,-171],
      [14,-142,21,-14,-5,-121,-2,-158,17,-156,1,-95,-30,-147,19,-76,-20,-79,39,-20,18,-31,-14,-132,7,-125,24,-13,-26,-150,19,-157,6,-142,-4,-80,-19,-94,-13,-150,15,-162,4,-166,-3,-156,22,-20,-14,-135,29,-146,-19,-74,-10,-39,15,-49,23,-167,35,-14,20,-154,23,-13,-9,-2,-4,-136,15,-35],
      [-19,-91,-21,-97,-25,-10,2,-133,22,-153,23,-145,33,-8,2,-70,-9,-109,12,-169,20,-23,22,-48,12,-124,1,-175,17,-150,17,-133,-4,-102,30,-22,-18,-88,16,-40,10,-73,-13,-111,13,-54,-19,-159,2,-88,20,-32,-20,-144,-7,-91,11,-140,18,-151,-10,-70,19,-117,2,-154,12,-52,0,-107,30,-134],
      [-25,-130,15,-133,11,-29,2,-74,2,-158,-38,-39,-4,-48,5,-98,-2,-123,-17,-141,-21,-102,8,-168,-9,-158,13,-123,-14,-153,-1,-172,9,-94,-14,-141,-22,-108,-20,-142,25,-127,-3,-9,22,-126,2,-59,-22,-159,-18,-71,9,-91,0,-158,-1,-61,-13,-128,-4,-139,-11,-87,6,-24,-5,-74,-4,-122,2,-156],
      [-1,-48,-19,-92,-7,-5,1,-151,-11,-94,-18,-22,14,-76,-5,-176,-2,-144,-7,-97,-12,-152,-28,-107,14,-78,-12,-24,-14,-66,32,-67,-9,-62,25,-151,5,-153,18,-119,-14,-102,10,-136,6,-134,-14,-131,-36,-71,7,-147,-17,-106,-1,-45,-29,-156,18,-144,-8,-135,-36,-88,19,-144,-6,-133,5,-175,3,-121],
      [16,-165,4,-54,4,-32,4,-41,-14,-27,30,-75,14,-145,21,-125,17,-124,-2,-59,-38,-97,-37,-66,-13,-159,42,-66,-23,-162,-4,-60,-7,-96,-54,-64,-52,-70,-16,-111,-14,-70,-14,-69,-13,-155,17,-147,30,-10,-16,-9,-16,-92,16,-167,-18,-77,-8,-131,27,-12,-21,-162,29,-144,3,-100,31,-81,0,-157],
      [42,-81,31,-73,25,-83,-45,-74,-38,-10,-23,-72,-22,-113,-43,-73,48,-78,13,-153,-23,-165,-17,-166,-14,-135,16,-119,-9,-151,16,-125,-27,-140,-22,-37,-4,-68,3,-107,1,-46,-3,-175,22,-126,8,-130,0,-126,-15,-168,10,-145,6,-107,9,-170,-3,-128,-21,-142,-21,-169,-15,-104,-11,-142,24,-81,-27,-136],
      [21,-30,-41,-11,29,-142,-3,-62,-36,-21,25,-152,18,-79,-3,-108,19,-45,-22,-93,-29,-139,-20,-142,23,-74,-23,-151,20,-11,8,-123,-12,-107,8,-61,-8,-99,19,-84,-19,-131,-38,-24,26,-11,5,-102,-19,-164,-4,-109,2,-121,-1,-164,-15,-94,24,-149,-35,-36,-5,-62,-16,-57,49,-19,0,-98,-14,-84],
      [13,-154,28,-158,-3,-145,-2,-118,3,-122,0,-160,10,-10,2,-106,3,-62,0,-148,6,-54,-12,-8,-31,-158,-22,-104,9,-136,18,-135,2,-125,-9,-92,-2,-149,27,-137,-14,-168,-21,-66,-13,-94,7,-62,1,-44,-15,-106,4,-155,-8,-167,14,-151,10,-148,16,-137,24,-137,10,-7,-22,-6,9,-64,-10,-85],
      [-23,-76,-14,-32,14,-122,-15,-136,-13,-91,-24,-156,-2,-110,11,-67,11,-148,-15,-92,-13,-135,-12,-172,-16,-93,0,-133,-14,-61,-8,-158,8,-140,14,-154,-18,-177,8,-179,-13,-55,1,-126,19,-68,12,-43,17,-159,17,-126,-17,-64,9,-129,17,-54,12,-63,-21,-75,24,-135,-12,-88,-1,-5,12,-164,5,-107],
      [-19,-5,-17,-67,11,-57,20,-15,5,-70,18,-143,-17,-153,23,-49,12,-167,-29,-9,24,-38,-17,-100,28,-143,-6,-133,26,-157,31,-69,6,-90,21,-77,-18,-107,18,-137,-15,-167,-3,-68,5,-93,13,-150,16,-132,-8,-168,24,-157,-8,-163,39,-18,-20,-141,-20,-170,-34,-25,16,-169,7,-176,17,-158,-8,-84],
      [-12,-125,-13,-57,-41,-5,13,-167,-2,-162,-54,-10,-23,-43,-14,-92,24,-157,27,-144,-19,-156,-47,-10,14,-62,7,-162,-5,-103,-13,-53,22,-127,-6,-134,22,-140,22,-64,-4,-74,-3,-127,20,-127,-12,-98,8,-68,-11,-136,12,-125,-14,-62,-3,-82,-14,-139,-5,-120,20,-13,-49,-33,-9,-149,-23,-146,13,-164],
      [-17,-89,-24,-165,6,-136,-25,-133,-8,-56,-20,-170,14,-161,-38,-16,-10,-164,19,-8,22,-4,-3,-66,-24,-87,4,-110,-5,-152,6,-176,1,-169,8,-24,18,-158,9,-107,11,-20,-10,-102,-41,-44,-10,-85,-16,-37,-9,-152,-8,-77,14,-146,-39,-28,-41,-43,-9,-74,1,-174,14,-9,-17,-88,17,-121,-9,-66],
      [10,-157,18,-72,-26,-107,-5,-11,-9,-60,-31,-67,22,-163,-6,-158,-15,-35,24,-152,-3,-74,-13,-167,-19,-78,-11,-160,-15,-135,-13,-175,15,-173,0,-100,-18,-148,10,-152,-2,-160,-16,-157,3,-162,-15,-71,20,-128,-18,-89,27,-161,-36,-55,-17,-96,-26,-163,5,-142,-2,-168,-16,-111,-13,-37,-22,-109,10,-171],
      [0,-101,-16,-33,-6,-167,-45,-77,5,-171,31,-11,-11,-52,-7,-156,-5,-111,-13,-47,8,-89,-17,-3,-1,-69,0,-132,-31,-103,4,-176,-2,-166,28,-152,-4,-120,-34,-149,5,-84,-51,-82,7,-102,-20,-92,-34,-104,-25,-112,-13,-46,-11,-103,-51,-84,2,-152,-9,-152,8,-33,26,-131,10,-104,-7,-86,-20,-137],
      [-25,-154,0,-125,-17,-154,-10,-135,29,-133,-28,-158,-10,-102,-7,-171,35,-73,-27,-132,-16,-96,-40,-18,-14,-137,-47,-26,-28,-42,-1,-162,34,-84,-4,-156,-3,-167,10,-13,-4,-123,-10,-100,5,-101,1,-110,12,-135,-10,-74,-55,-72,17,-153,0,-171,47,-85,2,-146,-26,-39,11,-153,-11,-145,18,-127,3,-53],
      [-9,-111,-19,-98,-13,-137,-4,-14,-38,-64,9,-168,6,-91,-5,-23,-24,-157,3,-41,-38,-69,1,-119,24,-7,-32,-41,-22,-36,-21,-37,-23,-160,-11,-159,25,-163,13,-152,-17,-99,1,-136,4,-136,7,-139,-18,-68,11,-9,-10,-70,12,-138,20,-135,27,-144,-22,-98,-3,-47,8,-157,3,-42,-6,-32,-34,-72],
      [2,-84,-14,-70,9,-98,7,-97,14,-59,-17,-165,-2,-94,20,-147,-16,-88,0,-162,-10,-134,10,-164,19,-167,-8,-161,-19,-87,5,-94,3,-155,13,-152,-13,-86,-20,-70,-4,-41,7,-163,5,-95,28,-150,-9,-77,-15,-27,26,-150,2,-79,-8,-134,21,-145,-4,-94,-29,-166,11,-129,2,-125,28,-164,-13,-149],
      [-1,-114,5,-100,10,-147,-19,-49,27,-156,9,-158,-4,-126,20,-76,1,-143,-14,-11,11,-17,-10,-140,15,-58,-32,-13,-18,-141,22,-170,-25,-13,-24,-98,6,-79,15,-54,-21,-48,-38,-17,5,-139,-13,-58,-29,-24,36,-13,-11,-164,25,-139,-11,-74,19,-157,-29,-144,12,-159,23,-168,14,-132,2,-95,-28,-43],
      [-6,-79,26,-138,16,-117,-17,-66,-10,-132,33,-20,-3,-134,16,-163,-34,-10,0,-83,12,-138,-36,-16,-16,-63,-20,-132,-7,-75,-8,-139,-13,-150,-14,-130,4,-73,13,-77,-15,-149,1,-102,-7,-140,-23,-167,29,-74,13,-170,-21,-100,6,-158,31,-84,23,-152,21,-21,4,-70,-25,-55,13,-128,23,-85,9,-126],
      [-18,-87,-1,-154,0,-77,-5,-69,-14,-78,-8,-127,12,-55,-7,-89,-2,-132,9,-150,-8,-173,-21,-166,27,-129,-17,-107,-17,-163,-2,-147,7,-89,2,-117,15,-59,14,-169,2,-71,17,-122,-18,-36,29,-133,11,-123,-44,-32,-17,-134,7,-4,-44,-17,14,-11,13,-75,-9,-47,-2,-152,21,-12,13,-140,16,-8],
      [8,-93,6,-69,13,-139,7,-13,-21,-78,-16,-115,18,-163,5,-140,16,-152,9,-145,5,-132,10,-133,6,-104,15,-131,3,-92,-36,-13,0,-33,-1,-125,-16,-136,-28,-162,28,-151,5,-9,-23,-81,-44,-22,-10,-142,-34,-17,-6,-164,-21,-130,-1,-92,-24,-79,-15,-140,19,-123,6,-110,-7,-65,29,-131,-20,-132],
      [23,-75,3,-139,8,-109,-5,-143,5,-101,-28,-163,-10,-32,-28,-108,10,-145,1,-71,16,-161,-38,-84,8,-157,-23,-154,3,-127,6,-132,39,-72,-2,-110,-28,-134,4,-135,-14,-73,28,-135,-49,-59,-17,-151,15,-145,-1,-3,-39,-56,1,-51,8,-95,-20,-7,-11,-173,-7,-3,-7,-53,-39,-62,20,-82,-27,-5],
      [44,-89,-23,-149,29,-155,20,-10,-14,-53,13,-95,43,-68,-42,-96,-16,-64,28,-20,34,-76,48,-77,4,-85,-5,-162,27,-128,42,-19,22,-160,-5,-116,-46,-99,-9,-105,-1,-101,2,-124,27,-129,27,-10,-26,-107,32,-16,10,-146,-26,-161,-29,-159,-20,-74,-52,-73,11,-157,-37,-13,-42,-101,-15,-165,13,-101],
      [6,-85,-17,-114,-4,-69,-55,-59,-8,-173,-47,-71,-8,-55,-12,-77,-17,-110,42,-74,7,-144,-5,-121,18,-76,21,-134,18,-162,44,-67,-37,-19,-40,-31,9,-100,-29,-15,40,-78,26,-150,20,-122,-4,-63,13,-92,-7,-103,6,-158,32,-8,-39,-9,-26,-8,-16,-164,10,-39,30,-76,-17,-100,-12,-133,6,-98],
      [11,-164,-15,-83,-10,-47,-8,-168,-1,-153,-8,-92,-12,-166,-31,-21,9,-161,23,-70,-4,-106,16,-154,-6,-145,10,-139,-21,-44,-14,-108,-31,-81,-32,-85,-8,-97,-6,-127,-33,-45,-16,-95,-4,-163,-16,-66,-11,-63,-31,-77,-32,-86,-24,-109,10,-153,8,-137,7,-97,-21,-37,-5,-111,-28,-62,-16,-154,11,-69],
      [3,-181,1,-145,-7,-152,-5,-151,17,-145,-8,-16,-5,-104,-18,-170,19,-167,-16,-39,23,-153,-10,-177,-16,-15,-4,-167,-7,-94,5,-110,-16,-144,30,-156,-16,-12,7,-55,19,-132,12,-156,-6,-131,-21,-113,-17,-172,11,-137,-34,-153,-12,-37,-32,-151,-15,-106,22,-157,-13,-82,-22,-158,13,-177,9,-52,5,-58],
      [15,-26,-20,-81,11,-81,36,-22,-24,-97,-19,-144,10,-154,-8,-174,24,-140,27,-85,3,-77,28,-142,-1,-72,-24,-57,6,-106,-18,-52,-20,-72,-5,-160,14,-175,-2,-77,1,-108,-7,-69,-42,-11,39,-16,13,-146,1,-85,14,-143,30,-134,16,-84,15,-33,-17,-89,9,-105,-21,-4,1,-144,24,-51,0,-172],
      [-28,-40,-6,-62,-24,-160,-11,-128,-42,-13,-23,-68,10,-81,-34,-7,16,-8,-22,-92,24,-19,15,-129,47,-13,-27,-142,-4,-79,-16,-134,14,-42,17,-145,18,-143,37,-7,12,-140,-15,-87,-6,-139,24,-143,4,-100,19,-15,-12,-109,16,-39,27,-130,13,-144,29,-149,7,-76,-8,-84,27,-23,25,-70,-1,-88],
      [3,-132,22,-138,20,-122,15,-154,2,-86,19,-9,9,-153,-25,-38,-10,-162,-17,-54,-8,-174,9,-52,28,-150,-26,-152,24,-125,-14,-165,-21,-138,-19,-45,-5,-64,17,-65,-23,-88,-54,-37,-3,-147,-17,-143,12,-11,13,-24,28,-131,2,-71,2,-115,-9,-73,-44,-38,-10,-156,-1,-167,-47,-11,-21,-48,10,-10],
      [24,-4,-17,-165,3,-90,-2,-95,-5,-125,18,-4,9,-92,-5,-7,13,-171,-5,-87,-33,-87,-38,-38,20,-10,-34,-35,-6,-175,-23,-96,-8,-135,-10,-109,7,-72,-1,-93,17,-155,-27,-76,-27,-92,7,-4,-21,-95,16,-56,20,-158,-4,-131,-25,-81,29,-137,1,-12,25,-151,8,-170,-26,-16,16,-162,-25,-90],
      [-6,-89,-5,-151,-40,-59,-39,-64,-41,-61,12,-84,-4,-146,-5,-28,-25,-137,-7,-19,-36,-101,-48,-71,-8,-37,-18,-91,11,-141,11,-99,-6,-110,23,-159,7,-155,-9,-78,-18,-89,-12,-66,-2,-12,-9,-27,-17,-14,-3,-6,5,-149,-39,-89,-33,-104,-10,-137,-13,-28,-14,-161,14,-157,-16,-166,30,-73,39,-79],
      [-19,-76,-16,-52,-41,-90,-5,-69,-13,-161,0,-105,-11,-142,1,-166,-33,-141,-57,-75,16,-85,-42,-70,1,-114,-25,-16,8,-171,-46,-86,-1,-111,14,-146,27,-132,2,-127,10,-33,-26,-44,-4,-176,-14,-56,-46,-18,11,-25,20,-137,-2,-153,-17,-11,25,-14,-18,-134,-17,-171,-17,-169,19,-11,17,-166,-15,-107],
      [-26,-39,-39,-73,11,-97,21,-132,-46,-58,-12,-173,-6,-53,17,-131,-24,-136,0,-74,11,-85,-26,-161,-25,-139,-14,-63,12,-6,2,-165,-6,-124,-4,-171,8,-14,12,-129,27,-132,35,-68,24,-154,-12,-131,-6,-152,-16,-114,8,-165,1,-140,-17,-94,9,-161,-44,-57,-33,-150,-8,-141,42,-76,-36,-85,39,-80],
      [-31,-21,15,-144,22,-153,-10,-113,-1,-11,-1,-56,-15,-59,13,-156,19,-154,-24,-33,-25,-69,-9,-23,12,-172,-27,-20,-12,-98,-19,-90,3,-7,16,-151,-3,-44,-23,-55,-15,-143,18,-151,-4,-178,-16,-165,3,-138,-26,-29,-1,-116,12,-130,-9,-107,-35,-27,1,-13,-12,-81,-10,-27,9,-166,-5,-10,11,-158],
      [-33,-153,-1,-63,12,-42,-20,-20,-21,-162,22,-168,-25,-100,-25,-17,-17,-138,4,-99,2,-154,-8,-167,6,-142,13,-171,-21,-99,0,-93,2,-123,24,-162,-36,-11,2,-180,0,-104,-24,-135,-5,-110,4,-30,-16,-13,16,-20,13,-22,16,-51,-35,-13,9,-110,18,-145,-1,-25,-11,-176,-8,-88,-10,-27,-14,-146],
      [-4,-123,16,-42,-37,-17,-19,-74,48,-17,-2,-170,-28,-139,33,-19,5,-59,0,-72,3,-109,25,-77,24,-10,12,-156,-6,-122,2,-107,-42,-11,20,-130,-40,-11,23,-78,-12,-152,25,-162,-7,-159,-17,-128,2,-136,-29,-40,-39,-12,11,-130,16,-155,8,-174,23,-83,-15,-89,-22,-79,25,-127,35,-18,9,-143]
    ],
    // altura do topo do crânio em cada um dos 40 quadros, para as chamas acompanharem o balanço
    cabeca: [-182,-181,-178,-180,-177,-176,-176,-179,-177,-177,-177,-181,-182,-177,-174,-177,-179,-177,-176,-178,-182,-180,-176,-175,-178,-178,-178,-176,-181,-182,-179,-175,-176,-179,-178,-177,-177,-181,-182,-177],
    anims: {
      andar: {
        src: "Esqueleto de Fogo/andando/andando.png",
        cols: 8, quadros: 40, cw: 175, ch: 248, ax: 85, ay: 241,
        fps: 15.2,                        // ajustado para o pé apoiado acompanhar o chão na velocidade 30
        olhaDireita: true
      },
      atacar: {                           // soco de fogo enquanto está parado em frente a um guerreiro (apague para voltar ao bote simples)
        src: "Esqueleto de Fogo/socando/esqueleto_de_fogo_socando.png",
        cols: 8, quadros: 60,             // 8 por linha, 60 no total (todos os quadros enviados)
        cw: 160, ch: 236,
        ax: 75, ay: 233,
        fps: 40,                          // 60 quadros em 1,5 segundo (um soco completo)
        olhaDireita: true
      },
      morrer: {                           // queda ao perder toda a vida (apague este bloco para voltar ao tombo simples)
        src: "Esqueleto de Fogo/caindo/caindo_esqueleto_de_fogo.png",
        cols: 13, quadros: 150,           // 13 por linha, 150 no total (todos os quadros enviados)
        cw: 474, ch: 270,
        ax: 236, ay: 260,
        fps: 24,                          // 150 quadros em ~6 segundos
        caido: 0.3,                       // segundos parado no último quadro antes de sumir
        olhaDireita: true
      },
    }
  },
  esqueletoArqueiro: {
    nome: "Esqueleto Arqueiro",
    desc: "Para de longe e atira flechas nos guerreiros",
    cores: ["#dcebc9", "#5d7a48"],
    cor: "#e8dfc8",
    escala: 0.58,
    velocidade: 26,       // mais lento que o Esqueleto comum
    vida: 150,            // mais frágil: ele ataca de longe
    dano: 20,             // dano de cada flecha
    sons: {
      aparecer: "Esqueleto/som/esqueleto", volume: 0.8,   // por enquanto usa o som do Esqueleto; troque por "Esqueleto Arqueiro/som/..." quando tiver um próprio
      tiro: "Planta/som/tiro", volumeTiro: 0.4,           // som de cada flecha que ele solta
      morrer: "Esqueleto/morrendo/som", volumeMorrer: 0.8 // por enquanto o do Esqueleto; troque por "Esqueleto Arqueiro/morrendo/som"
    },
    tiro: {
      alcance: 360,       // para de andar e atira quando um guerreiro está a até 360 px (umas 3 casas e meia) na linha dele
      velocidade: 520,    // velocidade da flecha (pixels por segundo)
      intervalo: 0.4,     // pausa entre um disparo e outro (segundos)
      saidaX: 45, saidaY: -72   // de onde a flecha sai, a partir dos pés (mão do arco)
    },
    anims: {
      andar: {           // 120 quadros = 4 ciclos de passos, emendando sem pulo
        src: "Esqueleto Arqueiro/andando/andando.png",
        cols: 8, quadros: 120,
        cw: 161, ch: 190, ax: 71, ay: 188,
        fps: 12,          // ajustado para o pé apoiado acompanhar o chão na velocidade 26
        olhaDireita: true
      },
      atacar: {           // pega a flecha, mira, solta e abaixa o arco
        src: "Esqueleto Arqueiro/atirando/atirando.png",
        cols: 8, quadros: 151,
        cw: 176, ch: 202, ax: 66, ay: 200,
        fps: 34,          // 151 quadros: uns 4,4 s por disparo (aumente para ele atirar mais rápido)
        quadroTiro: 104,  // a flecha sai no quadro 105 da folha (contando a partir de 1)
        olhaDireita: true
      },
      morrer: {           // usa a MESMA queda do Esqueleto comum (a mesma imagem, sem cópia)
        src: "Esqueleto/morrendo/morrendo.png",
        cols: 8, quadros: 19,
        cw: 235, ch: 195,
        ax: 132, ay: 183,
        fps: 10,
        caido: 1.2,       // segundos parado no chão antes de sumir
        escala: 0.966,    // corrige a diferença de tamanho (0.56 do Esqueleto ÷ 0.58 deste) para cair do mesmo tamanho
        olhaDireita: true
      }
    }
  },
  esqueletoProtetor: {
    nome: "Esqueleto Protetor",
    desc: "Anda de escudo erguido e bloqueia metade do dano",
    cores: ["#d9dfea", "#4b5a78"],
    cor: "#e8dfc8",
    escala: 0.61,
    velocidade: 24,       // o mais lento dos esqueletos
    vida: 320,
    dano: 20,
    escudo: {             // o escudo fica na frente dele: todo golpe e flecha de guerreiro bate nele
      defesa: 0.5,        // bloqueia 50% do dano (0.7 = bloqueia 70%)
      x: 15, y: -52,      // centro do escudo a partir dos pés, em pixels do jogo (x = para a frente)
      raio: 26            // tamanho do brilho e da onda de choque quando ele é atingido
    },
    sons: {
      aparecer: "Esqueleto/som/esqueleto", volume: 0.8,
      escudo: "Esqueleto Protetor/som/escudo", volumeEscudo: 0.8,   // metal: golpe batendo no escudo
      atacar: "Esqueleto Protetor/som/golpe", volumeAtacar: 0.7,    // cada golpe dele no guerreiro
      morrer: "Esqueleto/morrendo/som", volumeMorrer: 0.8
    },
    anims: {
      andar: {            // 35 quadros, emendam sem pulo
        src: "Esqueleto Protetor/andando/andando.png",
        cols: 8, quadros: 35,
        cw: 135, ch: 189, ax: 76, ay: 188,
        fps: 16,
        olhaDireita: true
      },
      atacar: {           // soco com o escudo de lado, quando um guerreiro está logo à frente (151 quadros)
        src: "Esqueleto Protetor/socando/socando.png",
        cols: 8, quadros: 151, cw: 229, ch: 190, ax: 88, ay: 188,
        fps: 44,
        quadroGolpe: 52,  // o soco acerta neste quadro (contando do 0): o dano sai junto com o movimento
        olhaDireita: true
      },
      morrer: {           // mesma queda do Esqueleto comum
        src: "Esqueleto/morrendo/morrendo.png",
        cols: 8, quadros: 19,
        cw: 235, ch: 195, ax: 132, ay: 183,
        fps: 10, caido: 1.2,
        escala: 0.918,    // 0.56 do Esqueleto ÷ 0.61 deste, para cair do mesmo tamanho
        olhaDireita: true
      }
    }
  },
  esqueletoMago: {
    nome: "Esqueleto Mago",
    desc: "Para de longe, lança magia e invoca esqueletos do chão",
    cores: ["#d8ccf5", "#4a2f7a"],
    cor: "#e8dfc8",
    escala: 0.58,
    velocidade: 22,
    vida: 300,
    dano: 35,             // dano de cada magia que acerta um guerreiro
    necro: {
      paraNaColuna: 7,    // anda uma vez só: para nesta coluna (ou antes, se um guerreiro já estiver ao alcance)
      alcance: 520,       // distância em que ele já para se enxergar um guerreiro na linha
      intervalo: 0.8,     // pausa entre um feitiço e outro (segundos)
      tirosParaInvocar: 5,// a cada 5 magias, invoca mais esqueletos
      invoca: "esqueleto",// qual monstro sai da terra
      quantos: 3,         // quantos esqueletos por invocação: na coluna à frente dele, linha de cima, a dele e a de baixo
      velocidade: 380,    // velocidade da magia
      saidaX: 53, saidaY: -59,   // de onde a magia sai (a mão), a partir dos pés
      estilo: "sombra",   // cores da magia
      brilhoCajado: { x: -37, y: -93, raio: 14 }   // orbe do cajado pulsando enquanto ele espera parado
    },
    sons: {
      aparecer: "Esqueleto/som/esqueleto", volume: 0.8,
      morrer: "Esqueleto/morrendo/som", volumeMorrer: 0.8,
      magia: "Esqueleto Mago/som/magia", volumeMagia: 0.7,        // cada feitiço
      invocar: "Esqueleto Mago/som/invocar", volumeInvocar: 0.8,  // esqueletos saindo da terra
      impacto: "Esqueleto Mago/som/explosao", volumeImpacto: 0.6  // feitiço acertando o guerreiro
    },
    anims: {
      parado: {           // pose parada (sem guerreiro na linha e depois de cada ataque), respirando de leve
        src: "Esqueleto Mago/parado/parado.png",
        cols: 8, quadros: 12, cw: 150, ch: 201, ax: 57, ay: 199,
        fps: 8, olhaDireita: true
      },
      andar: {            // 82 quadros (33 a 114 da folha), emendam sem pulo
        src: "Esqueleto Mago/andando/andando.png",
        cols: 8, quadros: 82, cw: 200, ch: 206, ax: 91, ay: 204,
        fps: 20, olhaDireita: true
      },
      atacar: {           // 151 quadros: junta a magia no cajado e lança; a magia sai no quadro 95
        src: "Esqueleto Mago/atirando/atirando.png",
        cols: 8, quadros: 151, cw: 299, ch: 204, ax: 160, ay: 200,   // pés travados no mesmo lugar em todos os quadros
        fps: 40, quadroTiro: 94, olhaDireita: true
      },
      morrer: {           // mesma queda do Esqueleto comum
        src: "Esqueleto/morrendo/morrendo.png",
        cols: 8, quadros: 19, cw: 235, ch: 195, ax: 132, ay: 183,
        fps: 10, caido: 1.2, escala: 0.966, olhaDireita: true
      }
    }
  },
  esqueletoTita: {
    nome: "Esqueleto Titã", nomeCurto: "Titã",
    desc: "Gigante: soca o chão e ergue ossos na linha, e luta com quem chega perto",
    cores: ["#e6ddc8", "#5a4636"],
    cor: "#e8dfc8",
    escala: 0.89,          // bem maior que os outros esqueletos (do tamanho do Cavaleiro Sentinela)
    velocidade: 30,        // passos pesados mas naturais. Para o pé não escorregar: velocidade = fps do "andar" x 2,76
    vida: 1500,
    dano: 70,
    barraY: 190,           // altura da barra de vida (ele é alto)
    danoCastelo: 40,       // Titã comum invadindo tira 40 de vida (os outros tiram 10). Se for o CHEFÃO do nível, é game over
    tita: {
      alcance: 120,        // luta com os guerreiros até ~1 casa e pouco à frente
      danoLuta: 70,        // dano de cada golpe da luta (acerta todos que estão perto)
      quadrosGolpe: [39, 104],  // os dois socos da folha "lutando" (contam do 0): cada um acerta quem está perto
      minimoOssos: 4,      // com 4 ou mais guerreiros na linha (mais de 3), soca o chão
      danoOssos: 80,       // dano de cada onda de ossos em cada guerreiro da linha
      quadrosImpacto: [42, 115],  // os dois socos no chão (contam do 0): cada um solta uma onda de ossos
      velocidadeOssos: 600,// velocidade da onda de ossos (pixels por segundo)
      recargaOssos: 7,     // espera mínima entre um soco no chão e outro (segundos)
      // enquanto as folhas de ataque não existem, ele usa movimentos simples com estes tempos (em quadros a 10 por segundo)
      reserva: { soco: { quadros: 14, impacto: 7 }, luta: { quadros: 12, golpes: [6] } },
      passosPorCiclo: 6    // quantos passos há num ciclo inteiro da folha "andando" (para o som de passo)
    },
    sons: {
      aparecer: "Esqueleto/som/esqueleto", volume: 0.9,
      golpe: "Esqueleto Tita/som/soco", volumeGolpe: 0.9,     // cada soco da luta
      ossos: "Esqueleto Tita/som/ossos", volumeOssos: 0.9,    // soco no chão (onda de ossos)
      passos: "Esqueleto Tita/som/passo", volumePassos: 0.5,  // cada passo pesado
      morrer: "Esqueleto/morrendo/som", volumeMorrer: 0.9     // por enquanto o do Esqueleto; troque por "Esqueleto Tita/morrendo/som"
    },
    anims: {
      andar: {            // 126 quadros (24 a 149 da folha), emendam sem pulo
        src: "Esqueleto Tita/andando/andando.png",
        cols: 8, quadros: 126, cw: 167, ch: 205, ax: 93, ay: 203,
        fps: 11,          // casado com a velocidade: o pé apoiado acompanha o chão (11 x 2,76 = 30)
        olhaDireita: true
      },
      // quando você mandar as outras folhas, é só colocar nestas pastas (o jogo já procura por elas):
      socar: {            // 2º PNG: soca o chão duas vezes (cada soco solta uma onda de ossos) — 151 quadros
        src: "Esqueleto Tita/socando no chao/socando_no_chao.png",
        cols: 8, quadros: 151, cw: 160, ch: 181, ax: 79, ay: 173, fps: 36,
        escala: 1.154,    // folha montada um pouco menor (pesa menos); aqui volta ao tamanho da caminhada
        olhaDireita: true, opcional: true
      },
      lutar: {            // 3º PNG: dois socos para a frente com clarão — 151 quadros
        src: "Esqueleto Tita/lutando/lutando.png",
        cols: 8, quadros: 151, cw: 258, ch: 184, ax: 93, ay: 180, fps: 38,
        escala: 1.154,
        olhaDireita: true, opcional: true
      },
      morrer: {           // por enquanto, a queda do Esqueleto comum (aumentada para o tamanho dele)
        src: "Esqueleto/morrendo/morrendo.png",
        cols: 8, quadros: 19, cw: 235, ch: 195, ax: 132, ay: 183,
        fps: 9, caido: 1.4, escala: 1.07, olhaDireita: true
      }
    }
  }
};
for (const id in PERSONAGENS) {
  for (const nomeAnim in PERSONAGENS[id].anims) {
    const s = PERSONAGENS[id].anims[nomeAnim];
    s.img = new Image();
    s.ok = false;
    s.img.onload = () => { s.ok = true; };
    s.img.onerror = () => { if (!s.opcional) registrar("sistema", `Não encontrei ${s.src}. Confira o nome da pasta e do arquivo.`, false); };
    s.img.src = s.src;
  }
}
/* ---------- Sons ---------- */
const EXT_AUDIO = [".mp3", ".wav", ".ogg", ".m4a"];
let somLigado = true;
const SONS_CACHE = {}, SONS_FALTANDO = [];
let avisoSonsT = 0;
function carregarSom(caminho) {
  if (SONS_CACHE[caminho]) return SONS_CACHE[caminho];      // o mesmo arquivo usado por vários personagens carrega uma vez só
  const som = { ok: false, src: null, ultimo: 0 };
  SONS_CACHE[caminho] = som;
  const lista = /\.(mp3|wav|ogg|m4a)$/i.test(caminho) ? [caminho] : EXT_AUDIO.map(e => caminho + e);
  const tentar = i => {
    if (i >= lista.length) {
      // som que ainda não existe: junta todos num aviso só (a lista completa fica no Console, tecla F12)
      SONS_FALTANDO.push(caminho);
      clearTimeout(avisoSonsT);
      avisoSonsT = setTimeout(() => {
        registrar("sistema", `Faltam ${SONS_FALTANDO.length} arquivos de som. Quem não tem arquivo fica em silêncio nessa ação (lista: F12 > Console).`, false);
        console.log("Sons que ainda faltam (coloque o arquivo com este nome, em .mp3, .wav, .ogg ou .m4a):\n" + SONS_FALTANDO.join("\n"));
      }, 1500);
      return;
    }
    const a = new Audio();
    a.preload = "auto";
    a.addEventListener("canplay", () => { if (!som.ok) { som.ok = true; som.src = a.src; } }, { once: true });
    a.addEventListener("error", () => tentar(i + 1), { once: true });
    a.src = lista[i];
    a.load();
  };
  tentar(0);
  return som;
}
// Toca o som "chave" de um personagem (ex.: "golpe", "morrer"); o volume vem de "volumeGolpe", "volumeMorrer"...
function somPersonagem(obj, chave, volPadrao = 0.8, intervaloMs = 80, variacao = 0.05) {
  const s = obj && obj.sonsC && obj.sonsC[chave];
  if (!s) return;
  const vk = "volume" + chave[0].toUpperCase() + chave.slice(1);
  tocar(s, obj.sons[vk] ?? volPadrao, intervaloMs, variacao);
}
function carregarSonsDe(obj) {          // carrega todos os sons listados em "sons" (os de volume são ignorados)
  obj.sonsC = {};
  for (const k in obj.sons || {}) if (typeof obj.sons[k] === "string") obj.sonsC[k] = carregarSom(obj.sons[k]);
}
setTimeout(() => { carregarSonsDe(CASTELO); carregarSonsDe(SOM_FUSAO); }, 0);
function tocar(som, volume = 0.8, intervaloMs = 150, variacao = 0) {
  if (!somLigado || !som || !som.ok) return;
  const agora = performance.now();
  if (agora - som.ultimo < intervaloMs) return;   // evita vários sons idênticos no mesmo instante
  som.ultimo = agora;
  const a = new Audio(som.src);            // um áudio novo por vez, para poderem se sobrepor
  a.volume = Math.max(0, Math.min(1, volume));
  if (variacao) { a.preservesPitch = false; a.playbackRate = 1 + (Math.random() * 2 - 1) * variacao; } // cada tiro soa um pouco diferente
  a.play().catch(() => {});                // o navegador só libera som depois do primeiro clique ou tecla
}
/* Sons gerais do jogo */
const SONS_JOGO = {
  musica:     { src: "som game/game",    volume: 0.35 },  // música de fundo em loop
  tiroPlanta: { src: "Planta/som/tiro",  volume: 0.35 },  // cada espinho disparado
  proximoNivel: { src: "Jogo/som/proximo nivel", volume: 0.9 }   // quando termina um nível e vai para o próximo
};
for (const k in SONS_JOGO) SONS_JOGO[k].som = carregarSom(SONS_JOGO[k].src);

// Controla um som em loop com entrada e saída suaves. alvo = volume desejado (0 = parar).
function controlarLoop(obj, som, alvo, dt, velEntrada = 1.6, velSaida = 2.5) {
  if (!som || !som.ok) return;
  if (!obj.audio) { obj.audio = new Audio(som.src); obj.audio.loop = true; obj.audio.volume = 0; obj.vol = 0; obj.prox = 0; }
  const passo = dt * (alvo > obj.vol ? velEntrada : velSaida);
  obj.vol += Math.max(-passo, Math.min(passo, alvo - obj.vol));
  obj.audio.volume = Math.max(0, Math.min(1, obj.vol));
  if (alvo > 0 && obj.audio.paused && performance.now() > obj.prox) {
    obj.prox = performance.now() + 500;   // se o navegador bloquear, tenta de novo em meio segundo
    obj.audio.play().catch(() => {});
  }
  if (alvo === 0 && obj.vol <= 0.001 && !obj.audio.paused) obj.audio.pause();
}
const loopMusica = {};

for (const id in PERSONAGENS) {
  const per = PERSONAGENS[id];
  carregarSonsDe(per);
  if (per.sons && per.sons.aparecer) per.somAparecer = carregarSom(per.sons.aparecer);
  if (per.sons && per.sons.ambiente) per.somAmbiente = carregarSom(per.sons.ambiente);
  if (per.sons && per.sons.atacar) per.somAtacar = carregarSom(per.sons.atacar);
  if (per.sons && per.sons.morrer) per.somMorrer = carregarSom(per.sons.morrer);
  if (per.sons && per.sons.tiro) per.somTiro = carregarSom(per.sons.tiro);
  if (per.sons && per.sons.escudo) per.somEscudo = carregarSom(per.sons.escudo);
  if (per.sons && per.sons.magia) per.somMagia = carregarSom(per.sons.magia);
  if (per.sons && per.sons.invocar) per.somInvocar = carregarSom(per.sons.invocar);
}

// Som contínuo (em loop) de cada tipo de personagem: toca UMA vez só, não importa quantos existam.
// Liga quando o primeiro aparece e desliga, com fade, quando não sobra nenhum vivo.
function atualizarAmbientes(dt) {
  // música de fundo: toca durante a partida, para na pausa, no fim e com o som desligado
  const musica = SONS_JOGO.musica;
  controlarLoop(loopMusica, musica.som, somLigado && !pausado && !fim ? musica.volume : 0, dt, 0.8, 2.5);
  // som contínuo de cada personagem (ex.: fogo): um só, enquanto houver algum vivo
  for (const id in PERSONAGENS) {
    const per = PERSONAGENS[id];
    if (!per.somAmbiente) continue;
    per.loopObj = per.loopObj || {};
    const presente = somLigado && !pausado && !fim && criaturas.some(c => c.tipo === id && !c.morte);
    controlarLoop(per.loopObj, per.somAmbiente, presente ? (per.sons.volumeAmbiente ?? 0.5) : 0, dt);
  }
}

const prontos = () => Object.keys(PERSONAGENS).filter(id => PERSONAGENS[id].anims.andar.ok);

const C = {
  ink:"#2b2030", stem:"#3f9a4f", leaf:"#5cc466", leafDark:"#3e8f4c",
  bulb:"#8d52c7", bulbLight:"#b58ae3", spike:"#f2c14e", blush:"#ff8fb1",
  mud:"#85684b", mudDark:"#5f4a36", moss:"#8db04c", bone:"#eadfc7", eye:"#ffd34d"
};

/* ---------- Partes dos personagens (caminhos SVG) ---------- */
const circ = r => `M${-r} 0 A${r} ${r} 0 1 0 ${r} 0 A${r} ${r} 0 1 0 ${-r} 0 Z`;
const P = {
  // Cardo-Flecha (planta)
  stem:  new Path2D("M-5 0 C-9 -20 -6 -40 -3 -58 L4 -58 C1 -40 0 -20 5 0 Z"),
  leaf:  new Path2D("M0 0 C-10 -15 -30 -17 -42 -6 C-29 5 -12 6 0 0 Z"),
  vein:  new Path2D("M-2 -1 Q-20 -7 -36 -6"),
  bulb:  new Path2D(circ(23)),
  shine: new Path2D("M-14 -8 C-13 -15 -6 -19 1 -18 C-5 -15 -10 -11 -14 -8 Z"),
  collar:new Path2D("M-17 14 L-11 25 L-5 16 L1 27 L6 16 L12 25 L17 13 C8 20 -8 20 -17 14 Z"),
  spikes:(() => {
    let d = "";
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * 0.93 + i * (Math.PI * 0.86 / (n - 1)), w = 0.2;
      const pt = (ang, r) => `${(Math.cos(ang) * r).toFixed(1)} ${(Math.sin(ang) * r).toFixed(1)}`;
      d += `M${pt(a - w, 18)} L${pt(a, 37)} L${pt(a + w, 18)} Z `;
    }
    return new Path2D(d);
  })(),
  thorn: new Path2D("M16 0 L-6 -4.5 L-12 0 L-6 4.5 Z"),
  // Lodoso (criatura)
  body:  new Path2D("M-30 -14 C-36 -50 -22 -86 2 -86 C26 -86 36 -54 32 -14 C24 -4 -22 -4 -30 -14 Z"),
  moss:  new Path2D("M-20 -78 C-12 -92 14 -94 24 -79 C16 -74 9 -81 1 -75 C-6 -80 -12 -74 -20 -78 Z"),
  drip:  new Path2D("M14 -30 C18 -30 19 -22 16 -18 C13 -22 12 -28 14 -30 Z M-22 -24 C-19 -24 -18 -18 -21 -15 C-24 -18 -24 -22 -22 -24 Z"),
  leg:   new Path2D("M-7 0 C-8 8 -9 16 -10 22 C-4 27 6 27 10 22 C9 16 8 8 7 0 Z"),
  arm:   new Path2D("M-5 0 C-7 12 -9 24 -11 34 C-7 38 1 38 3 34 C3 22 4 10 5 0 Z"),
  claws: new Path2D("M-11 34 L-17 45 L-8 37 L-7 47 L-2 37 L3 44 L3 34 Z")
};

/* ---------- Guerreiros (cards da barra de cima) ----------
   Para criar um guerreiro novo: adicione uma entrada aqui. A ordem define a tecla (1, 2, 3...).
   custo: energia necessária · recarga: segundos até poder usar de novo
   quantidade: quantos podem ser colocados na partida (null = sem limite)
   inicio: segundos até o card ser liberado no começo da partida */
const GUERREIROS = {
  // Cardo-Flecha e Rocha Guardiã foram tirados da barra. Para trazer de volta, apague o /* e o */ em volta deles.
  /* cardo: {
    nome: "Cardo-Flecha", desc: "Atira espinhos na linha", visual: "cardo",
    custo: 100, recarga: 5, quantidade: null, inicio: 0, vida: 300,
    cores: ["#cdeeb9", "#79c066"], retrato: .44
  }, */
  // Elara substitui o Cristal Solar (ele continua no código, desligado logo abaixo; para voltar, tire o /* e o */)
  elara: {
    nome: "Elara", desc: "Medita e junta energia nas mãos: a cada ciclo solta 25 de energia", visual: "sprite",
    custo: 50, recarga: 7, quantidade: null, inicio: 0, vida: 200,
    gera: 25,                               // energia que ela solta a cada ciclo da meditação
    energiaMao: { quadro: 56, x: 2, y: -45 },  // quadro em que a energia sai das mãos, e de onde ela sai (a partir dos pés)
    sons: {
      gerar: "Elara/som/energia", volumeGerar: 0.6,   // quando a energia sai das mãos dela
      morrer: "Elara/morrendo/som", volumeMorrer: 0.8 // quando ela morre
    },
    cores: ["#ffe2b8", "#b8541e"], retrato: .5,
    sprite: {
      escala: .57,                          // sentada, um pouco mais baixa que os guerreiros em pé
      anims: {
        // 151 quadros em loop: a energia cresce nas mãos, explode em brilho e volta (um ciclo = ~12,6 s)
        parado:   { src: "Elara/energia/energia.png",   cols: 8, quadros: 151, cw: 128, ch: 173, ax: 60, ay: 168, fps: 12 },
        // 142 quadros: ela cai e o corpo se desfaz em energia dourada
        morrendo: { src: "Elara/morrendo/morrendo.png", cols: 8, quadros: 142, cw: 338, ch: 179, ax: 161, ay: 168, fps: 24, caido: 0.4 }
      }
    }
  },
  /*   cristal: {
    nome: "Cristal Solar", desc: "Gera 25 de energia a cada 12s", visual: "cristal",
    custo: 50, recarga: 7, quantidade: null, inicio: 0, vida: 150, gera: 25, intervalo: 12,
    sons: {
      gerar: "Cristal Solar/som/energia", volumeGerar: 0.5,     // quando solta uma energia
      morrer: "Cristal Solar/som/quebrando", volumeMorrer: 0.8  // quando é destruído
    },
    cores: ["#ffeab8", "#f1b04f"], retrato: .6
  }, */
  /* rocha: {
    nome: "Rocha Guardiã", desc: "Aguenta muito e bloqueia", visual: "rocha",
    custo: 50, recarga: 18, quantidade: 4, inicio: 20, vida: 1500,
    cores: ["#e2e7ec", "#9ea9b5"], retrato: .6
  }, */
  nick: {
    nome: "Nick", desc: "Cavaleiro: golpeia quem chega perto", visual: "sprite",
    custo: 100, recarga: 8, quantidade: null, inicio: 0, vida: 500,
    dano: 45, alcance: 105, intervaloAtaque: 0.3,    // alcance ~1 casa; pausa curta entre uma sequência e outra
    efeitoCorte: false,                              // o brilho do impacto já vem desenhado nos quadros
    sons: {
      ataque: "Nick/som/ataque", volume: 0.8,          // toca durante o ataque (só quando um inimigo chega perto)
      morrer: "Nick/morrendo/som", volumeMorrer: 0.8   // toca uma vez quando ele morre
    },
    cores: ["#d3e0f7", "#6d8ccc"], retrato: .62, retratoDy: 18,
    sprite: {
      escala: .50,
      anims: {
        parado:   { src: "Nick/parado/parado.png",     cols: 8, quadros: 8,  cw: 311, ch: 256, ax: 78, ay: 255, fps: 6 },
        // 40 quadros com dois golpes: o dano sai nos quadros 19 e 38 (contando a partir de 1)
        atacando: { src: "Nick/atacando/atacando.png", cols: 8, quadros: 40, cw: 311, ch: 256, ax: 78, ay: 255, fps: 16, quadroGolpe: [18, 37],
                    quadroSom: [5, 14, 28, 37] },  // o som sai nos quadros 6, 15, 29 e 38 da folha (contando a partir de 1)
        // toca uma vez quando ele perde toda a vida; depois fica caído, some aos poucos e libera a casa
        morrendo: { src: "Nick/morrendo/morrendo.png", cols: 8, quadros: 19, cw: 342, ch: 260, ax: 188, ay: 255, fps: 10, caido: 1.2 }
      }
    }
  },
  arqueiro: {
    nome: "Arqueiro", desc: "Atira flechas na linha", visual: "sprite",
    custo: 125, recarga: 7, quantidade: null, inicio: 0, vida: 300,
    intervaloAtaque: 0.8,                             // pausa entre um disparo e outro (segundos)
    flecha: {
      dano: 30, velocidade: 620,                      // dano de cada flecha e pixels por segundo
      saidaX: 53, saidaY: -75                         // de onde a flecha sai, a partir dos pés (ponta da flecha no arco)
    },
    sons: {
      tiro: "Planta/som/tiro", volumeTiro: 0.5,       // por enquanto usa o som do Cardo; troque por "Arqueiro/som/tiro" quando tiver um próprio
      morrer: "Arqueiro/caindo/som", volumeMorrer: 0.8,     // som da queda (coloque o arquivo na pasta Arqueiro/caindo)
      morrerReserva: "Arqueiro/morrendo/som"                // se não houver o de cima, usa o som antigo da pasta morrendo
    },
    cores: ["#f3d0d0", "#b8434a"], retrato: .84, retratoDy: 62,
    sprite: {
      escala: .41,                                    // mesmo tamanho do Nick em pé
      anims: {
        // em pé, respirando e balançando de leve: aparece quando não há monstro na linha dele
        parado:     { src: "Arqueiro/parado/parado.png",         cols: 8, quadros: 12, cw: 184, ch: 294, ax: 98,  ay: 293, fps: 8 },
        // arco erguido: toca uma vez quando um monstro entra na linha, antes do primeiro disparo
        // (e ao contrário quando a linha fica vazia, antes de voltar ao "parado"). "segura" = pausa no último quadro
        preparando: { src: "Arqueiro/preparando/preparando.png", cols: 8, quadros: 6,  cw: 201, ch: 324, ax: 104, ay: 323, fps: 12, segura: 0.15 },
        // pega a flecha, puxa, solta e volta: a flecha sai no quadro 5 da folha (contando a partir de 1)
        atacando: { src: "Arqueiro/atacando/atacando.png", cols: 8, quadros: 8, cw: 232, ch: 300, ax: 94, ay: 298, fps: 12, quadroTiro: 4 },
        // 40 quadros: cai, fica de bruços, depois some aos poucos e libera a casa (apague para voltar ao encolher simples)
        // morrendo: o SEU png "caindo" (151 quadros): cambaleia e cai de costas; fica 0,8 s no chão e some
        morrendo: { src: "Arqueiro/caindo/caindo.png", cols: 8, quadros: 151, cw: 249, ch: 197, ax: 132, ay: 195, fps: 30, caido: 0.8,
                    escala: 1.529,     // folha montada menor (pesa menos); aqui volta ao tamanho do arqueiro em pé
                    quadroSom: 84,     // o som toca quando ele começa a cair (diminua para mais cedo)
                    quadroChao: 104 }  // até aqui os monstros continuam acertando; quando ele bate no chão a casa fica livre
      }
    }
  },
  protetor: {
    nome: "Guerreiro Protetor", nomeCurto: "Protetor", desc: "Ergue o escudo e segura os monstros", visual: "sprite",
    custo: 75, recarga: 18, quantidade: null, inicio: 0, vida: 1000,
    defesa: 0.6,            // com o escudo erguido recebe só 40% do dano (0.6 = bloqueia 60%)
    alcanceEscudo: 210,     // começa a erguer o escudo quando um monstro chega a umas 2 casas
    sons: {
      morrer: "Guerreiro Protetor/morrendo/som", volumeMorrer: 0.8,                 // grito de morte (de 0 a 1)
      escudo: "Guerreiro Protetor/morrendo/som escudo quebrando", volumeEscudo: 0.8, // escudo se partindo no começo da queda
      bloqueio: "Guerreiro Protetor/som/bloqueio", volumeBloqueio: 0.7              // golpe batendo no escudo erguido
    },
    cores: ["#dbe6fb", "#3f5fae"], retrato: .5,
    sprite: {
      escala: .51,        // mesma altura do Nick (do topo do penacho aos pés)
      anims: {
        // uma folha só com os 150 quadros: parado → ergue o escudo → segura → abaixa
        defendendo: { src: "Guerreiro Protetor/defendendo/defendendo.png", cols: 8, quadros: 150, cw: 200, ch: 236, ax: 109, ay: 234, fps: 30 },
        // 150 quadros: o escudo quebra em pedaços, ele cambaleia e cai; depois fica 0,8 s no chão e some
        // (escala 1.2 porque esta folha foi montada um pouco menor, para pesar menos)
        morrendo: { src: "Guerreiro Protetor/morrendo/morrendo.png", cols: 8, quadros: 150, cw: 312, ch: 201, ax: 110, ay: 194, fps: 32, caido: 0.8, escala: 1.2,
                    // quadros da animação (contam do 0; 32 quadros = 1 segundo):
                    quadroEscudo: 10,   // o escudo começa a rachar: toca o som do escudo quebrando
                    quadroSom: 100,     // toca o som de morte (diminua para mais cedo, aumente para mais tarde; máximo 149)
                    quadroChao: 142 }   // ele bate no chão: até aqui os monstros continuam acertando, e a casa só fica livre aqui
      }
    },
    // trechos da folha (quadros contando a partir de 1)
    trechos: { parado: [1, 20], levantar: [21, 85], segurar: [86, 105], abaixar: [106, 150] }
  },
  mago: {
    nome: "Mago", desc: "Lança uma esfera de energia que explode no inimigo", visual: "sprite",
    custo: 175, recarga: 10, quantidade: null, inicio: 0, vida: 300,
    intervaloAtaque: 0.6,       // pausa entre um feitiço e outro (segundos)
    magia: {
      dano: 70,                 // dano no monstro atingido
      danoArea: 30,             // dano da explosão nos monstros em volta
      raio: 75,                 // tamanho da explosão (pixels)
      velocidade: 430,          // velocidade da esfera
      saidaX: 37, saidaY: -82   // de onde a esfera sai (a mão), a partir dos pés
    },
    sons: {
      magia: "Mago/som/magia", volumeMagia: 0.7,          // ao lançar a esfera
      impacto: "Mago/som/explosao", volumeImpacto: 0.7,   // quando a esfera explode no monstro
      morrer: "Mago/morrendo/som", volumeMorrer: 0.8
    },
    brilhoCajado: { x: -27, y: -106, raio: 20 },   // cristal do cajado: brilha e solta faíscas enquanto ele está parado
    cores: ["#d4e3ff", "#2f4fa8"], retrato: .5,
    sprite: {
      escala: .62,              // mesma altura dos outros guerreiros
      anims: {
        // imagem parada com respiração (sem monstro na linha)
        parado:   { src: "Mago/parado/parado.png",     cols: 8, quadros: 12,  cw: 126, ch: 201, ax: 68, ay: 199, fps: 8 },
        // 151 quadros: junta energia na mão, explode e lança; a esfera sai no quadro 92 da folha
        atacando: { src: "Mago/atacando/atacando.png", cols: 8, quadros: 151, cw: 189, ch: 197, ax: 68, ay: 195, fps: 40, quadroTiro: 91 },
        // morrendo: 151 quadros (a magia escapa em redemoinho e ele cai); fica 0,8 s no chão e some
        morrendo: { src: "Mago/morrendo/morrendo.png", cols: 8, quadros: 151, cw: 380, ch: 217, ax: 191, ay: 208, fps: 32, caido: 0.8 }
      }
    }
  },
  magoFogo: {
    nome: "Mago de Fogo", nomeCurto: "Mago Fogo", desc: "Lança uma bola de fogo que explode em chamas", visual: "sprite",
    custo: 200, recarga: 12, quantidade: null, inicio: 0, vida: 300,
    intervaloAtaque: 0.6,
    magia: {
      estilo: "fogo",           // cores e chamas do feitiço
      dano: 60,                 // dano no monstro atingido
      danoArea: 40,             // dano da explosão nos monstros em volta
      raio: 90,                 // explosão maior que a do Mago
      velocidade: 400,
      saidaX: 50, saidaY: -79   // de onde a bola sai (a mão), a partir dos pés
    },
    sons: {
      magia: "Mago de Fogo/som/magia", volumeMagia: 0.7,          // ao lançar a bola de fogo
      impacto: "Mago de Fogo/som/explosao", volumeImpacto: 0.8,   // quando a bola explode
      morrer: "Mago de Fogo/morrendo/som", volumeMorrer: 0.8
    },
    brilhoCajado: { x: -42, y: -104, raio: 16, estilo: "fogo" },   // cristal do cajado em chamas quando ele está parado
    cores: ["#ffd9b0", "#b8331c"], retrato: .5,
    sprite: {
      escala: .65,              // mesma altura dos outros guerreiros
      anims: {
        // quadros 1 a 13 da folha, indo e voltando: respira sem pulo
        parado:   { src: "Mago de Fogo/parado/parado.png",     cols: 8, quadros: 24,  cw: 175, ch: 191, ax: 96,  ay: 188, fps: 10 },
        // 151 quadros: a bola de fogo cresce na mão e é lançada no quadro 104 da folha
        atacando: { src: "Mago de Fogo/atacando/atacando.png", cols: 8, quadros: 151, cw: 339, ch: 202, ax: 181, ay: 198, fps: 40, quadroTiro: 103 },
        // morrendo: 151 quadros (explode em chamas e desaba); fica 0,8 s no chão e some
        morrendo: { src: "Mago de Fogo/morrendo/morrendo.png", cols: 8, quadros: 151, cw: 348, ch: 211, ax: 168, ay: 202, fps: 32, caido: 0.8 }
      }
    }
  },
  sentinela: {
    nome: "Cavaleiro Sentinela", nomeCurto: "Sentinela", desc: "Gigante: golpeia, defende e crava a espada para erguer a terra na linha", visual: "sprite",
    custo: 325, recarga: 25, quantidade: null, inicio: 0, vida: 1800,
    defesa: 0.7,                    // com o escudo erguido (durante a defesa) recebe só 30% do dano
    sentinela: {
      alcance: 150,                 // golpe de espada: acerta os monstros até 1,5 casa à frente
      danoGolpe: 60,                // dano de cada golpe de espada
      quadrosGolpe: [43, 123],      // os dois golpes da animação de ataque (contam do 0)
      quadrosDefesa: [64, 92],      // trecho em que ele se protege com o escudo
      minimoParaTerra: 4,           // com 4 ou mais monstros na linha (mais de 3) ele crava a espada no chão
      danoTerra: 90,                // dano da onda de terra em cada monstro da linha
      quadroImpacto: 49,            // quadro em que a espada bate no chão
      velocidadeOnda: 650,          // velocidade da onda de terra (pixels por segundo)
      recargaTerra: 6               // espera mínima entre um ataque de terra e outro (segundos)
    },
    sons: {
      golpe: "Cavaleiro Sentinela/som/golpe", volumeGolpe: 0.8,        // cada golpe de espada
      terra: "Cavaleiro Sentinela/som/terra", volumeTerra: 0.9,        // espada no chão (onda de terra)
      bloqueio: "Cavaleiro Sentinela/som/escudo", volumeBloqueio: 0.7, // golpe batendo no escudo
      morrer: "Cavaleiro Sentinela/morrendo/som", volumeMorrer: 0.9
    },
    cores: ["#d7e2f7", "#2b4a8f"], retrato: .5,
    sprite: {
      escala: .9,                   // ele é bem maior que os outros guerreiros
      anims: {
        // O jogo aceita as duas versões de cada folha e descobre sozinho qual está na pasta:
        //  - o SEU PNG transparente (13 colunas x 12 linhas, 151 quadros), em qualquer tamanho;
        //  - a versão que eu recortei (8 colunas).
        // "pes" = onde ficam os pés dentro do quadro do seu PNG (fração da largura e da altura).
        // em guarda: loop quando não há monstro por perto
        parado:    { src: "Cavaleiro Sentinela/em guarda/em_guarda.png", quadros: 151, fps: 24,
                     cols: 13, cw: 379, ch: 216, ax: 188, ay: 211,
                     grade: { formato: [13, 12], pes: [188 / 379, 211 / 216], ref: 379 },
                     variantes: [{ largura: 1872, cols: 8, cw: 234, ch: 205, ax: 131, ay: 201 }] },
        // golpeia, se defende com o escudo e golpeia de novo
        atacando:  { src: "Cavaleiro Sentinela/atacando/atacando.png", quadros: 151, fps: 36,
                     cols: 8, cw: 321, ch: 216, ax: 149, ay: 213,
                     grade: { formato: [13, 12], pes: [188 / 379, 211 / 216], ref: 379 },
                     variantes: [{ largura: 2568, cols: 8, cw: 321, ch: 216, ax: 149, ay: 213 }] },
        // crava a espada no chão: a onda de terra sai no quadro do impacto
        terremoto: { src: "Cavaleiro Sentinela/espada no chao/espada_no_chao.png", quadros: 151, fps: 34,
                     cols: 13, cw: 379, ch: 216, ax: 188, ay: 211,
                     grade: { formato: [13, 12], pes: [188 / 379, 211 / 216], ref: 379 },
                     variantes: [{ largura: 2488, cols: 8, cw: 311, ch: 218, ax: 156, ay: 213 }],
                     // pedacinhos de poeira de quadros vizinhos que encostam na borda do quadro no SEU PNG:
                     // o jogo não desenha essa beirada (quadro: [cima, direita, baixo, esquerda] em pixels do quadro de 379 x 216)
                     cortes: {"40":[2,0,0,0],"41":[2,0,0,0],"42":[2,0,0,0],"43":[2,0,0,0],"44":[2,0,0,0],"45":[2,0,0,0],"46":[2,0,0,0],"47":[2,0,0,0],"48":[2,0,0,0],"60":[2,0,2,0],"61":[2,0,2,0],"62":[2,0,2,0],"63":[2,0,2,0],"64":[2,0,0,0],"65":[2,0,0,0],"66":[2,0,0,0],"67":[2,0,2,0],"68":[2,0,0,0],"69":[2,0,0,0],"70":[2,0,0,0],"71":[2,0,0,0],"72":[2,4,0,0],"73":[2,0,3,0],"74":[2,0,3,0],"75":[2,0,3,4],"76":[2,0,3,4],"77":[2,0,0,0],"78":[2,0,2,0],"79":[2,0,4,0],"80":[2,0,4,0],"81":[2,3,0,0],"82":[2,0,0,5],"83":[2,0,0,4],"84":[2,0,0,13],"85":[2,0,0,13],"86":[2,2,0,9],"87":[2,3,0,31],"88":[2,0,0,32],"89":[2,7,0,33],"90":[2,5,0,33],"91":[2,5,0,33],"92":[2,0,0,32],"93":[2,0,0,32],"94":[2,0,0,39],"95":[2,0,0,39],"96":[2,2,0,36],"97":[2,19,0,33],"98":[2,18,0,33],"99":[2,16,0,4],"100":[2,16,0,4],"101":[2,15,0,36],"102":[2,13,0,4],"103":[2,12,0,4],"104":[0,11,0,4],"105":[0,11,0,4],"106":[0,11,0,4],"107":[0,11,0,4],"108":[0,0,0,4],"109":[0,0,0,4],"110":[0,0,0,4],"111":[0,16,0,4],"112":[0,0,0,4],"113":[0,0,0,4],"114":[0,0,0,4],"115":[0,0,0,4],"116":[0,0,0,4],"117":[0,0,0,4],"118":[0,0,0,4],"119":[0,0,0,4],"120":[0,0,0,4],"121":[0,0,0,4],"122":[0,0,0,4],"123":[0,0,0,4],"124":[0,16,0,4],"125":[0,16,0,4],"126":[0,16,0,0],"127":[0,16,0,2],"128":[0,0,0,4],"129":[0,0,0,4],"130":[0,0,0,4],"131":[0,16,0,4],"132":[0,0,2,4],"133":[0,16,2,3],"134":[0,16,0,3],"135":[0,16,0,0],"136":[0,16,0,0],"137":[0,16,0,3],"138":[0,16,2,2],"139":[0,0,0,57],"140":[0,0,0,57],"141":[0,16,9,54],"142":[0,16,8,40],"143":[0,16,8,39],"144":[0,0,7,38],"145":[0,0,7,38],"146":[0,16,7,38],"147":[0,16,7,37],"148":[0,0,6,36],"149":[0,16,6,36],"150":[0,0,6,35]} },
        // morrendo: 151 quadros (cai de joelhos e desaba de bruços); fica 0,8 s no chão e some
        morrendo:  { src: "Cavaleiro Sentinela/morrendo/morrendo.png", cols: 8, quadros: 151, cw: 327, ch: 218, ax: 170, ay: 213, fps: 36, caido: 0.8,
                     quadroChao: 125 }   // até este quadro os monstros continuam acertando; aqui a casa fica livre
      }
    }
  }
};
// carrega os sons dos guerreiros
for (const id in GUERREIROS) {
  const g = GUERREIROS[id];
  carregarSonsDe(g);
  if (g.sons && g.sons.ataque) g.somAtaque = carregarSom(g.sons.ataque);
  if (g.sons && g.sons.morrer) g.somMorrer = carregarSom(g.sons.morrer);
  if (g.sons && g.sons.morrerReserva) g.somMorrerReserva = carregarSom(g.sons.morrerReserva);
  if (g.sons && g.sons.tiro) g.somTiro = carregarSom(g.sons.tiro);
  if (g.sons && g.sons.escudo) g.somEscudo = carregarSom(g.sons.escudo);
  if (g.sons && g.sons.magia) g.somMagia = carregarSom(g.sons.magia);
}
// carrega as folhas dos guerreiros que usam PNG
for (const id in GUERREIROS) {
  const sp = GUERREIROS[id].sprite;
  if (!sp) continue;
  for (const nome in sp.anims) {
    const a = sp.anims[nome];
    a.img = new Image(); a.ok = false;
    a.img.onload = () => { ajustarLayout(a); a.ok = true; };
    a.img.onerror = () => { if (!a.opcional) setTimeout(() => registrar("sistema", `Não encontrei ${a.src}. Confira a pasta.`, false), 0); };
    a.img.src = a.src;
  }
}
// Aceita mais de um jeito de arrumar a mesma folha: o jogo olha o tamanho do PNG e escolhe a arrumação certa.
// "variantes": arrumações conhecidas (pela largura). "grade": [colunas, linhas] do seu PNG original, para qualquer tamanho dele.
function ajustarLayout(a) {
  const w = a.img.naturalWidth, h = a.img.naturalHeight;
  const v = (a.variantes || []).find(v => v.largura === w);
  if (v) { Object.assign(a, v); a.cortes = null; return; }     // a minha versão não precisa dos cortes de borda
  if (a.grade) {                                   // seu PNG com fundo transparente, em qualquer tamanho (ex.: 13 x 12)
    const [cols, linhas] = a.grade.formato, cw = w / cols, ch = h / linhas;
    // "fator" mantém o mesmo tamanho na tela, mesmo que o PNG seja maior ou menor (referência: quadro de 379 px)
    Object.assign(a, { cols, cw, ch, ax: cw * a.grade.pes[0], ay: ch * a.grade.pes[1], fator: (a.grade.ref || cw) / cw });
  }
}
/* =====================================================================
   MODO_MONSTERS: você comanda os esqueletos e os heróis saem do castelo andando.
   A animação de andar de cada herói fica na pasta do próprio herói:
     public/assets/<pasta do herói>/andando/andando.png   (ex.: Nick/andando/andando.png)
   Pode ser a sua folha original (13 colunas x 12 linhas, 151 quadros), com ou sem fundo transparente:
   o jogo recorta, tira o fundo, acha os pés e deixa o herói do mesmo tamanho das outras animações dele.
   Só entram na partida os heróis que já têm a pasta "andando".
   ===================================================================== */
const MODO_MONSTERS = {
  andar: {                         // velocidade (pixels por segundo) e fps de cada herói andando
    // ANDAR_HEROIS: todas as folhas já recortadas (8 colunas). quadros = quantos desenhos tem a folha;
    // passo = quanto o pé no chão anda por quadro (o jogo acerta sozinho a velocidade da animação);
    // para = a quantos pixels do inimigo ele para para lutar (quem atira para mais longe).
    padrao:    { velocidade: 30, fps: 30, para: 45, pausa: 0.35 },   // pausa = segundos parado antes do 1º golpe
    // Nick: folha já recortada (8 colunas, 89 quadros). "passo" = quanto o pé no chão anda por quadro na folha:
    // com ele o jogo acha sozinho a velocidade da animação para o pé não escorregar.
    nick:      { velocidade: 34, grade: [8, 12], quadros: 89,  passo: 3.5,  para: 45 },
    arqueiro:  { velocidade: 32, grade: [8, 4],  quadros: 32,  passo: 7.5,  para: 330 },
    sentinela: { velocidade: 24, grade: [8, 13], quadros: 97,  passo: 4.57, para: 60 },
    protetor:  { velocidade: 22, grade: [8, 16], quadros: 123, passo: 4.42, para: 45 },
    mago:      { velocidade: 28, grade: [8, 15], quadros: 115, passo: 3.76, para: 270 },
    magoFogo:  { velocidade: 30, grade: [8, 19], quadros: 147, passo: 5.63, para: 270 }
  },
  grade: [13, 12], quadros: 151,   // formato das folhas de andar
  paraDistancia: 45,               // (antigo: agora cada herói tem o seu "para" em ANDAR_HEROIS)
  vidaHerois: 0.6,                 // vida dos heróis neste modo (1 = a vida normal deles)
  chefao: "sentinela",             // herói que vem no fim de cada nível (se ele ainda não anda, vem outro)
  vidaChefao: 2,                   // o chefão tem o dobro da vida
  danoNaBase: 10,                  // quanto cada herói tira da sua base quando passa pela direita
  energiaPorHeroi: 15,             // energia ganha a cada herói derrotado
  energiaDeNoite: true,            // energia cai do céu também de noite
  // cada monstro custa a mesma energia (e tem a mesma recarga) do guerreiro "par" dele
  par: {
    esqueleto: "nick", esqueletoFogo: "magoFogo", esqueletoArqueiro: "arqueiro",
    esqueletoProtetor: "protetor", esqueletoMago: "mago", esqueletoTita: "sentinela"
  },
  respirar: 0.018                  // monstro parado "respirando" (0 = desliga; 0.03 = mais forte)
};
function custoMonstro(id) { const g = GUERREIROS[MODO_MONSTERS.par[id]]; return g ? g.custo : 100; }
function recargaMonstro(id) { const g = GUERREIROS[MODO_MONSTERS.par[id]]; return g ? g.recarga : 5; }
let recargaM = {};                  // recarga de cada card de monstro (segundos)
let modoM = false;                  // true = partida no lado Monsters
function pastaDoHeroi(g) {
  const a = Object.values(g.sprite.anims)[0];
  return a.src.split("/")[0];
}
function heroisQueAndam() {
  return Object.keys(GUERREIROS).filter(id => GUERREIROS[id].andar && GUERREIROS[id].andar.ok);
}
// retângulo com imagem (alfa > 40) dentro de um quadro
function caixaAlfa(d, larg, x0, y0, w, h) {
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    let i = ((y0 + y) * larg + x0) * 4 + 3;
    for (let x = 0; x < w; x++, i += 4) if (d[i] > 40) {
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  return maxX < 0 ? null : { minX, minY, maxX, maxY };
}
// altura (na tela) do herói parado, para a folha de andar ficar do mesmo tamanho
// meio (na horizontal) da parte com imagem dentro de uma faixa: usado para alinhar o tronco
function meioXAlfa(d, larg, x0, y0, w, h) {
  let soma = 0, n = 0;
  for (let y = Math.max(0, Math.floor(y0)); y < y0 + h; y++) {
    let i = (y * larg + x0) * 4 + 3;
    for (let x = 0; x < w; x++, i += 4) if (d[i] > 80) { soma += x; n++; }
  }
  return n ? soma / n : null;
}
// ALINHAR_ANDAR: mede o herói parado (altura, meio do tronco e pés) já no tamanho da tela,
// para a folha de andar ficar do MESMO tamanho e no MESMO lugar (sem pulo ao parar e atacar)
function medirParado(g) {
  const ref = g.sprite.anims.parado || g.sprite.anims.defendendo;
  if (!ref || !ref.ok) return null;
  const w = Math.round(ref.cw), h = Math.round(ref.ch), c = document.createElement("canvas");
  c.width = w; c.height = h;
  const x = c.getContext("2d", { willReadFrequently: true });
  x.drawImage(ref.img, 0, 0, ref.cw, ref.ch, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h).data, b = caixaAlfa(d, w, 0, 0, w, h);
  if (!b) return null;
  const E = g.sprite.escala * (ref.fator || 1), alt = b.maxY - b.minY + 1;
  const tronco = meioXAlfa(d, w, 0, b.minY + alt * .22, w, alt * .25) ?? (b.minX + b.maxX) / 2;
  return { altura: alt * E, troncoX: (tronco - ref.ax) * E, pesY: (b.maxY + 1 - ref.ay) * E };
}
function prepararAndar(id, g, im, tentativa = 0) {
  const ref = g.sprite.anims.parado || g.sprite.anims.defendendo;
  if (ref && !ref.ok && tentativa < 40) { setTimeout(() => prepararAndar(id, g, im, tentativa + 1), 250); return; }   // espera a folha parada
  const W0 = im.naturalWidth, H0 = im.naturalHeight;
  const cfgH = { ...MODO_MONSTERS.andar.padrao, ...(MODO_MONSTERS.andar[id] || {}) };
  let [cols, linhas] = cfgH.grade || MODO_MONSTERS.grade;
  const n0 = cfgH.quadros || MODO_MONSTERS.quadros;
  if (!cfgH.grade && Math.abs(W0 / H0 - 1.9) > .2) { cols = 8; linhas = Math.ceil(n0 / 8); }   // folha já recortada em 8 colunas
  const n = Math.min(n0, cols * linhas);
  const cw0 = W0 / cols, ch0 = H0 / linhas, k = Math.min(1, 379 / cw0);
  const cw = Math.floor(cw0 * k), ch = Math.floor(ch0 * k);
  const cvA = document.createElement("canvas"); cvA.width = cw * cols; cvA.height = ch * linhas;
  const c2 = cvA.getContext("2d", { willReadFrequently: true });
  c2.imageSmoothingQuality = "high";
  for (let i = 0; i < n; i++) c2.drawImage(im, (i % cols) * cw0, Math.floor(i / cols) * ch0, cw0, ch0, (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch);
  const L = cvA.width, dados = c2.getImageData(0, 0, L, cvA.height), d = dados.data;
  if (d[3] > 200) {                                  // fundo sem transparência: tira a cor do canto (branco, verde...)
    const br = d[0], bgc = d[1], bb = d[2];
    for (let i = 0; i < d.length; i += 4) {
      const dist = Math.abs(d[i] - br) + Math.abs(d[i + 1] - bgc) + Math.abs(d[i + 2] - bb);
      if (dist < 60) d[i + 3] = 0; else if (dist < 120) d[i + 3] = Math.min(d[i + 3], Math.round((dist - 60) / 60 * 255));
    }
  }
  for (let i = 0; i < n; i++) {                      // limpa a beiradinha de cada quadro (linha do quadro vizinho)
    const x0 = (i % cols) * cw, y0 = Math.floor(i / cols) * ch;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (x < 2 || y < 2 || x >= cw - 2 || y >= ch - 2) d[((y0 + y) * L + x0 + x) * 4 + 3] = 0;
  }
  // pés e altura: a parte mais baixa de todos os quadros e o meio dos pés
  const alturas = [], pesX = [], troncos = []; let fundo = 0;
  for (let i = 0; i < n; i++) {
    const x0 = (i % cols) * cw, y0 = Math.floor(i / cols) * ch, b = caixaAlfa(d, L, x0, y0, cw, ch);
    if (!b) continue;
    alturas.push(b.maxY - b.minY + 1); fundo = Math.max(fundo, b.maxY);
    const alt = b.maxY - b.minY + 1, t = meioXAlfa(d, L, x0, y0 + b.minY + alt * .22, cw, alt * .25);
    if (t != null) troncos.push(t);
    const pe = caixaAlfa(d, L, x0, y0 + Math.max(0, b.maxY - 6), cw, Math.min(7, b.maxY + 1));
    if (pe) pesX.push((pe.minX + pe.maxX) / 2);
  }
  if (!alturas.length) throw new Error("a folha está vazia");
  c2.putImageData(dados, 0, 0);
  const med = v => v.slice().sort((a, b) => a - b)[Math.floor(v.length / 2)];
  const med0 = medirParado(g);
  const Ew = (med0 ? med0.altura : 150) / med(alturas);              // tamanho na tela de 1 pixel da folha de andar
  const fator = Ew / g.sprite.escala;
  // tronco no mesmo lugar do herói parado e pés na mesma linha: a troca andar -> parar -> atacar não pula
  const ax = med0 && troncos.length ? med(troncos) - med0.troncoX / Ew : med(pesX);
  const ay = med0 ? fundo + 1 - med0.pesY / Ew : fundo + 1;
  g.andar = { ok: true, img: cvA, cols, cw, ch, quadros: n, ax, ay, fps: cfgH.fps, fator, escalaPasso: k * Ew };
  recalcularPasso(id);                                              // passo casado com a velocidade
  setTimeout(() => registrar("sistema", `${g.nome}: animação de andar pronta (${n} quadros)`, true), 0);
}
for (const id in GUERREIROS) {
  const g = GUERREIROS[id];
  if (!g.sprite) continue;
  g.andar = { ok: false };
  const im = new Image(), pasta = pastaDoHeroi(g);
  im.onload = () => { try { prepararAndar(id, g, im); } catch (e) { setTimeout(() => registrar("sistema", `Não consegui usar ${pasta}/andando/andando.png: ${e.message}`, false), 0); } };
  im.src = pasta + "/andando/andando.png";
}
// Herói sai do castelo (esquerda) andando para a direita
function soltarHeroi(chefe, extraNivel = 0) {
  const ids = heroisQueAndam();
  if (!ids.length) return null;
  let tipo;
  if (chefe && ids.includes(MODO_MONSTERS.chefao)) tipo = MODO_MONSTERS.chefao;
  else { const sem = ids.filter(id => id !== MODO_MONSTERS.chefao), l = sem.length ? sem : ids; tipo = l[Math.floor(sorte() * l.length)]; }
  const g = GUERREIROS[tipo], r = Math.floor(sorte() * G.rows);
  const lv = nivelDosMonstros(extraNivel), mult = multNivel(lv);
  const vidaN = Math.round(g.vida * mult * MODO_MONSTERS.vidaHerois * (chefe ? MODO_MONSTERS.vidaChefao : 1));
  const cfg = { ...MODO_MONSTERS.andar.padrao, ...(MODO_MONSTERS.andar[tipo] || {}) };
  const p = {
    r, c: -1, tipo, nivel: lv, mult, x: G.left - 30, y: chaoY(r), inimigo: true, hp: vidaN, max: vidaN, idade: 0, nasc: 1, cd: .5,
    recuo: 0, flash: 0, piscar: rand(2, 5), piscT: 0, morte: 0, semente: rand(0, 10), gerT: 0, brilho: 0,
    andante: true, andando: true, vel: cfg.velocidade * rand(.94, 1.06), tAndar: rand(0, 3), chefe
  };
  plantas.push(p);
  return p;
}
// Herói passou por todos os monstros: tira vida da sua base
function heroiPassou(p) {
  p.fora = true;
  const dano = p.chefe ? Math.max(1, Math.ceil(vida)) : MODO_MONSTERS.danoNaBase;
  if (!simM()) { ferirCasteloInimigo(dano, p.y); return; }   // seu guerreiro chegou no castelo do inimigo
  vida = Math.max(0, vida - dano); nucleoDor = 1;
  somPersonagem(CASTELO, "dano", .9, 120, .06);
  if (!reduzMov) tremor = .45;
  textos.push({ x: PORTAO_INIMIGO - 30, y: p.y - 90, txt: "-" + dano, cor: "#ff6b5e", t: 0 });
  for (let i = 0; i < 16; i++) parts.push({
    x: PORTAO_INIMIGO + rand(-10, 20), y: p.y - rand(20, 90), vx: rand(0, 160), vy: rand(-160, 60), g: 0,
    vida: 0, max: rand(.4, .8), tam: rand(3, 6), cor: i % 2 ? "#b8ff6a" : "#ff6b5e", tipo: "ponto"
  });
  if (vida <= 0) terminar();
}
// CAMPO_COMPRIDO: tropa sua chegou no castelo do outro lado (x e y no jogo)
function ferirCasteloInimigo(dano, y, x = simM() ? G.left - 20 : PORTAO_INIMIGO + 10) {
  vidaInimigo = Math.max(0, vidaInimigo - dano); nucleoDorInimigo = 1;
  somPersonagem(CASTELO, "dano", .7, 120, .06);
  textos.push({ x, y: y - 90, txt: "-" + dano, cor: "#ffd34d", t: 0 });
  for (let i = 0; i < 14; i++) parts.push({
    x: x + rand(-10, 10), y: y - rand(20, 90), vx: rand(-120, 120), vy: rand(-160, 40), g: 0,
    vida: 0, max: rand(.4, .8), tam: rand(3, 6), cor: i % 2 ? "#ffd34d" : "#cfc8bb", tipo: "ponto"
  });
}
// Você coloca um monstro numa casa: ele sai andando até o castelo dos heróis
function colocarMonstroModoM(idx, r, col, origem) {
  const id = MONSTROS_CARTAS[idx];
  if (!id) { registrar(origem, `O card de monstro ${idx + 1} está vazio`, false); return false; }
  const custo = custoMonstro(id), x = MW - celX(col), pos = LINHAS[r] + (col + 1);   // a arena aparece espelhada
  if ((recargaM[id] || 0) > 0) { registrar(origem, `${PERSONAGENS[id].nome} recarregando (${Math.ceil(recargaM[id])}s)`, false); return false; }
  if (criaturas.some(c => !c.morte && c.r === r && Math.abs(c.x - x) < G.cw * .5)) {
    efeitosCelula.push({ r, c: col, t: 0, bom: false }); registrar(origem, `${pos} já tem um monstro`, false); return false;
  }
  const saldo = pvp ? energiaM : energia;                 // PARTIDA_PVP: os monstros têm a energia deles
  if (!MODO_TESTE.energiaInfinita && saldo < custo) {
    if (origem !== "bot") energiaFalha = .7;
    registrar(origem, `Falta energia: ${PERSONAGENS[id].nome} custa ${custo}`, false); return false;
  }
  if (!MODO_TESTE.energiaInfinita) { if (pvp) energiaM -= custo; else energia -= custo; }
  recargaM[id] = MODO_TESTE.semRecarga ? 0 : recargaMonstro(id);
  const c = soltarCriatura(r, id, x);
  aplicarNivelMonstro(c, Math.max(1, camp.nivel));
  const bc = bonusConta(id, "monsters"); c.forca *= bc; c.hp = c.max = Math.round(c.max * bc);   // nível da conta
  c.surgir = 1;                                          // sai andando na hora
  seguraNoPreparo(c);
  efeitosCelula.push({ r, c: col, t: 0, bom: true });
  registrar(origem, `${c.tipo ? PERSONAGENS[c.tipo].nome : "Monstro"} colocado em ${pos}`, true);
  return true;
}
const ENERGIA_INICIAL = 200;          // energia no começo da partida
const SOM_FUSAO = { sons: { fundir: "Jogo/som/evoluir", volumeFundir: 0.8 } };   // som quando um guerreiro sobe de nível na fusão

/* SONS DO CASTELO: coloque os arquivos na pasta "Castelo/som" (em .mp3, .wav, .ogg ou .m4a) */
const CASTELO = {
  sons: {
    dano: "Castelo/som/dano", volumeDano: 0.9,       // quando um esqueleto chega no castelo e tira vida
    caiu: "Castelo/som/caiu", volumeCaiu: 1.0        // quando a vida do castelo chega a 0 (derrota)
  }
};
/* CARDS DA BARRA DE CIMA
   false = cada personagem aparece PARADO no card (uma pose fixa, sem animação)
   true  = personagens animados no card (atacando, andando, cajado brilhando...) */
const CARDS_ANIMADOS = false;

/* MODO DE TESTE: para testar personagens sem esperar.
   Troque true por false para voltar ao jogo normal (ou use false em tudo antes da live). */
const MODO_TESTE = {
  energiaInfinita: false,  // true = energia nunca acaba (mostra ∞)
  semRecarga: false,       // true = pode colocar o mesmo guerreiro de novo na hora
  semBloqueio: true,       // cards liberados desde o começo (sem o cadeado "em 20s")
  semLimite: true,         // sem limite de quantidade (sem "x4" e sem "ESGOTADO")
  ondasAutomaticas: true   // true = campanha com níveis e ondas; false = monstros só pelos cards (ou Z)
};

/* CAMPANHA: níveis com ondas de esqueletos cada vez mais difíceis; no fim de cada nível vem o chefão (Esqueleto Titã).
   Vence quem passar do último nível; perde se a vida do castelo chegar a 0. */
const CAMPANHA = {
  niveis: 100,                                   // vence quem passar do nível 100
  // dia e noite: 2 níveis de dia, 2 de noite, e assim por diante (de noite não cai energia do céu)
  ehNoite: n => Math.floor((n - 1) / 2) % 2 === 1,
  ondas: n => Math.min(6, 2 + Math.floor(n / 12)),                 // 2 ondas no começo, até 6 no fim
  quantidade: (n, onda) => Math.min(28, 3 + Math.floor(n * .45) + onda * 2),   // monstros por onda
  intervalo: n => Math.max(1.1, 3.8 - n * .03),                     // segundos entre um monstro e o próximo
  preparo: 20,                                   // segundos para montar a defesa antes da 1ª onda de cada nível
  pausaEntreOndas: 8,
  pausaEntreNiveis: 5,
  energiaPorNivel: 0,                            // energia de graça ao começar cada nível (0 = nenhuma: energia só pegando no jogo)
  // a partir de qual nível cada monstro começa a aparecer nas ondas
  entraNoNivel: { esqueleto: 1, esqueletoArqueiro: 3, esqueletoFogo: 5, esqueletoProtetor: 8, esqueletoMago: 12 },
  chefao: "esqueletoTita",
  nivelExtraChefao: 3                            // o chefão vem alguns níveis acima dos outros monstros
};
/* NÍVEIS DOS PERSONAGENS (1 a 100), iguais para os dois lados: cada nível dá +4,5% de vida e de dano.
   Nível 10 ≈ 1,4x · nível 50 ≈ 3,2x · nível 100 ≈ 5,5x.
   Guerreiros: sobem de nível com experiência (cada guerreiro vivo no fim de um nível dá 1 ponto ao tipo dele)
               ou com energia (botão ⬆ no card).
   Monstros: o nível acompanha o nível do jogo E o nível médio dos seus guerreiros — se você fica forte, eles também. */
const NIVEIS = {
  max: 100,
  bonusPorNivel: .045,
  xpParaSubir: lv => 2 + Math.floor(lv / 4),                        // pontos de experiência para o próximo nível
  custoEvoluir: (g, lv) => Math.round(40 + g.custo * .4 + lv * 12), // energia para subir 1 nível pelo botão ⬆
  pesoJogo: .8, pesoGuerreiros: .2                                  // de onde vem o nível dos monstros
};
const multNivel = lv => 1 + (Math.max(1, lv) - 1) * NIVEIS.bonusPorNivel;
const nivelG = {}, xpG = {};                     // nível e experiência de cada tipo de guerreiro
for (const id in GUERREIROS) { nivelG[id] = 1; xpG[id] = 0; }
function nivelMedioGuerreiros() {
  const ids = Object.keys(GUERREIROS); return ids.reduce((a, id) => a + nivelG[id], 0) / ids.length;
}
function nivelDosMonstros(extra = 0) {
  const base = camp.nivel * NIVEIS.pesoJogo + nivelMedioGuerreiros() * NIVEIS.pesoGuerreiros;
  return Math.max(1, Math.min(NIVEIS.max, Math.round(base + extra + rand(-1, 1))));
}
function evoluirTipo(id, porEnergia) {
  if (nivelG[id] >= NIVEIS.max) return false;
  if (porEnergia) {
    const custo = NIVEIS.custoEvoluir(GUERREIROS[id], nivelG[id]);
    if (!MODO_TESTE.energiaInfinita && energia < custo) { registrar("teclado", `Falta energia para evoluir ${GUERREIROS[id].nome}: custa ${custo}`, false); return false; }
    if (!MODO_TESTE.energiaInfinita) energia -= custo;
  }
  nivelG[id]++; xpG[id] = 0;
  registrar("sistema", `⬆ ${GUERREIROS[id].nome} subiu para o nível ${nivelG[id]}!`, true);
  return true;
}
// cor da barra de vida conforme o nível: cada nível tem uma cor diferente (1 a 100)
function corDoNivel(lv) {
  const h = (lv * 137.508) % 360, l = 48 + (lv % 3) * 6;
  return `hsl(${h.toFixed(0)}, 82%, ${l}%)`;
}
const ENERGIA_CEU = { valor: 25, intervaloMin: 6, intervaloMax: 9, duracao: 9 }; // energia que cai do céu
const ICONE_ENERGIA = new Image();
let iconeOk = false;
(() => {
  const lista = ["png", "jpg", "jpeg", "webp"].map(e => "Energia/energia." + e);
  const tentar = i => {
    if (i >= lista.length) return;
    ICONE_ENERGIA.onload = () => { iconeOk = true; };
    ICONE_ENERGIA.onerror = () => tentar(i + 1);
    ICONE_ENERGIA.src = lista[i];
  };
  tentar(0);
})();

/* ---------- Canvas ---------- */
const cv = document.getElementById("jogo");
const ctx = cv.getContext("2d");
let dpr = Math.min(2, window.devicePixelRatio || 1);   // resolução do desenho (sobe sozinha na tela cheia)
cv.width = W * dpr; cv.height = H * dpr;

/* ---------- Estado ---------- */
let plantas = [], criaturas = [], tiros = [], parts = [], textos = [], efeitosCelula = [], explosoes = [], portais = [], ondasTerra = [], ondasOssos = [];
let vidaInimigo = 100, nucleoDorInimigo = 0;         // castelo do outro lado
let grade, vida, pausado, ondas, ondaT, ondaN, tremor, tempo, buffer, fim, abatidas, nucleoDor;
let camp, banner, vidaLag, pendentes, pendenteSel = null, chipsPendentes = [];
let energia, energiaPulso, energiaFalha, orbes, ceuT, cartas, cartaSel = 0;
let monstroSel = 0, paAtiva = false;                 // card de monstro escolhido e pá ligada
let modoSel = "guerreiro";                            // o que o clique no gramado coloca: "guerreiro" ou "monstro"
const mouse = { x: 0, y: 0, wx: 0, wy: 0, dentro: false };   // x/y = na tela; wx/wy = no jogo (com zoom)
function novoEstado() {
  plantas = []; criaturas = []; tiros = []; parts = []; textos = []; efeitosCelula = []; explosoes = []; portais = []; ondasTerra = []; ondasOssos = [];
  grade = Array.from({ length: G.rows }, () => Array(G.cols).fill(null));
  vida = 100; pausado = false; ondaT = 10; ondaN = 0; tremor = 0; tempo = 0;
  if (typeof novaSemente === "function") novaSemente();             // SORTE: semente nova a cada partida
  buffer = ""; fim = false; abatidas = 0; nucleoDor = 0;
  camp = { nivel: 1, onda: 0, fase: "inicio", t: 3, fila: [], spawnT: 0, chefe: null };
  banner = null; vidaLag = 100; pendentes = []; pendenteSel = null;
  camp.fase = "preparo"; camp.t = CAMPANHA.preparo;
  for (const id in GUERREIROS) { nivelG[id] = 1; xpG[id] = 0; }
  setTimeout(() => definirNoite(CAMPANHA.ehNoite(1)), 0);   // depois que tudo carregou
  mostrarBanner("NÍVEL 1", `${CAMPANHA.ehNoite(1) ? "🌙 Noite" : "☀️ Dia"} · monte sua defesa!`);
  recargaM = {}; vidaInimigo = 100; nucleoDorInimigo = 0;
  energia = ENERGIA_INICIAL; energiaPulso = 0; energiaFalha = 0; orbes = []; ceuT = 4;
  cartas = Object.keys(GUERREIROS).map(id => ({
    id, recarga: 0,
    bloqueio: MODO_TESTE.semBloqueio ? 0 : GUERREIROS[id].inicio,
    estoque: MODO_TESTE.semLimite ? null : GUERREIROS[id].quantidade, tremer: 0
  }));
}
ondas = MODO_TESTE.ondasAutomaticas;
novoEstado();

/* SORTE: sorteio com SEMENTE. Com a mesma semente e as mesmas ações, a partida sai IGUAL em qualquer computador
   (é isso que deixa o PvP online funcionar: os dois aparelhos só trocam as ações).
   rand = sorteio da partida (usa a semente). randVis = sorteio só de enfeite na tela (não muda a partida). */
var estadoSorte = 1;          // (var: pode ser usado antes desta linha)
function semearSorte(s) { estadoSorte = (s >>> 0) || 1; }
function sorte() {                                   // número entre 0 e 1 (mulberry32)
  let t = (estadoSorte = (estadoSorte + 0x6D2B79F5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const rand = (a, b) => a + sorte() * (b - a);
const randVis = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = t => Math.max(0, Math.min(1, t));
const easeOutBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const easeInOut = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeIn = t => t * t * t;

const celX = c => G.left + c * G.cw + G.cw / 2;
const chaoY = r => G.top + r * G.ch + G.ch - 18;

/* ---------- Comandos (ponto único de entrada: teclado hoje, chat amanhã) ---------- */
function executarComando(bruto, origem = "teclado") {
  if (fim) return false;
  const t = String(bruto).toUpperCase().replace(/[^A-Z0-9]/g, "");
  let m;
  if ((m = t.match(/^([A-E])([1-9])$/))) {
    const r = LINHAS.indexOf(m[1]), c = +m[2] - 1;
    if (paAtiva && origem !== "tiktok") {              // com a pá ligada, a casa escolhida é esvaziada
      paAtiva = false;
      return agendar({ tipo: "remover", r, c, rotulo: t, origem });
    }
    if (modoSel === "monstro" && origem !== "tiktok") return executarComando("Z" + (monstroSel + 1) + t, origem);   // card de monstro escolhido: coloca o monstro na casa
    // presente esperando: a casa digitada (ou clicada depois de escolher o nome na lista) é dele, sem gastar energia
    const pendAlvo = pendenteSel || (origem !== "clique" && origem !== "tiktok" ? pendentes[0] : null);
    if (pendAlvo && origem !== "tiktok") {
      if (grade[r][c] && !podeFundir(r, c, pendAlvo.tipo)) { registrar(origem, `${t} está ocupada, escolha outra casa`, false); return false; }
      return colocarPendente(pendAlvo, r, c);
    }
    return agendar({ tipo: "colocar", carta: cartaSel, r, c, rotulo: t, origem });   // FILA_ACOES: acontece no próximo passo
  }
  if ((m = t.match(/^X([A-E])([1-9])$/))) {             // X + casa: remove o guerreiro (ex.: XC3)
    return agendar({ tipo: "remover", r: LINHAS.indexOf(m[1]), c: +m[2] - 1, rotulo: m[1] + m[2], origem });
  }
  // Monstros: Z + linha (entra pela floresta) ou Z + casa (aparece naquela casa).
  // Um número logo depois do Z escolhe o card de monstro: Z2C (card 2 na linha C), Z2C7 (card 2 na casa C7)
  if ((m = t.match(/^Z([1-9])?([A-E])([1-9])?$/))) {
    const idx = m[1] ? +m[1] - 1 : monstroSel;
    if (modoM) {                                        // MODO_MONSTERS: só numa casa, pagando energia
      if (!m[3]) { registrar(origem, "Clique numa casa do gramado para colocar o monstro", false); return false; }
      return agendar({ tipo: "monstroM", idx, r: LINHAS.indexOf(m[2]), c: +m[3] - 1, origem });
    }
    const id = MONSTROS_CARTAS[idx];
    if (!id) { registrar(origem, `O card de monstro ${idx + 1} ainda está vazio`, false); return false; }
    return agendar({ tipo: "monstroZ", id, r: LINHAS.indexOf(m[2]), col: m[3] ? +m[3] - 1 : null, rotulo: m[2] + (m[3] || ""), origem });
  }
  registrar(origem, `“${String(bruto).slice(0, 12)}” não é um comando. Use A2, ZC ou XC3.`, false);
  return false;
}
window.executarComando = executarComando; // a integração com a live chamará esta função

// Verifica o card (liberado, estoque, recarga, energia) antes de colocar o guerreiro
function tentarColocar(idx, r, c, pos) {
  const carta = cartas[idx];
  if (!carta) return { ok: false, msg: "Escolha um card primeiro." };
  const g = GUERREIROS[carta.id];
  const falha = msg => { carta.tremer = .4; return { ok: false, msg }; };
  if (carta.bloqueio > 0) return falha(`${g.nome} será liberado em ${Math.ceil(carta.bloqueio)}s`);
  if (carta.estoque === 0) return falha(`${g.nome} esgotado`);
  if (carta.recarga > 0) return falha(`${g.nome} recarregando (${Math.ceil(carta.recarga)}s)`);
  if (!MODO_TESTE.energiaInfinita && energia < g.custo) { energiaFalha = .7; return falha(`Falta energia: ${g.nome} custa ${g.custo}`); }
  if (grade[r][c]) { efeitosCelula.push({ r, c, t: 0, bom: false }); return falha(`${pos} já está ocupado`); }
  if (!MODO_TESTE.energiaInfinita) energia -= g.custo;
  carta.recarga = MODO_TESTE.semRecarga ? 0 : g.recarga;
  if (carta.estoque !== null) carta.estoque--;
  plantar(r, c, carta.id);
  return { ok: true, msg: `${g.nome} colocado em ${pos}` };
}

// FUSÃO: colocar o MESMO guerreiro em cima de um que já está na arena faz ele subir 1 nível
// (fica mais forte e recupera a vida). Custa o mesmo que colocar um novo.
function podeFundir(r, c, tipo) {
  const p = grade[r][c];
  return !!(p && !p.morte && p.tipo === tipo && (p.nivel || 1) < NIVEIS.max);
}
function fundirGuerreiro(r, c) {
  const p = grade[r][c], g = GUERREIROS[p.tipo];
  p.nivel = (p.nivel || 1) + 1; p.mult = multNivel(p.nivel) * bonusConta(p.tipo, "heroes");
  p.max = Math.round(g.vida * p.mult); p.hp = p.max;              // mais forte e com a vida cheia
  p.flash = .5; p.nasc = .6;                                      // "pulinho" de evolução
  textos.push({ x: p.x, y: p.y - 120, txt: `⬆ Nv ${p.nivel}!`, cor: corDoNivel(p.nivel), t: 0 });
  parts.push({ x: p.x, y: p.y - 50, vx: 0, vy: 0, g: 0, vida: 0, max: .5, tam: 30, cor: corDoNivel(p.nivel), tipo: "anel" });
  for (let i = 0; i < 22; i++) parts.push({
    x: p.x + rand(-24, 24), y: p.y - rand(10, 100), vx: rand(-60, 60), vy: rand(-200, -60), g: -20,
    vida: 0, max: rand(.5, 1), tam: rand(2, 4.5), cor: i % 2 ? "#ffd97a" : corDoNivel(p.nivel), tipo: "ponto"
  });
  somPersonagem(SOM_FUSAO, "fundir", .8, 60, .04);
  return p.nivel;
}
// EVOLUIR NA ARENA: clique num guerreiro que já está no gramado; se tiver energia, ele sobe 1 nível
// TIRAR DA ARENA: dois cliques rápidos no guerreiro
const DUPLO_CLIQUE_MS = 280;           // tempo máximo entre os 2 cliques para contar como clique duplo
let cliqueGuerreiro = null;
function custoEvoluirGuerreiro(p) { return NIVEIS.custoEvoluir(GUERREIROS[p.tipo], p.nivel || 1); }
function evoluirNoCampo(r, c, origem) {
  const p = grade[r][c];
  if (!p || p.morte) return false;
  if ((p.nivel || 1) >= NIVEIS.max) { registrar(origem, `${GUERREIROS[p.tipo].nome} já está no nível máximo`, false); return true; }
  const custo = custoEvoluirGuerreiro(p);
  if (!MODO_TESTE.energiaInfinita && energia < custo) {
    energiaFalha = .7; efeitosCelula.push({ r, c, t: 0, bom: false });
    registrar(origem, `Falta energia para evoluir ${GUERREIROS[p.tipo].nome}: custa ${custo}`, false); return true;
  }
  if (!MODO_TESTE.energiaInfinita) energia -= custo;
  const nv = fundirGuerreiro(r, c);
  registrar(origem, `${GUERREIROS[p.tipo].nome} em ${LINHAS[r]}${c + 1} subiu para o nível ${nv}!`, true);
  return true;
}
function plantar(r, c, tipo = Object.keys(GUERREIROS)[0]) {
  if (grade[r][c]) { efeitosCelula.push({ r, c, t: 0, bom: false }); return false; }
  const g = GUERREIROS[tipo];
  const lv = nivelG[tipo] || 1, mult = multNivel(lv) * bonusConta(tipo, "heroes"), vidaN = Math.round(g.vida * mult);   // bonusConta = nível do personagem na conta
  const p = {
    r, c, tipo, nivel: lv, mult, x: celX(c), y: chaoY(r), hp: vidaN, max: vidaN, idade: 0, nasc: 0, cd: 0.5,
    recuo: 0, flash: 0, piscar: rand(2, 5), piscT: 0, morte: 0, semente: rand(0, 10),
    gerT: g.intervalo ? g.intervalo * rand(.4, .6) : 0, brilho: 0
  };
  grade[r][c] = p; plantas.push(p);
  efeitosCelula.push({ r, c, t: 0, bom: true });
  if (!simM() && g.andar && g.andar.ok) {        // CAMPO_COMPRIDO: quem tem a animação de andar sai marchando
    const cfgA = { ...MODO_MONSTERS.andar.padrao, ...(MODO_MONSTERS.andar[tipo] || {}) };
    Object.assign(p, { andante: true, andando: true, vel: cfgA.velocidade * rand(.94, 1.06), tAndar: rand(0, 3), c: -1, nasc: 1 });
    grade[r][c] = null;                          // a casa fica livre para outro
    seguraNoPreparo(p);
  }
  for (let i = 0; i < 12; i++) parts.push({
    x: p.x + rand(-26, 26), y: p.y + rand(-4, 4), vx: rand(-40, 40), vy: rand(-70, -20), g: 90,
    vida: 0, max: rand(.4, .7), tam: rand(3, 6), cor: "#d8c79a", tipo: "ponto"
  });
  return true;
}

// Pá: tira o guerreiro da casa (sem devolver energia) e libera o lugar
function removerGuerreiro(r, c, pos) {
  const p = grade[r] && grade[r][c];
  if (!p) { efeitosCelula.push({ r, c, t: 0, bom: false }); return { ok: false, msg: `Não há guerreiro em ${pos}` }; }
  grade[r][c] = null;
  plantas = plantas.filter(q => q !== p);
  for (let i = 0; i < 16; i++) parts.push({
    x: p.x + rand(-24, 24), y: p.y + rand(-6, 2), vx: rand(-90, 90), vy: rand(-170, -50), g: 380,
    vida: 0, max: rand(.45, .8), tam: rand(3, 7), cor: i % 3 ? "#8a6a45" : "#c9a36b", tipo: "ponto"
  });
  parts.push({ x: p.x, y: p.y - 30, vx: 0, vy: 0, g: 0, vida: 0, max: .45, tam: 18, cor: "#fff4d6", tipo: "anel" });
  textos.push({ x: p.x, y: p.y - 96, txt: "removido", cor: "#fff4d6", t: 0 });
  return { ok: true, msg: `${GUERREIROS[p.tipo].nome} removido de ${pos}` };
}
function soltarCriatura(r, escolhido, xFixo) {
  const ids = prontos();
  const tipo = escolhido && ids.includes(escolhido) ? escolhido
    : ids.length ? ids[Math.floor(sorte() * ids.length)] : null;
  const per = tipo ? PERSONAGENS[tipo] : null;
  const c = {
    r, tipo, x: xFixo ?? PORTAO_INIMIGO + rand(0, 30), y: G.top + r * G.ch + G.ch - 14,   // xFixo: colocado numa casa do gramado
    hp: per ? per.vida : 180, max: per ? per.vida : 180,
    vel: per ? per.velocidade * rand(.92, 1.08) : rand(19, 27),
    fase: rand(0, 6), estado: "andar", atk: ATK, flash: 0, empurrao: 0,
    morte: 0, surgir: 0, tAnim: rand(0, 6)
  };
  criaturas.push(c);
  if (per && per.somAparecer) tocar(per.somAparecer, per.sons.volume);  // só no momento em que ele surge
  return c;
}

/* ---------- Presentes da live: cada presente chama um guerreiro ----------
   A pessoa que mandou pode digitar a casa no chat (ex: D3). Se não digitar a tempo, ele entra sozinho numa
   casa livre perto do castelo. Você também pode clicar no nome dela (na lista à esquerda) e depois na casa. */
const PRESENTES = {
  5655: { nome: "Rosa",      guerreiro: "nick" },
  5879: { nome: "Rosquinha", guerreiro: "arqueiro" },
  6427: { nome: "Chapéu",    guerreiro: "mago" },
  6267: { nome: "Foguete",   guerreiro: "sentinela" }
};
const PRESENTE_OPCOES = {
  esperaChat: 20,        // segundos para a pessoa digitar a casa no chat
  maxPorPresente: 10,    // se mandar vários de uma vez (ex: 30 rosas), no máximo esta quantidade de guerreiros
  colunasAuto: [1, 5]    // se entrar sozinho: casas livres entre estas colunas
};
function receberPresente(usuario, giftId, quantidade = 1) {
  const cfg = PRESENTES[giftId];
  if (!cfg) { registrar("tiktok", `🎁 ${usuario} mandou o presente ${giftId} (sem guerreiro na tabela)`, false); return; }
  const n = Math.max(1, Math.min(PRESENTE_OPCOES.maxPorPresente, quantidade | 0));
  for (let i = 0; i < n; i++) pendentes.push({ usuario, tipo: cfg.guerreiro, t: PRESENTE_OPCOES.esperaChat, max: PRESENTE_OPCOES.esperaChat });
  registrar("tiktok", `🎁 ${usuario} mandou ${n > 1 ? n + "x " : ""}${cfg.nome}: ${GUERREIROS[cfg.guerreiro].nome}! Digite a casa no chat (ex: D3)`, true);
}
function receberChat(usuario, texto, teste = false) {
  // aceita "D3", "d3", "D 3", "d3!", "quero D3"... (pega a primeira casa escrita na mensagem)
  const m = String(texto).toUpperCase().match(/(?:^|[^A-Z])([A-E])\s*([1-9])(?![0-9])/);
  if (!m) return false;
  const t = m[1] + m[2];
  let pend = pendentes.find(q => q.usuario.toLowerCase() === String(usuario).toLowerCase());
  if (!pend && teste) pend = pendentes[0];               // no teste, vale para o presente mais antigo da fila
  if (!pend) return false;                               // na live, só quem mandou o presente escolhe a casa
  const r = LINHAS.indexOf(m[1]), c = +m[2] - 1;
  if (grade[r][c] && !podeFundir(r, c, pend.tipo)) { registrar("tiktok", `${usuario}: ${t} está ocupada, escolha outra casa`, false); return false; }
  colocarPendente(pend, r, c);
  return true;
}
function colocarPendente(pend, r, c) {
  if (podeFundir(r, c, pend.tipo)) {                            // presente em cima do mesmo guerreiro: ele sobe de nível
    const nv = fundirGuerreiro(r, c);
    grade[r][c].dono = pend.usuario;
    pendentes = pendentes.filter(q => q !== pend); if (pendenteSel === pend) pendenteSel = null;
    registrar("tiktok", `${GUERREIROS[pend.tipo].nome} de ${pend.usuario} fundiu em ${LINHAS[r]}${c + 1}: nível ${nv}!`, true);
    return true;
  }
  if (grade[r][c]) return false;
  plantar(r, c, pend.tipo);
  const p = grade[r][c];
  if (p) p.dono = pend.usuario;                          // nome de quem mandou fica em cima do guerreiro
  pendentes = pendentes.filter(q => q !== pend);
  if (pendenteSel === pend) pendenteSel = null;
  registrar("tiktok", `${GUERREIROS[pend.tipo].nome} de ${pend.usuario} entrou em ${LINHAS[r]}${c + 1}`, true);
  return true;
}
function atualizarPendentes(dt) {
  for (const pend of pendentes.slice()) {
    pend.t -= dt;
    if (pend.t > 0 || pend === pendenteSel) continue;
    const [c0, c1] = PRESENTE_OPCOES.colunasAuto, livres = [];
    for (let r = 0; r < G.rows; r++) for (let c = c0 - 1; c <= c1 - 1; c++) if (!grade[r][c]) livres.push([r, c]);
    if (!livres.length) { pend.t = 2; continue; }        // sem casa livre: tenta de novo daqui a pouco
    const [r, c] = livres[Math.floor(sorte() * livres.length)];
    colocarPendente(pend, r, c);
  }
}




/* ---------- Campanha: níveis, ondas, chefão, vitória ---------- */
function mostrarBanner(titulo, sub, dur = 3.2, cor = "#ffd97a") { banner = { titulo, sub, t: 0, dur, cor }; }
function montarOnda() {
  const n = camp.nivel, disp = Object.keys(CAMPANHA.entraNoNivel).filter(id => CAMPANHA.entraNoNivel[id] <= n && PERSONAGENS[id]);
  const qtd = CAMPANHA.quantidade(n, camp.onda);
  camp.fila = [];
  for (let i = 0; i < qtd; i++) {
    // os mais fortes aparecem menos: o esqueleto comum sempre é a maioria
    const peso = disp.map(id => id === "esqueleto" ? 3 : 1), tot = peso.reduce((a, b) => a + b, 0);
    let r = sorte() * tot, k = 0; while (r > peso[k]) { r -= peso[k]; k++; }
    camp.fila.push(disp[k]);
  }
  camp.spawnT = 1;
}
function soltarDaCampanha(tipo, extraNivel = 0) {
  if (modoM) return soltarHeroi(tipo === CAMPANHA.chefao, extraNivel);   // MODO_MONSTERS: vêm os heróis
  const ok = prontos();
  if (!ok.includes(tipo)) {                               // imagem dele não carregou: usa outro permitido neste nível
    const perm = ok.filter(id => (CAMPANHA.entraNoNivel[id] || 99) <= camp.nivel || id === tipo);
    if (perm.length) tipo = perm[Math.floor(sorte() * perm.length)];
  }
  const c = soltarCriatura(Math.floor(sorte() * G.rows), tipo);
  aplicarNivelMonstro(c, nivelDosMonstros(extraNivel));
  return c;
}
// NIVEL_CONTA: +5% de vida e dano por nível do personagem na conta (tela Personagens). Vale só para as SUAS tropas.
function bonusConta(tipo, lado) {
  if (rede && lado) {                                         // ONLINE: o nível que cada jogador tem na conta dele
    const n = Number((rede.niveis[lado] || {})[tipo]) || 1;
    return 1 + 0.05 * (Math.min(15, Math.max(1, n)) - 1);
  }
  if (pvp && lado && lado !== pvp.ladoLocal) return 1;     // tropa do outro jogador (bot): sem o SEU nível da conta
  return window.PERFIL && PERFIL.bonusPersonagem ? PERFIL.bonusPersonagem(tipo) : 1;
}
function aplicarNivelMonstro(c, lv) {
  const m = multNivel(lv);
  c.nivel = lv; c.forca = m;
  c.hp = c.max = Math.round(c.max * m);
}
function monstrosVivos() {                              // no modo Monsters, conta os heróis que ainda vêm
  if (modoM) return plantas.filter(p => p.inimigo && !p.morte).length;
  return criaturas.filter(c => !c.morte).length;
}
// Fim do nível: todos os guerreiros saem da arena. Só os que vieram de PRESENTE da live devolvem a energia
// deles para você (os que você comprou não devolvem nada). Cada guerreiro vivo dá 1 ponto de experiência ao tipo dele.
function encerrarNivel() {
  vidaInimigo = 100;                                    // o castelo do outro lado também é reconstruído
  if (modoM) {                                          // MODO_MONSTERS: seus monstros saem da arena
    for (const c of criaturas) if (!c.morte) for (let i = 0; i < 12; i++) parts.push({
      x: c.x + rand(-20, 20), y: c.y - rand(10, 90), vx: rand(-40, 40), vy: rand(-160, -60), g: -30,
      vida: 0, max: rand(.5, 1), tam: rand(2, 4), cor: i % 2 ? "#b8ff6a" : "#e8dfc8", tipo: "ponto"
    });
    criaturas = []; plantas = [];
    energia += CAMPANHA.energiaPorNivel; vida = 100;
    return { devolvida: 0, subiram: [] };
  }
  let devolvida = 0; const subiram = [];
  for (const p of plantas) {
    if (p.morte) continue;
    const g = GUERREIROS[p.tipo];
    if (p.dono) devolvida += g.custo;                              // presente da live: a energia volta para você
    xpG[p.tipo] = (xpG[p.tipo] || 0) + 1;
    if (xpG[p.tipo] >= NIVEIS.xpParaSubir(nivelG[p.tipo]) && nivelG[p.tipo] < NIVEIS.max) { nivelG[p.tipo]++; xpG[p.tipo] = 0; subiram.push(`${g.nome} Nv ${nivelG[p.tipo]}`); }
    for (let i = 0; i < 16; i++) parts.push({                    // some num brilho dourado
      x: p.x + rand(-20, 20), y: p.y - rand(10, 90), vx: rand(-40, 40), vy: rand(-160, -60), g: -30,
      vida: 0, max: rand(.5, 1), tam: rand(2, 4), cor: i % 2 ? "#ffd97a" : "#fff4d6", tipo: "ponto"
    });
  }
  plantas = []; criaturas = []; grade = Array.from({ length: G.rows }, () => Array(G.cols).fill(null));
  pendentes = pendentes.slice();                                  // presentes ainda na fila continuam esperando
  energia += devolvida + CAMPANHA.energiaPorNivel; if (devolvida) energiaPulso = 1;
  vida = 100;                                                     // o castelo é reconstruído para o próximo nível
  return { devolvida, subiram };
}
// MOEDAS: cada nível da campanha concluído dá moedas da conta (PERFIL.ECONOMIA no perfil.js)
function premioNivel(comChefe) {
  if (!window.PERFIL) return 0;
  const E = PERFIL.ECONOMIA, n = E.campanhaNivel + (comChefe ? E.campanhaChefe : 0);
  const r = PERFIL.ganharMoedas(n, modoM ? "monsters" : "heroes");   // lado em alta: +50%; os dois lados no dia: +150
  return r.ganho + (r.alta ? " (lado em alta!)" : "") + (r.duplo ? ` · bônus dos dois lados +${r.duplo}` : "");
}
function concluirNivel(porCastelo) {
  const n = camp.nivel;
  if (n >= CAMPANHA.niveis) { vitoria(); return; }
  const res = encerrarNivel();
  camp.fase = "nivelOk"; camp.t = CAMPANHA.pausaEntreNiveis; camp.fila = []; camp.chefe = null;
  const txtEnergia = res.devolvida ? `🎁 +${res.devolvida} de energia dos presentes` : "Pegue energia para montar a defesa";
  const ganho = premioNivel(porCastelo);
  mostrarBanner(porCastelo ? "CASTELO INIMIGO DERRUBADO!" : `NÍVEL ${n} CONCLUÍDO!`, `🪙 +${ganho} moedas · ${txtEnergia}${res.subiram.length ? " · ⬆ " + res.subiram.join(", ") : ""}`, 4, "#8ff0a4");
  tocar(SONS_JOGO.proximoNivel.som, SONS_JOGO.proximoNivel.volume, 0, 0);
}
function atualizarCampanha(dt) {
  if (fim) return;
  if (vidaInimigo <= 0 && camp.fase !== "nivelOk") { concluirNivel(true); return; }   // CAMPO_COMPRIDO
  const n = camp.nivel, total = CAMPANHA.ondas(n);
  switch (camp.fase) {
    case "preparo":                                  // tempo para montar a defesa
      camp.t -= dt;
      if (camp.t <= 0) { camp.onda = 1; montarOnda(); camp.fase = "onda"; mostrarBanner(`ONDA 1 DE ${total}`, "Eles estão chegando!", 2.2); }
      break;
    case "onda":
      camp.spawnT -= dt;
      if (camp.spawnT <= 0 && camp.fila.length) { soltarDaCampanha(camp.fila.shift()); camp.spawnT = CAMPANHA.intervalo(n) * rand(.75, 1.25); }
      if (!camp.fila.length && monstrosVivos() === 0) {
        if (camp.onda < total) { camp.fase = "pausa"; camp.t = CAMPANHA.pausaEntreOndas; mostrarBanner(`ONDA ${camp.onda + 1} DE ${total}`, "Prepare seus guerreiros!", 2.6); }
        else { camp.fase = "chefePrep"; camp.t = 4; mostrarBanner("⚠ CHEFÃO ⚠", "O Esqueleto Titã se aproxima...", 3.4, "#ff6b5e"); if (!reduzMov) tremor = Math.max(tremor, .3); }
      }
      break;
    case "pausa":
      camp.t -= dt;
      if (camp.t <= 0) { camp.onda++; montarOnda(); camp.fase = "onda"; }
      break;
    case "chefePrep":
      camp.t -= dt;
      if (camp.t <= 0) {
        const c = soltarDaCampanha(CAMPANHA.chefao, CAMPANHA.nivelExtraChefao);
        if (c) { c.chefe = true; camp.chefe = c; } else camp.chefe = { morte: 1 };
        camp.fase = "chefe";
      }
      break;
    case "chefe":
      // o nível acaba quando o chefão sai de cena: derrotado OU depois de invadir o castelo (se o castelo aguentou)
      if (camp.chefe && (camp.chefe.morte || camp.chefe.fora || !(modoM ? plantas : criaturas).includes(camp.chefe)) && monstrosVivos() === 0) {
        if (n >= CAMPANHA.niveis) { vitoria(); break; }
        const res = encerrarNivel();
        camp.fase = "nivelOk"; camp.t = CAMPANHA.pausaEntreNiveis;
        const txtEnergia = res.devolvida ? `🎁 +${res.devolvida} de energia dos presentes` : "Pegue energia para montar a defesa";
        const ganho = premioNivel(true);
        mostrarBanner(`NÍVEL ${n} CONCLUÍDO!`, `🪙 +${ganho} moedas · ${txtEnergia}${res.subiram.length ? " · ⬆ " + res.subiram.join(", ") : ""}`, 4, "#8ff0a4");
        tocar(SONS_JOGO.proximoNivel.som, SONS_JOGO.proximoNivel.volume, 0, 0);   // som de próximo nível
      }
      break;
    case "nivelOk":
      camp.t -= dt;
      if (camp.t <= 0) {
        camp.nivel++; camp.onda = 0; camp.fase = "preparo"; camp.t = CAMPANHA.preparo; camp.chefe = null;
        const noite = CAMPANHA.ehNoite(camp.nivel);
        definirNoite(noite);
        mostrarBanner(`NÍVEL ${camp.nivel}`, `${noite ? "🌙 Noite: sem energia do céu" : "☀️ Dia"} · monstros nível ~${nivelDosMonstros()} · monte sua defesa!`, 3.6);
      }
      break;
  }
}
function vitoria() {
  fim = true;
  $("fimTitulo").textContent = "🏆 Vitória!";
  $("fimTxt").textContent = `O castelo resistiu aos ${CAMPANHA.niveis} níveis e derrotou ${abatidas} monstros.`;
  $("fim").classList.add("on", "venceu");
}

/* ---------- Energia ---------- */
// lado: "heroes" ou "monsters" (no PvP cada um tem a sua; as posições ficam como na partida por dentro)
function criarOrbe(x, y, alvoY, valor, pulo, lado) {
  orbes.push({ lado: lado || null, sim: !!lado,
    id: proxIdOrbe++, x, y, alvoY, valor, estado: pulo ? "pulando" : "caindo", vida: 0, t: 0, fase: rand(0, 6),
    vx: pulo ? rand(-40, 40) : 0, vy: pulo ? -190 : 0
  });
}
function coletar(o) {
  if (o.estado === "coletando") return;
  o.estado = "coletando"; o.t = 0; o.sx = orbeX(o); o.sy = o.y;
  if (!o.lado || o.lado === ladoQueJoga()) textos.push({ x: o.sim ? o.x : xVisto(o.x), y: o.y - 30, txt: "+" + o.valor, cor: "#ffd34d", t: 0 });
}
function orbeX(o) { return o.sim ? xVisto(o.x) : o.x; }    // onde a energia aparece na SUA tela
function coletarTudo(lado) { for (const o of orbes) if (!o.lado || !lado || o.lado === lado) coletar(o); }
const POS_ENERGIA = { x: 76, y: 57 };   // centro do ícone de energia (a barra de cards recalcula sozinha). As energias voam até aqui
function atualizarEnergia(dt) {
  ceuT -= dt;
  if (ceuT <= 0) {
    ceuT = rand(ENERGIA_CEU.intervaloMin, ENERGIA_CEU.intervaloMax);
    if (!pvp && (!noiteAtual || (modoM && MODO_MONSTERS.energiaDeNoite))) criarOrbe(rand(G.left + 40, G.right - 40), -40, rand(G.top + 30, G.bottom - 30), ENERGIA_CEU.valor, false);
  }
  for (const o of orbes) {
    if (o.estado === "caindo") {
      o.y += 75 * dt; o.x += Math.sin(tempo * 1.6 + o.fase) * 14 * dt;
      if (o.y >= o.alvoY) { o.y = o.alvoY; o.estado = "parado"; }
    } else if (o.estado === "pulando") {
      o.x += o.vx * dt; o.y += o.vy * dt; o.vy += 420 * dt;
      if (o.vy > 0 && o.y >= o.alvoY) { o.y = o.alvoY; o.estado = "parado"; }
    } else if (o.estado === "parado") {
      o.vida += dt;
      if (o.vida > ENERGIA_CEU.duracao) o.fora = true;
    } else {
      o.t += dt / .55;
      if (o.t >= 1) {
        o.fora = true; if (o.lado === "monsters") energiaM += o.valor; else energia += o.valor;
        if (!o.lado || o.lado === ladoQueJoga()) energiaPulso = 1;
        for (let i = 0; i < 8; i++) parts.push({
          x: POS_ENERGIA.x, y: POS_ENERGIA.y, vx: rand(-90, 90), vy: rand(-90, 90), g: 0,
          vida: 0, max: rand(.3, .5), tam: rand(2, 4), cor: "#ffd34d", tipo: "ponto"
        });
      }
    }
  }
  orbes = orbes.filter(o => !o.fora);
  for (const c of cartas) {
    c.bloqueio = Math.max(0, c.bloqueio - dt);
    c.recarga = Math.max(0, c.recarga - dt);
    c.tremer = Math.max(0, c.tremer - dt);
  }
  energiaPulso = Math.max(0, energiaPulso - dt * 3);
  energiaFalha = Math.max(0, energiaFalha - dt);
}
function posOrbe(o) {
  if (o.estado !== "coletando") return { x: orbeX(o), y: o.y + (o.estado === "parado" ? Math.sin(tempo * 3 + o.fase) * 3 : 0), s: 1 };
  const k = easeInOut(Math.min(1, o.t)), t0 = paraTela(o.sx, o.sy);   // voa da tela até o botão de energia
  return {
    tela: true,
    x: lerp(t0.x, POS_ENERGIA.x, k),
    y: lerp(t0.y, POS_ENERGIA.y, k) - Math.sin(k * Math.PI) * 80,
    s: 1 - k * .5
  };
}

/* ---------- Lógica ---------- */
function inimigoPerto(p, alcance) {
  return criaturas.some(c => c.r === p.r && !c.morte && c.surgir > .3 && c.x - p.x > -10 && c.x - p.x < alcance);
}
// Dano em monstro: se ele tem escudo, parte do dano é bloqueada e o escudo reage
function ferirCriatura(c, dano, cor) {
  const per = c.tipo && PERSONAGENS[c.tipo], esc = per && per.escudo;
  const bloqueou = !!esc;
  if (bloqueou) dano = Math.max(1, Math.round(dano * (1 - esc.defesa)));
  c.hp -= dano; c.flash = bloqueou ? .3 : 1; c.empurrao = bloqueou ? .5 : 1;
  textos.push({ x: c.x + rand(-8, 8), y: c.y - 108, txt: "-" + dano, cor: bloqueou ? "#a9c8ff" : cor, t: 0 });
  if (bloqueou) impactoEscudo(c, per);
  if (c.hp <= 0) matarCriatura(c);
  return bloqueou;
}
// Efeito do escudo sendo atingido: clarão metálico, onda de choque, faíscas e um tranco curto
function impactoEscudo(c, per) {
  const e = per.escudo, sx = c.x - e.x, sy = c.y + e.y;
  c.escudoFx = 1; c.escudoY = rand(-e.raio * .45, e.raio * .45);
  for (let i = 0; i < 14; i++) parts.push({
    x: sx - 6, y: sy + c.escudoY, vx: rand(-260, -40), vy: rand(-200, 90), g: 480,
    vida: 0, max: rand(.18, .45), tam: rand(1.8, 3.4), cor: ["#ffffff", "#ffe7a3", "#bcd6ff"][i % 3], tipo: "ponto"
  });
  parts.push({ x: sx - 4, y: sy + c.escudoY, vx: 0, vy: 0, g: 0, vida: 0, max: .3, tam: 14, cor: "#d6e6ff", tipo: "anel" });
  if (per.somEscudo) tocar(per.somEscudo, per.sons.volumeEscudo ?? .8, 60, .08);
  if (!reduzMov) tremor = Math.max(tremor, .05);
}
function desenharEscudoFx(c, per) {
  const e = per.escudo, f = c.escudoFx || 0;
  if (!e || f <= 0 || c.morte) return;
  const sx = c.x + c.empurrao * 10 - e.x, sy = c.y + e.y, iy = sy + (c.escudoY || 0);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  // clarão no metal
  const gl = ctx.createRadialGradient(sx, iy, 2, sx, iy, e.raio * 1.7);
  gl.addColorStop(0, `rgba(215,232,255,${.8 * f})`); gl.addColorStop(.4, `rgba(150,190,255,${.35 * f})`); gl.addColorStop(1, "rgba(120,160,255,0)");
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(sx, iy, e.raio * 1.7, 0, 7); ctx.fill();
  // onda de choque em arco, saindo na frente do escudo
  const R = e.raio * (1 + (1 - f) * 1.2);
  ctx.lineCap = "round";
  ctx.strokeStyle = `rgba(190,220,255,${.9 * f})`; ctx.lineWidth = 1.5 + 3.5 * f;
  ctx.beginPath(); ctx.ellipse(sx - 6, sy, R * .5, R * 1.15, 0, Math.PI * .62, Math.PI * 1.38); ctx.stroke();
  ctx.strokeStyle = `rgba(255,236,190,${.55 * f})`; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(sx - 10, sy, R * .36, R * .85, 0, Math.PI * .66, Math.PI * 1.34); ctx.stroke();
  // estrela de brilho no ponto do impacto
  if (f > .45) {
    const t = (f - .45) / .55, r1 = 14 * t, r2 = 3 * t;
    ctx.fillStyle = `rgba(255,255,255,${t})`;
    ctx.beginPath();
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, r = k % 2 ? r2 : r1; ctx.lineTo(sx - 6 + Math.cos(a) * r, iy + Math.sin(a) * r); }
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function golpeEspada(p, g) {
  const alvo = criaturas
    .filter(c => c.r === p.r && !c.morte && c.x - p.x > -10 && c.x - p.x < g.alcance + 10)
    .sort((a, b) => a.x - b.x)[0];
  if (g.efeitoCorte !== false) parts.push({ x: p.x + 40, y: p.y - 58, vx: 0, vy: 0, g: 0, vida: 0, max: .22, tam: 46, cor: "#ffffff", tipo: "corte" });
  if (!alvo) return;
  const bloq = ferirCriatura(alvo, Math.round(g.dano * (p.mult || 1)), "#ffffff");
  if (!bloq) alvo.empurrao = 1.4;
  if (!bloq) for (let i = 0; i < 10; i++) parts.push({
    x: alvo.x - 10, y: alvo.y - rand(40, 80), vx: rand(20, 160), vy: rand(-140, 40), g: 300,
    vida: 0, max: rand(.25, .5), tam: rand(2, 4), cor: i % 2 ? "#ffffff" : "#cfe3ff", tipo: "ponto"
  });
  if (!reduzMov) tremor = Math.max(tremor, .08);
}
function alvoNaLinha(p) {
  return criaturas.some(c => c.r === p.r && !c.morte && c.x > p.x - 10 && (ladoB(p.x) ? ladoB(c.x) : c.x < G.right + 40));
}
function atirar(p) {
  tiros.push({ r: p.r, x: p.x + 20, y: p.y - 76, v: 470, dano: 20, vida: 0 });
  p.recuo = 1;
  tocar(SONS_JOGO.tiroPlanta.som, SONS_JOGO.tiroPlanta.volume, 70, 0.08);
  for (let i = 0; i < 6; i++) parts.push({
    x: p.x + 24, y: p.y - 76, vx: rand(20, 120), vy: rand(-60, 60), g: 0,
    vida: 0, max: rand(.15, .3), tam: rand(2, 4), cor: C.spike, tipo: "ponto"
  });
}
// Arqueiro: solta uma flecha que voa pela linha
// Mago: solta a esfera de energia pela linha
function lancarMagia(p, g) {
  const m = g.magia;
  tiros.push({ tipo: "magia", dono: p.tipo, pl: p, estilo: m.estilo || "gelo", r: p.r, x: p.x + m.saidaX, y: p.y + m.saidaY, xMin: p.x - 10, v: m.velocidade,
               dano: Math.round(m.dano * (p.mult || 1)), danoArea: Math.round(m.danoArea * (p.mult || 1)), raio: m.raio, vida: 0 });
  explosoes.push({ x: p.x + m.saidaX, y: p.y + m.saidaY, t: 0, dur: .25, tipo: "saida", estilo: m.estilo || "gelo" });
  if (g.somMagia) tocar(g.somMagia, g.sons.volumeMagia ?? .7, 60, .05);
}
// Esfera acertou: explosão de energia com dano em área
function explosaoMagia(s, alvo) {
  const hx = alvo.x - 8, hy = s.y;
  const P = PALETAS_MAGIA[s.estilo] || PALETAS_MAGIA.gelo;
  if (s.dono) somPersonagem(GUERREIROS[s.dono], "impacto", .7, 60, .06);
  const perA = alvo.tipo && PERSONAGENS[alvo.tipo];
  if (perA && perA.necro && s.pl) {                          // acertou um Esqueleto Mago
    s.pl.acertosNecro = (s.pl.acertosNecro || 0) + 1;
    if (s.pl.acertosNecro % (MAGO_X_NECRO.acertos) === 0) raiosNosInvocados(alvo, s);
  }
  explosoes.push({ x: hx, y: hy, chaoY: alvo.y, t: 0, dur: s.estilo === "fogo" ? .85 : .6, tipo: "impacto", raio: s.raio, estilo: s.estilo, seed: rand(0, 6) });
  for (const c of criaturas) {
    if (c === alvo || c.morte || c.surgir < .3) continue;
    if (Math.hypot(c.x - hx, (c.y - 50) - hy) < s.raio) ferirCriatura(c, s.danoArea, P.cor);
  }
  for (let i = 0; i < 22; i++) {
    const a = rand(0, Math.PI * 2), v = rand(90, 300);
    parts.push({ x: hx, y: hy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, g: 160,
                 vida: 0, max: rand(.3, .65), tam: rand(1.8, 3.8), cor: P.faiscas[i % 3], tipo: "ponto" });
  }
  if (!reduzMov) tremor = Math.max(tremor, .12);
}
// Mago contra Esqueleto Mago: depois de 2 acertos nele, a magia salta em raios para os esqueletos que ele invocou
const MAGO_X_NECRO = { acertos: 2, alvos: 3, dano: 70 };
function raiosNosInvocados(necro, s) {
  const alvos = criaturas.filter(c => c.dono === necro && !c.morte && (c.brotar == null || c.brotar >= 1)).slice(0, MAGO_X_NECRO.alvos);
  const P = PALETAS_MAGIA[s.estilo] || PALETAS_MAGIA.gelo;
  for (const c of alvos) {
    explosoes.push({ tipo: "raio", x: necro.x, y: necro.y - 60, x2: c.x, y2: c.y - 50, t: 0, dur: .45, estilo: s.estilo, seed: rand(0, 99) });
    explosoes.push({ x: c.x - 6, y: c.y - 50, chaoY: c.y, t: 0, dur: .5, tipo: "impacto", raio: 45, estilo: s.estilo, seed: rand(0, 6) });
    ferirCriatura(c, Math.round(MAGO_X_NECRO.dano * ((s.pl && s.pl.mult) || 1)), P.cor);
  }
  if (alvos.length) { textos.push({ x: necro.x, y: necro.y - 150, txt: "⚡ RAIOS!", cor: P.cor, t: 0 }); if (!reduzMov) tremor = Math.max(tremor, .12); }
}
function atirarFlecha(p, g) {
  const f = g.flecha;
  tiros.push({ tipo: "flecha", r: p.r, x: p.x + f.saidaX, y: p.y + f.saidaY, xMin: p.x - 10, v: f.velocidade, dano: Math.round(f.dano * (p.mult || 1)), vida: 0 });
  if (g.somTiro) tocar(g.somTiro, g.sons.volumeTiro ?? 0.5, 70, 0.06);
}
// Esqueleto Arqueiro: solta uma flecha para a esquerda, na linha dele
function flechaInimiga(c, per) {
  const t = per.tiro;
  tiros.push({ tipo: "flechaInimiga", r: c.r, x: c.x - t.saidaX, y: c.y + t.saidaY, xMax: c.x + 10, v: -t.velocidade, dano: per.dano || 20, vida: 0, tipoCriatura: c.tipo });
  if (per.somTiro) tocar(per.somTiro, per.sons.volumeTiro ?? 0.4, 70, 0.06);
}
/* ---------- Cavaleiro Sentinela ---------- */
function atualizarSentinela(p, g, dt) {
  const S = g.sentinela, A = g.sprite.anims;
  p.cdTerra = (p.cdTerra ?? 0) - dt;
  const naLinha = criaturas.filter(c => c.r === p.r && !c.morte && c.surgir > .3 && c.x > p.x - 30 && (ladoB(p.x) ? ladoB(c.x) : c.x < G.right + 10));
  const perto = naLinha.some(c => c.x - p.x < S.alcance);
  if (p.acao) {
    const an = A[p.acao];
    p.tA += dt;
    const q = Math.floor(p.tA * an.fps);
    if (p.acao === "atacando") {
      S.quadrosGolpe.forEach((k, i) => {
        if (q >= k && !p.golpes[i]) { p.golpes[i] = true; golpeSentinela(p, g); }
      });
      p.escudoErguido = q >= S.quadrosDefesa[0] && q <= S.quadrosDefesa[1];
    } else {
      p.escudoErguido = false;
      if (!p.impacto && q >= S.quadroImpacto) { p.impacto = true; lancarOndaTerra(p, g); }
    }
    if (q >= an.quadros) { p.acao = null; p.escudoErguido = false; }
    return;
  }
  if (naLinha.length >= S.minimoParaTerra && p.cdTerra <= 0 && A.terremoto.ok) {
    p.acao = "terremoto"; p.tA = 0; p.impacto = false; p.cdTerra = S.recargaTerra;
  } else if (perto && A.atacando.ok) {
    p.acao = "atacando"; p.tA = 0; p.golpes = [];
  }
}
// Golpe de espada: acerta todos os monstros ao alcance, com clarão no fio da espada
function golpeSentinela(p, g) {
  const S = g.sentinela;
  const alvos = criaturas.filter(c => c.r === p.r && !c.morte && c.surgir > .3 && c.x - p.x > -30 && c.x - p.x < S.alcance);
  for (const c of alvos) {
    ferirCriatura(c, Math.round(S.danoGolpe * (p.mult || 1)), "#ffffff"); c.empurrao = Math.max(c.empurrao, 1.6);
    for (let i = 0; i < 8; i++) parts.push({ x: c.x - 10, y: c.y - rand(40, 80), vx: rand(40, 220), vy: rand(-160, 40), g: 420,
      vida: 0, max: rand(.2, .4), tam: rand(2, 3.5), cor: i % 2 ? "#ffffff" : "#ffe7a3", tipo: "ponto" });
  }
  explosoes.push({ x: p.x + 70, y: p.y - 70, t: 0, dur: .22, tipo: "saida", estilo: "gelo" });
  somPersonagem(g, "golpe", .8, 60, .08);
  if (alvos.length && !reduzMov) tremor = Math.max(tremor, .1);
}
// Espada no chão: uma onda de terra corre pela linha inteira e acerta todos os monstros dela
function lancarOndaTerra(p, g) {
  const S = g.sentinela;
  somPersonagem(g, "terra", .9, 60, .03);
  ondasTerra.push({ fim: ladoB(p.x) ? MW + 20 : PORTAO_X, r: p.r, y: p.y, x0: p.x + 30, frente: p.x + 30, v: S.velocidadeOnda, dano: Math.round(S.danoTerra * (p.mult || 1)), acertados: new Set(), picos: [], proxPico: p.x + 40, t: 0 });
  explosoes.push({ x: p.x + 30, y: p.y - 8, chaoY: p.y, t: 0, dur: .6, tipo: "impacto", raio: 70, estilo: "fogo", seed: rand(0, 6) });
  for (let i = 0; i < 26; i++) parts.push({ x: p.x + rand(-10, 60), y: p.y - rand(0, 8), vx: rand(-200, 260), vy: rand(-380, -120), g: 700,
    vida: 0, max: rand(.5, 1), tam: rand(3, 7), cor: ["#6b4a2e", "#8a6a45", "#3f2a1a"][i % 3], tipo: "ponto" });
  if (!reduzMov) tremor = Math.max(tremor, .35);
}
function atualizarOndasTerra(dt) {
  for (const o of ondasTerra) {
    o.t += dt;
    if (o.frente < o.fim + 20) o.frente += o.v * dt;
    while (o.proxPico < Math.min(o.frente, o.fim)) {            // pedras de terra brotando conforme a onda passa
      o.picos.push(novoBlocoTerra(o.proxPico + rand(-6, 6), 0, rand(40, 64), rand(36, 48), rand(-.16, .16)));
      o.picos.push(novoBlocoTerra(o.proxPico + rand(16, 26), -.05, rand(20, 32), rand(22, 30), rand(.1, .32)));   // torrão menor ao lado
      for (let i = 0; i < 5; i++) parts.push({ x: o.proxPico + rand(-14, 14), y: o.y - rand(0, 6), vx: rand(-80, 80), vy: rand(-260, -90), g: 650,
        vida: 0, max: rand(.4, .8), tam: rand(2, 5), cor: i % 2 ? "#6b4a2e" : "#3f2a1a", tipo: "ponto" });
      o.proxPico += rand(34, 46);
    }
    for (const pc of o.picos) pc.t += dt;
    o.picos = o.picos.filter(pc => pc.t < 1.1);
    for (const c of criaturas) {                                  // quem a onda alcança é atingido e jogado para cima
      if (c.r !== o.r || c.morte || c.surgir < .3 || o.acertados.has(c) || c.x > o.frente || c.x < o.x0 - 20) continue;
      o.acertados.add(c);
      ferirCriatura(c, o.dano, "#ffcf8a"); c.empurrao = Math.max(c.empurrao, 2.2); c.pulo = 1;
    }
  }
  ondasTerra = ondasTerra.filter(o => o.frente < o.fim + 20 || o.picos.length);
}
// Bloco de terra: forma arredondada irregular, camadas de solo, pedrinhas e, às vezes, um tufo de grama no topo
function novoBlocoTerra(x, t, h, w, inc) {
  const n = 11, pts = [], pico = rand(.35, .65);
  for (let k = 0; k <= n; k++) {                         // contorno: base larga e topo quebrado, como terra que rachou e subiu
    const u = k / n;
    const perfil = Math.pow(Math.sin(u * Math.PI), .55) * (1 - Math.abs(u - pico) * .35);
    const quebra = u > .15 && u < .85 ? rand(-.09, .05) : 0;           // beirada esfarelada
    pts.push({ x: (u * 2 - 1) * .5 + rand(-.04, .04), y: Math.max(0, perfil * rand(.85, 1) + quebra) });
  }
  const pedras = [];
  for (let k = 0; k < 7; k++) pedras.push({ x: rand(-.36, .36), y: rand(.08, .85), r: rand(.035, .08), claro: sorte() < .5 });
  const camadas = [rand(.22, .32), rand(.45, .58), rand(.68, .78)];
  return { x, t, h, w, inc, pts, pedras, camadas, grama: sorte() < .45, seed: rand(0, 9), poeira: false };
}
function caminhoBloco(pc, w, h) {
  const P = pc.pts.map(p => ({ x: p.x * w, y: -p.y * h }));
  ctx.beginPath(); ctx.moveTo(P[0].x, 3);
  ctx.lineTo(P[0].x, P[0].y);
  for (let k = 1; k < P.length; k++) {                    // curvas suaves entre os pontos (visual "massinha")
    const a = P[k - 1], b = P[k];
    ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
  }
  const u = P[P.length - 1]; ctx.lineTo(u.x, u.y); ctx.lineTo(u.x, 3); ctx.closePath();
}
function desenharOndasTerra() {
  for (const o of ondasTerra) {
    // rachadura escura no chão, do cavaleiro até a frente da onda
    const fimX = Math.min(o.frente, o.fim);
    const someR = Math.max(0, 1 - Math.max(0, o.t - 1.2) / .8);
    if (someR > 0) {
      ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "round";
      const fenda = dy => { ctx.beginPath(); ctx.moveTo(o.x0, o.y - 2 + dy);
        for (let x = o.x0; x < fimX; x += 14) ctx.lineTo(x, o.y - 2 + dy + Math.sin(x * .37) * 3 + Math.sin(x * .11) * 2); ctx.stroke(); };
      ctx.strokeStyle = `rgba(150,110,75,${.35 * someR})`; ctx.lineWidth = 6; fenda(1);     // borda de terra levantada
      ctx.strokeStyle = `rgba(22,12,6,${.8 * someR})`; ctx.lineWidth = 3; fenda(0);        // fenda funda
      ctx.restore();
    }
    for (const pc of o.picos) {
      if (pc.t < 0) continue;
      // sobe rápido com um leve "passar do ponto" e volta; depois afunda de novo na terra
      const u1 = Math.min(1, pc.t / .16);
      const sobe = 1 + 2.2 * Math.pow(u1 - 1, 3) + 1.2 * Math.pow(u1 - 1, 2);
      const desce = pc.t > .55 ? Math.max(0, 1 - (pc.t - .55) / .55) : 1;
      const h = pc.h * sobe * desce, w = pc.w * (.9 + .1 * desce);
      if (h < 1) continue;
      const cx = pc.x, cy = o.y;
      // sombra no chão
      ctx.fillStyle = `rgba(15,8,4,${.35 * desce})`;
      ctx.beginPath(); ctx.ellipse(cx + 6, cy + 2, w * .75, w * .2, 0, 0, 7); ctx.fill();
      // monte de terra solta na base
      const gm = ctx.createRadialGradient(cx, cy - 2, 2, cx, cy - 2, w * .95);
      gm.addColorStop(0, `rgba(96,66,44,${.95 * desce})`); gm.addColorStop(.7, `rgba(74,50,34,${.75 * desce})`); gm.addColorStop(1, "rgba(60,40,28,0)");
      ctx.fillStyle = gm; ctx.beginPath(); ctx.ellipse(cx, cy - 1, w * .95, w * .3, 0, 0, 7); ctx.fill();
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(pc.inc * sobe);
      // corpo do bloco: solo mais claro em cima, escuro embaixo
      caminhoBloco(pc, w, h);
      const gv = ctx.createLinearGradient(0, -h, 0, 3);
      gv.addColorStop(0, "#7d5a40"); gv.addColorStop(.25, "#664832"); gv.addColorStop(.65, "#4b3424"); gv.addColorStop(1, "#2f2118");   // mesma terra do chão
      ctx.fillStyle = gv; ctx.fill();
      ctx.save(); ctx.clip();
      // volume: luz vindo da esquerda (tochas) e sombra suave na direita
      const gh = ctx.createLinearGradient(-w * .5, 0, w * .5, 0);
      gh.addColorStop(0, "rgba(255,190,120,.18)"); gh.addColorStop(.45, "rgba(255,190,120,0)"); gh.addColorStop(1, "rgba(15,8,4,.42)");
      ctx.fillStyle = gh; ctx.fillRect(-w, -h - 4, w * 2, h + 8);
      // camadas de solo (estrias)
      ctx.lineWidth = 1.4; ctx.lineCap = "round";
      for (const cm of pc.camadas) {
        const yy = -h * cm;
        ctx.strokeStyle = "rgba(40,24,14,.35)";
        ctx.beginPath(); ctx.moveTo(-w * .6, yy + 2); ctx.quadraticCurveTo(0, yy - 3 + Math.sin(pc.seed + cm * 9) * 2, w * .6, yy + 1); ctx.stroke();
        ctx.strokeStyle = "rgba(210,160,110,.18)";
        ctx.beginPath(); ctx.moveTo(-w * .6, yy + 3.5); ctx.quadraticCurveTo(0, yy - 1.5, w * .6, yy + 2.5); ctx.stroke();
      }
      // pedrinhas presas na terra
      for (const pd of pc.pedras) {
        const px = pd.x * w, py = -pd.y * h, pr = pd.r * w * 1.4;
        ctx.fillStyle = pd.claro ? "#8a7560" : "#34261b";
        ctx.beginPath(); ctx.ellipse(px, py, pr, pr * .75, pc.seed, 0, 7); ctx.fill();
        ctx.fillStyle = "rgba(255,235,210,.35)";
        ctx.beginPath(); ctx.ellipse(px - pr * .3, py - pr * .3, pr * .35, pr * .25, 0, 0, 7); ctx.fill();
      }
      // topo esfarelado mais claro
      const gt = ctx.createLinearGradient(0, -h, 0, -h + h * .25);
      gt.addColorStop(0, "rgba(150,110,75,.45)"); gt.addColorStop(1, "rgba(150,110,75,0)");
      ctx.fillStyle = gt; ctx.fillRect(-w, -h - 4, w * 2, h * .3);
      ctx.restore();
      // contorno macio (estilo desenho animado, sem ficar duro)
      caminhoBloco(pc, w, h);
      ctx.lineWidth = 2; ctx.strokeStyle = "rgba(36,22,13,.85)"; ctx.lineJoin = "round"; ctx.stroke();
      // brilho de borda do lado da luz
      ctx.save(); caminhoBloco(pc, w, h); ctx.clip();
      ctx.strokeStyle = "rgba(255,215,160,.35)"; ctx.lineWidth = 3;
      caminhoBloco(pc, w * .92, h * .96); ctx.translate(-2, 0); ctx.stroke();
      ctx.restore();
      // tufinho de grama no topo de alguns blocos
      if (pc.grama && h > 20) {
        const topo = pc.pts.reduce((a, b) => b.y > a.y ? b : a);
        const gx = topo.x * w, gy = -topo.y * h;
        ctx.strokeStyle = "#4d6b2f"; ctx.lineWidth = 1.6; ctx.lineCap = "round";
        for (let k = -2; k <= 2; k++) {
          ctx.beginPath(); ctx.moveTo(gx + k * 2.2, gy + 1);
          ctx.quadraticCurveTo(gx + k * 3, gy - 5, gx + k * 3.8 + Math.sin(tempo * 6 + k) * .8, gy - 8 - (2 - Math.abs(k)) * 1.5); ctx.stroke();
        }
      }
      ctx.restore();
      // poeira macia subindo quando o bloco rompe o chão
      if (pc.t < .7) {
        const v = pc.t / .7;
        for (let k = 0; k < 3; k++) {
          const dx = (k - 1) * w * .55 + Math.sin(pc.seed + k) * 4, dy = -v * 22 - k * 4;
          const r = w * (.35 + v * .55);
          const gp = ctx.createRadialGradient(cx + dx, cy - 4 + dy, 1, cx + dx, cy - 4 + dy, r);
          gp.addColorStop(0, `rgba(150,112,78,${.4 * (1 - v)})`); gp.addColorStop(1, "rgba(150,112,78,0)");
          ctx.fillStyle = gp; ctx.beginPath(); ctx.arc(cx + dx, cy - 4 + dy, r, 0, 7); ctx.fill();
        }
      }
      // ao afundar, solta torrões
      if (pc.t > .55 && !pc.esfarelou) {
        pc.esfarelou = true;
        for (let k = 0; k < 4; k++) parts.push({ x: cx + randVis(-w * .4, w * .4), y: cy - randVis(h * .3, h * .9), vx: randVis(-40, 40), vy: randVis(-60, 10), g: 520,
          vida: 0, max: randVis(.35, .6), tam: randVis(2, 4), cor: Math.random() < .5 ? "#6b4a33" : "#4a3322", tipo: "ponto" });
      }
    }
  }
}
// Guerreiro Protetor: anda pelos trechos da folha conforme há monstro perto ou não
function atualizarProtetor(p, g, dt) {
  const T = g.trechos, fps = g.sprite.anims.defendendo.fps, n = g.sprite.anims.defendendo.quadros;
  const ini = k => k - 1;                                   // quadro da folha (1…) -> índice (0…)
  // perigo: monstro chegando perto, ou monstro de longe (arqueiro) que já consegue atirar nele
  const perto = criaturas.some(c => {
    if (c.r !== p.r || c.morte || c.surgir <= .3 || c.x - p.x <= -10) return false;
    const perC = c.tipo && PERSONAGENS[c.tipo];
    const alcance = perC && perC.tiro ? Math.max(g.alcanceEscudo, perC.tiro.alcance + 30) : g.alcanceEscudo;
    return c.x - p.x < alcance;
  });
  if (p.qf == null) { p.qf = rand(ini(T.parado[0]), ini(T.parado[1])); p.vai = 1; }
  const vaiEVolta = (a, b) => {                              // balança entre dois quadros (respiração / segurando)
    p.qf += p.vai * dt * fps * .6;
    if (p.qf >= b) { p.qf = b; p.vai = -1; } else if (p.qf <= a) { p.qf = a; p.vai = 1; }
  };
  const q = p.qf;
  if (perto) {
    if (q >= ini(T.abaixar[0])) { p.qf -= dt * fps; if (p.qf <= ini(T.segurar[1])) p.qf = ini(T.segurar[1]); }   // estava abaixando: ergue de volta
    else if (q < ini(T.segurar[0])) p.qf = Math.min(ini(T.segurar[0]), q + dt * fps);                             // erguendo
    else vaiEVolta(ini(T.segurar[0]), ini(T.segurar[1]));                                                          // segurando
  } else {
    if (q <= ini(T.parado[1])) vaiEVolta(ini(T.parado[0]), ini(T.parado[1]));                                      // parado, respirando
    else if (q < ini(T.segurar[0])) p.qf = Math.max(ini(T.parado[1]), q - dt * fps);                               // desiste de erguer
    else { p.qf += dt * fps; if (p.qf >= n) { p.qf = ini(T.parado[0]); p.vai = 1; } }                              // abaixa e volta ao começo
  }
  p.escudoErguido = p.qf >= ini(T.segurar[0]) - 4 && p.qf <= ini(T.abaixar[0]) + 6;
}
// Guerreiro que ainda está de pé na animação de morte (tem quadroChao): os monstros continuam acertando
function morteComChao(p) {
  const sp = GUERREIROS[p.tipo].sprite, mo = sp && sp.anims.morrendo;
  return mo && mo.ok && mo.quadroChao != null ? mo : null;
}
function alvoGuerreiro(p) {
  if (!p.morte) return true;
  return !p.noChao && !!morteComChao(p);
}
function golpe(c, p) {
  let dano = c.danoFixo ?? ((c.tipo && PERSONAGENS[c.tipo].dano) || 25);
  dano = Math.round(dano * (c.forca || 1));                   // monstros de níveis altos batem mais forte
  const gD = GUERREIROS[p.tipo], bloqueou = gD.defesa && p.escudoErguido;
  if (bloqueou) {                                             // escudo erguido: parte do golpe é bloqueada
    somPersonagem(gD, "bloqueio", .7, 90, .08);
    dano = Math.max(1, Math.round(dano * (1 - gD.defesa)));
    for (let i = 0; i < 6; i++) parts.push({
      x: p.x + 26, y: p.y - rand(40, 80), vx: rand(40, 160), vy: rand(-120, 20), g: 260,
      vida: 0, max: rand(.2, .4), tam: rand(2, 4), cor: i % 2 ? "#ffe08a" : "#ffffff", tipo: "ponto"
    });
  }
  p.hp -= dano; p.flash = bloqueou ? .5 : 1;
  const perG = c.tipo && PERSONAGENS[c.tipo];
  if (perG && perG.somAtacar && !c.semSom) tocar(perG.somAtacar, perG.sons.volumeAtacar ?? 0.7, 120, 0.06); // som do golpe, com tom levemente variado
  textos.push({ x: p.x + rand(-8, 8), y: p.y - 100, txt: "-" + dano, cor: bloqueou ? "#9fd0ff" : "#ff6b5e", t: 0 });
  if (c.tipo && PERSONAGENS[c.tipo].efeito === "fogo") for (let i = 0; i < 8; i++) parts.push({
    x: p.x + 16, y: p.y - rand(20, 70), vx: rand(-40, 40), vy: rand(-110, -40), g: -30,
    vida: 0, max: rand(.4, .8), tam: rand(2, 4), cor: i % 2 ? "#ffb347" : "#ff5a1a", tipo: "ponto"
  });
  for (let i = 0; i < 5; i++) parts.push({
    x: p.x + 14, y: p.y - rand(20, 60), vx: rand(-60, 60), vy: rand(-120, -40), g: 260,
    vida: 0, max: rand(.5, .9), tam: rand(5, 8), cor: C.leaf, tipo: "folha", rot: rand(0, 6), vr: rand(-8, 8)
  });
  if (p.hp <= 0 && !p.morte) {
    p.morte = 0.001; p.atacando = false;
    const gM = GUERREIROS[p.tipo];
    if (!morteComChao(p)) {                  // cai na hora: libera a casa e toca o som agora
      grade[p.r][p.c] = null;
      if (gM.somMorrer) tocar(gM.somMorrer.ok || !gM.somMorrerReserva ? gM.somMorrer : gM.somMorrerReserva, gM.sons.volumeMorrer ?? 0.8, 60); // som de morte do guerreiro
    }                                        // quem tem quadroChao: casa e som só quando ele bate no chão
    if (GUERREIROS[p.tipo].visual !== "sprite") for (let i = 0; i < 16; i++) parts.push({
      x: p.x + rand(-14, 14), y: p.y - rand(10, 80), vx: rand(-110, 110), vy: rand(-200, -60), g: 320,
      vida: 0, max: rand(.7, 1.2), tam: rand(6, 10), cor: i % 3 ? C.leaf : C.bulb, tipo: "folha", rot: rand(0, 6), vr: rand(-10, 10)
    });
  }
}
/* ---------- Esqueleto Titã: anda, luta com quem está perto e soca o chão erguendo ossos na linha ---------- */
function atualizarTita(c, per, dt) {
  const T = per.tita, A = per.anims;
  c.cdOssos = (c.cdOssos ?? 1.2) - dt;
  if (c.acao) {
    const an = A[c.acao];
    const temAnim = an && an.ok, R = T.reserva[c.acao === "socar" ? "soco" : "luta"];
    const fps = temAnim ? an.fps : 10, n = temAnim ? an.quadros : R.quadros;
    c.tA += dt;
    const q = Math.floor(c.tA * fps);
    if (c.acao === "socar") (temAnim ? T.quadrosImpacto : [R.impacto]).forEach((k, i) => {
      if (q >= k && !c.impactos[i]) { c.impactos[i] = true; lancarOssos(c, per); }
    });
    if (c.acao === "lutar") (temAnim ? T.quadrosGolpe : R.golpes).forEach((k, i) => {
      if (q >= k && !c.golpes[i]) { c.golpes[i] = true; golpeTita(c, per); }
    });
    c.estado = "atacar";
    if (q < n) return;
    c.acao = null;          // terminou: decide já neste mesmo quadro (sem mostrar um quadro de caminhada no meio = sem "piscar")
  }
  const naLinha = plantas.filter(p => p.r === c.r && alvoGuerreiro(p) && p.x < c.x + 20);
  const perto = naLinha.some(p => c.x - p.x < T.alcance);
  if (naLinha.length >= T.minimoOssos && c.cdOssos <= 0 && c.x < G.right - 10) {
    c.acao = "socar"; c.tA = 0; c.impactos = []; c.cdOssos = T.recargaOssos;
  } else if (perto) {
    c.acao = "lutar"; c.tA = 0; c.golpes = [];
  } else {
    c.estado = "andar";
    c.x -= c.vel * dt;
    const antes = c.tAnim;
    c.tAnim += dt * (c.vel / per.velocidade);
    const an = A.andar, passo = an.quadros / an.fps / (T.passosPorCiclo || 6);   // duração de um passo
    if (Math.floor(c.tAnim / passo) !== Math.floor(antes / passo)) somPersonagem(per, "passos", .5, 200, .06);
  }
}
// Golpe da luta: acerta todos os guerreiros ao alcance
function golpeTita(c, per) {
  const T = per.tita;
  const alvos = plantas.filter(p => p.r === c.r && alvoGuerreiro(p) && c.x - p.x > -20 && c.x - p.x < T.alcance);
  somPersonagem(per, "golpe", .9, 60, .08);
  for (const p of alvos) golpe({ tipo: c.tipo, danoFixo: T.danoLuta, semSom: true, forca: c.forca }, p);
  for (let i = 0; i < 10; i++) parts.push({ x: c.x - 60, y: c.y - rand(40, 110), vx: rand(-220, -30), vy: rand(-160, 60), g: 420,
    vida: 0, max: rand(.2, .45), tam: rand(2, 4), cor: i % 2 ? "#f3ead6" : "#b9aa8c", tipo: "ponto" });
  if (!reduzMov) tremor = Math.max(tremor, alvos.length ? .16 : .08);
}
// Soco no chão: uma onda de ossos brancos rompe a terra e corre pela linha até o castelo
function lancarOssos(c, per) {
  const T = per.tita;
  somPersonagem(per, "ossos", .9, 60, .04);
  ondasOssos.push({ fim: ladoB(c.x) ? MW - PORTAO_X : G.left - 40, r: c.r, y: c.y, x0: c.x - 40, frente: c.x - 40, v: T.velocidadeOssos, dano: T.danoOssos, tipo: c.tipo, forca: c.forca,
                    acertados: new Set(), ossos: [], prox: c.x - 52, t: 0 });
  for (let i = 0; i < 26; i++) parts.push({ x: c.x - 40 + rand(-30, 30), y: c.y - rand(0, 8), vx: rand(-240, 200), vy: rand(-380, -120), g: 700,
    vida: 0, max: rand(.5, 1), tam: rand(3, 6.5), cor: ["#5e4029", "#7d5a40", "#f3ead6"][i % 3], tipo: "ponto" });
  explosoes.push({ x: c.x - 40, y: c.y - 6, chaoY: c.y, t: 0, dur: .7, tipo: "impacto", raio: 80, estilo: "fogo", seed: rand(0, 6) });
  if (!reduzMov) tremor = Math.max(tremor, .45);
}
function novoOsso(x, t) {
  const n = sorte() < .6 ? 3 : 2, pontas = [];
  for (let k = 0; k < n; k++) pontas.push({
    dx: (k - (n - 1) / 2) * rand(9, 13) + rand(-3, 3), h: k === Math.floor(n / 2) ? rand(58, 82) : rand(34, 56),
    w: rand(9, 13), curva: rand(-.5, .5) + (k - (n - 1) / 2) * .35, aneis: [rand(.35, .45), rand(.6, .7)]
  });
  return { x, t, pontas, seed: rand(0, 9), quebrou: false };
}
function atualizarOndasOssos(dt) {
  for (const o of ondasOssos) {
    o.t += dt;
    if (o.frente > o.fim) o.frente -= o.v * dt;
    while (o.prox > Math.max(o.frente, o.fim + 10)) {
      o.ossos.push(novoOsso(o.prox + rand(-5, 5), 0));
      for (let i = 0; i < 6; i++) parts.push({ x: o.prox + rand(-14, 14), y: o.y - rand(0, 6), vx: rand(-90, 90), vy: rand(-280, -100), g: 650,
        vida: 0, max: rand(.4, .8), tam: rand(2, 4.5), cor: i % 3 ? "#5e4029" : "#e8dcc2", tipo: "ponto" });
      o.prox -= rand(34, 44);
    }
    for (const b of o.ossos) b.t += dt;
    o.ossos = o.ossos.filter(b => b.t < 1.3);
    for (const p of plantas) {                                  // guerreiros alcançados pela onda
      if (p.r !== o.r || !alvoGuerreiro(p) || o.acertados.has(p) || p.x < o.frente || p.x > o.x0 + 20) continue;
      o.acertados.add(p);
      golpe({ tipo: o.tipo, danoFixo: o.dano, semSom: true, forca: o.forca }, p);
      for (let i = 0; i < 12; i++) parts.push({ x: p.x + rand(-20, 20), y: p.y - rand(10, 70), vx: rand(-160, 160), vy: rand(-300, -80), g: 600,
        vida: 0, max: rand(.4, .8), tam: rand(2.5, 5), cor: i % 2 ? "#f3ead6" : "#cfc2a6", tipo: "ponto" });
    }
  }
  ondasOssos = ondasOssos.filter(o => o.frente > o.fim || o.ossos.length);
}
// Osso: ponta curva cor de marfim, com volume, anéis de crescimento e rachaduras; rompe a terra e depois esfarela
function desenharOsso(pt, cx, cy, s) {
  const h = pt.h * s, w = pt.w, cv = pt.curva * h * .35;
  ctx.save(); ctx.translate(cx + pt.dx, cy);
  const caminho = () => {
    ctx.beginPath(); ctx.moveTo(-w / 2, 2);
    ctx.bezierCurveTo(-w * .55, -h * .45, cv - w * .25, -h * .82, cv, -h);
    ctx.bezierCurveTo(cv + w * .2, -h * .8, w * .55, -h * .45, w / 2, 2);
    ctx.closePath();
  };
  caminho();
  const gv = ctx.createLinearGradient(0, -h, 0, 4);
  gv.addColorStop(0, "#fffaf0"); gv.addColorStop(.35, "#efe4cc"); gv.addColorStop(.8, "#cdbf9f"); gv.addColorStop(1, "#8f8068");
  ctx.fillStyle = gv; ctx.fill();
  ctx.save(); ctx.clip();
  const gh = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);                    // volume: luz na esquerda, sombra na direita
  gh.addColorStop(0, "rgba(255,240,215,.35)"); gh.addColorStop(.5, "rgba(255,240,215,0)"); gh.addColorStop(1, "rgba(60,45,30,.35)");
  ctx.fillStyle = gh; ctx.fillRect(-w, -h - 4, w * 2 + Math.abs(cv) * 2, h + 8);
  ctx.strokeStyle = "rgba(120,100,75,.45)"; ctx.lineWidth = 1.2;               // anéis de crescimento do osso
  for (const a of pt.aneis) { const yy = -h * a; ctx.beginPath(); ctx.moveTo(-w, yy + 2); ctx.quadraticCurveTo(cv * a, yy - 2, w, yy + 1); ctx.stroke(); }
  ctx.strokeStyle = "rgba(90,70,50,.4)"; ctx.lineWidth = 1;                    // rachadura fina
  ctx.beginPath(); ctx.moveTo(-w * .1, -h * .2); ctx.lineTo(w * .08, -h * .32); ctx.lineTo(-w * .02, -h * .44); ctx.stroke();
  ctx.restore();
  caminho(); ctx.lineWidth = 1.8; ctx.strokeStyle = "rgba(58,46,36,.9)"; ctx.lineJoin = "round"; ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 1.4;              // brilho no lado da luz
  ctx.beginPath(); ctx.moveTo(-w * .28, -h * .15); ctx.bezierCurveTo(-w * .32, -h * .45, cv - w * .2, -h * .75, cv - w * .05, -h * .92); ctx.stroke();
  ctx.restore();
}
function desenharOndasOssos() {
  for (const o of ondasOssos) {
    // fenda na terra, da mão do titã até a frente da onda
    const iniX = Math.max(o.frente, G.left - 30), some = Math.max(0, 1 - Math.max(0, o.t - 1.3) / .8);
    if (some > 0) {
      ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "round";
      const fenda = dy => { ctx.beginPath(); ctx.moveTo(o.x0, o.y - 2 + dy);
        for (let x = o.x0; x > iniX; x -= 14) ctx.lineTo(x, o.y - 2 + dy + Math.sin(x * .41) * 3 + Math.sin(x * .13) * 2); ctx.stroke(); };
      ctx.strokeStyle = `rgba(150,110,75,${.35 * some})`; ctx.lineWidth = 6; fenda(1);
      ctx.strokeStyle = `rgba(22,12,6,${.8 * some})`; ctx.lineWidth = 3; fenda(0);
      ctx.restore();
    }
    for (const b of o.ossos) {
      const u1 = Math.min(1, b.t / .14);
      const sobe = 1 + 2.4 * Math.pow(u1 - 1, 3) + 1.4 * Math.pow(u1 - 1, 2);
      const desce = b.t > .6 ? Math.max(0, 1 - (b.t - .6) / .6) : 1;
      const s = sobe * desce;
      if (s <= .02) continue;
      // sombra e terra revirada na base
      ctx.fillStyle = `rgba(15,8,4,${.35 * desce})`;
      ctx.beginPath(); ctx.ellipse(b.x + 5, o.y + 2, 26, 6, 0, 0, 7); ctx.fill();
      const gm = ctx.createRadialGradient(b.x, o.y - 2, 2, b.x, o.y - 2, 30);
      gm.addColorStop(0, `rgba(96,66,44,${.95 * desce})`); gm.addColorStop(1, "rgba(60,40,28,0)");
      ctx.fillStyle = gm; ctx.beginPath(); ctx.ellipse(b.x, o.y - 1, 30, 9, 0, 0, 7); ctx.fill();
      for (const pt of b.pontas) desenharOsso(pt, b.x, o.y, s);
      // torrões de terra por cima da base dos ossos (parece que saíram de dentro do chão)
      ctx.fillStyle = `rgba(74,50,34,${desce})`;
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(b.x - 18 + k * 12, o.y - 1 + Math.sin(b.seed + k) * 1.5, 7, 4, 0, 0, 7); ctx.fill(); }
      // poeira subindo
      if (b.t < .7) {
        const v = b.t / .7;
        for (let k = 0; k < 2; k++) {
          const r = 16 + v * 20, dx = (k ? 1 : -1) * 14, dy = -v * 22;
          const gp = ctx.createRadialGradient(b.x + dx, o.y - 6 + dy, 1, b.x + dx, o.y - 6 + dy, r);
          gp.addColorStop(0, `rgba(170,140,110,${.4 * (1 - v)})`); gp.addColorStop(1, "rgba(170,140,110,0)");
          ctx.fillStyle = gp; ctx.beginPath(); ctx.arc(b.x + dx, o.y - 6 + dy, r, 0, 7); ctx.fill();
        }
      }
      if (b.t > .6 && !b.quebrou) {                               // ao descer, os ossos lascam
        b.quebrou = true;
        for (let k = 0; k < 6; k++) parts.push({ x: b.x + randVis(-14, 14), y: o.y - randVis(20, 60), vx: randVis(-60, 60), vy: randVis(-120, 0), g: 560,
          vida: 0, max: randVis(.35, .6), tam: randVis(1.8, 3.5), cor: k % 2 ? "#f3ead6" : "#cdbf9f", tipo: "ponto" });
      }
    }
  }
}

/* ---------- Esqueleto Mago: anda uma vez, ataca de longe e invoca esqueletos ---------- */
function atualizarNecro(c, per, dt) {
  const N = per.necro, an = per.anims.atacar;
  if (!c.plantado) {
    const alvoPerto = plantas.some(p => p.r === c.r && alvoGuerreiro(p) && c.x - p.x > 0 && c.x - p.x < N.alcance);
    if (c.x <= celX(N.paraNaColuna - 1) || alvoPerto) {      // chegou: nunca mais anda
      c.plantado = true; c.espera = .5; c.tirosFeitos = 0; c.tAnim = 0;
      invocarEsqueletos(c, per);
    } else {
      c.estado = "andar";
      c.x -= c.vel * dt;
      c.tAnim += dt * (c.vel / per.velocidade);
      return;
    }
  }
  c.estado = "atacar";
  const alvo = plantas.some(p => p.r === c.r && alvoGuerreiro(p) && p.x < c.x);
  if (c.atirando) {
    c.tTiro += dt;
    const q = Math.floor(c.tTiro * an.fps);
    if (!c.soltou && q >= an.quadroTiro) { c.soltou = true; magiaInimiga(c, per); c.tirosFeitos++; }
    if (q >= an.quadros) {
      c.atirando = false; c.espera = N.intervalo;
      if (c.tirosFeitos >= N.tirosParaInvocar) { c.tirosFeitos = 0; invocarEsqueletos(c, per); }
    }
  } else if (alvo) {
    c.espera -= dt;
    if (c.espera <= 0) { c.atirando = true; c.tTiro = 0; c.soltou = false; }
  }
}
function magiaInimiga(c, per) {
  const N = per.necro;
  tiros.push({ tipo: "magiaInimiga", forca: c.forca, estilo: N.estilo, r: c.r, x: c.x - N.saidaX, y: c.y + N.saidaY, xMax: c.x + 10,
               v: -N.velocidade, vida: 0, tipoCriatura: c.tipo });
  explosoes.push({ x: c.x - N.saidaX, y: c.y + N.saidaY, t: 0, dur: .25, tipo: "saida", estilo: N.estilo });
  if (per.somMagia) tocar(per.somMagia, per.sons.volumeMagia ?? .7, 60, .05);
}
// Abre um círculo mágico na terra em cada coluna na frente dele; o esqueleto sobe do chão
function invocarEsqueletos(c, per) {
  const N = per.necro;
  // coluna logo à frente dele; um esqueleto na linha de cima, um na dele e um na de baixo
  const col = Math.max(0, Math.min(G.cols - 1, Math.floor((c.x - G.left) / G.cw) - 1));
  let r0 = Math.max(0, Math.min(G.rows - N.quantos, c.r - Math.floor(N.quantos / 2)));   // nas bordas (A ou E) desloca para caber
  const linhas = [];
  for (let k = 0; k < N.quantos && r0 + k < G.rows; k++) linhas.push(r0 + k);
  linhas.forEach((r, i) => portais.push({ x: celX(col), y: G.top + r * G.ch + G.ch - 14, r, t: -i * .12, dur: 1.7, dono: c, tipo: N.invoca, saiu: false, seed: rand(0, 6) }));
  explosoes.push({ x: c.x - N.saidaX, y: c.y + N.saidaY - 20, t: 0, dur: .45, tipo: "saida", estilo: N.estilo });
  if (per.somInvocar) tocar(per.somInvocar, per.sons.volumeInvocar ?? .8, 60, .05);
  registrar("sistema", `${per.nome} invocou ${linhas.length} esqueletos na coluna ${col + 1}`, true);
}
function atualizarPortais(dt) {
  for (const pt of portais) {
    pt.t += dt;
    if (!pt.saiu && pt.t >= .45) {                           // terra se abre e o esqueleto começa a subir
      pt.saiu = true;
      if (pt.dono.morte) continue;
      const ids = prontos(), tipo = ids.includes(pt.tipo) ? pt.tipo : null;
      const perI = tipo && PERSONAGENS[tipo];
      const multI = pt.dono.forca || 1;
      criaturas.push({
        r: pt.r, tipo, x: pt.x, y: pt.y, hp: Math.round((perI ? perI.vida : 180) * multI), max: Math.round((perI ? perI.vida : 180) * multI),
        vel: perI ? perI.velocidade * rand(.92, 1.08) : 22, fase: rand(0, 6), estado: "andar", atk: ATK, flash: 0, empurrao: 0,
        morte: 0, surgir: .29, tAnim: rand(0, 6), brotar: 0, dono: pt.dono, nivel: pt.dono.nivel || 1, forca: pt.dono.forca || 1
      });
      for (let i = 0; i < 16; i++) parts.push({                // torrões de terra voando
        x: pt.x + rand(-26, 26), y: pt.y - rand(0, 6), vx: rand(-110, 110), vy: rand(-260, -110), g: 620,
        vida: 0, max: rand(.5, .9), tam: rand(2.5, 5.5), cor: i % 3 ? "#6b4a2e" : "#3f2a1a", tipo: "ponto"
      });
      if (!reduzMov) tremor = Math.max(tremor, .1);
    }
    if (pt.t > .2 && sorte() < dt * 30) parts.push({       // faíscas mágicas subindo do círculo
      x: pt.x + rand(-30, 30), y: pt.y + rand(-6, 4), vx: rand(-10, 10), vy: rand(-110, -40), g: -20,
      vida: 0, max: rand(.4, .8), tam: rand(1.4, 2.8), cor: sorte() < .5 ? "#b9a8ff" : "#7de0c8", tipo: "ponto"
    });
  }
  portais = portais.filter(pt => pt.t < pt.dur);
}
function desenharPortais() {
  for (const pt of portais) {
    if (pt.t < 0) continue;
    const u = pt.t / pt.dur, abre = Math.min(1, pt.t / .35), f = u > .7 ? 1 - (u - .7) / .3 : 1;
    const R = 46 * abre;
    ctx.save(); ctx.translate(pt.x, pt.y - 2); ctx.scale(1, .34);
    // brilho no chão
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, R * 1.3);
    g.addColorStop(0, `rgba(190,170,255,${.55 * f})`); g.addColorStop(.5, `rgba(110,80,230,${.35 * f})`); g.addColorStop(1, "rgba(60,20,160,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * 1.3, 0, 7); ctx.fill();
    // círculo de runas girando
    ctx.lineWidth = 3; ctx.strokeStyle = `rgba(200,185,255,${.85 * f})`;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.strokeStyle = `rgba(125,224,200,${.7 * f})`;
    ctx.beginPath(); ctx.arc(0, 0, R * .72, 0, 7); ctx.stroke();
    ctx.save(); ctx.rotate(pt.t * 1.6 + pt.seed);
    ctx.strokeStyle = `rgba(220,210,255,${.9 * f})`; ctx.lineWidth = 2.5;
    for (let k = 0; k < 8; k++) {                              // marcas de runa em volta
      const a = k * Math.PI / 4;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * .8, Math.sin(a) * R * .8); ctx.lineTo(Math.cos(a + .18) * R * .93, Math.sin(a + .18) * R * .93); ctx.stroke();
    }
    ctx.restore();
    ctx.globalCompositeOperation = "source-over";
    // rachaduras escuras na terra
    if (pt.t > .3) {
      const c2 = Math.min(1, (pt.t - .3) / .3);
      ctx.strokeStyle = `rgba(28,18,12,${.75 * f})`; ctx.lineWidth = 3;
      for (let k = 0; k < 6; k++) {
        const a = pt.seed + k * 1.05, L = R * (.5 + .45 * c2);
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * L * .5 + Math.sin(k * 7) * 5, Math.sin(a) * L * .5);
        ctx.lineTo(Math.cos(a + .2) * L, Math.sin(a + .2) * L); ctx.stroke();
      }
      ctx.fillStyle = `rgba(20,12,8,${.6 * f})`; ctx.beginPath(); ctx.ellipse(0, 0, R * .42 * c2, R * .42 * c2, 0, 0, 7); ctx.fill();
    }
    ctx.restore();
    // coluna de luz subindo quando a terra se abre
    if (pt.t > .35 && pt.t < 1.1) {
      const v = (pt.t - .35) / .75, a = Math.sin(v * Math.PI);
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const cl = ctx.createLinearGradient(0, pt.y - 120, 0, pt.y);
      cl.addColorStop(0, "rgba(160,140,255,0)"); cl.addColorStop(1, `rgba(170,150,255,${.45 * a})`);
      ctx.fillStyle = cl; ctx.fillRect(pt.x - 22, pt.y - 120, 44, 120);
      ctx.restore();
    }
  }
}
function matarCriatura(c) {
  c.morte = 0.001; abatidas++;
  const perM = c.tipo && PERSONAGENS[c.tipo];
  if (perM && perM.somMorrer) tocar(perM.somMorrer, perM.sons.volumeMorrer ?? 0.8, 60, 0.05); // som de morte
  if (!reduzMov) tremor = Math.max(tremor, .12);
  for (let i = 0; i < 18; i++) parts.push({
    x: c.x + rand(-20, 20), y: c.y - rand(10, 70), vx: rand(-130, 130), vy: rand(-230, -60), g: 420,
    vida: 0, max: rand(.6, 1.1), tam: rand(4, 9), cor: c.tipo ? (i % 3 ? PERSONAGENS[c.tipo].cor : "#2b2030") : (i % 4 ? C.mud : C.moss), tipo: "ponto"
  });
  parts.push({ x: c.x, y: c.y - 40, vx: 0, vy: 0, g: 0, vida: 0, max: .45, tam: 20, cor: "#fff4d6", tipo: "anel" });
  if (perM && perM.necro) {
    for (const o of criaturas) if (o.dono === c && !o.morte) {
      parts.push({ x: o.x, y: o.y - 50, vx: 0, vy: 0, g: 0, vida: 0, max: .5, tam: 24, cor: "#b9a8ff", tipo: "anel" });
      matarCriatura(o);
    }
    portais = portais.filter(pt => pt.dono !== c);            // os que ainda iam sair não saem mais
  }
}

function atualizar(dt) {
  tempo += dt;
  for (const id in recargaM) recargaM[id] = Math.max(0, recargaM[id] - dt);
  atualizarEnergia(dt);
  if (ondas) atualizarCampanha(dt);
  atualizarPendentes(dt);
  if (banner) { banner.t += dt; if (banner.t > banner.dur) banner = null; }
  vidaLag = vidaLag > vida ? Math.max(vida, vidaLag - dt * 18) : vida;   // parte clara da barra que "desce" depois do dano

  for (const p of plantas) {
    p.idade += dt;
    p.nasc = Math.min(1, p.nasc + dt / .5);
    p.flash = Math.max(0, p.flash - dt * 5);
    p.recuo = Math.max(0, p.recuo - dt * 4);
    p.piscar -= dt;
    if (p.piscar <= 0) { p.piscT = .14; p.piscar = rand(2.5, 6); }
    p.piscT = Math.max(0, p.piscT - dt);
    p.brilho = Math.max(0, p.brilho - dt * 2);
    if (p.morte) {
      if (pvp && !p.contadoPvp) { p.contadoPvp = true; pvp.mortosH++; }   // PARTIDA_PVP: placar
      if (p.inimigo && !p.pago) {                       // MODO_MONSTERS: herói derrotado dá energia
        p.pago = true; abatidas++;
        energia += MODO_MONSTERS.energiaPorHeroi; energiaPulso = 1;
        textos.push({ x: p.x, y: p.y - 120, txt: "+" + MODO_MONSTERS.energiaPorHeroi, cor: "#ffd34d", t: 0 });
      }
      p.morte += dt;
      const moC = morteComChao(p);
      if (moC) {
        const q = p.morte * moC.fps, gM = GUERREIROS[p.tipo];
        if (!p.somEscudoFeito && moC.quadroEscudo != null && q >= moC.quadroEscudo) {   // escudo rachando
          p.somEscudoFeito = true;
          if (gM.somEscudo) tocar(gM.somEscudo, gM.sons.volumeEscudo ?? 0.8, 60);
        }
        if (!p.somMorteFeito && q >= (moC.quadroSom ?? moC.quadroChao)) {                // som de morte
          p.somMorteFeito = true;
          if (gM.somMorrer) tocar(gM.somMorrer.ok || !gM.somMorrerReserva ? gM.somMorrer : gM.somMorrerReserva, gM.sons.volumeMorrer ?? 0.8, 60);
        }
        if (!p.noChao && q >= moC.quadroChao) {                                           // bateu no chão
          p.noChao = true;
          if (grade[p.r][p.c] === p) grade[p.r][p.c] = null;
        }
      }
      continue;
    }
    const g = GUERREIROS[p.tipo];
    if (p.andante) {                                    // MODO_MONSTERS: anda até ter um monstro logo à frente
      const ocupado = p.atacando || p.acao || p.pose;
      const cfgP = { ...MODO_MONSTERS.andar.padrao, ...(MODO_MONSTERS.andar[p.tipo] || {}) };
      const frente = criaturas.some(c => c.r === p.r && !c.morte && c.surgir > .3 && ladoB(c.x) === ladoB(p.x) && c.x - p.x > -5 && c.x - p.x < cfgP.para);
      if (p.trocaAndar > 0) p.trocaAndar -= dt;
      if (!ocupado && !frente && p.vel > 0) {
        if (!p.andando) p.trocaAndar = TROCA_ANDAR;                                   // começou a andar: troca suave
        p.andando = true; p.x += p.vel * dt;
        p.tAndar += dt * p.vel / ({ ...MODO_MONSTERS.andar.padrao, ...(MODO_MONSTERS.andar[p.tipo] || {}) }).velocidade;   // anda mais rápido = passo mais rápido
        if (!ladoB(p.x) && !p.atravessou) conferirFenda(p, true);                       // PORTAL_TROPA: abre na frente
        if (!ladoB(p.x) && p.x >= PORTAO_X) atravessarPortao(p, MW - PORTAO_X + 6);   // PORTOES
        if (p.x > PORTAO_INIMIGO + 26) heroiPassou(p);
        continue;
      }
      if (p.andando) { p.trocaAndar = TROCA_ANDAR; p.pausaT = cfgP.pausa ?? 0.35; }   // parou: troca suave e respira um pouco
      p.andando = false;
      if (p.pausaT > 0 && !ocupado) { p.pausaT -= dt; continue; }                       // ANDA -> PARA -> ATACA
    }
    if (p.tipo === "cardo") {
      p.cd -= dt;
      if (p.nasc >= 1 && p.cd <= 0 && alvoNaLinha(p)) { atirar(p); p.cd = 1.25; }
    } else if (g.sentinela && p.nasc >= 1) {  // Cavaleiro Sentinela: golpe/defesa de perto, terra com muitos monstros
      atualizarSentinela(p, g, dt);
    } else if (g.trechos && p.nasc >= 1) {    // Guerreiro Protetor: ergue o escudo quando um monstro chega perto
      atualizarProtetor(p, g, dt);
    } else if ((g.flecha || g.magia) && p.nasc >= 1) {   // Arqueiro e Mago: atacam de longe quando um monstro entra na linha      // Arqueiro: começa a atirar quando um monstro entra na linha dele
      // poses: sem pose = em pé ("parado") · "preparando" = ergue o arco · "guarda" = agachado entre um tiro e outro · "voltando" = abaixa o arco
      p.atkCd = (p.atkCd ?? 0) - dt;
      const an = g.sprite.anims.atacando, pr = g.sprite.anims.preparando;
      const durPrep = pr && pr.ok ? pr.quadros / pr.fps + (pr.segura ?? 0) : 0;
      const alvo = alvoNaLinha(p);
      if (p.atacando) {
        p.tA += dt;
        const q = Math.floor(p.tA * an.fps);
        if (!p.atirou && q >= an.quadroTiro) { p.atirou = true; if (g.magia) lancarMagia(p, g); else atirarFlecha(p, g); }
        if (q >= an.quadros) { p.atacando = false; p.atkCd = g.intervaloAtaque; p.pose = "guarda"; }
      } else if (p.pose === "preparando" || p.pose === "voltando") {
        p.tPose += dt;
        if (p.tPose >= durPrep) {
          if (p.pose === "preparando" && alvo) { p.pose = null; p.atacando = true; p.tA = 0; p.atirou = false; }
          else p.pose = null;
        }
      } else if (alvo) {
        if (p.pose === "guarda") {
          if (p.atkCd <= 0) { p.pose = null; p.atacando = true; p.tA = 0; p.atirou = false; }
        } else { p.pose = "preparando"; p.tPose = 0; }
      } else if (p.pose === "guarda") { p.pose = "voltando"; p.tPose = 0; }
    } else if (g.alcance && p.nasc >= 1) {
      p.atkCd = (p.atkCd ?? .3) - dt;
      const an = g.sprite.anims.atacando;
      const golpes = [].concat(an.quadroGolpe);
      if (p.atacando) {
        p.tA += dt;
        const q = Math.floor(p.tA * an.fps);
        while (p.golpeIdx < golpes.length && q >= golpes[p.golpeIdx]) { p.golpeIdx++; golpeEspada(p, g); }
        const sons = [].concat(an.quadroSom ?? []);
        while (p.somIdx < sons.length && q >= sons[p.somIdx]) { p.somIdx++; if (g.somAtaque) tocar(g.somAtaque, g.sons.volume, 60); }
        if (q >= an.quadros) { p.atacando = false; p.atkCd = g.intervaloAtaque; }
      } else if (p.atkCd <= 0 && inimigoPerto(p, g.alcance)) {
        p.atacando = true; p.tA = 0; p.golpeIdx = 0; p.somIdx = 0;
      }
    } else if (g.energiaMao && p.nasc >= 1) {   // Elara: a energia sai das mãos no auge de cada ciclo da meditação
      const an = g.sprite.anims.parado, qt = p.idade * an.fps;
      const ciclo = Math.floor(qt / an.quadros), q = Math.floor(qt) % an.quadros;
      if (q >= g.energiaMao.quadro && p.cicloEnergia !== ciclo) {
        p.cicloEnergia = ciclo;
        const ex = p.x + g.energiaMao.x, ey = p.y + g.energiaMao.y;
        somPersonagem(g, "gerar", .6);
        criarOrbe(ex, ey, p.y - rand(4, 20), Math.round(g.gera * (1 + ((p.nivel || 1) - 1) * .02)), true, pvp ? "heroes" : null);   // +2% de energia por nível
        for (let i = 0; i < 14; i++) parts.push({
          x: ex, y: ey, vx: rand(-110, 110), vy: rand(-150, -20), g: 140,
          vida: 0, max: rand(.35, .7), tam: rand(2, 4), cor: i % 2 ? "#ffd34d" : "#fff4d6", tipo: "ponto"
        });
        parts.push({ x: ex, y: ey, vx: 0, vy: 0, g: 0, vida: 0, max: .4, tam: 18, cor: "#ffd97a", tipo: "anel" });
      }
    } else if (g.gera && p.nasc >= 1) {
      p.gerT -= dt;
      if (p.gerT <= 0) {           // o cristal solta uma energia que pula para perto dele
        p.gerT = g.intervalo; p.brilho = 1; p.recuo = 1;
        somPersonagem(g, "gerar", .5);
        criarOrbe(p.x, p.y - 50, p.y - rand(4, 20), g.gera, true);
        for (let i = 0; i < 10; i++) parts.push({
          x: p.x, y: p.y - 44, vx: rand(-80, 80), vy: rand(-120, -20), g: 120,
          vida: 0, max: rand(.3, .6), tam: rand(2, 4), cor: i % 2 ? "#ffd34d" : "#fff4d6", tipo: "ponto"
        });
      }
    }
  }
  plantas = plantas.filter(p => !p.fora && (!p.morte || p.morte < tempoMorte(p)));

  for (const s of tiros) {
    s.x += s.v * dt; s.vida += dt;
    if (s.tipo === "magiaInimiga") {        // magia do Esqueleto Mago: acerta o primeiro guerreiro da linha
      if (sorte() < .9) parts.push({
        x: s.x + rand(4, 14), y: s.y + rand(-7, 7), vx: rand(10, 60), vy: rand(-30, 30), g: 0,
        vida: 0, max: rand(.2, .45), tam: rand(1.5, 3), cor: PALETAS_MAGIA[s.estilo].rastroFaisca[sorte() < .5 ? 0 : 1], tipo: "ponto"
      });
      const alvo = plantas.filter(p => p.r === s.r && alvoGuerreiro(p) && p.x <= s.xMax && p.x >= s.x - 20).sort((a, b) => b.x - a.x)[0];
      if (alvo) {
        golpe({ tipo: s.tipoCriatura, semSom: true, forca: s.forca }, alvo); s.fora = true;
        somPersonagem(PERSONAGENS[s.tipoCriatura], "impacto", .6, 60, .06);
        explosoes.push({ x: s.x, y: s.y, chaoY: alvo.y, t: 0, dur: .55, tipo: "impacto", raio: 55, estilo: s.estilo, seed: rand(0, 6) });
        const P = PALETAS_MAGIA[s.estilo];
        for (let i = 0; i < 14; i++) { const a = rand(0, 7), v = rand(80, 240);
          parts.push({ x: s.x, y: s.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, g: 160, vida: 0, max: rand(.3, .55), tam: rand(1.6, 3.2), cor: P.faiscas[i % 3], tipo: "ponto" }); }
      }
      if (s.x < G.left - 30) s.fora = true;
      continue;
    }
    if (s.tipo === "flechaInimiga") {       // flecha de monstro: acerta o primeiro guerreiro da linha
      const alvo = plantas.filter(p => p.r === s.r && alvoGuerreiro(p) && p.x <= s.xMax && p.x >= s.x - 20).sort((a, b) => b.x - a.x)[0];
      if (alvo) {
        golpe({ tipo: s.tipoCriatura }, alvo); s.fora = true;
        for (let i = 0; i < 6; i++) parts.push({
          x: s.x, y: s.y, vx: rand(-140, 40), vy: rand(-120, 60), g: 200,
          vida: 0, max: rand(.2, .4), tam: rand(2, 4), cor: i % 2 ? "#e8dfc8" : "#8a4b2a", tipo: "ponto"
        });
      }
      if (s.x < G.left - 30) s.fora = true;
      continue;
    }
    if (s.tipo !== "flecha" && s.tipo !== "magia" && sorte() < .6) parts.push({
      x: s.x - 10, y: s.y + rand(-2, 2), vx: rand(-30, -10), vy: rand(-10, 10), g: 0,
      vida: 0, max: .22, tam: rand(1.5, 3), cor: C.spike, tipo: "ponto"
    });
    if (s.tipo === "magia" && sorte() < .9) parts.push({   // rastro de faíscas da esfera
      x: s.x - rand(4, 14), y: s.y + rand(-7, 7), vx: rand(-60, -10), vy: rand(-30, 30), g: 0,
      vida: 0, max: rand(.2, .45), tam: rand(1.5, 3), cor: (PALETAS_MAGIA[s.estilo] || PALETAS_MAGIA.gelo).rastroFaisca[sorte() < .5 ? 0 : 1], tipo: "ponto"
    });
    const alvos = (s.tipo === "flecha" || s.tipo === "magia")
      ? criaturas.filter(c => c.x >= s.xMin && c.x - s.x < 24).sort((a, b) => a.x - b.x)   // flecha: pega também quem está colado no arqueiro
      : criaturas;
    for (const c of alvos) {
      if (c.r !== s.r || c.morte || c.surgir < .3) continue;
      if (s.tipo === "flecha" || s.tipo === "magia" || Math.abs(c.x - s.x) < 24) {
        s.fora = true;
        if (s.tipo === "magia") explosaoMagia(s, c);
        const bloq = ferirCriatura(c, s.dano, s.tipo === "magia" ? (PALETAS_MAGIA[s.estilo] || PALETAS_MAGIA.gelo).cor : "#ffd34d");
        if (!bloq) for (let i = 0; i < 7; i++) parts.push({
          x: s.x, y: s.y, vx: rand(-40, 140), vy: rand(-120, 60), g: 200,
          vida: 0, max: rand(.2, .45), tam: rand(2, 4), cor: i % 2 ? C.spike : "#fff4d6", tipo: "ponto"
        });
        break;
      }
    }
    if (s.x > MW + 30) s.fora = true;
  }
  tiros = tiros.filter(s => !s.fora);
  for (const e of explosoes) e.t += dt;
  atualizarPortais(dt);
  atualizarOndasTerra(dt);
  atualizarOndasOssos(dt);
  explosoes = explosoes.filter(e => e.t < e.dur);

  for (const c of criaturas) {
    c.flash = Math.max(0, c.flash - dt * 5);
    c.empurrao = Math.max(0, c.empurrao - dt * 6);
    if (c.escudoFx) c.escudoFx = Math.max(0, c.escudoFx - dt * 3.2);   // efeito do escudo some em ~0,3 s
    if (c.pulo) c.pulo = Math.max(0, c.pulo - dt * 2.4);                 // jogado para cima pela onda de terra
    if (c.brotar != null && c.brotar < 1 && !c.morte) {       // saindo da terra: não anda nem ataca ainda
      c.brotar = Math.min(1, c.brotar + dt / .9);
      if (sorte() < dt * 25) parts.push({
        x: c.x + rand(-22, 22), y: c.y - rand(0, 4), vx: rand(-60, 60), vy: rand(-140, -50), g: 500,
        vida: 0, max: rand(.3, .6), tam: rand(2, 4), cor: sorte() < .6 ? "#6b4a2e" : "#3f2a1a", tipo: "ponto"
      });
      if (c.brotar < 1) continue;
      c.surgir = 1;
    }
    c.surgir = Math.min(1, c.surgir + dt / .7);
    if (c.morte) { c.morte += dt; continue; }
    if (c.tipo && PERSONAGENS[c.tipo].efeito === "fogo") {
      const per = PERSONAGENS[c.tipo], an = per.anims.andar;
      const q = Math.floor(c.tAnim * an.fps) % an.quadros;
      const pts = per.corpo[q], lado = an.olhaDireita ? -1 : 1;
      const x0 = c.x + c.empurrao * 10;
      // chamas saindo de pontos do corpo inteiro (ossos, braços, pernas)
      c.acumChama = (c.acumChama || 0) + dt * 170;
      while (c.acumChama >= 1) {
        c.acumChama--;
        const k = Math.floor(sorte() * (pts.length / 2)) * 2;
        parts.push({
          x: x0 + pts[k] * lado * per.escala + rand(-2, 2), y: c.y + pts[k + 1] * per.escala,
          vx: rand(4, 24), vy: rand(-60, -30), g: -50,
          vida: 0, max: rand(.25, .45), tam: rand(4.5, 8.5), tipo: "chama", semente: rand(0, 9)
        });
      }
      // brasas subindo da cabeça
      if (sorte() < dt * 14) parts.push({
        x: x0 + rand(-12, 14), y: c.y + (per.cabeca[q] + 14) * per.escala + rand(-6, 6),
        vx: rand(8, 45), vy: rand(-90, -40), g: -25,
        vida: 0, max: rand(.6, 1.2), tam: rand(1.6, 3.4), cor: sorte() < .5 ? "#ffb347" : "#ff6a1a", tipo: "ponto"
      });
    }
    const perT = c.tipo && PERSONAGENS[c.tipo];
    const anT = perT && perT.tiro && perT.anims.atacar;
    if (perT && perT.tita) {
      atualizarTita(c, perT, dt);           // Esqueleto Titã: anda, luta de perto e soca o chão
    } else if (perT && perT.necro && perT.anims.atacar.ok) {
      atualizarNecro(c, perT, dt);          // Esqueleto Mago: anda uma vez, depois só ataca de longe e invoca
    } else if (anT && anT.ok) {                    // Esqueleto Arqueiro: atira de longe em vez de bater
      const t = perT.tiro;
      const mira = (c.x < G.right - 10 || ladoB(c.x)) && plantas.some(p => p.r === c.r && alvoGuerreiro(p) && c.x - p.x > -10 && c.x - p.x < t.alcance);
      if (c.atirando) {
        c.tTiro += dt;
        const q = Math.floor(c.tTiro * anT.fps);
        if (!c.soltou && q >= anT.quadroTiro) { c.soltou = true; flechaInimiga(c, perT); }
        if (q >= anT.quadros) { c.atirando = false; c.espera = t.intervalo; }
      } else if (mira) {
        c.espera = (c.espera ?? 0) - dt;
        if (c.espera <= 0) { c.atirando = true; c.tTiro = 0; c.soltou = false; }
      }
      if (c.atirando || mira) c.estado = "atacar";
      else {
        c.estado = "andar";
        c.x -= c.vel * dt;
        c.tAnim += dt * (c.vel / perT.velocidade);
        c.fase += dt * c.vel * .16;
      }
    } else {
    const alvo = plantas.find(p => p.r === c.r && alvoGuerreiro(p) && c.x - p.x > 0 && c.x - p.x < 50);
    const anG = c.tipo && PERSONAGENS[c.tipo].anims.atacar;
    const sinc = anG && anG.ok && anG.quadroGolpe != null;          // dano no quadro exato do golpe
    if (alvo && sinc) {
      if (c.estado !== "atacar") { c.estado = "atacar"; c.tA = 0; c.golpeFeito = false; }
      c.tA += dt;
      const q = Math.floor(c.tA * anG.fps);
      if (!c.golpeFeito && q >= anG.quadroGolpe) { c.golpeFeito = true; golpe(c, alvo); }
      if (q >= anG.quadros) { c.tA -= anG.quadros / anG.fps; c.golpeFeito = false; }   // emenda o próximo soco sem pulo
    } else if (alvo) {
      if (c.estado !== "atacar") { c.estado = "atacar"; c.atk = ATK; }
      c.atk -= dt;
      if (c.tipo && PERSONAGENS[c.tipo].anims.atacar && PERSONAGENS[c.tipo].anims.atacar.ok) c.tAnim += dt;
      if (c.atk <= 0) { c.atk = ATK; golpe(c, alvo); }
    } else {
      c.estado = "andar";
      c.x -= c.vel * dt;
      c.tAnim += dt * (c.tipo ? c.vel / PERSONAGENS[c.tipo].velocidade : 1); // quem anda mais rápido mexe as pernas mais rápido
      c.fase += dt * c.vel * .16;
    }
    }
    if (ladoB(c.x) && !c.atravessou && !c.morte) conferirFenda(c, false);         // PORTAL_TROPA: abre na frente
    if (ladoB(c.x) && c.x <= MW - PORTAO_X) atravessarPortao(c, PORTAO_X - 6);   // PORTOES: saiu na outra arena
    if (c.x < G.left - 26 && simM()) {                 // MODO_MONSTERS: seu esqueleto chegou no castelo dos heróis
      c.fora = true; ferirCasteloInimigo(c.chefe ? 30 : ((perT && perT.danoCastelo) || 10), c.y); continue;
    }
    if (c.x < G.left - 26) {
      // o CHEFÃO que chega no castelo derruba tudo: game over na hora (vídeo do castelo caindo, de dia ou de noite)
      const danoC = c.chefe ? Math.max(1, Math.ceil(vida)) : ((perT && perT.danoCastelo) || 10);
      c.fora = true; vida = Math.max(0, vida - danoC); nucleoDor = 1;
      somPersonagem(CASTELO, "dano", .9, 120, .06);          // som de dano no castelo
      if (!reduzMov) tremor = .45;
      for (let i = 0; i < 20; i++) parts.push({
        x: NUCLEO.x + rand(-20, 20), y: NUCLEO.y + rand(-30, 30), vx: rand(-160, 160), vy: rand(-160, 160), g: 0,
        vida: 0, max: rand(.4, .8), tam: rand(3, 6), cor: i % 2 ? "#cfc8bb" : "#ff6b5e", tipo: "ponto"   // lascas de pedra
      });
      parts.push({ x: NUCLEO.x, y: NUCLEO.y, vx: 0, vy: 0, g: 0, vida: 0, max: .5, tam: 40, cor: "#ff6b5e", tipo: "anel" });
      textos.push({ x: NUCLEO.x + 20, y: NUCLEO.y - 70, txt: "-" + danoC, cor: "#ff6b5e", t: 0 });
      if (vida <= 0) terminar();
    }
  }
  criaturas = criaturas.filter(c => !c.fora && (!c.morte || c.morte < tempoMorteCriatura(c)));

  for (const q of parts) {
    q.vida += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += q.g * dt;
    if (q.vr) q.rot += q.vr * dt;
  }
  parts = parts.filter(q => q.vida < q.max);
  for (const t of textos) { t.t += dt; t.y -= 34 * dt; }
  textos = textos.filter(t => t.t < .8);
  for (const e of efeitosCelula) e.t += dt;
  efeitosCelula = efeitosCelula.filter(e => e.t < .6);
  tremor = Math.max(0, tremor - dt);
  nucleoDor = Math.max(0, nucleoDor - dt * 2);
  nucleoDorInimigo = Math.max(0, nucleoDorInimigo - dt * 2);
}

/* ---------- Fundo (desenhado uma vez) ---------- */
function semear(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const fundo = document.createElement("canvas");
const FUNDO_K = 2;                         // o fundo é desenhado em alta resolução uma vez só (fica nítido na tela cheia)
fundo.width = 2 * W * FUNDO_K; fundo.height = H * FUNDO_K;   // [sua arena | arena do inimigo virada]
/* Imagem de fundo: Fundo/fundo_do_jogo (.jpg, .png ou .webp). Se não carregar, fica o fundo desenhado por código. */
/* DIA E NOITE: de dia cai energia do céu; de noite não (só os Cristais Solares geram energia).
   Cada nível da campanha é de dia ou de noite (veja "noite" na CAMPANHA). */
/* ARENAS: cada lado tem a sua arena, de dia e de noite (pasta Fundo). Se a arena nova não existir, usa o fundo antigo. */
const FUNDOS = {
  heroes_dia:     ["Fundo/arena_guerreiro_dia", "Fundo/fundo_do_jogo"],
  heroes_noite:   ["Fundo/arena_guerreiro_noite", "Fundo/fundo_do_jogo2"],
  monsters_dia:   ["Fundo/arena_monsters_dia", "Fundo/arena_guerreiro_dia", "Fundo/fundo_do_jogo"],
  monsters_noite: ["Fundo/arena_monsters_noite", "Fundo/arena_guerreiro_noite", "Fundo/fundo_do_jogo2"]
};
let fundoComImagem = false;

/* Fogo das tochas: chama viva, luz tremendo e faíscas subindo, em loop, por cima das tochas pintadas.
   x, y = boca da tocha (onde a chama nasce) e h = altura da chama, em pixels do jogo (1280×720).
   Servem para as duas imagens de fundo (dia e noite), porque as tochas estão no mesmo lugar. */
const EFEITO_FOGO = {
  ligado: true,
  brilho: 1,        // força da luz em volta (0.5 = metade, 1.5 = mais forte)
  faiscas: true     // faíscas subindo
};
const TOCHAS = [
  { x: 427, y: 72, h: 27 }, { x: 727, y: 73, h: 27 }, { x: 991, y: 74, h: 27 }, { x: 1211, y: 74, h: 27 },   // cerca
  { x: 185, y: 247, h: 31 }, { x: 80, y: 421, h: 37 },                                                     // parede do castelo
  { x: 132, y: 555, h: 40, chao: true }                                                                    // tocha no chão
];
const IMGS_FUNDO = {};
for (const qual in FUNDOS) IMGS_FUNDO[qual] = new Image();
let imgFundo = IMGS_FUNDO.heroes_noite, imgFundoInimigo = IMGS_FUNDO.monsters_noite, noiteAtual = true;
for (const qual in FUNDOS) {
  const tentativas = [];                                     // cada nome com .png, .jpg e .webp
  for (const nome of FUNDOS[qual]) for (const ext of ["png", "jpg", "webp"]) tentativas.push(nome + "." + ext);
  (function carregarFundo(lista) {
    const im = IMGS_FUNDO[qual];
    if (!lista.length) {                                     // nada encontrado: avisa (o jogo usa o gramado de reserva)
      setTimeout(() => registrar("sistema", `Não encontrei a imagem de fundo "${FUNDOS[qual][0]}" (.png, .jpg ou .webp) na pasta Fundo.`, false), 0);
      return;
    }
    im.onload = () => { if (im === imgFundo || im === imgFundoInimigo) desenharFundoImagem(); };
    im.onerror = () => carregarFundo(lista.slice(1));
    im.src = lista[0];
  })(tentativas);
}
// troca o cenário (dia/noite); a imagem nova é desenhada assim que estiver carregada
let fundoDesenhado = false;
function definirNoite(noite) {
  noiteAtual = noite; fundoDesenhado = false;
  const dn = noite ? "noite" : "dia";
  imgFundo = IMGS_FUNDO[(modoM ? "monsters_" : "heroes_") + dn];           // a sua arena (esquerda)
  imgFundoInimigo = IMGS_FUNDO[(modoM ? "heroes_" : "monsters_") + dn];    // a do outro lado (direita, virada)
  if (imgFundo.complete && imgFundo.naturalWidth) desenharFundoImagem();
}
function desenharFundoImagem() {
  fundoComImagem = true; fundoDesenhado = true;
  const g = fundo.getContext("2d");
  g.setTransform(FUNDO_K, 0, 0, FUNDO_K, 0, 0);
  g.imageSmoothingQuality = "high";
  g.clearRect(0, 0, 2 * W, H);
  g.fillStyle = "#0b0912"; g.fillRect(0, 0, 2 * W, H);
  // a sua arena inteira na esquerda
  g.drawImage(imgFundo, 0, 0, W, H);
  // a arena do outro lado inteira, virada (castelo dele na ponta direita): você vê a dela igual ele vê a sua
  const temInimigo = imgFundoInimigo.complete && imgFundoInimigo.naturalWidth;
  if (temInimigo) { g.save(); g.translate(2 * W, 0); g.scale(-1, 1); g.drawImage(imgFundoInimigo, 0, 0, W, H); g.restore(); }
  // sombra suave no alto
  const topo = g.createLinearGradient(0, 0, 0, 170);
  topo.addColorStop(0, "rgba(12,8,20,.45)"); topo.addColorStop(1, "rgba(12,8,20,0)");
  g.fillStyle = topo; g.fillRect(0, 0, 2 * W, 170);
  // casas da grade: xadrez bem leve na terra (a arena do outro lado tem a mesma grade, virada)
  for (let r = 0; r < G.rows; r++) for (let c = 0; c < G.cols; c++) {
    g.fillStyle = (r + c) % 2 ? "rgba(255,236,190,.04)" : "rgba(40,20,10,.06)";   // bem leve, para não brigar com a imagem
    g.fillRect(G.left + c * G.cw, G.top + r * G.ch, G.cw, G.ch);
    g.fillRect(2 * W - G.left - (c + 1) * G.cw, G.top + r * G.ch, G.cw, G.ch);
  }
  g.strokeStyle = "rgba(60,30,10,.12)"; g.lineWidth = 1;
  g.strokeRect(G.left + .5, G.top + .5, G.right - G.left - 1, G.bottom - G.top - 1);
  desenharMarcadores(g);
}
function desenharMarcadores(g) {
  g.font = "800 20px Grandstander, 'Trebuchet MS', sans-serif";
  g.textAlign = "center"; g.textBaseline = "middle";
  for (let r = 0; r < G.rows; r++) {
    const y = G.top + r * G.ch + G.ch / 2;
    g.fillStyle = C.ink; g.beginPath(); g.arc(G.left - 30, y, 16, 0, 7); g.fill();
    g.lineWidth = 2; g.strokeStyle = "rgba(233,183,82,.8)"; g.stroke();
    g.fillStyle = "#fff4d6"; g.fillText(LINHAS[r], G.left - 30, y + 1);
  }
  for (let c = 0; c < G.cols; c++) {
    const x = celX(c);
    g.fillStyle = "rgba(43,32,48,.9)"; g.beginPath(); g.arc(x, G.top - 20, 13, 0, 7); g.fill();
    g.lineWidth = 2; g.strokeStyle = "rgba(233,183,82,.8)"; g.stroke();
    g.fillStyle = "#fff4d6"; g.font = "800 16px Grandstander, 'Trebuchet MS', sans-serif"; g.fillText(String(c + 1), x, G.top - 19);
  }
}
if (document.fonts) document.fonts.ready.then(() => { if (imgFundo.complete && imgFundo.naturalWidth) desenharFundoImagem(); });

(function desenharFundo() {            // fundo de reserva, desenhado por código
  const g = fundo.getContext("2d");
  g.scale(FUNDO_K, FUNDO_K);
  const rnd = semear(7);

  // gramado base
  g.fillStyle = "#5fae4c"; g.fillRect(0, 0, W, H);
  for (let r = 0; r < G.rows; r++) for (let c = 0; c < G.cols; c++) {
    g.fillStyle = (r + c) % 2 ? "#74c65e" : "#69bb54";
    g.fillRect(G.left + c * G.cw, G.top + r * G.ch, G.cw, G.ch);
  }
  // tufos e flores
  for (let i = 0; i < 520; i++) {
    const x = G.left + rnd() * (G.right - G.left), y = G.top + rnd() * (G.bottom - G.top);
    g.strokeStyle = rnd() < .5 ? "rgba(40,110,40,.35)" : "rgba(200,240,160,.35)";
    g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + rnd() * 4 - 2, y - 4 - rnd() * 5); g.stroke();
  }
  for (let i = 0; i < 26; i++) {
    const x = G.left + rnd() * (G.right - G.left), y = G.top + rnd() * (G.bottom - G.top);
    g.fillStyle = rnd() < .5 ? "#fff6e0" : "#ffd96b";
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; g.beginPath(); g.arc(x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6, 1.8, 0, 7); g.fill(); }
    g.fillStyle = "#e38b3c"; g.beginPath(); g.arc(x, y, 1.4, 0, 7); g.fill();
  }

  // céu atrás da barra de cards
  const ceu = g.createLinearGradient(0, 0, 0, G.top);
  ceu.addColorStop(0, "#6fb8e0"); ceu.addColorStop(1, "#c6ead6");
  g.fillStyle = ceu; g.fillRect(0, 0, W, G.top);
  for (let i = 0; i < 9; i++) {
    const cx = 120 + rnd() * (W - 200), cy = 20 + rnd() * 70;
    g.fillStyle = "rgba(255,255,255,.75)";
    for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(cx + k * 18 - 27, cy + (k % 2) * -6, 22, 13, 0, 0, 7); g.fill(); }
  }
  g.fillStyle = "#8fc39a";
  for (let x = 0; x < W; x += 60) { g.beginPath(); g.ellipse(x + rnd() * 30, HUD_H + 8, 70, 26, 0, 0, 7); g.fill(); }
  // cerca viva no topo
  g.fillStyle = "#2f6b37"; g.fillRect(0, HUD_H + 16, W, G.top - HUD_H - 16);
  for (let x = -10; x < W + 20; x += 26) {
    g.fillStyle = "#3b7f41"; g.beginPath(); g.arc(x, G.top - 6 + rnd() * 6, 20 + rnd() * 6, 0, 7); g.fill();
    g.fillStyle = "#4b9550"; g.beginPath(); g.arc(x + 6, G.top - 16 + rnd() * 6, 10, 0, 7); g.fill();
  }
  // trilha de pedras embaixo
  g.fillStyle = "#b99a6a"; g.fillRect(0, G.bottom, W, H - G.bottom);
  g.fillStyle = "#a88a5c"; g.fillRect(0, G.bottom, W, 6);
  for (let i = 0; i < 70; i++) {
    g.fillStyle = rnd() < .5 ? "#9d8b78" : "#c7b597";
    g.beginPath(); g.ellipse(rnd() * W, G.bottom + 14 + rnd() * (H - G.bottom - 20), 6 + rnd() * 10, 4 + rnd() * 5, 0, 0, 7); g.fill();
  }

  // floresta à direita
  const fl = g.createLinearGradient(G.right, 0, W, 0);
  fl.addColorStop(0, "rgba(40,60,42,0)"); fl.addColorStop(.35, "rgba(40,60,42,.75)"); fl.addColorStop(1, "#23321f");
  g.fillStyle = fl; g.fillRect(G.right, 0, W - G.right, H);
  for (let i = 0; i < 14; i++) {
    const x = G.right + 50 + rnd() * 120, y = rnd() * H;
    g.fillStyle = rnd() < .5 ? "rgba(22,38,24,.9)" : "rgba(30,50,32,.9)";
    for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x + rnd() * 40 - 20, y + rnd() * 40 - 20, 18 + rnd() * 18, 0, 7); g.fill(); }
  }
  for (let i = 0; i < 40; i++) { // vaga-lumes fixos
    g.fillStyle = "rgba(210,255,150,.35)"; g.beginPath(); g.arc(G.right + 40 + rnd() * 130, rnd() * H, 1.6, 0, 7); g.fill();
  }

  // muralha à esquerda
  g.fillStyle = "#4f4a5e"; g.fillRect(0, 0, G.left - 14, H);
  for (let y = 0; y < H; y += 22) {
    const off = (y / 22) % 2 ? 0 : 20;
    for (let x = -40 + off; x < G.left - 14; x += 40) {
      g.fillStyle = rnd() < .5 ? "#6d6882" : "#7a7590";
      g.beginPath(); g.roundRect ? g.roundRect(x + 2, y + 2, 36, 18, 4) : g.rect(x + 2, y + 2, 36, 18); g.fill();
    }
  }
  g.fillStyle = "#3a3547"; g.fillRect(G.left - 14, 0, 14, H);
  g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(G.left, G.top, 10, G.bottom - G.top);

  desenharMarcadores(g);
})();

/* ---------- Fogo das tochas ---------- */
// "ruído" suave: várias ondas somadas, para a chama não tremer de um jeito repetitivo
function ruido(t, s) { return (Math.sin(t * 7.3 + s) + .6 * Math.sin(t * 11.9 + s * 1.7) + .3 * Math.sin(t * 23.3 + s * 2.9)) / 1.9; }
function linguaFogo(x, y, w, h, sway) {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.bezierCurveTo(x - w / 2, y - h * .45, x + sway * .4 - w * .18, y - h * .72, x + sway, y - h);
  ctx.bezierCurveTo(x + sway * .4 + w * .18, y - h * .72, x + w / 2, y - h * .45, x + w / 2, y);
  ctx.quadraticCurveTo(x, y + w * .3, x - w / 2, y);
  ctx.fill();
}
function desenharFogo(lista = TOCHAS) {
  if (!EFEITO_FOGO.ligado || !fundoComImagem) return;
  const k = EFEITO_FOGO.brilho, t = tempo;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";          // luz somada: brilha sem escurecer nada
  lista.forEach((to, i) => {
    const sd = i * 2.17, n = ruido(t, sd), n2 = ruido(t * 1.3, sd + 5);
    // 1) luz em volta, respirando
    const R = to.h * 4.4 * (1 + n * .07), cx = to.x + n2 * 1.5, cy = to.y - to.h * .45;
    const gl = ctx.createRadialGradient(cx, cy, 2, cx, cy, R);
    gl.addColorStop(0, `rgba(255,165,70,${(.26 + n * .07) * k})`);
    gl.addColorStop(.35, `rgba(255,120,40,${(.11 + n * .04) * k})`);
    gl.addColorStop(1, "rgba(255,90,20,0)");
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
    if (to.chao) {                                    // poça de luz no chão em volta da tocha de pé
      ctx.save(); ctx.translate(to.x + 10, to.y + to.h * 1.6); ctx.scale(1, .35);
      const gc = ctx.createRadialGradient(0, 0, 2, 0, 0, to.h * 3.4);
      gc.addColorStop(0, `rgba(255,150,60,${(.2 + n * .05) * k})`); gc.addColorStop(1, "rgba(255,120,40,0)");
      ctx.fillStyle = gc; ctx.beginPath(); ctx.arc(0, 0, to.h * 3.4, 0, 7); ctx.fill(); ctx.restore();
    }
    // 2) chama viva: três camadas (vermelho, laranja, miolo claro) balançando
    const h = to.h * (1.02 + n * .14), w = to.h * .62, sway = ruido(t * 1.7, sd + 1) * w * .38;
    ctx.fillStyle = "rgba(255,70,15,.30)";  linguaFogo(to.x, to.y, w, h, sway);
    ctx.fillStyle = "rgba(255,70,15,.22)";  linguaFogo(to.x - w * .22, to.y, w * .5, h * (.62 + ruido(t * 2.1, sd + 3) * .12), sway * .8 - w * .15);
    ctx.fillStyle = "rgba(255,70,15,.22)";  linguaFogo(to.x + w * .22, to.y, w * .5, h * (.58 + ruido(t * 2.3, sd + 4) * .12), sway * .8 + w * .15);
    ctx.fillStyle = "rgba(255,160,45,.40)"; linguaFogo(to.x, to.y, w * .7, h * .76, sway * .75);
    ctx.fillStyle = "rgba(255,240,190,.50)"; linguaFogo(to.x, to.y + 1, w * .38, h * .46, sway * .45);
    // 3) faíscas subindo e sumindo
    if (EFEITO_FOGO.faiscas && !reduzMov) {
      for (let f = 0; f < 6; f++) {
        const vida = (t * .5 + f / 6 + sd * .13) % 1;
        const fy = to.y - h * .75 - vida * to.h * 2.8;
        const fx = to.x + Math.sin(vida * 6 + f * 2.1 + sd) * to.h * .38 * vida;
        const a = (1 - vida) * .9;
        ctx.fillStyle = `rgba(255,${190 + f * 8},90,${a})`;
        ctx.beginPath(); ctx.arc(fx, fy, 1.7 * (1 - vida * .5), 0, 7); ctx.fill();
      }
    }
  });
  ctx.restore();
}

/* ---------- Interface: barra do castelo, anúncio de nível, chefão, presentes ---------- */
const BARRAS = { meu: null, inimigo: null };                  // onde ficam as barras (para o clique de espiar)
function naBarra(x, y, r) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
function desenharBarraCastelo() {
  const cx = (G.left + G.right) / 2, w = 640, h = 44, x = cx - w / 2, y = H - h - 12;
  BARRAS.meu = { x, y, w, h };
  const d = nucleoDor, tre = d > 0 && !reduzMov ? Math.sin(tempo * 60) * 2 * d : 0;
  ctx.save(); ctx.translate(tre, 0);
  // moldura
  ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
  const gm = ctx.createLinearGradient(0, y, 0, y + h);
  gm.addColorStop(0, "#3a2a44"); gm.addColorStop(1, "#1d1424");
  ctx.fillStyle = gm; rr(x, y, w, h, 14); ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.lineWidth = 2; ctx.strokeStyle = "#c99a3c"; ctx.stroke();
  ctx.lineWidth = 1; ctx.strokeStyle = "rgba(255,230,160,.25)"; rr(x + 3, y + 3, w - 6, h - 6, 11); ctx.stroke();
  // ícone e nome
  ctx.font = "22px 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("🏰", x + 26, y + h / 2 + 1);
  ctx.font = "800 13px Grandstander, 'Trebuchet MS', sans-serif"; ctx.fillStyle = "#ffe7a6"; ctx.textAlign = "left";
  ctx.fillText("CASTELO", x + 44, y + h / 2 + 1);
  // barra de vida
  const troca = pvp && modoM, minhaVida = troca ? vidaInimigo : vida;   // PARTIDA_PVP de Monsters: o seu castelo, por dentro, é o da direita
  const bx = x + 118, bw = w - 118 - 150, by = y + 12, bh = h - 24, k = minhaVida / 100, kl = (troca ? minhaVida : vidaLag) / 100;
  ctx.fillStyle = "#170c10"; rr(bx, by, bw, bh, bh / 2); ctx.fill();
  if (kl > 0) { ctx.fillStyle = "rgba(255,225,200,.85)"; rr(bx, by, bw * kl, bh, bh / 2); ctx.fill(); }   // dano recente, clarinho
  if (k > 0) {
    const gv = ctx.createLinearGradient(0, by, 0, by + bh);
    const baixa = k < .3;
    gv.addColorStop(0, baixa ? "#ff8a7a" : "#ff6a5a"); gv.addColorStop(.5, baixa ? "#e0262a" : "#d8323a"); gv.addColorStop(1, "#8e1320");
    ctx.fillStyle = gv; rr(bx, by, bw * k, bh, bh / 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.28)"; rr(bx + 3, by + 2, Math.max(0, bw * k - 6), bh * .35, bh * .2); ctx.fill();   // brilho
    if (baixa) { ctx.fillStyle = `rgba(255,80,60,${.25 + Math.sin(tempo * 8) * .2})`; rr(bx, by, bw * k, bh, bh / 2); ctx.fill(); }   // pisca quando está no fim
  }
  ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 1;
  for (let i = 1; i < 10; i++) { const tx = bx + bw * i / 10; ctx.beginPath(); ctx.moveTo(tx, by + 3); ctx.lineTo(tx, by + bh - 3); ctx.stroke(); }
  ctx.strokeStyle = "rgba(255,230,160,.35)"; rr(bx, by, bw, bh, bh / 2); ctx.stroke();
  ctx.font = "800 13px Grandstander, 'Trebuchet MS', sans-serif"; ctx.fillStyle = "#fff4d6"; ctx.textAlign = "center";
  ctx.fillText(`${Math.ceil(minhaVida)} / 100`, bx + bw / 2, by + bh / 2 + 1);
  // nível e onda
  const ix = x + w - 142;
  ctx.fillStyle = "rgba(255,217,122,.12)"; rr(ix, y + 8, 132, h - 16, 10); ctx.fill();
  ctx.fillStyle = "#ffd97a"; ctx.font = "800 13px Grandstander, 'Trebuchet MS', sans-serif";
  const onda = !ondas ? "Livre" : camp.fase === "chefe" || camp.fase === "chefePrep" ? "CHEFÃO" : camp.fase === "nivelOk" ? "Concluído"
    : camp.fase === "preparo" ? `Preparo ${Math.ceil(camp.t)}s` : `Onda ${Math.max(1, camp.onda)}/${CAMPANHA.ondas(camp.nivel)}`;
  ctx.fillText(pvp ? textoPvp() : `Nível ${camp.nivel} · ${onda}`, ix + 66, y + h / 2 + 1, 124);
  ctx.restore();
  // CAMPO_COMPRIDO: vida do castelo do outro lado
  const ex = x + w + 10, ew = W - ex - 12, di = nucleoDorInimigo, tr = di > 0 && !reduzMov ? Math.sin(tempo * 60) * 2 * di : 0;
  BARRAS.inimigo = { x: ex, y, w: ew, h };
  const sobreBarra = mouse.dentro && naBarra(mouse.x, mouse.y, BARRAS.inimigo);
  ctx.save(); ctx.translate(tr, 0);
  if (espiando || sobreBarra) { ctx.shadowColor = "#b07cff"; ctx.shadowBlur = 22; ctx.fillStyle = "#b07cff"; rr(ex - 3, y - 3, ew + 6, h + 6, 16); ctx.fill(); ctx.shadowBlur = 0; }
  ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
  ctx.fillStyle = gm; rr(ex, y, ew, h, 14); ctx.fill();
  ctx.shadowColor = "transparent"; ctx.lineWidth = 2; ctx.strokeStyle = "#8a3a44"; ctx.stroke();
  ctx.font = "18px 'Segoe UI Emoji', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(modoM ? "🏰" : "💀", ex + 18, y + h / 2 + 1);
  const ebx = ex + 34, ebw = ew - 44, eby = y + 14, ebh = h - 28;
  ctx.fillStyle = "#170c10"; rr(ebx, eby, ebw, ebh, ebh / 2); ctx.fill();
  const vidaDeles = troca ? vida : vidaInimigo;
  if (vidaDeles > 0) { ctx.fillStyle = modoM ? "#4f8fe0" : "#9a4bd0"; rr(ebx, eby, ebw * vidaDeles / 100, ebh, ebh / 2); ctx.fill(); }
  ctx.font = "800 11px Grandstander, 'Trebuchet MS', sans-serif"; ctx.fillStyle = "#fff4d6";
  ctx.fillText(`${Math.ceil(vidaDeles)}`, ebx + ebw / 2, eby + ebh / 2 + 1);
  // olhinho: clique para espiar
  ctx.font = "800 10px Grandstander, 'Trebuchet MS', sans-serif"; ctx.fillStyle = sobreBarra || espiando ? "#f3e8ff" : "rgba(243,232,255,.7)";
  ctx.fillText(espiando ? "👁 voltar" : "👁 espiar", ex + ew / 2, y + h - 5);
  ctx.restore();
}
function desenharChefe() {
  const c = camp && camp.chefe;
  if (!BARRA_CHEFAO_NO_TOPO || !c || c.morte) return;
  const w = 420, x = (G.left + G.right) / 2 - w / 2, y = G.top - 6, k = Math.max(0, c.hp / c.max);
  ctx.fillStyle = "rgba(20,10,16,.85)"; rr(x, y, w, 26, 13); ctx.fill();
  ctx.strokeStyle = "#ff6b5e"; ctx.lineWidth = 1.5; ctx.stroke();
  const g = ctx.createLinearGradient(0, y, 0, y + 26);
  g.addColorStop(0, "#c46cff"); g.addColorStop(1, "#6a1f9e");
  ctx.fillStyle = g; rr(x + 4, y + 4, (w - 8) * k, 18, 9); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = "800 12px Grandstander, 'Trebuchet MS', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(`☠ ESQUELETO TITÃ · CHEFÃO  ${Math.ceil(c.hp)}`, x + w / 2, y + 13.5);
}
function desenharBanner() {
  if (!banner) return;
  const b = banner, u = b.t / b.dur;
  const entra = Math.min(1, b.t / .45), sai = u > .8 ? 1 - (u - .8) / .2 : 1;
  const esc = .6 + .4 * easeOutBack(entra), cx = (G.left + G.right) / 2, cy = G.top + G.ch * 1.8;
  ctx.save(); ctx.globalAlpha = sai; ctx.translate(cx, cy); ctx.scale(esc, esc);
  const fx = ctx.createLinearGradient(-320, 0, 320, 0);
  fx.addColorStop(0, "rgba(10,6,16,0)"); fx.addColorStop(.2, "rgba(10,6,16,.72)"); fx.addColorStop(.8, "rgba(10,6,16,.72)"); fx.addColorStop(1, "rgba(10,6,16,0)");
  ctx.fillStyle = fx; ctx.fillRect(-340, -58, 680, 104);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "900 54px Grandstander, 'Trebuchet MS', sans-serif";
  ctx.lineWidth = 8; ctx.strokeStyle = "rgba(30,16,36,.95)"; ctx.strokeText(b.titulo, 0, -10);
  const gt = ctx.createLinearGradient(0, -40, 0, 20);
  gt.addColorStop(0, "#ffffff"); gt.addColorStop(.45, b.cor); gt.addColorStop(1, "#b8741e");
  ctx.fillStyle = gt; ctx.fillText(b.titulo, 0, -10);
  ctx.font = "800 18px Grandstander, 'Trebuchet MS', sans-serif";
  ctx.lineWidth = 4; ctx.strokeStyle = "rgba(20,12,26,.9)"; ctx.strokeText(b.sub, 0, 32);
  ctx.fillStyle = "#fff4d6"; ctx.fillText(b.sub, 0, 32);
  ctx.restore();
}
function desenharPendentes() {
  chipsPendentes = [];
  if (!pendentes.length) return;
  const x = 10, w = 232; let y = G.top + 4;
  ctx.font = "800 12px Grandstander, 'Trebuchet MS', sans-serif"; ctx.textBaseline = "middle"; ctx.textAlign = "left";
  ctx.fillStyle = "rgba(20,14,26,.85)"; rr(x, y, w, 22, 11); ctx.fill();
  ctx.fillStyle = "#ffd97a"; ctx.fillText("🎁 PRESENTES — digite a casa no chat", x + 10, y + 11.5, w - 16);
  y += 26;
  for (const pend of pendentes.slice(0, 8)) {
    const sel = pend === pendenteSel;
    ctx.fillStyle = sel ? "rgba(90,60,20,.95)" : "rgba(20,14,26,.85)"; rr(x, y, w, 26, 9); ctx.fill();
    ctx.strokeStyle = sel ? "#ffd97a" : "rgba(255,217,122,.35)"; ctx.lineWidth = sel ? 2 : 1; ctx.stroke();
    ctx.fillStyle = "rgba(255,217,122,.35)"; rr(x + 2, y + 22, (w - 4) * Math.max(0, pend.t / pend.max), 3, 1.5); ctx.fill();   // tempo restante
    ctx.fillStyle = "#fff4d6"; ctx.fillText(`${pend.usuario} → ${GUERREIROS[pend.tipo].nome}`, x + 10, y + 12, w - 50);
    ctx.fillStyle = "#ffd97a"; ctx.textAlign = "right"; ctx.fillText(sel ? "clique na casa" : `${Math.ceil(pend.t)}s`, x + w - 8, y + 12);
    ctx.textAlign = "left";
    chipsPendentes.push({ x, y, w, h: 26, pend });
    y += 30;
  }
  if (pendentes.length > 8) { ctx.fillStyle = "#ffd97a"; ctx.fillText(`+${pendentes.length - 8} na fila`, x + 10, y + 8); }
}

/* ---------- DESGASTE: em vez de barra de vida, o personagem vai ficando machucado ----------
   Guerreiros: sujeira, manchas escuras, arranhões e sangue na roupa e na pele.
   Esqueletos: rachaduras nos ossos e lascas. Quanto mais golpe, mais marcas; perto do fim ele escurece e pulsa em vermelho.
   As marcas ficam só dentro do desenho do personagem (nunca no chão em volta). */
const BARRA_CHEFAO_NO_TOPO = false;   // true = barra grande do chefão no topo; false = barrinha em cima da cabeça, igual aos outros
const DESGASTE = {
  ligado: false,         // DESLIGADO: sem rachaduras, manchas, sujeira nem pulso vermelho (true = liga de novo)
  barrasDeVida: true,    // true = mostra as barras de vida em cima dos personagens (junto com as marcas)
  marcas: 16,            // quantas marcas no máximo (aparecem aos poucos conforme a vida cai)
  pulsoNoFim: 0.28       // abaixo de 28% de vida: escurece e pulsa em vermelho (está nas últimas)
};
const canvasDano = document.createElement("canvas"), ctxDano = canvasDano.getContext("2d");
function semearMarcas(ent, esqueleto) {
  const rnd = semear(Math.floor((ent.semente || ent.fase || Math.random()) * 99991) + 7);
  const m = [];
  for (let i = 0; i < DESGASTE.marcas; i++) {
    const tipo = esqueleto ? (rnd() < .78 ? "racha" : "lasca") : (rnd() < .5 ? "mancha" : rnd() < .6 ? "risco" : "sangue");
    m.push({ tipo, lim: .06 + (i / DESGASTE.marcas) * .86 + rnd() * .04,     // a partir de quanto dano ela aparece
      x: (rnd() - .5) * .62, y: .12 + rnd() * .78, r: .06 + rnd() * .08, a: rnd() * 6.28, seed: rnd() * 99 });
  }
  return m;
}
// desenha um quadro da folha com as marcas de desgaste por cima (só nos pixels do personagem)
function desenharComDesgaste(img, sx, sy, sw, sh, dx, dy, ent, ancX, ancY, esqueleto) {
  const dano = ent && ent.max ? 1 - Math.max(0, ent.hp) / ent.max : 0;
  if (!DESGASTE.ligado || dano <= .02 || ent.morte || sw < 2 || sh < 2) { ctx.drawImage(img, sx, sy, sw, sh, dx, dy, sw, sh); return; }
  const cw = Math.ceil(sw), ch = Math.ceil(sh);
  if (canvasDano.width < cw || canvasDano.height < ch) { canvasDano.width = Math.max(canvasDano.width, cw); canvasDano.height = Math.max(canvasDano.height, ch); }
  const g = ctxDano;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
  g.clearRect(0, 0, cw + 2, ch + 2);
  g.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  g.globalCompositeOperation = "source-atop";                   // daqui para frente, só pinta em cima do personagem
  if (!ent.marcas) ent.marcas = semearMarcas(ent, esqueleto);
  const alt = ancY * .88, larg = alt * .55;
  for (const mk of ent.marcas) {
    if (dano < mk.lim) continue;
    const k = Math.min(1, (dano - mk.lim) / .12);               // cada marca "aparece" aos poucos
    const x = ancX + mk.x * larg * 2, y = ancY - mk.y * alt, r = mk.r * alt * (.6 + .4 * k);
    if (mk.tipo === "mancha") {                                 // sujeira / roupa manchada
      const gr = g.createRadialGradient(x, y, 0, x, y, r * 1.6);
      gr.addColorStop(0, `rgba(150,118,86,${.62 * k})`); gr.addColorStop(.55, `rgba(70,48,30,${.5 * k})`); gr.addColorStop(1, "rgba(60,40,24,0)");   // poeira clara no meio, sujeira escura em volta
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r * 1.6, r * 1.1, mk.a, 0, 7); g.fill();
      g.fillStyle = `rgba(140,110,80,${.6 * k})`;
      for (let j = 0; j < 4; j++) { const aa = mk.seed + j * 1.7; g.beginPath(); g.arc(x + Math.cos(aa) * r * 1.9, y + Math.sin(aa) * r * 1.3, r * .18, 0, 7); g.fill(); }
    } else if (mk.tipo === "sangue") {                          // hematoma / sangue
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(130,8,12,${.85 * k})`); gr.addColorStop(.7, `rgba(95,10,18,${.5 * k})`); gr.addColorStop(1, "rgba(90,12,20,0)");
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r, r * .8, mk.a, 0, 7); g.fill();
      g.strokeStyle = `rgba(120,8,12,${.75 * k})`; g.lineWidth = Math.max(1.5, r * .2);
      g.beginPath(); g.moveTo(x, y + r * .3); g.lineTo(x + Math.sin(mk.seed) * r * .2, y + r * (1 + k)); g.stroke();   // escorrendo
    } else if (mk.tipo === "risco") {                           // arranhão / corte na roupa
      g.lineCap = "round";
      for (let j = 0; j < 3; j++) {                              // três riscos paralelos: corte escuro com borda clara (tecido rasgado)
        const ox = (j - 1) * r * .35, x1 = x + ox - Math.cos(mk.a) * r * 1.4, y1 = y - Math.sin(mk.a) * r * 1.4;
        const x2 = x + ox + Math.cos(mk.a) * r * 1.4 * k, y2 = y + Math.sin(mk.a) * r * 1.4 * k;
        g.strokeStyle = `rgba(210,185,160,${.55 * k})`; g.lineWidth = Math.max(2, r * .2);
        g.beginPath(); g.moveTo(x1 + 1, y1 + 1); g.lineTo(x2 + 1, y2 + 1); g.stroke();
        g.strokeStyle = `rgba(90,10,10,${.85 * k})`; g.lineWidth = Math.max(1.2, r * .12);
        g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
      }
    } else {                                                    // esqueleto: rachadura ou lasca no osso
      g.lineCap = "round"; g.lineJoin = "round";
      const n = mk.tipo === "lasca" ? 4 : 9, passo = r * .62;
      const pts = [[x, y]]; let px = x, py = y, ang = mk.a;
      for (let j = 0; j < n * k; j++) { ang += Math.sin(mk.seed + j * 2.1) * 1.25; px += Math.cos(ang) * passo; py += Math.sin(ang) * passo; pts.push([px, py]); }
      g.strokeStyle = `rgba(250,242,225,${.55 * k})`; g.lineWidth = Math.max(1.8, r * .2);        // borda clara da rachadura
      g.beginPath(); pts.forEach(([a, b], j) => j ? g.lineTo(a + 1, b + 1) : g.moveTo(a + 1, b + 1)); g.stroke();
      g.strokeStyle = `rgba(25,18,12,${.95 * k})`; g.lineWidth = Math.max(1.2, r * .12);            // a fenda escura
      g.beginPath(); pts.forEach(([a, b], j) => j ? g.lineTo(a, b) : g.moveTo(a, b)); g.stroke();
      if (pts.length > 3) {                                     // galhinho da rachadura
        const [bx, by] = pts[2]; g.lineWidth = Math.max(.8, r * .1);
        g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + Math.cos(mk.a + 1.8) * passo * 1.2, by + Math.sin(mk.a + 1.8) * passo * 1.2); g.stroke();
      }
      if (mk.tipo === "lasca") { g.fillStyle = `rgba(35,26,18,${.8 * k})`; g.beginPath(); g.moveTo(x, y); g.lineTo(x + r * .7, y - r * .3); g.lineTo(x + r * .3, y + r * .6); g.closePath(); g.fill(); }
    }
  }
  // desgaste geral: vai escurecendo; nas últimas, pulsa em vermelho
  g.fillStyle = `rgba(25,15,10,${dano * .22})`; g.fillRect(0, 0, cw, ch);
  if (dano > 1 - DESGASTE.pulsoNoFim) {
    const u = (dano - (1 - DESGASTE.pulsoNoFim)) / DESGASTE.pulsoNoFim, pul = .5 + .5 * Math.sin(tempo * (6 + u * 6));
    g.fillStyle = `rgba(190,20,15,${(.12 + .22 * u) * pul})`; g.fillRect(0, 0, cw, ch);
  }
  ctx.drawImage(canvasDano, 0, 0, sw, sh, dx, dy, sw, sh);
}

/* ---------- Desenho ---------- */
let F = 0; // intensidade do flash branco da entidade atual
function parte(caminho, cor, semContorno) {
  ctx.fillStyle = cor; ctx.fill(caminho);
  if (F > 0) { ctx.save(); ctx.globalAlpha *= Math.min(1, F); ctx.fillStyle = "#fff"; ctx.fill(caminho); ctx.restore(); }
  if (!semContorno) ctx.stroke(caminho);
}
function sombra(x, y, rx) {
  ctx.fillStyle = "rgba(20,40,20,.25)";
  ctx.beginPath(); ctx.ellipse(x, y, rx, rx * .32, 0, 0, 7); ctx.fill();
}
function barra(x, y, w, frac, cor) {
  ctx.fillStyle = C.ink; ctx.fillRect(x - w / 2 - 2, y - 2, w + 4, 8);
  ctx.fillStyle = "#3d3049"; ctx.fillRect(x - w / 2, y, w, 4);
  ctx.fillStyle = cor; ctx.fillRect(x - w / 2, y, w * Math.max(0, frac), 4);
}
// barra com a cor do nível e, embaixo dela, o nome e o nível do personagem
function barraComNivelM(x, y, w, frac, _cor, c) {             // monstros: mesma barra, com nome e nível
  const per = c.tipo && PERSONAGENS[c.tipo];
  barraComNivel(x, y, w, frac, per ? (per.nomeCurto || per.nome.replace("Esqueleto ", "Esq. ")) : "Monstro", c.nivel || 1, true);
}
// A barra só aparece enquanto o personagem está APANHANDO: surge no golpe e some sozinha pouco depois
const BARRA_TEMPO = { mostra: 2.2, some: .6 };   // segundos visível depois do último golpe, e tempo para sumir
function alfaBarra(ent) {
  if (ent.hpVisto === undefined) ent.hpVisto = ent.hp;
  if (ent.hp < ent.hpVisto - .01) ent.barraAte = tempo + BARRA_TEMPO.mostra;   // levou golpe agora
  ent.hpVisto = ent.hp;                                                        // (curar ou evoluir não mostra a barra)
  const falta = (ent.barraAte || 0) - tempo;
  if (falta <= -BARRA_TEMPO.some) return 0;
  return falta >= 0 ? 1 : 1 + falta / BARRA_TEMPO.some;
}
// barra de vida com a cor do nível e o número do nível à esquerda (ex.: "2 ▬▬▬")
function barraComNivel(x, y, w, frac, nome, lv, inimigo) {
  barra(x + 7, y, w, frac, corDoNivel(lv));
  const bx = x + 7 - w / 2 - 10, by = y + 2;
  ctx.font = "900 10px Grandstander, 'Trebuchet MS', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const tw = Math.max(15, ctx.measureText(String(lv)).width + 7);
  ctx.fillStyle = inimigo ? "#3a0c12" : "#101a33"; rr(bx - tw / 2, by - 7, tw, 14, 7); ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = corDoNivel(lv); ctx.stroke();
  ctx.fillStyle = "#ffffff"; ctx.fillText(String(lv), bx, by + .5);
}

function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function tempoMorte(p) {
  const sp = GUERREIROS[p.tipo].sprite, m = sp && sp.anims.morrendo;
  return m && m.ok ? m.quadros / m.fps + (m.caido ?? 1) + .6 : .5;
}
function desenharGuerreiroSprite(p) {
  const g = GUERREIROS[p.tipo], sp = g.sprite;
  const mo = sp.anims.morrendo;
  if (p.morte && mo && mo.ok) {           // animação de queda ao perder toda a vida
    const dur = mo.quadros / mo.fps;
    const q = Math.min(mo.quadros - 1, Math.floor(p.morte * mo.fps));
    const some = clamp01((p.morte - dur - (mo.caido ?? 1)) / .6);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = 1 - some;
    const escM = sp.escala * (mo.escala ?? 1);                    // a folha de morte pode ter escala própria
    ctx.scale(escM, escM);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(mo.img, (q % mo.cols) * mo.cw, Math.floor(q / mo.cols) * mo.ch, mo.cw, mo.ch, -mo.ax, -mo.ay, mo.cw, mo.ch);
    ctx.restore();
    return;
  }
  if (p.andando && g.andar && g.andar.ok) return desenharHeroiAndando(p, g);   // MODO_MONSTERS
  if (g.trechos) return desenharProtetor(p, g);
  if (g.sentinela) return desenharSentinela(p, g);
  let an = p.atacando && sp.anims.atacando.ok ? sp.anims.atacando : sp.anims.parado, q;
  const pr = sp.anims.preparando;
  if (p.atacando && an === sp.anims.atacando) q = Math.min(an.quadros - 1, Math.floor(p.tA * an.fps));
  else if ((p.pose === "preparando" || p.pose === "voltando") && pr && pr.ok) {
    an = pr; const k = Math.min(pr.quadros - 1, Math.floor(p.tPose * pr.fps));
    q = p.pose === "voltando" ? pr.quadros - 1 - k : k;           // "voltando" toca de trás para frente
  } else if (p.pose === "guarda" && sp.anims.atacando.ok) { an = sp.anims.atacando; q = an.quadros - 1; }  // agachado esperando o próximo tiro
  else q = Math.floor(p.idade * an.fps) % an.quadros;
  comecarGuerreiro(p, 30);
  if (!an.ok) {                 // imagem ainda não carregou: escudo simples no lugar
    ctx.fillStyle = "#6d8ccc"; ctx.beginPath(); ctx.arc(0, -40, 26, 0, 7); ctx.fill(); ctx.stroke();
    terminarGuerreiro(p, 90); return;
  }
  if (p.flash > .25) ctx.filter = "brightness(2.2)";
  ctx.save();
  ctx.scale(sp.escala, sp.escala);
  desenharComDesgaste(an.img, (q % an.cols) * an.cw, Math.floor(q / an.cols) * an.ch, an.cw, an.ch, -an.ax, -an.ay, p, an.ax, an.ay, false);
  ctx.restore();
  ctx.filter = "none";
  if (g.brilhoCajado && an === sp.anims.parado) brilhoCajado(g.brilhoCajado, p.idade + p.semente);
  terminarGuerreiro(p, 128);
}
function desenharHeroiAndando(p, g) {
  const a = g.andar, q = Math.floor(p.tAndar * a.fps) % a.quadros;
  const cfg = MODO_MONSTERS.andar[p.tipo] || {};
  comecarGuerreiro(p, g.sentinela ? 44 : 30);
  if (p.flash > .25) ctx.filter = "brightness(2.2)";
  ctx.save();
  ctx.translate(cfg.deslocX || 0, 0);                               // ajuste fino opcional (painel de ajustes)
  const e = g.sprite.escala * a.fator * (cfg.tamanho || 1); ctx.scale(e, e);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(a.img, (q % a.cols) * a.cw, Math.floor(q / a.cols) * a.ch, a.cw, a.ch, -a.ax, -a.ay, a.cw, a.ch);
  ctx.restore(); ctx.filter = "none";
  terminarGuerreiro(p, g.sentinela ? 185 : 128);
}
// Cristal do cajado pulsando, com faíscas e um anel de energia girando (coordenadas já na posição do guerreiro)
function brilhoCajado(b, t) {
  const fogo = b.estilo === "fogo";
  const pul = .5 + Math.sin(t * 3.1) * .3 + Math.sin(t * 7.7) * .12;
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(b.x, b.y, 1, b.x, b.y, b.raio * (1.2 + pul * .4));
  g.addColorStop(0, fogo ? `rgba(255,230,150,${.55 + pul * .35})` : `rgba(200,240,255,${.55 + pul * .35})`);
  g.addColorStop(.4, fogo ? `rgba(255,120,30,${.25 + pul * .2})` : `rgba(80,160,255,${.25 + pul * .2})`);
  g.addColorStop(1, fogo ? "rgba(220,40,0,0)" : "rgba(40,100,255,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, b.raio * (1.2 + pul * .4), 0, 7); ctx.fill();
  if (fogo) {                                            // chaminha viva em cima do cristal
    const h = b.raio * (1.1 + Math.sin(t * 13) * .15 + Math.sin(t * 21) * .08);
    ctx.fillStyle = "rgba(255,110,25,.45)"; linguaFogo(b.x, b.y - b.raio * .2, b.raio * .75, h, Math.sin(t * 9) * 3);
    ctx.fillStyle = "rgba(255,220,120,.55)"; linguaFogo(b.x, b.y - b.raio * .2, b.raio * .4, h * .6, Math.sin(t * 9) * 2);
  } else {
    ctx.strokeStyle = `rgba(170,230,255,${.45 + pul * .3})`; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(b.x, b.y, b.raio * .75, b.raio * .28, t * 1.8, 0, Math.PI * 1.4); ctx.stroke();
  }
  for (let k = 0; k < 4; k++) {                          // faíscas / brasas subindo do cristal
    const v = (t * .45 + k / 4) % 1;
    ctx.fillStyle = fogo ? `rgba(255,${170 + k * 15},70,${(1 - v) * .9})` : `rgba(190,235,255,${(1 - v) * .9})`;
    ctx.beginPath(); ctx.arc(b.x + Math.sin(v * 7 + k * 1.7) * 7, b.y - 4 - v * 26, 1.5 * (1 - v * .5), 0, 7); ctx.fill();
  }
  ctx.restore();
}
function desenharSentinela(p, g) {
  const A = g.sprite.anims;
  const an = p.acao && A[p.acao].ok ? A[p.acao] : A.parado;
  comecarGuerreiro(p, 44);
  if (!an.ok) { ctx.fillStyle = "#2b4a8f"; rr(-26, -120, 52, 110, 14); ctx.fill(); ctx.stroke(); terminarGuerreiro(p, 140); return; }
  const q = an === A.parado ? Math.floor(p.idade * an.fps) % an.quadros : Math.min(an.quadros - 1, Math.floor(p.tA * an.fps));
  if (p.flash > .25) ctx.filter = "brightness(2.2)";
  const escS = g.sprite.escala * (an.fator || 1);
  ctx.save(); ctx.scale(escS, escS);
  ctx.imageSmoothingQuality = "high";
  // não desenha a beiradinha de cada quadro: evita a linha fina do quadro vizinho (principalmente o de cima) vazando
  const kc = an.grade && an.grade.ref ? an.cw / an.grade.ref : 1, m = 2 * kc;
  const ct = (an.cortes && an.cortes[q]) || [0, 0, 0, 0];
  const ci = Math.max(m, ct[0] * kc), cd = Math.max(m, ct[1] * kc), cb = Math.max(m, ct[2] * kc), ce = Math.max(m, ct[3] * kc);
  const sx = (q % an.cols) * an.cw, sy = Math.floor(q / an.cols) * an.ch;
  desenharComDesgaste(an.img, sx + ce, sy + ci, an.cw - ce - cd, an.ch - ci - cb, -an.ax + ce, -an.ay + ci, p, an.ax - ce, an.ay - ci, false);
  ctx.restore(); ctx.filter = "none";
  terminarGuerreiro(p, 185);
}
function desenharProtetor(p, g) {
  const an = g.sprite.anims.defendendo;
  comecarGuerreiro(p, 32);
  if (!an.ok) {
    ctx.fillStyle = "#3f5fae"; rr(-22, -80, 44, 70, 12); ctx.fill(); ctx.stroke();
    terminarGuerreiro(p, 100); return;
  }
  const q = Math.max(0, Math.min(an.quadros - 1, Math.floor(p.qf ?? 0)));
  if (p.flash > .25) ctx.filter = "brightness(2.2)";
  ctx.scale(g.sprite.escala, g.sprite.escala);
  desenharComDesgaste(an.img, (q % an.cols) * an.cw, Math.floor(q / an.cols) * an.ch, an.cw, an.ch, -an.ax, -an.ay, p, an.ax, an.ay, false);
  ctx.filter = "none";
  terminarGuerreiro(p, 130);
}
function desenharGuerreiro(p) {
  const v = GUERREIROS[p.tipo].visual;
  if (v === "sprite") return desenharGuerreiroSprite(p);
  if (v === "cristal") return desenharCristal(p);
  if (v === "rocha") return desenharRocha(p);
  desenharPlanta(p);
}
function comecarGuerreiro(p, raioSombra) {
  const s = Math.max(0, easeOutBack(p.nasc));
  const m = p.morte ? clamp01(p.morte / .5) : 0;
  ctx.save();
  ctx.translate(p.x, p.y);
  sombra(0, 2, raioSombra * s * (1 - m));
  const sq = p.recuo * .1;
  ctx.scale(s * (1 + sq * .6) * (1 - m * .3), s * (1 - sq) * (1 - m));
  ctx.globalAlpha = (1 - m) * alfaFantasma;          // alfaFantasma < 1 só na prévia de colocar guerreiro
  ctx.lineWidth = 3; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.strokeStyle = C.ink;
  F = p.flash;
}
function terminarGuerreiro(p, altura) {
  ctx.restore();
  const aB = alfaBarra(p);
  if ((!DESGASTE.ligado || DESGASTE.barrasDeVida) && !p.morte && aB > 0) {
    ctx.save(); ctx.globalAlpha = aB;
    barraComNivel(p.x, p.y - altura, 44, p.hp / p.max, GUERREIROS[p.tipo].nomeCurto || GUERREIROS[p.tipo].nome, p.nivel || 1, false);
    ctx.restore();
  }
  if (p.dono && !p.morte) {                                     // nome de quem mandou o presente
    ctx.font = "800 11px Grandstander, 'Trebuchet MS', sans-serif";
    const txt = "🎁 " + p.dono, w = Math.min(120, ctx.measureText(txt).width + 12), y = p.y - altura - 16;
    ctx.fillStyle = "rgba(20,14,26,.82)"; rr(p.x - w / 2, y - 8, w, 16, 8); ctx.fill();
    ctx.strokeStyle = "rgba(255,217,122,.7)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = "#ffe7a6"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(txt, p.x, y + .5, w - 8);
  }
}
const PC = {
  base:   new Path2D("M-30 0 C-33 -10 -22 -19 -8 -18 C4 -22 22 -19 30 -8 C34 -2 30 2 24 2 L-24 2 C-30 2 -31 1 -30 0 Z"),
  cMeio:  new Path2D("M-12 -14 L-14 -52 L0 -70 L14 -52 L12 -14 Z"),
  cLuz:   new Path2D("M0 -70 L14 -52 L12 -14 L3 -14 L3 -52 Z"),
  cEsq:   new Path2D("M-24 -12 L-31 -36 L-23 -47 L-14 -38 L-12 -14 Z"),
  cDir:   new Path2D("M12 -14 L16 -41 L25 -49 L32 -36 L24 -12 Z"),
  pedra:  new Path2D("M-34 0 C-40 -24 -30 -58 -4 -62 C24 -64 40 -40 36 -12 C35 -4 30 0 24 0 Z"),
  pSomb:  new Path2D("M20 -56 C34 -46 40 -26 36 -8 C34 -2 30 0 24 0 L12 0 C24 -14 28 -36 20 -56 Z"),
  pMusgo: new Path2D("M-27 -49 C-18 -64 8 -68 23 -58 C14 -54 8 -58 0 -54 C-8 -58 -16 -52 -27 -49 Z"),
  fenda1: new Path2D("M-20 -46 L-13 -38 L-18 -29 L-12 -22"),
  fenda2: new Path2D("M20 -34 L11 -27 L15 -17 L8 -9")
};
function desenharCristal(p) {
  comecarGuerreiro(p, 28);
  const pulso = .5 + Math.sin(p.idade * 3 + p.semente) * .5;
  const carga = GUERREIROS[p.tipo].intervalo ? 1 - Math.max(0, p.gerT) / GUERREIROS[p.tipo].intervalo : 0;
  const treme = carga > .88 ? Math.sin(p.idade * 60) * 1.2 : 0;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const gl = ctx.createRadialGradient(0, -40, 2, 0, -40, 46);
  gl.addColorStop(0, `rgba(255,200,80,${.25 + pulso * .15 + carga * .2 + p.brilho * .5})`);
  gl.addColorStop(1, "rgba(255,160,40,0)");
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, -40, 46, 0, 7); ctx.fill();
  ctx.restore();
  ctx.translate(treme, 0);
  parte(PC.cEsq, "#f0a53a");
  parte(PC.cDir, "#f0a53a");
  parte(PC.cMeio, "#ffc94a");
  parte(PC.cLuz, "#ffe392", true);
  ctx.stroke(PC.cMeio);
  parte(PC.base, "#8c7a68");
  // rostinho
  const ab = p.piscT > 0 ? .15 : 1;
  for (const ex of [-5, 5]) {
    ctx.save(); ctx.translate(ex, -40); ctx.scale(1, ab);
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(0, 0, 2.6, 3.6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(.8, -1.2, 1, 0, 7); ctx.fill();
    ctx.restore();
  }
  ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -33, 4, .3, Math.PI - .3); ctx.stroke();
  ctx.fillStyle = "rgba(255,120,120,.5)";
  ctx.beginPath(); ctx.ellipse(-8, -34, 2.6, 1.6, 0, 0, 7); ctx.ellipse(8, -34, 2.6, 1.6, 0, 0, 7); ctx.fill();
  terminarGuerreiro(p, 86);
}
function desenharRocha(p) {
  comecarGuerreiro(p, 34);
  const resp = 1 + Math.sin(p.idade * 1.6 + p.semente) * .015;
  ctx.scale(1, resp);
  parte(PC.pedra, "#a4adb7");
  parte(PC.pSomb, "#86909b", true);
  parte(PC.pMusgo, C.moss);
  const frac = p.hp / p.max;
  ctx.lineWidth = 2.5;
  if (frac < .66) ctx.stroke(PC.fenda1);
  if (frac < .33) ctx.stroke(PC.fenda2);
  ctx.lineWidth = 3;
  const ab = p.piscT > 0 ? .15 : 1;
  for (const [ex, ey] of [[-13, -32], [4, -33]]) {
    ctx.save(); ctx.translate(ex, ey); ctx.scale(1, ab);
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(0, 0, 6, 7, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(2.2, .5, 3, 0, 7); ctx.fill();
    ctx.restore();
  }
  ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.moveTo(-20, -42); ctx.lineTo(-7, -39); ctx.moveTo(-2, -40); ctx.lineTo(11, -43); ctx.stroke();
  ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-9, -18); ctx.lineTo(3, -19); ctx.stroke();
  terminarGuerreiro(p, 82);
}

function desenharPlanta(p) {
  const s = easeOutBack(p.nasc);
  const m = p.morte ? clamp01(p.morte / .5) : 0;
  ctx.save();
  ctx.translate(p.x, p.y);
  sombra(0, 2, 26 * Math.max(0, s) * (1 - m));
  const balanco = Math.sin(p.idade * 2.2 + p.semente) * .06;
  const sq = p.recuo * .1;
  ctx.scale(Math.max(0, s) * (1 + sq * .6) * (1 - m * .3), Math.max(0, s) * (1 - sq) * (1 - m));
  ctx.globalAlpha = 1 - m;
  ctx.lineWidth = 3; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.strokeStyle = C.ink;
  F = p.flash;

  // folha de trás
  ctx.save(); ctx.translate(3, -14); ctx.rotate(.3 + balanco * 1.6); ctx.scale(-1, 1); parte(P.leaf, C.leafDark); ctx.restore();
  // caule e cabeça
  ctx.save(); ctx.rotate(balanco);
  parte(P.stem, C.stem);
  ctx.translate(0, -58);
  ctx.rotate(-balanco * .6 - p.recuo * .16);
  ctx.translate(-p.recuo * 6, -18);
  const resp = 1 + Math.sin(p.idade * 3 + p.semente) * .025;
  ctx.scale(1 - p.recuo * .08, resp + p.recuo * .06);
  parte(P.spikes, C.spike);
  parte(P.collar, C.leaf);
  parte(P.bulb, C.bulb);
  parte(P.shine, C.bulbLight, true);
  // bochecha
  ctx.fillStyle = "rgba(255,143,177,.55)"; ctx.beginPath(); ctx.ellipse(-2, 8, 5, 3, 0, 0, 7); ctx.fill();
  // olho (pisca)
  const ab = p.piscT > 0 ? .12 : 1;
  ctx.save(); ctx.translate(8, -3); ctx.scale(1, ab);
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(0, 0, 8.5, 9.5, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(3, 1, 4.6, 0, 7); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(4.6, -1, 1.5, 0, 7); ctx.fill();
  ctx.restore();
  // boca
  ctx.lineWidth = 2.5; ctx.beginPath();
  if (p.recuo > .3) { ctx.fillStyle = C.ink; ctx.ellipse(12, 10, 3.5, 4, 0, 0, 7); ctx.fill(); }
  else { ctx.arc(10, 7, 5, .3, Math.PI - .6); ctx.stroke(); }
  ctx.restore();
  // folha da frente
  ctx.lineWidth = 3;
  ctx.save(); ctx.translate(-3, -16); ctx.rotate(-.12 - balanco * 1.6); parte(P.leaf, C.leaf);
  ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(43,32,48,.45)"; ctx.stroke(P.vein); ctx.restore();

  ctx.restore();
  if (!p.morte && p.hp < p.max) barra(p.x, p.y - 118, 44, p.hp / p.max, "#6fe07f");
}

function desenharCriatura(c) {
  if (c.tipo) { desenharCriaturaSprite(c); if (PERSONAGENS[c.tipo].escudo) desenharEscudoFx(c, PERSONAGENS[c.tipo]); return; }
  desenharCriaturaVetor(c);
}

// Quanto tempo o monstro fica em campo depois de morrer
function tempoMorteCriatura(c) {
  const mo = c.tipo && PERSONAGENS[c.tipo].anims.morrer;
  return mo && mo.ok ? mo.quadros / mo.fps + (mo.caido ?? 1) + .6 : 1.1;
}
// Queda usando a folha "morrendo": cai, fica no chão e some aos poucos
function desenharCriaturaMorrendo(c, per, mo) {
  const dur = mo.quadros / mo.fps;
  const q = Math.min(mo.quadros - 1, Math.floor(c.morte * mo.fps));
  const some = clamp01((c.morte - dur - (mo.caido ?? 1)) / .6);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.globalAlpha = 1 - some;
  const esc = per.escala * (mo.escala ?? 1);        // a folha de morte pode ter ajuste de tamanho próprio
  ctx.scale(mo.olhaDireita ? -esc : esc, esc);
  ctx.drawImage(mo.img, (q % mo.cols) * mo.cw, Math.floor(q / mo.cols) * mo.ch, mo.cw, mo.ch, -mo.ax, -mo.ay, mo.cw, mo.ch);
  ctx.restore();
}

function desenharCriaturaSprite(c) {
  const per = PERSONAGENS[c.tipo];
  const mo = per.anims.morrer;
  if (c.morte && mo && mo.ok) return desenharCriaturaMorrendo(c, per, mo);
  const m = c.morte ? clamp01(c.morte / 1.1) : 0;
  const temAtaque = per.anims.atacar && per.anims.atacar.ok;
  const necroParado = per.necro && c.plantado && !c.atirando && !c.morte;
  const titaAnim = per.tita && c.acao && per.anims[c.acao] && per.anims[c.acao].ok ? per.anims[c.acao] : null;
  const anim = titaAnim || (necroParado && per.anims.parado && per.anims.parado.ok ? per.anims.parado
    : c.estado === "atacar" && temAtaque ? per.anims.atacar : per.anims.andar);
  let quadro = Math.floor(c.tAnim * anim.fps) % anim.quadros;
  if (titaAnim) quadro = Math.min(anim.quadros - 1, Math.floor(c.tA * anim.fps));
  else if (anim === per.anims.atacar && anim.quadroGolpe != null && !per.tiro && !per.necro)
    quadro = Math.min(anim.quadros - 1, Math.floor((c.tA || 0) * anim.fps));   // soco sincronizado com o dano
  if (per.tiro && anim === per.anims.atacar)                  // arqueiro: segue o disparo; entre tiros fica no último quadro
    quadro = c.atirando ? Math.min(anim.quadros - 1, Math.floor(c.tTiro * anim.fps)) : anim.quadros - 1;
  // Esqueleto Mago parado esperando: pose parada respirando (se a folha "parado" não carregar, fica no 1º quadro do ataque)
  if (anim === per.anims.parado) quadro = Math.floor(tempo * anim.fps + c.fase) % anim.quadros;
  else if (per.necro && anim === per.anims.atacar)
    quadro = c.atirando ? Math.min(anim.quadros - 1, Math.floor(c.tTiro * anim.fps)) : 0;
  const qx = (quadro % anim.cols) * anim.cw, qy = Math.floor(quadro / anim.cols) * anim.ch;

  // Enquanto não existe a folha "atacando": um bote para frente a cada golpe
  let bote = 0, amassa = 1;
  if (per.tita && c.acao && !titaAnim && !c.morte) {          // Titã sem as folhas de ataque: movimentos simples
    const R = per.tita.reserva[c.acao === "socar" ? "soco" : "luta"], u = Math.min(1, c.tA * 10 / R.quadros);
    if (c.acao === "lutar") bote = u < .45 ? (u / .45) * 6 : -Math.sin((u - .45) / .55 * Math.PI) * 22;
    else { const k = R.impacto / R.quadros; amassa = u < k ? 1 + (u / k) * .06 : 1 - Math.sin(Math.min(1, (u - k) / (1 - k)) * Math.PI) * .14; }
  } else if (!c.morte && c.estado === "atacar" && !temAtaque && !per.tita) {
    const u = 1 - c.atk / ATK;
    bote = u < .75 ? (u / .75) * 5 : -Math.sin((u - .75) / .25 * Math.PI) * 14;
  }

  const fogo = per.efeito === "fogo";
  const brotando = c.brotar != null && c.brotar < 1 && !c.morte;
  const alfa = (brotando ? 1 : clamp01(c.surgir)) * (1 - Math.max(0, (m - .45) / .55));
  ctx.save();
  const salto = c.pulo ? Math.sin(c.pulo * Math.PI) * 26 : 0;
  ctx.translate(c.x + c.empurrao * 10 + bote, c.y + m * 6 - salto);
  sombra(0, 2 + salto, 28 * (1 - m * .5) * (brotando ? c.brotar : 1));
  if (brotando) {                                              // sobe da terra: cortado na altura do chão
    const e = 1 - Math.pow(1 - c.brotar, 3);
    ctx.beginPath(); ctx.rect(-90, -220, 180, 224); ctx.clip();
    ctx.translate(Math.sin(c.brotar * 40) * 2 * (1 - e), (1 - e) * 125);
  }
  if (fogo) brilhoChao(alfa);
  ctx.globalAlpha = alfa;
  if (m) ctx.rotate(easeInOut(Math.min(1, m * 1.8)) * 1.2);   // tomba para trás
  ctx.save();
  if (c.flash > .25) ctx.filter = "brightness(2.3)";          // pisca ao levar dano
  const esc = per.escala * (anim.escala ?? 1);                            // cada animação pode ter sua própria escala
  const paradoM = c.fixo && !c.morte && c.estado !== "atacar" && !c.acao && !c.atirando && !necroParado;   // MODO_MONSTERS: parado na casa
  const resp = necroParado && anim !== per.anims.parado ? 1 + Math.sin(tempo * 2.4 + c.fase) * .012
    : paradoM ? 1 + Math.sin(tempo * 2.2 + c.fase) * MODO_MONSTERS.respirar : 1;   // a folha "parado" já respira sozinha
  ctx.scale(anim.olhaDireita ? -esc : esc, esc * resp * amassa);      // a folha olha para a direita; o jogo anda para a esquerda
  ctx.imageSmoothingQuality = "high";                                      // reduz folhas grandes sem serrilhar
  desenharComDesgaste(anim.img, qx, qy, anim.cw, anim.ch, -anim.ax, -anim.ay, c, anim.ax, anim.ay, true);   // esqueleto: rachaduras
  ctx.restore();
  if (necroParado && per.necro.brilhoCajado) brilhoCajado(per.necro.brilhoCajado, tempo + c.fase);
  // chamas grandes na cabeça desligadas: o fogo agora vem do corpo inteiro
  // if (fogo) desenharChamas(4, (per.cabeca[quadro % per.cabeca.length] + 8) * per.escala, per.escala / .56, tempo + c.fase * 3, alfa * (1 - m));
  ctx.restore();
  const aBc = alfaBarra(c);
  if ((!DESGASTE.ligado || DESGASTE.barrasDeVida) && !c.morte && !brotando && aBc > 0) {
    ctx.save(); ctx.globalAlpha = aBc;
    barraComNivelM(c.x, c.y - (per.barraY || 134), per.tita ? 60 : 46, c.hp / c.max, "#ffb14e", c);
    ctx.restore();
  }
}

// Brilho alaranjado no chão, sob o personagem em chamas
function brilhoChao(alfa) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alfa * (.55 + Math.sin(tempo * 11) * .08 + Math.sin(tempo * 17) * .05);
  ctx.scale(1, .3);
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 52);
  g.addColorStop(0, "rgba(255,140,40,.8)"); g.addColorStop(1, "rgba(255,80,20,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 52, 0, 7); ctx.fill();
  ctx.restore();
}

// Chamas animadas no crânio: línguas de fogo que tremulam e se inclinam para trás
function desenharChamas(x, y, s, t, alfa) {
  if (alfa <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alfa;
  ctx.globalCompositeOperation = "lighter";
  const aura = ctx.createRadialGradient(0, -14 * s, 2, 0, -14 * s, 30 * s);
  aura.addColorStop(0, "rgba(255,110,30,.22)"); aura.addColorStop(1, "rgba(255,60,10,0)");
  ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(0, -14 * s, 30 * s, 0, 7); ctx.fill();
  ctx.globalCompositeOperation = "source-over";
  const camadas = [
    { cor: "rgba(200,40,12,.85)",  larg: 1,   alt: 1,   luz: false },
    { cor: "rgba(255,110,20,.9)",  larg: .72, alt: .78, luz: false },
    { cor: "rgba(255,200,90,.7)",  larg: .42, alt: .5,  luz: true }
  ];
  for (const k of camadas) {
    ctx.globalCompositeOperation = k.luz ? "lighter" : "source-over";
    ctx.fillStyle = k.cor;
    for (let i = 0; i < 5; i++) {
      const bx = (i - 2) * 7.5 * s * k.larg;
      const w = (8 - Math.abs(i - 2) * 1.4) * s * k.larg;
      const h = (30 - Math.abs(i - 2) * 6 + Math.sin(t * 9 + i * 1.7) * 7 + Math.sin(t * 14.3 + i * 2.9) * 4) * s * k.alt;
      const incl = (.35 + Math.sin(t * 6 + i) * .15) * h;   // para trás (direita), já que ele anda para a esquerda
      ctx.beginPath();
      ctx.moveTo(bx - w, 0);
      ctx.quadraticCurveTo(bx - w * .9, -h * .55, bx + incl, -h);
      ctx.quadraticCurveTo(bx + w * .9, -h * .45, bx + w, 0);
      ctx.quadraticCurveTo(bx, w * .8, bx - w, 0);
      ctx.fill();
    }
  }
  ctx.restore();
}

function desenharCriaturaVetor(c) {
  const m = c.morte ? clamp01(c.morte / 1.1) : 0;
  const ap = clamp01(c.surgir);
  ctx.save();
  ctx.translate(c.x + c.empurrao * 10, c.y + m * 10);
  sombra(0, 2, 30 * (1 - m * .5));
  ctx.globalAlpha = ap * (1 - Math.max(0, (m - .45) / .55));
  ctx.lineWidth = 3; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.strokeStyle = C.ink;
  F = c.flash;

  let perna = 0, bob = 0, bracoF = .25, bracoT = .25, incl = 0, boca = .25;
  if (c.morte) {
    incl = easeInOut(Math.min(1, m * 1.8)) * 1.35; bracoF = 1.2; bracoT = .8; boca = 1;
  } else if (c.estado === "andar") {
    const s = Math.sin(c.fase);
    perna = s * .45; bob = -Math.abs(Math.cos(c.fase)) * 4;
    bracoF = .2 - s * .35; bracoT = .2 + s * .35; incl = -.06;
  } else {
    const u = 1 - c.atk / ATK;
    const a = u < .75 ? lerp(.3, 2.6, easeInOut(u / .75)) : lerp(2.6, .5, easeIn((u - .75) / .25));
    bracoF = a; bracoT = a * .75; boca = u > .55 ? 1 : .3;
    incl = u < .75 ? .1 * (u / .75) : -.16;
  }
  bob += Math.sin(tempo * 3 + c.fase) * 1;
  ctx.rotate(incl);

  // perna e braço de trás
  ctx.save(); ctx.translate(7, -22); ctx.rotate(-perna); parte(P.leg, C.mudDark); ctx.restore();
  ctx.save(); ctx.translate(12, -52 + bob); ctx.rotate(bracoT); parte(P.arm, C.mudDark); parte(P.claws, C.bone); ctx.restore();
  // corpo
  ctx.save(); ctx.translate(0, bob);
  parte(P.body, C.mud);
  parte(P.drip, C.mudDark, true);
  parte(P.moss, C.moss);
  // olhos brilhantes
  for (const [ex, ey, er] of [[-16, -58, 5], [-3, -61, 4.2]]) {
    ctx.fillStyle = "rgba(255,211,77,.3)"; ctx.beginPath(); ctx.arc(ex, ey, er * 2.2, 0, 7); ctx.fill();
    ctx.fillStyle = F > .3 ? "#fff" : C.eye; ctx.beginPath(); ctx.arc(ex, ey, er, 0, 7); ctx.fill();
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(ex - 1, ey, 1.2, er * .7, 0, 0, 7); ctx.fill();
  }
  // sobrancelha brava
  ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(-24, -69); ctx.lineTo(-7, -66); ctx.stroke();
  // boca
  const ab = 2 + boca * 7;
  ctx.fillStyle = "#3a2433"; ctx.beginPath(); ctx.ellipse(-13, -38, 10, ab, 0, 0, 7); ctx.fill();
  ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = C.bone;
  for (let i = 0; i < 3; i++) { const tx = -20 + i * 6.5; ctx.beginPath(); ctx.moveTo(tx, -38 - ab + 1); ctx.lineTo(tx + 3, -38 - ab + 6); ctx.lineTo(tx + 6, -38 - ab + 1); ctx.fill(); }
  ctx.restore();
  // perna e braço da frente
  ctx.lineWidth = 3;
  ctx.save(); ctx.translate(-9, -22); ctx.rotate(perna); parte(P.leg, C.mud); ctx.restore();
  ctx.save(); ctx.translate(-8, -50 + bob); ctx.rotate(bracoF); parte(P.arm, C.mud); parte(P.claws, C.bone); ctx.restore();

  ctx.restore();
  if (!c.morte && c.hp < c.max) barra(c.x, c.y - 112, 46, c.hp / c.max, "#ffb14e");
}

function desenharFlecha(s) {
  ctx.save(); ctx.translate(s.x, s.y);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 2;               // rastro leve
  ctx.beginPath(); ctx.moveTo(-58, 0); ctx.lineTo(-34, 0); ctx.stroke();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 4.5;                               // contorno da haste
  ctx.beginPath(); ctx.moveTo(-32, 0); ctx.lineTo(-2, 0); ctx.stroke();
  ctx.strokeStyle = "#6b1f24"; ctx.lineWidth = 2.2;                           // haste
  ctx.beginPath(); ctx.moveTo(-32, 0); ctx.lineTo(-2, 0); ctx.stroke();
  ctx.fillStyle = "#c9303a"; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;    // penas vermelhas
  for (const lado of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(-40, 6 * lado); ctx.lineTo(-26, 5 * lado); ctx.lineTo(-22, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = "#dfe5ec";                                                  // ponta de metal
  ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-4, -5); ctx.lineTo(-1, 0); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}
// Cores dos feitiços: "gelo" (Mago azul) e "fogo" (Mago de Fogo)
const PALETAS_MAGIA = {
  gelo: { rastro: "120,200,255", rastro0: "60,140,255", halo: ["160,220,255", "70,150,255", "40,90,255"],
          aneis: ["110,190,255", "190,240,255"], miolo: ["255,255,255", "200,240,255", "120,200,255"],
          faiscas: ["#ffffff", "#9fe6ff", "#5aa8ff"], rastroFaisca: ["#bff0ff", "#5aa8ff"],
          flash: ["235,250,255", "120,200,255", "50,110,255"], onda: ["150,215,255", "255,255,255"], chao: "110,190,255", cor: "#9fd8ff" },
  fogo: { rastro: "255,140,40", rastro0: "255,60,0", halo: ["255,220,120", "255,120,30", "220,40,0"],
          aneis: ["255,150,40", "255,230,150"], miolo: ["255,255,230", "255,230,120", "255,140,30"],
          faiscas: ["#fff3c4", "#ffb03a", "#ff5a1e"], rastroFaisca: ["#ffd27a", "#ff6a1e"],
          flash: ["255,248,220", "255,170,60", "220,60,0"], onda: ["255,170,60", "255,240,200"], chao: "255,120,30", cor: "#ffb36b" },
  sombra: { rastro: "140,130,255", rastro0: "70,40,200", halo: ["200,200,255", "110,90,255", "60,30,190"],
          aneis: ["150,120,255", "210,220,255"], miolo: ["255,255,255", "205,210,255", "120,110,255"],
          faiscas: ["#ffffff", "#c9c2ff", "#7a64ff"], rastroFaisca: ["#d6d0ff", "#7a64ff"],
          flash: ["240,238,255", "150,130,255", "80,40,220"], onda: ["170,150,255", "240,240,255"], chao: "140,110,255", cor: "#c9c2ff" }
};
// Esfera de energia: miolo claro, halo, anéis girando e rastro (cores pela paleta)
function desenharMagia(x, y, t, k = 1, estilo = "gelo") {
  const P = PALETAS_MAGIA[estilo] || PALETAS_MAGIA.gelo;
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const rastro = ctx.createLinearGradient(x - 70 * k, 0, x, 0);
  rastro.addColorStop(0, `rgba(${P.rastro0},0)`); rastro.addColorStop(1, `rgba(${P.rastro},.55)`);
  ctx.fillStyle = rastro; ctx.beginPath(); ctx.ellipse(x - 32 * k, y, 38 * k, 9 * k, 0, 0, 7); ctx.fill();
  if (estilo === "fogo") {                              // línguas de fogo tremulando para trás da bola
    for (let i = 0; i < 3; i++) {
      ctx.save(); ctx.translate(x - 4 * k, y + (i - 1) * 5 * k); ctx.rotate(-Math.PI / 2 + (i - 1) * .22);
      const h = (30 + i * 6 + Math.sin(t * 30 + i * 2) * 6) * k;
      ctx.fillStyle = i === 1 ? "rgba(255,200,80,.55)" : "rgba(255,90,20,.45)";
      linguaFogo(0, 0, 14 * k, h, Math.sin(t * 22 + i) * 4 * k);
      ctx.restore();
    }
  }
  const halo = ctx.createRadialGradient(x, y, 2, x, y, 30 * k);
  halo.addColorStop(0, `rgba(${P.halo[0]},.9)`); halo.addColorStop(.4, `rgba(${P.halo[1]},.45)`); halo.addColorStop(1, `rgba(${P.halo[2]},0)`);
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y, 30 * k, 0, 7); ctx.fill();
  ctx.lineWidth = 2 * k; ctx.lineCap = "round";
  for (let i = 0; i < 2; i++) {                       // dois anéis de energia girando em sentidos opostos
    ctx.strokeStyle = `rgba(${P.aneis[i]},${i ? .85 : .8})`;
    ctx.beginPath(); ctx.ellipse(x, y, 15 * k, 6 * k, (i ? -1 : 1) * t * 9, 0, Math.PI * 1.3); ctx.stroke();
  }
  const miolo = ctx.createRadialGradient(x, y, 0, x, y, 9 * k);
  miolo.addColorStop(0, `rgb(${P.miolo[0]})`); miolo.addColorStop(.6, `rgba(${P.miolo[1]},.95)`); miolo.addColorStop(1, `rgba(${P.miolo[2]},0)`);
  ctx.fillStyle = miolo; ctx.beginPath(); ctx.arc(x, y, 9 * k * (1 + Math.sin(t * 40) * .08), 0, 7); ctx.fill();
  ctx.restore();
}
function desenharExplosoes() {
  if (!explosoes.length) return;
  // fumaça escura subindo (explosão de fogo), desenhada antes e sem somar luz
  for (const e of explosoes) {
    if (e.tipo !== "impacto" || e.estilo !== "fogo") continue;
    const u = e.t / e.dur;
    if (u < .15) continue;
    const v = (u - .15) / .85;
    for (let k = 0; k < 5; k++) {
      const a = e.seed + k * 1.26, sx = e.x + Math.cos(a) * e.raio * .3 * v, sy = e.y - 10 - v * 45 - k * 4;
      const sr = e.raio * (.18 + v * .32);
      const gs = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
      gs.addColorStop(0, `rgba(45,32,30,${.32 * (1 - v)})`); gs.addColorStop(1, "rgba(45,32,30,0)");
      ctx.fillStyle = gs; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, 7); ctx.fill();
    }
  }
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  for (const e of explosoes) {
    const P = PALETAS_MAGIA[e.estilo] || PALETAS_MAGIA.gelo;
    const u = e.t / e.dur, f = 1 - u;
    if (e.tipo === "raio") {                            // raio saltando do Esqueleto Mago para um invocado
      const n = 9, pts = [];
      for (let k = 0; k <= n; k++) {
        const t = k / n, desvio = k === 0 || k === n ? 0 : Math.sin(e.seed + k * 2.3 + e.t * 40) * 14;
        const dx = e.x2 - e.x, dy = e.y2 - e.y, len = Math.hypot(dx, dy) || 1;
        pts.push([e.x + dx * t - dy / len * desvio, e.y + dy * t + dx / len * desvio]);
      }
      ctx.lineJoin = "round"; ctx.lineCap = "round";
      for (const [lw, cor] of [[9, `rgba(${P.halo[1]},${.35 * f})`], [4, `rgba(${P.aneis[1]},${.9 * f})`], [1.8, `rgba(255,255,255,${f})`]]) {
        ctx.strokeStyle = cor; ctx.lineWidth = lw; ctx.beginPath();
        pts.forEach(([px, py], k) => k ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.stroke();
      }
      continue;
    }
    if (e.tipo === "saida") {                           // clarão na mão do mago ao soltar a esfera
      const g = ctx.createRadialGradient(e.x, e.y, 2, e.x, e.y, 40);
      g.addColorStop(0, `rgba(${P.flash[0]},${f})`); g.addColorStop(1, `rgba(${P.flash[2]},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e.x, e.y, 40, 0, 7); ctx.fill();
      continue;
    }
    const R = e.raio;
    const g = ctx.createRadialGradient(e.x, e.y, 2, e.x, e.y, R * (.6 + u * .5));
    g.addColorStop(0, `rgba(${P.flash[0]},${.95 * f})`); g.addColorStop(.35, `rgba(${P.flash[1]},${.6 * f})`); g.addColorStop(1, `rgba(${P.flash[2]},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e.x, e.y, R * (.6 + u * .5), 0, 7); ctx.fill();
    const fogo = e.estilo === "fogo";
    ctx.lineWidth = fogo ? 1.5 + 3 * f : 2 + 5 * f;
    ctx.strokeStyle = `rgba(${P.onda[0]},${(fogo ? .45 : .9) * f})`;
    ctx.beginPath(); ctx.arc(e.x, e.y, R * (.25 + u * .95), 0, 7); ctx.stroke();
    if (!fogo) {
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = `rgba(${P.onda[1]},${.7 * f})`;
      ctx.beginPath(); ctx.arc(e.x, e.y, R * (.15 + u * .7), 0, 7); ctx.stroke();
    }
    ctx.save(); ctx.translate(e.x, e.chaoY - 4); ctx.scale(1, .3);
    ctx.strokeStyle = `rgba(${P.chao},${(fogo ? .45 : .8) * f})`; ctx.lineWidth = (fogo ? 4 : 6) * f + 1;
    ctx.beginPath(); ctx.arc(0, 0, R * (.3 + u * 1.1), 0, 7); ctx.stroke(); ctx.restore();
    if (e.estilo === "fogo") {                          // nuvem de fogo: bolas macias que crescem, sobem e esfriam
      for (let k = 0; k < 8; k++) {
        const a = e.seed + k * .785, d = R * (.12 + u * .42) * (.7 + (k % 3) * .18);
        const bx = e.x + Math.cos(a) * d, by = e.y + Math.sin(a) * d * .65 - u * 22;
        const br = R * (.2 + u * .26) * (.85 + (k % 2) * .3);
        const quente = Math.max(0, 1 - u * 1.6);          // começa amarelo e vai ficando vermelho
        const gb = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        gb.addColorStop(0, `rgba(255,${Math.round(170 + 70 * quente)},${Math.round(80 + 90 * quente)},${.5 * f})`);
        gb.addColorStop(.5, `rgba(255,${Math.round(90 + 50 * quente)},30,${.35 * f})`);
        gb.addColorStop(1, "rgba(190,30,0,0)");
        ctx.fillStyle = gb; ctx.beginPath(); ctx.arc(bx, by, br, 0, 7); ctx.fill();
      }
    } else if (u < .45) {                               // raios curtos saindo do centro
      ctx.strokeStyle = `rgba(${P.flash[0]},${1 - u / .45})`; ctx.lineWidth = 2;
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4 + e.x * .01, r1 = R * .2, r2 = R * (.45 + u);
        ctx.beginPath(); ctx.moveTo(e.x + Math.cos(a) * r1, e.y + Math.sin(a) * r1);
        ctx.lineTo(e.x + Math.cos(a) * r2, e.y + Math.sin(a) * r2); ctx.stroke();
      }
    }
  }
  ctx.restore();
}
function desenharTiro(s) {
  if (s.tipo === "flecha") return desenharFlecha(s);
  if (s.tipo === "magia") return desenharMagia(s.x, s.y, s.vida, 1, s.estilo);
  if (s.tipo === "flechaInimiga") { ctx.save(); ctx.translate(s.x, s.y); ctx.scale(-1, 1); desenharFlecha({ x: 0, y: 0 }); ctx.restore(); return; }
  if (s.tipo === "magiaInimiga") { ctx.save(); ctx.translate(s.x, s.y); ctx.scale(-1, 1); desenharMagia(0, 0, s.vida, 1, s.estilo); ctx.restore(); return; }
  ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(Math.sin(s.vida * 30) * .05);
  ctx.lineWidth = 2; ctx.strokeStyle = C.ink; ctx.lineJoin = "round";
  ctx.fillStyle = C.spike; ctx.fill(P.thorn); ctx.stroke(P.thorn);
  ctx.restore();
}

// O cristal saiu: agora o castelo é a base. Aqui só aparece o clarão vermelho no portão quando ele leva dano.
function desenharNucleo() {
  if (nucleoDorInimigo > 0) {                           // brilho no castelo do outro lado
    const x = MW - NUCLEO.x, y = NUCLEO.y, a = nucleoDorInimigo;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const gi = ctx.createRadialGradient(x, y, 6, x, y, 130);
    gi.addColorStop(0, `rgba(255,210,80,${.5 * a})`); gi.addColorStop(1, "rgba(255,210,80,0)");
    ctx.fillStyle = gi; ctx.beginPath(); ctx.arc(x, y, 130, 0, 7); ctx.fill(); ctx.restore();
  }
  if (nucleoDor <= 0) return;
  const x = NUCLEO.x, y = NUCLEO.y, a = nucleoDor;
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const gr = ctx.createRadialGradient(x, y, 6, x, y, 130);
  gr.addColorStop(0, `rgba(255,90,70,${.55 * a})`); gr.addColorStop(1, "rgba(255,90,70,0)");
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 130, 0, 7); ctx.fill();
  ctx.restore();
}

function desenharDestaques() {
  if (buffer && buffer !== "Z") {
    const r = LINHAS.indexOf(buffer);
    const a = .16 + Math.sin(tempo * 8) * .06;
    ctx.fillStyle = `rgba(255,244,214,${a})`;
    ctx.fillRect(G.left, G.top + r * G.ch, G.right - G.left, G.ch);
    ctx.strokeStyle = "#fff4d6"; ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
    ctx.strokeRect(G.left + 2, G.top + r * G.ch + 2, G.right - G.left - 4, G.ch - 4); ctx.setLineDash([]);
  } else if (buffer === "Z") {
    ctx.fillStyle = `rgba(184,138,230,${.22 + Math.sin(tempo * 8) * .08})`;
    ctx.fillRect(G.right, G.top, W - G.right, G.bottom - G.top);
  }
  for (const e of efeitosCelula) {
    const x = G.left + e.c * G.cw, y = G.top + e.r * G.ch, k = 1 - e.t / .6;
    if (e.bom) {
      ctx.strokeStyle = `rgba(242,193,78,${k})`; ctx.lineWidth = 4;
      const g = (1 - k) * 12; ctx.strokeRect(x + 4 - g, y + 4 - g, G.cw - 8 + g * 2, G.ch - 8 + g * 2);
    } else {
      ctx.fillStyle = `rgba(255,90,80,${k * .45})`; ctx.fillRect(x, y, G.cw, G.ch);
    }
  }
}

/* ---------- Barra de cards ---------- */
// Dois painéis: guerreiros (esquerda, com energia e pá) e monstros (direita).
// Cards de monstro, na ordem da barra (null = espaço livre para um monstro novo)
const MONSTROS_CARTAS = ["esqueleto", "esqueletoFogo", "esqueletoArqueiro", "esqueletoProtetor", "esqueletoMago", "esqueletoTita"];
// As posições são calculadas pela quantidade de cards: se entrar um guerreiro novo, a barra se ajusta sozinha
const CARTA = { w: 74, h: 110, y: 17, passo: 79 };
const CARDS_EM_CIMA = false;   // false = os cards dos guerreiros ficam só embaixo (mão de cartas); true = volta a barra de cima
let MONSTROS_EM_CIMA = false;   // (no modo Monsters liga sozinho) false = sem cards de monstros em cima (Shift + 1 a 6 continua escolhendo o monstro); true = mostra
const HUD = (() => {
  const nG = Object.keys(GUERREIROS).length, nM = MONSTROS_CARTAS.length;
  const larguraEsq = 10 + 80 + 8 + nG * CARTA.passo + 64 + 10;        // energia + cards + pá
  const larguraDir = 12 + nM * CARTA.passo - 5 + 12;
  const x0 = Math.round((W - (larguraEsq + 12 + larguraDir)) / 2);    // centraliza as duas partes
  const h = {
    esq: { x: x0, y: 8, w: larguraEsq, h: 128 },
    energia: { x: x0 + 10, y: 17, w: 80, h: 110 },
    guerreirosX: x0 + 98
  };
  h.pa = { x: h.guerreirosX + nG * CARTA.passo, y: 17, w: 64, h: 110 };
  h.dir = { x: x0 + larguraEsq + 12, y: 8, w: larguraDir, h: 128 };
  h.monstrosX = h.dir.x + 12;
  return h;
})();
POS_ENERGIA.x = HUD.energia.x + HUD.energia.w / 2;               // ícone e destino das energias no centro do quadro
POS_ENERGIA.y = HUD.energia.y + 40;
const HUD_ENERGIA = { x: POS_ENERGIA.x, y: POS_ENERGIA.y };      // posição do ícone dentro da barra (POS_ENERGIA muda quando a barra some)

/* Barra recolhível: clique na aba (ou tecla H) para esconder ou mostrar os cards */
const BARRA = { recolhida: false, t: 0, ultimo: performance.now() };
const ABA = { cx: CARDS_EM_CIMA ? Math.round((HUD.esq.x + HUD.esq.w + HUD.dir.x) / 2) : Math.round(HUD.dir.x + HUD.dir.w / 2), h: 22 };
const suave = u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;   // começa e termina devagar
function deslocBarra() { return -(HUD.esq.y + HUD.esq.h + 6) * suave(BARRA.t); }
function retAba() {
  const k = suave(BARRA.t), w = 54 + k * 96;                      // aberta: só a seta; fechada: seta + energia
  return { x: ABA.cx - w / 2, y: HUD.esq.y + HUD.esq.h - 3 + deslocBarra(), w, h: ABA.h };
}
function alternarBarra() { BARRA.recolhida = !BARRA.recolhida; }
function atualizarBarra() {
  const agora = performance.now(), dt = Math.min(.05, (agora - BARRA.ultimo) / 1000);
  BARRA.ultimo = agora;
  const alvo = BARRA.recolhida ? 1 : 0;
  BARRA.t += Math.sign(alvo - BARRA.t) * Math.min(Math.abs(alvo - BARRA.t), dt / .38);   // 0,38 s para abrir ou fechar
  // as energias coletadas voam para o ícone da barra, ou para a aba quando a barra está escondida
  const a = retAba(), k = suave(BARRA.t);
  if (!CARDS_EM_CIMA) { const b = retBotaoMao(); POS_ENERGIA.x = b.x + b.w / 2; POS_ENERGIA.y = b.y + 34; return; }   // energias voam para o botão de baixo
  POS_ENERGIA.x = lerp(HUD_ENERGIA.x, a.x + 40, k);
  POS_ENERGIA.y = lerp(HUD_ENERGIA.y + deslocBarra(), a.y + a.h / 2 + 1, k);
}
const retratos = {};
for (const id in GUERREIROS) retratos[id] = {
  tipo: id, x: 0, y: 0, hp: 1, max: 1, idade: 0, nasc: 1, recuo: 0, flash: 0,
  piscar: 3, piscT: 0, morte: 0, semente: Math.random() * 9, gerT: 99, brilho: 0, atacando: false, tA: 0
};
const retCarta = i => ({ x: HUD.guerreirosX + i * CARTA.passo, y: CARTA.y, w: CARTA.w, h: CARTA.h });
const retMonstro = i => ({ x: HUD.monstrosX + i * CARTA.passo, y: CARTA.y, w: CARTA.w, h: CARTA.h });
const dentroRet = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y - 6 && y <= r.y + r.h;
// O que está embaixo do mouse na barra de cima
function alvoHUD(x, y) {
  if (!CARDS_EM_CIMA && !MONSTROS_EM_CIMA) return null;        // não há nada em cima para clicar
  const a = retAba();
  if (x >= a.x && x <= a.x + a.w && y >= a.y - 4 && y <= a.y + a.h + 4) return { tipo: "aba" };
  if (BARRA.t > .02) return null;                       // barra escondida (ou se mexendo): cards não recebem clique
  if (CARDS_EM_CIMA) for (let i = 0; i < cartas.length; i++) if (dentroRet(retCarta(i), x, y)) return { tipo: "guerreiro", i };
  for (let i = 0; i < MONSTROS_CARTAS.length; i++) if (dentroRet(retMonstro(i), x, y)) return { tipo: "monstro", i };
  if (CARDS_EM_CIMA && dentroRet(HUD.pa, x, y)) return { tipo: "pa" };
  return null;
}
function ajustarTexto(txt, larg, tam, peso = 800) {
  let t = tam;
  do { ctx.font = `${peso} ${t}px Grandstander, 'Trebuchet MS', sans-serif`; } while (ctx.measureText(txt).width > larg && --t > 8);
}
function desenharIconeEnergia(x, y, tam) {
  if (modoM) return desenharEnergiaMonstro(x, y, tam);     // MODO_MONSTERS: energia sombria
  if (iconeOk) { ctx.drawImage(ICONE_ENERGIA, x - tam / 2, y - tam / 2, tam, tam); return; }
  ctx.save(); ctx.translate(x, y); ctx.scale(tam / 40, tam / 40);
  ctx.fillStyle = "#c0392b"; ctx.beginPath(); ctx.arc(0, 0, 19, 0, 7); ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = "#f2c14e"; ctx.stroke();
  ctx.fillStyle = "#ffd34d"; ctx.beginPath();
  ctx.moveTo(4, -15); ctx.lineTo(-9, 3); ctx.lineTo(-1, 3); ctx.lineTo(-5, 15); ctx.lineTo(9, -4); ctx.lineTo(1, -4); ctx.closePath(); ctx.fill();
  ctx.restore();
}
// Energia dos monstros: bola preta com raio amarelo e um brilho amarelo em volta
function desenharEnergiaMonstro(x, y, tam) {
  ctx.save(); ctx.translate(x, y); ctx.scale(tam / 40, tam / 40);
  const halo = ctx.createRadialGradient(0, 0, 14, 0, 0, 24);
  halo.addColorStop(0, "rgba(255,210,60,.45)"); halo.addColorStop(1, "rgba(255,210,60,0)");
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, 24, 0, 7); ctx.fill();
  const bola = ctx.createRadialGradient(-6, -7, 2, 0, 0, 20);
  bola.addColorStop(0, "#4a4a58"); bola.addColorStop(.55, "#17171f"); bola.addColorStop(1, "#050507");
  ctx.fillStyle = bola; ctx.beginPath(); ctx.arc(0, 0, 19, 0, 7); ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = "#f2c14e"; ctx.stroke();
  ctx.fillStyle = "#ffd34d"; ctx.shadowColor = "#ffcc33"; ctx.shadowBlur = 6; ctx.beginPath();
  ctx.moveTo(4, -15); ctx.lineTo(-9, 3); ctx.lineTo(-1, 3); ctx.lineTo(-5, 15); ctx.lineTo(9, -4); ctx.lineTo(1, -4); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function desenharCoracao(x, y, tam, cor) {
  ctx.save(); ctx.translate(x, y); ctx.scale(tam / 20, tam / 20);
  ctx.beginPath(); ctx.moveTo(0, 7);
  ctx.bezierCurveTo(-11, -1, -8, -10, 0, -5); ctx.bezierCurveTo(8, -10, 11, -1, 0, 7); ctx.closePath();
  ctx.fillStyle = cor; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = "#1a1222"; ctx.stroke();
  ctx.restore();
}
// Pá desenhada por código: cabo de madeira e lâmina de metal
function desenharPa(x, y, tam, rot = -.6) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(tam / 60, tam / 60);
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.strokeStyle = "#1a1222"; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(0, 6); ctx.stroke();
  ctx.strokeStyle = "#a8743f"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(0, 6); ctx.stroke();
  ctx.strokeStyle = "rgba(255,230,190,.5)"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-1.5, -28); ctx.lineTo(-1.5, 2); ctx.stroke();
  // pegador em T
  ctx.fillStyle = "#a8743f"; ctx.strokeStyle = "#1a1222"; ctx.lineWidth = 3;
  rr(-11, -37, 22, 8, 4); ctx.fill(); ctx.stroke();
  // lâmina
  const lg = ctx.createLinearGradient(-14, 0, 14, 0);
  lg.addColorStop(0, "#8c97a6"); lg.addColorStop(.45, "#eef2f6"); lg.addColorStop(1, "#7d8898");
  ctx.beginPath(); ctx.moveTo(-13, 4); ctx.lineTo(13, 4); ctx.lineTo(12, 22);
  ctx.quadraticCurveTo(0, 36, -12, 22); ctx.closePath();
  ctx.fillStyle = lg; ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
  ctx.strokeStyle = "rgba(26,18,34,.35)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, 24); ctx.stroke();
  ctx.restore();
}
function desenharPainel(p, c1, c2, borda, filete) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.4)"; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
  const g = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  rr(p.x, p.y, p.w, p.h, 18); ctx.fillStyle = g; ctx.fill();
  ctx.restore();
  rr(p.x, p.y, p.w, p.h, 18); ctx.lineWidth = 3; ctx.strokeStyle = borda; ctx.stroke();
  rr(p.x + 5, p.y + 5, p.w - 10, p.h - 10, 14); ctx.lineWidth = 1.5; ctx.strokeStyle = filete; ctx.stroke();
}
// Etiqueta pendurada embaixo do painel ("GUERREIROS" / "MONSTROS")
function desenharEtiqueta(txt, cx, y, cor, corTxt) {
  ctx.font = "800 11px Grandstander, 'Trebuchet MS', sans-serif";
  const w = ctx.measureText(txt).width + 26;
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
  rr(cx - w / 2, y, w, 17, 8.5); ctx.fillStyle = cor; ctx.fill(); ctx.restore();
  rr(cx - w / 2, y, w, 17, 8.5); ctx.lineWidth = 2; ctx.strokeStyle = "#1a1222"; ctx.stroke();
  ctx.fillStyle = corTxt; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(txt, cx, y + 9);
}
function desenharHUD() {
  atualizarBarra();
  if (!CARDS_EM_CIMA && !MONSTROS_EM_CIMA) return;             // barra de cima desligada por completo
  const off = deslocBarra();
  if (BARRA.t < 1) {                                   // a barra desliza para cima quando é escondida
    ctx.save(); ctx.translate(0, off);
    desenharBarraCards();
    ctx.restore();
  }
  desenharAba();
}
function desenharBarraCards() {
  desenharPainel(HUD.dir, "#4a2530", "#22121a", "#1a1222", "rgba(214,84,84,.7)");
  const hovM = mouse.dentro ? alvoHUD(mouse.x, mouse.y) : null;
  if (!CARDS_EM_CIMA) {                                          // só os monstros em cima; guerreiros ficam na mão de cartas embaixo
    MONSTROS_CARTAS.forEach((id, i) => desenharCartaMonstro(id, i, hovM && hovM.tipo === "monstro" && hovM.i === i));
    return;
  }
  desenharPainel(HUD.esq, "#4d3764", "#271c33", "#1a1222", "rgba(233,183,82,.75)");

  // energia
  const e = HUD.energia;
  rr(e.x, e.y, e.w, e.h, 12); ctx.fillStyle = "#1d1527"; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = "rgba(233,183,82,.55)"; ctx.stroke();
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const eg = ctx.createRadialGradient(HUD_ENERGIA.x, HUD_ENERGIA.y, 2, HUD_ENERGIA.x, HUD_ENERGIA.y, 44);
  eg.addColorStop(0, `rgba(255,150,40,${.35 + energiaPulso * .4})`); eg.addColorStop(1, "rgba(255,120,30,0)");
  ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(HUD_ENERGIA.x, HUD_ENERGIA.y, 44, 0, 7); ctx.fill();
  ctx.restore();
  desenharIconeEnergia(HUD_ENERGIA.x, HUD_ENERGIA.y, 56 * (1 + energiaPulso * .12));
  const falha = energiaFalha > 0 && Math.sin(energiaFalha * 30) > 0;
  rr(e.x + 8, e.y + 80, e.w - 16, 24, 12); ctx.fillStyle = falha ? "#ff6b5e" : "#fff3d6"; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = "#1a1222"; ctx.stroke();
  ctx.font = "800 19px Grandstander, 'Trebuchet MS', sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#2b2030"; ctx.fillText(MODO_TESTE.energiaInfinita ? "∞" : String(energiaVista()), e.x + e.w / 2, e.y + 93);

  const hov = mouse.dentro ? alvoHUD(mouse.x, mouse.y) : null;
  cartas.forEach((carta, i) => desenharCarta(carta, i, hov && hov.tipo === "guerreiro" && hov.i === i));
  desenharSlotPa(hov && hov.tipo === "pa");
  MONSTROS_CARTAS.forEach((id, i) => desenharCartaMonstro(id, i, hov && hov.tipo === "monstro" && hov.i === i));

  // Etiquetas "GUERREIROS" e "MONSTROS" embaixo dos painéis: desligadas. Para voltar, tire as // das duas linhas abaixo.
  // desenharEtiqueta("GUERREIROS", HUD.esq.x + HUD.esq.w / 2, HUD.esq.y + HUD.esq.h - 6, "#e9b752", "#2b2030");
  // desenharEtiqueta("MONSTROS", HUD.dir.x + HUD.dir.w / 2, HUD.dir.y + HUD.dir.h - 6, "#c9434b", "#fff4d6");
}
// Aba pendurada embaixo da barra: seta para esconder; com a barra escondida mostra seta + energia
function desenharAba() {
  const a = retAba(), k = suave(BARRA.t);
  const sobre = mouse.dentro && mouse.x >= a.x && mouse.x <= a.x + a.w && mouse.y >= a.y - 4 && mouse.y <= a.y + a.h + 4;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
  ctx.beginPath();                                     // cantos de baixo arredondados, topo reto (pendurada)
  ctx.moveTo(a.x, a.y); ctx.lineTo(a.x + a.w, a.y);
  ctx.lineTo(a.x + a.w, a.y + a.h - 10); ctx.quadraticCurveTo(a.x + a.w, a.y + a.h, a.x + a.w - 10, a.y + a.h);
  ctx.lineTo(a.x + 10, a.y + a.h); ctx.quadraticCurveTo(a.x, a.y + a.h, a.x, a.y + a.h - 10); ctx.closePath();
  const g = ctx.createLinearGradient(0, a.y, 0, a.y + a.h);
  g.addColorStop(0, sobre ? "#5d4478" : "#46325c"); g.addColorStop(1, "#271c33");
  ctx.fillStyle = g; ctx.fill();
  ctx.restore();
  ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(233,183,82,.8)"; ctx.stroke();
  // seta: aponta para cima (esconder) e gira para baixo (mostrar)
  const sx = k > .5 ? a.x + a.w - 22 : a.x + a.w / 2, sy = a.y + a.h / 2 + 1;
  ctx.save(); ctx.translate(sx, sy); ctx.rotate(Math.PI * k);
  ctx.strokeStyle = sobre ? "#ffe6a6" : "#e9b752"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(-6, 3); ctx.lineTo(0, -3); ctx.lineTo(6, 3); ctx.stroke();
  ctx.restore();
  if (k > .5) {                                        // barra escondida: energia continua à vista
    ctx.globalAlpha = Math.min(1, (k - .5) * 3);
    desenharIconeEnergia(a.x + 40, sy, 18 * (1 + energiaPulso * .15));
    ctx.fillStyle = "#fff4d6"; ctx.font = "800 15px Grandstander, 'Trebuchet MS', sans-serif";
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(MODO_TESTE.energiaInfinita ? "∞" : String(energiaVista()), a.x + 54, sy + 1);
    ctx.globalAlpha = 1;
  }
}
// Moldura comum a todos os cards
function molduraCarta(x, y, w, h, tema, escolhida, sobre) {
  ctx.save();
  if (escolhida) { ctx.shadowColor = tema.brilho; ctx.shadowBlur = 18; }
  else { ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = sobre ? 10 : 6; ctx.shadowOffsetY = 3; }
  rr(x, y, w, h, 11); ctx.fillStyle = "#1a1222"; ctx.fill();
  ctx.restore();
  const cg = ctx.createLinearGradient(0, y, 0, y + h);
  cg.addColorStop(0, tema.fundo[0]); cg.addColorStop(1, tema.fundo[1]);
  rr(x + 2.5, y + 2.5, w - 5, h - 5, 9); ctx.fillStyle = cg; ctx.fill();
  rr(x + 2.5, y + 2.5, w - 5, h - 5, 9); ctx.lineWidth = 1.5; ctx.strokeStyle = tema.filete; ctx.stroke();
  if (escolhida) { rr(x - 1, y - 1, w + 2, h + 2, 12); ctx.lineWidth = 3; ctx.strokeStyle = tema.destaque; ctx.stroke(); }
}
function janelaRetrato(x, y, w, cores) {
  rr(x + 7, y + 7, w - 14, 64, 7);
  const jg = ctx.createLinearGradient(0, y + 7, 0, y + 71);
  jg.addColorStop(0, cores[0]); jg.addColorStop(1, cores[1]);
  ctx.fillStyle = jg; ctx.fill();
}
function bordaRetrato(x, y, w) {
  ctx.save(); rr(x + 7, y + 7, w - 14, 64, 7); ctx.clip();
  const sh = ctx.createLinearGradient(0, y + 7, 0, y + 22);           // sombra interna no topo
  sh.addColorStop(0, "rgba(0,0,0,.28)"); sh.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sh; ctx.fillRect(x, y, w, 20);
  ctx.restore();
  rr(x + 7, y + 7, w - 14, 64, 7); ctx.lineWidth = 2; ctx.strokeStyle = "rgba(26,18,34,.7)"; ctx.stroke();
}
function plaquinha(x, y, w, txt, fundo, cor) {
  rr(x + 5, y + 74, w - 10, 17, 5); ctx.fillStyle = fundo; ctx.fill();
  ajustarTexto(txt, w - 18, 12);
  ctx.fillStyle = cor; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(txt, x + w / 2, y + 83);
}
function seloTecla(x, y, txt, cor) {
  const largo = txt.length > 1;
  ctx.fillStyle = "#1a1222";
  if (largo) rr(x - 11, y - 8, 28, 22, 11); else { ctx.beginPath(); ctx.arc(x + 3, y + 3, 11, 0, 7); }
  ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = cor; ctx.stroke();
  ctx.fillStyle = "#fff4d6"; ctx.font = `800 ${largo ? 11 : 12}px Grandstander, 'Trebuchet MS', sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(txt, x + 3, y + 4);
}
const TEMA_GUERREIRO = { fundo: ["#fff8e6", "#e6c893"], filete: "rgba(160,110,40,.55)", destaque: "#f2c14e", brilho: "rgba(255,200,80,.95)" };
const TEMA_MONSTRO = { fundo: ["#5a2f3b", "#2a161f"], filete: "rgba(214,84,84,.6)", destaque: "#ff6b5e", brilho: "rgba(255,90,80,.9)" };

// nível do guerreiro no card + botão ⬆ para evoluir com energia
let dicaEvoluir = null;
function desenharDicaEvoluir() {                                  // desenhada por cima de todos os cards
  if (!dicaEvoluir) return;
  const d = dicaEvoluir; dicaEvoluir = null;
  ctx.save(); ctx.font = "800 11px Grandstander, 'Trebuchet MS', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const tw = ctx.measureText(d.txt).width + 16;
  ctx.fillStyle = "rgba(20,14,26,.96)"; rr(d.x - tw / 2, d.y, tw, 22, 8); ctx.fill();
  ctx.strokeStyle = "rgba(255,217,122,.6)"; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = d.pode ? "#ffe7a6" : "#ff9a8f"; ctx.fillText(d.txt, d.x, d.y + 11.5);
  ctx.restore();
}
function retEvoluir(i) { const r = retCarta(i); return { x: r.x + r.w - 23, y: r.y + 3, w: 20, h: 20 }; }
function desenharNivelCarta(carta, i, x, y, w) {
  const lv = nivelG[carta.id] || 1, g = GUERREIROS[carta.id];
  ctx.save();
  ctx.font = "900 10px Grandstander, 'Trebuchet MS', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(14,10,20,.85)"; rr(x + 5, y + 50, 30, 13, 6.5); ctx.fill();
  ctx.fillStyle = corDoNivel(lv); ctx.fillText("Nv " + lv, x + 20, y + 57);
  ctx.restore();
}
/* MÃO DE CARTAS: botão de energia embaixo à esquerda; clicando, as cartas GRANDES dos guerreiros saem da esquerda
   para a direita, em leque, na parte de baixo da tela. Clique numa carta para escolher e depois na casa do gramado.
   Clique no botão de novo (ou na tecla Q) para guardar as cartas. */
const MAO = { escala: 1.65, espaco: 10, xInicio: 128, margemBaixo: 10, leque: .05, atraso: .045, dur: .42 };
const mao = { aberta: false, t: 0, sobre: -1 };
function retBotaoMao() { return { x: 14, y: H - 108, w: 104, h: 96 }; }
function retBotaoPa() { return { x: 30, y: H - 108 - 82, w: 72, h: 74 }; }   // pá (tirar guerreiro), em cima do botão de energia
function retCartaMao(i) {
  const w = CARTA.w * MAO.escala, h = CARTA.h * MAO.escala;
  return { x: MAO.xInicio + i * (w + MAO.espaco), y: H - MAO.margemBaixo - h, w, h };
}
function nCartasMao() { return modoM ? MONSTROS_CARTAS.length : cartas.length; }   // Monsters: cards dos esqueletos
function alternarMao() { mao.aberta = !mao.aberta; }
function progressoCartaMao(i) {                                 // 0 = guardada no botão, 1 = no lugar
  const n = nCartasMao(), atraso = MAO.atraso * (mao.aberta ? i : (n - 1 - i));
  return clamp01((mao.t - atraso) / MAO.dur);
}
function atualizarMao(dt) {
  const n = nCartasMao(), total = MAO.dur + MAO.atraso * (n - 1);
  mao.t = mao.aberta ? Math.min(total, mao.t + dt) : Math.max(0, mao.t - dt * 1.4);
}
function alvoMao(x, y) {                                          // o que está embaixo do mouse: botão ou uma carta
  const b = retBotaoMao();
  if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return { tipo: "botao" };

  if (mao.t <= 0) return null;
  for (let i = nCartasMao() - 1; i >= 0; i--) {
    if (progressoCartaMao(i) < .95) continue;
    const r = retCartaMao(i);
    if (x >= r.x && x <= r.x + r.w && y >= r.y - 20 && y <= r.y + r.h) return { tipo: "carta", i };
  }
  return null;
}
function desenharMao() {
  const b = retBotaoMao(), hov = mouse.dentro ? alvoMao(mouse.x, mouse.y) : null;
  mao.sobre = hov && hov.tipo === "carta" ? hov.i : -1;
  // cartas (da última para a primeira, para a da esquerda ficar por cima no começo da animação)
  const nM = nCartasMao();
  for (let i = nM - 1; i >= 0; i--) {
    const u = progressoCartaMao(i);
    if (u <= 0) continue;
    const e = easeOutBack(u), r = retCartaMao(i), rC = retCarta(i);
    const x0 = b.x + b.w / 2 - r.w / 2, y0 = b.y + 10;          // sai de dentro do botão
    const sel = modoM ? i === monstroSel && modoSel === "monstro" : i === cartaSel && modoSel === "guerreiro";
    const sobe = i === mao.sobre ? 18 : (sel && !paAtiva ? 10 : 0);
    const cx = x0 + (r.x - x0) * e, cy = y0 + (r.y - y0) * e - sobe;
    const ang = (i - (nM - 1) / 2) * MAO.leque * e, esc = MAO.escala * (.4 + .6 * e) * (i === mao.sobre ? 1.05 : 1);
    ctx.save();
    ctx.globalAlpha = Math.min(1, u * 2);
    ctx.translate(cx + r.w / 2, cy + r.h);                        // gira a partir da base da carta (leque)
    ctx.rotate(ang);
    ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8;
    ctx.fillStyle = "rgba(0,0,0,.001)"; ctx.fillRect(-r.w / 2 + 4, -r.h + 4, r.w - 8, r.h - 8);
    ctx.shadowColor = "transparent";
    ctx.scale(esc, esc);
    ctx.translate(-rC.w / 2 - rC.x, -rC.h - rC.y);                // o card normal, desenhado grande
    if (modoM) desenharCartaMonstroMao(MONSTROS_CARTAS[i], i, i === mao.sobre);
    else desenharCarta(cartas[i], i, i === mao.sobre);
    ctx.restore();
  }
  // botão de energia (abre/fecha as cartas)
  const aberto = mao.aberta, sobreB = hov && hov.tipo === "botao", pul = .5 + .5 * Math.sin(tempo * 3);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
  const gb = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
  gb.addColorStop(0, "#3a2a44"); gb.addColorStop(1, "#1d1424");
  ctx.fillStyle = gb; rr(b.x, b.y, b.w, b.h, 18); ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.lineWidth = 2.5; ctx.strokeStyle = aberto || sobreB ? "#ffd97a" : "#c99a3c"; ctx.stroke();
  if (!aberto) { ctx.strokeStyle = `rgba(255,217,122,${.25 + .35 * pul})`; ctx.lineWidth = 5; rr(b.x - 3, b.y - 3, b.w + 6, b.h + 6, 20); ctx.stroke(); }
  desenharIconeEnergia(b.x + b.w / 2, b.y + 34, sobreB ? 50 : 46);
  ctx.fillStyle = "#fff4d6"; ctx.font = "900 17px Grandstander, 'Trebuchet MS', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(MODO_TESTE.energiaInfinita ? "∞" : String(energiaVista()), b.x + b.w / 2, b.y + 68);
  ctx.font = "800 10px Grandstander, 'Trebuchet MS', sans-serif"; ctx.fillStyle = "#ffd97a";
  ctx.fillText(aberto ? "▼ guardar" : "▲ cartas", b.x + b.w / 2, b.y + 85);
  ctx.restore();
}
function desenharCarta(carta, i, sobre) {
  const g = GUERREIROS[carta.id];
  const r = retCarta(i);
  const escolhida = i === cartaSel && !paAtiva && modoSel === "guerreiro";
  const dx = carta.tremer > 0 ? Math.sin(carta.tremer * 60) * 4 * carta.tremer / .4 : 0;
  const x = r.x + dx, y = r.y - (escolhida ? 4 : sobre ? 2 : 0), w = r.w, h = r.h;
  const pronta = carta.bloqueio <= 0 && carta.estoque !== 0 && carta.recarga <= 0;
  const podePagar = MODO_TESTE.energiaInfinita || energia >= g.custo;

  molduraCarta(x, y, w, h, TEMA_GUERREIRO, escolhida, sobre);
  // retrato animado: cada guerreiro mostra o que faz em combate
  ctx.save();
  janelaRetrato(x, y, w, g.cores);
  ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,.28)"; ctx.beginPath(); ctx.ellipse(x + w / 2, y + 68, 32, 8, 0, 0, 7); ctx.fill();
  if (g.visual === "sprite") desenharRetratoGuerreiroSprite(g, x, y, w, i);
  else desenharRetratoGuerreiroVetor(carta, g, x, y, w, i);
  F = 0;
  ctx.restore();
  bordaRetrato(x, y, w);
  plaquinha(x, y, w, g.nomeCurto || g.nome, "#2b2030", "#fff4d6");
  desenharNivelCarta(carta, i, x, y, w);

  // custo
  ctx.font = "800 17px Grandstander, 'Trebuchet MS', sans-serif";
  const tw = ctx.measureText(String(g.custo)).width, bx = x + w / 2 - (tw + 20) / 2;
  desenharIconeEnergia(bx + 7, y + 100, 16);
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillStyle = podePagar ? "#2b2030" : "#c0392b";
  ctx.fillText(String(g.custo), bx + 18, y + 101);

  // camadas de estado
  ctx.save(); rr(x, y, w, h, 11); ctx.clip();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  if (carta.bloqueio > 0) {
    ctx.fillStyle = "rgba(20,14,28,.74)"; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#e9b752";
    rr(x + w / 2 - 10, y + 34, 20, 16, 3); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = "#e9b752"; ctx.beginPath(); ctx.arc(x + w / 2, y + 34, 7, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = "#fff4d6"; ctx.font = "800 15px Grandstander, 'Trebuchet MS', sans-serif";
    ctx.fillText(`em ${Math.ceil(carta.bloqueio)}s`, x + w / 2, y + 68);
  } else if (carta.estoque === 0) {
    ctx.fillStyle = "rgba(60,60,66,.72)"; ctx.fillRect(x, y, w, h);
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(-.35);
    ctx.fillStyle = "#c0392b"; ctx.fillRect(-56, -12, 112, 24);
    ctx.fillStyle = "#fff"; ctx.font = "800 13px Grandstander, 'Trebuchet MS', sans-serif";
    ctx.fillText("ESGOTADO", 0, 1); ctx.restore();
  } else if (carta.recarga > 0) {
    const frac = carta.recarga / g.recarga;
    ctx.fillStyle = "rgba(20,14,28,.6)"; ctx.fillRect(x, y, w, h * frac);
    ctx.fillStyle = "#fff4d6"; ctx.font = "800 24px Grandstander, 'Trebuchet MS', sans-serif";
    ctx.fillText(String(Math.ceil(carta.recarga)), x + w / 2, y + 40);
  } else if (!podePagar) {
    ctx.fillStyle = "rgba(20,14,28,.38)"; ctx.fillRect(x, y, w, h);
  } else if (pronta) {
    const brilho = (tempo * .6 + i * .2) % 2;   // reflexo passando no card pronto
    if (brilho < 1) {
      const bx2 = x - 30 + brilho * (w + 60);
      const bg = ctx.createLinearGradient(bx2 - 16, 0, bx2 + 16, 0);
      bg.addColorStop(0, "rgba(255,255,255,0)"); bg.addColorStop(.5, "rgba(255,255,255,.32)"); bg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
    }
  }
  ctx.restore();

  seloTecla(x, y, String(i + 1), "#e9b752");
  if (carta.estoque !== null) {
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    rr(x + w - 28, y - 7, 34, 19, 9.5); ctx.fillStyle = carta.estoque > 0 ? "#8d52c7" : "#6b6470"; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = "#1a1222"; ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.font = "800 12px Grandstander, 'Trebuchet MS', sans-serif";
    ctx.fillText("x" + carta.estoque, x + w - 11, y + 3);
  }
}
// Guerreiros desenhados por código: Cardo atira espinhos, Cristal gera energia, Rocha segura golpes
function desenharRetratoGuerreiroVetor(carta, g, x, y, w, i) {
  const ret = retratos[carta.id];
  ret.idade = CARDS_ANIMADOS ? tempo + ret.semente : 0;
  const t = tempo + i * .37;
  let extra = null;
  if (!CARDS_ANIMADOS) {                              // card parado: sem tranco, sem brilho, sem energia subindo
    ret.recuo = 0; ret.brilho = 0; ret.flash = 0; ret.gerT = g.intervalo || 12;
  } else if (g.visual === "cardo") {
    const u = t % 1.25;
    ret.recuo = Math.max(0, 1 - u * 4);
    if (u < 1) extra = () => desenharTiro({ x: 22 + u * 240, y: -76, vida: u });
  } else if (g.visual === "cristal") {
    const u = t % 3;
    ret.gerT = (g.intervalo || 12) * (1 - u / 3); ret.brilho = Math.max(0, 1 - u * 2); ret.recuo = Math.max(0, 1 - u * 5);
    if (u < 1.1) extra = () => { ctx.globalAlpha = Math.min(1, (1.1 - u) / .4); desenharIconeEnergia(28, -46 - u * 22, 34); ctx.globalAlpha = 1; };
  } else if (g.visual === "rocha") {
    const u = t % 2.2;
    ret.flash = u < .1 ? 1 : 0; ret.recuo = Math.max(0, 1 - u * 5);
  }
  ctx.translate(x + w / 2 - (g.visual === "cardo" ? 8 : 0), y + 66 + (g.retratoDy || 0) * 1.12);
  ctx.scale(g.retrato * 1.12, g.retrato * 1.12);
  desenharGuerreiro(ret);
  F = 0;
  if (extra) extra();
}
// Guerreiros de PNG: fica em pé, prepara, ataca e volta, em loop. O corpo inteiro cabe na janela.
function desenharRetratoGuerreiroSprite(g, x, y, w, i) {
  if (g.trechos) return desenharRetratoProtetor(g, x, y, w, i);
  const A = g.sprite.anims, pa = A.parado;
  if (!pa.ok) return;
  const dur = an => an.quadros / an.fps;
  const temAtk = A.atacando && A.atacando.ok, temPrep = A.preparando && A.preparando.ok;
  const seq = [{ an: pa, d: 1.3, loop: true }];
  if (temAtk) {
    if (temPrep) seq.push({ an: A.preparando, d: dur(A.preparando) + (A.preparando.segura || 0) });
    for (let k = 0; k < (g.flecha ? 2 : 1); k++) seq.push({ an: A.atacando, d: dur(A.atacando) + (g.flecha ? .25 : 0), ataque: true });
    if (temPrep) seq.push({ an: A.preparando, d: dur(A.preparando), reverso: true });
  }
  const total = seq.reduce((a, s) => a + s.d, 0);
  let tt = CARDS_ANIMADOS ? (tempo + i * .5) % total : 0, sg = seq[0];   // parado: primeiro quadro da pose "parado"
  for (const s of seq) { if (tt < s.d) { sg = s; break; } tt -= s.d; }
  const an = sg.an, k = Math.floor(tt * an.fps);
  const q = sg.loop ? k % an.quadros : sg.reverso ? an.quadros - 1 - Math.min(an.quadros - 1, k) : Math.min(an.quadros - 1, k);
  const esc = 58 / pa.ay * ((g.retratoCard && g.retratoCard.zoom) || 1);   // altura em pé cabe na janela
  const cx = x + w / 2 - 4, pe = y + 69;
  ctx.save();
  const escA = esc * (an.fator || 1) / (pa.fator || 1);     // folhas de tamanhos diferentes ficam do mesmo tamanho no card
  ctx.translate(cx, pe); ctx.scale(escA, escA);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(an.img, (q % an.cols) * an.cw, Math.floor(q / an.cols) * an.ch, an.cw, an.ch, -an.ax, -an.ay, an.cw, an.ch);
  ctx.restore();
  if (g.brilhoCajado && sg.loop) {                  // cristal brilhando no card enquanto ele está parado
    const k2 = esc / g.sprite.escala;
    if (CARDS_ANIMADOS) { ctx.save(); ctx.translate(cx, pe); ctx.scale(k2, k2); brilhoCajado(g.brilhoCajado, tempo); ctx.restore(); }
  }
  // flecha voando dentro do card, a partir do quadro do disparo
  if (sg.ataque && g.magia && an.quadroTiro != null) {
    const t0 = an.quadroTiro / an.fps;
    if (tt >= t0) {
      const k2 = esc / g.sprite.escala;
      desenharMagia(cx + g.magia.saidaX * k2 + (tt - t0) * 200, pe + g.magia.saidaY * k2, tt, .5, g.magia.estilo);
    }
  }
  if (sg.ataque && g.flecha && an.quadroTiro != null) {
    const t0 = an.quadroTiro / an.fps;
    if (tt >= t0) {
      const k2 = esc / g.sprite.escala;                                       // pixels do jogo -> pixels do card
      ctx.save(); ctx.translate(cx + g.flecha.saidaX * k2 + (tt - t0) * 260, pe + g.flecha.saidaY * k2); ctx.scale(.55, .55);
      desenharFlecha({ x: 0, y: 0 }); ctx.restore();
    }
  }
}
// Card do Guerreiro Protetor: parado, ergue o escudo, segura e abaixa
function desenharRetratoProtetor(g, x, y, w, i) {
  const an = g.sprite.anims.defendendo, T = g.trechos;
  if (!an.ok) return;
  const f = an.fps, d = (a, b) => (b - a) / f;
  const seq = [[T.parado, 1.2, "vai"], [[T.levantar[0], T.levantar[1]], d(...T.levantar), "seg"],
               [T.segurar, 1.4, "vai"], [[T.abaixar[0], T.abaixar[1]], d(...T.abaixar), "seg"]];
  const total = seq.reduce((a, s) => a + s[1], 0);
  let tt = CARDS_ANIMADOS ? (tempo + i * .5) % total : 0, q = 0;
  for (const [tr, dur, modo] of seq) {
    if (tt < dur) {
      const len = tr[1] - tr[0];
      if (modo === "seg") q = tr[0] - 1 + Math.min(len, Math.floor(tt * f));
      else { const k = Math.floor(tt * f * .6) % (len * 2 || 1); q = tr[0] - 1 + (k <= len ? k : len * 2 - k); }
      break;
    }
    tt -= dur;
  }
  const esc = 60 / an.ay * ((g.retratoCard && g.retratoCard.zoom) || 1);
  ctx.save();
  ctx.translate(x + w / 2 - 3, y + 69); ctx.scale(esc, esc);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(an.img, (q % an.cols) * an.cw, Math.floor(q / an.cols) * an.ch, an.cw, an.ch, -an.ax, -an.ay, an.cw, an.ch);
  ctx.restore();
}
function desenharRetratoMonstro(id, x, y, w) {
  const per = PERSONAGENS[id], an = per.anims.andar;
  ctx.save();
  janelaRetrato(x, y, w, per.cores || ["#d9d2c4", "#6b6470"]);
  ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,.22)"; ctx.beginPath(); ctx.ellipse(x + w / 2, y + 68, 30, 7, 0, 0, 7); ctx.fill();
  if (an.ok) {
    const zoom = (per.retrato && per.retrato.zoom) || 1, dy = (per.retrato && per.retrato.dy) || 0;
    const esc = 60 / an.ay * zoom;                                     // cabe na janela, pés no chão do retrato
    const q = CARDS_ANIMADOS ? Math.floor(tempo * an.fps * .8) % an.quadros : 0;   // parado: primeiro quadro
    ctx.translate(x + w / 2, y + 69 + dy);
    ctx.scale(an.olhaDireita ? -esc : esc, esc);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(an.img, (q % an.cols) * an.cw, Math.floor(q / an.cols) * an.ch, an.cw, an.ch, -an.ax, -an.ay, an.cw, an.ch);
  } else {                                                             // imagem não carregou: silhueta
    ctx.fillStyle = "rgba(26,18,34,.45)";
    ctx.beginPath(); ctx.arc(x + w / 2, y + 30, 12, 0, 7); ctx.fill();
    rr(x + w / 2 - 12, y + 42, 24, 26, 8); ctx.fill();
  }
  ctx.restore();
  bordaRetrato(x, y, w);
}
function desenharCartaMonstro(id, i, sobre) {
  const r = retMonstro(i);
  const x = r.x, w = r.w, h = r.h;
  if (!id) {                                         // espaço livre
    const y = r.y;
    rr(x, y, w, h, 11); ctx.fillStyle = "rgba(20,10,16,.55)"; ctx.fill();
    ctx.save(); ctx.setLineDash([6, 5]); rr(x + 1, y + 1, w - 2, h - 2, 10);
    ctx.lineWidth = 2; ctx.strokeStyle = sobre ? "rgba(255,140,130,.8)" : "rgba(214,84,84,.45)"; ctx.stroke(); ctx.restore();
    ctx.strokeStyle = "rgba(255,200,190,.45)"; ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x + w / 2 - 11, y + 44); ctx.lineTo(x + w / 2 + 11, y + 44);
    ctx.moveTo(x + w / 2, y + 33); ctx.lineTo(x + w / 2, y + 55); ctx.stroke(); ctx.lineCap = "butt";
    ctx.fillStyle = "rgba(255,200,190,.6)"; ctx.font = "800 11px Grandstander, 'Trebuchet MS', sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("EM BREVE", x + w / 2, y + 80);
    seloTecla(x, y, "⇧" + (i + 1), "rgba(214,84,84,.6)");
    return;
  }
  const per = PERSONAGENS[id];
  const escolhida = i === monstroSel && modoSel === "monstro" && !paAtiva;
  const y = r.y - (escolhida ? 4 : sobre ? 2 : 0);
  molduraCarta(x, y, w, h, TEMA_MONSTRO, escolhida, sobre);
  desenharRetratoMonstro(id, x, y, w);
  plaquinha(x, y, w, per.nome.replace("Esqueleto ", "Esq. "), "#1a0d12", "#ffd9d4");
  // vida (no modo Monsters: o custo em energia)
  ctx.font = "800 16px Grandstander, 'Trebuchet MS', sans-serif";
  const txt = String(modoM ? custoMonstro(id) : per.vida), tw = ctx.measureText(txt).width, bx = x + w / 2 - (tw + 20) / 2;
  if (modoM) desenharIconeEnergia(bx + 7, y + 101, 18); else desenharCoracao(bx + 7, y + 101, 15, "#ff6b5e");
  ctx.fillStyle = "#ffd9d4"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText(txt, bx + 18, y + 101);
  if (!per.anims.andar.ok) {
    ctx.save(); rr(x, y, w, h, 11); ctx.clip(); ctx.fillStyle = "rgba(10,6,10,.55)"; ctx.fillRect(x, y, w, h); ctx.restore();
  }
  seloTecla(x, y, "⇧" + (i + 1), "#ff6b5e");
}
// MODO_MONSTERS: card do monstro na mão de cartas, igual ao card dos guerreiros
function desenharCartaMonstroMao(id, i, sobre) {
  const per = PERSONAGENS[id], r = retCarta(i), custo = custoMonstro(id);
  const escolhida = i === monstroSel && modoSel === "monstro" && !paAtiva;
  const x = r.x, y = r.y - (escolhida ? 4 : sobre ? 2 : 0), w = r.w, h = r.h;
  const rec = recargaM[id] || 0, podePagar = MODO_TESTE.energiaInfinita || energiaVista() >= custo;
  molduraCarta(x, y, w, h, TEMA_GUERREIRO, escolhida, sobre);
  desenharRetratoMonstro(id, x, y, w);
  plaquinha(x, y, w, per.nome.replace("Esqueleto ", "Esq. "), "#2b2030", "#fff4d6");
  ctx.font = "800 17px Grandstander, 'Trebuchet MS', sans-serif";
  const tw = ctx.measureText(String(custo)).width, bx = x + w / 2 - (tw + 20) / 2;
  desenharIconeEnergia(bx + 7, y + 100, 16);
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillStyle = podePagar ? "#2b2030" : "#c0392b";
  ctx.fillText(String(custo), bx + 18, y + 101);
  ctx.save(); rr(x, y, w, h, 11); ctx.clip();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  if (!per.anims.andar.ok) { ctx.fillStyle = "rgba(20,14,28,.6)"; ctx.fillRect(x, y, w, h); }
  else if (rec > 0) {
    ctx.fillStyle = "rgba(20,14,28,.6)"; ctx.fillRect(x, y, w, h * rec / recargaMonstro(id));
    ctx.fillStyle = "#fff4d6"; ctx.font = "800 24px Grandstander, 'Trebuchet MS', sans-serif";
    ctx.fillText(String(Math.ceil(rec)), x + w / 2, y + 40);
  } else if (!podePagar) { ctx.fillStyle = "rgba(20,14,28,.38)"; ctx.fillRect(x, y, w, h); }
  else {
    const brilho = (tempo * .6 + i * .2) % 2;
    if (brilho < 1) {
      const bx2 = x - 30 + brilho * (w + 60), bg = ctx.createLinearGradient(bx2 - 16, 0, bx2 + 16, 0);
      bg.addColorStop(0, "rgba(255,255,255,0)"); bg.addColorStop(.5, "rgba(255,255,255,.32)"); bg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
    }
  }
  ctx.restore();
  seloTecla(x, y, String(i + 1), "#e9b752");
}
function desenharSlotPa(sobre) {
  const p = HUD.pa, y = p.y - (paAtiva ? 4 : sobre ? 2 : 0);
  ctx.save();
  if (paAtiva) { ctx.shadowColor = "rgba(255,200,80,.95)"; ctx.shadowBlur = 18; }
  rr(p.x, y, p.w, p.h, 11); ctx.fillStyle = "#1a1222"; ctx.fill();
  ctx.restore();
  const g = ctx.createLinearGradient(0, y, 0, y + p.h);
  g.addColorStop(0, paAtiva ? "#6a5484" : "#3a2b4a"); g.addColorStop(1, "#1d1527");
  rr(p.x + 2.5, y + 2.5, p.w - 5, p.h - 5, 9); ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = paAtiva ? 3 : 1.5; ctx.strokeStyle = paAtiva ? "#f2c14e" : "rgba(233,183,82,.55)"; ctx.stroke();
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const gl = ctx.createRadialGradient(p.x + p.w / 2, y + 44, 2, p.x + p.w / 2, y + 44, 34);
  gl.addColorStop(0, `rgba(190,210,255,${paAtiva ? .35 : sobre ? .22 : .12})`); gl.addColorStop(1, "rgba(190,210,255,0)");
  ctx.fillStyle = gl; ctx.fillRect(p.x, y, p.w, p.h); ctx.restore();
  desenharPa(p.x + p.w / 2, y + 44, 56, paAtiva ? -.25 : -.6);
  rr(p.x + 6, y + 80, p.w - 12, 20, 6); ctx.fillStyle = "#2b2030"; ctx.fill();
  ctx.fillStyle = "#fff4d6"; ctx.font = "800 12px Grandstander, 'Trebuchet MS', sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(paAtiva ? "ATIVA" : "PÁ", p.x + p.w / 2, y + 90);
  seloTecla(p.x, y, "X", "#e9b752");
}
// Dica ao passar o mouse sobre um card
function desenharDica() {
  if (!mouse.dentro) return;
  const alvo = alvoHUD(mouse.x, mouse.y);
  if (!alvo || alvo.tipo === "aba") return;
  let titulo, linha1, linha2, cor, x;
  if (alvo.tipo === "guerreiro") {
    const g = GUERREIROS[cartas[alvo.i].id];
    titulo = g.nome; linha1 = g.desc; linha2 = `Custo ${g.custo} · Vida ${g.vida} · Recarga ${g.recarga}s`;
    cor = "#e9b752"; x = retCarta(alvo.i).x;
  } else if (alvo.tipo === "monstro") {
    const id = MONSTROS_CARTAS[alvo.i];
    x = retMonstro(alvo.i).x; cor = "#ff6b5e";
    if (!id) { titulo = "Espaço livre"; linha1 = "Aqui entra o próximo monstro que você criar"; linha2 = ""; }
    else {
      const per = PERSONAGENS[id];
      titulo = per.nome; linha1 = per.desc || "";
      linha2 = `Vida ${per.vida} · Velocidade ${per.velocidade} · Dano ${per.dano || 25}`;
      if (!per.anims.andar.ok) linha1 = "Imagem não encontrada: confira a pasta";
    }
    linha2 = linha2 ? linha2 + "  ·  escolha e clique no gramado" : "";
  } else {
    titulo = "Pá"; linha1 = "Clique aqui e depois num guerreiro para tirá-lo da arena";
    linha2 = "Atalho: X · Esc cancela · a energia não volta"; cor = "#e9b752"; x = HUD.pa.x;
  }
  ctx.font = "400 12px 'Atkinson Hyperlegible', system-ui, sans-serif";
  const w = Math.max(200, ctx.measureText(linha1).width, ctx.measureText(linha2).width) + 24;
  const h = linha2 ? 62 : 46;
  x = Math.min(Math.max(8, x + CARTA.w / 2 - w / 2), W - w - 8);
  const y = 146;
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
  rr(x, y, w, h, 10); ctx.fillStyle = "rgba(29,21,39,.96)"; ctx.fill(); ctx.restore();
  rr(x, y, w, h, 10); ctx.lineWidth = 1.5; ctx.strokeStyle = cor; ctx.stroke();
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#fff4d6"; ctx.font = "800 15px Grandstander, 'Trebuchet MS', sans-serif"; ctx.fillText(titulo, x + 12, y + 20);
  ctx.fillStyle = "#cdbfda"; ctx.font = "400 12px 'Atkinson Hyperlegible', system-ui, sans-serif"; ctx.fillText(linha1, x + 12, y + 38);
  if (linha2) { ctx.fillStyle = cor; ctx.fillText(linha2, x + 12, y + 54); }
}
// Pá seguindo o mouse e a casa que vai ser esvaziada
// Prévia no gramado: o personagem escolhido aparece meio transparente na casa sob o mouse (sem moldura)
let alfaFantasma = 1;
function desenharFantasmaGuerreiro(tipo, x, y, invalido) {
  const g = GUERREIROS[tipo];
  ctx.save();
  ctx.globalAlpha = invalido ? .28 : .5;
  if (invalido) ctx.filter = "grayscale(1) brightness(.8) sepia(1) hue-rotate(-50deg) saturate(3)";   // avermelhado: não dá para colocar
  if (g.visual === "sprite") {
    const A = g.sprite.anims, an = A.parado && A.parado.ok ? A.parado : (A.defendendo || A.atacando);
    if (an && an.ok) {
      const esc = g.sprite.escala * (an.fator || 1);
      const q = an === A.defendendo && g.trechos ? g.trechos.parado[0] - 1 : 0;
      ctx.translate(x, y); ctx.scale(esc, esc);
      ctx.drawImage(an.img, (q % an.cols) * an.cw, Math.floor(q / an.cols) * an.ch, an.cw, an.ch, -an.ax, -an.ay, an.cw, an.ch);
    }
  } else {
    const ret = retratos[tipo];
    ret.idade = tempo; ret.recuo = 0; ret.flash = 0; ret.brilho = 0;
    ctx.translate(x, y);
    alfaFantasma = ctx.globalAlpha;
    desenharGuerreiro(ret);
    alfaFantasma = 1;
    F = 0;
  }
  ctx.restore();
}
function desenharCasaMouse() {
  if (paAtiva || !mouse.dentro || pausado || fim || espiando) return;
  ctx.save();
  if (cam.z > 1.001) { ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z); ctx.translate(-cam.cx, -cam.cy); }
  ctx.translate(-camX, 0);
  desenharCasaMouseMundo();
  ctx.restore();
}
function desenharCasaMouseMundo() {
  const { wx: x, wy: y } = mouse;                // posição no jogo (considera o zoom)
  if (x < G.left || x >= G.right || y < G.top || y >= G.bottom) return;
  const r = Math.floor((y - G.top) / G.ch), c = Math.floor((x - G.left) / G.cw);
  if (modoSel === "monstro") {                     // prévia do monstro escolhido, meio transparente
    const id = MONSTROS_CARTAS[monstroSel], per = id && PERSONAGENS[id], an = per && per.anims.andar;
    if (an && an.ok) {
      const esc = per.escala * (an.escala ?? 1);
      ctx.save(); ctx.globalAlpha = .45;
      ctx.translate(celX(c), G.top + r * G.ch + G.ch - 14); ctx.scale((an.olhaDireita ? -esc : esc) * (modoM ? -1 : 1), esc);
      ctx.drawImage(an.img, 0, 0, an.cw, an.ch, -an.ax, -an.ay, an.cw, an.ch);
      ctx.restore();
    }
    return;
  }
  // guerreiro: o do presente escolhido na lista, ou o card selecionado
  const tipo = pendenteSel ? pendenteSel.tipo : cartas[cartaSel] && cartas[cartaSel].id;
  if (!tipo) return;
  const g = GUERREIROS[tipo];
  const semEnergia = !pendenteSel && !MODO_TESTE.energiaInfinita && energia < g.custo;
  const invalido = !!grade[r][c] || semEnergia;
  if (grade[r][c]) {                               // guerreiro na casa: mostra que clicando ele evolui, e quanto custa
    const p = grade[r][c];
    if (p.morte || (p.nivel || 1) >= NIVEIS.max) return;
    const nv = (p.nivel || 1) + 1, custo = custoEvoluirGuerreiro(p), pode = MODO_TESTE.energiaInfinita || energia >= custo;
    const pul = .5 + .5 * Math.sin(tempo * 6), ty = p.y - 132 - pul * 3;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const gl = ctx.createRadialGradient(p.x, p.y - 50, 5, p.x, p.y - 50, 70);
    gl.addColorStop(0, `rgba(255,220,120,${(pode ? .22 : .1) + .12 * pul})`); gl.addColorStop(1, "rgba(255,220,120,0)");
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(p.x, p.y - 50, 70, 0, 7); ctx.fill(); ctx.restore();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "900 16px Grandstander, 'Trebuchet MS', sans-serif";
    ctx.lineWidth = 4; ctx.strokeStyle = "rgba(20,12,26,.9)"; ctx.strokeText(`⬆ Nv ${nv}`, p.x, ty);
    ctx.fillStyle = corDoNivel(nv); ctx.fillText(`⬆ Nv ${nv}`, p.x, ty);
    // custo embaixo: número + símbolo da energia
    ctx.font = "900 14px Grandstander, 'Trebuchet MS', sans-serif";
    const txt = String(custo), tw = ctx.measureText(txt).width, ic = 16, larg = tw + ic + 14;
    ctx.fillStyle = "rgba(20,12,26,.85)"; rr(p.x - larg / 2, ty + 11, larg, 20, 10); ctx.fill();
    ctx.fillStyle = pode ? "#ffe7a6" : "#ff8a7a"; ctx.textAlign = "left"; ctx.fillText(txt, p.x - larg / 2 + 7, ty + 21.5);
    const ix = p.x - larg / 2 + 9 + tw, iy = ty + 13;
    desenharIconeEnergia(ix + ic / 2, iy + ic / 2, ic);                       // símbolo da energia (o mesmo da barra de cima)
    ctx.textAlign = "center";
    return;
  }
  desenharFantasmaGuerreiro(tipo, celX(c), chaoY(r), invalido);
}
function desenharCursorPa() {
  if (!paAtiva || !mouse.dentro) return;
  const { wx: x, wy: y } = mouse;                // posição no jogo (considera o zoom)
  if (x >= G.left && x < G.right && y >= G.top && y < G.bottom) {
    const r = Math.floor((y - G.top) / G.ch), c = Math.floor((x - G.left) / G.cw);
    const tem = grade[r][c];
    const a = .5 + Math.sin(tempo * 8) * .2;
    ctx.fillStyle = tem ? `rgba(255,90,80,${a * .35})` : "rgba(255,244,214,.12)";
    ctx.fillRect(G.left + c * G.cw, G.top + r * G.ch, G.cw, G.ch);
    ctx.strokeStyle = tem ? `rgba(255,120,110,${a + .3})` : "rgba(255,244,214,.4)"; ctx.lineWidth = 3;
    ctx.strokeRect(G.left + c * G.cw + 2, G.top + r * G.ch + 2, G.cw - 4, G.ch - 4);
  }
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4;
  desenharPa(x + 16, y - 20, 50, -.5 + Math.sin(tempo * 6) * .05);
  ctx.restore();
}
function desenharOrbes() {
  for (const o of orbes) {
    if (o.lado && o.lado !== ladoQueJoga() && o.estado === "coletando") continue;   // a energia do outro não voa para o seu botão
    const p0 = posOrbe(o), p = p0.tela ? p0 : { ...p0, ...paraTela(p0.x, p0.y) };
    const acabando = o.estado === "parado" && o.vida > ENERGIA_CEU.duracao - 2;
    if (acabando && Math.sin(o.vida * 22) < 0) continue;   // pisca antes de sumir
    ctx.save();
    ctx.translate(p.x, p.y); ctx.scale(p.s, p.s);
    ctx.globalCompositeOperation = "lighter";
    const gl = ctx.createRadialGradient(0, 0, 4, 0, 0, 36);
    gl.addColorStop(0, `rgba(255,170,60,${.45 + Math.sin(tempo * 5 + o.fase) * .12})`); gl.addColorStop(1, "rgba(255,120,30,0)");
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, 36, 0, 7); ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.rotate(Math.sin(tempo * 2 + o.fase) * .15);
    desenharIconeEnergia(0, 0, 44);
    ctx.restore();
  }
}

/* ZOOM: clique no botão do meio do mouse (a rodinha) para entrar no zoom; role a rodinha para aproximar/afastar;
   a câmera segue o mouse. Clique na rodinha de novo para sair. */
const ZOOM = { entrada: 1.6, min: 1.15, max: 3, passo: 1.12, suave: 8 };
const cam = { ativo: false, alvo: ZOOM.entrada, z: 1, cx: 640, cy: 360 };
function atualizarCamera() {
  const dt = 1 / 60, zAlvo = cam.ativo ? cam.alvo : 1;
  cam.z += (zAlvo - cam.z) * Math.min(1, dt * ZOOM.suave);
  if (Math.abs(cam.z - zAlvo) < .002) cam.z = zAlvo;
  const vw = W / cam.z, vh = H / cam.z;                       // tamanho da área visível
  const mx = mouse.dentro ? mouse.x : W / 2, my = mouse.dentro ? mouse.y : H / 2;
  const cxA = vw / 2 + (mx / W) * (W - vw), cyA = vh / 2 + (my / H) * (H - vh);   // o mouse leva a câmera até as bordas
  cam.cx += (cxA - cam.cx) * Math.min(1, dt * ZOOM.suave);
  cam.cy += (cyA - cam.cy) * Math.min(1, dt * ZOOM.suave);
  const mw = paraMundo(mouse.x, mouse.y); mouse.wx = mw.x; mouse.wy = mw.y;   // a câmera andou: atualiza onde o mouse está no jogo
}
// Texto dentro da arena espelhada: desvira as letras para ficarem legíveis
let textoEspelhado = false;
(() => {
  const f = ctx.fillText, st = ctx.strokeText;
  ctx.fillText = function (t, x, y, mw) {
    if (!textoEspelhado) return mw === undefined ? f.call(this, t, x, y) : f.call(this, t, x, y, mw);
    this.save(); this.translate(x, y); this.scale(-1, 1);
    mw === undefined ? f.call(this, t, 0, 0) : f.call(this, t, 0, 0, mw); this.restore();
  };
  ctx.strokeText = function (t, x, y, mw) {
    if (!textoEspelhado) return mw === undefined ? st.call(this, t, x, y) : st.call(this, t, x, y, mw);
    this.save(); this.translate(x, y); this.scale(-1, 1);
    mw === undefined ? st.call(this, t, 0, 0) : st.call(this, t, 0, 0, mw); this.restore();
  };
})();
function paraMundo(sx, sy) {                                   // ponto da tela -> ponto do campo (com zoom e câmera)
  if (cam.z <= 1.001) return { x: sx + camX, y: sy };
  return { x: cam.cx + (sx - W / 2) / cam.z + camX, y: cam.cy + (sy - H / 2) / cam.z };
}
function paraTela(x, y) {                                      // ponto do campo -> ponto da tela
  const lx = x - camX;
  if (cam.z <= 1.001) return { x: lx, y };
  return { x: (lx - cam.cx) * cam.z + W / 2, y: (y - cam.cy) * cam.z + H / 2 };
}
/* ---------- PORTOES: cada arena tem um portão mágico na ponta direita ----------
   A tropa que entra no portão da sua arena sai pelo portão da arena do inimigo (e o contrário).
   Você vê só a sua arena. Para ESPIAR a do inimigo, clique na barra de vida do castelo dele (embaixo, à direita);
   para voltar, clique na barra do seu castelo ou aperte Esc.
   VISAO: quando a carta espiã existir, "livre: false" vai exigir a carta (e energia) para espiar. */
const VISAO = { livre: true, troca: 0.55 };          // troca = segundos do efeito de passar pelo portão
const PORTAO_VISUAL = { largura: 46, altura: 250, y: (G.top + G.bottom) / 2 + 6 };
let camX = 0, espiando = false;
const transVisao = { t: 1, paraEspiar: false, trocou: true };
function xVisto(x) { return modoM ? MW - x : x; }            // posição no jogo -> posição vista
function ladoB(x) { return x > W + CAMPO.vazio / 2; }        // a arena da direita (no jogo)
function espiar(sim) {
  if (sim === espiando && transVisao.t >= 1) return;
  if (sim && !VISAO.livre) { registrar("sistema", "Você precisa da carta espiã para ver a arena inimiga", false); return; }
  transVisao.t = 0; transVisao.paraEspiar = sim; transVisao.trocou = false;
}
function atualizarVisao(dt) {
  if (transVisao.t >= 1) return;
  transVisao.t = Math.min(1, transVisao.t + dt / VISAO.troca);
  if (!transVisao.trocou && transVisao.t >= .5) {          // no meio do efeito troca de arena
    transVisao.trocou = true; espiando = transVisao.paraEspiar;
    camX = espiando ? MW - W : 0;
  }
}
// passou pelo portão: some de um lado e aparece do outro
function atravessarPortao(u, paraX) {
  const deX = u.x;
  u.x = paraX; u.atravessou = true; u.xSaida = paraX;
  abrirFenda(paraX + (ladoB(paraX) ? -6 : 6), u, true);     // portal de saída abre na outra arena
  for (const x of [deX, paraX]) for (let i = 0; i < 8; i++) parts.push({
    x: x + rand(-6, 6), y: u.y - rand(20, 90), vx: rand(-60, 60), vy: rand(-60, 30), g: -10,
    vida: 0, max: rand(.3, .6), tam: rand(1.5, 3), cor: "#ffffff", tipo: "ponto"
  });
}
// portão mágico (desenhado na posição vista, antes das tropas)
function desenharPortao(x, cores) {
  const { largura: rx0, altura: ry, y } = PORTAO_VISUAL, rx = rx0 / 2;
  ctx.save();
  const halo = ctx.createRadialGradient(x, y, 10, x, y, ry * .9);
  halo.addColorStop(0, cores.halo); halo.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = halo;
  ctx.beginPath(); ctx.ellipse(x, y, rx * 3.2, ry * .72, 0, 0, 7); ctx.fill();
  ctx.globalCompositeOperation = "source-over";
  // colunas de pedra em cima e embaixo
  for (const [yy, hh] of [[y - ry / 2 - 26, 30], [y + ry / 2 - 4, 30]]) {
    const gp = ctx.createLinearGradient(x - rx - 10, 0, x + rx + 10, 0);
    gp.addColorStop(0, "#4a4550"); gp.addColorStop(.5, "#8a8494"); gp.addColorStop(1, "#3a3540");
    ctx.fillStyle = gp; rr(x - rx - 12, yy, rx * 2 + 24, hh, 6); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.5)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = cores.runa; ctx.shadowColor = cores.runa; ctx.shadowBlur = 8;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(x + i * 11, yy + hh / 2, 2.4 + Math.sin(tempo * 3 + i) * .6, 0, 7); ctx.fill(); }
    ctx.shadowBlur = 0;
  }
  // miolo escuro com o redemoinho
  const miolo = ctx.createRadialGradient(x, y, 4, x, y, ry / 2);
  miolo.addColorStop(0, cores.centro); miolo.addColorStop(.7, cores.fundo); miolo.addColorStop(1, cores.borda);
  ctx.fillStyle = miolo; ctx.beginPath(); ctx.ellipse(x, y, rx, ry / 2, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, rx, ry / 2, 0, 0, 7); ctx.clip();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 9; i++) {                                // faixas girando (parece um túnel)
    const f = ((tempo * .35 + i / 9) % 1), k = 1 - f;
    ctx.strokeStyle = cores.faixa.replace("A", (.08 + .35 * f).toFixed(2)); ctx.lineWidth = 2 + 3 * f;
    ctx.beginPath(); ctx.ellipse(x, y, rx * k, ry / 2 * k, 0, tempo * (1 + i * .1), tempo * (1 + i * .1) + 4.2); ctx.stroke();
  }
  for (let i = 0; i < 14; i++) {                               // brilhinhos sendo puxados para dentro
    const f = (tempo * .5 + i * .137) % 1, a = i * 2.4 + tempo * .8;
    const px = x + Math.cos(a) * rx * (1 - f), py = y + Math.sin(a) * ry / 2 * (1 - f);
    ctx.fillStyle = cores.runa; ctx.globalAlpha = f; ctx.beginPath(); ctx.arc(px, py, 1.8, 0, 7); ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = cores.runa; ctx.lineWidth = 3; ctx.shadowColor = cores.runa; ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry / 2, 0, 0, 7); ctx.stroke();
  ctx.restore();
}
const CORES_PORTAO = {
  heroes:   { halo: "rgba(120,180,255,.45)", centro: "#dff4ff", fundo: "#1d3f86", borda: "#0a1230", faixa: "rgba(170,220,255,A)", runa: "#ffd97a" },
  monsters: { halo: "rgba(140,255,90,.40)",  centro: "#f0ffd8", fundo: "#3b1d5e", borda: "#0d0616", faixa: "rgba(190,255,140,A)", runa: "#b8ff6a" }
};
function desenharPortoes() {
  const meu = modoM ? "monsters" : "heroes", deles = modoM ? "heroes" : "monsters";
  if (!espiando) desenharPortao(PORTAO_X, CORES_PORTAO[meu]);
  else desenharPortao(MW - PORTAO_X, CORES_PORTAO[deles]);
}
// efeito de passar pelo portão ao trocar de arena, e o aviso de que você está espiando
function desenharEspiando() {
  if (esperandoAdversario()) {                                 // ONLINE: a internet do outro atrasou
    ctx.save(); ctx.font = "800 18px Grandstander, 'Trebuchet MS', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const txt = `Esperando ${rede.nomeOutro}... (internet lenta)`, tw = ctx.measureText(txt).width + 40;
    ctx.fillStyle = "rgba(20,14,28,.88)"; rr((W - tw) / 2, 60, tw, 40, 20); ctx.fill();
    ctx.fillStyle = "#ffe7a6"; ctx.fillText(txt, W / 2, 81); ctx.restore();
  }
  if (transVisao.t < 1) {
    const a = 1 - Math.abs(transVisao.t - .5) * 2;          // sobe até o meio e desce
    const cor = CORES_PORTAO[transVisao.paraEspiar !== modoM ? "monsters" : "heroes"];
    const g = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, W * .75);
    g.addColorStop(0, `rgba(255,255,255,${a * .95})`); g.addColorStop(.35, cor.halo.replace(/[\d.]+\)$/, a + ")")); g.addColorStop(1, `rgba(8,6,16,${a})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (!espiando) return;
  const txt = "👁 Espiando a arena inimiga · clique na barra do seu castelo (ou Esc) para voltar";
  ctx.save(); ctx.font = "800 16px Grandstander, 'Trebuchet MS', sans-serif";
  const tw = ctx.measureText(txt).width + 36, x = (W - tw) / 2, y = 14;
  ctx.fillStyle = "rgba(20,14,28,.86)"; rr(x, y, tw, 34, 17); ctx.fill();
  ctx.strokeStyle = "#b07cff"; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = "#f3e8ff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(txt, W / 2, y + 18);
  // bordas roxas: lembra que é outra "dimensão"
  const v = ctx.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, W * .72);
  v.addColorStop(0, "rgba(90,40,140,0)"); v.addColorStop(1, "rgba(90,40,140,.35)");
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/* ---------- PORTAL_TROPA: portal redondo que abre atrás de quem passa e fecha logo depois ----------
   Quando uma tropa chega perto da ponta da arena, um portal se abre; ela entra, some, e sai por outro portal
   que abre na arena do outro lado. Cores: arena dos Heroes = azul; arena dos Monsters = roxo e verde. */
const PORTAL_TROPA = {
  raio: 64,           // tamanho do círculo (altura = raio × 2)
  achatado: 0.62,     // 1 = círculo perfeito; menor = mais estreito (parece de lado)
  abrir: 0.35,        // segundos para abrir
  fechar: 0.4,        // segundos para fechar
  aviso: 95,          // a quantos pixels antes da ponta o portal começa a abrir
  some: 42            // em quantos pixels a tropa some ao entrar (e aparece ao sair)
};
let fendas = [];
const CORES_FENDA = {
  heroes:   { a: "#ffffff", b: "#9fd8ff", c: "#2f6bd6", d: "#0b1640", brilho: "120,190,255", faisca: "#e8f6ff" },
  monsters: { a: "#f4ffe0", b: "#b6ff6a", c: "#6d2fb8", d: "#12051f", brilho: "150,255,90",  faisca: "#e9ffd0" }
};
function abrirFenda(x, u, saida) {
  fendas.push({ x, y: u.y, u, t: 0, saida, fase: "abrindo", fim: 0, cor: CORES_FENDA[ladoB(x) ? "monsters" : "heroes"] });
}
// tropa andando perto da ponta: abre o portal de entrada (uma vez só)
function conferirFenda(u, indoDireita) {
  if (u.fendaAberta || u.morte) return;
  const alvo = indoDireita ? PORTAO_X : MW - PORTAO_X, d = indoDireita ? alvo - u.x : u.x - alvo;
  if (d > 0 && d < PORTAL_TROPA.aviso) { u.fendaAberta = true; abrirFenda(alvo, u, false); }
}
function atualizarFendas(dt) {
  for (const f of fendas) {
    f.t += dt;
    if (f.fase === "abrindo" && f.t >= PORTAL_TROPA.abrir) f.fase = "aberto";
    if (f.fase === "aberto") {
      const passou = f.saida ? f.t > PORTAL_TROPA.abrir + .7 : (f.u.atravessou || f.u.morte || f.t > 8);
      if (passou) { f.fase = "fechando"; f.fim = 0; }
    } else if (f.fase === "fechando") f.fim += dt;
  }
  fendas = fendas.filter(f => f.fase !== "fechando" || f.fim < PORTAL_TROPA.fechar);
}
// quanto a tropa aparece (some ao entrar no portal e aparece aos poucos ao sair)
function alfaFenda(u) {
  if (u.atravessou) { const d = Math.abs(u.x - u.xSaida); return Math.min(1, d / PORTAL_TROPA.some); }
  if (!u.fendaAberta) return 1;
  const alvo = ladoB(u.x) ? MW - PORTAO_X : PORTAO_X;
  return Math.max(0, Math.min(1, Math.abs(alvo - u.x) / PORTAL_TROPA.some));
}
// TROCA_ANDAR: segundos da passagem suave entre andar e lutar (a pose antiga some por cima da nova)
// Sem desenhar duas poses uma por cima da outra (isso fazia o "fantasma" feio): a folha de andar agora é alinhada
// com a do herói parado (ALINHAR_ANDAR), então a troca é direta, como nos jogos.
const TROCA_ANDAR = 0;
function desenharGuerreiroSuave(p) { desenharGuerreiro(p); }
function comAlfaFenda(u, desenhar) {
  const a = alfaFenda(u);
  if (a <= .01) return;
  if (a >= .99) { desenhar(); return; }
  ctx.save(); ctx.globalAlpha *= a; desenhar(); ctx.restore();
}
function desenharFendas() {
  for (const f of fendas) {
    // tamanho: abre como uma fenda de luz na vertical e depois alarga; fecha encolhendo com um clarão
    let sy, sx, flash = 0;
    if (f.fase === "fechando") { const k = f.fim / PORTAL_TROPA.fechar; sx = Math.max(0, 1 - k * 1.4); sy = 1 - k * k; flash = k < .8 ? 0 : (k - .8) * 5; }
    else { const k = Math.min(1, f.t / PORTAL_TROPA.abrir); sy = easeOutBack(Math.min(1, k * 1.5)); sx = k < .3 ? .06 : easeOutBack((k - .3) / .7); }
    const R = PORTAL_TROPA.raio, ry = R * Math.max(0, sy), rx = R * PORTAL_TROPA.achatado * Math.max(.04, sx), cx = f.x, cy = f.y - R - 6, c = f.cor;
    if (ry < 1) continue;
    ctx.save();
    // luz no chão
    ctx.globalCompositeOperation = "lighter";
    const chao = ctx.createRadialGradient(cx, f.y, 2, cx, f.y, R * 1.6);
    chao.addColorStop(0, `rgba(${c.brilho},${.35 * sy})`); chao.addColorStop(1, `rgba(${c.brilho},0)`);
    ctx.fillStyle = chao; ctx.beginPath(); ctx.ellipse(cx, f.y, R * 1.6, R * .35, 0, 0, 7); ctx.fill();
    // brilho em volta
    const halo = ctx.createRadialGradient(cx, cy, rx * .5, cx, cy, R * 1.5);
    halo.addColorStop(0, `rgba(${c.brilho},${.45 * sy})`); halo.addColorStop(1, `rgba(${c.brilho},0)`);
    ctx.fillStyle = halo; ctx.beginPath(); ctx.ellipse(cx, cy, rx + R * .9, ry + R * .6, 0, 0, 7); ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    // miolo: túnel escuro com luz no fundo
    const miolo = ctx.createRadialGradient(cx, cy, 1, cx, cy, Math.max(rx, ry));
    miolo.addColorStop(0, c.a); miolo.addColorStop(.18, c.b); miolo.addColorStop(.5, c.c); miolo.addColorStop(1, c.d);
    ctx.fillStyle = miolo; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 7); ctx.fill();
    // redemoinho girando (braços em espiral)
    ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 7); ctx.clip();
    ctx.translate(cx, cy); ctx.scale(rx / R, ry / R);
    ctx.globalCompositeOperation = "lighter";
    for (let braco = 0; braco < 4; braco++) {
      ctx.beginPath();
      for (let j = 0; j <= 30; j++) {
        const k = j / 30, ang = tempo * 3.2 + braco * Math.PI / 2 + k * 5.5, raio = R * (1 - k) * .98;
        const px = Math.cos(ang) * raio, py = Math.sin(ang) * raio;
        j ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.strokeStyle = `rgba(${c.brilho},.55)`; ctx.lineWidth = 3.2; ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 1; ctx.stroke();
    }
    for (let i = 0; i < 18; i++) {                              // pontinhos sendo sugados para o centro
      const k = (tempo * .9 + i * .173) % 1, ang = i * 2.1 + tempo * 2.4 + k * 3, raio = R * (1 - k);
      ctx.globalAlpha = k; ctx.fillStyle = c.faisca;
      ctx.beginPath(); ctx.arc(Math.cos(ang) * raio, Math.sin(ang) * raio, 1.6, 0, 7); ctx.fill();
    }
    ctx.restore();
    // borda viva: anel de energia tremendo
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = `rgb(${c.brilho})`; ctx.shadowBlur = 18;
    for (let a2 = 0; a2 < 2; a2++) {
      ctx.beginPath();
      for (let j = 0; j <= 48; j++) {
        const ang = j / 48 * Math.PI * 2, tre = 1 + Math.sin(ang * 7 + tempo * (9 + a2 * 4)) * .035 + Math.sin(ang * 13 - tempo * 7) * .02;
        const px = cx + Math.cos(ang) * rx * tre, py = cy + Math.sin(ang) * ry * tre;
        j ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.strokeStyle = a2 ? "rgba(255,255,255,.8)" : `rgba(${c.brilho},.9)`; ctx.lineWidth = a2 ? 1.4 : 4;
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    // faíscas soltando da borda
    for (let i = 0; i < 8; i++) {
      const ang = i * .785 + tempo * 1.7, k = (tempo * 1.3 + i * .37) % 1;
      const px = cx + Math.cos(ang) * rx * (1 + k * .5), py = cy + Math.sin(ang) * ry * (1 + k * .5);
      ctx.globalAlpha = (1 - k) * .9; ctx.fillStyle = c.faisca; ctx.beginPath(); ctx.arc(px, py, 1.6, 0, 7); ctx.fill();
    }
    // clarão final ao fechar
    if (flash > 0) {
      ctx.globalAlpha = 1;
      const fl = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.2);
      fl.addColorStop(0, `rgba(255,255,255,${flash})`); fl.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = fl; ctx.beginPath(); ctx.arc(cx, cy, R * 1.2, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
}

function desenhar() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  if (tremor > 0) ctx.translate((Math.random() - .5) * tremor * 16, (Math.random() - .5) * tremor * 16);
  atualizarCamera();
  if (cam.z > 1.001) { ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z); ctx.translate(-cam.cx, -cam.cy); }   // zoom (a barra de cards não entra no zoom)
  ctx.translate(-camX, 0);                             // DUAS_ARENAS: a sua (camX = 0) ou a do inimigo (espiando)
  if (videoFundo) { ctx.save(); ctx.translate(camX, 0); desenharVideoFundo(); ctx.restore(); }   // derrota: o vídeo do castelo caindo é o fundo
  else {
    ctx.drawImage(fundo, (espiando ? W : 0) * FUNDO_K, 0, W * FUNDO_K, H * FUNDO_K, camX, 0, W, H);
    if (!espiando) desenharFogo();
    else { ctx.save(); ctx.translate(MW, 0); ctx.scale(-1, 1); desenharFogo(); ctx.restore(); }   // tochas da arena inimiga
  }
  desenharNucleo();
  if (!espiando) desenharDestaques();
  // MODO_MONSTERS: a batalha é desenhada espelhada (seus esqueletos à esquerda olhando para a direita,
  // os heróis entrando pela direita). Os textos continuam normais.
  if (modoM) { ctx.save(); ctx.translate(MW, 0); ctx.scale(-1, 1); textoEspelhado = true; }
  desenharFendas();                                    // PORTAL_TROPA: atrás das tropas
  desenharPortais();                 // círculos de invocação no chão (embaixo dos personagens)

  const ents = [
    ...plantas.map(p => ({ y: p.y + (p.atacando ? 8 : 0), x: p.x, f: () => comAlfaFenda(p, () => desenharGuerreiroSuave(p)) })),   // atacando: espada na frente do inimigo
    ...criaturas.map(c => ({ y: c.y, x: c.x, f: () => comAlfaFenda(c, () => desenharCriatura(c)) }))
  ].sort((a, b) => a.y - b.y || a.x - b.x);
  for (const e of ents) e.f();
  F = 0;
  for (const s of tiros) desenharTiro(s);
  desenharExplosoes();
  desenharOndasTerra();
  desenharOndasOssos();

  for (const q of parts) {
    const k = 1 - q.vida / q.max;
    ctx.globalAlpha = Math.max(0, k);
    if (q.tipo === "anel") {
      ctx.strokeStyle = q.cor; ctx.lineWidth = 4 * k;
      ctx.beginPath(); ctx.arc(q.x, q.y, q.tam + (1 - k) * 50, 0, 7); ctx.stroke();
    } else if (q.tipo === "corte") {
      const v = q.vida / q.max;
      ctx.save(); ctx.translate(q.x, q.y);
      ctx.globalAlpha = 1 - v;
      ctx.strokeStyle = "#ffffff"; ctx.lineCap = "round";
      ctx.lineWidth = 9 * (1 - v) + 1;
      ctx.beginPath(); ctx.arc(0, 0, q.tam + v * 10, -1.2, 1.0); ctx.stroke();
      ctx.strokeStyle = "rgba(160,200,255,.8)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(-4, 0, q.tam - 8 + v * 10, -1.0, .8); ctx.stroke();
      ctx.restore();
    } else if (q.tipo === "chama") {
      const v = q.vida / q.max;
      const r = q.tam * (1 - v * .55);
      const x = q.x + Math.sin(q.vida * 22 + q.semente) * 1.2, y = q.y;
      ctx.globalAlpha = (1 - v) * .75;
      ctx.fillStyle = v < .2 ? "#ffc04a" : v < .5 ? "#ff7a1a" : "#c9301a";
      ctx.beginPath();
      ctx.moveTo(x, y - r * 2.3);
      ctx.bezierCurveTo(x + r * 1.1, y - r * .8, x + r, y + r, x, y + r);
      ctx.bezierCurveTo(x - r, y + r, x - r * 1.1, y - r * .8, x, y - r * 2.3);
      ctx.fill();
      if (v < .4) {   // miolo claro, dá o brilho
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = (1 - v / .4) * .3;
        ctx.fillStyle = "#fff0b0";
        ctx.beginPath(); ctx.ellipse(x, y, r * .45, r * .8, 0, 0, 7); ctx.fill();
        ctx.globalCompositeOperation = "source-over";
      }
    } else if (q.tipo === "folha") {
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.scale(q.tam / 40, q.tam / 40);
      ctx.fillStyle = q.cor; ctx.fill(P.leaf); ctx.restore();
    } else {
      ctx.fillStyle = q.cor; ctx.beginPath(); ctx.arc(q.x, q.y, q.tam * (.5 + k * .5), 0, 7); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  ctx.font = "800 22px Grandstander, 'Trebuchet MS', sans-serif";
  ctx.textAlign = "center"; ctx.lineWidth = 5; ctx.strokeStyle = C.ink; ctx.lineJoin = "round";
  for (const t of textos) {
    const k = 1 - t.t / .8, s = t.t < .12 ? 1 + (1 - t.t / .12) * .5 : 1;
    ctx.save(); ctx.globalAlpha = Math.min(1, k * 1.6); ctx.translate(t.x, t.y); ctx.scale(s, s);
    ctx.strokeText(t.txt, 0, 0); ctx.fillStyle = t.cor; ctx.fillText(t.txt, 0, 0); ctx.restore();
  }
  if (textoEspelhado) { textoEspelhado = false; ctx.restore(); }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);   // a barra de cards não treme
  desenharChefe();
  desenharPendentes();
  desenharBarraCastelo();
  desenharBanner();
  desenharHUD();
  desenharMao();                     // botão de energia e cartas grandes embaixo
  desenharDicaEvoluir();
  desenharEspiando();
  desenharOrbes();
  desenharCasaMouse();
  desenharCursorPa();
  desenharDica();

  if (pausado && !fim) {
    ctx.fillStyle = "rgba(27,21,34,.45)"; ctx.fillRect(0, 0, W, H);
    ctx.font = "800 54px Grandstander, 'Trebuchet MS', sans-serif"; ctx.fillStyle = "#fff4d6";
    ctx.textBaseline = "middle"; ctx.fillText("Pausado", W / 2, H / 2); ctx.textBaseline = "alphabetic";
  }
}

/* ---------- Interface ---------- */
const $ = id => document.getElementById(id);
const elBuffer = $("buffer"), elFeed = $("feed"), elEntrada = $("entrada");
let feedItens = [];
function registrar(origem, msg, ok) {
  feedItens.unshift({ origem, msg, ok });
  feedItens = feedItens.slice(0, 7);
  elFeed.innerHTML = "";
  for (const it of feedItens) {
    const li = document.createElement("li");
    const o = document.createElement("span"); o.className = "origem"; o.textContent = it.origem;
    const t = document.createElement("span"); t.className = it.ok ? "ok" : "bad"; t.textContent = it.msg;
    li.append(o, t); elFeed.append(li);
  }
}
function mostrarBuffer() {
  elBuffer.textContent = buffer === "Z" ? "Z · escolha a linha" : buffer ? buffer + " · escolha a coluna" : "";
  elBuffer.classList.toggle("on", !!buffer);
}
function alternarSom() {
  somLigado = !somLigado;
  $("btnSom").textContent = somLigado ? "Som: ligado" : "Som: desligado";
  $("btnSom").setAttribute("aria-pressed", String(somLigado));
}
function alternarPausa() {
  if (fim) return;
  pausado = !pausado;
  $("btnPausa").textContent = pausado ? "Continuar" : "Pausar";
}
/* VÍDEO DO CASTELO CAINDO (derrota): um para a noite e outro para o dia, conforme o cenário do nível.
   Arquivos: Castelo/castelo caindo/castelo caindo      (noite)
             Castelo/castelo caindo/castelo caindo dia  (dia)       — em .mp4 ou .webm, ideal 1920 x 1080 (16:9).
   O vídeo vira o FUNDO da arena: cards, barra do castelo, monstros e guerreiros vivos continuam aparecendo por cima.
   Quando ele acaba, fica parado no último quadro (castelo destruído) atrás da tela "O castelo caiu". */
/* VIDEO_FIM: o castelo de QUEM PERDEU caindo (lado Heroes = castelo dos heróis; lado Monsters = Castelo Sombrio),
   de dia ou de noite, igual ao nível em que a partida acabou. */
const VIDEO_FIM = {
  heroes_noite:   "Castelo/castelo caindo/castelo caindo",
  heroes_dia:     "Castelo/castelo caindo/castelo caindo dia",
  monsters_noite: "Castelo/castelo caindo/castelo sombrio caindo noite",
  monsters_dia:   "Castelo/castelo caindo/castelo sombrio caindo dia",
  volume: 1.0
};
const videoFimEl = document.getElementById("videoFim");
const VIDEOS_FIM = {};
for (const qual of ["heroes_noite", "heroes_dia", "monsters_noite", "monsters_dia"]) {
  let el = qual === "heroes_noite" ? videoFimEl : document.createElement("video");
  if (el !== videoFimEl) { el.className = "videoFim"; el.playsInline = true; el.preload = "auto"; videoFimEl.parentNode.insertBefore(el, videoFimEl); }
  VIDEOS_FIM[qual] = { el, ok: false, erro: "" };
}
const EXT_VIDEO = ["mp4", "webm", "m4v", "mov", "mkv"];
const nomeVideo = q => ({ heroes_noite: "derrota dos Heroes (noite)", heroes_dia: "derrota dos Heroes (dia)",
  monsters_noite: "derrota dos Monsters (noite)", monsters_dia: "derrota dos Monsters (dia)" })[q] || q;
for (const qual in VIDEOS_FIM) (function carregarVideoFim(exts, erros) {
  const v = VIDEOS_FIM[qual];
  if (!exts.length) {                                         // nenhum arquivo funcionou: explica o motivo
    v.erro = erros.includes("formato")
      ? `O vídeo de ${nomeVideo(qual)} existe, mas o Chrome não consegue tocar esse formato. Converta para .mp4 (H.264) ou .webm.`
      : `Não encontrei o vídeo de ${nomeVideo(qual)}: "${VIDEO_FIM[qual]}" (.mp4 ou .webm).`;
    setTimeout(() => registrar("sistema", v.erro, false), 0);
    return;
  }
  v.el.onloadeddata = () => { v.ok = true; setTimeout(() => registrar("sistema", `Vídeo de ${nomeVideo(qual)} pronto: ${v.el.videoWidth} x ${v.el.videoHeight}`, true), 0); };
  v.el.onerror = () => {
    const e = v.el.error, formato = e && (e.code === 3 || e.code === 4) && !/404|not found|ERR_FILE/i.test(e.message || "");
    carregarVideoFim(exts.slice(1), erros.concat(formato ? ["formato"] : []));
  };
  v.el.src = VIDEO_FIM[qual] + "." + exts[0];
  v.el.load();
})(EXT_VIDEO, []);
let videoFundo = null;                         // vídeo que está servindo de fundo (tocando ou parado no fim)
let videoFimTocando = false;
function desenharVideoFundo() {
  const v = videoFundo, vw = v.videoWidth || W, vh = v.videoHeight || H;
  const k = Math.max(W / vw, H / vh), dw = vw * k, dh = vh * k;       // cobre a arena inteira sem distorcer
  ctx.drawImage(v, (W - dw) / 2, (H - dh) / 2, dw, dh);
}
function mostrarTelaDerrota() {
  videoFimTocando = false;
  if (videoFundo) videoFundo.pause();                           // fica no último quadro: castelo destruído
  $("fimTitulo").textContent = modoM ? "Os heróis passaram" : "O castelo caiu";
  const quem = modoM ? (abatidas === 1 ? "herói" : "heróis") : (abatidas === 1 ? "monstro" : "monstros");
  $("fimTxt").textContent = `Você chegou ao nível ${camp.nivel}${camp.onda ? `, onda ${camp.onda}` : ""} e derrotou ${abatidas} ${quem}.`;
  $("fim").classList.remove("venceu"); $("fim").classList.add("on");
}
function terminar() {
  if (pvp) return;                                             // PARTIDA_PVP: o fim é decidido no atualizarPvp
  fim = true;
  espiando = false; camX = 0; transVisao.t = 1;                 // derrota: volta para a sua arena
  const qual = (modoM ? "monsters_" : "heroes_") + (noiteAtual ? "noite" : "dia");   // o castelo do seu lado caindo
  const v = VIDEOS_FIM[qual].ok ? VIDEOS_FIM[qual] : null;       // só o vídeo do mesmo cenário (nunca o da noite num nível de dia)
  if (!v) registrar("sistema", VIDEOS_FIM[qual].erro || `O vídeo de ${nomeVideo(qual)} ainda não carregou.`, false);
  if (v) {                                                      // vídeo do castelo caindo, depois a tela de derrota
    const el = v.el;
    el.currentTime = 0; el.volume = VIDEO_FIM.volume; el.muted = !somLigado;
    videoFundo = el; videoFimTocando = true;
    el.onended = mostrarTelaDerrota;
    el.play().catch(() => { el.muted = true; el.play().catch(mostrarTelaDerrota); });
  } else {
    somPersonagem(CASTELO, "caiu", 1, 0, 0);                  // sem vídeo: só o som do castelo caindo
    mostrarTelaDerrota();
  }
}
function sairDoOnline() {
  if (!rede) return;
  try { rede.canal.enviar({ tipo: "sair" }); rede.canal.sair(); } catch {}
  rede = null;
}
function recomecar() {
  if (rede && !fim) sairDoOnline();
  for (const q in VIDEOS_FIM) { VIDEOS_FIM[q].el.pause(); VIDEOS_FIM[q].el.currentTime = 0; }
  videoFundo = null; videoFimTocando = false;
  novoEstado();
  espiando = false; camX = 0; transVisao.t = 1;                // volta para a sua arena
  fendas = [];
  if (pvp) comecarPvp(pvp.ladoLocal);                          // PARTIDA_PVP: recomeça a batalha
  if (loopMusica.audio) loopMusica.audio.currentTime = 0;   // música recomeça do início
  $("fim").classList.remove("on", "venceu");
  $("btnPausa").textContent = "Pausar";
  mostrarBuffer();
}

addEventListener("keydown", e => {
  if (!INTRO.jogando) return;                                       // menu aberto: as teclas são do menu
  if (e.target === elEntrada || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.tagName === "BUTTON" && (e.key === "Enter" || e.key === " ")) return;
  if (e.shiftKey && /^Digit[1-9]$/.test(e.code)) {                  // Shift + 1 a 5: escolhe o card de monstro
    clicarMonstro(+e.code.slice(5) - 1, "teclado"); e.preventDefault(); return;
  }
  const k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  let usado = true;
  if (k === "Escape" && espiando) espiar(false);                             // sai da arena inimiga
  else if (k === "Escape") { buffer = ""; paAtiva = false; modoSel = modoM ? "monstro" : "guerreiro"; }
  else if (k === "P") alternarPausa();
  else if (k === "M") alternarSom();
  else if (k === "F") alternarTelaCheia();
  else if (k === "H") alternarMao();                                       // mostra ou esconde as cartas grandes embaixo
  else if (k === "Q") alternarMao();                                       // abre/guarda as cartas grandes embaixo
  else if (k === " ") agendar({ tipo: "orbes", lado: ladoQueJoga() });
  else if (buffer === "") {
    if (LINHAS.includes(k) && k.length === 1) buffer = k;
    else if (k === "Z") buffer = "Z";
    else if (k === "X") paAtiva = !paAtiva;                                   // liga ou desliga a pá
    else if (modoM && /^[1-9]$/.test(k)) clicarMonstro(+k - 1, "teclado");     // modo Monsters: 1 a 6 escolhem o monstro
    else if (/^[1-9]$/.test(k) && +k <= cartas.length) { cartaSel = +k - 1; paAtiva = false; modoSel = "guerreiro"; }   // escolhe o card
    else usado = false;
  } else if (buffer === "Z") {
    if (LINHAS.includes(k) && k.length === 1) { executarComando("Z" + k, "teclado"); buffer = ""; }
    else if (k !== "Z") buffer = "";
  } else {
    if (/^[1-9]$/.test(k)) { executarComando(buffer + k, "teclado"); buffer = ""; }
    else if (LINHAS.includes(k) && k.length === 1) buffer = k;
    else if (k === "Z") buffer = "Z";
    else buffer = "";
  }
  if (usado) e.preventDefault();
  mostrarBuffer();
});

function enviarCampo() {
  const v = elEntrada.value.trim();
  if (!v) return;
  executarComando(v, "campo");
  elEntrada.value = "";
}
elEntrada.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); enviarCampo(); } });
$("btnEnviar").addEventListener("click", enviarCampo);
$("btnPausa").addEventListener("click", alternarPausa);
$("btnSom").addEventListener("click", alternarSom);
$("btnOndas").addEventListener("click", () => {
  ondas = !ondas;
  $("btnOndas").textContent = ondas ? "Campanha: ligada" : "Campanha: desligada";
  $("btnOndas").setAttribute("aria-pressed", String(ondas));
});
$("btnLimpar").addEventListener("click", () => {
  plantas = []; criaturas = []; tiros = []; orbes = []; explosoes = []; portais = []; ondasTerra = []; ondasOssos = [];
  grade = Array.from({ length: G.rows }, () => Array(G.cols).fill(null));
});
$("btnRecomecar").addEventListener("click", recomecar);
$("btnRecomecar2").addEventListener("click", recomecar);
// botão "Menu": para o jogo e abre o menu (lá tem "Continuar")
if ($("btnMenu")) $("btnMenu").addEventListener("click", () => { if (window.INTRO_ABRIR_MENU) window.INTRO_ABRIR_MENU(); });
cv.addEventListener("click", e => {
  const b = cv.getBoundingClientRect();
  const x = (e.clientX - b.left) * W / b.width, y = (e.clientY - b.top) * H / b.height;
  // ESPIAR: clique na barra do castelo inimigo para ver a arena dele; na do seu castelo para voltar
  if (BARRAS.inimigo && naBarra(x, y, BARRAS.inimigo)) { espiar(!espiando); return; }
  if (BARRAS.meu && naBarra(x, y, BARRAS.meu) && espiando) { espiar(false); return; }
  if (espiando) return;                                        // espiando: não coloca nada
  const mw = paraMundo(x, y);                                   // onde o clique cai no jogo (com zoom)
  // 1) energia no chão ou caindo
  for (let i = orbes.length - 1; i >= 0; i--) {
    const p = posOrbe(orbes[i]);
    if (orbes[i].lado && orbes[i].lado !== ladoQueJoga()) continue;   // PvP: só dá para pegar a energia da sua arena
    if (orbes[i].estado !== "coletando" && Math.hypot(p.x - mw.x, p.y - mw.y) < 34 / Math.max(1, cam.z * .8)) { if (!pausado && !fim) agendar({ tipo: "orbe", id: orbes[i].id }); return; }
  }
  // 0) botão de energia / cartas grandes embaixo
  const am = alvoMao(x, y);
  if (am) {
    if (am.tipo === "botao") alternarMao();
    else if (am.tipo === "pa") paAtiva = !paAtiva;
    else if (modoM) { clicarMonstro(am.i, "clique"); mao.aberta = false; }
    else { cartaSel = am.i; paAtiva = false; modoSel = "guerreiro"; pendenteSel = null; mao.aberta = false; }   // escolheu: as cartas se escondem
    return;
  }
  // 1b) lista de presentes: escolhe um para você mesmo colocar (clique de novo para desmarcar)
  for (const ch of chipsPendentes) if (x >= ch.x && x <= ch.x + ch.w && y >= ch.y && y <= ch.y + ch.h) {
    pendenteSel = pendenteSel === ch.pend ? null : ch.pend; paAtiva = false; modoSel = "guerreiro"; return;
  }
  // 2) barra de cima: cards, pá e monstros
  const alvo = alvoHUD(x, y);
  if (alvo) {
    if (alvo.tipo === "aba") alternarBarra();
    else if (alvo.tipo === "guerreiro") { cartaSel = alvo.i; paAtiva = false; modoSel = "guerreiro"; }
    else if (alvo.tipo === "pa") paAtiva = !paAtiva;
    else clicarMonstro(alvo.i, "clique");
    return;
  }
  if (y < G.top && cam.z <= 1.001) return;
  // 3) campo (posição no jogo, considerando o zoom)
  const wx = mw.x, wy = mw.y;
  if (wy < G.top || wy >= G.bottom) return;
  const r = Math.floor((wy - G.top) / G.ch);
  if (wx >= G.left && wx < G.right) {
    const c = Math.floor((wx - G.left) / G.cw);
    if (grade[r][c] && !paAtiva && modoSel !== "monstro" && !pendenteSel && !pausado && !fim) {
      // 1 clique = evoluir · 2 cliques rápidos = tirar o guerreiro da arena
      if (cliqueGuerreiro && cliqueGuerreiro.r === r && cliqueGuerreiro.c === c) {
        clearTimeout(cliqueGuerreiro.timer); cliqueGuerreiro = null;
        agendar({ tipo: "remover", r, c, rotulo: LINHAS[r] + (c + 1), origem: "clique" });
      } else {
        if (cliqueGuerreiro) clearTimeout(cliqueGuerreiro.timer);
        const alvo = { r, c };
        alvo.timer = setTimeout(() => { cliqueGuerreiro = null; if (grade[r][c]) agendar({ tipo: "evoluir", r, c, origem: "clique" }); }, DUPLO_CLIQUE_MS);
        cliqueGuerreiro = alvo;
      }
      return;
    }
    executarComando(LINHAS[r] + (c + 1), "clique");
  }
  else if (wx >= G.right && wx < W && !modoM) executarComando("Z" + LINHAS[r], "clique");
});

// Card de monstro: escolhe o monstro; depois o clique no gramado coloca ele na casa (igual aos guerreiros)
function clicarMonstro(i, origem) {
  const id = MONSTROS_CARTAS[i];
  if (!id) { registrar(origem, "Este card de monstro ainda está vazio", false); return; }
  if (!PERSONAGENS[id].anims.andar.ok) { registrar(origem, `A imagem do ${PERSONAGENS[id].nome} não carregou`, false); return; }
  monstroSel = i; modoSel = "monstro"; paAtiva = false;
}
cv.addEventListener("mousemove", e => {
  const b = cv.getBoundingClientRect();
  mouse.x = (e.clientX - b.left) * W / b.width; mouse.y = (e.clientY - b.top) * H / b.height; mouse.dentro = true;
  const mw = paraMundo(mouse.x, mouse.y); mouse.wx = mw.x; mouse.wy = mw.y;
  const noCampo = mouse.wx >= G.left && mouse.wx < G.right && mouse.wy >= G.top && mouse.wy < G.bottom;
  cv.style.cursor = alvoMao(mouse.x, mouse.y) ? "pointer" : paAtiva && noCampo ? "none" : alvoHUD(mouse.x, mouse.y) ? "pointer" : "default";
});
cv.addEventListener("mouseleave", () => { mouse.dentro = false; });
// botão do meio (rodinha): liga/desliga o zoom; rolar a rodinha aproxima/afasta enquanto o zoom está ligado
cv.addEventListener("mousedown", e => {
  if (e.button !== 1) return;
  e.preventDefault();                                           // não deixa o navegador entrar no modo de rolagem
  cam.ativo = !cam.ativo;
  if (cam.ativo) cam.alvo = Math.max(ZOOM.min, cam.alvo || ZOOM.entrada);
});
cv.addEventListener("auxclick", e => { if (e.button === 1) e.preventDefault(); });
cv.addEventListener("wheel", e => {
  if (!cam.ativo) return;
  e.preventDefault();
  cam.alvo = Math.min(ZOOM.max, Math.max(ZOOM.min, cam.alvo * (e.deltaY < 0 ? ZOOM.passo : 1 / ZOOM.passo)));
}, { passive: false });
$("btnOndas").textContent = ondas ? "Campanha: ligada" : "Campanha: desligada";   // começa como o MODO_TESTE mandar
$("btnOndas").setAttribute("aria-pressed", String(ondas));

// Tela cheia: tecla F liga; F de novo (ou Esc) volta
const elPalco = cv.parentElement;
function alternarTelaCheia() {
  if (document.fullscreenElement) { document.exitFullscreen(); return; }
  const pedir = elPalco.requestFullscreen || elPalco.webkitRequestFullscreen;
  if (pedir) Promise.resolve(pedir.call(elPalco)).catch(() => registrar("sistema", "O navegador não deixou abrir em tela cheia", false));
}
cv.addEventListener("contextmenu", e => e.preventDefault());   // botão direito não faz nada (tela cheia só na tecla F)
// Ajusta a resolução ao tamanho real na tela, para não ficar borrado quando o jogo cresce
function ajustarResolucao() {
  const b = cv.getBoundingClientRect();
  if (!b.width) return;
  const k = Math.min(3, Math.max(1, b.width * (window.devicePixelRatio || 1) / W));
  if (Math.abs(k - dpr) > .01) { dpr = k; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
}
addEventListener("resize", () => requestAnimationFrame(ajustarResolucao));
document.addEventListener("fullscreenchange", () => requestAnimationFrame(ajustarResolucao));
requestAnimationFrame(ajustarResolucao);

/* ---------- Placar e laço principal ---------- */
let placarT = 0;
function atualizarPlacar() {
  $("vida").firstElementChild.style.width = vida + "%";
  $("vida").classList.toggle("baixa", vida <= 30);
  $("vidaTxt").textContent = vida;
  $("nPlantas").textContent = plantas.filter(p => !p.morte).length;
  $("nCriaturas").textContent = criaturas.filter(c => !c.morte).length;
  $("nAbatidas").textContent = abatidas;
}
let ultimo = performance.now();
/* TELA DE CARREGAMENTO: enquanto o fundo e as imagens dos personagens carregam, mostra "Carregando..."
   (nada de gramado verde de reserva) e o jogo não começa a contar o tempo. */
const carga = { pronto: false, t: 0, sumir: 1, maxEspera: 15 };
/* ---------- INTRO: carregamento, escolha do lado (Heroes ou Monsters) e menu ----------
   As telas ficam no arquivo intro.js (e o visual no index.html, bloco INTRO).
   Enquanto o menu está aberto, o jogo fica parado e não conta o tempo.
   Se o intro.js não carregar, o jogo começa direto, como era antes. */
const INTRO = { jogando: !window.INTRO_ATIVA, lado: "heroes", partida: false };
window.JOGO = {
  progresso: () => { const p = progressoCarga(); return { ...p, pronto: carga.pronto }; },
  somLigado: () => somLigado,
  alternarSom: () => { alternarSom(); return somLigado; },
  temPartida: () => INTRO.partida && !fim,
  heroisQueAndam,
  sprites: () => ({ G: GUERREIROS, P: PERSONAGENS }),   // a batalha do menu (intro.js) usa as mesmas folhas
  comecarOnline,                           // ONLINE: começa a partida contra uma pessoa (o menu chama)
  sairDoOnline,
  iniciarPvp(lado) {                       // "Batalha PvP": você contra o bot (na Parte B: contra uma pessoa)
    this.iniciar(lado, true);
  },
  iniciar(lado, comPvp) {                  // "Novo jogo": começa a campanha do zero
    pvp = comPvp ? { ladoLocal: lado } : null;
    if (!comPvp) {
      ondas = MODO_TESTE.ondasAutomaticas;
      const bo = document.getElementById("btnOndas"); if (bo) { bo.disabled = false; bo.textContent = ondas ? "Campanha: ligada" : "Campanha: desligada"; }
    }
    INTRO.lado = lado || "heroes";
    modoM = INTRO.lado === "monsters";
    MONSTROS_EM_CIMA = false;               // os cards ficam embaixo (mão de cartas), nos dois lados
    espiando = false; camX = 0; transVisao.t = 1; fendas = [];
    recomecar();
    modoSel = modoM ? "monstro" : "guerreiro"; monstroSel = 0; paAtiva = false; mao.aberta = false; BARRA.recolhida = false;
    if (modoM && !pvp) mostrarBanner("NÍVEL 1", "Coloque seus esqueletos: os heróis estão chegando!", 3.4);
    const tg = document.getElementById("tGrupo"); if (tg) { tg.value = modoM ? "monsters" : "heroes"; atualizarPainelTeste(); }
    INTRO.partida = true; INTRO.jogando = true; carga.sumir = 0; ultimo = performance.now();
    requestAnimationFrame(ajustarResolucao);
  },
  continuar() { INTRO.jogando = true; carga.sumir = 0; ultimo = performance.now(); requestAnimationFrame(ajustarResolucao); },
  pararParaMenu() { INTRO.jogando = false; }
};
function progressoCarga() {
  const imgs = [];
  for (const id in PERSONAGENS) for (const k in PERSONAGENS[id].anims) { const a = PERSONAGENS[id].anims[k]; if (!a.opcional) imgs.push(a.img); }
  for (const id in GUERREIROS) { const sp = GUERREIROS[id].sprite; if (sp) for (const k in sp.anims) imgs.push(sp.anims[k].img); }
  imgs.push(IMGS_FUNDO.heroes_dia, IMGS_FUNDO.heroes_noite);   // as arenas dos Monsters carregam enquanto o menu está aberto
  const feitas = imgs.filter(im => im && im.complete).length;       // "complete" também vale para arquivo que não existe
  return { feitas, total: imgs.length };
}
function desenharCarregando() {
  const { feitas, total } = progressoCarga(), k = total ? feitas / total : 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (carga.pronto) ctx.globalAlpha = carga.sumir;                  // some suave por cima do jogo
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#1c1328"); g.addColorStop(1, "#0b0710");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "900 54px Grandstander, 'Trebuchet MS', sans-serif";
  ctx.lineWidth = 8; ctx.strokeStyle = "rgba(0,0,0,.6)"; ctx.strokeText("Guerreiros Vs Monster", W / 2, H / 2 - 60);
  const gt = ctx.createLinearGradient(0, H / 2 - 90, 0, H / 2 - 30);
  gt.addColorStop(0, "#ffffff"); gt.addColorStop(.5, "#ffd97a"); gt.addColorStop(1, "#b8741e");
  ctx.fillStyle = gt; ctx.fillText("Guerreiros Vs Monster", W / 2, H / 2 - 60);
  const bw = 460, bx = W / 2 - bw / 2, by = H / 2 + 10;
  ctx.fillStyle = "#2a1f35"; rr(bx, by, bw, 18, 9); ctx.fill();
  const gb = ctx.createLinearGradient(bx, 0, bx + bw, 0);
  gb.addColorStop(0, "#e9b752"); gb.addColorStop(1, "#ffe7a6");
  ctx.fillStyle = gb; rr(bx, by, Math.max(18, bw * k), 18, 9); ctx.fill();
  ctx.strokeStyle = "rgba(255,217,122,.5)"; ctx.lineWidth = 1.5; rr(bx, by, bw, 18, 9); ctx.stroke();
  ctx.font = "800 16px Grandstander, 'Trebuchet MS', sans-serif"; ctx.fillStyle = "#fff4d6";
  ctx.fillText(`Carregando... ${Math.round(k * 100)}%`, W / 2, by + 44);
  ctx.globalAlpha = 1;
}
function quadro(agora) {
  const dt = Math.min(.05, (agora - ultimo) / 1000);
  ultimo = agora;
  if (!carga.pronto) {                                               // ainda carregando: não roda o jogo
    carga.t += dt;
    const { feitas, total } = progressoCarga();
    const fundoOk = imgFundo.complete && imgFundo.naturalWidth > 0 && fundoDesenhado;
    if ((feitas >= total && (fundoOk || carga.t > 3)) || carga.t > carga.maxEspera) { carga.pronto = true; carga.sumir = 1; }
    desenharCarregando();
    requestAnimationFrame(quadro);
    return;
  }
  if (!INTRO.jogando) {                                              // menu aberto: jogo parado, só a música toca
    controlarLoop(loopMusica, SONS_JOGO.musica.som, somLigado ? SONS_JOGO.musica.volume : 0, dt, 0.8, 2.5);
    for (const id in PERSONAGENS) { const per = PERSONAGENS[id]; if (per.loopObj) controlarLoop(per.loopObj, per.somAmbiente, 0, dt); }
    requestAnimationFrame(quadro);
    return;
  }
  // PASSO_FIXO: a partida anda em passos iguais de 1/60 s. A velocidade do painel de teste só muda quantos passos cabem no quadro.
  if (pausado || fim) acumulado = 0;
  else {
    acumulado += dt * TESTE.velocidade;
    let n = 0;
    while (acumulado >= PASSO && n < 30) {
      if (!podeAvancar()) { acumulado = Math.min(acumulado, PASSO * 8); break; }   // ONLINE: esperando o adversário
      passoDaPartida(); acumulado -= PASSO; n++; if (fim) break;
    }
    if (n >= 30 && !rede) acumulado = 0;                              // computador muito lento: não tenta alcançar
  }
  atualizarVisao(dt);
  atualizarMao(dt);
  desenhar();
  if (carga.sumir > 0) { carga.sumir = Math.max(0, carga.sumir - dt * 2.5); desenharCarregando(); }   // some em ~0,4 s
  atualizarAmbientes(dt);
  placarT -= dt;
  if (placarT <= 0) { atualizarPlacar(); placarT = .15; }
  requestAnimationFrame(quadro);
}
requestAnimationFrame(quadro);
if (document.fonts && document.fonts.load) document.fonts.load("800 20px Grandstander").then(() => {}).catch(() => {});
/* =====================================================================
   PARTIDA_PVP: dois lados de verdade. Os heróis de um jogador contra os monstros do outro.
   - Sem campanha: cada um coloca tropas na SUA arena, elas passam pelo portal e atacam o castelo do outro.
   - Cada lado tem a sua energia (sobe sozinha com o tempo) e as suas cartas.
   - Regras: 3 minutos; derrubou o castelo, venceu. No fim do tempo: mais vida no castelo vence;
     empate: quem derrotou mais; empate de novo: 1 minuto de prorrogação; depois disso é empate.
   - Por enquanto o outro jogador é o BOT (no mesmo computador). Na Parte B ele vira uma pessoa pela internet.
   Por dentro, a partida é SEMPRE igual nos dois aparelhos (heróis à esquerda, monstros à direita);
   quem joga de Monsters só vê a tela espelhada.
   ===================================================================== */
const PVP = {
  duracao: 180, prorrogacao: 60,                       // segundos
  preparo: 25,                                         // PREPARO: segundos para montar a arena (ninguém anda até acabar)
  energiaInicial: 150,                                 // energia de cada lado no começo
  sol: { cadaMin: 5, cadaMax: 8, valor: 25 },          // SOL_PVP: energia que cai do céu em CADA arena (você clica para pegar)
  bot: { pensaCada: [3, 6], colunas: 3, pegaEnergiaEm: 2.5 },   // o bot pensa a cada 3 a 6 s e "clica" na energia dele 2,5 s depois que ela cai
  moedas: { vitoria: 30, derrota: 10, empate: 15 }     // contra o bot (no online também valem troféus)
};
var pvp = null, energiaM = 0;
function simM() { return pvp ? false : modoM; }        // como a partida funciona por dentro (no PvP: sempre igual)
function energiaVista() { return Math.floor(pvp && modoM ? energiaM : energia); }   // a energia que aparece para você
function comecarPvp(lado) {
  pvp = { ladoLocal: lado, tempo: PVP.duracao, preparo: PVP.preparo, prorrogacao: false, mortosH: 0, botT: 4, solT: 2, vencedor: undefined };
  ondas = false;
  const bo = document.getElementById("btnOndas"); if (bo) { bo.textContent = "Campanha: desligada"; bo.disabled = true; }
  energia = PVP.energiaInicial; energiaM = PVP.energiaInicial;
  mostrarBanner("PREPARE SUA ARENA", `Pegue a energia que cai do céu e coloque suas tropas: a batalha começa em ${PVP.preparo} s`, 4);
}
function ladoBot() { return pvp.ladoLocal === "heroes" ? "monsters" : "heroes"; }
function ladoQueJoga() { return pvp ? pvp.ladoLocal : (modoM ? "monsters" : "heroes"); }
// PREPARO: tropa colocada antes da batalha fica parada na casa até o "LUTEM!"
function seguraNoPreparo(u) { if (pvp && pvp.preparo > 0 && u.vel > 0) { u.velGuardada = u.vel; u.vel = 0; u.fixo = true; } }
function soltarDoPreparo() {
  for (const u of [...plantas, ...criaturas]) if (u.velGuardada) { u.vel = u.velGuardada; u.velGuardada = 0; u.fixo = false; }
}
function linhaMaisCheia(lista) {                       // linha com mais inimigos (empate: sorteia)
  const n = Array(G.rows).fill(0); for (const r of lista) n[r]++;
  const max = Math.max(...n);
  if (max === 0) return Math.floor(rand(0, G.rows));
  const melhores = n.map((v, i) => [v, i]).filter(x => x[0] === max).map(x => x[1]);
  return melhores[Math.floor(rand(0, melhores.length))];
}
function jogadaDoBot() {
  const lado = pvp.ladoLocal === "heroes" ? "monsters" : "heroes";
  if (lado === "monsters") {
    const opcoes = MONSTROS_CARTAS.map((id, i) => ({ id, i })).filter(o => o.id && custoMonstro(o.id) <= energiaM && !((recargaM[o.id] || 0) > 0));
    if (!opcoes.length) return;
    const o = opcoes[Math.floor(rand(0, opcoes.length))];
    const r = linhaMaisCheia(plantas.filter(p => !p.morte).map(p => p.r)), c = Math.floor(rand(0, PVP.bot.colunas));
    agendar({ tipo: "monstroM", idx: o.i, r, c, origem: "bot" });
  } else {
    const opcoes = cartas.map((c, i) => ({ c, i })).filter(o => GUERREIROS[o.c.id] && GUERREIROS[o.c.id].custo <= energia && !(o.c.recarga > 0) && !(o.c.bloqueio > 0) && o.c.estoque !== 0);
    if (!opcoes.length) return;
    const o = opcoes[Math.floor(rand(0, opcoes.length))];
    const r = linhaMaisCheia(criaturas.filter(c => !c.morte).map(c => c.r));
    const livres = []; for (let c = 0; c < PVP.bot.colunas; c++) if (!grade[r][c]) livres.push(c);
    if (!livres.length) return;
    const c = livres[Math.floor(rand(0, livres.length))];
    agendar({ tipo: "colocar", carta: o.i, r, c, rotulo: LINHAS[r] + (c + 1), origem: "bot" });
  }
}
function atualizarPvp(dt) {
  if (!pvp || fim) return;
  // SOL_PVP: cai energia do céu nas DUAS arenas (cada um pega a sua clicando)
  pvp.solT -= dt;
  if (pvp.solT <= 0) {
    pvp.solT = rand(PVP.sol.cadaMin, PVP.sol.cadaMax);
    const xh = rand(G.left + 40, G.right - 40), xm = MW - rand(G.left + 40, G.right - 40);
    criarOrbe(xh, -40, rand(G.top + 30, G.bottom - 30), PVP.sol.valor, false, "heroes");
    criarOrbe(xm, -40, rand(G.top + 30, G.bottom - 30), PVP.sol.valor, false, "monsters");
  }
  const bl = ladoBot();                                              // o bot "clica" na energia dele
  if (!rede) for (const o of orbes) if (o.lado === bl && o.estado === "parado" && o.vida >= PVP.bot.pegaEnergiaEm) coletar(o);
  if (!rede) {                                                       // BOT (só quando não é online)
    pvp.botT -= dt;
    if (pvp.botT <= 0) { pvp.botT = rand(PVP.bot.pensaCada[0], PVP.bot.pensaCada[1]); jogadaDoBot(); }
  }
  if (pvp.preparo > 0) {                                             // PREPARO: o relógio da batalha ainda não anda
    pvp.preparo -= dt;
    if (pvp.preparo <= 0) { soltarDoPreparo(); mostrarBanner("LUTEM!", "Derrube o castelo inimigo em 3 minutos", 2.4); }
    return;
  }
  pvp.tempo -= dt;
  if (vida <= 0 || vidaInimigo <= 0) return encerrarPvp(vida <= 0 ? "monsters" : "heroes");
  if (pvp.tempo <= 0) {
    if (Math.abs(vida - vidaInimigo) > .01) return encerrarPvp(vida > vidaInimigo ? "heroes" : "monsters");
    if (abatidas !== pvp.mortosH) return encerrarPvp(abatidas > pvp.mortosH ? "heroes" : "monsters");
    if (!pvp.prorrogacao) { pvp.prorrogacao = true; pvp.tempo = PVP.prorrogacao; mostrarBanner("PRORROGAÇÃO!", "Mais 1 minuto", 2.6); return; }
    return encerrarPvp(null);
  }
}
function encerrarPvp(vencedor) {
  fim = true; pvp.vencedor = vencedor;
  const eu = pvp.ladoLocal, venceu = vencedor === eu, empate = vencedor === null;
  const minha = eu === "heroes" ? vida : vidaInimigo, deles = eu === "heroes" ? vidaInimigo : vida;
  const meus = eu === "heroes" ? abatidas : pvp.mortosH, delesK = eu === "heroes" ? pvp.mortosH : abatidas;
  let ganho = 0;
  if (rede) setTimeout(() => finalizarOnline(vencedor), 0);
  else if (window.PERFIL) { const r = PERFIL.ganharMoedas(venceu ? PVP.moedas.vitoria : empate ? PVP.moedas.empate : PVP.moedas.derrota, eu); ganho = r.ganho + (r.duplo || 0); }
  $("fimTitulo").textContent = venceu ? "VITÓRIA!" : empate ? "EMPATE" : "DERROTA";
  $("fimTxt").textContent = `Seu castelo: ${Math.ceil(minha)} · Castelo inimigo: ${Math.ceil(deles)} · Você derrotou ${meus} e perdeu ${delesK}.` +
    (ganho ? ` 🪙 +${ganho} moedas.` : "");
  $("fim").classList.toggle("venceu", venceu); $("fim").classList.add("on");
  if (venceu) tocar(SONS_JOGO.proximoNivel.som, SONS_JOGO.proximoNivel.volume, 0, 0);
  else if (!empate) somPersonagem(CASTELO, "caiu", 1, 0, 0);
}
function textoPvp() {                                    // o que aparece na barra do castelo durante o PvP
  if (pvp.preparo > 0) return `Preparo ${Math.ceil(pvp.preparo)}s`;
  const t = Math.max(0, Math.ceil(pvp.tempo)), mm = Math.floor(t / 60), ss = String(t % 60).padStart(2, "0");
  const meus = pvp.ladoLocal === "heroes" ? abatidas : pvp.mortosH, deles = pvp.ladoLocal === "heroes" ? pvp.mortosH : abatidas;
  return `${pvp.prorrogacao ? "+" : "⏱"} ${mm}:${ss} · ⚔ ${meus} x ${deles}`;
}
function esperandoAdversario() { return rede && rede.esperandoDesde && performance.now() - rede.esperandoDesde > 600;
}

/* =====================================================================
   ONLINE (lockstep): os dois aparelhos rodam a MESMA partida e só trocam as ações.
   - A partida anda em TURNOS de 15 passos (0,25 s). A cada turno cada um manda as suas ações.
   - Uma ação vale ATRASO turnos depois (4 turnos = 1 s, o tempo do portal): dá tempo de chegar no outro.
   - Só se simula um turno quando as ações do adversário para ele já chegaram (se atrasar, o jogo espera).
   - No fim, os dois mandam o resultado e a "foto" da partida para o servidor: troféus só valem se baterem.
   ===================================================================== */
const ONLINE = { turno: 15, atraso: 4, desisteEm: 20, pedeDeNovoEm: 0.5, repete: 2 };   // repete = cada mensagem leva também os 2 turnos anteriores (se uma se perder, a próxima cobre)
var rede = null;
function onlineAtivo() { return !!rede; }
function turnoDe(passo) { return Math.floor(passo / ONLINE.turno); }
function mensagemRede(m) {                                   // chegou algo do adversário
  if (!rede) return;
  rede.vistoEm = performance.now();
  if (m.tipo === "turno") {
    for (const [t, acoes] of [[m.t, m.acoes], ...(m.ant || [])]) {
      if (rede.recebidos.has(t)) continue;
      rede.recebidos.set(t, true);
      for (const a of acoes) if (acaoDoLado(a, rede.ladoOutro)) filaAcoes.push({ ...a, lado: rede.ladoOutro });
    }
  } else if (m.tipo === "pedir") {                           // o outro perdeu algum turno: mando de novo
    for (const [t, acoes] of rede.enviados) if (t >= m.t) rede.canal.enviar({ tipo: "turno", t, acoes });
  } else if (m.tipo === "sair") {
    rede.saiu = true;
  }
}
// segurança: cada lado só mexe nas tropas dele
function acaoDoLado(a, lado) {
  if (a.tipo === "colocar" || a.tipo === "evoluir" || a.tipo === "remover") return lado === "heroes";
  if (a.tipo === "monstroM") return lado === "monsters";
  if (a.tipo === "orbe" || a.tipo === "orbes") return true;
  return false;
}
function enviarTurno(t) {
  if (rede.enviados.has(t)) return;
  const acoes = rede.minhas.filter(a => turnoDe(a.passo) === t).map(({ origem, ...a }) => a);
  rede.minhas = rede.minhas.filter(a => turnoDe(a.passo) !== t);
  rede.enviados.set(t, acoes);
  const ant = [];
  for (let k = 1; k <= ONLINE.repete; k++) if (rede.enviados.has(t - k)) ant.push([t - k, rede.enviados.get(t - k)]);
  rede.canal.enviar({ tipo: "turno", t, acoes, ant });
}
// antes de cada passo: no começo de um turno, fecha o turno que já não recebe mais ações e confere se o do outro chegou
function podeAvancar() {
  if (!rede) return true;
  const s = passoN, t = turnoDe(s);
  if (s % ONLINE.turno === 0) enviarTurno(t + ONLINE.atraso - 1);
  if (rede.recebidos.has(t)) { rede.esperandoDesde = 0; return true; }
  const agora = performance.now();
  if (!rede.esperandoDesde) rede.esperandoDesde = agora;
  const esperou = (agora - rede.esperandoDesde) / 1000;
  if (esperou > ONLINE.pedeDeNovoEm && agora - (rede.pediuEm || 0) > 1000) { rede.pediuEm = agora; rede.canal.enviar({ tipo: "pedir", t }); }
  if (rede.saiu || esperou > ONLINE.desisteEm) abandonoDoOutro();
  return false;
}
function abandonoDoOutro() {
  if (fim || !pvp) return;
  rede.wo = true;
  encerrarPvp(pvp.ladoLocal);                                // o outro sumiu: você fica com a vitória na tela...
  $("fimTxt").textContent = "O adversário saiu da partida. Ela não vale troféus (os dois precisam confirmar o resultado).";
}
// começa uma partida online (chamado pelo menu, depois que o servidor achou a sala)
async function comecarOnline(info) {
  const lado = info.lado, outro = lado === "heroes" ? "monsters" : "heroes";
  sairDoOnline();
  const canal = await window.CONTA.entrarSala(info.id, m => mensagemRede(m));
  window.JOGO.iniciarPvp(lado);                              // mesma partida PvP, mas sem bot
  rede = { sala: info.id, ladoLocal: lado, ladoOutro: outro, recebidos: new Map(), enviados: new Map(), minhas: [],
           esperandoDesde: 0, canal: null, saiu: false, wo: false, vistoEm: performance.now(),
           niveis: { heroes: info.niveis_heroes || {}, monsters: info.niveis_monsters || {} },
           nomeOutro: info["nome_" + outro] || "Adversário" };
  rede.canal = canal;
  novaSemente(Number(info.semente));                         // a MESMA semente nos dois aparelhos
  for (let t = 0; t < ONLINE.atraso - 1; t++) enviarTurno(t);   // os primeiros turnos não têm ações
  mostrarBanner("PREPARE SUA ARENA", `Você contra ${rede.nomeOutro}. A batalha começa em ${PVP.preparo} s`, 4);
  registrar("online", `Partida online contra ${rede.nomeOutro} (você é ${lado === "heroes" ? "Heroes" : "Monsters"})`, true);
}
// fim da partida online: manda o resultado e espera o do outro (até ~20 s)
async function finalizarOnline(vencedor) {
  const r = rede; if (!r || r.finalizando) return;
  r.finalizando = true;
  const resumo = r.wo ? "wo" : fotoDaPartida().resumo;
  try { r.canal.enviar({ tipo: "sair" }); } catch {}
  let sala = null;
  try {
    sala = await window.CONTA.rpc("finalizar_pvp", { p_sala: r.sala, p_vencedor: vencedor || "empate", p_resumo: resumo });
    for (let i = 0; i < 10 && sala && !sala.finalizada; i++) { await new Promise(ok => setTimeout(ok, 2000)); sala = await window.CONTA.rpc("ver_sala", { p_sala: r.sala }); }
  } catch (e) { console.error(e); }
  try { r.canal.sair(); } catch {}
  if (rede === r) rede = null;
  if (window.PERFIL && PERFIL.recarregar) await PERFIL.recarregar();
  if (!sala || !sala.finalizada) $("fimTxt").textContent += " (O resultado ainda não foi confirmado pelo adversário.)";
  else if (sala.vencedor === "divergente") $("fimTxt").textContent += " ⚠ Os dois aparelhos viram partidas diferentes: não valeu troféus.";
  else {
    const venci = sala.vencedor === r.ladoLocal, emp = sala.vencedor === "empate";
    $("fimTxt").textContent += venci ? " 🏆 +30 troféus · 🪙 +50 moedas" : emp ? " 🪙 +25 moedas" : " 🏆 −20 troféus · 🪙 +15 moedas";
  }
}

/* =====================================================================
   PASSO_FIXO e TESTE_DETERMINISMO (preparação do PvP online)
   - A partida anda sempre em passos de 1/60 s (PASSO), não importa a velocidade do computador.
   - Cada partida tem uma SEMENTE: com a mesma semente e as mesmas ações nos mesmos passos,
     o resultado é idêntico (testado pelo botão "Testar determinismo" no painel de teste).
   ===================================================================== */
const PASSO = 1 / 60;
var acumulado = 0, passoN = 0, sementePartida = 0;   // (var: o novoEstado usa antes desta linha)
function novaSemente(s) {                                   // começa a sorte da partida (no online, os dois usam a mesma)
  sementePartida = (s ?? Math.floor(Math.random() * 4294967296)) >>> 0;
  semearSorte(sementePartida); passoN = 0; acumulado = 0;
  filaAcoes = []; historicoAcoes = []; proxIdOrbe = 1; partidaComTeste = false;
  inicioPartida = { nivelG: { ...nivelG }, energiaInfinita: MODO_TESTE.energiaInfinita, semRecarga: MODO_TESTE.semRecarga };
}
var inicioPartida = null;
/* ---------- FILA_ACOES: tudo o que o jogador faz vira uma AÇÃO com o número do passo ----------
   Ex.: { passo: 340, tipo: "colocar", carta: 1, r: 2, c: 1 }. O jogo só aplica quando chega naquele passo.
   No online, é esta lista que os dois aparelhos trocam (e o ATRASO vira ~60 passos = 1 s, o tempo do portal). */
const ATRASO_ACAO = 1;                                       // passos entre pedir e acontecer (aqui: o próximo passo)
var filaAcoes = [], historicoAcoes = [], proxIdOrbe = 1, partidaComTeste = false;
var seqAcao = 0;
function agendar(acao) {
  if (fim) return false;
  acao.seq = ++seqAcao;
  if (rede) {                                                // ONLINE: vale 1 s depois e vai para o adversário
    if (!acaoDoLado(acao, rede.ladoLocal)) return false;
    acao.lado = rede.ladoLocal;
    acao.passo = passoN + ONLINE.turno * ONLINE.atraso;
    rede.minhas.push(acao);
  } else acao.passo = passoN + ATRASO_ACAO;
  filaAcoes.push(acao);
  return true;
}
function aplicarAcoesDoPasso() {
  if (!filaAcoes.length) return;
  const agora = filaAcoes.filter(a => a.passo <= passoN);
  if (!agora.length) return;
  filaAcoes = filaAcoes.filter(a => a.passo > passoN);
  agora.sort((a, b) => a.passo - b.passo || (a.lado === b.lado ? 0 : a.lado === "heroes" ? -1 : 1) || (a.seq || 0) - (b.seq || 0));
  for (const a of agora) { historicoAcoes.push(a); aplicarAcao(a); }
}
function aplicarAcao(a) {
  const origem = a.origem || "teclado";
  if (a.tipo === "colocar") { const res = tentarColocar(a.carta, a.r, a.c, a.rotulo); registrar(origem, res.msg, res.ok); }
  else if (a.tipo === "remover") { const res = removerGuerreiro(a.r, a.c, a.rotulo); registrar(origem, res.msg, res.ok); }
  else if (a.tipo === "evoluir") { if (grade[a.r][a.c]) evoluirNoCampo(a.r, a.c, origem); }
  else if (a.tipo === "monstroM") colocarMonstroModoM(a.idx, a.r, a.c, origem);
  else if (a.tipo === "monstroZ") {
    const c = soltarCriatura(a.r, a.id, a.col != null ? celX(a.col) : null);
    aplicarNivelMonstro(c, nivelDosMonstros());
    registrar(origem, `${c.tipo ? PERSONAGENS[c.tipo].nome : "Lodoso"} ${a.col != null ? "apareceu em " + a.rotulo : "entrou na linha " + a.rotulo}`, true);
  }
  else if (a.tipo === "orbe") { const o = orbes.find(o => o.id === a.id); if (o && (!o.lado || !a.lado || o.lado === a.lado)) coletar(o); }
  else if (a.tipo === "orbes") coletarTudo(a.lado);
}
function passoDaPartida() {                                 // UM passo da partida (sempre igual em qualquer aparelho)
  aplicarAcoesDoPasso();                                    // FILA_ACOES: primeiro as ações marcadas para este passo
  atualizar(PASSO);
  atualizarFendas(PASSO);
  atualizarPvp(PASSO);                                      // PARTIDA_PVP: energia, tempo, bot e fim
  passoN++;
}
// "foto" da partida: tudo o que importa para saber se dois aparelhos estão iguais
function fotoDaPartida() {
  const n = v => Math.round(v * 1000) / 1000;
  const dados = {
    passo: passoN, vida: n(vida), vidaInimigo: n(vidaInimigo), energia: n(energia), abatidas, tempo: n(tempo),
    camp: [camp.nivel, camp.fase, camp.onda, camp.fila.length],
    plantas: plantas.map(p => [p.tipo, p.r, n(p.x), n(p.hp), n(p.morte || 0)]),
    criaturas: criaturas.map(c => [c.tipo, c.r, n(c.x), n(c.hp), n(c.morte || 0)]),
    tiros: tiros.length, orbes: orbes.length, sorte: estadoSorte,
    pvp: pvp ? [n(pvp.tempo), n(energiaM), pvp.mortosH, pvp.vencedor === undefined ? "-" : String(pvp.vencedor)] : null
  };
  const txt = JSON.stringify(dados);
  let h = 2166136261;                                         // resumo curto (FNV-1a) para comparar fácil
  for (let i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 16777619); }
  return { resumo: (h >>> 0).toString(16), dados };
}
// roda uma partida "de mentira" bem rápido, com ações marcadas por passo, e devolve a foto do final
function simularPartida(semente, acoes, passos, mexerNaTela) {
  novoEstado(); fendas = []; recargaM = {};
  novaSemente(semente);
  for (const a of acoes) filaAcoes.push({ ...a });             // as ações entram na fila com o passo marcado
  for (let i = 0; i < passos && !fim; i++) {
    passoDaPartida();
    if (mexerNaTela && i % mexerNaTela === 0) desenhar();      // desenhar no meio NÃO pode mudar a partida
  }
  return fotoDaPartida();
}
/* TESTAR_REPLAY: refaz a partida que você está jogando, do começo, só com a semente e as suas ações,
   e confere se chega exatamente no mesmo lugar. É a prova de que o online vai funcionar. */
function testarReplay() {
  if (!INTRO.jogando || !inicioPartida) { registrar("teste", "Comece uma partida, jogue um pouco e depois clique aqui", false); return; }
  if (partidaComTeste) { registrar("teste", "Nesta partida você usou botões do painel de teste (eles não entram no replay). Comece uma partida nova e jogue só pelo jogo.", false); return; }
  if (fim) { registrar("teste", "A partida já acabou. Comece outra e teste antes do fim.", false); return; }
  const alvo = passoN, antes = fotoDaPartida(), semente = sementePartida, ini = inicioPartida;
  // as jogadas do BOT não entram: ele pensa de novo, igualzinho, durante o replay
  const feitas = historicoAcoes.filter(a => a.origem !== "bot").map(a => ({ ...a })), pendentesFila = filaAcoes.filter(a => a.origem !== "bot").map(a => ({ ...a }));
  const guardar = { registrar, mostrarBanner, terminar, som: somLigado };
  registrar = () => {}; mostrarBanner = () => {}; terminar = () => { fim = true; }; somLigado = false;
  const t0 = performance.now();
  try {
    Object.assign(nivelG, ini.nivelG); MODO_TESTE.energiaInfinita = ini.energiaInfinita; MODO_TESTE.semRecarga = ini.semRecarga;
    novoEstado(); fendas = []; recargaM = {};
    novaSemente(semente);
    if (pvp) comecarPvp(pvp.ladoLocal);
    filaAcoes = feitas;
    while (passoN < alvo && !fim) passoDaPartida();
    filaAcoes = filaAcoes.concat(pendentesFila);
  } finally {
    registrar = guardar.registrar; mostrarBanner = guardar.mostrarBanner; terminar = guardar.terminar; somLigado = guardar.som;
  }
  const depois = fotoDaPartida(), ok = antes.resumo === depois.resumo;
  registrar("teste", ok ? `Replay OK: refiz ${Math.round(alvo / 60)} s de partida com ${feitas.length} ações e deu exatamente igual (${Math.round(performance.now() - t0)} ms)`
                        : `Replay FALHOU: ${antes.resumo} x ${depois.resumo} (veja F12 > Console)`, ok);
  if (!ok) console.log("Replay diferente:", antes.dados, depois.dados);
}
function testarDeterminismo() {
  const guardar = { registrar, mostrarBanner, terminar, som: somLigado, energiaInf: MODO_TESTE.energiaInfinita, modoM, campanha: ondas };
  registrar = () => {}; mostrarBanner = () => {}; terminar = () => { fim = true; };   // sem avisos, sons e vídeo durante o teste
  somLigado = false; MODO_TESTE.energiaInfinita = true; modoM = false; ondas = true;
  const semente = Math.floor(Math.random() * 4294967296) >>> 0, passos = 60 * 90;   // 90 segundos de partida
  const pos = (i, r, c) => ({ passo: i, tipo: "colocar", carta: i % 3 === 0 ? 1 : i % 3 === 1 ? 2 : 6, r, c, rotulo: "T", origem: "teste" });
  const acoes = [pos(30, 0, 1), pos(200, 2, 1), pos(420, 4, 2), pos(900, 1, 0), pos(1500, 3, 3), pos(2400, 2, 4),
                 { passo: 600, tipo: "monstroZ", id: MONSTROS_CARTAS[0], r: 2, col: null, rotulo: "C", origem: "teste" },
                 { passo: 1800, tipo: "monstroZ", id: MONSTROS_CARTAS[2], r: 0, col: null, rotulo: "A", origem: "teste" },
                 { passo: 2000, tipo: "orbes" }];
  let a, b, c, erro = null;
  try {
    a = simularPartida(semente, acoes, passos, 0);
    b = simularPartida(semente, acoes, passos, 0);
    c = simularPartida(semente, acoes, passos, 7);              // a terceira desenha a tela no meio
  } catch (e) { erro = e; }
  registrar = guardar.registrar; mostrarBanner = guardar.mostrarBanner; terminar = guardar.terminar;
  somLigado = guardar.som; MODO_TESTE.energiaInfinita = guardar.energiaInf; modoM = guardar.modoM; ondas = guardar.campanha;
  recomecar();
  if (erro) { registrar("teste", "Teste de determinismo deu erro: " + erro.message, false); console.error(erro); return false; }
  const ok = a.resumo === b.resumo && b.resumo === c.resumo;
  const d = a.dados, info = `${d.plantas.length} guerreiros, ${d.criaturas.length} monstros, ${d.abatidas} derrotados, nível ${d.camp[0]}`;
  registrar("teste", ok ? `Determinismo OK: 3 partidas de 90 s iguais (${info}; resumo ${a.resumo})`
                        : `Determinismo FALHOU: ${a.resumo} / ${b.resumo} / ${c.resumo} (veja F12 > Console)`, ok);
  if (!ok) console.log("Partidas diferentes:", a.dados, b.dados, c.dados);
  return ok;
}

/* =====================================================================
   PAINEL_TESTE: "Teste de personagens", embaixo dos comandos do jogo.
   Energia infinita, sem recarga, velocidade do jogo e colocar qualquer personagem dos dois grupos
   (Heroes e Monsters), na sua arena ou vindo do castelo inimigo. As escolhas ficam salvas no navegador.
   ===================================================================== */
const TESTE = { velocidade: 1 };
try {
  const t = JSON.parse(localStorage.getItem("hvm_teste") || "null");
  if (t) { MODO_TESTE.energiaInfinita = !!t.energiaInfinita; MODO_TESTE.semRecarga = !!t.semRecarga; TESTE.velocidade = t.velocidade || 1; }
} catch {}
function salvarTeste() {
  try { localStorage.setItem("hvm_teste", JSON.stringify({ energiaInfinita: MODO_TESTE.energiaInfinita, semRecarga: MODO_TESTE.semRecarga, velocidade: TESTE.velocidade })); } catch {}
}
// herói andando controlado pelo jogo (modo Monsters), com tipo, linha, nível e lugar escolhidos
function soltarHeroiTeste(tipo, r, lv, x, inimigo = true) {
  const g = GUERREIROS[tipo], mult = multNivel(lv), vidaN = Math.round(g.vida * mult * (inimigo ? MODO_MONSTERS.vidaHerois : 1));
  const anda = !!(g.andar && g.andar.ok);
  const cfg = { ...MODO_MONSTERS.andar.padrao, ...(MODO_MONSTERS.andar[tipo] || {}) };
  const p = {
    r, c: -1, tipo, nivel: lv, mult, x, y: chaoY(r), inimigo, hp: vidaN, max: vidaN, idade: 0, nasc: 1, cd: .5,
    recuo: 0, flash: 0, piscar: rand(2, 5), piscT: 0, morte: 0, semente: rand(0, 10), gerT: 0, brilho: 0,
    andante: anda, andando: anda, vel: cfg.velocidade * rand(.94, 1.06), tAndar: rand(0, 3)
  };
  plantas.push(p);
  return p;
}
function aplicarNivelHeroi(p, lv) {
  const g = GUERREIROS[p.tipo], m = multNivel(lv);
  p.nivel = lv; p.mult = m; p.hp = p.max = Math.round(g.vida * m);
}
function matarHeroiTeste(p) {
  if (p.morte) return;
  p.hp = 0; p.morte = 0.001; p.atacando = false;
  if (grade[p.r] && grade[p.r][p.c] === p) grade[p.r][p.c] = null;
}
// o que cada botão faz, de acordo com o seu lado
function testeColocar(onde) {
  partidaComTeste = true;
  const $t = id => document.getElementById(id);
  const grupo = $t("tGrupo").value, tipo = $t("tPersonagem").value, r = LINHAS.indexOf($t("tLinha").value);
  const col = +$t("tColuna").value - 1, lv = Math.max(1, Math.min(NIVEIS.max, +$t("tNivel").value || 1));
  const meuGrupo = modoM ? "monsters" : "heroes", pos = LINHAS[r] + (col + 1);
  if (!INTRO.jogando || fim) { registrar("teste", "Comece uma partida primeiro (Menu > Novo jogo)", false); return; }
  if (onde === "casa") {                                       // QUALQUER grupo em QUALQUER arena
    const arena = $t("tArena").value;
    const visto = arena === "minha" ? celX(col) : MW - celX(col);  // na arena inimiga a coluna 1 fica junto do castelo dela
    const x = modoM ? MW - visto : visto;                          // posição no jogo
    if (grupo === "heroes") {
      if (!modoM && arena === "minha") {                           // sua arena no lado Heroes: usa a casa de verdade
        if (!plantar(r, col, tipo)) { registrar("teste", `${pos} já está ocupada`, false); return; }
        aplicarNivelHeroi(plantas[plantas.length - 1], lv);
      } else soltarHeroiTeste(tipo, r, lv, x, modoM);
    } else {
      const c = soltarCriatura(r, tipo, x); aplicarNivelMonstro(c, lv); c.surgir = 1;
    }
    if (arena === "minha") efeitosCelula.push({ r, c: col, t: 0, bom: true });
    registrar("teste", `${nomeTeste(grupo, tipo)} (nível ${lv}) colocado em ${pos} na ${arena === "minha" ? "sua arena" : "arena inimiga"}`, true);
    return;
  }
  if (grupo === meuGrupo) { registrar("teste", "Esse grupo é o seu: use \"Colocar na minha arena\"", false); return; }
  const entrada = onde === "entrada";
  if (grupo === "monsters") {                                  // inimigos do lado Heroes
    const x = entrada ? PORTAO_X - 6 : PORTAO_INIMIGO + 10;
    const c = soltarCriatura(r, tipo, x); aplicarNivelMonstro(c, lv);
    if (entrada) { c.atravessou = true; c.xSaida = x; abrirFenda(x + 6, c, true); }
  } else {                                                     // inimigos do lado Monsters
    if (!(GUERREIROS[tipo].andar && GUERREIROS[tipo].andar.ok)) registrar("teste", `${GUERREIROS[tipo].nome} ainda não tem a animação de andar`, false);
    const x = entrada ? MW - PORTAO_X + 6 : G.left - 30;
    const p = soltarHeroiTeste(tipo, r, lv, x);
    if (entrada) { p.atravessou = true; p.xSaida = x; abrirFenda(x - 6, p, true); }
  }
  registrar("teste", `${nomeTeste(grupo, tipo)} inimigo (nível ${lv}) ${entrada ? "entrou pelo portal" : "saiu do castelo inimigo"} na linha ${LINHAS[r]}`, true);
}
function nomeTeste(grupo, tipo) { return grupo === "heroes" ? GUERREIROS[tipo].nome : PERSONAGENS[tipo].nome; }
function testeAtalho(a) {
  if (["energia", "matar", "curar", "derrubar", "limparMeus"].includes(a)) partidaComTeste = true;
  if (a === "energia") { energia += 1000; energiaPulso = 1; registrar("teste", "+1000 de energia", true); }
  else if (a === "matar") {
    if (modoM) plantas.filter(p => p.inimigo).forEach(matarHeroiTeste);
    else for (const c of criaturas) if (!c.morte) { c.hp = 0; matarCriatura(c); }
    registrar("teste", "Todos os inimigos derrotados", true);
  } else if (a === "curar") { vida = 100; registrar("teste", "Seu castelo foi curado", true); }
  else if (a === "derrubar") { vidaInimigo = 0; registrar("teste", "Castelo inimigo derrubado", true); }
  else if (window.PERFIL && (a === "pvpVitoria" || a === "pvpDerrota")) {
    const r = PERFIL.registrarPartida(a === "pvpVitoria", "teste", modoM ? "monsters" : "heroes");
    registrar("teste", `${a === "pvpVitoria" ? "Vitória" : "Derrota"}: ${r.trofeus >= 0 ? "+" : ""}${r.trofeus} troféus, +${r.moedas} moedas · liga ${r.liga.nome}${r.subiuLiga ? " (subiu!)" : ""}`, true);
  } else if (window.PERFIL && a === "moedas") { PERFIL.ganharMoedas(100); registrar("teste", "+100 moedas", true); }
  else if (window.PERFIL && a === "trofeus") { for (let i = 0; i < 17; i++) PERFIL.registrarPartida(true, "teste"); registrar("teste", "17 vitórias de teste (+510 troféus)", true); }
  else if (a === "determinismo") testarDeterminismo();
  else if (a === "replay") testarReplay();
  else if (window.PERFIL && a === "zerarPerfil") { PERFIL.zerar(); registrar("teste", "Perfil zerado", true); }
  else if (a === "limparMeus") {
    if (modoM) for (const c of criaturas) { if (!c.morte) { c.hp = 0; matarCriatura(c); } }
    else plantas.filter(p => !p.inimigo).forEach(matarHeroiTeste);
    registrar("teste", "Suas tropas saíram da arena", true);
  }
}
function montarPainelTeste() {
  const painel = document.querySelector(".painel");
  if (!painel || document.getElementById("painelTeste")) return;
  const caixa = document.createElement("div");
  caixa.className = "caixa"; caixa.id = "painelTeste"; caixa.style.gridColumn = "1 / -1";
  const opcoes = (lista) => lista.map(([v, t]) => `<option value="${v}">${t}</option>`).join("");
  const linha = "display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin:8px 0";
  const campo = "padding:6px 8px;border-radius:8px;border:2px solid #b9a6cc;background:#fff;color:#2b2030;font:inherit";
  caixa.innerHTML = `
    <h3>Teste de personagens</h3>
    <div style="${linha}">
      <label><input type="checkbox" id="tEnergia"> Energia infinita</label>
      <label><input type="checkbox" id="tRecarga"> Sem recarga</label>
      <label>Velocidade do jogo
        <select id="tVelocidade" style="${campo}">${opcoes([["0.5", "0,5x (devagar)"], ["1", "1x (normal)"], ["2", "2x"], ["4", "4x"]])}</select></label>
    </div>
    <div style="${linha}">
      <label>Grupo <select id="tGrupo" style="${campo}">${opcoes([["heroes", "Heroes"], ["monsters", "Monsters"]])}</select></label>
      <label>Personagem <select id="tPersonagem" style="${campo}"></select></label>
      <label>Linha <select id="tLinha" style="${campo}">${opcoes([...LINHAS].slice(0, G.rows).map(l => [l, l]))}</select></label>
      <label>Coluna <select id="tColuna" style="${campo}">${opcoes(Array.from({ length: G.cols }, (_, i) => [i + 1, i + 1]))}</select></label>
      <label>Arena <select id="tArena" style="${campo}">${opcoes([["minha", "Minha arena"], ["inimiga", "Arena inimiga"]])}</select></label>
      <label>Nível <input id="tNivel" type="number" min="1" max="${NIVEIS.max}" value="1" style="${campo};width:70px"></label>
    </div>
    <div class="botoes">
      <button id="tMinha">Colocar na casa escolhida</button>
      <button id="tCastelo">Inimigo: sair do castelo dele</button>
      <button id="tEntrada">Inimigo: entrar pelo portal</button>
    </div>
    <div class="botoes">
      <button data-atalho="energia">+1000 energia</button>
      <button data-atalho="matar">Derrotar inimigos</button>
      <button data-atalho="limparMeus">Tirar minhas tropas</button>
      <button data-atalho="curar">Curar meu castelo</button>
      <button data-atalho="derrubar">Derrubar castelo inimigo</button>
    </div>
    <div class="botoes">
      <button data-atalho="pvpVitoria">Simular vitória PvP</button>
      <button data-atalho="pvpDerrota">Simular derrota PvP</button>
      <button data-atalho="moedas">+100 moedas</button>
      <button data-atalho="trofeus">+500 troféus</button>
      <button data-atalho="zerarPerfil">Zerar perfil</button>
      <button data-atalho="determinismo">Testar determinismo</button>
      <button data-atalho="replay">Testar replay desta partida</button>
    </div>
    <p class="ajuda" id="tAjuda"></p>`;
  painel.appendChild(caixa);
  const $t = id => document.getElementById(id);
  $t("tEnergia").checked = MODO_TESTE.energiaInfinita;
  $t("tRecarga").checked = MODO_TESTE.semRecarga;
  $t("tVelocidade").value = String(TESTE.velocidade);
  $t("tEnergia").onchange = e => { MODO_TESTE.energiaInfinita = e.target.checked; salvarTeste(); partidaComTeste = true; };
  $t("tRecarga").onchange = e => {
    MODO_TESTE.semRecarga = e.target.checked; salvarTeste(); partidaComTeste = true;
    if (e.target.checked) { recargaM = {}; for (const c of cartas) c.recarga = 0; }
  };
  $t("tVelocidade").onchange = e => { TESTE.velocidade = +e.target.value; salvarTeste(); };
  $t("tGrupo").onchange = atualizarPainelTeste;
  $t("tMinha").onclick = () => testeColocar("casa");
  $t("tCastelo").onclick = () => testeColocar("castelo");
  $t("tEntrada").onclick = () => testeColocar("entrada");
  caixa.querySelectorAll("[data-atalho]").forEach(b => b.onclick = () => testeAtalho(b.dataset.atalho));
  // as teclas digitadas no painel não vão para o jogo
  caixa.addEventListener("keydown", e => e.stopPropagation());
  atualizarPainelTeste();
}
function atualizarPainelTeste() {
  const $t = id => document.getElementById(id);
  if (!$t("painelTeste")) return;
  const grupo = $t("tGrupo").value, sel = $t("tPersonagem"), antes = sel.value;
  const lista = grupo === "heroes"
    ? Object.keys(GUERREIROS).map(id => [id, GUERREIROS[id].nome + (GUERREIROS[id].andar && GUERREIROS[id].andar.ok ? "" : " (sem andar)")])
    : Object.keys(PERSONAGENS).map(id => [id, PERSONAGENS[id].nome]);
  sel.innerHTML = lista.map(([v, t]) => `<option value="${v}">${t}</option>`).join("");
  if (lista.some(([v]) => v === antes)) sel.value = antes;
  const meu = (modoM ? "monsters" : "heroes") === grupo;
  for (const [id, off] of [["tMinha", false], ["tCastelo", meu], ["tEntrada", meu]]) {
    $t(id).disabled = off; $t(id).style.opacity = off ? .4 : 1; $t(id).style.cursor = off ? "not-allowed" : "";
  }
  $t("tAjuda").innerHTML = `Você está jogando com <b>${modoM ? "Monsters" : "Heroes"}</b>. ` +
    "<b>Colocar na casa escolhida</b> põe qualquer grupo em qualquer arena (não gasta energia). " +
    "Na arena inimiga a coluna 1 fica junto do castelo dela. Para espiar a arena inimiga, clique na barra do castelo dela. " +
    (meu ? "" : "Grupo inimigo também pode <b>sair do castelo dele</b> ou <b>entrar pelo portal</b> direto na sua arena.");
}
montarPainelTeste();

/* =====================================================================
   AJUSTES_AO_VIVO: velocidade e passo de cada personagem, salvos em public/assets/ajustes.json.
   - No painel "Ajustar personagens" (embaixo do jogo) você muda e o jogo muda na hora.
   - O arquivo public/assets/ajustes.json muda junto (veja no VS Code) e o terminal do "npm run dev"
     mostra cada mudança, por exemplo:  ✎ nick.velocidade: 34 → 40
   - Se você editar o ajustes.json no VS Code e salvar (Ctrl+S), o jogo também muda sozinho.
   Precisa do arquivo vite.config.mjs na pasta principal (ele é quem grava o arquivo).
   ===================================================================== */
const AJUSTES = { arquivo: "ajustes.json", conferirCada: 1000 };
let textoAjustesAplicado = "";
const CAMPOS_HEROI = { velocidade: "Velocidade (pixels/s)", passo: "Passo do pé (por quadro)", para: "Para a quantos pixels do inimigo", pausa: "Pausa antes de atacar (s)",
  tamanho: "Tamanho andando (1 = igual parado)", deslocX: "Andando: mover para os lados (px)" };
const CAMPOS_MONSTRO = { velocidade: "Velocidade (pixels/s)", fpsAndar: "Velocidade da animação de andar (fps)" };
function ajustesAtuais() {                                           // o que está valendo agora, no formato do arquivo
  const herois = {}, monstros = {};
  for (const id in GUERREIROS) {
    const c = { ...MODO_MONSTERS.andar.padrao, ...(MODO_MONSTERS.andar[id] || {}) };
    herois[id] = { velocidade: c.velocidade, passo: c.passo ?? 0, para: c.para, pausa: c.pausa ?? 0.35, tamanho: c.tamanho ?? 1, deslocX: c.deslocX ?? 0 };
  }
  for (const id in PERSONAGENS) {
    const per = PERSONAGENS[id];
    monstros[id] = { velocidade: per.velocidade, fpsAndar: per.anims && per.anims.andar ? per.anims.andar.fps : 0 };
  }
  return { herois, monstros };
}
function recalcularPasso(id) {                                       // fps da animação de andar = velocidade / passo
  const g = GUERREIROS[id], c = { ...MODO_MONSTERS.andar.padrao, ...(MODO_MONSTERS.andar[id] || {}) };
  if (g && g.andar && g.andar.ok && c.passo && g.andar.escalaPasso) g.andar.fps = c.velocidade / (c.passo * g.andar.escalaPasso * (c.tamanho || 1));
}
function aplicarAjustes(obj) {
  for (const id in (obj.herois || {})) {
    if (!GUERREIROS[id]) continue;
    const novo = obj.herois[id], cfg = MODO_MONSTERS.andar[id] || (MODO_MONSTERS.andar[id] = {});
    const velAntes = { ...MODO_MONSTERS.andar.padrao, ...cfg }.velocidade;
    for (const k in CAMPOS_HEROI) if (typeof novo[k] === "number") cfg[k] = novo[k];
    if (cfg.passo === 0) delete cfg.passo;
    recalcularPasso(id);
    const velNova = { ...MODO_MONSTERS.andar.padrao, ...cfg }.velocidade;
    if (velNova !== velAntes) for (const p of plantas) if (p.tipo === id && p.andante) p.vel *= velNova / velAntes;   // quem já está andando muda junto
  }
  for (const id in (obj.monstros || {})) {
    const per = PERSONAGENS[id], novo = obj.monstros[id];
    if (!per) continue;
    if (typeof novo.velocidade === "number" && novo.velocidade > 0 && novo.velocidade !== per.velocidade) {
      for (const c of criaturas) if (c.tipo === id && c.vel > 0) c.vel *= novo.velocidade / per.velocidade;
      per.velocidade = novo.velocidade;
    }
    if (typeof novo.fpsAndar === "number" && novo.fpsAndar > 0 && per.anims && per.anims.andar) per.anims.andar.fps = novo.fpsAndar;
  }
}
async function lerAjustes() {
  try {
    const r = await fetch(AJUSTES.arquivo + "?t=" + Date.now(), { cache: "no-store" });
    if (!r.ok) return;
    const txt = await r.text();
    if (txt === textoAjustesAplicado) return;
    const obj = JSON.parse(txt);                                     // arquivo com erro de digitação: fica como estava
    textoAjustesAplicado = txt;
    aplicarAjustes(obj);
    const foco = document.activeElement;
    if (!(foco && foco.closest && foco.closest("#painelAjustes"))) preencherAjustes();
  } catch {}
}
let gravarAjustesT = 0;
function gravarAjustes() {
  clearTimeout(gravarAjustesT);
  gravarAjustesT = setTimeout(async () => {
    const txt = JSON.stringify(ajustesAtuais(), null, 2) + "\n";
    const msg = document.getElementById("aMsg");
    try {
      const r = await fetch("/salvar-ajustes", { method: "POST", headers: { "Content-Type": "application/json" }, body: txt });
      if (!r.ok) throw new Error();
      textoAjustesAplicado = txt;
      if (msg) { msg.textContent = "Salvo em public/assets/ajustes.json (veja também o terminal)"; msg.style.color = "#2f7d16"; }
    } catch {
      if (msg) { msg.textContent = "Mudou no jogo, mas não salvou: falta o vite.config.mjs (ou o npm run dev)"; msg.style.color = "#c0392b"; }
    }
  }, 300);
}
function montarPainelAjustes() {
  const painel = document.querySelector(".painel");
  if (!painel || document.getElementById("painelAjustes")) return;
  const caixa = document.createElement("div");
  caixa.className = "caixa"; caixa.id = "painelAjustes"; caixa.style.gridColumn = "1 / -1";
  const campo = "padding:6px 8px;border-radius:8px;border:2px solid #b9a6cc;background:#fff;color:#2b2030;font:inherit";
  const opH = Object.keys(GUERREIROS).map(id => `<option value="h:${id}">${GUERREIROS[id].nome}</option>`).join("");
  const opM = Object.keys(PERSONAGENS).map(id => `<option value="m:${id}">${PERSONAGENS[id].nome}</option>`).join("");
  caixa.innerHTML = `
    <h3>Ajustar personagens (ao vivo)</h3>
    <div style="display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin:8px 0">
      <label>Personagem <select id="aPersonagem" style="${campo}"><optgroup label="Heroes">${opH}</optgroup><optgroup label="Monsters">${opM}</optgroup></select></label>
      <span id="aCampos" style="display:flex;flex-wrap:wrap;gap:8px 14px"></span>
    </div>
    <p class="ajuda">Arquivo: <b>public/assets/ajustes.json</b>. Mude aqui e veja o personagem mudar na arena;
      o arquivo muda junto no VS Code e o terminal do <b>npm run dev</b> mostra cada mudança.
      <b>Passo do pé</b>: se o pé escorregar para trás, aumente; para frente, diminua.
      Nos monstros: mudou a velocidade, ajuste também a animação de andar até o pé parar de escorregar.</p>
    <p class="ajuda" id="aMsg" style="min-height:20px"></p>`;
  painel.appendChild(caixa);
  caixa.addEventListener("keydown", e => e.stopPropagation());
  document.getElementById("aPersonagem").onchange = preencherAjustes;
  preencherAjustes();
}
function preencherAjustes() {
  const sel = document.getElementById("aPersonagem"), alvo = document.getElementById("aCampos");
  if (!sel || !alvo) return;
  const [grupo, id] = sel.value.split(":"), atual = ajustesAtuais(), dados = grupo === "h" ? atual.herois[id] : atual.monstros[id];
  const nomes = grupo === "h" ? CAMPOS_HEROI : CAMPOS_MONSTRO;
  const campo = "padding:6px 8px;border-radius:8px;border:2px solid #b9a6cc;background:#fff;color:#2b2030;font:inherit;width:84px";
  alvo.innerHTML = Object.keys(nomes).map(k =>
    `<label>${nomes[k]} <input type="number" step="${k === "pausa" || k === "passo" ? 0.05 : k === "tamanho" ? 0.01 : 1}" data-ajuste="${k}" value="${dados[k]}" style="${campo}"></label>`).join("") +
    (grupo === "h" && !(GUERREIROS[id].andar && GUERREIROS[id].andar.ok) ? `<em style="color:#a0522d">(ainda sem animação de andar)</em>` : "");
  alvo.querySelectorAll("[data-ajuste]").forEach(el => el.oninput = () => {
    const v = parseFloat(el.value);
    if (!isFinite(v)) return;
    const obj = { herois: {}, monstros: {} };
    (grupo === "h" ? obj.herois : obj.monstros)[id] = { ...dados, [el.dataset.ajuste]: v };
    dados[el.dataset.ajuste] = v;
    aplicarAjustes(obj); gravarAjustes();
  });
}
montarPainelAjustes();
setTimeout(lerAjustes, 300);
setInterval(() => { if (!document.hidden) lerAjustes(); }, AJUSTES.conferirCada);

})();
