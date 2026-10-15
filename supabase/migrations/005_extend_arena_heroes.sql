alter table public.arena_players
  drop constraint if exists arena_players_character_id_check;

alter table public.arena_players
  add constraint arena_players_character_id_check
  check (character_id in ('nova', 'lyra', 'kael', 'mira'));

comment on column public.arena_players.character_id
  is 'Selectable LevelUP Arena hero skin id (nova, lyra, kael, or mira).';
