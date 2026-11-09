export const apiNames = [
  "plant",
  "harvest",
  "deposit",
  "load",
  "move",
  "can_harvest",
  "get_pos_x",
  "get_pos_y",
  "get_world_size",
  "get_inventory",
  "get_stock",
  "get_capacity",
  "print",
  "till",
  "watering",
  "use_item",
  "harvest_group",
  "refill_water",
  "get_entity_type",
  "get_ground_type",
  "get_water",
  "is_occupied",
  "reserve",
  "release",
  "deliver",
  "collect",
  "get_building_stock",
  "get_building_status",
  "sell",
  "get_gold",
];
export const declarations = `
declare enum Entities { Grass="Grass", Wheat="Wheat", Bush="Bush", Carrot="Carrot", Tree="Tree", Pumpkin="Pumpkin" }
declare enum Resources { Hay="Hay", Wheat="Wheat", Wood="Wood", Carrot="Carrot", Pumpkin="Pumpkin", Flour="Flour", Bread="Bread", Plank="Plank" }
declare enum Items { Hay="Hay", Fertilizer="Fertilizer" }
declare enum Grounds { Grassland="Grassland", Soil="Soil" }
declare enum Direction { North="North", East="East", South="South", West="West" }
declare function plant(entity:Entities):boolean;
declare function harvest():boolean;
declare function till():boolean;
declare function watering():boolean;
declare function use_item(item:Items):boolean;
declare function harvest_group():boolean;
declare function deposit():number;
declare function load(item:Resources|Items,quantity:number):number;
declare function move(direction:Direction):boolean;
declare function can_harvest():boolean;
declare function get_pos_x():number;
declare function get_pos_y():number;
declare function get_world_size():{width:number;height:number};
declare function get_inventory(item:Resources|Items):number;
declare function get_stock(item:Resources|Items):number;
declare function get_capacity():number;
declare function get_entity_type():Entities|null;
declare function get_ground_type():Grounds|null;
declare function get_water():number;
declare function refill_water():boolean;
declare function is_occupied(direction:Direction):boolean;
declare function reserve(direction:Direction):boolean;
declare function release():boolean;
declare function deliver(direction:Direction,item:Resources|Items,quantity:number):number;
declare function collect(direction:Direction,item:Resources|Items,quantity:number):number;
declare function get_building_stock(direction:Direction,item:Resources|Items):number;
declare function get_building_status(direction:Direction):"working"|"missing_input"|"output_full"|"idle"|null;
declare function sell(item:Resources|Items,quantity:number):number;
declare function get_gold():number;
declare function print(...values:unknown[]):void;
`;
