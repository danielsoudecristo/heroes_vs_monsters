import Phaser from "phaser";
import { Menu } from "./cenas/Menu";
import { Batalha } from "./cenas/Batalha";
import "./style.css";

new Phaser.Game({
  type: Phaser.AUTO,                      // WebGL (placa de vídeo) quando der: bem mais leve no celular
  parent: "app",
  width: 1280, height: 720,               // horizontal
  backgroundColor: "#120c18",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Menu, Batalha]
});
