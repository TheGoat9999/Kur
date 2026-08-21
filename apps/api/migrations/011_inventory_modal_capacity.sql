-- Inventory modal baseline: the carried player inventory is 64 slots / 20 kg.
-- External storage keeps its existing capacity/slot rules.
UPDATE inventory_containers
SET capacity_grams = 20000,
    slot_count = 64,
    updated_at = now()
WHERE container_key = 'player';
