-- 핏코치 기기 간 동기화용 Supabase 스키마
-- Supabase 대시보드 → 왼쪽 메뉴 "SQL Editor" → "New query" 에 아래 전체를 붙여넣고 [Run].
-- (계정마다 자기 데이터만 읽고 쓰도록 Row Level Security 로 보호합니다.)

create table if not exists public.app_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

-- 본인 행만 SELECT
drop policy if exists "own row select" on public.app_state;
create policy "own row select" on public.app_state
  for select using (auth.uid() = user_id);

-- 본인 행만 INSERT
drop policy if exists "own row insert" on public.app_state;
create policy "own row insert" on public.app_state
  for insert with check (auth.uid() = user_id);

-- 본인 행만 UPDATE
drop policy if exists "own row update" on public.app_state;
create policy "own row update" on public.app_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
