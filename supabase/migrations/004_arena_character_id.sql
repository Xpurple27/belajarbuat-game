alter table public.arena_players
  add column if not exists character_id text not null default 'nova';

alter table public.arena_players
  drop constraint if exists arena_players_character_id_check;

alter table public.arena_players
  add constraint arena_players_character_id_check
  check (character_id in ('nova', 'lyra'));

create index if not exists arena_players_room_character_idx
  on public.arena_players(room_id, character_id);

comment on column public.arena_players.character_id
  is 'Selectable LevelUP Arena hero skin id (nova or lyra).';
