-- =============================================
-- frame_image 컬럼 추가 및 중복 업적 정리
-- =============================================

-- =============================================
-- 1. frame_image 컬럼 추가
-- =============================================
ALTER TABLE achievement_borders
ADD COLUMN IF NOT EXISTS frame_image TEXT DEFAULT NULL;

-- =============================================
-- 2. 중복/잘못된 업적 삭제
-- 유지할 업적:
--   - star_25: 시즌 1에서 장비 25성 (개척자의 영광)
--   - star_30_tier1: 시즌 2에서 Tier1 장비 30성 (불굴의 장인)
--   - star_35_tier2: 시즌 3에서 Tier2 장비 35성 (신화의 대장장이)
-- =============================================

-- 먼저 잘못된 업적의 user_achievements 레코드 삭제
DELETE FROM user_achievements
WHERE border_id IN (
  SELECT id FROM achievement_borders
  WHERE description LIKE '%시즌 1에서 Tier1 장비 25성%'
     OR description LIKE '%Tier2 무기 30성%'
     OR description LIKE '%Tier2 장비 30성%'
);

-- 잘못된 업적 삭제
DELETE FROM achievement_borders
WHERE description LIKE '%시즌 1에서 Tier1 장비 25성%'
   OR description LIKE '%Tier2 무기 30성%'
   OR description LIKE '%Tier2 장비 30성%';

-- =============================================
-- 3. DB 함수 업데이트: border_tier 대신 frame_image 반환
-- =============================================

-- 기존 함수 삭제
DROP FUNCTION IF EXISTS get_pvp_leaderboard(INTEGER);
DROP FUNCTION IF EXISTS get_pvp_opponents_v2(UUID, INTEGER, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS find_pvp_opponent_by_rating(UUID, INTEGER);

-- get_pvp_leaderboard 재생성
CREATE FUNCTION get_pvp_leaderboard(p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  username VARCHAR(50),
  avatar_url TEXT,
  rating INTEGER,
  tier VARCHAR(20),
  wins INTEGER,
  losses INTEGER,
  win_streak INTEGER,
  combat_power INTEGER,
  equipped_border VARCHAR(50),
  frame_image TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY pr.rating DESC) as rank,
    pr.user_id,
    up.username,
    up.avatar_url,
    pr.rating,
    pr.tier,
    pr.wins,
    pr.losses,
    pr.win_streak,
    pr.combat_power,
    up.equipped_border,
    ab.frame_image
  FROM pvp_rankings pr
  JOIN user_profiles up ON up.id = pr.user_id
  LEFT JOIN achievement_borders ab ON ab.id = up.equipped_border
  ORDER BY pr.rating DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- get_pvp_opponents_v2 재생성
CREATE FUNCTION get_pvp_opponents_v2(
  p_user_id UUID,
  p_combat_power INTEGER,
  p_range INTEGER DEFAULT 300,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  user_id UUID,
  username VARCHAR(50),
  avatar_url TEXT,
  rating INTEGER,
  tier VARCHAR(20),
  combat_power INTEGER,
  total_stats JSONB,
  card_count INTEGER,
  frame_image TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dd.user_id,
    up.username,
    up.avatar_url,
    COALESCE(pr.rating, 1000) as rating,
    COALESCE(pr.tier, 'bronze') as tier,
    dd.combat_power,
    dd.total_stats,
    (CASE WHEN dd.card_slot_1 IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN dd.card_slot_2 IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN dd.card_slot_3 IS NOT NULL THEN 1 ELSE 0 END) as card_count,
    ab.frame_image
  FROM user_defense_deck dd
  JOIN user_profiles up ON up.id = dd.user_id
  LEFT JOIN pvp_rankings pr ON pr.user_id = dd.user_id
  LEFT JOIN achievement_borders ab ON ab.id = up.equipped_border
  WHERE dd.user_id != p_user_id
    AND dd.combat_power BETWEEN (p_combat_power - p_range) AND (p_combat_power + p_range)
  ORDER BY RANDOM()
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- find_pvp_opponent_by_rating 재생성
CREATE FUNCTION find_pvp_opponent_by_rating(
  p_user_id UUID,
  p_rating INTEGER
)
RETURNS TABLE (
  user_id UUID,
  username VARCHAR(50),
  avatar_url TEXT,
  rating INTEGER,
  tier VARCHAR(20),
  combat_power INTEGER,
  total_stats JSONB,
  card_count INTEGER,
  frame_image TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dd.user_id,
    up.username,
    up.avatar_url,
    COALESCE(pr.rating, 1000) as rating,
    COALESCE(pr.tier, 'bronze') as tier,
    dd.combat_power,
    dd.total_stats,
    (CASE WHEN dd.card_slot_1 IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN dd.card_slot_2 IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN dd.card_slot_3 IS NOT NULL THEN 1 ELSE 0 END) as card_count,
    ab.frame_image
  FROM user_defense_deck dd
  JOIN user_profiles up ON up.id = dd.user_id
  LEFT JOIN pvp_rankings pr ON pr.user_id = dd.user_id
  LEFT JOIN achievement_borders ab ON ab.id = up.equipped_border
  WHERE dd.user_id != p_user_id
  ORDER BY ABS(COALESCE(pr.rating, 1000) - p_rating) ASC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 4. 시즌 업적에 프레임 이미지 설정 (예시)
-- 실제 프레임 이미지 경로는 나중에 업데이트
-- =============================================

-- 시즌 1: 개척자의 영광 (25성)
UPDATE achievement_borders
SET frame_image = '/frames/legendary-frame.png'
WHERE id = 'star_25';

-- 시즌 2: 불굴의 장인 (30성) - 프레임 추가 시 업데이트
-- UPDATE achievement_borders
-- SET frame_image = '/frames/tier1-30-frame.png'
-- WHERE id = 'star_30_tier1';

-- 시즌 3: 신화의 대장장이 (35성) - 프레임 추가 시 업데이트
-- UPDATE achievement_borders
-- SET frame_image = '/frames/tier2-35-frame.png'
-- WHERE id = 'star_35_tier2';

-- =============================================
-- 완료 메시지
-- =============================================
DO $$
BEGIN
  RAISE NOTICE 'Migration completed!';
  RAISE NOTICE '- Added frame_image column to achievement_borders';
  RAISE NOTICE '- Removed duplicate/incorrect seasonal achievements';
  RAISE NOTICE '- Updated PvP functions to return frame_image instead of border_tier';
  RAISE NOTICE '- Set frame_image for star_25 (legendary frame)';
END $$;
