-- =============================================
-- PvP 상대 검색 함수에 equipped_border 추가
-- 상대방의 테두리가 PvP 대전 화면에서 보이지 않는 문제 수정
-- =============================================

-- 기존 함수 삭제
DROP FUNCTION IF EXISTS get_pvp_opponents_v2(UUID, INTEGER, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS find_pvp_opponent_by_rating(UUID, INTEGER);

-- =============================================
-- get_pvp_opponents_v2 재생성 (equipped_border 추가)
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
  equipped_border VARCHAR(50),
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
    up.equipped_border,
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

-- =============================================
-- find_pvp_opponent_by_rating 재생성 (equipped_border 추가)
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
  equipped_border VARCHAR(50),
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
    up.equipped_border,
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
-- 완료 메시지
-- =============================================
DO $$
BEGIN
  RAISE NOTICE 'PvP opponent functions now include equipped_border!';
  RAISE NOTICE '- get_pvp_opponents_v2: added equipped_border';
  RAISE NOTICE '- find_pvp_opponent_by_rating: added equipped_border';
END $$;
