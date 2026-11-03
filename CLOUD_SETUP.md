# Turning on cloud saves and the Ranked Raid leaderboard

The game works fully offline. These steps add:
- **Cloud save:** a transfer code to move progress between devices.
- **Online leaderboard:** for the weekly Ranked Raid.

It uses Supabase, which has a free tier.

1. Create a free account at https://supabase.com and make a new project.
2. In the project, open **SQL Editor**, paste this and press **Run**:

```sql
create table saves (
  id text primary key,
  name text,
  data jsonb not null,
  updated_at timestamptz default now()
);

create table raid_scores (
  week text not null,
  player_id text not null,
  name text,
  score integer not null,
  primary key (week, player_id)
);

alter table saves enable row level security;
alter table raid_scores enable row level security;

-- Anyone can read the leaderboard and post their own score.
create policy "read scores" on raid_scores for select using (true);
create policy "post scores" on raid_scores for insert with check (score between 0 and 5000000);
create policy "update scores" on raid_scores for update using (true);

-- Saves have no table policies at all: nobody can list them. A save is
-- written and read only by its exact transfer code, through these functions.
create function put_save(code text, player text, payload jsonb) returns void
  language sql security definer set search_path = public
  as $$ insert into saves (id, name, data, updated_at) values (code, player, payload, now())
        on conflict (id) do update set name = excluded.name, data = excluded.data, updated_at = now() $$;

create function get_save(code text) returns jsonb
  language sql security definer set search_path = public
  as $$ select data from saves where id = code $$;

grant execute on function put_save(text, text, jsonb) to anon;
grant execute on function get_save(text) to anon;
```

3. Open **Project Settings → API**. Copy the **Project URL** and the **anon public** key.
4. Open `js/cloud.js` and fill them in:

```js
const CLOUD = {
  url: 'https://YOUR-PROJECT.supabase.co',
  anonKey: 'YOUR-ANON-KEY',
};
```

That's it. In the game:
- **Settings → Cloud save** now works.
- **Live → Ranked Raid** shows the online leaderboard.

**Know the limits.** This is a simple setup for a free fan game:
- The transfer code works like a password.
- A determined person could post a fake leaderboard score.

Proper accounts with email login would need Supabase Auth, which can be added later.
