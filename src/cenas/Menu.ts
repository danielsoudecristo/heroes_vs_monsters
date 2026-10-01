import Phaser from "phaser";
import type { Lado } from "../dados";

// Tela inicial: escolhe o lado e joga contra o bot
export class Menu extends Phaser.Scene {
  constructor() { super("Menu"); }
  create() {
    const { width: W, height: H } = this.scale;
    const g = this.add.graphics();
    g.fillGradientStyle(0x2a1a3a, 0x2a1a3a, 0x0b0710, 0x0b0710, 1); g.fillRect(0, 0, W, H);
    this.add.text(W / 2, 150, "Guerreiros Vs Monster", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "64px", fontStyle: "bold", color: "#ffd97a", stroke: "#1a0f22", strokeThickness: 10 }).setOrigin(.5);
    this.add.text(W / 2, 225, "PvP · protótipo contra o bot", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "24px", color: "#e8dcc8" }).setOrigin(.5);
    this.add.text(W / 2, 330, "Escolha o seu lado", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "28px", fontStyle: "bold", color: "#ffffff" }).setOrigin(.5);
    this.botao(W / 2 - 220, 440, "🏰  Guerreiros", 0x2f5fa8, 0);
    this.botao(W / 2 + 220, 440, "🌑  Sombrio", 0x5a2a7a, 1);
    this.add.text(W / 2, 600, "Derrube o castelo inimigo, ou tenha mais vida no castelo quando o tempo acabar.\nEmpate na vida? Vence quem derrotou mais inimigos.",
      { fontFamily: "Trebuchet MS, sans-serif", fontSize: "18px", color: "#bfb3cc", align: "center" }).setOrigin(.5);
  }
  private botao(x: number, y: number, texto: string, cor: number, lado: Lado) {
    const c = this.add.container(x, y);
    const fundo = this.add.rectangle(0, 0, 360, 110, cor).setStrokeStyle(4, 0xffd97a);
    const t = this.add.text(0, 0, texto, { fontFamily: "Trebuchet MS, sans-serif", fontSize: "34px", fontStyle: "bold", color: "#ffffff" }).setOrigin(.5);
    c.add([fundo, t]);
    fundo.setInteractive({ useHandCursor: true })
      .on("pointerover", () => c.setScale(1.05)).on("pointerout", () => c.setScale(1))
      .on("pointerdown", () => this.scene.start("Batalha", { lado }));
  }
}
