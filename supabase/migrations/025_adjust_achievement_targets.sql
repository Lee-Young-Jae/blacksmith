-- =============================================
-- 업적 목표치 상향 조정
-- PvP 승리 + 연승 기준 변경
-- =============================================

-- =============================================
-- 1. PvP 승리 업적 목표치 변경
-- =============================================

-- 전사의 길: 10승 → 100승
UPDATE achievement_borders
SET
  unlock_condition = '{"type": "pvp_wins", "target": 100, "category": "battle"}',
  description = 'PvP에서 100승을 달성하세요'
WHERE id = 'warrior_10';

-- 숙련된 전사: 50승 → 500승
UPDATE achievement_borders
SET
  unlock_condition = '{"type": "pvp_wins", "target": 500, "category": "battle"}',
  description = 'PvP에서 500승을 달성하세요'
WHERE id = 'warrior_50';

-- 백전노장: 100승 → 1000승
UPDATE achievement_borders
SET
  unlock_condition = '{"type": "pvp_wins", "target": 1000, "category": "battle"}',
  description = 'PvP에서 1,000승을 달성하세요'
WHERE id = 'warrior_100';

-- 챔피언: 500승 → 5000승
UPDATE achievement_borders
SET
  unlock_condition = '{"type": "pvp_wins", "target": 5000, "category": "battle"}',
  description = 'PvP에서 5,000승을 달성하세요'
WHERE id = 'champion';

-- =============================================
-- 2. 연승 업적 목표치 변경
-- =============================================

-- 연승의 기운: 5연승 → 30연승
UPDATE achievement_borders
SET
  unlock_condition = '{"type": "pvp_win_streak", "target": 30, "category": "battle"}',
  description = 'PvP 30연승을 달성하세요'
WHERE id = 'win_streak_5';

-- 무적의 전사: 10연승 → 75연승
UPDATE achievement_borders
SET
  unlock_condition = '{"type": "pvp_win_streak", "target": 75, "category": "battle"}',
  description = 'PvP 75연승을 달성하세요'
WHERE id = 'win_streak_10';

-- =============================================
-- 3. 장비 수집 업적 목표치 변경
-- =============================================

-- 수집 입문: 10개 → 100개
UPDATE achievement_borders
SET
  unlock_condition = '{"type": "equipment_count", "target": 100, "category": "collection"}',
  description = '장비 100개를 보유하세요'
WHERE id = 'collector_10';

-- 수집가: 30개 → 500개
UPDATE achievement_borders
SET
  unlock_condition = '{"type": "equipment_count", "target": 500, "category": "collection"}',
  description = '장비 500개를 보유하세요'
WHERE id = 'collector_30';

-- 수집 마니아: 50개 → 1000개
UPDATE achievement_borders
SET
  unlock_condition = '{"type": "equipment_count", "target": 1000, "category": "collection"}',
  description = '장비 1,000개를 보유하세요'
WHERE id = 'collector_50';

-- =============================================
-- 4. 기존에 잘못 해금된 업적 초기화 (선택사항)
-- 새 기준에 맞지 않는 해금 상태를 리셋
-- =============================================

-- 변경된 업적 재검증 (PvP, 연승, 수집)
UPDATE user_achievements ua
SET
  is_unlocked = ua.progress >= (ab.unlock_condition->>'target')::INTEGER,
  unlocked_at = CASE
    WHEN ua.progress >= (ab.unlock_condition->>'target')::INTEGER AND ua.unlocked_at IS NOT NULL
    THEN ua.unlocked_at
    WHEN ua.progress >= (ab.unlock_condition->>'target')::INTEGER
    THEN NOW()
    ELSE NULL
  END
FROM achievement_borders ab
WHERE ua.border_id = ab.id
  AND ab.unlock_condition->>'type' IN ('pvp_wins', 'pvp_win_streak', 'equipment_count');

-- =============================================
-- 완료 메시지
-- =============================================
DO $$
BEGIN
  RAISE NOTICE 'Achievement targets adjusted successfully!';
  RAISE NOTICE 'PvP wins: 100 / 500 / 1000 / 5000';
  RAISE NOTICE 'Win streak: 30 / 75';
  RAISE NOTICE 'Equipment count: 100 / 500 / 1000';
END $$;
