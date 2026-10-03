/* =====================================================================
   ATUALIZACAO_APP: quem está com o APK velho só joga depois de baixar a versão nova.
   - Quando o app abre, compara o versionCode dele (android/app/build.gradle) com a "versao_minima"
     da tabela config_app do Supabase (arquivo supabase/7_atualizacao.sql).
   - Se for menor: a tela de carregamento vira a tela de atualização (mesma imagem, mesma barra dourada).
   - LOJA "apk": baixa DENTRO do jogo (sem abrir site) e abre o instalador do Android.
     LOJA "play": o botão abre a página do jogo na Play Store.
   - Sem internet ou se o Supabase falhar: deixa jogar (não trava ninguém por engano).
   - No site (navegador) não faz nada: o site já é sempre a versão nova.
   ===================================================================== */
import { registerPlugin } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";

const ATUALIZACAO = {
  loja: "apk",                     // LOJA_PLAY: troque para "play" na versão da Play Store
  linkPlay: "https://play.google.com/store/apps/details?id=com.danielsoucristo.heroesvsmonsters"
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
  if (!noApp || !window.CONTA || !window.CONTA.configApp) return;
  let cfg, meu;
  try { [cfg, meu] = await Promise.all([window.CONTA.configApp(), Atualizador.versao()]); }
  catch (e) { console.warn("Atualização: não deu para conferir", e); return; }      // sem internet: deixa jogar
  if (!cfg || Number(meu.versionCode) >= Number(cfg.versao_minima)) return;          // já está na versão certa
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

$("atualizarBt") && $("atualizarBt").addEventListener("click", () => {
  if (estado === "pronta" || estado === "erro") baixar();
  else if (estado === "permissao") Atualizador.abrirPermissao();
  else if (estado === "instalar") instalar();
});

if (noApp) {
  Atualizador.addListener("progresso", ({ baixado, total }) => {
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
