/* =====================================================================
   CONTA — login com Google pelo Supabase.
   Este arquivo é lido pelo Vite (npm run dev). Ele cria window.CONTA, que o perfil.js e o intro.js usam.
   SUPABASE: o endereço do projeto e a chave "publishable" (pode ficar no jogo: ela é pública).
   NUNCA coloque aqui a chave "secret" / "service_role".
   ===================================================================== */
import { createClient } from "@supabase/supabase-js";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";

const SUPABASE = {
  url: "https://wrhrtzesfhiwydtmbezq.supabase.co",
  chave: "sb_publishable_LzAJ7FOOCOBJWr8DwuyvVg_xsfKCDTP"
};

// APP_ANDROID: no app, o login abre no navegador e VOLTA para o app por este endereço
const ESQUEMA_APP = "com.danielsoucristo.heroesvsmonsters";
const PONTE_LOGIN = "https://heroes-vs-monsters.pages.dev/app-login.html";   // página do site que devolve o login para o app
const noApp = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

const sb = createClient(SUPABASE.url, SUPABASE.chave, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }   // a sessão fica salva: não precisa entrar toda vez
});

let usuario = null, canalChat = null, canalOnline = null;
function montarUsuario(u) {
  if (!u) return null;
  const m = u.user_metadata || {};
  return { id: u.id, email: u.email, nome: m.full_name || m.name || (u.email || "Jogador").split("@")[0], foto: m.avatar_url || m.picture || "" };
}
function avisar() { window.dispatchEvent(new CustomEvent("conta", { detail: usuario })); }

window.CONTA = {
  pronta: false,
  usuario: () => usuario,
  async entrarGoogle() {
    if (noApp) {                                   // APP: abre o Google numa janela do navegador e volta para o app
      const { data, error } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: PONTE_LOGIN, skipBrowserRedirect: true }
      });
      if (error) throw error;
      await Browser.open({ url: data.url });
      return;
    }
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: location.origin + location.pathname }   // SITE: volta para esta mesma página depois do Google
    });
    if (error) throw error;
  },
  async sair() {
    if (canalOnline) { sb.removeChannel(canalOnline); canalOnline = null; }
    if (canalChat) { sb.removeChannel(canalChat); canalChat = null; }
    await sb.auth.signOut();
  },
  async rpc(nome, args = {}) {                     // chama uma função do banco (as do arquivo supabase/1_conta.sql)
    const { data, error } = await sb.rpc(nome, args);
    if (error) throw error;
    return data;
  },
  async ranking(periodo, tipo) {                   // ranking de verdade (função "ranking" do arquivo supabase/2_ranking.sql)
    const { data, error } = await sb.rpc("ranking", { p_periodo: periodo, p_tipo: tipo, p_limite: 100 });
    if (error) throw error;
    return data;
  },
  // ---------- CHAT GLOBAL e QUEM ESTÁ ONLINE (ao vivo pelo Supabase Realtime) ----------
  async mensagens() {                              // últimas 50 mensagens do chat global
    const { data, error } = await sb.from("mensagens").select("id,autor,nome,avatar_url,lado,texto,criado_em")
      .order("criado_em", { ascending: false }).limit(50);
    if (error) throw error;
    return data.reverse();
  },
  assinarChat(aoChegar) {                          // chama aoChegar(mensagem) quando alguém manda algo
    if (canalChat) sb.removeChannel(canalChat);
    canalChat = sb.channel("chat-global")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensagens" }, ev => aoChegar(ev.new))
      .subscribe();
  },
  entrarOnline(dados, aoMudar) {                   // avisa que você está online (com o lado) e recebe quem mais está
    if (!usuario) return;
    if (canalOnline) { canalOnline.track({ ...dados, id: usuario.id }); return; }
    canalOnline = sb.channel("online", { config: { presence: { key: usuario.id } } });
    canalOnline.on("presence", { event: "sync" }, () => {
      const estado = canalOnline.presenceState(), lista = {};
      for (const k in estado) lista[k] = estado[k][estado[k].length - 1];
      aoMudar(lista);
    }).subscribe(st => { if (st === "SUBSCRIBED") canalOnline.track({ ...dados, id: usuario.id }); });
  },
  async meusPersonagens() {                        // nível da conta de cada personagem
    const { data, error } = await sb.from("personagens_jogador").select("personagem,nivel,habilidades");
    if (error) throw error;
    return data;
  },
  // ---------- SALA DO PvP: canal ao vivo só dos dois jogadores (eles trocam só as AÇÕES) ----------
  entrarSala(id, aoReceber) {
    return new Promise((ok, erro) => {
      const canal = sb.channel("pvp:" + id, { config: { broadcast: { self: false } } });
      canal.on("broadcast", { event: "m" }, ev => aoReceber(ev.payload));
      let pronto = false;
      canal.subscribe(st => {
        if (st === "SUBSCRIBED" && !pronto) {
          pronto = true;
          ok({
            enviar: payload => canal.send({ type: "broadcast", event: "m", payload }),
            sair: () => sb.removeChannel(canal)
          });
        } else if ((st === "CHANNEL_ERROR" || st === "TIMED_OUT") && !pronto) erro(new Error("não conectou na sala (" + st + ")"));
      });
    });
  },
  async configApp() {                              // ATUALIZACAO_APP: versão mínima e link do APK (supabase/7_atualizacao.sql)
    const { data, error } = await sb.from("config_app").select("*").eq("id", 1).maybeSingle();
    if (error) throw error;
    return data;
  },
  async minhasPartidas() {
    const { data, error } = await sb.from("partidas").select("venceu,modo,trofeus,moedas,criado_em")
      .order("criado_em", { ascending: false }).limit(1000);
    if (error) throw error;
    return data;
  }
};

sb.auth.getSession().then(({ data }) => {
  usuario = montarUsuario(data.session && data.session.user);
  window.CONTA.pronta = true;
  avisar();
  sb.auth.onAuthStateChange((_evento, sessao) => {
    const novo = montarUsuario(sessao && sessao.user);
    if ((novo && novo.id) !== (usuario && usuario.id)) { usuario = novo; avisar(); }
  });
}).catch(e => { console.error("Supabase:", e); window.CONTA.pronta = true; avisar(); });

// APP: quando o Google termina, o Android abre "com.danielsoucristo.heroesvsmonsters://login#access_token=..."
// e o app pega a sessão daqui (sem ir para o site)
if (noApp) App.addListener("appUrlOpen", async ({ url }) => {
  if (!url || !url.startsWith(ESQUEMA_APP + "://")) return;
  try {
    const depois = url.includes("#") ? url.split("#")[1] : (url.split("?")[1] || "");
    const q = new URLSearchParams(depois);
    if (q.get("access_token") && q.get("refresh_token")) {
      await sb.auth.setSession({ access_token: q.get("access_token"), refresh_token: q.get("refresh_token") });
    } else if (q.get("code")) {
      await sb.auth.exchangeCodeForSession(q.get("code"));
    }
  } catch (e) { console.error("Login no app:", e); }
  try { await Browser.close(); } catch {}
});

// APP: o botão "voltar" do Android abre o menu do jogo (no menu, ele minimiza o app)
if (noApp) App.addListener("backButton", () => {
  const intro = document.getElementById("intro");
  if (intro && !intro.hidden) App.minimizeApp();
  else if (window.INTRO_ABRIR_MENU) window.INTRO_ABRIR_MENU();
});

// APP: se a pessoa fechar a janela do Google sem entrar, a tela de login volta a funcionar
if (noApp) Browser.addListener("browserFinished", () => {
  if (!usuario) window.dispatchEvent(new CustomEvent("login-fechado"));
});
