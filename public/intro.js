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
  // MODO_MONSTERS: a animação de andar de cada herói. Basta criar a pasta "andando" dentro da pasta do herói
  // (em public/assets) com o arquivo andando.png, que o menu marca o herói com ✔ sozinho.
  andarHerois: [
    { nome: "Elara",               src: "Elara/andando/andando.png" },
    { nome: "Nick",                src: "Nick/andando/andando.png" },
    { nome: "Arqueiro",            src: "Arqueiro/andando/andando.png" },
    { nome: "Guerreiro Protetor",  src: "Guerreiro Protetor/andando/andando.png" },
    { nome: "Mago",                src: "Mago/andando/andando.png" },
    { nome: "Mago de Fogo",        src: "Mago de Fogo/andando/andando.png" },
    { nome: "Cavaleiro Sentinela", src: "Cavaleiro Sentinela/andando/andando.png" }
  ],
  // (o personagem sozinho do menu virou a BATALHA_MENU, mais abaixo)
};

const $ = id => document.getElementById(id);
/* IMAGENS_INTRO: o jogo tenta .png, depois .jpg e .webp (pode trocar o formato da imagem sem mexer no código).
   FUNDO_MENU: o fundo do menu é a arena de noite do lado escolhido. */
const FUNDO_MENU = {
  heroes:   ["Fundo/arena_guerreiro_noite", "Fundo/fundo_do_jogo2"],
  monsters: ["Fundo/arena_monsters_noite", "Fundo/arena_guerreiro_noite", "Fundo/fundo_do_jogo2"]
};
function carregarImagem(img, nomes) {
  const lista = [];
  for (const n of nomes) for (const ext of ["png", "jpg", "webp"]) lista.push(n + "." + ext);
  let i = 0;
  img.onerror = () => { if (++i < lista.length) img.src = lista[i]; };
  img.src = lista[0];
}
document.querySelectorAll("img[data-fotos]").forEach(img => carregarImagem(img, [img.dataset.fotos]));
const intro = $("intro"), palco = $("introPalco"), logo = $("logo");
const telas = { carga: $("telaCarga"), login: $("telaLogin"), lado: $("telaLado"), menu: $("telaMenu") };
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
  // LOGIN: quem já entrou com Google (ou escolheu convidado nesta visita) vai direto escolher o lado
  if (contaAtual() || sessionStorage.getItem("hvm_convidado")) irParaLado();
  else irPara("login");                                          // na tela de entrar o logo continua em cima
}
function irParaLado() {
  requestAnimationFrame(() => { logo.classList.add("some"); });
  irPara("lado"); focoLado("");
}
telas.carga.addEventListener("click", sairDaCarga);

/* ================= 1b) LOGIN ================= */
function contaAtual() { return window.CONTA && window.CONTA.usuario ? window.CONTA.usuario() : null; }
$("btGoogle").addEventListener("click", async () => {
  somClique(true);
  if (!window.CONTA) { $("loginMsg").textContent = "O login ainda não carregou. Confira se o npm run dev está rodando e tente de novo."; return; }
  $("btGoogle").disabled = true; $("loginMsg").textContent = "Abrindo o Google...";
  try { await window.CONTA.entrarGoogle(); }                       // a página vai para o Google e volta sozinha
  catch (e) { $("btGoogle").disabled = false; $("loginMsg").textContent = "Não deu para entrar: " + (e.message || e); }
});
window.addEventListener("login-fechado", () => {                  // APP: fechou a janela do Google sem entrar
  $("btGoogle").disabled = false; $("loginMsg").textContent = "Login cancelado. Toque em Entrar com Google para tentar de novo.";
});
$("btConvidado").addEventListener("click", () => {
  somClique(true);
  try { sessionStorage.setItem("hvm_convidado", "1"); } catch {}
  irParaLado();
});
// voltou do Google já com a conta: segue para a escolha do lado
window.addEventListener("conta", e => {
  if (e.detail && telaAtual === "login") irParaLado();
  atualizarPerfilMenu(); atualizarOpcaoConta();
});
function atualizarOpcaoConta() {
  const u = contaAtual(), t = $("opContaTxt"), b = $("opConta");
  if (!t || !b) return;
  t.textContent = u ? `Conta: ${u.email || u.nome}` : "Conta: convidado";
  b.textContent = u ? "Sair da conta" : "Entrar com Google";
}
$("opConta").addEventListener("click", async () => {
  somClique(false);
  if (!window.CONTA) return;
  if (contaAtual()) { await window.CONTA.sair(); try { sessionStorage.removeItem("hvm_convidado"); } catch {} }
  else { try { await window.CONTA.entrarGoogle(); } catch (e) { alert("Não deu para entrar: " + (e.message || e)); } }
});

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
  const fundoMenu = $("menuFundo");
  if (fundoMenu && fundoMenu.dataset.lado !== ladoMenu) { fundoMenu.dataset.lado = ladoMenu; carregarImagem(fundoMenu, FUNDO_MENU[ladoMenu]); }
  $("perfilLado").textContent = ladoMenu === "monsters" ? "Monsters" : "Heroes";
  $("brasao").innerHTML = BRASOES[ladoMenu]; $("brasao").style.background = ""; $("brasao").style.boxShadow = "";
  const temPartida = window.JOGO && window.JOGO.temPartida();
  telas.menu.querySelector('[data-acao="continuar"]').hidden = !temPartida;
  const novo = telas.menu.querySelector('[data-acao="novo"]');
  novo.classList.toggle("principal", !temPartida);
  $("opSom").textContent = somOk() ? "Ligado" : "Desligado";
  irPara("menu");
  logo.classList.remove("some", "desce", "fixo"); logo.classList.add("menu");
  intro.hidden = false; document.documentElement.classList.add("intro-aberta");
  atualizarPerfilMenu(); atualizarOpcaoConta(); atualizarBonusHoje(); ficarOnline(); carregarAmigos();
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
    if (ladoMenu === "monsters") {
      // MODO_MONSTERS: começa se pelo menos 1 herói já tem a animação de andar; se não, mostra a lista
      const prontos = window.JOGO && window.JOGO.heroisQueAndam ? window.JOGO.heroisQueAndam() : [];
      if (!prontos.length) { conferirAndarHerois(); abrirJanela("janelaMonsters"); return; }
      fecharIntro(); window.JOGO.iniciar("monsters"); return;
    }
    fecharIntro(); if (window.JOGO) window.JOGO.iniciar("heroes");
  } else if (acao === "continuar") {
    fecharIntro(); if (window.JOGO) window.JOGO.continuar();
  } else if (acao === "pvp") {                                  // BATALHA PvP: procura uma pessoa; se não achar, bot
    if (contaAtual() && window.CONTA) procurarPartida();
    else { fecharIntro(); if (window.JOGO) window.JOGO.iniciarPvp(ladoMenu); }
  } else if (acao === "opcoes") abrirJanela("janelaOpcoes");
  else if (acao === "ranking") abrirRanking();
  else if (acao === "personagens") abrirPersonagens();
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
function fecharJanela() {
  if (janelaAberta && janelaAberta.id === "janelaBusca" && busca && busca.ativa) {   // fechou a busca: sai da fila
    busca.ativa = false; if (window.CONTA) window.CONTA.rpc("sair_da_fila").catch(() => {});
  }
  if (janelaAberta) janelaAberta.classList.remove("on"); janelaAberta = null;
}
for (const el of document.querySelectorAll(".janela-fundo")) {
  el.addEventListener("click", e => { if (e.target === el || e.target.hasAttribute("data-fechar")) { somClique(false); fecharJanela(); } });
}
$("opSom").addEventListener("click", () => {
  const ligado = window.JOGO ? window.JOGO.alternarSom() : true;
  $("opSom").textContent = ligado ? "Ligado" : "Desligado"; somClique(false);
});
function jogarComoHeroes() {
  fecharJanela(); ladoMenu = "heroes";
  try { localStorage.setItem("hvm_lado", "heroes"); } catch {}
  telas.menu.dataset.lado = "heroes";
  fecharIntro(); if (window.JOGO) window.JOGO.iniciar("heroes");
}
if ($("jogarHeroes")) $("jogarHeroes").addEventListener("click", jogarComoHeroes);

/* ---------- MODO_MONSTERS: confere quais heróis já têm a pasta "andando" ---------- */
// Procura os arquivos toda vez que a janela abre (não precisa recarregar a página depois de criar a pasta).
// Se o index.html for de uma versão antiga (sem a lista), monta a janela e a lista aqui mesmo
function garantirJanelaMonsters() {
  let fundo = $("janelaMonsters");
  if (!fundo) {
    fundo = document.createElement("div"); fundo.className = "janela-fundo"; fundo.id = "janelaMonsters";
    fundo.innerHTML = '<div class="janela" role="dialog" aria-label="Modo Monsters"><h3>Modo Monsters</h3><p></p>' +
      '<div class="acoes"><button class="jb" data-fechar>Voltar</button><button class="jb ouro" id="jogarHeroes">Jogar como Heroes</button></div></div>';
    telas.menu.appendChild(fundo);
    fundo.addEventListener("click", e => { if (e.target === fundo || e.target.hasAttribute("data-fechar")) { somClique(false); fecharJanela(); } });
    $("jogarHeroes").addEventListener("click", jogarComoHeroes);
  }
  const p = fundo.querySelector("p");
  if (p && !p.id) p.id = "monstersTxt";
  if (!$("listaHerois")) {
    const ul = document.createElement("ul"); ul.id = "listaHerois"; ul.className = "lista-herois";
    ul.style.cssText = "list-style:none;margin:-6px 0 18px;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;text-align:left;font-size:15px";
    p.after(ul);
  }
}
function conferirAndarHerois() {
  garantirJanelaMonsters();
  const lista = $("listaHerois"); lista.innerHTML = "";
  let prontos = 0;
  const txt = () => {
    const n = CONFIG_INTRO.andarHerois.length;
    $("monstersTxt").textContent = prontos === n
      ? "Todos os heróis já têm a animação de andar! Mande as folhas para o Claude ligar o modo (ele alinha os pés e o passo)."
      : `Neste modo você comanda os esqueletos, e os heróis vêm andando pela arena. Heróis com a animação de andar: ${prontos} de ${n}.`;
  };
  for (const h of CONFIG_INTRO.andarHerois) {
    const li = document.createElement("li");
    if (!getComputedStyle(lista).gridTemplateColumns.includes(" ")) li.style.cssText = "padding:6px 10px;border-radius:6px;background:rgba(0,0,0,.28)";
    li.innerHTML = `<b>✕</b><span>${h.nome}<small>${h.src.split("/")[0]}/andando/</small></span>`;
    lista.appendChild(li);
    const im = new Image();
    im.onload = () => { li.classList.add("ok"); li.querySelector("b").textContent = "✓"; prontos++; txt(); };
    im.src = h.src + "?v=" + Date.now();          // "?v=" evita pegar a resposta antiga guardada pelo navegador
  }
  txt();
}

/* ---------- BATALHA_MENU: guerra acontecendo no fundo do menu (sem barra de vida) ----------
   Usa as folhas do jogo. Cada dupla luta no seu lugar: heróis olhando para a direita, monstros para a esquerda.
   x, y = onde ficam os pés na tela de 1280 x 720; t = tamanho (os de trás menores, os da frente maiores). */
const BATALHA_MENU = {
  // id do personagem, lado (h = herói olhando para a direita, m = monstro olhando para a esquerda),
  // x e y dos pés, t = tamanho, alvo = em quem ele bate ou atira
  lutadores: [
    // retaguarda dos heróis (à esquerda dos botões): quem atira de longe
    { id: "elara",     lado: "h", x: 335,  y: 300, t: .70 },
    { id: "arqueiro",  lado: "h", x: 335,  y: 398, t: .80, alvo: "esqueletoArqueiro" },
    { id: "mago",      lado: "h", x: 322,  y: 500, t: .90, alvo: "esqueletoMago" },
    { id: "nick",      lado: "h", x: 300,  y: 615, t: 1.02, alvo: "esqueleto" },
    { id: "esqueleto", lado: "m", x: 405,  y: 615, t: 1.02, alvo: "nick" },
    // linha de frente (à direita dos botões): duelos
    { id: "magoFogo",          lado: "h", x: 872,  y: 432, t: .86, alvo: "esqueletoFogo" },
    { id: "esqueletoFogo",     lado: "m", x: 1010, y: 432, t: .86, alvo: "magoFogo" },
    { id: "protetor",          lado: "h", x: 895,  y: 542, t: .96, alvo: "esqueletoProtetor" },
    { id: "esqueletoProtetor", lado: "m", x: 1000, y: 542, t: .96, alvo: "protetor" },
    { id: "sentinela",         lado: "h", x: 935,  y: 655, t: 1.08, alvo: "esqueletoTita" },
    { id: "esqueletoTita",     lado: "m", x: 1092, y: 655, t: 1.08, alvo: "sentinela" },
    // retaguarda dos monstros (fundo à direita): atiram de volta
    { id: "esqueletoArqueiro", lado: "m", x: 1215, y: 360, t: .76, alvo: "arqueiro" },
    { id: "esqueletoMago",     lado: "m", x: 1228, y: 478, t: .86, alvo: "mago" }
  ],
  pausa: [0.6, 1.8],          // segundos parado entre um ataque e outro (sorteado)
  escurecer: 0.18             // deixa a batalha um pouco mais escura para os botões se destacarem
};
const cvB2 = $("campeao"), cB2 = cvB2.getContext("2d");
cvB2.width = 1280; cvB2.height = 720; cvB2.style.left = "0px"; cvB2.style.top = "0px";
let lutadores = [], tirosMenu = [], faiscasMenu = [], batalhaPronta = false;
function animLutador(f, nome) { const a = f.anims[nome]; return a && a.ok ? a : null; }
function montarBatalha() {
  const S = window.JOGO && window.JOGO.sprites ? window.JOGO.sprites() : null;
  if (!S) return;
  lutadores = [];
  for (const c of BATALHA_MENU.lutadores) {
    const fonte = c.lado === "h" ? S.G[c.id] : S.P[c.id];
    if (!fonte) continue;
    const f = { ...c, anims: c.lado === "h" ? fonte.sprite.anims : fonte.anims, esc: c.lado === "h" ? fonte.sprite.escala : fonte.escala,
                g: c.lado === "h" ? fonte : null, per: c.lado === "m" ? fonte : null, estado: "espera", tempo: Math.random() * 1.5, espera: .3 + Math.random() * 1.5, flash: 0 };
    lutadores.push(f);
  }
  for (const f of lutadores) f.alvo = lutadores.find(o => o.id === f.alvo) || null;
  batalhaPronta = true;
}
// qual animação cada um usa para atacar e para esperar
function ataqueDe(f) {
  if (!f.alvo && f.id !== "sentinela") return null;
  if (f.lado === "h") {
    if (f.id === "protetor" || f.id === "elara") return null;          // protetor só defende; Elara gera energia
    if (f.id === "sentinela" && Math.random() < .25 && animLutador(f, "terremoto")) return "terremoto";
    return animLutador(f, "atacando") ? "atacando" : null;
  }
  if (f.id === "esqueletoTita") return Math.random() < .3 && animLutador(f, "socar") ? "socar" : (animLutador(f, "lutar") ? "lutar" : null);
  return animLutador(f, "atacar") ? "atacar" : null;
}
function esperaDe(f) {
  if (f.lado === "h") return animLutador(f, f.id === "protetor" ? "defendendo" : "parado");
  return animLutador(f, "parado") || null;
}
// quadros em que o golpe acerta / o tiro sai
function momentosDe(f, nome, an) {
  if (an.quadroTiro != null) return { tiro: [an.quadroTiro] };
  if (an.quadroGolpe != null) return { golpe: [].concat(an.quadroGolpe) };
  if (f.id === "sentinela") return { golpe: f.g.sentinela.quadrosGolpe };
  if (f.id === "esqueletoTita") return { golpe: nome === "socar" ? f.per.tita.quadrosImpacto : f.per.tita.quadrosGolpe };
  return { golpe: [Math.floor(an.quadros * .55)] };
}
const TIPO_TIRO = { arqueiro: "flecha", esqueletoArqueiro: "flechaM", mago: "magia", esqueletoMago: "magiaM", magoFogo: "fogo" };
function atualizarBatalha(dt) {
  if (!batalhaPronta) montarBatalha();
  for (const f of lutadores) {
    f.tempo += dt; f.flash = Math.max(0, f.flash - dt * 4);
    if (f.estado === "espera" && f.tempo > (f.espera ?? 1)) {
      const nome = ataqueDe(f);
      if (nome) { f.estado = "ataque"; f.atq = nome; f.tempo = 0; f.feitos = []; }
      else { f.tempo = 0; f.espera = 2; }
    } else if (f.estado === "ataque") {
      const an = animLutador(f, f.atq);
      if (!an) { f.estado = "espera"; continue; }
      const q = Math.floor(f.tempo * an.fps), mo = momentosDe(f, f.atq, an);
      for (const k of (mo.golpe || [])) if (q >= k && !f.feitos.includes(k)) { f.feitos.push(k); acertarMenu(f); }
      for (const k of (mo.tiro || [])) if (q >= k && !f.feitos.includes(k)) { f.feitos.push(k); atirarMenu(f); }
      if (q >= an.quadros) { f.estado = "espera"; f.tempo = 0; f.espera = BATALHA_MENU.pausa[0] + Math.random() * (BATALHA_MENU.pausa[1] - BATALHA_MENU.pausa[0]); }
    }
  }
  for (const s of tirosMenu) {
    s.k += dt / s.dur;
    if (s.k >= 1 && !s.fim) { s.fim = true; if (s.alvo) s.alvo.flash = 1; explosaoMenu(s.x1, s.y1, s.cor, 14); }
  }
  tirosMenu = tirosMenu.filter(s => !s.fim);
  for (const p of faiscasMenu) { p.vida += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; }
  faiscasMenu = faiscasMenu.filter(p => p.vida < p.max);
}
function acertarMenu(f) {
  const a = f.alvo; if (!a) return;
  a.flash = 1;
  const x = (f.x + a.x) / 2, y = f.y - 70 * f.t;
  explosaoMenu(x, y, f.id === "esqueletoFogo" ? "#ff9a3c" : f.id === "esqueletoTita" || f.id === "sentinela" ? "#e8dfc8" : "#fff2c4", f.id === "esqueletoTita" || f.id === "sentinela" ? 22 : 12);
}
function atirarMenu(f) {
  const a = f.alvo; if (!a) return;
  const tipo = TIPO_TIRO[f.id] || "magia", dir = f.lado === "h" ? 1 : -1;
  const x0 = f.x + dir * 60 * f.t, y0 = f.y - 95 * f.t, x1 = a.x - dir * 20 * a.t, y1 = a.y - 80 * a.t;
  const cor = { flecha: "#fff2c4", flechaM: "#e8dfc8", magia: "#7fd2ff", magiaM: "#c08cff", fogo: "#ff8a2a" }[tipo];
  tirosMenu.push({ tipo, x0, y0, x1, y1, k: 0, dur: Math.abs(x1 - x0) / (tipo.startsWith("flecha") ? 620 : 420), alvo: a, cor });
}
function explosaoMenu(x, y, cor, n) {
  for (let i = 0; i < n; i++) faiscasMenu.push({ x, y, vx: (Math.random() - .5) * 260, vy: -Math.random() * 220, vida: 0, max: .3 + Math.random() * .4, cor, r: 1.5 + Math.random() * 2.5 });
}
function desenharLutador(f) {
  let an, q;
  if (f.estado === "ataque") { an = animLutador(f, f.atq); q = an ? Math.min(an.quadros - 1, Math.floor(f.tempo * an.fps)) : 0; }
  const parado = esperaDe(f);
  if (!an) {
    an = parado || animLutador(f, f.lado === "h" ? "parado" : (f.id === "esqueletoTita" ? "lutar" : "atacar"));
    if (!an) return;
    q = an === parado ? Math.floor((f.tempo + f.x) * an.fps) % an.quadros : 0;     // sem folha parada: primeiro quadro do ataque
  }
  const e = f.esc * (an.escala ?? 1) * (an.fator || 1) * f.t;
  const vira = f.lado === "m" ? (an.olhaDireita ? -1 : 1) : 1;
  const resp = an === parado || f.estado === "ataque" ? 1 : 1 + Math.sin(f.tempo * 2.4 + f.x) * .015;   // respira quando está parado
  const m = 2 * (an.grade && an.grade.ref ? an.cw / an.grade.ref : 1);       // não pega a beirada do quadro vizinho
  const sx = (q % an.cols) * an.cw, sy = Math.floor(q / an.cols) * an.ch;
  cB2.save();
  // sombra no chão
  cB2.globalAlpha = .35; cB2.fillStyle = "#000"; cB2.beginPath(); cB2.ellipse(f.x, f.y, 34 * f.t, 8 * f.t, 0, 0, 7); cB2.fill(); cB2.globalAlpha = 1;
  cB2.translate(f.x, f.y); cB2.scale(e * vira, e * resp);
  if (f.flash > 0) cB2.filter = `brightness(${1 + f.flash * 1.2})`;
  cB2.drawImage(an.img, sx + m, sy + m, an.cw - 2 * m, an.ch - 2 * m, -an.ax + m, -an.ay + m, an.cw - 2 * m, an.ch - 2 * m);
  cB2.restore();
}
function desenharBatalha() {
  cB2.clearRect(0, 0, 1280, 720);
  if (!batalhaPronta) return;
  const ordem = lutadores.slice().sort((a, b) => a.y - b.y || a.x - b.x);
  for (const f of ordem) desenharLutador(f);
  for (const s of tirosMenu) {
    const x = s.x0 + (s.x1 - s.x0) * s.k, y = s.y0 + (s.y1 - s.y0) * s.k - Math.sin(s.k * Math.PI) * (s.tipo.startsWith("flecha") ? 28 : 10);
    cB2.save(); cB2.translate(x, y);
    if (s.tipo.startsWith("flecha")) {
      cB2.rotate(Math.atan2(s.y1 - s.y0 - Math.cos(s.k * Math.PI) * 28 * Math.PI, s.x1 - s.x0));
      cB2.strokeStyle = "#5a3b1f"; cB2.lineWidth = 2.4; cB2.beginPath(); cB2.moveTo(-18, 0); cB2.lineTo(12, 0); cB2.stroke();
      cB2.fillStyle = "#d8dde6"; cB2.beginPath(); cB2.moveTo(16, 0); cB2.lineTo(9, -3.5); cB2.lineTo(9, 3.5); cB2.fill();
      cB2.fillStyle = s.cor; cB2.fillRect(-20, -3, 5, 6);
    } else {
      cB2.globalCompositeOperation = "lighter";
      const r = s.tipo === "fogo" ? 13 : 10, gr = cB2.createRadialGradient(0, 0, 1, 0, 0, r * 2.4);
      gr.addColorStop(0, "#fff"); gr.addColorStop(.3, s.cor); gr.addColorStop(1, "rgba(0,0,0,0)");
      cB2.fillStyle = gr; cB2.beginPath(); cB2.arc(0, 0, r * 2.4, 0, 7); cB2.fill();
    }
    cB2.restore();
  }
  cB2.save(); cB2.globalCompositeOperation = "lighter";
  for (const p of faiscasMenu) { cB2.globalAlpha = 1 - p.vida / p.max; cB2.fillStyle = p.cor; cB2.beginPath(); cB2.arc(p.x, p.y, p.r, 0, 7); cB2.fill(); }
  cB2.restore();
  if (BATALHA_MENU.escurecer > 0) { cB2.fillStyle = `rgba(8,6,16,${BATALHA_MENU.escurecer})`; cB2.globalCompositeOperation = "source-atop"; cB2.fillRect(0, 0, 1280, 720); cB2.globalCompositeOperation = "source-over"; }
}

/* ---------- PERFIL no menu: troféus, moedas e liga ---------- */
function imgLiga(img, liga) {                         // imagem da liga (se faltar, desenha um escudo colorido)
  img.style.display = "";
  img.onerror = () => {
    if (!img.dataset.tentou) { img.dataset.tentou = "1"; img.src = encodeURI(liga.img + ".jpg"); return; }
    const d = document.createElement("div"); d.className = "escudo-reserva"; d.textContent = liga.nome;
    d.style.background = `linear-gradient(180deg,${liga.cor},#3a2a14)`; d.style.width = img.width + "px"; d.style.height = img.height + "px";
    img.replaceWith(d);
  };
  delete img.dataset.tentou;
  img.src = encodeURI(liga.img + ".png");
}
function atualizarPerfilMenu() {
  if (!window.PERFIL) return;
  const d = PERFIL.dados(), liga = PERFIL.liga();
  const u = contaAtual();
  $("perfilNome").textContent = u ? (d.nome || u.nome).split(" ")[0] : "Convidado";
  const br = $("brasao");
  if (u && (d.foto || u.foto)) { if (!br.querySelector("img.foto")) br.innerHTML = `<img class="foto" alt="" referrerpolicy="no-referrer">`; br.querySelector("img.foto").src = d.foto || u.foto; br.style.background = "none"; br.style.boxShadow = "none"; }
  else if (br.querySelector("img.foto")) { br.innerHTML = BRASOES[ladoMenu]; br.style.background = ""; br.style.boxShadow = ""; }
  $("perfilTrofeus").textContent = d.trofeus.toLocaleString("pt-BR");
  $("perfilMoedas").textContent = d.moedas.toLocaleString("pt-BR");
  $("perfilLiga").textContent = liga.nome;
  const im = $("perfilLigaImg");
  if (im && im.dataset.liga !== liga.nome) { im.dataset.liga = liga.nome; imgLiga(im, liga); }
}
if (window.PERFIL) PERFIL.aoMudar(atualizarPerfilMenu);
atualizarPerfilMenu();
$("cartaoPerfil").addEventListener("click", () => { abrirRanking("ligas"); });

/* ---------- RANKING: vitórias e troféus (hoje, semana, mês) e LIGAS ---------- */
const estadoRank = { tipo: "vitorias", periodo: "dia" };
function abrirRanking(tipo) {
  if (tipo) estadoRank.tipo = tipo;
  montarRanking(); abrirJanela("janelaRanking");
}
function marcarAbas() {
  for (const b of $("rankTipo").children) b.classList.toggle("on", b.dataset.v === estadoRank.tipo);
  for (const b of $("rankPeriodo").children) { b.classList.toggle("on", b.dataset.v === estadoRank.periodo); b.disabled = estadoRank.tipo === "ligas"; }
}
let pedidoRank = 0;
const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);   // nomes vindos da internet: nunca como código
async function montarRanking() {
  marcarAbas();
  const corpo = $("rankCorpo"), nota = $("rankNota");
  if (estadoRank.tipo === "ligas") { montarLigas(corpo); nota.textContent = "A liga vem do total de troféus. Vencendo no PvP você ganha troféus; perdendo, perde alguns."; return; }
  const meu = ++pedidoRank;
  corpo.innerHTML = `<div class="rank-vazio">Carregando o ranking...</div>`; nota.textContent = "";
  let lista;
  try { lista = await PERFIL.ranking(estadoRank.periodo, estadoRank.tipo); }
  catch (e) {
    if (meu !== pedidoRank) return;
    corpo.innerHTML = `<div class="rank-vazio">Não deu para carregar o ranking agora.<br><small>${(e && e.message) || e}</small></div>`;
    nota.textContent = "Confira a internet e se o npm run dev está rodando, e abra o ranking de novo.";
    return;
  }
  if (meu !== pedidoRank) return;                                   // trocou de aba enquanto carregava
  const unid = estadoRank.tipo === "vitorias" ? "vitórias" : "troféus";
  const per = { dia: "hoje", semana: "nesta semana", mes: "neste mês" }[estadoRank.periodo];
  const logado = !!contaAtual(), eu = lista.find(j => j.eu);
  if (!lista.length) {
    corpo.innerHTML = `<div class="rank-vazio">Ninguém ${estadoRank.tipo === "vitorias" ? "venceu" : "ganhou troféus"} ${per} ainda.<br><b>Seja o primeiro!</b></div>`;
    nota.textContent = logado ? "" : "Entre com Google para aparecer no ranking.";
    return;
  }
  const rosto = (j, cls) => /^https:\/\//.test(j.foto) ? `<img class="${cls}" src="${esc(j.foto)}" alt="" referrerpolicy="no-referrer" onerror="this.outerHTML='<span class=&quot;${cls} sem-foto&quot;>${esc((j.nome || "?")[0])}</span>'">` : `<span class="${cls} sem-foto">${esc((j.nome || "?")[0])}</span>`;
  const topo = [lista[1], lista[0], lista[2]];                       // 2º, 1º, 3º (o 1º fica no meio, mais alto)
  const lugar = (j, n) => j ? `<div class="lugar p${n}${j.eu ? " eu" : ""}"><span class="medalha">${n}</span>${rosto(j, "rosto-grande")}<img class="liga-mini" data-liga="${j.liga.nome}" alt="">
      <b>${j.eu ? "Você" : esc(j.nome)}</b><span class="valor">${j.valor.toLocaleString("pt-BR")}</span><small>${unid}</small></div>`
    : `<div class="lugar p${n} vago"><span class="medalha">${n}</span><b>—</b><small>vago</small></div>`;
  const linha = (j, fixa) => `<div class="linha-rank${j.eu ? " eu" : ""}${fixa ? " fixa" : ""}"><span class="pos">${j.posicao}º</span>${rosto(j, "rosto")}
    <span>${j.eu ? "<b>Você</b>" : esc(j.nome)}${!j.eu && j.id && logado ? ` <button class="mini-bt add-amigo" data-amigo="${j.id}">+ amigo</button>` : ""}</span><span class="liga-nome"><img data-liga="${j.liga.nome}" alt="">${j.liga.nome}</span><span class="val">${j.valor.toLocaleString("pt-BR")} ${unid}</span></div>`;
  const resto = lista.filter(j => j.posicao > 3 && j.posicao <= 100);
  let html = `<div class="podio">${lugar(topo[0], 2)}${lugar(topo[1], 1)}${lugar(topo[2], 3)}</div><div class="lista-rank">`;
  html += resto.map(j => linha(j)).join("");
  if (eu && eu.posicao > 100) html += linha(eu, true);               // você fora dos 100 primeiros: sua linha fica embaixo
  else if (eu && eu.posicao > 3) html = html.replace(`<div class="linha-rank eu">`, `<div class="linha-rank eu" id="minhaLinha">`);
  html += "</div>";
  corpo.innerHTML = html;
  corpo.querySelectorAll("img[data-liga]").forEach(im => imgLiga(im, PERFIL.LIGAS.find(l => l.nome === im.dataset.liga)));
  const minha = corpo.querySelector("#minhaLinha"); if (minha) minha.scrollIntoView({ block: "nearest" });
  const amigosIds = new Set(amigosCache.map(a => a.id));
  corpo.querySelectorAll("[data-amigo]").forEach(b => {
    if (amigosIds.has(b.dataset.amigo)) { b.textContent = "amigo"; b.disabled = true; b.classList.add("cinza"); }
    else b.onclick = () => pedirAmizade(b.dataset.amigo, b);
  });
  nota.textContent = `Quem mais ${estadoRank.tipo === "vitorias" ? "venceu" : "ganhou troféus"} ${per} (horário de Brasília).` +
    (eu ? ` Você está em ${eu.posicao}º lugar.` : logado ? ` Você ainda não ${estadoRank.tipo === "vitorias" ? "venceu" : "ganhou troféus"} ${per}.` : " Entre com Google para aparecer no ranking.");
}
function montarLigas(corpo) {
  const d = PERFIL.dados(), atual = PERFIL.liga();
  let html = `<div class="ligas-carrossel"><button class="seta-liga esq" aria-label="Ligas anteriores">‹</button><div class="ligas-grade" id="ligasGrade">`;
  PERFIL.LIGAS.forEach((l, i) => {
    const prox = PERFIL.LIGAS[i + 1];
    html += `<div class="liga${i < atual.indice ? " alcancada" : ""}${i === atual.indice ? " atual" : ""}"><img data-liga="${l.nome}" alt="" draggable="false"><b>${l.nome}</b>${prox ? `${l.min} a ${prox.min - 1}` : `${l.min} ou mais`}<br>troféus</div>`;
  });
  html += `</div><button class="seta-liga dir" aria-label="Mais ligas">›</button><span class="dica-arrastar">arraste para ver mais ➜</span></div>`;
  html += `<div class="progresso-liga"><b>Você: ${atual.nome}</b> · ${d.trofeus.toLocaleString("pt-BR")} troféus · ${d.vitorias} vitórias e ${d.derrotas} derrotas` +
    (atual.proxima ? `<div class="barra"><i style="width:${(atual.progresso * 100).toFixed(1)}%"></i></div><small>Faltam ${atual.proxima.min - d.trofeus} troféus para a liga ${atual.proxima.nome}</small>` : `<div class="barra"><i style="width:100%"></i></div><small>Você está na liga mais alta!</small>`) + `</div>`;
  corpo.innerHTML = html;
  corpo.querySelectorAll("img[data-liga]").forEach(im => imgLiga(im, PERFIL.LIGAS.find(l => l.nome === im.dataset.liga)));
  ligarCarrossel(corpo, atual.indice);
}
// LIGAS_CARROSSEL: arrastar com o mouse (ou o dedo), setas, rodinha, e um "empurrãozinho" para mostrar que dá para arrastar
function ligarCarrossel(corpo, indiceAtual) {
  const g = corpo.querySelector("#ligasGrade"), esq = corpo.querySelector(".seta-liga.esq"), dir = corpo.querySelector(".seta-liga.dir"), dica = corpo.querySelector(".dica-arrastar");
  const passo = () => (g.querySelector(".liga")?.offsetWidth || 156) + 12;
  const setas = () => {
    esq.hidden = g.scrollLeft < 8;
    dir.hidden = g.scrollLeft > g.scrollWidth - g.clientWidth - 8;
  };
  let mexeu = false;
  const esconderDica = () => { if (!mexeu) { mexeu = true; dica.style.animation = "none"; dica.style.opacity = 0; } };
  g.addEventListener("scroll", setas);
  esq.onclick = () => { esconderDica(); g.scrollBy({ left: -passo() * 2, behavior: "smooth" }); };
  dir.onclick = () => { esconderDica(); g.scrollBy({ left: passo() * 2, behavior: "smooth" }); };
  g.addEventListener("wheel", e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { g.scrollLeft += e.deltaY; e.preventDefault(); esconderDica(); } }, { passive: false });
  let arr = null;
  g.addEventListener("pointerdown", e => { arr = { x: e.clientX, s: g.scrollLeft }; g.classList.add("arrastando"); g.setPointerCapture(e.pointerId); });
  g.addEventListener("pointermove", e => { if (!arr) return; const dx = e.clientX - arr.x; if (Math.abs(dx) > 3) esconderDica(); g.scrollLeft = arr.s - dx; });
  const soltar = () => { if (!arr) return; arr = null; g.classList.remove("arrastando"); };
  g.addEventListener("pointerup", soltar); g.addEventListener("pointercancel", soltar);
  // começa mostrando a sua liga e dá um empurrãozinho para o lado (e volta), para a pessoa ver que dá para arrastar
  requestAnimationFrame(() => {
    g.style.scrollBehavior = "auto";
    const card = g.children[indiceAtual];
    g.scrollLeft = Math.max(0, card ? card.offsetLeft - (g.clientWidth - card.offsetWidth) / 2 : 0);
    g.style.scrollBehavior = "";
    setas();
    const ida = g.scrollLeft > g.scrollWidth - g.clientWidth - 60 ? -70 : 70;
    setTimeout(() => { if (!mexeu) g.scrollBy({ left: ida, behavior: "smooth" }); }, 450);
    setTimeout(() => { if (!mexeu) g.scrollBy({ left: -ida, behavior: "smooth" }); }, 1050);
  });
}
$("rankTipo").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; estadoRank.tipo = b.dataset.v; somClique(false); montarRanking(); });
$("rankPeriodo").addEventListener("click", e => { const b = e.target.closest("button"); if (!b || b.disabled) return; estadoRank.periodo = b.dataset.v; somClique(false); montarRanking(); });

/* =====================================================================
   PERSONAGENS (nível da conta), BÔNUS DE HOJE, AMIGOS, CHAT GLOBAL e CONVITE
   ===================================================================== */
const MOEDA_SVG = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#f2b536" stroke="#8a5a12" stroke-width="2"/><path d="M12 7.5l1.4 2.9 3.1.4-2.3 2.1.6 3.1-2.8-1.5-2.8 1.5.6-3.1-2.3-2.1 3.1-.4z" fill="#fff6d0"/></svg>';
const SELO = { heroes: '<span class="selo-lado heroes">🛡 Heroes</span>', monsters: '<span class="selo-lado monsters">💀 Monsters</span>' };
let grupoPers = "heroes";
function abrirPersonagens() { grupoPers = ladoMenu; montarPersonagens(); abrirJanela("janelaPersonagens"); }
// miniatura do personagem: primeiro quadro da folha parada (ou andando), RECORTADO no desenho
// (algumas folhas têm muito espaço vazio em volta, como a do Cavaleiro Sentinela: sem recortar ele ficava pequeno)
const cacheMini = {};
function recorteDoQuadro(an) {
  const m = 2 * (an.grade && an.grade.ref ? an.cw / an.grade.ref : 1);
  const w = Math.max(1, Math.round(an.cw - 2 * m)), h = Math.max(1, Math.round(an.ch - 2 * m));
  const esc = Math.min(1, 256 / Math.max(w, h));                     // mede numa cópia pequena (rápido)
  const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w * esc)); c.height = Math.max(1, Math.round(h * esc));
  const x = c.getContext("2d", { willReadFrequently: true });
  x.drawImage(an.img, m, m, w, h, 0, 0, c.width, c.height);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
  for (let y = 0; y < c.height; y++) for (let xx = 0; xx < c.width; xx++) if (d[(y * c.width + xx) * 4 + 3] > 40) {
    if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) return { sx: m, sy: m, sw: w, sh: h };
  return { sx: m + x0 / esc, sy: m + y0 / esc, sw: (x1 - x0 + 1) / esc, sh: (y1 - y0 + 1) / esc };
}
function miniatura(cv, grupo, id) {
  const S = window.JOGO && window.JOGO.sprites ? window.JOGO.sprites() : null, x = cv.getContext("2d");
  x.clearRect(0, 0, cv.width, cv.height);
  if (!S) return;
  const f = grupo === "heroes" ? S.G[id] : S.P[id];
  const anims = grupo === "heroes" ? f.sprite && f.sprite.anims : f.anims;
  if (!anims) return;
  const an = ["parado", "defendendo", "energia", "andar", "atacar", "lutar"].map(n => anims[n]).find(a => a && a.ok);
  if (!an) return;
  const chave = grupo + ":" + id;
  const r = cacheMini[chave] || (cacheMini[chave] = recorteDoQuadro(an));
  const k = Math.min(cv.width / r.sw, cv.height / r.sh) * .92;      // todos ocupam o quadro do mesmo jeito
  x.save(); x.translate(cv.width / 2, cv.height / 2);
  if (grupo === "monsters" && an.olhaDireita) x.scale(-1, 1);
  x.drawImage(an.img, r.sx, r.sy, r.sw, r.sh, -r.sw * k / 2, -r.sh * k / 2, r.sw * k, r.sh * k);
  x.restore();
}
function montarPersonagens() {
  for (const b of $("persGrupo").children) b.classList.toggle("on", b.dataset.v === grupoPers);
  const d = PERFIL.dados(), logado = !!contaAtual(), S = window.JOGO && window.JOGO.sprites ? window.JOGO.sprites() : null;
  $("persMoedas").innerHTML = MOEDA_SVG + d.moedas.toLocaleString("pt-BR");
  const ids = S ? Object.keys(grupoPers === "heroes" ? S.G : S.P) : [];
  const C = PERFIL.PERSONAGENS_CONTA, grade = $("persGrade");
  grade.innerHTML = ids.map(id => {
    const nome = grupoPers === "heroes" ? S.G[id].nome : S.P[id].nome, n = PERFIL.nivelPersonagem(id), custo = PERFIL.custoProximo(id);
    const pips = Array.from({ length: C.maximo }, (_, i) => `<i class="${i < n ? "on" : ""}"></i>`).join("");
    const habs = C.habilidadesNos.map(h => `<span class="${n >= h ? "ok" : ""}" title="Habilidade do nível ${h} (em breve)">${n >= h ? "★" : h}</span>`).join("");
    const bt = custo == null ? `<button class="bt-evoluir max" disabled>Nível máximo</button>`
      : `<button class="bt-evoluir" data-evoluir="${id}" ${!logado || d.moedas < custo ? "disabled" : ""}>Evoluir · ${MOEDA_SVG}${custo.toLocaleString("pt-BR")}</button>`;
    return `<div class="carta-pers"><canvas width="120" height="120" data-mini="${id}"></canvas><b>${nome}</b>
      <span class="nv">Nível ${n}/${C.maximo} · +${Math.round((PERFIL.bonusPersonagem(id) - 1) * 100)}% vida e dano</span>
      <div class="pips">${pips}</div><div class="habs">${habs}</div>${bt}</div>`;
  }).join("");
  grade.querySelectorAll("canvas[data-mini]").forEach(cv => miniatura(cv, grupoPers, cv.dataset.mini));
  grade.querySelectorAll("[data-evoluir]").forEach(b => b.onclick = async () => {
    b.disabled = true; somClique(true);
    try { const n = await PERFIL.subirNivel(b.dataset.evoluir); $("persNota").textContent = `Subiu para o nível ${n}! +${Math.round((PERFIL.bonusPersonagem(b.dataset.evoluir) - 1) * 100)}% de vida e dano.`; somTrovao(); }
    catch (e) { $("persNota").textContent = e.message || String(e); }
    montarPersonagens();
  });
  if (!logado) $("persNota").textContent = "Entre com Google (em Opções) para evoluir os personagens. Cada nível dá +5% de vida e dano; habilidades abrem nos níveis 5, 10 e 15 (em breve).";
}
$("persGrupo").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; grupoPers = b.dataset.v; somClique(false); montarPersonagens(); });

// ---------- BÔNUS DE HOJE (lado em alta e os dois lados no mesmo dia) ----------
function atualizarBonusHoje() {
  if (!window.PERFIL || !PERFIL.bonusHoje) return;
  const b = PERFIL.bonusHoje(), nome = l => (l === "heroes" ? "Heroes" : "Monsters");
  const marca = l => b.lados.includes(l) ? `<span class="sim">✓ ${nome(l)}</span>` : `<span class="nao">○ ${nome(l)}</span>`;
  $("bonusHoje").innerHTML = `<b>Hoje: ${nome(b.emAlta)} em alta</b> · +50% moedas<br>` +
    (b.pago ? `<span class="sim">Bônus dos dois lados recebido! (+${b.valor})</span>` : `Jogue com os dois lados: +${b.valor} ${marca("heroes")} ${marca("monsters")}`);
}
if (window.PERFIL) PERFIL.aoMudar(atualizarBonusHoje);
atualizarBonusHoje();

// ---------- SOCIAL: amigos (com quem está online e em qual lado), chat global e convite ----------
let abaSocial = "amigos", onlineAgora = {}, amigosCache = [], chatMsgs = [], chatAssinado = false;
function rostoHtml(foto, nome, cls = "rosto") {
  return /^https:\/\//.test(foto || "") ? `<img class="${cls}" src="${esc(foto)}" alt="" referrerpolicy="no-referrer" onerror="this.outerHTML='<span class=&quot;${cls}&quot;>${esc((nome || "?")[0])}</span>'">`
    : `<span class="${cls}">${esc((nome || "?")[0])}</span>`;
}
function ficarOnline() {                                  // avisa os outros que você está online e em qual lado
  if (!contaAtual() || !window.CONTA.entrarOnline) return;
  const d = PERFIL.dados();
  window.CONTA.entrarOnline({ nome: (d.nome || "").split(" ")[0], foto: d.foto || "", lado: ladoMenu }, lista => {
    onlineAgora = lista;
    $("onlineNum").textContent = Object.keys(lista).length;
    if (janelaAberta && janelaAberta.id === "janelaSocial" && abaSocial === "amigos") montarAmigos();
  });
}
async function carregarAmigos() {
  if (!contaAtual()) { amigosCache = []; return; }
  try { amigosCache = await window.CONTA.rpc("meus_amigos"); } catch { amigosCache = []; }
  const pedidos = amigosCache.filter(a => a.status === "pendente" && !a.pedido_meu).length;
  $("avisoSocial").hidden = !pedidos; $("avisoSocial").textContent = pedidos;
}
function abrirSocial(aba) { if (aba) abaSocial = aba; montarSocial(); abrirJanela("janelaSocial"); }
function montarSocial() {
  for (const b of $("socialAba").children) b.classList.toggle("on", b.dataset.v === abaSocial);
  const corpo = $("socialCorpo");
  if (!contaAtual()) { corpo.innerHTML = `<div class="rank-vazio">Entre com Google (em Opções) para ter amigos, conversar no chat e convidar pessoas.</div>`; return; }
  if (abaSocial === "amigos") { corpo.innerHTML = `<div class="rank-vazio">Carregando amigos...</div>`; carregarAmigos().then(montarAmigos); }
  else if (abaSocial === "chat") montarChat();
  else montarConvite();
}
function montarAmigos() {
  if (abaSocial !== "amigos") return;
  const corpo = $("socialCorpo"), aceitos = amigosCache.filter(a => a.status === "aceita");
  const pedidos = amigosCache.filter(a => a.status === "pendente" && !a.pedido_meu), enviados = amigosCache.filter(a => a.status === "pendente" && a.pedido_meu);
  aceitos.sort((a, b) => (!!onlineAgora[b.id]) - (!!onlineAgora[a.id]));
  const ladoDe = a => (onlineAgora[a.id] && onlineAgora[a.id].lado) || a.lado_atual;
  const linha = (a, botoes) => `<div class="amigo">${rostoHtml(a.avatar_url, a.nome)}
      <div><b>${esc(a.nome)}</b><br><small><span class="ponto ${onlineAgora[a.id] ? "on" : ""}"></span>${onlineAgora[a.id] ? "online" : "offline"} · ${a.trofeus} troféus · ${PERFIL.ligaDe(a.trofeus).nome}</small></div>
      <span>${ladoDe(a) ? SELO[ladoDe(a)] : ""}</span><span>${botoes}</span></div>`;
  const on = aceitos.filter(a => onlineAgora[a.id]).length;
  let html = `<div class="lista-social">`;
  if (pedidos.length) html += `<div class="titulo-sec">Pedidos de amizade</div>` + pedidos.map(a => linha(a, `<button class="mini-bt" data-aceitar="${a.id}">Aceitar</button> <button class="mini-bt cinza" data-recusar="${a.id}">Recusar</button>`)).join("");
  html += `<div class="titulo-sec">Amigos (${on} online de ${aceitos.length})</div>`;
  html += aceitos.length ? aceitos.map(a => linha(a, `<button class="mini-bt cinza" data-remover="${a.id}" title="Desfazer amizade">✕</button>`)).join("")
    : `<p>Você ainda não tem amigos. Abra o <b>Ranking</b> e toque em <b>+ amigo</b> ao lado de alguém, ou convide pela aba <b>Convidar</b>.</p>`;
  if (enviados.length) html += `<div class="titulo-sec">Pedidos enviados</div>` + enviados.map(a => linha(a, `<small>aguardando</small>`)).join("");
  html += `</div>`;
  corpo.innerHTML = html;
  const agir = async (fn, args) => { somClique(false); try { await window.CONTA.rpc(fn, args); } catch (e) { alert(e.message || e); } await carregarAmigos(); montarAmigos(); };
  corpo.querySelectorAll("[data-aceitar]").forEach(b => b.onclick = () => agir("responder_amizade", { p_de: b.dataset.aceitar, p_aceitar: true }));
  corpo.querySelectorAll("[data-recusar]").forEach(b => b.onclick = () => agir("responder_amizade", { p_de: b.dataset.recusar, p_aceitar: false }));
  corpo.querySelectorAll("[data-remover]").forEach(b => b.onclick = () => { if (confirm("Desfazer essa amizade?")) agir("remover_amigo", { p_outro: b.dataset.remover }); });
}
function htmlMsg(m) {
  const hora = new Date(m.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `<div class="msg">${rostoHtml(m.avatar_url, m.nome)}<div><div class="cab"><b>${esc(m.nome)}</b>${m.lado ? SELO[m.lado] : ""}<small>${hora}</small></div><p>${esc(m.texto)}</p></div></div>`;
}
async function montarChat() {
  const corpo = $("socialCorpo");
  corpo.innerHTML = `<div class="lista-social" id="chatLista"><div class="rank-vazio">Carregando o chat...</div></div>
    <div class="chat-envio"><input id="chatTexto" maxlength="200" placeholder="Escreva para todos (seja gentil!)"><button class="mini-bt" id="chatEnviar">Enviar</button></div><small id="chatMsg"></small>`;
  try { chatMsgs = await window.CONTA.mensagens(); } catch (e) { chatMsgs = []; $("chatMsg").textContent = "Não deu para carregar o chat: " + (e.message || e); }
  if (!chatAssinado) {
    chatAssinado = true;
    window.CONTA.assinarChat(m => {
      chatMsgs.push(m); if (chatMsgs.length > 100) chatMsgs.shift();
      const l = $("chatLista");
      if (l && abaSocial === "chat") { l.insertAdjacentHTML("beforeend", htmlMsg(m)); l.scrollTop = l.scrollHeight; }
    });
  }
  const l = $("chatLista");
  l.innerHTML = chatMsgs.length ? chatMsgs.map(htmlMsg).join("") : `<div class="rank-vazio">Ninguém falou nada ainda. Diga oi!</div>`;
  l.scrollTop = l.scrollHeight;
  const enviar = async () => {
    const t = $("chatTexto").value.trim(); if (!t) return;
    $("chatEnviar").disabled = true;
    try { await window.CONTA.rpc("enviar_mensagem", { p_texto: t, p_lado: ladoMenu }); $("chatTexto").value = ""; $("chatMsg").textContent = ""; }
    catch (e) { $("chatMsg").textContent = e.message || String(e); }
    $("chatEnviar").disabled = false; $("chatTexto").focus();
  };
  $("chatEnviar").onclick = enviar;
  $("chatTexto").addEventListener("keydown", e => { e.stopPropagation(); if (e.key === "Enter") enviar(); });
  $("chatTexto").focus();
}
function montarConvite() {
  const d = PERFIL.dados(), link = `${location.origin}${location.pathname}?convite=${d.convite || ""}`;
  $("socialCorpo").innerHTML = `<div class="lista-social">
    <div class="convite-caixa"><div class="titulo-sec">Seu código de convite</div><div class="codigo">${esc(d.convite || "...")}</div>
      <p>Quando alguém entra <b>pela primeira vez</b> com o seu código ou link: <b>a pessoa ganha 200 moedas</b> e <b>você ganha 300</b> (até 30 convites).</p>
      <button class="mini-bt" id="copiarCodigo">Copiar código</button> <button class="mini-bt" id="copiarLink">Copiar link de convite</button> <small id="convMsg"></small></div>
    ${d.indicado ? "" : `<div class="convite-caixa"><div class="titulo-sec">Ganhou um código de alguém?</div>
      <p>Vale só em conta nova (até 3 dias depois do primeiro login).</p>
      <div class="chat-envio"><input id="codigoAmigo" maxlength="12" placeholder="Código do amigo"><button class="mini-bt" id="usarCodigo">Usar código</button></div><small id="usoMsg"></small></div>`}
  </div>`;
  const copiar = async (t, msg) => { try { await navigator.clipboard.writeText(t); $("convMsg").textContent = msg; } catch { $("convMsg").textContent = t; } };
  $("copiarCodigo").onclick = () => copiar(d.convite, "Código copiado!");
  $("copiarLink").onclick = () => copiar(link, "Link copiado! Mande para seus amigos.");
  if ($("usarCodigo")) {
    $("codigoAmigo").addEventListener("keydown", e => e.stopPropagation());
    $("usarCodigo").onclick = async () => {
      try { const r = await PERFIL.usarConvite($("codigoAmigo").value); $("usoMsg").textContent = `Pronto! Você ganhou ${r.ganhou} moedas (convite de ${r.amigo}).`; setTimeout(montarConvite, 1500); }
      catch (e) { $("usoMsg").textContent = e.message || String(e); }
    };
  }
}
$("socialAba").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; abaSocial = b.dataset.v; somClique(false); montarSocial(); });
$("btSocial").addEventListener("click", () => { somClique(true); abrirSocial(); });
// adicionar amigo pelo ranking
async function pedirAmizade(id, botao) {
  if (!contaAtual()) { alert("Entre com Google (em Opções) para adicionar amigos."); return; }
  botao.disabled = true;
  try { const r = await window.CONTA.rpc("pedir_amizade", { p_alvo: id }); botao.textContent = r === "aceita" ? "amigos ✓" : "pedido enviado"; }
  catch (e) { botao.textContent = "erro"; botao.title = e.message || e; }
}
window.addEventListener("conta", () => { ficarOnline(); carregarAmigos(); });

/* ---------- PROCURAR PARTIDA ONLINE (fila do servidor, até 15 s; depois joga contra o bot) ---------- */
const BUSCA = { espera: 15, cada: 1500 };
let busca = null;
async function procurarPartida() {
  const nomeLado = l => (l === "heroes" ? "Heroes" : "Monsters");
  $("buscaTitulo").textContent = "Procurando adversário...";
  $("buscaTxt").textContent = `Você joga de ${nomeLado(ladoMenu)}. Se ninguém de ${nomeLado(ladoMenu === "heroes" ? "monsters" : "heroes")} aparecer, você joga contra o bot.`;
  abrirJanela("janelaBusca");
  const minha = busca = { inicio: performance.now(), ativa: true };
  const roda = document.querySelector(".busca-roda");
  const relogio = setInterval(() => {
    const falta = Math.max(0, BUSCA.espera - (performance.now() - minha.inicio) / 1000);
    $("buscaTempo").textContent = Math.ceil(falta); roda.style.setProperty("--p", (100 - falta / BUSCA.espera * 100) + "%");
  }, 200);
  const terminar = () => { minha.ativa = false; clearInterval(relogio); };
  const jogarBot = async () => {
    terminar(); try { await window.CONTA.rpc("sair_da_fila"); } catch {}
    fecharJanela(); fecharIntro(); window.JOGO.iniciarPvp(ladoMenu);
  };
  $("buscaCancelar").onclick = async () => { terminar(); try { await window.CONTA.rpc("sair_da_fila"); } catch {} fecharJanela(); };
  $("buscaBot").onclick = () => jogarBot();
  const niveis = window.PERFIL && PERFIL.niveisConta ? PERFIL.niveisConta() : {};
  while (minha.ativa) {
    let sala = null;
    try { sala = await window.CONTA.rpc("procurar_partida", { p_lado: ladoMenu, p_niveis: niveis }); }
    catch (e) { $("buscaTxt").textContent = "Não deu para procurar: " + (e.message || e); }
    if (!minha.ativa) return;
    if (sala && sala.id) {
      terminar();
      const eu = contaAtual().id, lado = sala.heroes === eu ? "heroes" : "monsters", outro = lado === "heroes" ? "monsters" : "heroes";
      $("buscaTitulo").textContent = "Adversário encontrado!";
      $("buscaTxt").textContent = `${sala["nome_" + outro] || "Alguém"} vai jogar de ${nomeLado(outro)}. Boa sorte!`;
      somTrovao();
      await new Promise(ok => setTimeout(ok, 1500));
      fecharJanela(); fecharIntro();
      try { await window.JOGO.comecarOnline({ ...sala, lado }); }
      catch (e) { alert("Não deu para entrar na partida: " + (e.message || e)); window.JOGO.iniciarPvp(ladoMenu); }
      return;
    }
    if ((performance.now() - minha.inicio) / 1000 >= BUSCA.espera) { jogarBot(); return; }
    await new Promise(ok => setTimeout(ok, BUSCA.cada));
  }
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
    if (telaAtual === "menu") { atualizarBatalha(dt); desenharBatalha(); }
    desenharBrasas(dt, agora / 1000);
  }
  requestAnimationFrame(quadroIntro);
}
requestAnimationFrame(quadroIntro);
})();
