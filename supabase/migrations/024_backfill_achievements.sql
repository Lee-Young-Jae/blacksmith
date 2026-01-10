-- =============================================
-- 기존 유저 데이터를 업적에 반영하는 마이그레이션
-- pvp_wins, max_star, equipment_count 초기화
-- =============================================

-- =============================================
-- 1. 기존 유저의 PvP 승리 업적 반영
-- =============================================
INSERT INTO user_achievements (user_id, border_id, progress, is_unlocked, unlocked_at)
SELECT
  pr.user_id,
  ab.id as border_id,
  pr.wins as progress,
  pr.wins >= (ab.unlock_condition->>'target')::INTEGER as is_unlocked,
  CASE WHEN pr.wins >= (ab.unlock_condition->>'target')::INTEGER THEN NOW() ELSE NULL END as unlocked_at
FROM pvp_rankings pr
CROSS JOIN achievement_borders ab
WHERE ab.unlock_condition->>'type' = 'pvp_wins'
  AND pr.wins > 0
ON CONFLICT (user_id, border_id)
DO UPDATE SET
  progress = GREATEST(user_achievements.progress, EXCLUDED.progress),
  is_unlocked = CASE
    WHEN user_achievements.is_unlocked THEN TRUE
    ELSE EXCLUDED.is_unlocked
  END,
  unlocked_at = CASE
    WHEN user_achievements.is_unlocked THEN user_achievements.unlocked_at
    WHEN EXCLUDED.is_unlocked THEN NOW()
    ELSE NULL
  END,
  updated_at = NOW();

-- =============================================
-- 2. 기존 유저의 최대 성 업적 반영
-- =============================================
WITH user_max_stars AS (
  SELECT
    user_id,
    MAX(star_level) as max_star
  FROM user_equipment
  GROUP BY user_id
)
INSERT INTO user_achievements (user_id, border_id, progress, is_unlocked, unlocked_at)
SELECT
  ums.user_id,
  ab.id as border_id,
  ums.max_star as progress,
  ums.max_star >= (ab.unlock_condition->>'target')::INTEGER as is_unlocked,
  CASE WHEN ums.max_star >= (ab.unlock_condition->>'target')::INTEGER THEN NOW() ELSE NULL END as unlocked_at
FROM user_max_stars ums
CROSS JOIN achievement_borders ab
WHERE ab.unlock_condition->>'type' = 'max_star'
  AND ums.max_star > 0
ON CONFLICT (user_id, border_id)
DO UPDATE SET
  progress = GREATEST(user_achievements.progress, EXCLUDED.progress),
  is_unlocked = CASE
    WHEN user_achievements.is_unlocked THEN TRUE
    ELSE EXCLUDED.is_unlocked
  END,
  unlocked_at = CASE
    WHEN user_achievements.is_unlocked THEN user_achievements.unlocked_at
    WHEN EXCLUDED.is_unlocked THEN NOW()
    ELSE NULL
  END,
  updated_at = NOW();

-- =============================================
-- 3. 기존 유저의 장비 개수 업적 반영
-- =============================================
WITH user_equipment_counts AS (
  SELECT
    user_id,
    COUNT(*)::INTEGER as equipment_count
  FROM user_equipment
  GROUP BY user_id
)
INSERT INTO user_achievements (user_id, border_id, progress, is_unlocked, unlocked_at)
SELECT
  uec.user_id,
  ab.id as border_id,
  uec.equipment_count as progress,
  uec.equipment_count >= (ab.unlock_condition->>'target')::INTEGER as is_unlocked,
  CASE WHEN uec.equipment_count >= (ab.unlock_condition->>'target')::INTEGER THEN NOW() ELSE NULL END as unlocked_at
FROM user_equipment_counts uec
CROSS JOIN achievement_borders ab
WHERE ab.unlock_condition->>'type' = 'equipment_count'
  AND uec.equipment_count > 0
ON CONFLICT (user_id, border_id)
DO UPDATE SET
  progress = GREATEST(user_achievements.progress, EXCLUDED.progress),
  is_unlocked = CASE
    WHEN user_achievements.is_unlocked THEN TRUE
    ELSE EXCLUDED.is_unlocked
  END,
  unlocked_at = CASE
    WHEN user_achievements.is_unlocked THEN user_achievements.unlocked_at
    WHEN EXCLUDED.is_unlocked THEN NOW()
    ELSE NULL
  END,
  updated_at = NOW();

-- =============================================
-- 4. 연승 업적 반영 (현재 연승 기록 기준)
-- =============================================
INSERT INTO user_achievements (user_id, border_id, progress, is_unlocked, unlocked_at)
SELECT
  pr.user_id,
  ab.id as border_id,
  pr.win_streak as progress,
  pr.win_streak >= (ab.unlock_condition->>'target')::INTEGER as is_unlocked,
  CASE WHEN pr.win_streak >= (ab.unlock_condition->>'target')::INTEGER THEN NOW() ELSE NULL END as unlocked_at
FROM pvp_rankings pr
CROSS JOIN achievement_borders ab
WHERE ab.unlock_condition->>'type' = 'win_streak'
  AND pr.win_streak > 0
ON CONFLICT (user_id, border_id)
DO UPDATE SET
  progress = GREATEST(user_achievements.progress, EXCLUDED.progress),
  is_unlocked = CASE
    WHEN user_achievements.is_unlocked THEN TRUE
    ELSE EXCLUDED.is_unlocked
  END,
  unlocked_at = CASE
    WHEN user_achievements.is_unlocked THEN user_achievements.unlocked_at
    WHEN EXCLUDED.is_unlocked THEN NOW()
    ELSE NULL
  END,
  updated_at = NOW();

-- =============================================
-- 완료 메시지
-- =============================================
DO $$
DECLARE
  v_users_updated INTEGER;
  v_achievements_created INTEGER;
BEGIN
  SELECT COUNT(DISTINCT user_id) INTO v_users_updated FROM user_achievements;
  SELECT COUNT(*) INTO v_achievements_created FROM user_achievements;

  RAISE NOTICE 'Achievement backfill completed!';
  RAISE NOTICE 'Users with achievements: %', v_users_updated;
  RAISE NOTICE 'Total achievement records: %', v_achievements_created;
END $$;
