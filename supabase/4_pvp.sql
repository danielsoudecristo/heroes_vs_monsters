-- =====================================================================
-- Heroes vs Monsters Battlefront — PvP ONLINE (fila, sala e resultado)
-- Como usar: Supabase > SQL Editor > New query > cole TUDO > Run.  (depois dos arquivos 1, 2 e 3)
-- Pode rodar de novo sem problema.
-- =====================================================================

-- FILA: quem está procurando partida (some sozinho depois de 20 s sem renovar)
create table if not exists public.fila_pvp (
  jogador uuid primary key references public.perfis(id) on delete cascade,
  lado text not null check (lado in ('heroes','monsters')),
  niveis jsonb not null default '{}',
  criado_em timestamptz not null default now()
);
alter table public.fila_pvp enable row level security;     -- ninguém mexe direto: só pelas funções

-- SALA: uma por partida. A semente faz a partida sair igual nos dois aparelhos.
create table if not exists public.partidas_pvp (
  id uuid primary key default gen_random_uuid(),
  heroes uuid not null references public.perfis(id) on delete cascade,
  monsters uuid not null references public.perfis(id) on delete cascade,
  semente bigint not null,
  niveis_heroes jsonb not null default '{}', niveis_monsters jsonb not null default '{}',
  criada_em timestamptz not null default now(),
  rel_heroes text, rel_monsters text,            -- quem cada um disse que venceu
  resumo_heroes text, resumo_monsters text,      -- "foto" do fim da partida de cada um (tem de ser igual)
  vencedor text, finalizada boolean not null default false
);
alter table public.partidas_pvp enable row level security;
drop policy if exists "ver minhas salas" on public.partidas_pvp;
create policy "ver minhas salas" on public.partidas_pvp for select using (auth.uid() in (heroes, monsters));

create or replace function public.sala_json(s public.partidas_pvp) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('id', s.id, 'semente', s.semente, 'heroes', s.heroes, 'monsters', s.monsters,
    'niveis_heroes', s.niveis_heroes, 'niveis_monsters', s.niveis_monsters,
    'nome_heroes', (select split_part(nome, ' ', 1) from perfis where id = s.heroes),
    'nome_monsters', (select split_part(nome, ' ', 1) from perfis where id = s.monsters),
    'foto_heroes', (select avatar_url from perfis where id = s.heroes),
    'foto_monsters', (select avatar_url from perfis where id = s.monsters),
    'vencedor', s.vencedor, 'finalizada', s.finalizada);
$$;

-- PROCURAR PARTIDA: o jogo chama a cada 1,5 s. Acha alguém do lado oposto e cria a sala, ou entra/renova na fila.
create or replace function public.procurar_partida(p_lado text, p_niveis jsonb default '{}') returns json
language plpgsql security definer set search_path = public as $$
declare outro public.fila_pvp; s public.partidas_pvp;
begin
  if auth.uid() is null then raise exception 'precisa entrar'; end if;
  if p_lado not in ('heroes','monsters') then raise exception 'lado inválido'; end if;
  -- alguém já me achou?
  select * into s from partidas_pvp
   where auth.uid() in (heroes, monsters) and not finalizada and criada_em > now() - interval '40 seconds'
   order by criada_em desc limit 1;
  if s.id is not null then delete from fila_pvp where jogador = auth.uid(); return sala_json(s); end if;
  delete from fila_pvp where criado_em < now() - interval '20 seconds';
  select * into outro from fila_pvp where lado <> p_lado and jogador <> auth.uid() order by criado_em limit 1 for update skip locked;
  if outro.jogador is not null then
    delete from fila_pvp where jogador in (outro.jogador, auth.uid());
    insert into partidas_pvp (heroes, monsters, semente, niveis_heroes, niveis_monsters)
    values (case when p_lado = 'heroes' then auth.uid() else outro.jogador end,
            case when p_lado = 'monsters' then auth.uid() else outro.jogador end,
            floor(random() * 4294967295)::bigint,
            case when p_lado = 'heroes' then coalesce(p_niveis, '{}') else outro.niveis end,
            case when p_lado = 'monsters' then coalesce(p_niveis, '{}') else outro.niveis end)
    returning * into s;
    return sala_json(s);
  end if;
  insert into fila_pvp (jogador, lado, niveis) values (auth.uid(), p_lado, coalesce(p_niveis, '{}'))
  on conflict (jogador) do update set lado = excluded.lado, niveis = excluded.niveis, criado_em = now();
  return null;
end $$;

create or replace function public.sair_da_fila() returns void
language sql security definer set search_path = public as $$ delete from fila_pvp where jogador = auth.uid(); $$;

-- RESULTADO de um jogador (uso interno): troféus, moedas, vitória/derrota e histórico
create or replace function public.aplicar_resultado_pvp(p_jogador uuid, p_resultado text, p_lado text) returns void
language plpgsql security definer set search_path = public as $$
declare antes integer; dt integer; dm integer;
begin
  dt := case p_resultado when 'vitoria' then 30 when 'derrota' then -20 else 0 end;
  dm := case p_resultado when 'vitoria' then 50 when 'derrota' then 15 else 25 end;
  select trofeus into antes from perfis where id = p_jogador for update;
  update perfis set trofeus = greatest(0, trofeus + dt), moedas = moedas + dm,
         vitorias = vitorias + case when p_resultado = 'vitoria' then 1 else 0 end,
         derrotas = derrotas + case when p_resultado = 'derrota' then 1 else 0 end,
         lado_atual = p_lado, atualizado_em = now()
   where id = p_jogador;
  insert into partidas (jogador, modo, venceu, trofeus, moedas)
  values (p_jogador, 'pvp', p_resultado = 'vitoria', greatest(0, antes + dt) - antes, dm);
end $$;
revoke all on function public.aplicar_resultado_pvp(uuid, text, text) from public, anon, authenticated;

-- FINALIZAR: cada jogador manda quem venceu e a "foto" do fim. Só vale quando os DOIS mandam e é tudo igual.
create or replace function public.finalizar_pvp(p_sala uuid, p_vencedor text, p_resumo text) returns json
language plpgsql security definer set search_path = public as $$
declare s public.partidas_pvp; v text := coalesce(p_vencedor, 'empate');
begin
  if auth.uid() is null then raise exception 'precisa entrar'; end if;
  select * into s from partidas_pvp where id = p_sala for update;
  if s.id is null then raise exception 'sala não encontrada'; end if;
  if s.finalizada then return sala_json(s); end if;
  if auth.uid() = s.heroes then update partidas_pvp set rel_heroes = v, resumo_heroes = p_resumo where id = s.id;
  elsif auth.uid() = s.monsters then update partidas_pvp set rel_monsters = v, resumo_monsters = p_resumo where id = s.id;
  else raise exception 'você não está nesta partida'; end if;
  select * into s from partidas_pvp where id = p_sala;
  if s.rel_heroes is not null and s.rel_monsters is not null then
    if s.rel_heroes = s.rel_monsters and s.resumo_heroes = s.resumo_monsters then
      perform aplicar_resultado_pvp(s.heroes,   case s.rel_heroes when 'heroes' then 'vitoria' when 'monsters' then 'derrota' else 'empate' end, 'heroes');
      perform aplicar_resultado_pvp(s.monsters, case s.rel_heroes when 'monsters' then 'vitoria' when 'heroes' then 'derrota' else 'empate' end, 'monsters');
      update partidas_pvp set vencedor = s.rel_heroes, finalizada = true where id = s.id;
    else
      update partidas_pvp set vencedor = 'divergente', finalizada = true where id = s.id;   -- não bateu: não vale troféu
    end if;
    select * into s from partidas_pvp where id = p_sala;
  end if;
  return sala_json(s);
end $$;

create or replace function public.ver_sala(p_sala uuid) returns json
language sql stable security definer set search_path = public as $$
  select sala_json(s) from partidas_pvp s where s.id = p_sala and auth.uid() in (s.heroes, s.monsters);
$$;

revoke all on function public.procurar_partida(text, jsonb), public.sair_da_fila(), public.finalizar_pvp(uuid, text, text), public.ver_sala(uuid) from public, anon;
grant execute on function public.procurar_partida(text, jsonb), public.sair_da_fila(), public.finalizar_pvp(uuid, text, text), public.ver_sala(uuid) to authenticated;
