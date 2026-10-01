/* =====================================================================
   CONTA — login com Google pelo Supabase.
   Este arquivo é lido pelo Vite (npm run dev). Ele cria window.CONTA, que o perfil.js e o intro.js usam.
   SUPABASE: o endereço do projeto e a chave "publishable" (pode ficar no jogo: ela é pública).
   NUNCA coloque aqui a chave "secret" / "service_role".
   ===================================================================== */
import { createClient } from "@supabase/supabase-js";

const SUPABASE = {
  url: "https://wrhrtzesfhiwydtmbezq.supabase.co",
  chave: "sb_publishable_LzAJ7FOOCOBJWr8DwuyvVg_xsfKCDTP"
};

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
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: location.origin + location.pathname }   // volta para esta mesma página depois do Google
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
