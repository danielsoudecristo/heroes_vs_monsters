/* ===================== DADOS DO JOGO =====================
   Cada unidade tem os números da batalha e as folhas de animação (PNG).
   As imagens ficam em public/assets/ com as MESMAS pastas do jogo antigo. */

export type Lado = 0 | 1;                      // 0 = Guerreiros (esquerda), 1 = Sombrio (direita)

export interface Anim { src: string; cols: number; quadros: number; cw: number; ch: number; ax: number; ay: number; fps: number; }
export interface Unidade {
  id: string; nome: string; lado: Lado;
  custo: number;              // energia (0 a 10)
  vida: number; dano: number;
  alcance: number;            // pixels: até onde ataca (corpo a corpo ~55)
  intervalo: number;          // segundos entre ataques
  velocidade: number;         // pixels por segundo
  area?: number;              // raio do dano em área (magia)
  projetil?: "flecha" | "magia" | "sombra";
  escala: number; olhaDireita: boolean;   // a imagem olha para a direita?
  cor: number;                // cor do desenho de reserva (quando o PNG não existe)
  andar: Anim; atacar: Anim;
}

// Guerreiros ainda não têm PNG de andar: usam a animação parada enquanto andam
export const UNIDADES: Record<string, Unidade> = {
  nick: {
    id: "nick", nome: "Nick", lado: 0, custo: 3, vida: 620, dano: 85, alcance: 58, intervalo: 1.0, velocidade: 42,
    escala: .5, olhaDireita: true, cor: 0x4f7bd6,
    andar: { src: "Nick/parado/parado.png", cols: 8, quadros: 8, cw: 311, ch: 256, ax: 78, ay: 255, fps: 6 },
    atacar: { src: "Nick/atacando/atacando.png", cols: 8, quadros: 40, cw: 311, ch: 256, ax: 78, ay: 255, fps: 32 }
  },
  arqueiro: {
    id: "arqueiro", nome: "Arqueiro", lado: 0, custo: 3, vida: 260, dano: 48, alcance: 250, intervalo: .9, velocidade: 38, projetil: "flecha",
    escala: .41, olhaDireita: true, cor: 0xc8453d,
    andar: { src: "Arqueiro/parado/parado.png", cols: 8, quadros: 12, cw: 184, ch: 294, ax: 98, ay: 293, fps: 8 },
    atacar: { src: "Arqueiro/atacando/atacando.png", cols: 8, quadros: 8, cw: 232, ch: 300, ax: 94, ay: 298, fps: 9 }
  },
  protetor: {
    id: "protetor", nome: "Protetor", lado: 0, custo: 4, vida: 1500, dano: 42, alcance: 56, intervalo: 1.2, velocidade: 28,
    escala: .51, olhaDireita: true, cor: 0x2f5fa8,
    andar: { src: "Guerreiro Protetor/defendendo/defendendo.png", cols: 8, quadros: 150, cw: 200, ch: 236, ax: 109, ay: 234, fps: 30 },
    atacar: { src: "Guerreiro Protetor/defendendo/defendendo.png", cols: 8, quadros: 150, cw: 200, ch: 236, ax: 109, ay: 234, fps: 30 }
  },
  mago: {
    id: "mago", nome: "Mago", lado: 0, custo: 5, vida: 320, dano: 115, alcance: 230, intervalo: 1.7, velocidade: 34, area: 70, projetil: "magia",
    escala: .62, olhaDireita: true, cor: 0x3a7be0,
    andar: { src: "Mago/parado/parado.png", cols: 8, quadros: 12, cw: 126, ch: 201, ax: 68, ay: 199, fps: 8 },
    atacar: { src: "Mago/atacando/atacando.png", cols: 8, quadros: 151, cw: 189, ch: 197, ax: 68, ay: 195, fps: 90 }
  },
  esqFogo: {
    id: "esqFogo", nome: "Esq. de Fogo", lado: 1, custo: 3, vida: 640, dano: 80, alcance: 58, intervalo: 1.0, velocidade: 42,
    escala: .47, olhaDireita: false, cor: 0xe0662c,
    andar: { src: "Esqueleto de Fogo/andando/andando.png", cols: 8, quadros: 40, cw: 175, ch: 248, ax: 85, ay: 241, fps: 15 },
    atacar: { src: "Esqueleto de Fogo/socando/esqueleto_de_fogo_socando.png", cols: 8, quadros: 60, cw: 160, ch: 236, ax: 75, ay: 233, fps: 60 }
  },
  esqArqueiro: {
    id: "esqArqueiro", nome: "Esq. Arqueiro", lado: 1, custo: 3, vida: 250, dano: 48, alcance: 250, intervalo: .9, velocidade: 38, projetil: "flecha",
    escala: .58, olhaDireita: true, cor: 0xd8d2c0,
    andar: { src: "Esqueleto Arqueiro/andando/andando.png", cols: 8, quadros: 120, cw: 161, ch: 190, ax: 71, ay: 188, fps: 14 },
    atacar: { src: "Esqueleto Arqueiro/atirando/atirando.png", cols: 8, quadros: 151, cw: 176, ch: 202, ax: 66, ay: 200, fps: 160 }
  },
  esqProtetor: {
    id: "esqProtetor", nome: "Esq. Protetor", lado: 1, custo: 4, vida: 1450, dano: 45, alcance: 56, intervalo: 1.2, velocidade: 28,
    escala: .61, olhaDireita: true, cor: 0x8a9bb0,
    andar: { src: "Esqueleto Protetor/andando/andando.png", cols: 8, quadros: 35, cw: 135, ch: 189, ax: 76, ay: 188, fps: 16 },
    atacar: { src: "Esqueleto Protetor/socando/socando.png", cols: 8, quadros: 151, cw: 229, ch: 190, ax: 88, ay: 188, fps: 120 }
  },
  esqMago: {
    id: "esqMago", nome: "Esq. Mago", lado: 1, custo: 5, vida: 330, dano: 110, alcance: 230, intervalo: 1.7, velocidade: 34, area: 70, projetil: "sombra",
    escala: .58, olhaDireita: true, cor: 0x6a4bb8,
    andar: { src: "Esqueleto Mago/andando/andando.png", cols: 8, quadros: 82, cw: 200, ch: 206, ax: 91, ay: 204, fps: 20 },
    atacar: { src: "Esqueleto Mago/atirando/atirando.png", cols: 8, quadros: 151, cw: 299, ch: 204, ax: 160, ay: 200, fps: 90 }
  }
};

// cartas de cada lado (baralho do protótipo)
export const BARALHO: Record<Lado, string[]> = {
  0: ["nick", "arqueiro", "protetor", "mago"],
  1: ["esqFogo", "esqArqueiro", "esqProtetor", "esqMago"]
};

// ===================== REGRAS DA PARTIDA =====================
export const REGRAS = {
  tick: 1 / 20,               // a simulação anda em passos fixos (20 por segundo): igual nos dois aparelhos
  tempo: 180,                 // 3 minutos
  prorrogacao: 60,            // +1 minuto se empatar em tudo
  energiaMax: 10,
  energiaInicial: 5,
  energiaPorSeg: 1 / 2.8,     // 1 de energia a cada 2,8 s (dobra nos últimos 60 s e na prorrogação)
  invocacao: 1.0,             // segundos do portal antes de a unidade aparecer (esconde o atraso da internet)
  castelo: { vida: 3000, alcance: 260, dano: 55, intervalo: 1.1 }
};

// ===================== ARENA (1280 x 720) =====================
export const ARENA = {
  linhas: 5, topo: 180, alturaLinha: 94,
  portaoEsq: 300,             // até onde os monstros andam para atacar o castelo dos Guerreiros
  portaoDir: 1000,            // até onde os guerreiros andam para atacar o Castelo Sombrio
  rio: 650,                   // meio da arena
  zona: { 0: [310, 620], 1: [680, 990] } as Record<Lado, [number, number]>   // onde cada lado pode colocar tropas
};
export const chaoDaLinha = (r: number) => ARENA.topo + r * ARENA.alturaLinha + ARENA.alturaLinha - 14;
