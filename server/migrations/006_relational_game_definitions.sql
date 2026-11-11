-- Convert the live catalogue, including user edits, before retiring the JSON table.
-- Never reset it from bootstrap.json during this migration.
DO $$
DECLARE row record; allowed text[]; field text;
BEGIN
 FOR row IN SELECT * FROM game_definitions LOOP
  allowed:=CASE row.section
   WHEN 'models' THEN ARRAY['name','price','speed','capacity','research','medium','description']
   WHEN 'buildings' THEN ARRAY['name','price','research','description']
   WHEN 'recipes' THEN ARRAY['input','output','duration']
   WHEN 'crops' THEN ARRAY['resource','seconds','soil','cost','unlock','yields']
   WHEN 'robotEquipment' THEN ARRAY['id','name','initial','max','materials','gold','research','models','detail']
   WHEN 'buildingUpgrades' THEN ARRAY['id','name','initial','max','materials','gold','research','kinds','detail']
   WHEN 'tradeOrders' THEN ARRAY['id','name','item','quantity','payment','unlock']
   WHEN 'cosmetics' THEN ARRAY['id','kind','name','missions','color','accent','rarity','legendary','description']
   WHEN 'settings' THEN ARRAY[]::text[]
   ELSE NULL END;
  IF allowed IS NULL THEN RAISE EXCEPTION 'Unsupported catalogue section: %',row.section; END IF;
  IF row.section='settings' THEN
   IF row.id NOT IN ('storageCapacities','constructionSlots','ranks','thresholds') THEN RAISE EXCEPTION 'Unsupported catalogue setting: %',row.id; END IF;
  ELSE
   FOR field IN SELECT jsonb_object_keys(row.data) LOOP
    IF NOT field=ANY(allowed) THEN RAISE EXCEPTION 'Unsupported field in %.%: %',row.section,row.id,field; END IF;
   END LOOP;
  END IF;
 END LOOP;
 IF (SELECT count(*) FROM game_definitions WHERE section='settings' AND id IN ('ranks','thresholds'))=1
 OR (SELECT jsonb_array_length(data) FROM game_definitions WHERE section='settings' AND id='ranks') IS DISTINCT FROM
    (SELECT jsonb_array_length(data) FROM game_definitions WHERE section='settings' AND id='thresholds')
 THEN RAISE EXCEPTION 'Career ranks and XP thresholds must have the same length'; END IF;
END $$;

CREATE TABLE game_robot_models (
 id text PRIMARY KEY, name text NOT NULL, price numeric NOT NULL CHECK(price>=0),
 speed numeric NOT NULL CHECK(speed>0), capacity numeric NOT NULL CHECK(capacity>=0),
 research_id text NOT NULL REFERENCES game_research(id), medium text NOT NULL CHECK(medium IN ('ground','air')),
 description text NOT NULL, position integer NOT NULL
);
CREATE TABLE game_building_types (
 id text PRIMARY KEY, name text NOT NULL, price numeric NOT NULL CHECK(price>=0),
 research_id text NOT NULL REFERENCES game_research(id), description text NOT NULL, position integer NOT NULL
);
CREATE TABLE game_crop_types (
 id text PRIMARY KEY, resource_id text NOT NULL REFERENCES game_resources(id), growth_seconds numeric NOT NULL CHECK(growth_seconds>0),
 required_soil text NOT NULL CHECK(required_soil IN ('Any','Soil','Grassland')), unlock_research_id text REFERENCES game_research(id), position integer NOT NULL
);
CREATE TABLE game_crop_costs (
 crop_id text NOT NULL REFERENCES game_crop_types(id) ON DELETE CASCADE, resource_id text NOT NULL REFERENCES game_resources(id),
 amount numeric NOT NULL CHECK(amount>=0), PRIMARY KEY(crop_id,resource_id)
);
CREATE TABLE game_crop_yields (
 crop_id text NOT NULL REFERENCES game_crop_types(id) ON DELETE CASCADE, level integer NOT NULL CHECK(level>=1),
 amount numeric NOT NULL CHECK(amount>=0), PRIMARY KEY(crop_id,level)
);
CREATE TABLE game_recipes (
 building_type_id text PRIMARY KEY REFERENCES game_building_types(id) ON DELETE CASCADE, duration_seconds numeric NOT NULL CHECK(duration_seconds>0), position integer NOT NULL
);
CREATE TABLE game_recipe_inputs (
 building_type_id text NOT NULL REFERENCES game_recipes(building_type_id) ON DELETE CASCADE, resource_id text NOT NULL REFERENCES game_resources(id),
 amount numeric NOT NULL CHECK(amount>=0), PRIMARY KEY(building_type_id,resource_id)
);
CREATE TABLE game_recipe_outputs (
 building_type_id text NOT NULL REFERENCES game_recipes(building_type_id) ON DELETE CASCADE, resource_id text NOT NULL REFERENCES game_resources(id),
 amount numeric NOT NULL CHECK(amount>=0), PRIMARY KEY(building_type_id,resource_id)
);
CREATE TABLE game_robot_equipment (
 id text PRIMARY KEY, equipment_key text NOT NULL, name text NOT NULL,
 initial_level integer NOT NULL CHECK(initial_level>=0), max_level integer NOT NULL CHECK(max_level>=initial_level),
 gold_cost numeric CHECK(gold_cost>=0), research_id text REFERENCES game_research(id), detail text NOT NULL, position integer NOT NULL
);
CREATE TABLE game_robot_equipment_costs (
 equipment_id text NOT NULL REFERENCES game_robot_equipment(id) ON DELETE CASCADE, resource_id text NOT NULL REFERENCES game_resources(id),
 amount numeric NOT NULL CHECK(amount>=0), PRIMARY KEY(equipment_id,resource_id)
);
CREATE TABLE game_robot_equipment_models (
 equipment_id text NOT NULL REFERENCES game_robot_equipment(id) ON DELETE CASCADE, model_id text NOT NULL REFERENCES game_robot_models(id),
 position integer NOT NULL, PRIMARY KEY(equipment_id,position), UNIQUE(equipment_id,model_id)
);
CREATE TABLE game_building_upgrades (
 id text PRIMARY KEY, equipment_key text NOT NULL, name text NOT NULL,
 initial_level integer NOT NULL CHECK(initial_level>=0), max_level integer NOT NULL CHECK(max_level>=initial_level),
 gold_cost numeric CHECK(gold_cost>=0), research_id text REFERENCES game_research(id), detail text NOT NULL, position integer NOT NULL
);
CREATE TABLE game_building_upgrade_costs (
 equipment_id text NOT NULL REFERENCES game_building_upgrades(id) ON DELETE CASCADE, resource_id text NOT NULL REFERENCES game_resources(id),
 amount numeric NOT NULL CHECK(amount>=0), PRIMARY KEY(equipment_id,resource_id)
);
CREATE TABLE game_building_upgrade_types (
 equipment_id text NOT NULL REFERENCES game_building_upgrades(id) ON DELETE CASCADE, building_type_id text NOT NULL REFERENCES game_building_types(id),
 position integer NOT NULL, PRIMARY KEY(equipment_id,position), UNIQUE(equipment_id,building_type_id)
);
CREATE TABLE game_trade_orders (
 id text PRIMARY KEY, name text NOT NULL, resource_id text NOT NULL REFERENCES game_resources(id),
 quantity numeric NOT NULL CHECK(quantity>0), payment numeric NOT NULL CHECK(payment>=0), unlock_research_id text REFERENCES game_research(id), position integer NOT NULL
);
CREATE TABLE game_cosmetics (
 id text PRIMARY KEY, kind text NOT NULL CHECK(kind IN ('skin','lens','accessory')), name text NOT NULL,
 missions_required integer NOT NULL CHECK(missions_required>=0), color text, accent text, rarity text, legendary_style text,
 description text NOT NULL, position integer NOT NULL
);
CREATE TABLE game_storage_tiers (level integer PRIMARY KEY CHECK(level>=1), capacity numeric NOT NULL CHECK(capacity>0));
CREATE TABLE game_construction_slots (position integer PRIMARY KEY CHECK(position>=0), x integer NOT NULL, y integer NOT NULL);
CREATE TABLE game_career_ranks (level integer PRIMARY KEY CHECK(level>=1), title text NOT NULL, xp_threshold numeric NOT NULL CHECK(xp_threshold>=0));

INSERT INTO game_robot_models
 SELECT id,data->>'name',(data->>'price')::numeric,(data->>'speed')::numeric,(data->>'capacity')::numeric,data->>'research',data->>'medium',data->>'description',position FROM game_definitions WHERE section='models';
INSERT INTO game_building_types
 SELECT id,data->>'name',(data->>'price')::numeric,data->>'research',data->>'description',position FROM game_definitions WHERE section='buildings';
INSERT INTO game_crop_types
 SELECT id,data->>'resource',(data->>'seconds')::numeric,data->>'soil',data->>'unlock',position FROM game_definitions WHERE section='crops';
INSERT INTO game_crop_costs
 SELECT d.id,e.key,(e.value::text)::numeric FROM game_definitions d CROSS JOIN LATERAL jsonb_each(d.data->'cost') e WHERE d.section='crops';
INSERT INTO game_crop_yields
 SELECT d.id,e.ordinality,(e.value::text)::numeric FROM game_definitions d CROSS JOIN LATERAL jsonb_array_elements(d.data->'yields') WITH ORDINALITY e WHERE d.section='crops';
INSERT INTO game_recipes
 SELECT id,(data->>'duration')::numeric,position FROM game_definitions WHERE section='recipes';
INSERT INTO game_recipe_inputs
 SELECT d.id,e.key,(e.value::text)::numeric FROM game_definitions d CROSS JOIN LATERAL jsonb_each(d.data->'input') e WHERE d.section='recipes';
INSERT INTO game_recipe_outputs
 SELECT d.id,e.key,(e.value::text)::numeric FROM game_definitions d CROSS JOIN LATERAL jsonb_each(d.data->'output') e WHERE d.section='recipes';
INSERT INTO game_robot_equipment
 SELECT id,data->>'id',data->>'name',(data->>'initial')::integer,(data->>'max')::integer,(data->>'gold')::numeric,data->>'research',data->>'detail',position FROM game_definitions WHERE section='robotEquipment';
INSERT INTO game_robot_equipment_costs
 SELECT d.id,e.key,(e.value::text)::numeric FROM game_definitions d CROSS JOIN LATERAL jsonb_each(d.data->'materials') e WHERE d.section='robotEquipment';
INSERT INTO game_robot_equipment_models
 SELECT d.id,e.value,e.ordinality-1 FROM game_definitions d CROSS JOIN LATERAL jsonb_array_elements_text(d.data->'models') WITH ORDINALITY e WHERE d.section='robotEquipment';
INSERT INTO game_building_upgrades
 SELECT id,data->>'id',data->>'name',(data->>'initial')::integer,(data->>'max')::integer,(data->>'gold')::numeric,data->>'research',data->>'detail',position FROM game_definitions WHERE section='buildingUpgrades';
INSERT INTO game_building_upgrade_costs
 SELECT d.id,e.key,(e.value::text)::numeric FROM game_definitions d CROSS JOIN LATERAL jsonb_each(d.data->'materials') e WHERE d.section='buildingUpgrades';
INSERT INTO game_building_upgrade_types
 SELECT d.id,e.value,e.ordinality-1 FROM game_definitions d CROSS JOIN LATERAL jsonb_array_elements_text(d.data->'kinds') WITH ORDINALITY e WHERE d.section='buildingUpgrades';
INSERT INTO game_trade_orders
 SELECT data->>'id',data->>'name',data->>'item',(data->>'quantity')::numeric,(data->>'payment')::numeric,data->>'unlock',position FROM game_definitions WHERE section='tradeOrders';
INSERT INTO game_cosmetics
 SELECT data->>'id',data->>'kind',data->>'name',(data->>'missions')::integer,data->>'color',data->>'accent',data->>'rarity',data->>'legendary',data->>'description',position FROM game_definitions WHERE section='cosmetics';
INSERT INTO game_storage_tiers
 SELECT e.ordinality,(e.value::text)::numeric FROM game_definitions d CROSS JOIN LATERAL jsonb_array_elements(d.data) WITH ORDINALITY e WHERE d.section='settings' AND d.id='storageCapacities';
INSERT INTO game_construction_slots
 SELECT e.ordinality-1,(e.value->>'x')::integer,(e.value->>'y')::integer FROM game_definitions d CROSS JOIN LATERAL jsonb_array_elements(d.data) WITH ORDINALITY e WHERE d.section='settings' AND d.id='constructionSlots';
INSERT INTO game_career_ranks
 SELECT r.ordinality,r.value,(t.value::text)::numeric
 FROM game_definitions a CROSS JOIN game_definitions b
 CROSS JOIN LATERAL jsonb_array_elements_text(a.data) WITH ORDINALITY r
 JOIN LATERAL jsonb_array_elements(b.data) WITH ORDINALITY t ON t.ordinality=r.ordinality
 WHERE a.section='settings' AND a.id='ranks' AND b.section='settings' AND b.id='thresholds';

-- The API will now build its response from the typed tables only.
DROP TABLE game_definitions;
CREATE TRIGGER catalog_changed AFTER INSERT OR UPDATE OR DELETE ON game_robot_models FOR EACH STATEMENT EXECUTE FUNCTION game_catalog_changed();
CREATE TRIGGER catalog_changed AFTER INSERT OR UPDATE OR DELETE ON game_building_types FOR EACH STATEMENT EXECUTE FUNCTION game_catalog_changed();
CREATE TRIGGER catalog_changed AFTER INSERT OR UPDATE OR DELETE ON game_crop_types FOR EACH STATEMENT EXECUTE FUNCTION game_catalog_changed();
CREATE TRIGGER catalog_changed AFTER INSERT OR UPDATE OR DELETE ON game_crop_costs FOR EACH STATEMENT EXECUTE FUNCTION game_catalog_changed();
CREATE TRIGGER catalog_changed AFTER INSERT OR UPDATE OR DELETE ON game_crop_yields FOR EACH STATEMENT EXECUTE FUNCTION game_catalog_changed();
CREATE TRIGGER catalog_changed AFTER INSERT OR UPDATE OR DELETE ON game_recipes FOR EACH STATEMENT EXECUTE FUNCTION game_catalog_changed();
CREATE TRIGGER catalog_changed AFTER INSERT OR UPDATE OR DELETE ON game_recipe_inputs FOR EACH STATEMENT EXECUTE FUNCTION game_catalog_changed();
CREATE TRIGGER catalog_changed AFTER INSERT OR UPDATE OR DELETE ON game_recipe_outputs FOR EACH STATEMENT EXECUTE FUNCTION game_catalog_changed();
CREATE TRIGGER catalog_changed AFTER INSERT OR UPDATE OR DELETE ON game_robot_equipment FOR EACH STATEMENT EXECUTE FUNCTION game_catalog_changed();
CREATE TRIGGER catalog_changed AFTER INSERT OR UPDATE OR DELETE ON game_robot_equipment_costs FOR EACH STATEMENT EXECUTE FUNCTION game_catalog_changed();
CREATE TRIGGER catalog_changed AFTER INSERT OR UPDATE OR DELETE ON game_robot_equipment_models FOR EACH STATEMENT EXECUTE FUNCTION game_catalog_changed();
CREATE TRIGGER catalog_changed AFTER INSERT OR UPDATE OR DELETE ON game_building_upgrades FOR EACH STATEMENT EXECUTE FUNCTION game_catalog_changed();
CREATE TRIGGER catalog_changed AFTER INSERT OR UPDATE OR DELETE ON game_building_upgrade_costs FOR EACH STATEMENT EXECUTE FUNCTION game_catalog_changed();
CREATE TRIGGER catalog_changed AFTER INSERT OR UPDATE OR DELETE ON game_building_upgrade_types FOR EACH STATEMENT EXECUTE FUNCTION game_catalog_changed();
CREATE TRIGGER catalog_changed AFTER INSERT OR UPDATE OR DELETE ON game_trade_orders FOR EACH STATEMENT EXECUTE FUNCTION game_catalog_changed();
CREATE TRIGGER catalog_changed AFTER INSERT OR UPDATE OR DELETE ON game_cosmetics FOR EACH STATEMENT EXECUTE FUNCTION game_catalog_changed();
CREATE TRIGGER catalog_changed AFTER INSERT OR UPDATE OR DELETE ON game_storage_tiers FOR EACH STATEMENT EXECUTE FUNCTION game_catalog_changed();
CREATE TRIGGER catalog_changed AFTER INSERT OR UPDATE OR DELETE ON game_construction_slots FOR EACH STATEMENT EXECUTE FUNCTION game_catalog_changed();
CREATE TRIGGER catalog_changed AFTER INSERT OR UPDATE OR DELETE ON game_career_ranks FOR EACH STATEMENT EXECUTE FUNCTION game_catalog_changed();
UPDATE game_catalog SET version=version+1,updated_at=now() WHERE id=1;
