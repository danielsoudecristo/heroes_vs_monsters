-- =====================================================================
-- Heroes vs Monsters Battlefront — conta do jogador
-- Como usar: Supabase > SQL Editor > New query > cole TUDO > Run.
-- Pode rodar de novo sem problema (não apaga nada).
-- =====================================================================

-- PERFIL: um por jogador (criado sozinho no primeiro login)
create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default 'Jogador',
  avatar_url text,
  moedas integer not null default 100 check (moedas >= 0),
  trofeus integer not null default 0 check (trofeus >= 0),
  vitorias integer not null default 0,
  derrotas integer not null default 0,
  importou_local boolean not null default false,   -- já trouxe o progresso que estava no navegador
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- PARTIDAS: histórico (serve para o ranking de hoje, da semana e do mês)
create table if not exists public.partidas (
  id bigint generated always as identity primary key,
  jogador uuid not null references public.perfis(id) on delete cascade,
  modo text not null default 'pvp',
  venceu boolean not null,
  trofeus integer not null default 0,
  moedas integer not null default 0,
  criado_em timestamptz not null default now()
);
create index if not exists partidas_jogador_data on public.partidas (jogador, criado_em desc);
create index if not exists partidas_data on public.partidas (criado_em desc);

-- PERSONAGENS: nível e habilidades de cada personagem do jogador (para o futuro)
create table if not exists public.personagens_jogador (
  jogador uuid not null references public.perfis(id) on delete cascade,
  personagem text not null,
  nivel integer not null default 1 check (nivel between 1 and 100),
  habilidades jsonb not null default '[]',
  primary key (jogador, personagem)
);

-- SEGURANÇA: cada jogador só LÊ os próprios dados. Ninguém escreve direto nas tabelas:
-- só pelas funções abaixo, que conferem os valores.
alter table public.perfis enable row level security;
alter table public.partidas enable row level security;
alter table public.personagens_jogador enable row level security;
drop policy if exists "ler meu perfil" on public.perfis;
create policy "ler meu perfil" on public.perfis for select using (auth.uid() = id);
drop policy if exists "ler minhas partidas" on public.partidas;
create policy "ler minhas partidas" on public.partidas for select using (auth.uid() = jogador);
drop policy if exists "ler meus personagens" on public.personagens_jogador;
create policy "ler meus personagens" on public.personagens_jogador for select using (auth.uid() = jogador);

-- Cria o perfil sozinho quando alguém entra pela primeira vez (com nome e foto do Google)
create or replace function public.criar_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, nome, avatar_url)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Jogador'),
          coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario after insert on auth.users
  for each row execute function public.criar_perfil();

-- ---------- FUNÇÕES que o jogo chama ----------

-- meu perfil (cria se ainda não existir)
create or replace function public.meu_perfil() returns public.perfis
language plpgsql security definer set search_path = public as $$
declare p public.perfis;
begin
  if auth.uid() is null then raise exception 'precisa entrar'; end if;
  insert into perfis (id) values (auth.uid()) on conflict (id) do nothing;
  select * into p from perfis where id = auth.uid();
  return p;
end $$;

-- traz UMA VEZ o progresso que estava no navegador (com limites, para ninguém inventar números)
create or replace function public.importar_progresso_local(p_moedas integer, p_trofeus integer, p_vitorias integer, p_derrotas integer)
returns public.perfis language plpgsql security definer set search_path = public as $$
declare p public.perfis;
begin
  if auth.uid() is null then raise exception 'precisa entrar'; end if;
  update perfis set
    moedas   = greatest(moedas,   least(coalesce(p_moedas, 0),   20000)),
    trofeus  = greatest(trofeus,  least(coalesce(p_trofeus, 0),  2000)),
    vitorias = greatest(vitorias, least(coalesce(p_vitorias, 0), 500)),
    derrotas = greatest(derrotas, least(coalesce(p_derrotas, 0), 500)),
    importou_local = true, atualizado_em = now()
  where id = auth.uid() and importou_local = false
  returning * into p;
  if p.id is null then select * into p from perfis where id = auth.uid(); end if;
  return p;
end $$;

-- moedas da campanha (no máximo 60 por vez)
create or replace function public.ganhar_moedas_campanha(qtd integer) returns public.perfis
language plpgsql security definer set search_path = public as $$
declare p public.perfis;
begin
  if auth.uid() is null then raise exception 'precisa entrar'; end if;
  if qtd < 1 or qtd > 60 then raise exception 'quantidade inválida'; end if;
  update perfis set moedas = moedas + qtd, atualizado_em = now() where id = auth.uid() returning * into p;
  return p;
end $$;

-- gastar moedas (subir nível / liberar habilidade, no futuro)
create or replace function public.gastar_moedas(qtd integer) returns public.perfis
language plpgsql security definer set search_path = public as $$
declare p public.perfis;
begin
  if auth.uid() is null then raise exception 'precisa entrar'; end if;
  if qtd < 1 then raise exception 'quantidade inválida'; end if;
  update perfis set moedas = moedas - qtd, atualizado_em = now() where id = auth.uid() and moedas >= qtd returning * into p;
  if p.id is null then raise exception 'moedas insuficientes'; end if;
  return p;
end $$;

-- resultado de uma partida. ECONOMIA: vitória +30 troféus e +50 moedas; derrota -20 troféus e +15 moedas.
-- (TEMPORÁRIO: quando o PvP online existir, o resultado será conferido com o do adversário antes de contar)
create or replace function public.registrar_partida(p_venceu boolean, p_modo text default 'pvp') returns public.perfis
language plpgsql security definer set search_path = public as $$
declare p public.perfis; antes integer;
        dt integer := case when p_venceu then 30 else -20 end;
        dm integer := case when p_venceu then 50 else 15 end;
begin
  if auth.uid() is null then raise exception 'precisa entrar'; end if;
  select trofeus into antes from perfis where id = auth.uid() for update;
  update perfis set trofeus = greatest(0, trofeus + dt), moedas = moedas + dm,
         vitorias = vitorias + case when p_venceu then 1 else 0 end,
         derrotas = derrotas + case when p_venceu then 0 else 1 end,
         atualizado_em = now()
   where id = auth.uid() returning * into p;
  insert into partidas (jogador, modo, venceu, trofeus, moedas) values (auth.uid(), left(coalesce(p_modo, 'pvp'), 20), p_venceu, p.trofeus - antes, dm);
  return p;
end $$;

-- zerar o próprio perfil (botão do painel de teste)
create or replace function public.zerar_meu_perfil() returns public.perfis
language plpgsql security definer set search_path = public as $$
declare p public.perfis;
begin
  if auth.uid() is null then raise exception 'precisa entrar'; end if;
  delete from partidas where jogador = auth.uid();
  update perfis set moedas = 100, trofeus = 0, vitorias = 0, derrotas = 0, atualizado_em = now() where id = auth.uid() returning * into p;
  return p;
end $$;

-- só quem entrou na conta pode chamar as funções
revoke all on function public.meu_perfil(), public.importar_progresso_local(integer, integer, integer, integer),
  public.ganhar_moedas_campanha(integer), public.gastar_moedas(integer), public.registrar_partida(boolean, text),
  public.zerar_meu_perfil() from public, anon;
grant execute on function public.meu_perfil(), public.importar_progresso_local(integer, integer, integer, integer),
  public.ganhar_moedas_campanha(integer), public.gastar_moedas(integer), public.registrar_partida(boolean, text),
  public.zerar_meu_perfil() to authenticated;
