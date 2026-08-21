-- Repair item keys created by the first inventory prototype before the 200-item catalog.
-- The old keys prevented catalog metadata, Rainmad images and use effects from resolving.
UPDATE inventory_items
SET item_key = 'water_bottle',
    display_name = 'Water Bottle',
    category = 'Drink',
    symbol = 'H2O',
    unit_weight_grams = 500,
    stackable = true,
    updated_at = now()
WHERE item_key = 'water';

UPDATE inventory_items
SET item_key = 'work_gloves',
    display_name = 'Work Gloves',
    category = 'Personal',
    symbol = 'GLV',
    unit_weight_grams = 150,
    stackable = false,
    updated_at = now()
WHERE item_key = 'gloves';
