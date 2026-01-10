-- =============================================
-- 타워 리더보드에 테두리 정보 추가
-- =============================================

-- 기존 함수 삭제 (반환 타입 변경을 위해 필수)
DROP FUNCTION IF EXISTS get_tower_leaderboard(INTEGER);

-- =============================================
-- get_tower_leaderboard 함수 재생성 (테두리 정보 추가)
-- =============================================
CREATE FUNCTION get_tower_leaderboard(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  user_id UUID,
  username VARCHAR(50),
  avatar_url TEXT,
  equipped_border VARCHAR(50),
  highest_floor INTEGER,
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tr.user_id,
    up.username,
    up.avatar_url,
    up.equipped_border,
    tr.highest_floor,
    ROW_NUMBER() OVER (ORDER BY tr.highest_floor DESC, tr.updated_at ASC) as rank
  FROM tower_records tr
  JOIN user_profiles up ON up.id = tr.user_id
  WHERE tr.highest_floor > 0
  ORDER BY tr.highest_floor DESC, tr.updated_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 완료 메시지
-- =============================================
DO $$
BEGIN
  RAISE NOTICE 'Tower leaderboard now includes border information!';
  RAISE NOTICE '- get_tower_leaderboard: recreated with equipped_border';
END $$;
