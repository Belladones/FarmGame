CREATE TABLE players (
  id uuid PRIMARY KEY,
  username text NOT NULL,
  username_key text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE player_sessions (
  id uuid PRIMARY KEY,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  token_hash bytea NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX player_sessions_expiry ON player_sessions(expires_at);
CREATE INDEX player_sessions_player ON player_sessions(player_id);
CREATE TABLE farm_saves (
  player_id uuid PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  schema_version integer NOT NULL DEFAULT 1,
  state jsonb NOT NULL CHECK (jsonb_typeof(state) = 'object'),
  revision integer NOT NULL CHECK (revision > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
