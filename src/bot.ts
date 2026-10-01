/* ===================== BOT =====================
   Joga do jeito de uma pessoa: junta energia, defende a linha em perigo e ataca a linha mais fraca. */
import { UNIDADES, BARALHO, ARENA } from "./dados";
import type { Lado } from "./dados";
import type { Estado, Acao } from "./sim";

export class Bot {
  lado: Lado; espera = 2; semente: number;
  constructor(lado: Lado, semente = 12345) { this.lado = lado; this.semente = semente; }
  private rnd() { this.semente = (this.semente * 1103515245 + 12345) & 0x7fffffff; return this.semente / 0x7fffffff; }

  pensar(e: Estado, dt: number): Acao | null {
    this.espera -= dt;
    if (this.espera > 0 || e.fim) return null;
    this.espera = 1.2 + this.rnd() * 1.8;
    const eu = this.lado, ele: Lado = eu === 0 ? 1 : 0;
    const cartas = BARALHO[eu].filter(c => UNIDADES[c].custo <= e.energia[eu]);
    if (!cartas.length) return null;
    const [z0, z1] = ARENA.zona[eu];
    // perigo: inimigo mais perto do meu castelo
    const meuPortao = eu === 0 ? ARENA.portaoEsq : ARENA.portaoDir;
    const inimigos = e.tropas.filter(t => t.lado === ele && t.estado !== "morta");
    inimigos.sort((a, b) => Math.abs(a.x - meuPortao) - Math.abs(b.x - meuPortao));
    const perigo = inimigos[0];
    let r: number, x: number, carta: string;
    if (perigo && Math.abs(perigo.x - meuPortao) < 420) {
      // defende: tanque na frente se o inimigo for forte, tiro de longe se for fraco
      r = perigo.r;
      const forte = UNIDADES[perigo.tipo].vida > 800;
      carta = cartas.find(c => forte ? UNIDADES[c].dano >= 80 : !!UNIDADES[c].projetil) || cartas[Math.floor(this.rnd() * cartas.length)];
      x = eu === 0 ? z0 + 40 : z1 - 40;
    } else {
      // ataca a linha com menos defensores inimigos (guarda energia para uma jogada forte)
      if (e.energia[eu] < 7 && this.rnd() < .6) return null;
      const por = [0, 1, 2, 3, 4].map(l => e.tropas.filter(t => t.lado === ele && t.r === l).length);
      const min = Math.min(...por), opcoes = por.map((v, i) => v === min ? i : -1).filter(i => i >= 0);
      r = opcoes[Math.floor(this.rnd() * opcoes.length)];
      carta = cartas[Math.floor(this.rnd() * cartas.length)];
      x = eu === 0 ? z1 - 20 : z0 + 20;
    }
    return { passo: e.passo + 1, lado: eu, carta, r, x };
  }
}
