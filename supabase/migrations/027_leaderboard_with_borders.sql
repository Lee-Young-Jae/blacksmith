-- =============================================
-- 리더보드 및 상대 검색에 테두리 정보 추가
-- =============================================

-- 기존 함수들 삭제 (반환 타입 변경을 위해 필수)
DROP FUNCTION IF EXISTS get_pvp_leaderboard(INTEGER);
DROP FUNCTION IF EXISTS get_pvp_opponents_v2(UUID, INTEGER, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS find_pvp_opponent_by_rating(UUID, INTEGER);

-- =============================================
-- get_pvp_leaderboard 함수 재생성 (테두리 정보 추가)
-- =============================================
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
  border_tier VARCHAR(20)
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
    ab.tier as border_tier
  FROM pvp_rankings pr
  JOIN user_profiles up ON up.id = pr.user_id
  LEFT JOIN achievement_borders ab ON ab.id = up.equipped_border
  ORDER BY pr.rating DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- get_pvp_opponents_v2 함수 재생성 (테두리 정보 추가)
-- =============================================
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
  border_tier VARCHAR(20)
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
    ab.tier as border_tier
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

-- =============================================
-- find_pvp_opponent_by_rating 함수 재생성 (테두리 정보 추가)
-- =============================================
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
  border_tier VARCHAR(20)
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
    ab.tier as border_tier
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
-- 완료 메시지
-- =============================================
DO $$
BEGIN
  RAISE NOTICE 'PvP functions now include border information!';
  RAISE NOTICE '- get_pvp_leaderboard: recreated with border_tier';
  RAISE NOTICE '- get_pvp_opponents_v2: recreated with border_tier';
  RAISE NOTICE '- find_pvp_opponent_by_rating: recreated with border_tier';
END $$;
