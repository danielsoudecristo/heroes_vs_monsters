-- =====================================================================
-- Heroes vs Monsters Battlefront — RANKING de verdade
-- Como usar: Supabase > SQL Editor > New query > cole TUDO > Run.
-- Pode rodar de novo sem problema.
-- =====================================================================
-- ranking(periodo, tipo): quem mais venceu (tipo 'vitorias') ou ganhou troféus (tipo 'trofeus')
-- hoje ('dia'), na semana desde segunda ('semana') ou no mês ('mes'), no horário de Brasília.
-- Mostra os primeiros (até 100) e SEMPRE a linha de quem está pedindo, mesmo se estiver em 500º.
-- Só aparece quem jogou no período. O nome sai curto (primeiro nome + inicial) por privacidade.
create or replace function public.ranking(p_periodo text, p_tipo text, p_limite integer default 100)
returns table (posicao bigint, nome text, avatar_url text, valor bigint, trofeus integer, eu boolean)
language sql stable security definer set search_path = public as $$
  with inicio as (
    select (date_trunc(case p_periodo when 'dia' then 'day' when 'semana' then 'week' else 'month' end,
                       now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo') as t
  ),
  soma as (
    select pa.jogador,
           case when p_tipo = 'trofeus' then sum(pa.trofeus)
                else count(*) filter (where pa.venceu) end as valor
      from partidas pa, inicio
     where pa.criado_em >= inicio.t
     group by pa.jogador
  ),
  lista as (
    select row_number() over (order by s.valor desc, pe.trofeus desc, pe.criado_em) as posicao,
           pe.id, pe.nome, pe.avatar_url, s.valor::bigint as valor, pe.trofeus
      from soma s join perfis pe on pe.id = s.jogador
     where s.valor > 0
  )
  select l.posicao,
         split_part(l.nome, ' ', 1) || coalesce(' ' || nullif(left(split_part(l.nome, ' ', 2), 1), '') || '.', ''),
         l.avatar_url, l.valor, l.trofeus, (l.id = auth.uid())
    from lista l
   where l.posicao <= greatest(1, least(coalesce(p_limite, 100), 200)) or l.id = auth.uid()
   order by l.posicao;
$$;

-- qualquer um pode VER o ranking (até quem joga como convidado)
grant execute on function public.ranking(text, text, integer) to anon, authenticated;
