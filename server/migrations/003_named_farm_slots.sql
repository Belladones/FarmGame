CREATE TABLE farm_slots (
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  state jsonb NOT NULL CHECK (jsonb_typeof(state) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, id)
);
