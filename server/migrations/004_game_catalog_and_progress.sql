-- Definitions are shared; every saved game's state is owned by one account.
CREATE TABLE game_catalog (id integer PRIMARY KEY CHECK(id=1), version bigint NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE game_resources (id text PRIMARY KEY, name text NOT NULL, sale_price numeric NOT NULL CHECK(sale_price>=0), position integer NOT NULL);
CREATE TABLE game_research (id text PRIMARY KEY, name text NOT NULL, category text NOT NULL CHECK(category IN ('Agriculture','Programmation','Technologie')), gold_cost numeric NOT NULL DEFAULT 0 CHECK(gold_cost>=0), detail text NOT NULL, local_only boolean NOT NULL DEFAULT false, position integer NOT NULL);
CREATE TABLE game_research_costs (research_id text NOT NULL REFERENCES game_research(id) ON DELETE CASCADE, resource_id text NOT NULL REFERENCES game_resources(id), amount numeric NOT NULL CHECK(amount>=0), PRIMARY KEY(research_id,resource_id));
CREATE TABLE game_research_links (research_id text NOT NULL REFERENCES game_research(id) ON DELETE CASCADE, prerequisite_id text NOT NULL REFERENCES game_research(id), PRIMARY KEY(research_id,prerequisite_id), CHECK(research_id<>prerequisite_id));
CREATE TABLE game_research_groups (id text PRIMARY KEY, title text NOT NULL, initial_level integer NOT NULL CHECK(initial_level>=0), position integer NOT NULL);
CREATE TABLE game_research_steps (group_id text NOT NULL REFERENCES game_research_groups(id) ON DELETE CASCADE, research_id text NOT NULL REFERENCES game_research(id), position integer NOT NULL, PRIMARY KEY(group_id,position), UNIQUE(research_id));
CREATE TABLE game_chapters (position integer PRIMARY KEY, title text NOT NULL, subtitle text NOT NULL, skill text NOT NULL);
CREATE TABLE game_missions (
 campaign text NOT NULL CHECK(campaign IN ('legacy','assets','modern')), id text NOT NULL, position integer NOT NULL,
 chapter integer NOT NULL REFERENCES game_chapters(position), title text NOT NULL, description text NOT NULL,
 target numeric NOT NULL CHECK(target>0), reward numeric NOT NULL CHECK(reward>=0), gold numeric NOT NULL CHECK(gold>=0), xp numeric NOT NULL CHECK(xp>=0),
 condition jsonb NOT NULL CHECK(jsonb_typeof(condition)='object'), hint text NOT NULL, code text, destination text NOT NULL, action text NOT NULL,
 PRIMARY KEY(campaign,id), UNIQUE(campaign,position)
);
-- Structured parameters for other domains; no executable code or model binaries.
CREATE TABLE game_definitions (section text NOT NULL, id text NOT NULL, position integer NOT NULL, data jsonb NOT NULL, PRIMARY KEY(section,id));
CREATE FUNCTION game_catalog_changed() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN UPDATE game_catalog SET version=version+1,updated_at=now() WHERE id=1; RETURN NULL; END $$;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['game_resources','game_research','game_research_costs','game_research_links','game_research_groups','game_research_steps','game_chapters','game_missions','game_definitions'] LOOP EXECUTE format('CREATE TRIGGER catalog_changed AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH STATEMENT EXECUTE FUNCTION game_catalog_changed()',t); END LOOP; END $$;

CREATE TABLE game_saved_games (
 player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE, save_key text NOT NULL,
 revision integer NOT NULL, core jsonb NOT NULL, included_keys text[] NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(player_id,save_key)
);
CREATE TABLE game_saved_research (player_id uuid NOT NULL, save_key text NOT NULL, position integer NOT NULL, data jsonb NOT NULL, research_id text GENERATED ALWAYS AS(data #>> '{}') STORED, PRIMARY KEY(player_id,save_key,position), FOREIGN KEY(player_id,save_key) REFERENCES game_saved_games ON DELETE CASCADE);
CREATE INDEX game_saved_research_lookup ON game_saved_research(research_id);
CREATE TABLE game_saved_claims (player_id uuid NOT NULL, save_key text NOT NULL, position integer NOT NULL, data jsonb NOT NULL, mission_id text GENERATED ALWAYS AS(data #>> '{}') STORED, PRIMARY KEY(player_id,save_key,position), FOREIGN KEY(player_id,save_key) REFERENCES game_saved_games ON DELETE CASCADE);
CREATE TABLE game_saved_resources (player_id uuid NOT NULL, save_key text NOT NULL, resource_id text NOT NULL, amount numeric NOT NULL CHECK(amount>=0), PRIMARY KEY(player_id,save_key,resource_id), FOREIGN KEY(player_id,save_key) REFERENCES game_saved_games ON DELETE CASCADE);
CREATE TABLE game_saved_tiles (player_id uuid NOT NULL, save_key text NOT NULL, position integer NOT NULL, data jsonb NOT NULL, entity text GENERATED ALWAYS AS(data->>'entity') STORED, ground text GENERATED ALWAYS AS(data->>'ground') STORED, PRIMARY KEY(player_id,save_key,position), FOREIGN KEY(player_id,save_key) REFERENCES game_saved_games ON DELETE CASCADE);
CREATE TABLE game_saved_robots (player_id uuid NOT NULL, save_key text NOT NULL, position integer NOT NULL, data jsonb NOT NULL, robot_id text GENERATED ALWAYS AS(data->>'id') STORED, model text GENERATED ALWAYS AS(data->>'model') STORED, PRIMARY KEY(player_id,save_key,position), FOREIGN KEY(player_id,save_key) REFERENCES game_saved_games ON DELETE CASCADE);
CREATE TABLE game_saved_buildings (player_id uuid NOT NULL, save_key text NOT NULL, location text NOT NULL CHECK(location IN ('placed','inventory')), position integer NOT NULL, data jsonb NOT NULL, building_id text GENERATED ALWAYS AS(data->>'id') STORED, kind text GENERATED ALWAYS AS(data->>'kind') STORED, PRIMARY KEY(player_id,save_key,location,position), FOREIGN KEY(player_id,save_key) REFERENCES game_saved_games ON DELETE CASCADE);

CREATE FUNCTION game_project_save(owner uuid, key text, state jsonb, rev integer) RETURNS void LANGUAGE plpgsql AS $$
DECLARE field text;
BEGIN
 INSERT INTO game_saved_games(player_id,save_key,revision,core,included_keys)
 VALUES(owner,key,rev,state-ARRAY['resources','unlocks','claimed','tiles','robots','buildings','storedBuildings'],ARRAY(SELECT k FROM jsonb_object_keys(state) k WHERE k=ANY(ARRAY['resources','unlocks','claimed','tiles','robots','buildings','storedBuildings'])))
 ON CONFLICT(player_id,save_key) DO UPDATE SET revision=excluded.revision,core=excluded.core,included_keys=excluded.included_keys,updated_at=now();
 DELETE FROM game_saved_research WHERE player_id=owner AND save_key=key;
 DELETE FROM game_saved_claims WHERE player_id=owner AND save_key=key;
 DELETE FROM game_saved_resources WHERE player_id=owner AND save_key=key;
 DELETE FROM game_saved_tiles WHERE player_id=owner AND save_key=key;
 DELETE FROM game_saved_robots WHERE player_id=owner AND save_key=key;
 DELETE FROM game_saved_buildings WHERE player_id=owner AND save_key=key;
 INSERT INTO game_saved_research SELECT owner,key,ordinality-1,value FROM jsonb_array_elements(COALESCE(state->'unlocks','[]')) WITH ORDINALITY;
 INSERT INTO game_saved_claims SELECT owner,key,ordinality-1,value FROM jsonb_array_elements(COALESCE(state->'claimed','[]')) WITH ORDINALITY;
 INSERT INTO game_saved_resources SELECT owner,key,k,v::text::numeric FROM jsonb_each(COALESCE(state->'resources','{}')) AS e(k,v);
 INSERT INTO game_saved_tiles SELECT owner,key,ordinality-1,value FROM jsonb_array_elements(COALESCE(state->'tiles','[]')) WITH ORDINALITY;
 INSERT INTO game_saved_robots SELECT owner,key,ordinality-1,value FROM jsonb_array_elements(COALESCE(state->'robots','[]')) WITH ORDINALITY;
 INSERT INTO game_saved_buildings SELECT owner,key,'placed',ordinality-1,value FROM jsonb_array_elements(COALESCE(state->'buildings','[]')) WITH ORDINALITY;
 INSERT INTO game_saved_buildings SELECT owner,key,'inventory',ordinality-1,value FROM jsonb_array_elements(COALESCE(state->'storedBuildings','[]')) WITH ORDINALITY;
END $$;
CREATE FUNCTION game_restore_save(owner uuid, key text) RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE root game_saved_games%ROWTYPE; result jsonb;
BEGIN
 SELECT * INTO root FROM game_saved_games WHERE player_id=owner AND save_key=key;
 IF NOT FOUND THEN RETURN NULL; END IF;
 result:=root.core;
 IF 'resources'=ANY(root.included_keys) THEN result:=result||jsonb_build_object('resources',COALESCE((SELECT jsonb_object_agg(resource_id,amount) FROM game_saved_resources WHERE player_id=owner AND save_key=key),'{}')); END IF;
 IF 'unlocks'=ANY(root.included_keys) THEN result:=result||jsonb_build_object('unlocks',COALESCE((SELECT jsonb_agg(data ORDER BY position) FROM game_saved_research WHERE player_id=owner AND save_key=key),'[]')); END IF;
 IF 'claimed'=ANY(root.included_keys) THEN result:=result||jsonb_build_object('claimed',COALESCE((SELECT jsonb_agg(data ORDER BY position) FROM game_saved_claims WHERE player_id=owner AND save_key=key),'[]')); END IF;
 IF 'tiles'=ANY(root.included_keys) THEN result:=result||jsonb_build_object('tiles',COALESCE((SELECT jsonb_agg(data ORDER BY position) FROM game_saved_tiles WHERE player_id=owner AND save_key=key),'[]')); END IF;
 IF 'robots'=ANY(root.included_keys) THEN result:=result||jsonb_build_object('robots',COALESCE((SELECT jsonb_agg(data ORDER BY position) FROM game_saved_robots WHERE player_id=owner AND save_key=key),'[]')); END IF;
 IF 'buildings'=ANY(root.included_keys) THEN result:=result||jsonb_build_object('buildings',COALESCE((SELECT jsonb_agg(data ORDER BY position) FROM game_saved_buildings WHERE player_id=owner AND save_key=key AND location='placed'),'[]')); END IF;
 IF 'storedBuildings'=ANY(root.included_keys) THEN result:=result||jsonb_build_object('storedBuildings',COALESCE((SELECT jsonb_agg(data ORDER BY position) FROM game_saved_buildings WHERE player_id=owner AND save_key=key AND location='inventory'),'[]')); END IF;
 RETURN result;
END $$;
CREATE FUNCTION game_save_changed() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE key text; owner uuid;
BEGIN
 IF TG_OP='DELETE' THEN owner:=OLD.player_id; ELSE owner:=NEW.player_id; END IF;
 IF TG_TABLE_NAME='farm_saves' THEN key:='active'; ELSIF TG_OP='DELETE' THEN key:=OLD.id::text; ELSE key:=NEW.id::text; END IF;
 IF TG_OP='DELETE' THEN DELETE FROM game_saved_games WHERE player_id=owner AND save_key=key;
 ELSIF TG_TABLE_NAME='farm_saves' THEN PERFORM game_project_save(owner,key,NEW.state,NEW.revision);
 ELSE PERFORM game_project_save(owner,key,NEW.state,1); END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER normalize_save AFTER INSERT OR UPDATE OR DELETE ON farm_saves FOR EACH ROW EXECUTE FUNCTION game_save_changed();
CREATE TRIGGER normalize_slot AFTER INSERT OR UPDATE OR DELETE ON farm_slots FOR EACH ROW EXECUTE FUNCTION game_save_changed();
SELECT game_project_save(player_id,'active',state,revision) FROM farm_saves;
SELECT game_project_save(player_id,id::text,state,1) FROM farm_slots;

CREATE VIEW game_inventory_balances AS
 SELECT player_id,save_key,'farm'::text AS owner,'resources'::text AS compartment,resource_id,amount FROM game_saved_resources
 UNION ALL SELECT player_id,save_key,'farm','legacy-stock','Wheat',COALESCE((core->>'stock')::numeric,0) FROM game_saved_games
 UNION ALL SELECT r.player_id,r.save_key,r.robot_id,'inventory',e.key,(e.value::text)::numeric FROM game_saved_robots r CROSS JOIN LATERAL jsonb_each(COALESCE(r.data->'inventory','{}')) e
 UNION ALL SELECT b.player_id,b.save_key,b.building_id,compartment,e.key,(e.value::text)::numeric FROM game_saved_buildings b CROSS JOIN (VALUES('inventory'),('input'),('output')) c(compartment) CROSS JOIN LATERAL jsonb_each(COALESCE(b.data->compartment,'{}')) e;
CREATE VIEW game_equipment_levels AS
 SELECT r.player_id,r.save_key,r.robot_id AS asset_id,'robot'::text AS asset_type,e.key AS equipment_id,(e.value::text)::integer AS level FROM game_saved_robots r CROSS JOIN LATERAL jsonb_each(COALESCE(r.data->'equipment','{}')) e
 UNION ALL SELECT b.player_id,b.save_key,b.building_id,'building',e.key,(e.value::text)::integer FROM game_saved_buildings b CROSS JOIN LATERAL jsonb_each(COALESCE(b.data->'upgrades','{}')) e;
CREATE FUNCTION game_mission_value(rule jsonb, state jsonb) RETURNS numeric LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE v jsonb; f jsonb; item jsonb; result numeric:=0; matched boolean; numeric_value numeric;
BEGIN
 CASE rule->>'type'
 WHEN 'counter' THEN v:=state #> string_to_array(rule->>'path','.'); RETURN CASE WHEN jsonb_typeof(v)='number' THEN v::text::numeric ELSE 0 END;
 WHEN 'length' THEN v:=state #> string_to_array(rule->>'path','.'); RETURN CASE WHEN jsonb_typeof(v)='array' THEN jsonb_array_length(v) ELSE 0 END;
 WHEN 'research' THEN FOR v IN SELECT value FROM jsonb_array_elements(rule->'ids') LOOP IF COALESCE(state->'unlocks','[]') @> jsonb_build_array(v) THEN result:=result+1; END IF; END LOOP; RETURN result;
 WHEN 'sum' THEN FOR v IN SELECT value FROM jsonb_array_elements(rule->'rules') LOOP result:=result+game_mission_value(v,state); END LOOP; RETURN result;
 WHEN 'cap' THEN RETURN LEAST((rule->>'max')::numeric,game_mission_value(rule->'rule',state));
 WHEN 'count' THEN
  FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(state->(rule->>'collection'),'[]')) LOOP
   matched:=true;
   FOR f IN SELECT value FROM jsonb_array_elements(rule->'filters') LOOP
    v:=COALESCE(NULLIF(item #> string_to_array(f->>'path','.'),'null'::jsonb),f->'fallback');
    IF f->>'op'='eq' THEN matched:=matched AND COALESCE(v=f->'value',false);
    ELSE matched:=matched AND CASE WHEN jsonb_typeof(v)='number' AND jsonb_typeof(f->'value')='number' THEN v::text::numeric >= (f->>'value')::numeric ELSE false END; END IF;
   END LOOP;
   IF matched THEN result:=result+1; END IF;
  END LOOP; RETURN result;
 ELSE RETURN 0;
 END CASE;
END $$;
CREATE VIEW game_mission_progress AS
 SELECT g.player_id,g.save_key,m.campaign,m.id AS mission_id,m.title,m.chapter,m.position,m.target,
 game_mission_value(m.condition,game_restore_save(g.player_id,g.save_key)) AS progress,
 EXISTS(SELECT 1 FROM game_saved_claims c WHERE c.player_id=g.player_id AND c.save_key=g.save_key AND c.mission_id=m.id) AS claimed
 FROM game_saved_games g JOIN game_missions m ON m.campaign=CASE WHEN g.core->>'progressionVersion'='2' THEN 'modern' WHEN g.core->>'assetProgression'='1' THEN 'assets' ELSE 'legacy' END;
