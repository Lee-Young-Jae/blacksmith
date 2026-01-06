-- =============================================
-- 유연한 보상 시스템 마이그레이션
-- game_settings 의존성 제거 및 다양한 보상 아이템 지원
-- =============================================

-- =============================================
-- 1. 보상 아이템 타입 테이블 (확장 가능)
-- =============================================

CREATE TABLE IF NOT EXISTS reward_item_types (
  id VARCHAR(50) PRIMARY KEY,            -- 'gold', 'enhancement_ticket', 'custom_item' 등
  display_name VARCHAR(100) NOT NULL,    -- '골드', '17성 강화권' 등
  description TEXT,
  icon VARCHAR(50),                      -- 아이콘 이모지 또는 클래스
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기본 보상 타입 추가
INSERT INTO reward_item_types (id, display_name, description, icon) VALUES
  ('gold', '골드', '게임 내 기본 화폐', '💰'),
  ('enhancement_ticket', '강화권', 'N성 강화권 - 장비를 해당 성급으로 즉시 강화', '🎫')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 2. 시즌 보상 테이블에 유연한 보상 컬럼 추가
-- =============================================

-- tower_season_rewards에 reward_items JSONB 추가
ALTER TABLE tower_season_rewards
ADD COLUMN IF NOT EXISTS reward_items JSONB DEFAULT '[]'::JSONB;

-- tower_season_user_rewards에 reward_items JSONB 추가
ALTER TABLE tower_season_user_rewards
ADD COLUMN IF NOT EXISTS reward_items JSONB DEFAULT '[]'::JSONB;

-- =============================================
-- 3. 시즌 활성화 함수 업데이트 (game_settings 제거 + 기록 초기화)
-- =============================================

CREATE OR REPLACE FUNCTION activate_tower_season(
  p_admin_id UUID,
  p_season_id UUID,
  p_reset_records BOOLEAN DEFAULT TRUE  -- 기록 초기화 여부
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- 관리자 권한 확인
  SELECT is_admin INTO v_is_admin
  FROM user_profiles
  WHERE id = p_admin_id;

  IF v_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Only admins can activate seasons';
  END IF;

  -- 기존 활성 시즌 비활성화
  UPDATE tower_seasons SET is_active = FALSE WHERE is_active = TRUE;

  -- 해당 시즌 활성화
  UPDATE tower_seasons SET is_active = TRUE WHERE id = p_season_id;

  -- 시즌 시작 시 모든 유저의 타워 기록 초기화
  IF p_reset_records THEN
    UPDATE tower_records SET
      highest_floor = 0,
      current_floor = 1,
      first_clear_milestones = '{}',
      total_attempts = 0,
      updated_at = NOW()
    WHERE true;  -- RLS 정책으로 인해 WHERE 절 필요
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 4. 시즌 종료 함수 업데이트 (game_settings 제거 + 유연한 보상)
-- =============================================

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
  v_reward_items JSONB;
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
      -- 유연한 보상 아이템 빌드 (기존 + 새 형식 지원)
      v_reward_items := COALESCE(v_reward_tier.reward_items, '[]'::JSONB);

      -- 기존 형식의 보상도 reward_items에 병합
      IF v_reward_tier.gold_reward > 0 THEN
        v_reward_items := v_reward_items || jsonb_build_array(
          jsonb_build_object('type', 'gold', 'amount', v_reward_tier.gold_reward)
        );
      END IF;

      IF v_reward_tier.enhancement_ticket_level > 0 AND v_reward_tier.enhancement_ticket_count > 0 THEN
        v_reward_items := v_reward_items || jsonb_build_array(
          jsonb_build_object(
            'type', 'enhancement_ticket',
            'level', v_reward_tier.enhancement_ticket_level,
            'count', v_reward_tier.enhancement_ticket_count
          )
        );
      END IF;

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
        v_reward_items
      )
      ON CONFLICT (season_id, user_id) DO NOTHING;

      v_distributed_count := v_distributed_count + 1;
    END IF;
  END LOOP;

  -- 시즌 종료 처리
  UPDATE tower_seasons
  SET is_active = FALSE, rewards_distributed = TRUE
  WHERE id = p_season_id;

  RETURN v_distributed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. 시즌 생성 함수 업데이트 (유연한 보상 지원)
-- =============================================

CREATE OR REPLACE FUNCTION create_tower_season(
  p_admin_id UUID,
  p_name VARCHAR(100),
  p_description TEXT,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ,
  p_rewards JSONB  -- [{ rankFrom, rankTo, goldReward, enhancementTicketLevel, enhancementTicketCount, rewardItems: [...] }]
)
RETURNS UUID AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_season_id UUID;
  v_reward JSONB;
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
    INSERT INTO tower_season_rewards (
      season_id, rank_from, rank_to, gold_reward,
      enhancement_ticket_level, enhancement_ticket_count, reward_items
    )
    VALUES (
      v_season_id,
      (v_reward->>'rankFrom')::INTEGER,
      (v_reward->>'rankTo')::INTEGER,
      COALESCE((v_reward->>'goldReward')::INTEGER, 0),
      COALESCE((v_reward->>'enhancementTicketLevel')::INTEGER, 0),
      COALESCE((v_reward->>'enhancementTicketCount')::INTEGER, 0),
      COALESCE(v_reward->'rewardItems', '[]'::JSONB)
    );
  END LOOP;

  RETURN v_season_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 6. 보상 수령 함수 업데이트 (유연한 보상 지원)
-- =============================================

-- 반환 타입이 변경되므로 기존 함수 삭제 필요
DROP FUNCTION IF EXISTS claim_tower_season_reward(UUID, UUID);

CREATE OR REPLACE FUNCTION claim_tower_season_reward(
  p_user_id UUID,
  p_reward_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_reward RECORD;
  v_item JSONB;
  v_claimed_items JSONB := '[]'::JSONB;
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

  -- 보상 아이템 처리
  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_reward.reward_items, '[]'::JSONB))
  LOOP
    CASE v_item->>'type'
      WHEN 'gold' THEN
        UPDATE user_profiles
        SET gold = gold + (v_item->>'amount')::INTEGER
        WHERE id = p_user_id;
        v_claimed_items := v_claimed_items || v_item;

      WHEN 'enhancement_ticket' THEN
        PERFORM add_enhancement_tickets(
          p_user_id,
          (v_item->>'level')::INTEGER,
          (v_item->>'count')::INTEGER
        );
        v_claimed_items := v_claimed_items || v_item;

      -- 추후 다른 보상 타입 추가 시 여기에 CASE 추가
      ELSE
        -- 알 수 없는 타입은 로깅만 하고 계속 진행
        RAISE NOTICE 'Unknown reward type: %', v_item->>'type';
    END CASE;
  END LOOP;

  -- 기존 형식 보상도 처리 (하위 호환성)
  IF v_reward.gold_reward > 0 AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_claimed_items) AS item
    WHERE item->>'type' = 'gold'
  ) THEN
    UPDATE user_profiles
    SET gold = gold + v_reward.gold_reward
    WHERE id = p_user_id;
  END IF;

  IF v_reward.enhancement_ticket_level > 0 AND v_reward.enhancement_ticket_count > 0 AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_claimed_items) AS item
    WHERE item->>'type' = 'enhancement_ticket'
  ) THEN
    PERFORM add_enhancement_tickets(
      p_user_id,
      v_reward.enhancement_ticket_level,
      v_reward.enhancement_ticket_count
    );
  END IF;

  -- 수령 처리
  UPDATE tower_season_user_rewards
  SET is_claimed = TRUE, claimed_at = NOW()
  WHERE id = p_reward_id;

  -- 수령한 보상 정보 반환
  RETURN jsonb_build_object(
    'success', TRUE,
    'goldReward', v_reward.gold_reward,
    'enhancementTicketLevel', v_reward.enhancement_ticket_level,
    'enhancementTicketCount', v_reward.enhancement_ticket_count,
    'rewardItems', v_reward.reward_items
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 7. 미수령 보상 조회 함수 업데이트
-- =============================================

-- 반환 컬럼이 추가되므로 기존 함수 삭제 필요
DROP FUNCTION IF EXISTS get_unclaimed_season_rewards(UUID);

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
    COALESCE(tsur.reward_items, '[]'::JSONB) as reward_items
  FROM tower_season_user_rewards tsur
  JOIN tower_seasons ts ON ts.id = tsur.season_id
  WHERE tsur.user_id = p_user_id
    AND tsur.is_claimed = FALSE
  ORDER BY ts.ends_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 8. 시즌 보상 티어 조회 함수 업데이트
-- =============================================

-- 반환 컬럼이 추가되므로 기존 함수 삭제 필요
DROP FUNCTION IF EXISTS get_season_reward_tiers(UUID);

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
    COALESCE(tsr.reward_items, '[]'::JSONB) as reward_items
  FROM tower_season_rewards tsr
  WHERE tsr.season_id = p_season_id
  ORDER BY tsr.rank_from ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 9. 만료된 시즌 자동 종료 함수 (누구나 호출 가능)
-- =============================================

CREATE OR REPLACE FUNCTION auto_end_expired_seasons()
RETURNS TABLE (
  season_id UUID,
  season_name VARCHAR(100),
  rewards_distributed INTEGER
) AS $$
DECLARE
  v_expired_season RECORD;
  v_reward_tier RECORD;
  v_user RECORD;
  v_distributed_count INTEGER;
  v_reward_items JSONB;
BEGIN
  -- 만료되었지만 아직 종료되지 않은 시즌 찾기
  FOR v_expired_season IN
    SELECT ts.id, ts.name
    FROM tower_seasons ts
    WHERE ts.is_active = TRUE
      AND ts.ends_at < NOW()
      AND ts.rewards_distributed = FALSE
  LOOP
    v_distributed_count := 0;

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
      WHERE tower_season_rewards.season_id = v_expired_season.id
        AND v_user.rank >= rank_from
        AND v_user.rank <= rank_to
      LIMIT 1;

      -- 보상이 있으면 유저 보상 레코드 생성
      IF v_reward_tier IS NOT NULL THEN
        v_reward_items := COALESCE(v_reward_tier.reward_items, '[]'::JSONB);

        IF v_reward_tier.gold_reward > 0 THEN
          v_reward_items := v_reward_items || jsonb_build_array(
            jsonb_build_object('type', 'gold', 'amount', v_reward_tier.gold_reward)
          );
        END IF;

        IF v_reward_tier.enhancement_ticket_level > 0 AND v_reward_tier.enhancement_ticket_count > 0 THEN
          v_reward_items := v_reward_items || jsonb_build_array(
            jsonb_build_object(
              'type', 'enhancement_ticket',
              'level', v_reward_tier.enhancement_ticket_level,
              'count', v_reward_tier.enhancement_ticket_count
            )
          );
        END IF;

        INSERT INTO tower_season_user_rewards (
          season_id, user_id, final_rank, final_floor,
          gold_reward, enhancement_ticket_level, enhancement_ticket_count,
          reward_items
        )
        VALUES (
          v_expired_season.id,
          v_user.user_id,
          v_user.rank,
          v_user.highest_floor,
          v_reward_tier.gold_reward,
          v_reward_tier.enhancement_ticket_level,
          v_reward_tier.enhancement_ticket_count,
          v_reward_items
        )
        ON CONFLICT (season_id, user_id) DO NOTHING;

        v_distributed_count := v_distributed_count + 1;
      END IF;
    END LOOP;

    -- 시즌 종료 처리
    UPDATE tower_seasons
    SET is_active = FALSE, rewards_distributed = TRUE
    WHERE id = v_expired_season.id;

    -- 결과 반환
    season_id := v_expired_season.id;
    season_name := v_expired_season.name;
    rewards_distributed := v_distributed_count;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 완료 메시지
-- =============================================
DO $$
BEGIN
  RAISE NOTICE 'Flexible reward system migration completed successfully!';
END $$;
