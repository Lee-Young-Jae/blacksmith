-- =============================================
-- 업적 시스템 + 프로필 테두리
-- =============================================

-- 업적/테두리 정의 테이블
CREATE TABLE achievement_borders (
  id VARCHAR(50) PRIMARY KEY,
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('common', 'rare', 'epic', 'unique', 'legendary')),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  border_class VARCHAR(100),
  unlock_condition JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 유저 업적 진행 테이블
CREATE TABLE user_achievements (
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  border_id VARCHAR(50) NOT NULL REFERENCES achievement_borders(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  is_unlocked BOOLEAN DEFAULT FALSE,
  unlocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, border_id)
);

-- user_profiles에 장착 테두리 추가
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS equipped_border VARCHAR(50);

-- =============================================
-- 인덱스
-- =============================================
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_unlocked ON user_achievements(user_id, is_unlocked);
CREATE INDEX idx_achievement_borders_tier ON achievement_borders(tier);

-- =============================================
-- RLS 정책
-- =============================================
ALTER TABLE achievement_borders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- 업적 정의는 모두 읽기 가능
CREATE POLICY "Achievement borders are publicly readable"
  ON achievement_borders FOR SELECT
  USING (true);

-- 유저 업적은 본인만 조회/수정
CREATE POLICY "Users can read own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own achievements"
  ON user_achievements FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================
-- 트리거: updated_at 자동 업데이트
-- =============================================
CREATE TRIGGER update_user_achievements_updated_at
  BEFORE UPDATE ON user_achievements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 초기 업적 데이터
-- =============================================

-- 전투 관련 업적
INSERT INTO achievement_borders (id, tier, name, description, border_class, unlock_condition) VALUES
('first_win', 'common', '첫 승리', '첫 PvP 승리를 거두세요', 'ring-2 ring-gray-400', '{"type": "pvp_wins", "target": 1, "category": "battle"}'),
('warrior_10', 'common', '전사의 길', 'PvP에서 10승을 달성하세요', 'ring-2 ring-gray-500', '{"type": "pvp_wins", "target": 10, "category": "battle"}'),
('warrior_50', 'rare', '숙련된 전사', 'PvP에서 50승을 달성하세요', 'ring-2 ring-blue-500', '{"type": "pvp_wins", "target": 50, "category": "battle"}'),
('warrior_100', 'epic', '백전노장', 'PvP에서 100승을 달성하세요', 'ring-3 ring-purple-500 shadow-lg shadow-purple-500/30', '{"type": "pvp_wins", "target": 100, "category": "battle"}'),
('champion', 'legendary', '챔피언', 'PvP에서 500승을 달성하세요', 'ring-4 ring-red-500 shadow-xl shadow-red-500/40', '{"type": "pvp_wins", "target": 500, "category": "battle"}'),
('win_streak_5', 'rare', '연승의 기운', 'PvP 5연승을 달성하세요', 'ring-2 ring-blue-400', '{"type": "pvp_win_streak", "target": 5, "category": "battle"}'),
('win_streak_10', 'epic', '무적의 전사', 'PvP 10연승을 달성하세요', 'ring-3 ring-purple-400 shadow-lg shadow-purple-400/30', '{"type": "pvp_win_streak", "target": 10, "category": "battle"}');

-- 강화 관련 업적
INSERT INTO achievement_borders (id, tier, name, description, border_class, unlock_condition) VALUES
('star_10', 'common', '강화 입문', '10성 장비를 보유하세요', 'ring-2 ring-gray-400', '{"type": "max_star", "target": 10, "category": "enhancement"}'),
('star_15', 'rare', '강화 장인', '15성 장비를 보유하세요', 'ring-2 ring-blue-500', '{"type": "max_star", "target": 15, "category": "enhancement"}'),
('star_20', 'epic', '강화 마스터', '20성 장비를 보유하세요', 'ring-3 ring-purple-500 shadow-lg shadow-purple-500/30', '{"type": "max_star", "target": 20, "category": "enhancement"}'),
('star_25', 'legendary', '전설의 대장장이', '25성 장비를 보유하세요', 'ring-4 ring-amber-500 shadow-xl shadow-amber-500/40', '{"type": "max_star", "target": 25, "category": "enhancement"}'),
('enhance_100', 'rare', '강화 중독자', '강화를 100회 시도하세요', 'ring-2 ring-blue-400', '{"type": "enhance_count", "target": 100, "category": "enhancement"}'),
('enhance_500', 'epic', '강화의 달인', '강화를 500회 시도하세요', 'ring-3 ring-purple-400 shadow-lg shadow-purple-400/30', '{"type": "enhance_count", "target": 500, "category": "enhancement"}');

-- 수집 관련 업적
INSERT INTO achievement_borders (id, tier, name, description, border_class, unlock_condition) VALUES
('gold_10k', 'common', '재산가', '누적 10,000 골드를 획득하세요', 'ring-2 ring-yellow-600', '{"type": "total_gold", "target": 10000, "category": "collection"}'),
('gold_100k', 'rare', '부자', '누적 100,000 골드를 획득하세요', 'ring-2 ring-yellow-500', '{"type": "total_gold", "target": 100000, "category": "collection"}'),
('gold_1m', 'epic', '대부호', '누적 1,000,000 골드를 획득하세요', 'ring-3 ring-yellow-400 shadow-lg shadow-yellow-400/30', '{"type": "total_gold", "target": 1000000, "category": "collection"}'),
('collector_10', 'common', '수집 입문', '장비 10개를 보유하세요', 'ring-2 ring-gray-400', '{"type": "equipment_count", "target": 10, "category": "collection"}'),
('collector_30', 'rare', '수집가', '장비 30개를 보유하세요', 'ring-2 ring-blue-500', '{"type": "equipment_count", "target": 30, "category": "collection"}'),
('collector_50', 'epic', '수집 마니아', '장비 50개를 보유하세요', 'ring-3 ring-purple-500 shadow-lg shadow-purple-500/30', '{"type": "equipment_count", "target": 50, "category": "collection"}'),
('gacha_100', 'rare', '가챠 애호가', '가챠를 100회 돌리세요', 'ring-2 ring-pink-500', '{"type": "gacha_count", "target": 100, "category": "collection"}'),
('gacha_500', 'epic', '가챠 중독자', '가챠를 500회 돌리세요', 'ring-3 ring-pink-400 shadow-lg shadow-pink-400/30', '{"type": "gacha_count", "target": 500, "category": "collection"}');

-- =============================================
-- 유저 업적 초기화 함수 (신규 유저용)
-- =============================================
CREATE OR REPLACE FUNCTION initialize_user_achievements(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_achievements (user_id, border_id, progress, is_unlocked)
  SELECT p_user_id, id, 0, FALSE
  FROM achievement_borders
  ON CONFLICT (user_id, border_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 업적 진행 업데이트 함수
-- =============================================
CREATE OR REPLACE FUNCTION update_achievement_progress(
  p_user_id UUID,
  p_border_id VARCHAR(50),
  p_progress INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_target INTEGER;
  v_was_unlocked BOOLEAN;
BEGIN
  -- 목표값 조회
  SELECT (unlock_condition->>'target')::INTEGER INTO v_target
  FROM achievement_borders
  WHERE id = p_border_id;

  IF v_target IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 기존 해금 상태 확인
  SELECT is_unlocked INTO v_was_unlocked
  FROM user_achievements
  WHERE user_id = p_user_id AND border_id = p_border_id;

  -- 이미 해금되었으면 스킵
  IF v_was_unlocked THEN
    RETURN FALSE;
  END IF;

  -- 진행도 업데이트
  INSERT INTO user_achievements (user_id, border_id, progress, is_unlocked, unlocked_at)
  VALUES (
    p_user_id,
    p_border_id,
    p_progress,
    p_progress >= v_target,
    CASE WHEN p_progress >= v_target THEN NOW() ELSE NULL END
  )
  ON CONFLICT (user_id, border_id)
  DO UPDATE SET
    progress = GREATEST(user_achievements.progress, p_progress),
    is_unlocked = CASE
      WHEN user_achievements.is_unlocked THEN TRUE
      ELSE GREATEST(user_achievements.progress, p_progress) >= v_target
    END,
    unlocked_at = CASE
      WHEN user_achievements.is_unlocked THEN user_achievements.unlocked_at
      WHEN GREATEST(user_achievements.progress, p_progress) >= v_target THEN NOW()
      ELSE NULL
    END,
    updated_at = NOW();

  -- 새로 해금되었는지 반환
  RETURN p_progress >= v_target AND NOT COALESCE(v_was_unlocked, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 테두리 장착 함수
-- =============================================
CREATE OR REPLACE FUNCTION equip_border(
  p_user_id UUID,
  p_border_id VARCHAR(50)
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_unlocked BOOLEAN;
BEGIN
  -- NULL이면 테두리 해제
  IF p_border_id IS NULL THEN
    UPDATE user_profiles SET equipped_border = NULL WHERE id = p_user_id;
    RETURN TRUE;
  END IF;

  -- 해금 여부 확인
  SELECT is_unlocked INTO v_is_unlocked
  FROM user_achievements
  WHERE user_id = p_user_id AND border_id = p_border_id;

  IF NOT COALESCE(v_is_unlocked, FALSE) THEN
    RETURN FALSE;
  END IF;

  -- 테두리 장착
  UPDATE user_profiles SET equipped_border = p_border_id WHERE id = p_user_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
