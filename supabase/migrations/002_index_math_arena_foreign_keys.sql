create index if not exists idx_arena_answers_player_id
  on public.arena_answers(player_id);

create index if not exists idx_arena_answers_question_id
  on public.arena_answers(question_id);

create index if not exists idx_arena_round_assignments_player_id
  on public.arena_round_assignments(player_id);

create index if not exists idx_arena_round_assignments_question_id
  on public.arena_round_assignments(question_id);
