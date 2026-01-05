-- =============================================
-- PvP 레이팅 기반 매칭 시스템
-- - 레이팅 범위로 상대 검색
-- - 최근 대전 상대 제외
-- =============================================

-- =============================================
-- 헬퍼 함수: 레이팅 기반 PvP 상대 검색
-- =============================================
CREATE OR REPLACE FUNCTION get_pvp_opponents_by_rating(
  p_user_id UUID,
  p_rating INTEGER,
  p_range INTEGER DEFAULT 150,
  p_limit INTEGER DEFAULT 5,
  p_exclude_user_ids UUID[] DEFAULT '{}'::UUID[]
)
RETURNS TABLE (
  user_id UUID,
  username VARCHAR(50),
  rating INTEGER,
  tier VARCHAR(20),
  combat_power INTEGER,
  total_stats JSONB,
  card_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dd.user_id,
    up.username,
    COALESCE(pr.rating, 1000) as rating,
    COALESCE(pr.tier, 'bronze') as tier,
    dd.combat_power,
    dd.total_stats,
    (CASE WHEN dd.card_slot_1 IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN dd.card_slot_2 IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN dd.card_slot_3 IS NOT NULL THEN 1 ELSE 0 END) as card_count
  FROM user_defense_deck dd
  JOIN user_profiles up ON up.id = dd.user_id
  LEFT JOIN pvp_rankings pr ON pr.user_id = dd.user_id
  WHERE dd.user_id != p_user_id
    -- 최근 대전 상대 제외
    AND NOT (dd.user_id = ANY(p_exclude_user_ids))
    -- 레이팅 범위 매칭
    AND COALESCE(pr.rating, 1000) BETWEEN (p_rating - p_range) AND (p_rating + p_range)
  ORDER BY
    -- 레이팅 차이가 적은 상대 우선, 약간의 랜덤성 추가
    ABS(COALESCE(pr.rating, 1000) - p_rating) + (RANDOM() * 50)
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 헬퍼 함수: 최근 대전 상대 ID 조회
-- =============================================
CREATE OR REPLACE FUNCTION get_recent_opponent_ids(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS UUID[] AS $$
DECLARE
  v_opponent_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(opponent_id)
  INTO v_opponent_ids
  FROM (
    -- 공격전에서 상대 (defender)
    SELECT defender_id as opponent_id, created_at
    FROM pvp_battles
    WHERE attacker_id = p_user_id

    UNION ALL

    -- 방어전에서 상대 (attacker)
    SELECT attacker_id as opponent_id, created_at
    FROM pvp_battles
    WHERE defender_id = p_user_id

    ORDER BY created_at DESC
    LIMIT p_limit
  ) recent;

  RETURN COALESCE(v_opponent_ids, '{}'::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 헬퍼 함수: 레이팅 기반 매칭 (범위 자동 확장)
-- 상대를 못 찾으면 범위를 넓혀서 재검색
-- =============================================
CREATE OR REPLACE FUNCTION find_pvp_opponent_by_rating(
  p_user_id UUID,
  p_rating INTEGER
)
RETURNS TABLE (
  user_id UUID,
  username VARCHAR(50),
  rating INTEGER,
  tier VARCHAR(20),
  combat_power INTEGER,
  total_stats JSONB,
  card_count INTEGER
) AS $$
DECLARE
  v_exclude_ids UUID[];
  v_range INTEGER := 100;
  v_max_range INTEGER := 500;
  v_found BOOLEAN := FALSE;
BEGIN
  -- 최근 5명의 상대 ID 조회
  v_exclude_ids := get_recent_opponent_ids(p_user_id, 5);

  -- 범위를 점점 넓혀가며 검색
  WHILE v_range <= v_max_range AND NOT v_found LOOP
    -- 해당 범위에서 검색
    RETURN QUERY
    SELECT * FROM get_pvp_opponents_by_rating(
      p_user_id,
      p_rating,
      v_range,
      3,  -- 3명 후보
      v_exclude_ids
    );

    -- 결과가 있으면 종료
    IF FOUND THEN
      v_found := TRUE;
    ELSE
      -- 범위 확장
      v_range := v_range + 100;
    END IF;
  END LOOP;

  -- 그래도 없으면 제외 조건 없이 검색
  IF NOT v_found THEN
    RETURN QUERY
    SELECT * FROM get_pvp_opponents_by_rating(
      p_user_id,
      p_rating,
      v_max_range,
      3,
      '{}'::UUID[]  -- 제외 없이
    );
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 완료 메시지
-- =============================================
DO $$
BEGIN
  RAISE NOTICE 'PvP rating-based matching migration completed successfully!';
END $$;
