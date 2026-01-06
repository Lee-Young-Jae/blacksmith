-- =============================================
-- 무한의 탑 시즌 시스템 마이그레이션
-- 강화권 보상 시스템 포함
-- =============================================

-- 0. 유저 강화권 인벤토리 테이블
CREATE TABLE IF NOT EXISTS user_enhancement_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  ticket_level INTEGER NOT NULL CHECK (ticket_level >= 1 AND ticket_level <= 25),  -- 강화권 레벨 (예: 17 = 17성 강화권)
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, ticket_level)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_user_enhancement_tickets_user ON user_enhancement_tickets(user_id);

-- RLS
ALTER TABLE user_enhancement_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own enhancement tickets"
  ON user_enhancement_tickets FOR SELECT
  USING (auth.uid() = user_id);

-- 강화권 추가 함수
CREATE OR REPLACE FUNCTION add_enhancement_tickets(
  p_user_id UUID,
  p_ticket_level INTEGER,
  p_quantity INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_new_quantity INTEGER;
BEGIN
  INSERT INTO user_enhancement_tickets (user_id, ticket_level, quantity)
  VALUES (p_user_id, p_ticket_level, p_quantity)
  ON CONFLICT (user_id, ticket_level)
  DO UPDATE SET
    quantity = user_enhancement_tickets.quantity + p_quantity,
    updated_at = NOW()
  RETURNING quantity INTO v_new_quantity;

  RETURN v_new_quantity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 강화권 사용 함수
CREATE OR REPLACE FUNCTION use_enhancement_ticket(
  p_user_id UUID,
  p_ticket_level INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_quantity INTEGER;
BEGIN
  SELECT quantity INTO v_current_quantity
  FROM user_enhancement_tickets
  WHERE user_id = p_user_id AND ticket_level = p_ticket_level;

  IF v_current_quantity IS NULL OR v_current_quantity < 1 THEN
    RETURN FALSE;
  END IF;

  UPDATE user_enhancement_tickets
  SET quantity = quantity - 1, updated_at = NOW()
  WHERE user_id = p_user_id AND ticket_level = p_ticket_level;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 유저 강화권 목록 조회 함수
CREATE OR REPLACE FUNCTION get_user_enhancement_tickets(p_user_id UUID)
RETURNS TABLE (
  ticket_level INTEGER,
  quantity INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT uet.ticket_level, uet.quantity
  FROM user_enhancement_tickets uet
  WHERE uet.user_id = p_user_id AND uet.quantity > 0
  ORDER BY uet.ticket_level DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 시즌 시스템 테이블
-- =============================================

-- 1. 시즌 테이블
CREATE TABLE IF NOT EXISTS tower_seasons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  rewards_distributed BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 시즌 보상 티어 테이블
CREATE TABLE IF NOT EXISTS tower_season_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id UUID NOT NULL REFERENCES tower_seasons(id) ON DELETE CASCADE,
  rank_from INTEGER NOT NULL,                        -- 시작 순위 (예: 1)
  rank_to INTEGER NOT NULL,                          -- 끝 순위 (예: 3, 1~3위)
  gold_reward INTEGER DEFAULT 0,                     -- 골드 보상
  enhancement_ticket_level INTEGER DEFAULT 0,        -- 강화권 레벨 (0이면 없음)
  enhancement_ticket_count INTEGER DEFAULT 0,        -- 강화권 개수
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_rank_range CHECK (rank_from <= rank_to AND rank_from >= 1)
);

-- 3. 유저별 시즌 보상 (수령 대기)
CREATE TABLE IF NOT EXISTS tower_season_user_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id UUID NOT NULL REFERENCES tower_seasons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  final_rank INTEGER NOT NULL,
  final_floor INTEGER NOT NULL,
  gold_reward INTEGER DEFAULT 0,
  enhancement_ticket_level INTEGER DEFAULT 0,
  enhancement_ticket_count INTEGER DEFAULT 0,
  is_claimed BOOLEAN DEFAULT FALSE,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(season_id, user_id)
);

-- 4. 인덱스
CREATE INDEX IF NOT EXISTS idx_tower_seasons_active ON tower_seasons(is_active);
CREATE INDEX IF NOT EXISTS idx_tower_seasons_ends_at ON tower_seasons(ends_at);
CREATE INDEX IF NOT EXISTS idx_tower_season_rewards_season ON tower_season_rewards(season_id);
CREATE INDEX IF NOT EXISTS idx_tower_season_user_rewards_user ON tower_season_user_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_tower_season_user_rewards_claimed ON tower_season_user_rewards(is_claimed);

-- 5. RLS 정책
ALTER TABLE tower_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE tower_season_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE tower_season_user_rewards ENABLE ROW LEVEL SECURITY;

-- 시즌 정보는 누구나 읽기 가능
CREATE POLICY "Tower seasons are publicly readable"
  ON tower_seasons FOR SELECT USING (true);

-- 시즌 보상 티어는 누구나 읽기 가능
CREATE POLICY "Tower season rewards are publicly readable"
  ON tower_season_rewards FOR SELECT USING (true);

-- 유저 보상은 본인만 읽기 가능
CREATE POLICY "Users can read own season rewards"
  ON tower_season_user_rewards FOR SELECT
  USING (auth.uid() = user_id);

-- 6. 업데이트 트리거
CREATE TRIGGER update_tower_seasons_updated_at
  BEFORE UPDATE ON tower_seasons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_enhancement_tickets_updated_at
  BEFORE UPDATE ON user_enhancement_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. 현재 활성 시즌 조회 함수
CREATE OR REPLACE FUNCTION get_active_tower_season()
RETURNS TABLE (
  id UUID,
  name VARCHAR(100),
  description TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  time_remaining_ms BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ts.id,
    ts.name,
    ts.description,
    ts.starts_at,
    ts.ends_at,
    EXTRACT(EPOCH FROM (ts.ends_at - NOW()))::BIGINT * 1000 as time_remaining_ms
  FROM tower_seasons ts
  WHERE ts.is_active = TRUE
    AND ts.ends_at > NOW()
  ORDER BY ts.ends_at ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 시즌 보상 티어 조회 함수
CREATE OR REPLACE FUNCTION get_season_reward_tiers(p_season_id UUID)
RETURNS TABLE (
  rank_from INTEGER,
  rank_to INTEGER,
  gold_reward INTEGER,
  enhancement_ticket_level INTEGER,
  enhancement_ticket_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tsr.rank_from,
    tsr.rank_to,
    tsr.gold_reward,
    tsr.enhancement_ticket_level,
    tsr.enhancement_ticket_count
  FROM tower_season_rewards tsr
  WHERE tsr.season_id = p_season_id
  ORDER BY tsr.rank_from ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. 시즌 생성 함수 (관리자 전용)
CREATE OR REPLACE FUNCTION create_tower_season(
  p_admin_id UUID,
  p_name VARCHAR(100),
  p_description TEXT,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ,
  p_rewards JSONB  -- [{ rank_from, rank_to, gold_reward, enhancement_ticket_level, enhancement_ticket_count }]
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
      enhancement_ticket_level, enhancement_ticket_count
    )
    VALUES (
      v_season_id,
      (v_reward->>'rankFrom')::INTEGER,
      (v_reward->>'rankTo')::INTEGER,
      COALESCE((v_reward->>'goldReward')::INTEGER, 0),
      COALESCE((v_reward->>'enhancementTicketLevel')::INTEGER, 0),
      COALESCE((v_reward->>'enhancementTicketCount')::INTEGER, 0)
    );
  END LOOP;

  RETURN v_season_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. 시즌 활성화 함수 (관리자 전용)
CREATE OR REPLACE FUNCTION activate_tower_season(
  p_admin_id UUID,
  p_season_id UUID
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

  -- 타워 오픈 (game_settings 테이블이 있는 경우에만)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'game_settings') THEN
    UPDATE game_settings
    SET value = jsonb_build_object('is_open', TRUE, 'message', '시즌이 시작되었습니다!'),
        updated_by = p_admin_id,
        updated_at = NOW()
    WHERE key = 'tower_status';
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. 시즌 종료 및 보상 배분 함수 (관리자 전용)
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
        gold_reward, enhancement_ticket_level, enhancement_ticket_count
      )
      VALUES (
        p_season_id,
        v_user.user_id,
        v_user.rank,
        v_user.highest_floor,
        v_reward_tier.gold_reward,
        v_reward_tier.enhancement_ticket_level,
        v_reward_tier.enhancement_ticket_count
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

-- 12. 시즌 보상 수령 함수
CREATE OR REPLACE FUNCTION claim_tower_season_reward(
  p_user_id UUID,
  p_reward_id UUID
)
RETURNS TABLE (
  gold_claimed INTEGER,
  ticket_level_claimed INTEGER,
  ticket_count_claimed INTEGER
) AS $$
DECLARE
  v_reward RECORD;
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

  -- 수령 처리
  UPDATE tower_season_user_rewards
  SET is_claimed = TRUE, claimed_at = NOW()
  WHERE id = p_reward_id;

  RETURN QUERY SELECT
    v_reward.gold_reward,
    v_reward.enhancement_ticket_level,
    v_reward.enhancement_ticket_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. 미수령 시즌 보상 조회 함수
CREATE OR REPLACE FUNCTION get_unclaimed_season_rewards(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  season_id UUID,
  season_name VARCHAR(100),
  final_rank INTEGER,
  final_floor INTEGER,
  gold_reward INTEGER,
  enhancement_ticket_level INTEGER,
  enhancement_ticket_count INTEGER
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
    tsur.enhancement_ticket_count
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
  RAISE NOTICE 'Tower season system with enhancement tickets migration completed successfully!';
END $$;
