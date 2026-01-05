-- =============================================
-- 실시간 강화 피드 RPC 함수
-- RLS를 우회하여 모든 유저의 강화 기록을 가져옴
-- =============================================

CREATE OR REPLACE FUNCTION get_recent_enhancements(p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  username VARCHAR(50),
  weapon_name VARCHAR(100),
  from_level INTEGER,
  to_level INTEGER,
  result VARCHAR(20),
  was_chance_time BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    eh.id,
    COALESCE(up.username, '알 수 없음') as username,
    eh.weapon_name,
    eh.from_level,
    eh.to_level,
    eh.result,
    eh.was_chance_time,
    eh.created_at
  FROM enhancement_history eh
  LEFT JOIN user_profiles up ON eh.user_id = up.id
  ORDER BY eh.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 완료 메시지
-- =============================================
DO $$
BEGIN
  RAISE NOTICE 'Enhancement feed RPC function created successfully!';
END $$;
