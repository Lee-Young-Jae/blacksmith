-- =============================================
-- HP% 잠재능력 수치 상향 마이그레이션
-- 기존 HP% 값을 2배로 증가 (최대 25% 캡)
-- =============================================

-- 기존 HP% 잠재능력 수치 업데이트
-- is_percentage = true AND stat_type = 'hp' 인 항목들만 대상
UPDATE equipment_potentials
SET
  stat_value = LEAST(stat_value * 2, 25),  -- 2배 증가, 최대 25%
  updated_at = NOW()
WHERE stat_type = 'hp'
  AND is_percentage = true;

-- 변경된 레코드 수 확인
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM equipment_potentials
  WHERE stat_type = 'hp' AND is_percentage = true;

  RAISE NOTICE 'HP%% potentials updated: % records', updated_count;
END $$;
