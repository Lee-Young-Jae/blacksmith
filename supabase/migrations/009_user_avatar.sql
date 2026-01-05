-- =============================================
-- 유저 아바타 URL 추가
-- =============================================

-- user_profiles에 avatar_url 컬럼 추가
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- PvP 상대 검색 시 avatar_url도 반환하도록 함수 업데이트
CREATE OR REPLACE FUNCTION find_pvp_opponent_by_rating(
  p_player_id UUID,
  p_player_rating INTEGER,
  p_rating_range INTEGER DEFAULT 200
)
RETURNS TABLE (
  user_id UUID,
  username VARCHAR(50),
  rating INTEGER,
  tier VARCHAR(20),
  combat_power INTEGER,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dd.user_id,
    up.username,
    pr.rating,
    pr.tier,
    dd.combat_power,
    up.avatar_url
  FROM defense_decks dd
  JOIN user_profiles up ON dd.user_id = up.id
  JOIN pvp_ratings pr ON dd.user_id = pr.user_id
  WHERE dd.user_id != p_player_id
    AND pr.rating BETWEEN (p_player_rating - p_rating_range) AND (p_player_rating + p_rating_range)
  ORDER BY RANDOM()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 완료 메시지
-- =============================================
DO $$
BEGIN
  RAISE NOTICE 'User avatar migration completed successfully!';
END $$;
