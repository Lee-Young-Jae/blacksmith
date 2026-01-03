-- =============================================
-- PvP 시스템 마이그레이션
-- 다회전 턴제 + 카드 덱 + 리그 시스템
-- =============================================

-- =============================================
-- 1. 카드 인벤토리 테이블
-- =============================================
CREATE TABLE IF NOT EXISTS user_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  card_type VARCHAR(50) NOT NULL,  -- 'attack_boost', 'defense_boost', etc.
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('common', 'rare', 'epic', 'legendary')),
  value INTEGER NOT NULL,          -- 효과 수치
  is_percentage BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_cards_user_id ON user_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cards_tier ON user_cards(user_id, tier);

-- =============================================
-- 2. 방어 덱 테이블
-- =============================================
CREATE TABLE IF NOT EXISTS user_defense_deck (
  user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- 장비 스냅샷 (JSON) - 방어 시점의 장비 상태
  equipment_snapshot JSONB NOT NULL DEFAULT '{}',

  -- 총 스탯 스냅샷
  total_stats JSONB NOT NULL DEFAULT '{
    "attack": 0,
    "defense": 0,
    "hp": 0,
    "critRate": 0,
    "critDamage": 0,
    "penetration": 0,
    "attackSpeed": 0
  }',

  -- 카드 3장 (순서 중요)
  card_slot_1 UUID REFERENCES user_cards(id) ON DELETE SET NULL,
  card_slot_2 UUID REFERENCES user_cards(id) ON DELETE SET NULL,
  card_slot_3 UUID REFERENCES user_cards(id) ON DELETE SET NULL,

  -- AI 행동 패턴 설정
  ai_strategy VARCHAR(20) DEFAULT 'balanced' CHECK (ai_strategy IN ('aggressive', 'defensive', 'balanced')),

  -- 전투력 (매칭용)
  combat_power INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 3. pvp_battles 테이블 확장
-- =============================================
-- 배틀 로그 (라운드별 기록)
ALTER TABLE pvp_battles ADD COLUMN IF NOT EXISTS battle_log JSONB DEFAULT '[]';

-- 총 라운드 수
ALTER TABLE pvp_battles ADD COLUMN IF NOT EXISTS total_rounds INTEGER DEFAULT 1;

-- 공격자/방어자 카드 정보
ALTER TABLE pvp_battles ADD COLUMN IF NOT EXISTS attacker_cards JSONB DEFAULT '[]';
ALTER TABLE pvp_battles ADD COLUMN IF NOT EXISTS defender_cards JSONB DEFAULT '[]';

-- 복수전 여부
ALTER TABLE pvp_battles ADD COLUMN IF NOT EXISTS is_revenge BOOLEAN DEFAULT FALSE;

-- 방어자 알림 확인 여부
ALTER TABLE pvp_battles ADD COLUMN IF NOT EXISTS defender_notified BOOLEAN DEFAULT FALSE;

-- 공격자/방어자 최종 HP
ALTER TABLE pvp_battles ADD COLUMN IF NOT EXISTS attacker_final_hp INTEGER DEFAULT 0;
ALTER TABLE pvp_battles ADD COLUMN IF NOT EXISTS defender_final_hp INTEGER DEFAULT 0;

-- =============================================
-- 4. PvP 시즌 테이블
-- =============================================
CREATE TABLE IF NOT EXISTS pvp_seasons (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기본 시즌 삽입 (없을 경우)
INSERT INTO pvp_seasons (name, start_date, end_date, is_active)
SELECT '시즌 1', NOW(), NOW() + INTERVAL '30 days', TRUE
WHERE NOT EXISTS (SELECT 1 FROM pvp_seasons WHERE is_active = TRUE);

-- =============================================
-- 5. 시즌별 유저 기록 테이블
-- =============================================
CREATE TABLE IF NOT EXISTS pvp_season_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  season_id INTEGER NOT NULL REFERENCES pvp_seasons(id) ON DELETE CASCADE,
  final_rating INTEGER NOT NULL DEFAULT 1000,
  final_rank INTEGER,
  tier VARCHAR(20) CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond', 'master')),
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  rewards_claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, season_id)
);

CREATE INDEX IF NOT EXISTS idx_pvp_season_records_season ON pvp_season_records(season_id);
CREATE INDEX IF NOT EXISTS idx_pvp_season_records_user ON pvp_season_records(user_id);

-- =============================================
-- 6. 주간 보상 기록 테이블
-- =============================================
CREATE TABLE IF NOT EXISTS pvp_weekly_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,  -- 주의 시작일 (월요일)
  tier_at_claim VARCHAR(20) NOT NULL,
  gold_reward INTEGER NOT NULL DEFAULT 0,
  ticket_reward INTEGER NOT NULL DEFAULT 0,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_pvp_weekly_rewards_user ON pvp_weekly_rewards(user_id, week_start);

-- =============================================
-- 7. pvp_rankings 테이블 확장
-- =============================================
-- 현재 티어
ALTER TABLE pvp_rankings ADD COLUMN IF NOT EXISTS tier VARCHAR(20)
  DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond', 'master'));

-- 이번 주 대전 횟수
ALTER TABLE pvp_rankings ADD COLUMN IF NOT EXISTS weekly_battles INTEGER DEFAULT 0;

-- 마지막 주간 보상 수령일
ALTER TABLE pvp_rankings ADD COLUMN IF NOT EXISTS last_weekly_claim DATE;

-- =============================================
-- 트리거: updated_at 자동 업데이트
-- =============================================
CREATE TRIGGER update_user_defense_deck_updated_at
  BEFORE UPDATE ON user_defense_deck
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- RLS 정책
-- =============================================
ALTER TABLE user_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_defense_deck ENABLE ROW LEVEL SECURITY;
ALTER TABLE pvp_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE pvp_season_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE pvp_weekly_rewards ENABLE ROW LEVEL SECURITY;

-- 카드 인벤토리
CREATE POLICY "Users can read own cards"
  ON user_cards FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cards"
  ON user_cards FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cards"
  ON user_cards FOR DELETE USING (auth.uid() = user_id);

-- 방어 덱
CREATE POLICY "Users can read own defense deck"
  ON user_defense_deck FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Defense decks are publicly readable for matchmaking"
  ON user_defense_deck FOR SELECT USING (true);

CREATE POLICY "Users can insert own defense deck"
  ON user_defense_deck FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own defense deck"
  ON user_defense_deck FOR UPDATE USING (auth.uid() = user_id);

-- 시즌 (공개 읽기)
CREATE POLICY "Seasons are publicly readable"
  ON pvp_seasons FOR SELECT USING (true);

-- 시즌 기록
CREATE POLICY "Users can read own season records"
  ON pvp_season_records FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Season records are publicly readable"
  ON pvp_season_records FOR SELECT USING (true);

CREATE POLICY "Users can insert own season records"
  ON pvp_season_records FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own season records"
  ON pvp_season_records FOR UPDATE USING (auth.uid() = user_id);

-- 주간 보상
CREATE POLICY "Users can read own weekly rewards"
  ON pvp_weekly_rewards FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weekly rewards"
  ON pvp_weekly_rewards FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 헬퍼 함수: 티어 계산
-- =============================================
CREATE OR REPLACE FUNCTION calculate_tier(p_rating INTEGER)
RETURNS VARCHAR(20) AS $$
BEGIN
  IF p_rating >= 3000 THEN RETURN 'master';
  ELSIF p_rating >= 2500 THEN RETURN 'diamond';
  ELSIF p_rating >= 2000 THEN RETURN 'platinum';
  ELSIF p_rating >= 1500 THEN RETURN 'gold';
  ELSIF p_rating >= 1000 THEN RETURN 'silver';
  ELSE RETURN 'bronze';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================
-- 헬퍼 함수: PvP 상대 검색 (방어 덱 기준)
-- =============================================
CREATE OR REPLACE FUNCTION get_pvp_opponents_v2(
  p_user_id UUID,
  p_combat_power INTEGER,
  p_range INTEGER DEFAULT 300,
  p_limit INTEGER DEFAULT 5
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
    AND dd.combat_power BETWEEN (p_combat_power - p_range) AND (p_combat_power + p_range)
  ORDER BY RANDOM()
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 헬퍼 함수: 배틀 기록 저장 + 랭킹 업데이트
-- =============================================
CREATE OR REPLACE FUNCTION record_pvp_battle(
  p_attacker_id UUID,
  p_defender_id UUID,
  p_result VARCHAR(20),
  p_attacker_rating_change INTEGER,
  p_defender_rating_change INTEGER,
  p_attacker_reward INTEGER,
  p_defender_reward INTEGER,
  p_battle_log JSONB,
  p_total_rounds INTEGER,
  p_attacker_cards JSONB,
  p_defender_cards JSONB,
  p_attacker_snapshot JSONB,
  p_defender_snapshot JSONB,
  p_is_revenge BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
  v_battle_id UUID;
  v_attacker_new_rating INTEGER;
  v_defender_new_rating INTEGER;
BEGIN
  -- 배틀 기록 저장
  INSERT INTO pvp_battles (
    attacker_id, defender_id, result,
    attacker_rating_change, defender_rating_change,
    attacker_reward, defender_reward,
    battle_log, total_rounds,
    attacker_cards, defender_cards,
    attacker_snapshot, defender_snapshot,
    is_revenge,
    attacker_damage, defender_damage,
    winner_id
  ) VALUES (
    p_attacker_id, p_defender_id, p_result,
    p_attacker_rating_change, p_defender_rating_change,
    p_attacker_reward, p_defender_reward,
    p_battle_log, p_total_rounds,
    p_attacker_cards, p_defender_cards,
    p_attacker_snapshot, p_defender_snapshot,
    p_is_revenge,
    0, 0,
    CASE
      WHEN p_result = 'attacker_win' THEN p_attacker_id
      WHEN p_result = 'defender_win' THEN p_defender_id
      ELSE NULL
    END
  )
  RETURNING id INTO v_battle_id;

  -- 공격자 랭킹 업데이트
  INSERT INTO pvp_rankings (user_id, rating, wins, losses, draws, weekly_battles, tier)
  VALUES (
    p_attacker_id,
    1000 + p_attacker_rating_change,
    CASE WHEN p_result = 'attacker_win' THEN 1 ELSE 0 END,
    CASE WHEN p_result = 'defender_win' THEN 1 ELSE 0 END,
    CASE WHEN p_result = 'draw' THEN 1 ELSE 0 END,
    1,
    calculate_tier(1000 + p_attacker_rating_change)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    rating = pvp_rankings.rating + p_attacker_rating_change,
    wins = pvp_rankings.wins + CASE WHEN p_result = 'attacker_win' THEN 1 ELSE 0 END,
    losses = pvp_rankings.losses + CASE WHEN p_result = 'defender_win' THEN 1 ELSE 0 END,
    draws = pvp_rankings.draws + CASE WHEN p_result = 'draw' THEN 1 ELSE 0 END,
    weekly_battles = pvp_rankings.weekly_battles + 1,
    tier = calculate_tier(pvp_rankings.rating + p_attacker_rating_change),
    updated_at = NOW()
  RETURNING rating INTO v_attacker_new_rating;

  -- 방어자 랭킹 업데이트
  INSERT INTO pvp_rankings (user_id, rating, wins, losses, draws, tier)
  VALUES (
    p_defender_id,
    1000 + p_defender_rating_change,
    CASE WHEN p_result = 'defender_win' THEN 1 ELSE 0 END,
    CASE WHEN p_result = 'attacker_win' THEN 1 ELSE 0 END,
    CASE WHEN p_result = 'draw' THEN 1 ELSE 0 END,
    calculate_tier(1000 + p_defender_rating_change)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    rating = pvp_rankings.rating + p_defender_rating_change,
    wins = pvp_rankings.wins + CASE WHEN p_result = 'defender_win' THEN 1 ELSE 0 END,
    losses = pvp_rankings.losses + CASE WHEN p_result = 'attacker_win' THEN 1 ELSE 0 END,
    draws = pvp_rankings.draws + CASE WHEN p_result = 'draw' THEN 1 ELSE 0 END,
    tier = calculate_tier(pvp_rankings.rating + p_defender_rating_change),
    updated_at = NOW()
  RETURNING rating INTO v_defender_new_rating;

  -- 최고 레이팅 업데이트
  UPDATE pvp_rankings SET highest_rating = v_attacker_new_rating
  WHERE user_id = p_attacker_id AND highest_rating < v_attacker_new_rating;

  UPDATE pvp_rankings SET highest_rating = v_defender_new_rating
  WHERE user_id = p_defender_id AND highest_rating < v_defender_new_rating;

  RETURN v_battle_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 헬퍼 함수: 읽지 않은 방어 배틀 조회
-- =============================================
CREATE OR REPLACE FUNCTION get_unread_defense_battles(p_user_id UUID)
RETURNS TABLE (
  battle_id UUID,
  attacker_username VARCHAR(50),
  result VARCHAR(20),
  rating_change INTEGER,
  gold_reward INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pb.id as battle_id,
    up.username as attacker_username,
    pb.result,
    pb.defender_rating_change as rating_change,
    pb.defender_reward as gold_reward,
    pb.created_at
  FROM pvp_battles pb
  JOIN user_profiles up ON up.id = pb.attacker_id
  WHERE pb.defender_id = p_user_id
    AND pb.defender_notified = FALSE
  ORDER BY pb.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 헬퍼 함수: 방어 배틀 알림 확인 처리
-- =============================================
CREATE OR REPLACE FUNCTION mark_defense_battles_notified(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE pvp_battles
  SET defender_notified = TRUE
  WHERE defender_id = p_user_id AND defender_notified = FALSE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 완료 메시지
-- =============================================
DO $$
BEGIN
  RAISE NOTICE 'PvP system migration completed successfully!';
END $$;
