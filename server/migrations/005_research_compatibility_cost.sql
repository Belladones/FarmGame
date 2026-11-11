-- Historical API metadata; actual purchase prices always use game_research_costs.
ALTER TABLE game_research ADD COLUMN compatibility_cost numeric NOT NULL DEFAULT 0 CHECK(compatibility_cost>=0);
UPDATE game_research r SET compatibility_cost=COALESCE((SELECT amount FROM game_research_costs c WHERE c.research_id=r.id AND resource_id='Wheat'),0);
UPDATE game_research r SET compatibility_cost=COALESCE((SELECT amount FROM game_research_costs c WHERE c.research_id=r.id AND resource_id='Hay'),0)
WHERE r.id IN ('tank','reservoir','fleet','land','motor','hold','tools');
