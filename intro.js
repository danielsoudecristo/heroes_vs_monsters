/* =====================================================================
   INTRO — Heroes vs Monsters Battlefront
   1) Carregamento (imagem VS + logo descendo + barra)
   2) Escolha do lado (Heroes ou Monsters) com o raio no meio
   3) Menu (Novo jogo, Opções, Trocar de lado...)
   Este arquivo roda ANTES do jogo.js. O visual fica no index.html (bloco INTRO).
   ===================================================================== */
window.INTRO_ATIVA = true;          // avisa o jogo.js que o menu existe (o jogo espera o "Novo jogo")
(() => {
"use strict";

/* ---------- CONFIG_INTRO: ajustes fáceis ---------- */
const CONFIG_INTRO = {
  tempoMinimoCarga: 3.2,            // segundos mínimos na tela de carregamento (para o logo terminar de descer)
  dicas: [                          // frases que trocam embaixo da barra de carregamento
    "Clique nas energias que caem do céu para ganhar mais guerreiros.",
    "A Elara gera energia sozinha: coloque ela primeiro.",
    "Clique num guerreiro na arena para evoluir; dois cliques rápidos tiram ele.",
    "O Esqueleto Titã aparece no fim de cada nível. Não deixe ele chegar ao portão!",
    "Tecla H mostra ou esconde as cartas. Tecla F deixa em tela cheia."
  ],
  trocaDica: 3.5,                   // segundos entre uma dica e outra
  // personagem animado do menu, de acordo com o lado escolhido
  // x, y = onde ficam os pés na tela de 1280 x 720; escala = tamanho; virar = olha para a esquerda
  campeoes: {
    heroes: {                       // cavaleiro atacando (folha: Menu/heroi_menu.png)
      src: "Menu/heroi_menu.png", cols: 8, quadros: 151, cw: 253, ch: 173, ax: 74, ay: 172, fps: 30,
      escala: 1.5, x: 1060, y: 650, virar: true
    },
    monsters: {                     // Esqueleto Titã andando (a mesma folha do jogo)
      src: "Esqueleto Tita/andando/andando.png", cols: 8, quadros: 126, cw: 167, ch: 205, ax: 93, ay: 203, fps: 24,
      escala: 1.6, x: 1040, y: 650, virar: true
    }
  }
};

const $ = id => document.getElementById(id);
const intro = $("intro"), palco = $("introPalco"), logo = $("logo");
const telas = { carga: $("telaCarga"), lado: $("telaLado"), menu: $("telaMenu") };
let telaAtual = "carga";
document.documentElement.classList.add("intro-aberta");

/* ---------- Tamanho: a tela de 1280 x 720 cresce ou encolhe para caber na janela ---------- */
function ajustarTamanho() {
  const k = Math.min(innerWidth / 1280, innerHeight / 720);
  palco.style.transform = `scale(${k}) translate(-50%, -50%)`;
}
addEventListener("resize", ajustarTamanho);
ajustarTamanho();

/* ---------- Sons do menu (feitos na hora, sem arquivo) ---------- */
let audioCtx = null;
function somOk() { return !window.JOGO || window.JOGO.somLigado(); }
function ctxAudio() {
  if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}
function ruido(ac, dur) {
  const b = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = ac.createBufferSource(); s.buffer = b; return s;
}
function somClique(forte) {                     // clique metálico curto
  const ac = somOk() && ctxAudio(); if (!ac) return;
  const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
  o.type = "triangle"; o.frequency.setValueAtTime(forte ? 720 : 980, t); o.frequency.exponentialRampToValueAtTime(forte ? 240 : 520, t + .09);
  g.gain.setValueAtTime(forte ? .22 : .08, t); g.gain.exponentialRampToValueAtTime(.001, t + .14);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + .15);
}
function somTrovao() {                          // estalo do raio + ronco grave
  const ac = somOk() && ctxAudio(); if (!ac) return;
  const t = ac.currentTime, s = ruido(ac, 2.2), f = ac.createBiquadFilter(), g = ac.createGain();
  f.type = "lowpass"; f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(140, t + 1.6);
  g.gain.setValueAtTime(.001, t); g.gain.linearRampToValueAtTime(.55, t + .03); g.gain.exponentialRampToValueAtTime(.001, t + 2.1);
  s.connect(f).connect(g).connect(ac.destination); s.start(t);
}

/* ---------- Brasas subindo (em todas as telas) ---------- */
const cvB = $("brasas"), cB = cvB.getContext("2d"), brasas = [];
const reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;
function novaBrasa(y) {
  return { x: Math.random() * 1280, y: y ?? 740, vx: (Math.random() - .5) * 18, vy: -(18 + Math.random() * 40),
           r: .8 + Math.random() * 2, vida: 0, dur: 5 + Math.random() * 6, fase: Math.random() * 6 };
}
for (let i = 0; i < 46; i++) brasas.push(novaBrasa(Math.random() * 720));
function desenharBrasas(dt, t) {
  cB.clearRect(0, 0, 1280, 720);
  if (reduz) return;
  const verde = telaAtual === "menu" && telas.menu.dataset.lado === "monsters";
  for (const b of brasas) {
    b.vida += dt; b.x += (b.vx + Math.sin(t * 1.3 + b.fase) * 10) * dt; b.y += b.vy * dt;
    if (b.vida > b.dur || b.y < -10) Object.assign(b, novaBrasa());
    const a = Math.min(1, b.vida / .6, (b.dur - b.vida) / 1.2) * (.55 + .45 * Math.sin(t * 6 + b.fase));
    cB.globalAlpha = Math.max(0, a);
    cB.fillStyle = verde ? "#b8ff6a" : "#ffb347";
    cB.shadowColor = verde ? "#6fdc2a" : "#ff7a1a"; cB.shadowBlur = 8;
    cB.beginPath(); cB.arc(b.x, b.y, b.r, 0, Math.PI * 2); cB.fill();
  }
  cB.globalAlpha = 1; cB.shadowBlur = 0;
}

/* ---------- Trocar de tela ---------- */
function irPara(nome) {
  for (const k in telas) telas[k].classList.toggle("on", k === nome);
  telaAtual = nome;
}

/* ================= 1) CARREGAMENTO ================= */
let cargaT = 0, cargaPronta = false, dicaI = 0, dicaT = 0;
const elDica = $("cargaDica"), elFill = $("cargaFill"), elTxt = $("cargaTxt");
elDica.textContent = CONFIG_INTRO.dicas[0];
// o logo começa a descer quando a fonte estiver pronta (para não trocar de letra no meio da animação)
Promise.race([
  document.fonts ? Promise.all([document.fonts.load('900 60px "Cinzel Decorative"'), document.fonts.load('900 30px "Cinzel"')]) : Promise.resolve(),
  new Promise(r => setTimeout(r, 1200))
]).then(() => logo.classList.add("desce"));

function atualizarCarga(dt) {
  cargaT += dt;
  const p = window.JOGO ? window.JOGO.progresso() : { feitas: 1, total: 1, pronto: true };
  const k = p.total ? p.feitas / p.total : 1;
  const mostrado = Math.min(k, cargaT / CONFIG_INTRO.tempoMinimoCarga);   // a barra não enche antes do logo pousar
  elFill.style.width = (mostrado * 100).toFixed(1) + "%";
  elTxt.textContent = `Carregando ${Math.round(mostrado * 100)}%`;
  dicaT += dt;
  if (dicaT > CONFIG_INTRO.trocaDica) {
    dicaT = 0; elDica.style.opacity = 0;
    setTimeout(() => { dicaI = (dicaI + 1) % CONFIG_INTRO.dicas.length; elDica.textContent = CONFIG_INTRO.dicas[dicaI]; elDica.style.opacity = 1; }, 400);
  }
  if (!cargaPronta && p.pronto && cargaT >= CONFIG_INTRO.tempoMinimoCarga) {
    cargaPronta = true;
    elFill.style.width = "100%"; elTxt.textContent = "Carregando 100%";
    setTimeout(() => telas.carga.classList.add("pronta"), 350);
    $("cargaContinuar").textContent = matchMedia("(pointer: coarse)").matches ? "Toque para começar" : "Clique para começar";
  }
}
function sairDaCarga() {                        // o clique também libera o som no navegador
  if (!cargaPronta || telaAtual !== "carga") return;
  somTrovao(); flash();
  logo.classList.remove("desce"); logo.classList.add("fixo");
  requestAnimationFrame(() => { logo.classList.add("some"); });
  irPara("lado");
  focoLado("");
}
telas.carga.addEventListener("click", sairDaCarga);

/* ================= 2) ESCOLHA DO LADO ================= */
const svgRaio = $("raio");
// linha do raio da imagem: do topo (x 54,6%) até embaixo (x 45,2%)
const RAIO = { x0: 1280 * .546, x1: 1280 * .452 };
let raioT = 0, raioForca = 0;
function pontosRaio(desvio) {
  const pts = [], n = 16;
  for (let i = 0; i <= n; i++) {
    const t = i / n, y = t * 720, x = RAIO.x0 + (RAIO.x1 - RAIO.x0) * t;
    pts.push([x + (i && i < n ? (Math.random() - .5) * desvio : 0), y]);
  }
  return pts.map(p => p.map(v => v.toFixed(1)).join(",")).join(" ");
}
function desenharRaio() {
  const foco = telas.lado.dataset.foco, cor = foco === "monsters" ? "#ff6a3a" : foco === "heroes" ? "#6fb8ff" : "#c9e4ff";
  const f = .55 + raioForca * .45;
  let galho = "";
  for (let i = 0; i < 3; i++) {                  // galhos pequenos saindo do raio
    const t = Math.random(), y = t * 720, x = RAIO.x0 + (RAIO.x1 - RAIO.x0) * t, lado = Math.random() < .5 ? -1 : 1;
    galho += `<polyline points="${x.toFixed(0)},${y.toFixed(0)} ${(x + lado * (20 + Math.random() * 40)).toFixed(0)},${(y + 20 + Math.random() * 30).toFixed(0)} ${(x + lado * (40 + Math.random() * 60)).toFixed(0)},${(y + 50 + Math.random() * 40).toFixed(0)}" fill="none" stroke="${cor}" stroke-width="2" opacity="${(.5 * f).toFixed(2)}"/>`;
  }
  svgRaio.innerHTML =
    `<defs><filter id="brilhoRaio" x="-50%" y="-5%" width="200%" height="110%"><feGaussianBlur stdDeviation="7"/></filter></defs>` +
    `<polyline points="${pontosRaio(46)}" fill="none" stroke="${cor}" stroke-width="${(16 * f).toFixed(1)}" opacity="${(.7 * f).toFixed(2)}" filter="url(#brilhoRaio)"/>` +
    `<polyline points="${pontosRaio(34)}" fill="none" stroke="#fff" stroke-width="${(2.6 + 2 * f).toFixed(1)}" stroke-linejoin="round" opacity="${(.85 * f).toFixed(2)}"/>` + galho;
}
function focoLado(lado) {
  if (telas.lado.dataset.foco !== lado && lado) somClique(false);
  telas.lado.dataset.foco = lado;
}
let escolhendo = false;
function escolherLado(lado) {
  if (escolhendo || telaAtual !== "lado") return;
  escolhendo = true;
  focoLado(lado);
  telas.lado.classList.add("escolheu");
  raioForca = 1.6; somTrovao(); flash();
  try { localStorage.setItem("hvm_lado", lado); } catch {}
  setTimeout(() => { abrirMenu(lado); }, 1000);
  setTimeout(() => { telas.lado.classList.remove("escolheu"); escolhendo = false; }, 1700);
}
for (const el of telas.lado.querySelectorAll(".lado")) {
  el.addEventListener("pointerenter", () => { if (!escolhendo) focoLado(el.dataset.lado); });
  el.addEventListener("click", () => escolherLado(el.dataset.lado));
}
function flash() { const c = $("clarao"); c.classList.remove("vai"); void c.offsetWidth; c.classList.add("vai"); }

/* ================= 3) MENU ================= */
let ladoMenu = "heroes";
const BRASOES = {
  heroes: '<svg viewBox="0 0 40 40"><path d="M20 3l14 5v10c0 9-6 15-14 19C12 33 6 27 6 18V8z" fill="#2a4a9c" stroke="#f6c343" stroke-width="2.5"/><path d="M20 10c-2 3-2 6 0 9 2-3 2-6 0-9zM14 17c0 3 2 5 6 5 4 0 6-2 6-5M20 22v7M16 26h8" fill="none" stroke="#f6c343" stroke-width="2" stroke-linecap="round"/></svg>',
  monsters: '<svg viewBox="0 0 40 40"><path d="M20 4c-8 0-13 5-13 12 0 4 2 7 5 9v5h16v-5c3-2 5-5 5-9 0-7-5-12-13-12z" fill="#e8dfc8" stroke="#1a1208" stroke-width="2"/><circle cx="14.5" cy="17" r="3.4" fill="#8be03c"/><circle cx="25.5" cy="17" r="3.4" fill="#8be03c"/><path d="M20 21l-2 4h4zM15 30v3M20 30v3M25 30v3" stroke="#1a1208" stroke-width="2" fill="#1a1208"/></svg>'
};
function abrirMenu(lado) {
  ladoMenu = lado || ladoMenu;
  telas.menu.dataset.lado = ladoMenu;
  $("perfilLado").textContent = ladoMenu === "monsters" ? "Monsters" : "Heroes";
  $("brasao").innerHTML = BRASOES[ladoMenu];
  const temPartida = window.JOGO && window.JOGO.temPartida();
  telas.menu.querySelector('[data-acao="continuar"]').hidden = !temPartida;
  const novo = telas.menu.querySelector('[data-acao="novo"]');
  novo.classList.toggle("principal", !temPartida);
  $("opSom").textContent = somOk() ? "Ligado" : "Desligado";
  carregarCampeao();
  irPara("menu");
  logo.classList.remove("some", "desce", "fixo"); logo.classList.add("menu");
  intro.hidden = false; document.documentElement.classList.add("intro-aberta");
  focoMenu(0);
}
// o botão "Menu" da arena chama isto: para o jogo e volta para cá
window.INTRO_ABRIR_MENU = () => {
  if (window.JOGO) window.JOGO.pararParaMenu();
  abrirMenu(ladoMenu);
};
function botoesVisiveis() { return [...$("botoesMenu").querySelectorAll(".bm")].filter(b => !b.hidden && !b.disabled); }
let focoI = 0;
function focoMenu(i) {
  const bs = botoesVisiveis(); if (!bs.length) return;
  focoI = (i + bs.length) % bs.length;
  for (const b of $("botoesMenu").querySelectorAll(".bm")) b.classList.remove("foco");
  bs[focoI].classList.add("foco");
}
function fecharIntro() {
  intro.hidden = true; document.documentElement.classList.remove("intro-aberta");
  const palcoJogo = document.querySelector(".palco");
  if (palcoJogo) palcoJogo.scrollIntoView({ block: "center" });
}
function acaoMenu(acao) {
  somClique(true);
  if (acao === "novo") {
    if (ladoMenu === "monsters") { abrirJanela("janelaMonsters"); return; }
    fecharIntro(); if (window.JOGO) window.JOGO.iniciar("heroes");
  } else if (acao === "continuar") {
    fecharIntro(); if (window.JOGO) window.JOGO.continuar();
  } else if (acao === "opcoes") abrirJanela("janelaOpcoes");
  else if (acao === "lado") {
    logo.classList.remove("menu"); logo.classList.add("fixo", "some");
    irPara("lado"); focoLado("");
  }
}
for (const b of $("botoesMenu").querySelectorAll(".bm")) {
  b.addEventListener("click", () => { if (!b.disabled) acaoMenu(b.dataset.acao); });
  b.addEventListener("pointerenter", () => { if (b.disabled) return; const i = botoesVisiveis().indexOf(b); if (i !== focoI) { focoMenu(i); somClique(false); } });
}
// janelas
let janelaAberta = null;
function abrirJanela(id) { janelaAberta = $(id); janelaAberta.classList.add("on"); const b = janelaAberta.querySelector(".jb.ouro") || janelaAberta.querySelector(".jb"); b && b.focus(); }
function fecharJanela() { if (janelaAberta) janelaAberta.classList.remove("on"); janelaAberta = null; }
for (const el of document.querySelectorAll(".janela-fundo")) {
  el.addEventListener("click", e => { if (e.target === el || e.target.hasAttribute("data-fechar")) { somClique(false); fecharJanela(); } });
}
$("opSom").addEventListener("click", () => {
  const ligado = window.JOGO ? window.JOGO.alternarSom() : true;
  $("opSom").textContent = ligado ? "Ligado" : "Desligado"; somClique(false);
});
$("jogarHeroes").addEventListener("click", () => {
  fecharJanela(); ladoMenu = "heroes";
  try { localStorage.setItem("hvm_lado", "heroes"); } catch {}
  telas.menu.dataset.lado = "heroes";
  fecharIntro(); if (window.JOGO) window.JOGO.iniciar("heroes");
});

/* ---------- Personagem animado do menu ---------- */
const cvC = $("campeao"), cC = cvC.getContext("2d");
let camp = null, campT = 0;
const imgsCampeao = {};
function carregarCampeao() {
  const cfg = CONFIG_INTRO.campeoes[ladoMenu];
  if (!imgsCampeao[ladoMenu]) { const im = new Image(); im.src = cfg.src; imgsCampeao[ladoMenu] = im; }
  camp = { cfg, img: imgsCampeao[ladoMenu] };
  const w = Math.ceil(cfg.cw * cfg.escala) + 20, h = Math.ceil(cfg.ch * cfg.escala) + 30;
  cvC.width = w; cvC.height = h;
  const esq = cfg.virar ? cfg.x - (cfg.cw - cfg.ax) * cfg.escala - 10 : cfg.x - cfg.ax * cfg.escala - 10;
  cvC.style.left = esq + "px"; cvC.style.top = (cfg.y - cfg.ay * cfg.escala - 10) + "px";
  campT = 0;
}
function desenharCampeao(dt) {
  if (!camp || telaAtual !== "menu") return;
  const { cfg, img } = camp;
  cC.clearRect(0, 0, cvC.width, cvC.height);
  if (!img.complete || !img.naturalWidth) return;
  campT += dt;
  const q = Math.floor(campT * cfg.fps) % cfg.quadros, sx = (q % cfg.cols) * cfg.cw, sy = Math.floor(q / cfg.cols) * cfg.ch;
  const w = cfg.cw * cfg.escala, h = cfg.ch * cfg.escala, pesY = 10 + cfg.ay * cfg.escala;
  // sombra no chão
  cC.save(); cC.globalAlpha = .45; cC.fillStyle = "#000";
  cC.beginPath(); cC.ellipse(cvC.width / 2, pesY, w * .28, 9, 0, 0, Math.PI * 2); cC.fill(); cC.restore();
  cC.save();
  if (cfg.virar) { cC.translate(cvC.width, 0); cC.scale(-1, 1); }
  cC.drawImage(img, sx, sy, cfg.cw, cfg.ch, 10, 10, w, h);
  cC.restore();
}

/* ---------- Teclado ---------- */
addEventListener("keydown", e => {
  if (intro.hidden) return;
  const k = e.key;
  if (telaAtual === "carga") { if (k === "Enter" || k === " ") { sairDaCarga(); e.preventDefault(); } return; }
  if (telaAtual === "lado") {
    if (k === "ArrowLeft" || k === "a" || k === "A") focoLado("heroes");
    else if (k === "ArrowRight" || k === "d" || k === "D") focoLado("monsters");
    else if ((k === "Enter" || k === " ") && telas.lado.dataset.foco) escolherLado(telas.lado.dataset.foco);
    else return;
    e.preventDefault(); return;
  }
  if (telaAtual === "menu") {
    if (janelaAberta) { if (k === "Escape") { fecharJanela(); e.preventDefault(); } return; }
    if (k === "ArrowDown" || k === "s" || k === "S") { focoMenu(focoI + 1); somClique(false); }
    else if (k === "ArrowUp" || k === "w" || k === "W") { focoMenu(focoI - 1); somClique(false); }
    else if (k === "Enter" || k === " ") { const b = botoesVisiveis()[focoI]; if (b) acaoMenu(b.dataset.acao); }
    else return;
    e.preventDefault();
  }
});

/* ---------- Laço das animações do intro ---------- */
let ultimo = performance.now();
function quadroIntro(agora) {
  const dt = Math.min(.05, (agora - ultimo) / 1000); ultimo = agora;
  if (!intro.hidden) {
    if (telaAtual === "carga") atualizarCarga(dt);
    if (telaAtual === "lado") {
      raioT -= dt; raioForca = Math.max(0, raioForca - dt * 1.5);
      if (raioT <= 0) { desenharRaio(); raioT = .06 + Math.random() * .08; }
    }
    desenharCampeao(dt);
    desenharBrasas(dt, agora / 1000);
  }
  requestAnimationFrame(quadroIntro);
}
requestAnimationFrame(quadroIntro);
})();
