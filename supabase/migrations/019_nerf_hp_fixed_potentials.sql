-- =============================================
-- HP 고정값 잠재능력 하향 마이그레이션
-- 기존 값의 약 1/4로 감소 (최소 3 유지)
-- =============================================
-- 변경 기준:
-- Common: 10~50 → 3~10 (약 0.2배)
-- Rare: 30~100 → 8~25 (약 0.25배)
-- Epic: 50~200 → 15~50 (약 0.25배)
--
-- 일괄 적용: 모든 HP 고정값을 0.25배로 조정, 최소 3 보장

-- 기존 HP 고정값 잠재능력 수치 업데이트
UPDATE equipment_potentials
SET
  stat_value = GREATEST(ROUND(stat_value * 0.25), 3),
  updated_at = NOW()
WHERE stat_type = 'hp'
  AND is_percentage = false;

-- 변경된 레코드 수 확인
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM equipment_potentials
  WHERE stat_type = 'hp' AND is_percentage = false;

  RAISE NOTICE 'HP fixed potentials nerfed: % records', updated_count;
END $$;
