-- =====================================================================
-- Heroes vs Monsters Battlefront — RESULTADO DO PvP SEM ESPERAR O OUTRO
-- O primeiro aparelho que termina já grava o resultado para os DOIS jogadores.
-- (Se depois o outro mandar um resultado diferente, a sala fica marcada como "divergente" para conferir.)
-- Quem sai no meio perde: o que ficou manda "vitória por W.O.".
-- Como usar: Supabase > SQL Editor > New query > cole TUDO > Run. (depois do 4_pvp.sql)
-- =====================================================================
alter table public.partidas_pvp add column if not exists divergente boolean not null default false;

create or replace function public.finalizar_pvp(p_sala uuid, p_vencedor text, p_resumo text) returns json
language plpgsql security definer set search_path = public as $$
declare s public.partidas_pvp; v text := coalesce(p_vencedor, 'empate'); eu text;
begin
  if auth.uid() is null then raise exception 'precisa entrar'; end if;
  if v not in ('heroes','monsters','empate') then raise exception 'resultado inválido'; end if;
  select * into s from partidas_pvp where id = p_sala for update;
  if s.id is null then raise exception 'sala não encontrada'; end if;
  if auth.uid() = s.heroes then eu := 'heroes'; elsif auth.uid() = s.monsters then eu := 'monsters';
  else raise exception 'você não está nesta partida'; end if;

  if eu = 'heroes' then update partidas_pvp set rel_heroes = v, resumo_heroes = p_resumo where id = s.id;
  else update partidas_pvp set rel_monsters = v, resumo_monsters = p_resumo where id = s.id; end if;

  if not s.finalizada then
    -- primeiro a chegar: grava para os dois na hora
    perform aplicar_resultado_pvp(s.heroes,   case v when 'heroes' then 'vitoria' when 'monsters' then 'derrota' else 'empate' end, 'heroes');
    perform aplicar_resultado_pvp(s.monsters, case v when 'monsters' then 'vitoria' when 'heroes' then 'derrota' else 'empate' end, 'monsters');
    update partidas_pvp set vencedor = v, finalizada = true where id = s.id;
  elsif s.vencedor is distinct from v and p_resumo <> 'wo' then
    update partidas_pvp set divergente = true where id = s.id;   -- os dois viram coisas diferentes: fica marcado para conferir
  end if;
  select * into s from partidas_pvp where id = p_sala;
  return sala_json(s);
end $$;
grant execute on function public.finalizar_pvp(uuid, text, text) to authenticated;
notify pgrst, 'reload schema';
