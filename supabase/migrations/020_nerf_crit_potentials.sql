-- =============================================
-- 치명타/HP% 잠재능력 밸런스 조정
-- 크리티컬 빌드 및 탱커 빌드 과도한 성능 하향
-- =============================================
--
-- 변경 사유:
-- - 치명타 확률 100% + 치명타 데미지 300%+ 빌드가 너무 강력함
-- - HP% 스택이 다른 스탯 대비 과도하게 높음
-- - 다양한 빌드 간 균형 조정 필요
--
-- 변경 기준 (치명타 확률):
-- Common: 1-2% → 유지
-- Rare: 2-4% → 유지
-- Epic: 4-7% → 3-5% (약 0.71배)
-- Unique: 6-10% → 4-7% (약 0.7배)
-- Legendary: 9-15% → 5-9% (약 0.6배)
--
-- 변경 기준 (치명타 데미지):
-- Common: 1-3% → 유지
-- Rare: 3-6% → 유지
-- Epic: 5-10% → 4-8% (약 0.8배)
-- Unique: 8-15% → 6-10% (약 0.67배)
-- Legendary: 12-20% → 8-12% (약 0.6배)
--
-- 변경 기준 (HP%):
-- Epic: 5-10% → 4-8% (약 0.8배)
-- Unique: 10-18% → 7-12% (약 0.67배)
-- Legendary: 15-25% → 10-15% (약 0.6배)
-- =============================================

-- =============================================
-- 1. 치명타 확률 (critRate) 조정
-- =============================================

-- Epic 치확: 0.71배 적용, 최소 3, 최대 5
UPDATE equipment_potentials
SET
  stat_value = LEAST(GREATEST(ROUND(stat_value * 0.71), 3), 5),
  updated_at = NOW()
WHERE stat_type = 'critRate'
  AND is_percentage = true
  AND tier = 'epic';

-- Unique 치확: 0.7배 적용, 최소 4, 최대 7
UPDATE equipment_potentials
SET
  stat_value = LEAST(GREATEST(ROUND(stat_value * 0.7), 4), 7),
  updated_at = NOW()
WHERE stat_type = 'critRate'
  AND is_percentage = true
  AND tier = 'unique';

-- Legendary 치확: 0.6배 적용, 최소 5, 최대 9
UPDATE equipment_potentials
SET
  stat_value = LEAST(GREATEST(ROUND(stat_value * 0.6), 5), 9),
  updated_at = NOW()
WHERE stat_type = 'critRate'
  AND is_percentage = true
  AND tier = 'legendary';

-- =============================================
-- 2. 치명타 데미지 (critDamage) 조정
-- =============================================

-- Epic 치피: 0.8배 적용, 최소 4, 최대 8
UPDATE equipment_potentials
SET
  stat_value = LEAST(GREATEST(ROUND(stat_value * 0.8), 4), 8),
  updated_at = NOW()
WHERE stat_type = 'critDamage'
  AND is_percentage = true
  AND tier = 'epic';

-- Unique 치피: 0.67배 적용, 최소 6, 최대 10
UPDATE equipment_potentials
SET
  stat_value = LEAST(GREATEST(ROUND(stat_value * 0.67), 6), 10),
  updated_at = NOW()
WHERE stat_type = 'critDamage'
  AND is_percentage = true
  AND tier = 'unique';

-- Legendary 치피: 0.6배 적용, 최소 8, 최대 12
UPDATE equipment_potentials
SET
  stat_value = LEAST(GREATEST(ROUND(stat_value * 0.6), 8), 12),
  updated_at = NOW()
WHERE stat_type = 'critDamage'
  AND is_percentage = true
  AND tier = 'legendary';

-- =============================================
-- 3. HP% 조정
-- =============================================

-- Epic HP%: 0.8배 적용, 최소 4, 최대 8
UPDATE equipment_potentials
SET
  stat_value = LEAST(GREATEST(ROUND(stat_value * 0.8), 4), 8),
  updated_at = NOW()
WHERE stat_type = 'hp'
  AND is_percentage = true
  AND tier = 'epic';

-- Unique HP%: 0.67배 적용, 최소 7, 최대 12
UPDATE equipment_potentials
SET
  stat_value = LEAST(GREATEST(ROUND(stat_value * 0.67), 7), 12),
  updated_at = NOW()
WHERE stat_type = 'hp'
  AND is_percentage = true
  AND tier = 'unique';

-- Legendary HP%: 0.6배 적용, 최소 10, 최대 15
UPDATE equipment_potentials
SET
  stat_value = LEAST(GREATEST(ROUND(stat_value * 0.6), 10), 15),
  updated_at = NOW()
WHERE stat_type = 'hp'
  AND is_percentage = true
  AND tier = 'legendary';

-- =============================================
-- 4. 변경 결과 확인
-- =============================================

DO $$
DECLARE
  crit_rate_count INTEGER;
  crit_damage_count INTEGER;
  hp_percent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO crit_rate_count
  FROM equipment_potentials
  WHERE stat_type = 'critRate'
    AND is_percentage = true
    AND tier IN ('epic', 'unique', 'legendary');

  SELECT COUNT(*) INTO crit_damage_count
  FROM equipment_potentials
  WHERE stat_type = 'critDamage'
    AND is_percentage = true
    AND tier IN ('epic', 'unique', 'legendary');

  SELECT COUNT(*) INTO hp_percent_count
  FROM equipment_potentials
  WHERE stat_type = 'hp'
    AND is_percentage = true
    AND tier IN ('epic', 'unique', 'legendary');

  RAISE NOTICE '치명타 확률 조정: % 건', crit_rate_count;
  RAISE NOTICE '치명타 데미지 조정: % 건', crit_damage_count;
  RAISE NOTICE 'HP%% 조정: % 건', hp_percent_count;
END $$;
