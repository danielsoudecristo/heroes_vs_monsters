/* =====================================================================
   PERFIL — moedas, troféus, vitórias, ligas e ranking do jogador.
   Por enquanto fica salvo neste navegador. Quando o login com Google (Supabase) existir,
   este mesmo arquivo passa a ler e gravar no servidor, sem mudar as telas.
   Roda ANTES do intro.js e do jogo.js (window.PERFIL).
   ===================================================================== */
(() => {
"use strict";

/* ---------- ECONOMIA: quanto se ganha e se perde ---------- */
const ECONOMIA = {
  moedaNome: "Moedas",         // nome da moeda da conta (usada para subir níveis e liberar habilidades)
  moedasIniciais: 100,
  pvpVitoria:  { trofeus: 30,  moedas: 50 },   // PvP: quem vence
  pvpDerrota:  { trofeus: -20, moedas: 15 },   // PvP: quem perde (os troféus nunca ficam abaixo de 0)
  campanhaNivel: 20,           // moedas por nível da campanha concluído
  campanhaChefe: 40            // moedas a mais quando derruba o chefão
};

/* ---------- PERSONAGENS: nível da conta (1 a 15). Cada nível dá +5% de vida e de dano.
   PRECOS[n-1] = moedas para ir do nível n para o n+1 (o servidor cobra o mesmo: supabase/3_social.sql) ---------- */
const PERSONAGENS_CONTA = {
  maximo: 15, bonusPorNivel: 0.05,
  precos: [50, 100, 200, 350, 600, 1000, 1600, 2500, 4000, 6000, 9000, 13000, 18000, 25000],
  habilidadesNos: [5, 10, 15]                  // níveis em que as 3 habilidades de cada personagem vão abrir (em breve)
};
/* ---------- BONUS_LADOS: um lado fica "em alta" a cada dia (+50% de moedas) e jogar com os dois lados no mesmo dia dá +150 ---------- */
const BONUS_LADOS = { emAlta: 0.5, doisLados: 150 };

/* ---------- LIGAS: pelo total de troféus (imagens em public/assets/liga) ---------- */
const LIGAS = [
  { nome: "Bronze",   min: 0,    img: "liga/Bronze",   cor: "#c07a45" },
  { nome: "Prata",    min: 400,  img: "liga/Prata",    cor: "#c9cfd8" },
  { nome: "Ouro",     min: 800,  img: "liga/Ouro",     cor: "#f2c14e" },
  { nome: "Diamante", min: 1500, img: "liga/Diamante", cor: "#5fd0f0" },
  { nome: "Mestre",   min: 2500, img: "liga/Mestre",   cor: "#a57bf0" },
  { nome: "Campeão",  min: 4000, img: "liga/Campeão",  cor: "#ffd97a" },
  { nome: "Lendas",   min: 6000, img: "liga/Lendas",   cor: "#c06cf0" },
  { nome: "Leões FC", min: 8000, img: "liga/Leoncs",   cor: "#e8b84a" }   // a liga mais alta (arquivo Leoncs.png)
];

/* ---------- RANKING: jogadores de verdade (vem do Supabase) ---------- */
const RANKING = { guardar: 30 };   // segundos que a lista fica guardada antes de buscar de novo
const CHAVE = "hvm_perfil";
let p = carregar();
function carregar() {
  try {
    const s = JSON.parse(localStorage.getItem(CHAVE) || "null");
    if (s) return { nome: "Jogador", moedas: 0, trofeus: 0, vitorias: 0, derrotas: 0, partidas: [], ...s };
  } catch {}
  return { nome: "Jogador", moedas: ECONOMIA.moedasIniciais, trofeus: 0, vitorias: 0, derrotas: 0, partidas: [] };
}
function salvar() {
  if (p.partidas.length > 2000) p.partidas = p.partidas.slice(-2000);   // guarda só as últimas
  if (!conta) try { localStorage.setItem(CHAVE, JSON.stringify(p)); } catch {}   // convidado: fica no navegador
  for (const f of ouvintes) try { f(p); } catch {}
}
const ouvintes = [];

/* ---------- CONTA_GOOGLE: com login, o progresso fica na conta (Supabase) ----------
   Convidado: tudo fica neste navegador (como antes).
   Primeiro login: o progresso do navegador é levado para a conta (uma vez só). */
let conta = null, statusConta = "convidado";
function deServidor(srv, partidas) {
  p = { ...p, nome: srv.nome || (conta && conta.nome) || "Jogador", foto: srv.avatar_url || (conta && conta.foto) || "",
        moedas: srv.moedas, trofeus: srv.trofeus, vitorias: srv.vitorias, derrotas: srv.derrotas,
        convite: srv.codigo_convite || "", indicado: !!srv.indicado_por,
        diaBonus: srv.dia_bonus || "", ladosHoje: srv.lados_hoje || [], bonusPago: !!srv.bonus_duplo_pago,
        partidas: partidas ? partidas.map(m => ({ t: Date.parse(m.criado_em), modo: m.modo, venceu: m.venceu, trofeus: m.trofeus, moedas: m.moedas })).reverse() : p.partidas };
}
async function conectarConta(u) {
  if (!u) { conta = null; statusConta = "convidado"; niveis = {}; p = carregar(); salvar(); return; }
  if (conta && conta.id === u.id) return;
  conta = u; statusConta = "carregando"; salvar();
  try {
    let srv = await CONTA.rpc("meu_perfil");
    if (!srv.importou_local) {
      const loc = carregar();
      srv = await CONTA.rpc("importar_progresso_local", { p_moedas: loc.moedas, p_trofeus: loc.trofeus, p_vitorias: loc.vitorias, p_derrotas: loc.derrotas });
    }
    deServidor(srv, await CONTA.minhasPartidas());
    niveis = {}; for (const r of await CONTA.meusPersonagens()) niveis[r.personagem] = r.nivel;
    statusConta = "conectado";
    usarConvitePendente();
  } catch (e) {
    console.error("Conta:", e);
    statusConta = "erro: " + (e.message || e);
  }
  salvar();
}
window.addEventListener("conta", e => conectarConta(e.detail));
// grava no servidor e acerta os números com a resposta dele (o servidor é quem manda)
function noServidor(nome, args) {
  if (!conta || statusConta !== "conectado") return;
  CONTA.rpc(nome, args).then(srv => { if (srv && srv.id) { deServidor(srv, null); salvar(); } })
    .catch(e => { console.error("Conta:", e); statusConta = "erro: " + (e.message || e); salvar(); });
}

function ligaDe(trofeus) {
  let i = 0;
  for (let k = 0; k < LIGAS.length; k++) if (trofeus >= LIGAS[k].min) i = k;
  const atual = LIGAS[i], prox = LIGAS[i + 1] || null;
  const prog = prox ? (trofeus - atual.min) / (prox.min - atual.min) : 1;
  return { ...atual, indice: i, proxima: prox, progresso: Math.max(0, Math.min(1, prog)) };
}

// começo do dia, da semana (segunda-feira) e do mês
function inicioPeriodo(periodo, agora = new Date()) {
  const d = new Date(agora); d.setHours(0, 0, 0, 0);
  if (periodo === "semana") { const dia = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dia); }
  if (periodo === "mes") d.setDate(1);
  return d.getTime();
}
function somaPeriodo(periodo, tipo) {
  const ini = inicioPeriodo(periodo);
  let v = 0;
  for (const m of p.partidas) {
    if (m.t < ini) continue;
    if (tipo === "vitorias") v += m.venceu ? 1 : 0;
    else v += m.trofeus || 0;
  }
  return tipo === "trofeus" ? Math.max(0, v) : v;
}

// ranking de verdade: busca no servidor (guarda 30 s para não ficar pedindo toda hora)
const cacheRank = {};
async function ranking(periodo, tipo) {
  const chave = periodo + ":" + tipo, c = cacheRank[chave];
  if (c && Date.now() - c.t < RANKING.guardar * 1000) return c.lista;
  if (!window.CONTA || !window.CONTA.ranking) throw new Error("sem conexão com o servidor");
  const dados = await window.CONTA.ranking(periodo, tipo);
  const lista = (dados || []).map(r => ({
    posicao: Number(r.posicao), id: r.id || null, nome: r.nome, foto: r.avatar_url || "", valor: Number(r.valor),
    trofeus: r.trofeus, eu: !!r.eu, liga: ligaDe(r.trofeus)
  }));
  cacheRank[chave] = { t: Date.now(), lista };
  return lista;
}
function esquecerRanking() { for (const k in cacheRank) delete cacheRank[k]; }
function registrarPartida(venceu, modo = "pvp", lado) {
  const r = venceu ? ECONOMIA.pvpVitoria : ECONOMIA.pvpDerrota;
  const antes = p.trofeus;
  p.trofeus = Math.max(0, p.trofeus + r.trofeus);
  p.moedas += r.moedas;
  if (venceu) p.vitorias++; else p.derrotas++;
  p.partidas.push({ t: Date.now(), modo, venceu, trofeus: p.trofeus - antes, moedas: r.moedas });
  salvar(); esquecerRanking();
  noServidor("registrar_partida", { p_venceu: venceu, p_modo: modo });
  if (lado) { marcarLadoLocal(lado); noServidor("marcar_lado", { p_lado: lado }); }
  return { trofeus: p.trofeus - antes, moedas: r.moedas, liga: ligaDe(p.trofeus), subiuLiga: ligaDe(p.trofeus).indice > ligaDe(antes).indice };
}
// moedas da campanha: com o lado em alta vale +50%; e marca o lado jogado hoje (bônus dos dois lados)
function ganharMoedas(n, lado) {
  const alta = lado && lado === ladoEmAlta(), ganho = alta ? Math.round(n * (1 + BONUS_LADOS.emAlta)) : n;
  p.moedas += ganho;
  const duplo = lado ? marcarLadoLocal(lado) : 0;
  salvar();
  for (let resto = n; resto > 0; resto -= 60) noServidor("ganhar_moedas_campanha", { qtd: Math.min(60, resto), p_lado: lado || null });   // o servidor aceita até 60 por vez
  return { ganho, alta, duplo };
}
function hojeSP() { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
function ladoEmAlta() {                               // dia do ano par = Heroes; ímpar = Monsters (igual ao servidor)
  const d = new Date(hojeSP() + "T00:00:00Z"), doy = Math.round((d - Date.UTC(d.getUTCFullYear(), 0, 0)) / 864e5);
  return doy % 2 === 0 ? "heroes" : "monsters";
}
function marcarLadoLocal(lado) {
  const hoje = hojeSP();
  if (p.diaBonus !== hoje) { p.diaBonus = hoje; p.ladosHoje = []; p.bonusPago = false; }
  if (!p.ladosHoje.includes(lado)) p.ladosHoje.push(lado);
  if (p.ladosHoje.length >= 2 && !p.bonusPago) { p.bonusPago = true; p.moedas += BONUS_LADOS.doisLados; return BONUS_LADOS.doisLados; }
  return 0;
}
function bonusHoje() {
  const hoje = hojeSP(), lados = p.diaBonus === hoje ? (p.ladosHoje || []) : [];
  return { emAlta: ladoEmAlta(), lados, pago: p.diaBonus === hoje && !!p.bonusPago, valor: BONUS_LADOS.doisLados };
}
// ---------- nível da conta de cada personagem ----------
let niveis = {};
function nivelPersonagem(id) { return niveis[id] || 1; }
function bonusPersonagem(id) { return 1 + PERSONAGENS_CONTA.bonusPorNivel * (nivelPersonagem(id) - 1); }
function custoProximo(id) { const n = nivelPersonagem(id); return n >= PERSONAGENS_CONTA.maximo ? null : PERSONAGENS_CONTA.precos[n - 1]; }
async function subirNivel(id) {
  if (!conta || statusConta !== "conectado") throw new Error("Entre com Google para evoluir os personagens");
  const custo = custoProximo(id);
  if (custo == null) throw new Error("Esse personagem já está no nível máximo");
  if (p.moedas < custo) throw new Error(`Faltam ${custo - p.moedas} moedas`);
  const r = await CONTA.rpc("subir_nivel", { p_personagem: id });
  niveis[id] = r.nivel; deServidor(r.perfil, null); salvar();
  return r.nivel;
}
// ---------- convite: o link ?convite=CODIGO fica guardado até a pessoa entrar com Google ----------
try { const c = new URLSearchParams(location.search).get("convite"); if (c) localStorage.setItem("hvm_convite", c.toUpperCase()); } catch {}
async function usarConvite(codigo) {
  if (!conta) throw new Error("Entre com Google primeiro");
  const r = await CONTA.rpc("usar_convite", { p_codigo: codigo });
  try { localStorage.removeItem("hvm_convite"); } catch {}
  deServidor(await CONTA.rpc("meu_perfil"), null); salvar();
  return r;
}
function usarConvitePendente() {
  let c = null; try { c = localStorage.getItem("hvm_convite"); } catch {}
  if (c && !p.indicado) usarConvite(c).then(r => { for (const f of ouvintes) try { f(p, { convite: r }); } catch {} })
    .catch(() => { try { localStorage.removeItem("hvm_convite"); } catch {} });
}
function gastarMoedas(n) { if (p.moedas < n) return false; p.moedas -= n; salvar(); noServidor("gastar_moedas", { qtd: n }); return true; }

window.PERFIL = {
  ECONOMIA, LIGAS, RANKING,
  dados: () => p,
  liga: () => ligaDe(p.trofeus),
  PERSONAGENS_CONTA, BONUS_LADOS,
  nivelPersonagem, bonusPersonagem, custoProximo, subirNivel, ladoEmAlta, bonusHoje, usarConvite,
  ligaDe, ranking, esquecerRanking, registrarPartida, ganharMoedas, gastarMoedas,
  aoMudar: f => ouvintes.push(f),
  zerar() { p = { ...p, moedas: ECONOMIA.moedasIniciais, trofeus: 0, vitorias: 0, derrotas: 0, partidas: [] }; salvar(); noServidor("zerar_meu_perfil", {}); },
  async recarregar() {                              // busca de novo no servidor (depois de uma partida online)
    if (!conta || statusConta !== "conectado") return;
    try { deServidor(await CONTA.rpc("meu_perfil"), await CONTA.minhasPartidas()); esquecerRanking(); salvar(); } catch (e) { console.error(e); }
  },
  niveisConta: () => ({ ...niveis }),
  conta: () => conta,
  statusConta: () => statusConta
};
})();
