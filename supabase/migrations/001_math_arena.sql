create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[0-9]{6}$'),
  status text not null default 'waiting' check (status in ('waiting','playing','paused','finished')),
  current_game text not null default 'tug-of-war' check (current_game in ('tug-of-war','racing','boss-battle','bomb-defuse')),
  current_round integer not null default 0 check (current_round >= 0),
  game_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 24),
  grade_level integer not null check (grade_level between 1 and 12),
  side text not null check (side in ('A','B')),
  is_connected boolean not null default true,
  joined_at timestamptz not null default now(),
  unique (room_id, side)
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  grade_level integer not null check (grade_level between 1 and 12),
  subject text not null default 'mathematics',
  domain text,
  topic text not null,
  subtopic text,
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  question_type text not null default 'multiple-choice' check (question_type in ('multiple-choice','true-false','short-answer')),
  question_text text not null,
  question_image_url text,
  options jsonb,
  correct_answer text not null,
  explanation text,
  estimated_time_seconds integer not null default 60 check (estimated_time_seconds between 10 and 300),
  power_value integer not null check (power_value between 1 and 3),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  game_mode text not null check (game_mode in ('tug-of-war','racing','boss-battle','bomb-defuse')),
  round_number integer not null check (round_number > 0),
  submitted_answer text,
  is_correct boolean not null,
  response_time_ms integer not null check (response_time_ms >= 0),
  power_awarded integer not null default 0 check (power_awarded between 0 and 3),
  created_at timestamptz not null default now()
);

create index if not exists idx_players_room_id on public.players(room_id);
create index if not exists idx_questions_grade_topic on public.questions(grade_level, topic, difficulty) where is_active = true;
create index if not exists idx_answers_room_player on public.answers(room_id, player_id);

alter table public.rooms enable row level security;
alter table public.players enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;

-- Intentionally no permissive anon/authenticated policies yet.
-- The next milestone will add a secure room/session model before exposing rows
-- through the Data API. This prevents answer keys in public.questions from being
-- readable directly by a player client.
