-- =============================================
-- 유연한 보상 아이템 시스템 마이그레이션
-- 시즌 보상에 여러 종류의 아이템을 지급할 수 있도록 확장
-- =============================================

-- 0. 반환 타입이 변경되는 함수들 삭제 (재생성 전)
DROP FUNCTION IF EXISTS get_season_reward_tiers(UUID);
DROP FUNCTION IF EXISTS claim_tower_season_reward(UUID, UUID);
DROP FUNCTION IF EXISTS get_unclaimed_season_rewards(UUID);

-- 1. tower_season_rewards 테이블에 reward_items JSONB 컬럼 추가
ALTER TABLE tower_season_rewards
ADD COLUMN IF NOT EXISTS reward_items JSONB DEFAULT '[]'::JSONB;

-- 2. tower_season_user_rewards 테이블에 reward_items JSONB 컬럼 추가
ALTER TABLE tower_season_user_rewards
ADD COLUMN IF NOT EXISTS reward_items JSONB DEFAULT '[]'::JSONB;

-- 3. 기존 데이터 마이그레이션 (기존 골드/강화권 → reward_items 배열로 변환)
UPDATE tower_season_rewards
SET reward_items = (
  SELECT jsonb_agg(item) FROM (
    SELECT jsonb_build_object('type', 'gold', 'amount', gold_reward) as item
    WHERE gold_reward > 0
    UNION ALL
    SELECT jsonb_build_object('type', 'enhancement_ticket', 'level', enhancement_ticket_level, 'count', enhancement_ticket_count) as item
    WHERE enhancement_ticket_level > 0 AND enhancement_ticket_count > 0
  ) items
)
WHERE reward_items = '[]'::JSONB OR reward_items IS NULL;

-- NULL인 경우 빈 배열로 설정
UPDATE tower_season_rewards
SET reward_items = '[]'::JSONB
WHERE reward_items IS NULL;

-- 유저 보상도 동일하게 마이그레이션
UPDATE tower_season_user_rewards
SET reward_items = (
  SELECT jsonb_agg(item) FROM (
    SELECT jsonb_build_object('type', 'gold', 'amount', gold_reward) as item
    WHERE gold_reward > 0
    UNION ALL
    SELECT jsonb_build_object('type', 'enhancement_ticket', 'level', enhancement_ticket_level, 'count', enhancement_ticket_count) as item
    WHERE enhancement_ticket_level > 0 AND enhancement_ticket_count > 0
  ) items
)
WHERE reward_items = '[]'::JSONB OR reward_items IS NULL;

UPDATE tower_season_user_rewards
SET reward_items = '[]'::JSONB
WHERE reward_items IS NULL;

-- 4. 시즌 보상 티어 조회 함수 업데이트
CREATE OR REPLACE FUNCTION get_season_reward_tiers(p_season_id UUID)
RETURNS TABLE (
  rank_from INTEGER,
  rank_to INTEGER,
  gold_reward INTEGER,
  enhancement_ticket_level INTEGER,
  enhancement_ticket_count INTEGER,
  reward_items JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tsr.rank_from,
    tsr.rank_to,
    tsr.gold_reward,
    tsr.enhancement_ticket_level,
    tsr.enhancement_ticket_count,
    tsr.reward_items
  FROM tower_season_rewards tsr
  WHERE tsr.season_id = p_season_id
  ORDER BY tsr.rank_from ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 시즌 생성 함수 업데이트 (reward_items 지원)
CREATE OR REPLACE FUNCTION create_tower_season(
  p_admin_id UUID,
  p_name VARCHAR(100),
  p_description TEXT,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ,
  p_rewards JSONB  -- [{ rankFrom, rankTo, rewardItems: [...] }] 또는 레거시 형식
)
RETURNS UUID AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_season_id UUID;
  v_reward JSONB;
  v_reward_items JSONB;
BEGIN
  -- 관리자 권한 확인
  SELECT is_admin INTO v_is_admin
  FROM user_profiles
  WHERE id = p_admin_id;

  IF v_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Only admins can create seasons';
  END IF;

  -- 날짜 유효성 검사
  IF p_ends_at <= p_starts_at THEN
    RAISE EXCEPTION 'End date must be after start date';
  END IF;

  -- 시즌 생성
  INSERT INTO tower_seasons (name, description, starts_at, ends_at, is_active, created_by)
  VALUES (p_name, p_description, p_starts_at, p_ends_at, FALSE, p_admin_id)
  RETURNING id INTO v_season_id;

  -- 보상 티어 생성
  FOR v_reward IN SELECT * FROM jsonb_array_elements(p_rewards)
  LOOP
    -- rewardItems가 있으면 사용, 없으면 레거시 형식에서 변환
    IF v_reward ? 'rewardItems' AND jsonb_array_length(v_reward->'rewardItems') > 0 THEN
      v_reward_items := v_reward->'rewardItems';
    ELSE
      -- 레거시 형식을 reward_items로 변환
      v_reward_items := '[]'::JSONB;

      IF COALESCE((v_reward->>'goldReward')::INTEGER, 0) > 0 THEN
        v_reward_items := v_reward_items || jsonb_build_array(
          jsonb_build_object('type', 'gold', 'amount', (v_reward->>'goldReward')::INTEGER)
        );
      END IF;

      IF COALESCE((v_reward->>'enhancementTicketLevel')::INTEGER, 0) > 0
         AND COALESCE((v_reward->>'enhancementTicketCount')::INTEGER, 0) > 0 THEN
        v_reward_items := v_reward_items || jsonb_build_array(
          jsonb_build_object(
            'type', 'enhancement_ticket',
            'level', (v_reward->>'enhancementTicketLevel')::INTEGER,
            'count', (v_reward->>'enhancementTicketCount')::INTEGER
          )
        );
      END IF;
    END IF;

    INSERT INTO tower_season_rewards (
      season_id, rank_from, rank_to,
      gold_reward, enhancement_ticket_level, enhancement_ticket_count,
      reward_items
    )
    VALUES (
      v_season_id,
      (v_reward->>'rankFrom')::INTEGER,
      (v_reward->>'rankTo')::INTEGER,
      COALESCE((v_reward->>'goldReward')::INTEGER, 0),
      COALESCE((v_reward->>'enhancementTicketLevel')::INTEGER, 0),
      COALESCE((v_reward->>'enhancementTicketCount')::INTEGER, 0),
      v_reward_items
    );
  END LOOP;

  RETURN v_season_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 시즌 종료 및 보상 배분 함수 업데이트 (reward_items 지원)
CREATE OR REPLACE FUNCTION end_tower_season(
  p_admin_id UUID,
  p_season_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_season RECORD;
  v_reward_tier RECORD;
  v_user RECORD;
  v_distributed_count INTEGER := 0;
BEGIN
  -- 관리자 권한 확인
  SELECT is_admin INTO v_is_admin
  FROM user_profiles
  WHERE id = p_admin_id;

  IF v_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Only admins can end seasons';
  END IF;

  -- 시즌 확인
  SELECT * INTO v_season
  FROM tower_seasons
  WHERE id = p_season_id;

  IF v_season IS NULL THEN
    RAISE EXCEPTION 'Season not found';
  END IF;

  IF v_season.rewards_distributed THEN
    RAISE EXCEPTION 'Rewards already distributed';
  END IF;

  -- 랭킹 조회 및 보상 생성
  FOR v_user IN
    SELECT
      tr.user_id,
      tr.highest_floor,
      ROW_NUMBER() OVER (ORDER BY tr.highest_floor DESC, tr.updated_at ASC) as rank
    FROM tower_records tr
    WHERE tr.highest_floor > 0
  LOOP
    -- 해당 순위에 맞는 보상 티어 찾기
    SELECT * INTO v_reward_tier
    FROM tower_season_rewards
    WHERE season_id = p_season_id
      AND v_user.rank >= rank_from
      AND v_user.rank <= rank_to
    LIMIT 1;

    -- 보상이 있으면 유저 보상 레코드 생성
    IF v_reward_tier IS NOT NULL THEN
      INSERT INTO tower_season_user_rewards (
        season_id, user_id, final_rank, final_floor,
        gold_reward, enhancement_ticket_level, enhancement_ticket_count,
        reward_items
      )
      VALUES (
        p_season_id,
        v_user.user_id,
        v_user.rank,
        v_user.highest_floor,
        v_reward_tier.gold_reward,
        v_reward_tier.enhancement_ticket_level,
        v_reward_tier.enhancement_ticket_count,
        COALESCE(v_reward_tier.reward_items, '[]'::JSONB)
      )
      ON CONFLICT (season_id, user_id) DO NOTHING;

      v_distributed_count := v_distributed_count + 1;
    END IF;
  END LOOP;

  -- 시즌 종료 처리
  UPDATE tower_seasons
  SET is_active = FALSE, rewards_distributed = TRUE
  WHERE id = p_season_id;

  -- 타워 닫기 (game_settings 테이블이 있는 경우에만)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'game_settings') THEN
    UPDATE game_settings
    SET value = jsonb_build_object('is_open', FALSE, 'message', '시즌이 종료되었습니다. 보상을 수령해주세요!'),
        updated_by = p_admin_id,
        updated_at = NOW()
    WHERE key = 'tower_status';
  END IF;

  RETURN v_distributed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 시즌 보상 수령 함수 업데이트 (reward_items 지원)
CREATE OR REPLACE FUNCTION claim_tower_season_reward(
  p_user_id UUID,
  p_reward_id UUID
)
RETURNS TABLE (
  gold_claimed INTEGER,
  ticket_level_claimed INTEGER,
  ticket_count_claimed INTEGER,
  reward_items_claimed JSONB
) AS $$
DECLARE
  v_reward RECORD;
  v_item JSONB;
BEGIN
  -- 보상 확인
  SELECT * INTO v_reward
  FROM tower_season_user_rewards
  WHERE id = p_reward_id
    AND user_id = p_user_id
    AND is_claimed = FALSE;

  IF v_reward IS NULL THEN
    RAISE EXCEPTION 'Reward not found or already claimed';
  END IF;

  -- reward_items가 있으면 새 시스템으로 처리
  IF v_reward.reward_items IS NOT NULL AND jsonb_array_length(v_reward.reward_items) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_reward.reward_items)
    LOOP
      CASE v_item->>'type'
        WHEN 'gold' THEN
          UPDATE user_profiles
          SET gold = gold + (v_item->>'amount')::INTEGER
          WHERE id = p_user_id;
        WHEN 'enhancement_ticket' THEN
          PERFORM add_enhancement_tickets(
            p_user_id,
            (v_item->>'level')::INTEGER,
            (v_item->>'count')::INTEGER
          );
        -- 추후 다른 아이템 타입 추가 가능
        ELSE
          -- 알 수 없는 타입은 무시
          NULL;
      END CASE;
    END LOOP;
  ELSE
    -- 레거시 시스템 처리
    -- 골드 지급
    IF v_reward.gold_reward > 0 THEN
      UPDATE user_profiles
      SET gold = gold + v_reward.gold_reward
      WHERE id = p_user_id;
    END IF;

    -- 강화권 지급
    IF v_reward.enhancement_ticket_level > 0 AND v_reward.enhancement_ticket_count > 0 THEN
      PERFORM add_enhancement_tickets(
        p_user_id,
        v_reward.enhancement_ticket_level,
        v_reward.enhancement_ticket_count
      );
    END IF;
  END IF;

  -- 수령 처리
  UPDATE tower_season_user_rewards
  SET is_claimed = TRUE, claimed_at = NOW()
  WHERE id = p_reward_id;

  RETURN QUERY SELECT
    v_reward.gold_reward,
    v_reward.enhancement_ticket_level,
    v_reward.enhancement_ticket_count,
    v_reward.reward_items;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 미수령 시즌 보상 조회 함수 업데이트
CREATE OR REPLACE FUNCTION get_unclaimed_season_rewards(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  season_id UUID,
  season_name VARCHAR(100),
  final_rank INTEGER,
  final_floor INTEGER,
  gold_reward INTEGER,
  enhancement_ticket_level INTEGER,
  enhancement_ticket_count INTEGER,
  reward_items JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tsur.id,
    tsur.season_id,
    ts.name as season_name,
    tsur.final_rank,
    tsur.final_floor,
    tsur.gold_reward,
    tsur.enhancement_ticket_level,
    tsur.enhancement_ticket_count,
    tsur.reward_items
  FROM tower_season_user_rewards tsur
  JOIN tower_seasons ts ON ts.id = tsur.season_id
  WHERE tsur.user_id = p_user_id
    AND tsur.is_claimed = FALSE
  ORDER BY ts.ends_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 완료 메시지
-- =============================================
DO $$
BEGIN
  RAISE NOTICE 'Flexible reward items system migration completed successfully!';
END $$;
