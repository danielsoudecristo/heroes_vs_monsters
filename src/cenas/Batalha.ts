import Phaser from "phaser";
import { UNIDADES, BARALHO, REGRAS, ARENA, chaoDaLinha } from "../dados";
import type { Lado, Unidade } from "../dados";
import { novaPartida, passo, acaoValida } from "../sim";
import type { Estado, Acao, Tropa } from "../sim";
import { Bot } from "../bot";

const FONTE = "Trebuchet MS, sans-serif";
const ASSETS = "assets/";

interface Visual { obj: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container; sprite: boolean; xAnt: number; }

export class Batalha extends Phaser.Scene {
  private e!: Estado; private lado!: Lado; private bot!: Bot;
  private acoes: Acao[] = []; private acum = 0;
  private visuais = new Map<number, Visual>();
  private gfx!: Phaser.GameObjects.Graphics;          // barras, portais, projéteis (redesenhado todo quadro)
  private hud!: Phaser.GameObjects.Graphics;
  private textos: Record<string, Phaser.GameObjects.Text> = {};
  private cartaSel = -1;
  private cartas: { c: Phaser.GameObjects.Container; fundo: Phaser.GameObjects.Rectangle; custo: number }[] = [];
  private fantasma!: Phaser.GameObjects.Graphics;
  private tremor = 0;

  constructor() { super("Batalha"); }
  init(d: { lado: Lado }) {
    this.lado = d.lado ?? 0; this.e = novaPartida(); this.bot = new Bot(this.lado === 0 ? 1 : 0, 777);
    this.acoes = []; this.acum = 0; this.visuais = new Map(); this.cartaSel = -1; this.cartas = [];
  }

  preload() {
    this.load.image("fundo", ASSETS + "Fundo/fundo_do_jogo.jpg");
    for (const u of Object.values(UNIDADES)) for (const a of [u.andar, u.atacar])
      if (!this.textures.exists(a.src)) this.load.spritesheet(a.src, ASSETS + a.src, { frameWidth: a.cw, frameHeight: a.ch });
    this.load.on("loaderror", () => {});                // PNG que falta: a unidade usa um desenho de reserva
  }

  create() {
    this.criarFundo();
    for (const u of Object.values(UNIDADES)) for (const [nome, a] of [["andar", u.andar], ["atacar", u.atacar]] as const) {
      const key = `${u.id}_${nome}`;
      if (this.textures.exists(a.src) && !this.anims.exists(key))
        this.anims.create({ key, frames: this.anims.generateFrameNumbers(a.src, { start: 0, end: a.quadros - 1 }), frameRate: a.fps, repeat: -1 });
    }
    this.gfx = this.add.graphics().setDepth(900);
    this.fantasma = this.add.graphics().setDepth(850);
    this.hud = this.add.graphics().setDepth(1000);
    this.criarHud();
    this.criarCartas();
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.clicar(p.x, p.y));
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => this.moverFantasma(p.x, p.y));
    this.input.keyboard?.on("keydown", (ev: KeyboardEvent) => { const n = +ev.key; if (n >= 1 && n <= 4) this.escolherCarta(n - 1); });
  }

  // ---------- cenário: fundo do jogo + Castelo Sombrio (o castelo da esquerda espelhado e escurecido) ----------
  private criarFundo() {
    const W = 1280, H = 720;
    if (this.textures.exists("fundo")) {
      this.add.image(0, 0, "fundo").setOrigin(0).setDisplaySize(W, H);
      if (!this.textures.exists("castelo_sombrio")) {
        const src = this.textures.get("fundo").getSourceImage() as HTMLImageElement;
        const k = src.width / W, larg = Math.round(300 * k);
        const tex = this.textures.createCanvas("castelo_sombrio", larg, src.height);
        if (tex) {
          const ctx = tex.getContext();
          ctx.save(); ctx.translate(larg, 0); ctx.scale(-1, 1);
          ctx.drawImage(src, 0, 0, larg, src.height, 0, 0, larg, src.height); ctx.restore();
          ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = "#6a4a8c"; ctx.fillRect(0, 0, larg, src.height);
          ctx.globalCompositeOperation = "source-over";
          const gr = ctx.createLinearGradient(0, 0, larg * .25, 0);          // emenda suave com a arena
          gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,0)");
          tex.refresh();
        }
      }
      this.add.image(W - 300, 0, "castelo_sombrio").setOrigin(0).setDisplaySize(300, H);
    } else {
      const g = this.add.graphics();
      g.fillStyle(0x6b4a2e); g.fillRect(0, 0, W, H);
      g.fillStyle(0x3a4a6a); g.fillRect(0, 0, 300, H); g.fillStyle(0x3a2250); g.fillRect(W - 300, 0, 300, H);
    }
    const g = this.add.graphics();
    // rio no meio e linhas das faixas
    g.fillStyle(0x3a8fd0, .25); g.fillRect(ARENA.rio - 14, ARENA.topo, 28, ARENA.linhas * ARENA.alturaLinha);
    g.lineStyle(1, 0x000000, .12);
    for (let r = 1; r < ARENA.linhas; r++) g.lineBetween(ARENA.portaoEsq, ARENA.topo + r * ARENA.alturaLinha, ARENA.portaoDir, ARENA.topo + r * ARENA.alturaLinha);
    this.add.text(150, 150, "🏰 Guerreiros", { fontFamily: FONTE, fontSize: "18px", fontStyle: "bold", color: "#ffe7a6", stroke: "#000", strokeThickness: 4 }).setOrigin(.5);
    this.add.text(1130, 150, "Castelo Sombrio 🌑", { fontFamily: FONTE, fontSize: "18px", fontStyle: "bold", color: "#e2c8ff", stroke: "#000", strokeThickness: 4 }).setOrigin(.5);
  }

  // ---------- barra de baixo: vida dos castelos, mortes e tempo ----------
  private criarHud() {
    const est = (cor: string, tam = "16px") => ({ fontFamily: FONTE, fontSize: tam, fontStyle: "bold", color: cor, stroke: "#120c18", strokeThickness: 4 });
    this.textos.vida0 = this.add.text(0, 0, "", est("#ffffff", "14px")).setOrigin(.5).setDepth(1001);
    this.textos.vida1 = this.add.text(0, 0, "", est("#ffffff", "14px")).setOrigin(.5).setDepth(1001);
    this.textos.mortes0 = this.add.text(0, 0, "", est("#ffe7a6")).setOrigin(.5).setDepth(1001);
    this.textos.mortes1 = this.add.text(0, 0, "", est("#e2c8ff")).setOrigin(.5).setDepth(1001);
    this.textos.tempo = this.add.text(0, 0, "", est("#ffffff", "24px")).setOrigin(.5).setDepth(1001);
    this.textos.energia = this.add.text(0, 0, "", est("#ffe7a6", "15px")).setOrigin(.5).setDepth(1001);
  }
  private desenharHud() {
    const h = this.hud, e = this.e; h.clear();
    const x0 = 330, x1 = 1270, y = 664, alt = 48;
    h.fillStyle(0x1d1424, .92); h.fillRoundedRect(x0, y, x1 - x0, alt, 14); h.lineStyle(2, 0xc99a3c); h.strokeRoundedRect(x0, y, x1 - x0, alt, 14);
    const meio = (x0 + x1) / 2, bw = 250, by = y + 14, bh = 20;
    // vida do castelo dos Guerreiros (esquerda) e do Castelo Sombrio (direita)
    const vidas: [number, number] = [e.castelo[0] / REGRAS.castelo.vida, e.castelo[1] / REGRAS.castelo.vida];
    const bx0 = x0 + 16, bx1 = x1 - 16 - bw;
    h.fillStyle(0x170c10); h.fillRoundedRect(bx0, by, bw, bh, 10); h.fillRoundedRect(bx1, by, bw, bh, 10);
    h.fillStyle(0x3f7fe0); h.fillRoundedRect(bx0, by, Math.max(10, bw * vidas[0]), bh, 10);
    h.fillStyle(0x9a4ae0); h.fillRoundedRect(bx1 + bw * (1 - vidas[1]), by, Math.max(10, bw * vidas[1]), bh, 10);
    this.textos.vida0.setPosition(bx0 + bw / 2, by + bh / 2).setText(`🏰 ${Math.ceil(e.castelo[0])}`);
    this.textos.vida1.setPosition(bx1 + bw / 2, by + bh / 2).setText(`${Math.ceil(e.castelo[1])} 🌑`);
    this.textos.mortes0.setPosition(bx0 + bw + 60, y + alt / 2).setText(`⚔️ ${e.mortes[0]}`);
    this.textos.mortes1.setPosition(bx1 - 60, y + alt / 2).setText(`${e.mortes[1]} ⚔️`);
    const t = Math.max(0, Math.ceil(e.tempo)), fimPerto = e.tempo <= 30 || e.prorrogacao;
    this.textos.tempo.setPosition(meio, y + alt / 2).setText(e.prorrogacao ? `PRORROGAÇÃO ${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}` : `⏱ ${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`)
      .setColor(fimPerto ? "#ff7a6a" : "#ffffff").setFontSize(e.prorrogacao ? "18px" : "24px");
    if (fimPerto) this.textos.tempo.setScale(1 + Math.sin(this.time.now / 150) * .04); else this.textos.tempo.setScale(1);
    // energia do jogador (10 gomos) em cima das cartas
    const en = e.energia[this.lado], ex = 14, ey = 560, ew = 300;
    h.fillStyle(0x1d1424, .92); h.fillRoundedRect(ex - 4, ey - 4, ew + 8, 22, 10);
    for (let i = 0; i < 10; i++) {
      const cheio = Math.min(1, Math.max(0, en - i)), gx = ex + i * (ew / 10);
      h.fillStyle(0x2a1f35); h.fillRoundedRect(gx + 1, ey, ew / 10 - 2, 14, 5);
      if (cheio > 0) { h.fillStyle(cheio >= 1 ? 0xe9b752 : 0x9a7a3a); h.fillRoundedRect(gx + 1, ey, (ew / 10 - 2) * cheio, 14, 5); }
    }
    this.textos.energia.setPosition(ex + ew + 22, ey + 7).setText(`⚡${Math.floor(en)}`);
  }

  // ---------- cartas (4) embaixo à esquerda ----------
  private criarCartas() {
    BARALHO[this.lado].forEach((id, i) => {
      const u = UNIDADES[id], x = 14 + i * 76 + 36, y = 640;
      const c = this.add.container(x, y).setDepth(1002);
      const fundo = this.add.rectangle(0, 0, 70, 96, this.lado === 0 ? 0x2b2f4a : 0x2e1a3a).setStrokeStyle(3, 0xc99a3c);
      c.add(fundo);
      if (this.textures.exists(u.andar.src)) {
        const img = this.add.image(0, 18, u.andar.src, 0).setOrigin(u.andar.ax / u.andar.cw, u.andar.ay / u.andar.ch);
        img.setScale(60 / u.andar.ay).setFlipX(u.olhaDireita === (u.lado === 1));
        c.add(img);
      } else c.add(this.add.circle(0, -6, 20, u.cor));
      c.add(this.add.text(0, 30, u.nome, { fontFamily: FONTE, fontSize: "11px", fontStyle: "bold", color: "#ffffff", stroke: "#000", strokeThickness: 3 }).setOrigin(.5));
      const selo = this.add.circle(-26, -38, 12, 0xe9b752).setStrokeStyle(2, 0x2b2030);
      c.add([selo, this.add.text(-26, -38, String(u.custo), { fontFamily: FONTE, fontSize: "14px", fontStyle: "bold", color: "#2b2030" }).setOrigin(.5)]);
      c.add(this.add.text(26, -38, String(i + 1), { fontFamily: FONTE, fontSize: "11px", color: "#bfb3cc" }).setOrigin(.5));
      fundo.setInteractive({ useHandCursor: true }).on("pointerdown", (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => { ev.stopPropagation(); this.escolherCarta(i); });
      this.cartas.push({ c, fundo, custo: u.custo });
    });
  }
  private escolherCarta(i: number) { this.cartaSel = this.cartaSel === i ? -1 : i; }
  private atualizarCartas() {
    this.cartas.forEach((k, i) => {
      const pode = this.e.energia[this.lado] >= k.custo, sel = i === this.cartaSel;
      k.c.setAlpha(pode ? 1 : .45).setY(sel ? 628 : 640);
      k.fundo.setStrokeStyle(sel ? 4 : 3, sel ? 0xffffff : 0xc99a3c);
    });
  }

  // ---------- colocar tropa ----------
  private casaDoClique(x: number, y: number): { r: number; x: number } | null {
    const [z0, z1] = ARENA.zona[this.lado];
    if (x < z0 || x > z1 || y < ARENA.topo || y >= ARENA.topo + ARENA.linhas * ARENA.alturaLinha) return null;
    return { r: Math.floor((y - ARENA.topo) / ARENA.alturaLinha), x };
  }
  private clicar(x: number, y: number) {
    if (this.e.fim || this.cartaSel < 0) return;
    const casa = this.casaDoClique(x, y);
    if (!casa) return;
    const a: Acao = { passo: this.e.passo + 1, lado: this.lado, carta: BARALHO[this.lado][this.cartaSel], r: casa.r, x: casa.x };
    if (!acaoValida(this.e, a)) { this.cameras.main.shake(80, .003); return; }
    this.acoes.push(a);                                   // no online, esta ação também vai para o adversário
    this.cartaSel = -1;
  }
  private moverFantasma(x: number, y: number) {
    const f = this.fantasma; f.clear();
    if (this.cartaSel < 0 || this.e.fim) return;
    const [z0, z1] = ARENA.zona[this.lado];
    f.fillStyle(this.lado === 0 ? 0x4f8bff : 0xa56bff, .12); f.fillRect(z0, ARENA.topo, z1 - z0, ARENA.linhas * ARENA.alturaLinha);
    const casa = this.casaDoClique(x, y);
    if (casa) { f.fillStyle(0xffffff, .25); f.fillEllipse(casa.x, chaoDaLinha(casa.r), 70, 20); }
  }

  // ---------- laço: simulação em passos fixos + desenho suave ----------
  update(_t: number, dms: number) {
    const dt = Math.min(.1, dms / 1000);
    const a = this.bot.pensar(this.e, dt);
    if (a) this.acoes.push(a);
    this.acum += dt;
    while (this.acum >= REGRAS.tick && !this.e.fim) {
      for (const [id, v] of this.visuais) { const t = this.e.tropas.find(q => q.id === id); if (t) v.xAnt = t.x; }
      passo(this.e, this.acoes);
      this.acoes = this.acoes.filter(q => q.passo >= this.e.passo);
      this.tocarEventos();
      this.acum -= REGRAS.tick;
    }
    this.desenhar(Math.min(1, this.acum / REGRAS.tick));
    this.desenharHud();
    this.atualizarCartas();
    if (this.e.fim && !this.textos.fim) this.mostrarFim();
  }

  private criarVisual(t: Tropa): Visual {
    const u = UNIDADES[t.tipo];
    if (this.textures.exists(u.andar.src)) {
      const s = this.add.sprite(t.x, t.y, u.andar.src, 0).setOrigin(u.andar.ax / u.andar.cw, u.andar.ay / u.andar.ch).setScale(u.escala);
      s.setFlipX(u.olhaDireita === (t.lado === 1));        // todo mundo olha para o inimigo
      return { obj: s, sprite: true, xAnt: t.x };
    }
    const c = this.add.container(t.x, t.y);                // desenho de reserva (PNG ainda não colocado)
    c.add([this.add.ellipse(0, 0, 44, 12, 0x000000, .3), this.add.rectangle(0, -34, 34, 64, u.cor).setStrokeStyle(3, 0x1a1020),
      this.add.text(0, -34, u.nome.slice(0, 3), { fontFamily: FONTE, fontSize: "12px", fontStyle: "bold", color: "#fff" }).setOrigin(.5)]);
    return { obj: c, sprite: false, xAnt: t.x };
  }

  private desenhar(k: number) {
    const g = this.gfx; g.clear();
    const vivos = new Set<number>();
    for (const t of this.e.tropas) {
      vivos.add(t.id);
      let v = this.visuais.get(t.id);
      if (!v) { v = this.criarVisual(t); this.visuais.set(t.id, v); }
      const u: Unidade = UNIDADES[t.tipo];
      const x = v.xAnt + (t.x - v.xAnt) * k;
      v.obj.setPosition(x, t.y).setDepth(t.y);
      if (t.estado === "portal") {                          // portal de ~1 s antes de a tropa aparecer
        const p = 1 - t.portalT / REGRAS.invocacao;
        v.obj.setAlpha(p * .6).setScale((v.sprite ? u.escala : 1) * (.6 + .4 * p));
        g.lineStyle(3, t.lado === 0 ? 0xffd97a : 0xb98cff, 1 - p * .5); g.strokeEllipse(x, t.y, 60 + p * 30, 18 + p * 8);
        g.fillStyle(t.lado === 0 ? 0xffd97a : 0xb98cff, .25 * (1 - p)); g.fillEllipse(x, t.y, 60 + p * 30, 18 + p * 8);
        continue;
      }
      if (t.estado === "morta") { v.obj.setAlpha(Math.max(0, 1 - t.mortaT / 1.2)); if (v.sprite) (v.obj as Phaser.GameObjects.Sprite).stop().setTint(0x553344); continue; }
      v.obj.setAlpha(1).setScale(v.sprite ? u.escala : 1);
      if (v.sprite) {
        const s = v.obj as Phaser.GameObjects.Sprite, key = `${u.id}_${t.estado === "atacando" ? "atacar" : "andar"}`;
        if (this.anims.exists(key) && s.anims.currentAnim?.key !== key) s.play(key);
      }
      if (t.hp < t.max) {                                   // barra de vida só depois de levar golpe
        const w = 40, bx = x - w / 2, by = t.y - 118;
        g.fillStyle(0x120c18); g.fillRect(bx - 2, by - 2, w + 4, 8);
        g.fillStyle(t.lado === 0 ? 0x5fd06f : 0xd96a5a); g.fillRect(bx, by, w * t.hp / t.max, 4);
      }
    }
    for (const [id, v] of this.visuais) if (!vivos.has(id)) { v.obj.destroy(); this.visuais.delete(id); }
    for (const p of this.e.projeteis) {                     // flechas e magias
      if (p.tipo === "flecha") { g.lineStyle(3, 0xf2e6c8); g.lineBetween(p.x - (p.lado === 0 ? 16 : -16), p.y, p.x, p.y); }
      else { const cor = p.tipo === "magia" ? 0x7fd0ff : 0xb07cff; g.fillStyle(cor, .35); g.fillCircle(p.x, p.y, 14); g.fillStyle(0xffffff); g.fillCircle(p.x, p.y, 5); }
    }
    if (this.tremor > 0) { this.cameras.main.setScroll((Math.random() - .5) * this.tremor * 10, (Math.random() - .5) * this.tremor * 10); this.tremor = Math.max(0, this.tremor - .05); }
    else this.cameras.main.setScroll(0, 0);
  }

  private tocarEventos() {
    for (const ev of this.e.eventos) {
      if (ev.tipo === "golpe" || ev.tipo === "castelo") {
        const txt = this.add.text(ev.x, ev.y, `-${ev.valor}`, { fontFamily: FONTE, fontSize: ev.tipo === "castelo" ? "22px" : "16px", fontStyle: "bold", color: ev.tipo === "castelo" ? "#ff6b5e" : "#ffffff", stroke: "#000", strokeThickness: 4 }).setOrigin(.5).setDepth(950);
        this.tweens.add({ targets: txt, y: ev.y - 40, alpha: 0, duration: 800, onComplete: () => txt.destroy() });
        if (ev.tipo === "castelo") this.tremor = Math.max(this.tremor, .4);
      } else if (ev.tipo === "explosao") {
        const c = this.add.circle(ev.x, ev.y, ev.valor || 60, ev.lado === 0 ? 0x7fd0ff : 0xb07cff, .45).setDepth(940);
        this.tweens.add({ targets: c, scale: 1.3, alpha: 0, duration: 450, onComplete: () => c.destroy() });
      }
    }
  }

  private mostrarFim() {
    const f = this.e.fim!; const venceu = f.vencedor === this.lado, empate = f.vencedor === -1;
    const W = 1280, H = 720;
    // Limpar textos anteriores (destruir objetos Phaser para evitar vazamento de memória)
    Object.values(this.textos).forEach(txt => txt?.destroy());
    this.textos = {};
    this.add.rectangle(W / 2, H / 2, W, H, 0x0b0710, .7).setDepth(2000);
    this.textos.fim = this.add.text(W / 2, H / 2 - 60, empate ? "Empate!" : venceu ? "🏆 Vitória!" : "Derrota", { fontFamily: FONTE, fontSize: "72px", fontStyle: "bold", color: venceu ? "#ffd97a" : "#ffffff", stroke: "#000", strokeThickness: 10 }).setOrigin(.5).setDepth(2001);
    this.add.text(W / 2, H / 2 + 10, `${f.motivo} · Mortes: ${this.e.mortes[this.lado]} x ${this.e.mortes[this.lado === 0 ? 1 : 0]}`, { fontFamily: FONTE, fontSize: "22px", color: "#e8dcc8" }).setOrigin(.5).setDepth(2001);
    const b = this.add.rectangle(W / 2, H / 2 + 100, 280, 70, 0x2f5fa8).setStrokeStyle(4, 0xffd97a).setDepth(2001).setInteractive({ useHandCursor: true });
    this.add.text(W / 2, H / 2 + 100, "Jogar de novo", { fontFamily: FONTE, fontSize: "26px", fontStyle: "bold", color: "#fff" }).setOrigin(.5).setDepth(2002);

    b.on("pointerdown", () => {
      console.log("Botão 'Jogar de novo' clicado - reiniciando jogo...");
      this.textos = {};
      this.scene.start("Menu");
    });
  }
}
