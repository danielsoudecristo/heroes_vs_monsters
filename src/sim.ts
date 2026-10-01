/* ===================== SIMULAÇÃO DA BATALHA =====================
   Sem desenho nenhum: só regras. Anda em passos fixos (REGRAS.tick).
   No online, os dois aparelhos rodam esta mesma simulação e trocam só as AÇÕES
   ("coloquei tal carta, na linha tal, na posição tal, no passo tal"). */
import { UNIDADES, REGRAS, ARENA, chaoDaLinha, BARALHO } from "./dados";
import type { Lado } from "./dados";

export interface Acao { passo: number; lado: Lado; carta: string; r: number; x: number; }
export interface Tropa {
  id: number; tipo: string; lado: Lado; r: number; x: number; y: number;
  hp: number; max: number; atkT: number; estado: "portal" | "andando" | "atacando" | "morta";
  portalT: number; mortaT: number; alvo: number;     // alvo: id da tropa, -1 = castelo, 0 = nada
}
export interface Projetil { id: number; lado: Lado; tipo: string; x: number; y: number; alvo: number; r: number; dano: number; area: number; vel: number; }
export interface Evento { tipo: "golpe" | "morte" | "castelo" | "explosao" | "tiro"; x: number; y: number; lado: Lado; valor?: number; id?: number; }

export interface Estado {
  passo: number; tempo: number; prorrogacao: boolean; fim: null | { vencedor: Lado | -1; motivo: string };
  energia: [number, number]; castelo: [number, number]; mortes: [number, number];
  tropas: Tropa[]; projeteis: Projetil[]; proxId: number; castT: [number, number];
  eventos: Evento[];           // o que aconteceu neste passo (para a tela tocar efeitos e sons)
}

export function novaPartida(): Estado {
  return {
    passo: 0, tempo: REGRAS.tempo, prorrogacao: false, fim: null,
    energia: [REGRAS.energiaInicial, REGRAS.energiaInicial], castelo: [REGRAS.castelo.vida, REGRAS.castelo.vida],
    mortes: [0, 0], tropas: [], projeteis: [], proxId: 1, castT: [0, 0], eventos: []
  };
}

// confere se a ação é válida (energia, zona do lado certo, carta do baralho)
export function acaoValida(e: Estado, a: Acao): boolean {
  const u = UNIDADES[a.carta];
  if (!u || e.fim || u.lado !== a.lado || !BARALHO[a.lado].includes(a.carta)) return false;
  if (a.r < 0 || a.r >= ARENA.linhas) return false;
  const [x0, x1] = ARENA.zona[a.lado];
  if (a.x < x0 || a.x > x1) return false;
  return e.energia[a.lado] >= u.custo;
}

export function aplicarAcao(e: Estado, a: Acao): boolean {
  if (!acaoValida(e, a)) return false;
  const u = UNIDADES[a.carta];
  e.energia[a.lado] -= u.custo;
  e.tropas.push({
    id: e.proxId++, tipo: a.carta, lado: a.lado, r: a.r, x: Math.round(a.x), y: chaoDaLinha(a.r),
    hp: u.vida, max: u.vida, atkT: 0, estado: "portal", portalT: REGRAS.invocacao, mortaT: 0, alvo: 0
  });
  return true;
}

const vivas = (e: Estado) => e.tropas.filter(t => t.estado === "andando" || t.estado === "atacando");

function ferir(e: Estado, t: Tropa, dano: number) {
  if (t.estado === "morta") return;
  t.hp -= dano;
  e.eventos.push({ tipo: "golpe", x: t.x, y: t.y - 50, lado: t.lado, valor: dano, id: t.id });
  if (t.hp <= 0) {
    t.hp = 0; t.estado = "morta"; t.mortaT = 0;
    e.mortes[t.lado === 0 ? 1 : 0]++;                          // quem matou ganha o ponto
    e.eventos.push({ tipo: "morte", x: t.x, y: t.y, lado: t.lado, id: t.id });
  }
}
function ferirCastelo(e: Estado, lado: Lado, dano: number) {
  e.castelo[lado] = Math.max(0, e.castelo[lado] - dano);
  e.eventos.push({ tipo: "castelo", x: lado === 0 ? ARENA.portaoEsq - 60 : ARENA.portaoDir + 60, y: 400, lado, valor: dano });
}

// um passo da simulação (sempre o mesmo tamanho de tempo)
export function passo(e: Estado, acoes: Acao[]) {
  if (e.fim) return;
  const dt = REGRAS.tick;
  e.eventos = [];
  for (const a of acoes) if (a.passo === e.passo) aplicarAcao(e, a);

  // relógio e energia (dobra no último minuto e na prorrogação)
  e.tempo -= dt;
  const dobro = e.prorrogacao || e.tempo <= 60 ? 2 : 1;
  for (const l of [0, 1] as Lado[]) e.energia[l] = Math.min(REGRAS.energiaMax, e.energia[l] + REGRAS.energiaPorSeg * dobro * dt);

  const vs = vivas(e);
  for (const t of e.tropas) {
    const u = UNIDADES[t.tipo];
    if (t.estado === "portal") { t.portalT -= dt; if (t.portalT <= 0) t.estado = "andando"; continue; }
    if (t.estado === "morta") { t.mortaT += dt; continue; }
    const dir = t.lado === 0 ? 1 : -1;
    // inimigo mais próximo na mesma linha, à frente (ou colado)
    let alvo: Tropa | null = null, melhor = 1e9;
    for (const o of vs) {
      if (o.lado === t.lado || o.r !== t.r || o.estado === "morta") continue;
      const d = (o.x - t.x) * dir;
      if (d > -20 && d < melhor) { melhor = d; alvo = o; }
    }
    const portao = t.lado === 0 ? ARENA.portaoDir : ARENA.portaoEsq;
    const distCastelo = Math.abs(portao - t.x);
    t.atkT = Math.max(0, t.atkT - dt);
    if (alvo && melhor <= u.alcance) {
      t.estado = "atacando"; t.alvo = alvo.id;
      if (t.atkT <= 0) { t.atkT = u.intervalo; atacar(e, t, alvo); }
    } else if (distCastelo <= Math.max(u.alcance, 30)) {
      t.estado = "atacando"; t.alvo = -1;
      if (t.atkT <= 0) { t.atkT = u.intervalo; atacarCastelo(e, t); }
    } else {
      t.estado = "andando"; t.alvo = 0;
      t.x += dir * u.velocidade * dt;
    }
  }
  // os castelos também se defendem: flecha no inimigo mais próximo do portão
  for (const l of [0, 1] as Lado[]) {
    e.castT[l] = Math.max(0, e.castT[l] - dt);
    if (e.castT[l] > 0) continue;
    const portao = l === 0 ? ARENA.portaoEsq : ARENA.portaoDir;
    let alvo: Tropa | null = null, melhor = REGRAS.castelo.alcance;
    for (const o of vs) { if (o.lado === l || o.estado === "morta") continue; const d = Math.abs(o.x - portao); if (d < melhor) { melhor = d; alvo = o; } }
    if (alvo) {
      e.castT[l] = REGRAS.castelo.intervalo;
      e.projeteis.push({ id: e.proxId++, lado: l, tipo: "flecha", x: portao, y: 330, alvo: alvo.id, r: alvo.r, dano: REGRAS.castelo.dano, area: 0, vel: 700 });
    }
  }
  // projéteis voam até o alvo
  for (const p of e.projeteis) {
    const alvo = e.tropas.find(t => t.id === p.alvo);
    const tx = alvo ? alvo.x : (p.lado === 0 ? ARENA.portaoDir + 40 : ARENA.portaoEsq - 40);
    const ty = alvo ? alvo.y - 50 : 380;
    const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy), s = p.vel * dt;
    if (d <= s) {
      p.vel = 0;                                                  // chegou
      if (p.alvo === -1) ferirCastelo(e, p.lado === 0 ? 1 : 0, p.dano);
      else if (alvo && alvo.estado !== "morta") {
        if (p.area > 0) {
          e.eventos.push({ tipo: "explosao", x: tx, y: ty, lado: p.lado, valor: p.area });
          for (const o of vivas(e)) if (o.lado !== p.lado && Math.hypot(o.x - tx, (o.y - 50) - ty) <= p.area) ferir(e, o, p.dano);
        } else ferir(e, alvo, p.dano);
      }
    } else { p.x += dx / d * s; p.y += dy / d * s; }
  }
  e.projeteis = e.projeteis.filter(p => p.vel > 0);
  e.tropas = e.tropas.filter(t => t.estado !== "morta" || t.mortaT < 1.2);
  e.passo++;
  verificarFim(e);
}

function atacar(e: Estado, t: Tropa, alvo: Tropa) {
  const u = UNIDADES[t.tipo];
  if (u.projetil) {
    e.projeteis.push({ id: e.proxId++, lado: t.lado, tipo: u.projetil, x: t.x + (t.lado === 0 ? 20 : -20), y: t.y - 60, alvo: alvo.id, r: t.r, dano: u.dano, area: u.area || 0, vel: u.projetil === "flecha" ? 650 : 420 });
    e.eventos.push({ tipo: "tiro", x: t.x, y: t.y, lado: t.lado, id: t.id });
  } else ferir(e, alvo, u.dano);
}
function atacarCastelo(e: Estado, t: Tropa) {
  const u = UNIDADES[t.tipo];
  if (u.projetil) {
    e.projeteis.push({ id: e.proxId++, lado: t.lado, tipo: u.projetil, x: t.x, y: t.y - 60, alvo: -1, r: t.r, dano: u.dano, area: 0, vel: u.projetil === "flecha" ? 650 : 420 });
    e.eventos.push({ tipo: "tiro", x: t.x, y: t.y, lado: t.lado, id: t.id });
  } else ferirCastelo(e, t.lado === 0 ? 1 : 0, u.dano);
}

// quem venceu: castelo derrubado na hora; no fim do tempo, mais vida no castelo; depois, mais mortes; depois, prorrogação
function verificarFim(e: Estado) {
  if (e.castelo[0] <= 0 || e.castelo[1] <= 0) {
    e.fim = { vencedor: e.castelo[1] <= 0 ? 0 : 1, motivo: "Castelo derrubado!" };
    return;
  }
  if (e.tempo > 0) return;
  const [c0, c1] = e.castelo, [m0, m1] = e.mortes;
  if (c0 !== c1) { e.fim = { vencedor: c0 > c1 ? 0 : 1, motivo: "Mais vida no castelo" }; return; }
  if (m0 !== m1) { e.fim = { vencedor: m0 > m1 ? 0 : 1, motivo: "Mais inimigos derrotados" }; return; }
  if (!e.prorrogacao) { e.prorrogacao = true; e.tempo = REGRAS.prorrogacao; return; }
  e.fim = { vencedor: -1, motivo: "Empate" };
}
