/* =====================================================================
   ATUALIZACAO_APP — duas formas, juntas:
   A) NOVIDADES PELO SITE (personagens, imagens, sons, ajustes): quando o app abre COM internet, ele confere o
      arquivo versao-web.json do site. Se o site tiver uma versão mais nova, baixa SÓ o que mudou e abre o jogo novo.
      Sem internet: abre a última versão que já está no celular (ou a que veio no APK). Nada de número para mudar:
      publicar o site (wrangler) já é a atualização. No Supabase, atualizar_web = false pausa isso.
   B) APK NOVO (ícone, nome do app, permissões): continua igual, pela versao_minima do Supabase (abaixo).
   ---------------------------------------------------------------------
   B) quem está com o APK velho só joga depois de baixar a versão nova.
   - Quando o app abre, compara o versionCode dele (android/app/build.gradle) com a "versao_minima"
     da tabela config_app do Supabase (arquivo supabase/7_atualizacao.sql).
   - Se for menor: a tela de carregamento vira a tela de atualização (mesma imagem, mesma barra dourada).
   - LOJA "apk": baixa DENTRO do jogo (sem abrir site) e abre o instalador do Android.
     LOJA "play": o botão abre a página do jogo na Play Store.
   - Sem internet ou se o Supabase falhar: deixa jogar (não trava ninguém por engano).
   - No site (navegador) não faz nada: o site já é sempre a versão nova.
   ===================================================================== */
import { registerPlugin, WebView } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";

const ATUALIZACAO = {
  loja: "apk",                     // LOJA_PLAY: troque para "play" na versão da Play Store
  linkPlay: "https://play.google.com/store/apps/details?id=com.danielsoucristo.heroesvsmonsters",
  site: "https://heroes-vs-monsters.pages.dev",   // SITE_JOGO: de onde vêm as novidades (o mesmo site do wrangler)
  esperarMax: 8000                                 // ms esperando o site responder; depois disso abre o jogo do celular
};

const noApp = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const Atualizador = registerPlugin("Atualizador");
const $ = id => document.getElementById(id);
let info = null, estado = "", baixou = false;

function mostrarCaixa() {
  window.ATUALIZACAO_BLOQUEIA = true;
  const tela = document.getElementById("telaCarga"), intro = document.getElementById("intro");
  if (window.INTRO_VOLTAR_CARGA && (intro.hidden || !tela.classList.contains("on"))) window.INTRO_VOLTAR_CARGA();
  tela.classList.add("atualizando");
  $("atualizarCaixa").hidden = false;
}
function esconderCaixa() {
  window.ATUALIZACAO_BLOQUEIA = false;
  document.getElementById("telaCarga").classList.remove("atualizando");
  $("atualizarCaixa").hidden = true;
}
const comTempo = (p, ms) => Promise.race([p, new Promise((_, erro) => setTimeout(() => erro(new Error("demorou demais")), ms))]);
function mb(b) { return (b / 1048576).toFixed(1).replace(".", ","); }
function por(estadoNovo, { titulo, msg, txt = "", botao = null, barra = false } = {}) {
  estado = estadoNovo;
  if (titulo) $("atualizarTitulo").textContent = titulo;
  if (msg != null) $("atualizarMsg").textContent = msg;
  $("atualizarTxt").textContent = txt;
  $("atualizarBarra").hidden = !barra;
  const bt = $("atualizarBt");
  bt.hidden = !botao; if (botao) bt.textContent = botao;
}

async function verificar() {
  if (!noApp) return;
  let cfg = null, meu = null;
  try { meu = await Atualizador.versao(); } catch (e) { console.warn("Atualização:", e); }
  try { if (window.CONTA && window.CONTA.configApp) cfg = await comTempo(window.CONTA.configApp(), ATUALIZACAO.esperarMax); }
  catch (e) { console.warn("Atualização: não deu para ler o Supabase", e); }       // sem internet: segue sem travar
  if (cfg && meu && Number(meu.versionCode) < Number(cfg.versao_minima)) { avisarApk(cfg, meu); return; }   // B) APK velho
  if (!cfg || cfg.atualizar_web !== false) atualizarWeb(meu);                        // A) novidades pelo site
}
function avisarApk(cfg, meu) {
  info = cfg;
  mostrarCaixa();
  $("atualizarSelo").textContent = "NOVA VERSÃO " + (cfg.versao_nome || "");
  por("pronta", {
    titulo: "Atualização disponível!",
    msg: (cfg.novidades || "Tem novidades no jogo!") + ` Para continuar jogando, atualize (você está na versão ${meu.versionName}).`,
    botao: "Atualizar"
  });
}

async function baixar() {
  if (ATUALIZACAO.loja === "play") { Browser.open({ url: ATUALIZACAO.linkPlay }); return; }
  por("baixando", { titulo: "Baixando atualização…", msg: "Não feche o jogo. Falta pouquinho!", txt: "Baixando 0%", barra: true });
  $("atualizarFill").style.width = "0%";
  try {
    await Atualizador.baixar({ url: info.link_apk });
    baixou = true;
    $("atualizarFill").style.width = "100%";
    instalar();
  } catch (e) {
    console.error(e);
    por("erro", { titulo: "Ops! O download parou", msg: "Confira a internet e tente de novo.", botao: "Tentar de novo" });
  }
}

async function instalar() {
  let pode = true;
  try { pode = (await Atualizador.podeInstalar()).pode; } catch {}
  if (!pode) {
    por("permissao", {
      titulo: "Só mais um passo!",
      msg: "Na próxima tela, ligue a chave “Permitir desta fonte” e volte para o jogo. Isso só é pedido uma vez.",
      botao: "Permitir"
    });
    return;
  }
  por("instalar", { titulo: "Download pronto!", msg: "Toque em “Instalar” na janela do Android. O jogo abre na versão nova.", txt: "Baixado 100%", barra: true, botao: "Instalar" });
  try { await Atualizador.instalar(); } catch (e) { console.error(e); }
}


/* ---------- A) NOVIDADES PELO SITE ---------- */
async function atualizarWeb(meu) {
  let base = "";
  try { const r = await WebView.getServerBasePath(); base = r && r.path && r.path.startsWith("/") ? r.path : ""; } catch {}
  Atualizador.limparWeb({ manter: base }).catch(() => {});                          // apaga versões velhas guardadas
  let local = null, remoto = null;
  try { local = await (await fetch("/versao-web.json", { cache: "no-store" })).json(); } catch {}
  try {
    const r = await comTempo(Atualizador.lerTexto({ url: ATUALIZACAO.site + "/versao-web.json?t=" + Date.now() }), ATUALIZACAO.esperarMax);
    remoto = JSON.parse(r.texto);
  } catch (e) { console.warn("Novidades: sem internet ou site fora do ar — abrindo a versão do celular", e); return; }
  if (!remoto || !remoto.arquivos) return;
  if (local && Number(remoto.versao) <= Number(local.versao)) return;              // já é a mais nova
  if (meu && Number(remoto.apk || 0) > Number(meu.versionCode)) return;            // o site pede um APK mais novo: espera o APK
  const antes = (local && local.arquivos) || {}, arquivos = [];
  let totalBaixar = 0;
  for (const c in remoto.arquivos) {
    const r = remoto.arquivos[c], baixar = !antes[c] || antes[c].h !== r.h;
    if (baixar) totalBaixar += r.t;
    arquivos.push({ c, b: baixar, t: r.t });
  }
  if (!totalBaixar) return;                                                         // nada mudou de verdade
  mostrarCaixa();
  $("atualizarSelo").textContent = "NOVIDADES";
  por("web", { titulo: "Chegaram novidades!", msg: "Baixando as novidades do jogo. É rapidinho!", txt: `Baixando 0% · 0 de ${mb(totalBaixar)} MB`, barra: true });
  $("atualizarFill").style.width = "0%";
  try {
    const r = await Atualizador.prepararWeb({ site: ATUALIZACAO.site, pasta: "v" + remoto.versao, base, arquivos });
    $("atualizarFill").style.width = "100%";
    por("web", { titulo: "Pronto!", msg: "Abrindo a versão nova…", txt: "100%", barra: true });
    await Atualizador.usarWeb({ caminho: r.caminho });                              // o jogo recarrega sozinho já na versão nova
  } catch (e) {
    console.error("Novidades:", e);
    esconderCaixa();                                                                // deu errado: joga a versão que já tem
  }
}

$("atualizarBt") && $("atualizarBt").addEventListener("click", () => {
  if (estado === "pronta" || estado === "erro") baixar();
  else if (estado === "permissao") Atualizador.abrirPermissao();
  else if (estado === "instalar") instalar();
});

if (noApp) {
  Atualizador.addListener("progresso", ({ baixado, total, feito, totalBaixar }) => {
    if (estado === "web") {                                                         // A) novidades pelo site
      const k = total > 0 ? Math.min(1, feito / total) : 0;
      $("atualizarFill").style.width = (k * 100).toFixed(1) + "%";
      $("atualizarTxt").textContent = baixado < totalBaixar ? `Baixando ${Math.round(k * 100)}% · ${mb(baixado)} de ${mb(totalBaixar)} MB` : `Preparando ${Math.round(k * 100)}%`;
      return;
    }
    if (estado !== "baixando") return;
    const k = total > 0 ? Math.min(1, baixado / total) : 0;
    $("atualizarFill").style.width = (k * 100).toFixed(1) + "%";
    $("atualizarTxt").textContent = total > 0 ? `Baixando ${Math.round(k * 100)}% · ${mb(baixado)} de ${mb(total)} MB` : `Baixando ${mb(baixado)} MB`;
  });
  App.addListener("resume", () => {
    if (estado === "permissao" && baixou) instalar();                 // voltou da tela de permissão: instala
    else if (!window.ATUALIZACAO_BLOQUEIA) {                           // ficou dias aberto: confere de novo (só fora da partida)
      const intro = document.getElementById("intro");
      if (intro && !intro.hidden) verificar();
    }
  });
  verificar();
}
