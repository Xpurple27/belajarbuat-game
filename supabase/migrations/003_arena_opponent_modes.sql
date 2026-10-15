alter table public.arena_rooms
  add column if not exists opponent_mode text not null default 'multiplayer'
    check (opponent_mode in ('multiplayer','ai')),
  add column if not exists ai_difficulty text not null default 'medium'
    check (ai_difficulty in ('easy','medium','hard'));

alter table public.arena_players
  add column if not exists player_type text not null default 'human'
    check (player_type in ('human','ai')),
  add column if not exists is_host_player boolean not null default false;

create index if not exists idx_arena_players_room_type
  on public.arena_players(room_id, player_type);

comment on column public.arena_rooms.opponent_mode is 'multiplayer = two human player slots, ai = one human slot plus CPU opponent';
comment on column public.arena_rooms.ai_difficulty is 'CPU skill profile used when opponent_mode = ai';
comment on column public.arena_players.player_type is 'human or server-simulated AI';
comment on column public.arena_players.is_host_player is 'true when the room host also occupies a player slot';
