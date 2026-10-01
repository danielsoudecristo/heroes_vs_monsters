-- =====================================================================
-- Heroes vs Monsters Battlefront — PERSONAGENS, CONVITES, AMIGOS, CHAT e BÔNUS DOS DOIS LADOS
-- Como usar: Supabase > SQL Editor > New query > cole TUDO > Run.  (rode DEPOIS do 1_conta.sql e do 2_ranking.sql)
-- Pode rodar de novo sem problema.
-- =====================================================================

-- ---------- colunas novas no perfil ----------
alter table public.perfis add column if not exists codigo_convite text unique;
alter table public.perfis add column if not exists indicado_por uuid references public.perfis(id);
alter table public.perfis add column if not exists lado_atual text;            -- 'heroes' ou 'monsters' (o que está jogando agora)
alter table public.perfis add column if not exists dia_bonus date;
alter table public.perfis add column if not exists lados_hoje text[] not null default '{}';
alter table public.perfis add column if not exists bonus_duplo_pago boolean not null default false;
update public.perfis set codigo_convite = upper(substr(md5(id::text || random()::text), 1, 7)) where codigo_convite is null;

-- ---------- PREÇOS: nível 2 a 15 de cada personagem (o servidor é quem cobra) ----------
-- custo para ir do nível N para o N+1. Cada nível dá +5% de vida e dano.
create or replace function public.custo_nivel(n integer) returns integer language sql immutable as $$
  select (array[50,100,200,350,600,1000,1600,2500,4000,6000,9000,13000,18000,25000])[n];
$$;
create or replace function public.personagem_valido(p text) returns boolean language sql immutable as $$
  select p = any(array['elara','nick','arqueiro','protetor','mago','magoFogo','sentinela',
                       'esqueleto','esqueletoFogo','esqueletoArqueiro','esqueletoProtetor','esqueletoMago','esqueletoTita']);
$$;
create or replace function public.subir_nivel(p_personagem text) returns json
language plpgsql security definer set search_path = public as $$
declare atual integer; preco integer; p public.perfis;
begin
  if auth.uid() is null then raise exception 'precisa entrar'; end if;
  if not personagem_valido(p_personagem) then raise exception 'personagem inválido'; end if;
  select nivel into atual from personagens_jogador where jogador = auth.uid() and personagem = p_personagem;
  atual := coalesce(atual, 1);
  if atual >= 15 then raise exception 'nível máximo'; end if;
  preco := custo_nivel(atual);
  update perfis set moedas = moedas - preco, atualizado_em = now() where id = auth.uid() and moedas >= preco returning * into p;
  if p.id is null then raise exception 'moedas insuficientes'; end if;
  insert into personagens_jogador (jogador, personagem, nivel) values (auth.uid(), p_personagem, atual + 1)
    on conflict (jogador, personagem) do update set nivel = excluded.nivel;
  return json_build_object('perfil', row_to_json(p), 'personagem', p_personagem, 'nivel', atual + 1);
end $$;

-- ---------- BÔNUS DOS DOIS LADOS ----------
-- Um lado fica "em alta" a cada dia (+50% de moedas na campanha). Jogar com OS DOIS lados no mesmo dia dá +150.
create or replace function public.lado_em_alta() returns text language sql stable as $$
  select case when extract(doy from (now() at time zone 'America/Sao_Paulo'))::int % 2 = 0 then 'heroes' else 'monsters' end;
$$;
create or replace function public.marcar_lado(p_lado text) returns integer   -- devolve o bônus pago agora (0 ou 150)
language plpgsql security definer set search_path = public as $$
declare hoje date := (now() at time zone 'America/Sao_Paulo')::date; ls text[]; pago boolean; bonus integer := 0;
begin
  if p_lado not in ('heroes','monsters') then return 0; end if;
  update perfis set lados_hoje = '{}', bonus_duplo_pago = false, dia_bonus = hoje where id = auth.uid() and dia_bonus is distinct from hoje;
  update perfis set lados_hoje = array(select distinct unnest(lados_hoje || p_lado)), lado_atual = p_lado
   where id = auth.uid() returning lados_hoje, bonus_duplo_pago into ls, pago;
  if array_length(ls, 1) = 2 and not pago then
    bonus := 150;
    update perfis set moedas = moedas + bonus, bonus_duplo_pago = true where id = auth.uid();
  end if;
  return bonus;
end $$;

-- moedas da campanha (troca a função antiga: agora com o lado e o bônus)
drop function if exists public.ganhar_moedas_campanha(integer);
create or replace function public.ganhar_moedas_campanha(qtd integer, p_lado text default null) returns public.perfis
language plpgsql security definer set search_path = public as $$
declare p public.perfis; ganho integer;
begin
  if auth.uid() is null then raise exception 'precisa entrar'; end if;
  if qtd < 1 or qtd > 60 then raise exception 'quantidade inválida'; end if;
  ganho := case when p_lado = lado_em_alta() then round(qtd * 1.5) else qtd end;
  update perfis set moedas = moedas + ganho, atualizado_em = now() where id = auth.uid();
  if p_lado is not null then perform marcar_lado(p_lado); end if;
  select * into p from perfis where id = auth.uid();
  return p;
end $$;

-- ---------- CONVITES (indicação) ----------
-- Quem entra pela 1ª vez com o código de um amigo: o novo ganha 200 moedas e quem convidou ganha 300.
-- Só vale em conta nova (até 3 dias), uma vez por conta, e no máximo 30 convites pagos por pessoa.
create or replace function public.usar_convite(p_codigo text) returns json
language plpgsql security definer set search_path = public as $$
declare eu public.perfis; dono public.perfis; qtd integer;
begin
  if auth.uid() is null then raise exception 'precisa entrar'; end if;
  select * into eu from perfis where id = auth.uid();
  if eu.indicado_por is not null then raise exception 'você já usou um convite'; end if;
  if eu.criado_em < now() - interval '3 days' then raise exception 'convite só vale para conta nova'; end if;
  select * into dono from perfis where codigo_convite = upper(trim(p_codigo));
  if dono.id is null then raise exception 'código não encontrado'; end if;
  if dono.id = eu.id then raise exception 'não dá para usar o próprio código'; end if;
  update perfis set indicado_por = dono.id, moedas = moedas + 200 where id = eu.id;
  select count(*) into qtd from perfis where indicado_por = dono.id;
  if qtd <= 30 then update perfis set moedas = moedas + 300 where id = dono.id; end if;
  return json_build_object('ganhou', 200, 'amigo', dono.nome);
end $$;

-- garante o código de convite em quem já existe e em quem entrar depois
create or replace function public.meu_perfil() returns public.perfis
language plpgsql security definer set search_path = public as $$
declare p public.perfis;
begin
  if auth.uid() is null then raise exception 'precisa entrar'; end if;
  insert into perfis (id) values (auth.uid()) on conflict (id) do nothing;
  update perfis set codigo_convite = upper(substr(md5(id::text || random()::text), 1, 7)) where id = auth.uid() and codigo_convite is null;
  select * into p from perfis where id = auth.uid();
  return p;
end $$;

-- ---------- AMIGOS ----------
create table if not exists public.amizades (
  de uuid not null references public.perfis(id) on delete cascade,
  para uuid not null references public.perfis(id) on delete cascade,
  status text not null default 'pendente' check (status in ('pendente','aceita')),
  criado_em timestamptz not null default now(),
  primary key (de, para),
  check (de <> para)
);
alter table public.amizades enable row level security;
drop policy if exists "ver minhas amizades" on public.amizades;
create policy "ver minhas amizades" on public.amizades for select using (auth.uid() in (de, para));

create or replace function public.pedir_amizade(p_alvo uuid) returns text
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'precisa entrar'; end if;
  if p_alvo = auth.uid() then raise exception 'esse é você'; end if;
  if exists (select 1 from amizades where de = p_alvo and para = auth.uid()) then      -- ele já tinha pedido: vira amizade
    update amizades set status = 'aceita' where de = p_alvo and para = auth.uid();
    return 'aceita';
  end if;
  insert into amizades (de, para) values (auth.uid(), p_alvo) on conflict do nothing;
  return 'pendente';
end $$;
create or replace function public.responder_amizade(p_de uuid, p_aceitar boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_aceitar then update amizades set status = 'aceita' where de = p_de and para = auth.uid();
  else delete from amizades where de = p_de and para = auth.uid(); end if;
end $$;
create or replace function public.remover_amigo(p_outro uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from amizades where (de = auth.uid() and para = p_outro) or (de = p_outro and para = auth.uid());
end $$;
create or replace function public.meus_amigos()
returns table (id uuid, nome text, avatar_url text, trofeus integer, lado_atual text, status text, pedido_meu boolean)
language sql stable security definer set search_path = public as $$
  select pe.id, split_part(pe.nome, ' ', 1) || coalesce(' ' || nullif(left(split_part(pe.nome, ' ', 2), 1), '') || '.', ''),
         pe.avatar_url, pe.trofeus, pe.lado_atual, a.status, (a.de = auth.uid())
    from amizades a join perfis pe on pe.id = case when a.de = auth.uid() then a.para else a.de end
   where auth.uid() in (a.de, a.para)
   order by a.status, pe.nome;
$$;

-- ---------- CHAT GLOBAL ----------
create table if not exists public.mensagens (
  id bigint generated always as identity primary key,
  autor uuid not null references public.perfis(id) on delete cascade,
  nome text not null, avatar_url text, lado text,
  texto text not null check (char_length(texto) between 1 and 200),
  criado_em timestamptz not null default now()
);
create index if not exists mensagens_data on public.mensagens (criado_em desc);
alter table public.mensagens enable row level security;
drop policy if exists "ler chat" on public.mensagens;
create policy "ler chat" on public.mensagens for select to authenticated using (true);
create or replace function public.enviar_mensagem(p_texto text, p_lado text) returns void
language plpgsql security definer set search_path = public as $$
declare p public.perfis; ultima timestamptz; t text := trim(p_texto);
begin
  if auth.uid() is null then raise exception 'precisa entrar'; end if;
  if char_length(t) < 1 or char_length(t) > 200 then raise exception 'mensagem de 1 a 200 letras'; end if;
  select max(criado_em) into ultima from mensagens where autor = auth.uid();
  if ultima > now() - interval '2 seconds' then raise exception 'calma! espere um pouquinho'; end if;
  select * into p from perfis where id = auth.uid();
  insert into mensagens (autor, nome, avatar_url, lado, texto)
  values (auth.uid(), split_part(p.nome, ' ', 1) || coalesce(' ' || nullif(left(split_part(p.nome, ' ', 2), 1), '') || '.', ''),
          p.avatar_url, case when p_lado in ('heroes','monsters') then p_lado end, t);
  update perfis set lado_atual = case when p_lado in ('heroes','monsters') then p_lado else lado_atual end where id = auth.uid();
end $$;
-- chat ao vivo: o Supabase avisa o jogo quando chega mensagem nova
do $$ begin
  alter publication supabase_realtime add table public.mensagens;
exception when duplicate_object then null; end $$;

-- ---------- RANKING (agora com o id, para o botão "adicionar amigo") ----------
drop function if exists public.ranking(text, text, integer);
create or replace function public.ranking(p_periodo text, p_tipo text, p_limite integer default 100)
returns table (posicao bigint, id uuid, nome text, avatar_url text, valor bigint, trofeus integer, eu boolean)
language sql stable security definer set search_path = public as $$
  with inicio as (
    select (date_trunc(case p_periodo when 'dia' then 'day' when 'semana' then 'week' else 'month' end,
                       now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo') as t
  ),
  soma as (
    select pa.jogador, case when p_tipo = 'trofeus' then sum(pa.trofeus) else count(*) filter (where pa.venceu) end as valor
      from partidas pa, inicio where pa.criado_em >= inicio.t group by pa.jogador
  ),
  lista as (
    select row_number() over (order by s.valor desc, pe.trofeus desc, pe.criado_em) as posicao,
           pe.id, pe.nome, pe.avatar_url, s.valor::bigint as valor, pe.trofeus
      from soma s join perfis pe on pe.id = s.jogador where s.valor > 0
  )
  select l.posicao, l.id,
         split_part(l.nome, ' ', 1) || coalesce(' ' || nullif(left(split_part(l.nome, ' ', 2), 1), '') || '.', ''),
         l.avatar_url, l.valor, l.trofeus, (l.id = auth.uid())
    from lista l
   where l.posicao <= greatest(1, least(coalesce(p_limite, 100), 200)) or l.id = auth.uid()
   order by l.posicao;
$$;

-- ---------- permissões ----------
revoke all on function public.subir_nivel(text), public.marcar_lado(text), public.ganhar_moedas_campanha(integer, text),
  public.usar_convite(text), public.pedir_amizade(uuid), public.responder_amizade(uuid, boolean), public.remover_amigo(uuid),
  public.meus_amigos(), public.enviar_mensagem(text, text), public.meu_perfil() from public, anon;
grant execute on function public.subir_nivel(text), public.marcar_lado(text), public.ganhar_moedas_campanha(integer, text),
  public.usar_convite(text), public.pedir_amizade(uuid), public.responder_amizade(uuid, boolean), public.remover_amigo(uuid),
  public.meus_amigos(), public.enviar_mensagem(text, text), public.meu_perfil() to authenticated;
grant execute on function public.ranking(text, text, integer), public.lado_em_alta(), public.custo_nivel(integer) to anon, authenticated;
