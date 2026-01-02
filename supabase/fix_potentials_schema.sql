-- =============================================
-- 잠재옵션 스키마 수정
-- Supabase SQL Editor에서 실행하세요
-- =============================================

-- 1. is_unlocked 컬럼 추가 (없으면)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment_potentials'
    AND column_name = 'is_unlocked'
  ) THEN
    ALTER TABLE equipment_potentials
    ADD COLUMN is_unlocked BOOLEAN NOT NULL DEFAULT FALSE;
    RAISE NOTICE 'Added is_unlocked column';
  ELSE
    RAISE NOTICE 'is_unlocked column already exists';
  END IF;
END $$;

-- 2. stat_type 체크 제약 조건 업데이트 (attackSpeed 포함)
ALTER TABLE equipment_potentials
DROP CONSTRAINT IF EXISTS equipment_potentials_stat_type_check;

ALTER TABLE equipment_potentials
ADD CONSTRAINT equipment_potentials_stat_type_check
CHECK (stat_type IN ('attack', 'defense', 'hp', 'critRate', 'critDamage', 'penetration', 'attackSpeed'));

-- 3. 완료 메시지
DO $$
BEGIN
  RAISE NOTICE 'Potentials schema fix completed!';
END $$;
