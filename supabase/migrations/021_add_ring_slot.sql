-- Migration: Add ring slot to equipment system
-- This migration adds 'ring' as a valid equipped_slot value

-- Drop the existing check constraint
ALTER TABLE user_equipment
DROP CONSTRAINT IF EXISTS user_equipment_equipped_slot_check;

-- Add the new check constraint with 'ring' included
ALTER TABLE user_equipment
ADD CONSTRAINT user_equipment_equipped_slot_check
CHECK (equipped_slot IS NULL OR equipped_slot IN ('hat', 'top', 'bottom', 'weapon', 'gloves', 'shoes', 'earring', 'ring'));
