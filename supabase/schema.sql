-- =============================================
-- 대장장이 (Blacksmith) DB 스키마 v2
-- 메이플 스타포스 스타일 + 소셜 로그인
-- =============================================

-- 기존 테이블 삭제 (개발용)
DROP VIEW IF EXISTS recent_enhancements;
DROP TABLE IF EXISTS enhancement_history CASCADE;
DROP TABLE IF EXISTS daily_battles CASCADE;
DROP TABLE IF EXISTS user_weapons CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS sword_types CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =============================================
-- 유저 프로필 테이블 (Supabase Auth 연동)
-- =============================================
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50),
  gold INTEGER NOT NULL DEFAULT 10000,
  last_daily_claim DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 유저 무기 테이블
-- =============================================
CREATE TABLE user_weapons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  weapon_type_id VARCHAR(50) NOT NULL,
  weapon_name VARCHAR(100) NOT NULL,
  base_attack INTEGER NOT NULL,
  star_level INTEGER NOT NULL DEFAULT 0 CHECK (star_level >= 0),
  total_attack INTEGER NOT NULL,
  consecutive_fails INTEGER NOT NULL DEFAULT 0,
  is_destroyed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 강화 기록 테이블 (실시간 피드용)
-- =============================================
CREATE TABLE enhancement_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  weapon_id UUID REFERENCES user_weapons(id) ON DELETE SET NULL,
  weapon_name VARCHAR(100) NOT NULL,
  from_level INTEGER NOT NULL,
  to_level INTEGER NOT NULL,
  result VARCHAR(20) NOT NULL CHECK (result IN ('success', 'maintain', 'destroy')),
  was_chance_time BOOLEAN DEFAULT FALSE,
  gold_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 일일 대결 기록 테이블
-- =============================================
CREATE TABLE daily_battles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  battle_date DATE NOT NULL DEFAULT CURRENT_DATE,
  battle_count INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  gold_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, battle_date)
);

-- =============================================
-- 트리거: updated_at 자동 업데이트
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_weapons_updated_at
  BEFORE UPDATE ON user_weapons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_battles_updated_at
  BEFORE UPDATE ON daily_battles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 트리거: 새 유저 가입 시 프로필 자동 생성
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- =============================================
-- 인덱스
-- =============================================
CREATE INDEX idx_user_weapons_user_id ON user_weapons(user_id);
CREATE INDEX idx_enhancement_history_user_id ON enhancement_history(user_id);
CREATE INDEX idx_enhancement_history_created_at ON enhancement_history(created_at DESC);
CREATE INDEX idx_daily_battles_user_date ON daily_battles(user_id, battle_date);

-- =============================================
-- 실시간 피드를 위한 뷰
-- =============================================
CREATE VIEW recent_enhancements AS
SELECT
  eh.id,
  up.username,
  eh.weapon_name,
  eh.from_level,
  eh.to_level,
  eh.result,
  eh.was_chance_time,
  eh.created_at
FROM enhancement_history eh
JOIN user_profiles up ON eh.user_id = up.id
ORDER BY eh.created_at DESC
LIMIT 50;

-- =============================================
-- RLS (Row Level Security) 정책
-- =============================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_weapons ENABLE ROW LEVEL SECURITY;
ALTER TABLE enhancement_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_battles ENABLE ROW LEVEL SECURITY;

-- 유저 프로필 정책
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 유저 무기 정책
CREATE POLICY "Users can read own weapons"
  ON user_weapons FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weapons"
  ON user_weapons FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weapons"
  ON user_weapons FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weapons"
  ON user_weapons FOR DELETE
  USING (auth.uid() = user_id);

-- 강화 기록 정책 (읽기는 공개, 쓰기는 본인만)
CREATE POLICY "Enhancement history is publicly readable"
  ON enhancement_history FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own enhancement history"
  ON enhancement_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 대결 기록 정책
CREATE POLICY "Users can read own battles"
  ON daily_battles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own battles"
  ON daily_battles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own battles"
  ON daily_battles FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================
-- 유틸리티 함수: 오늘의 대결 횟수 조회
-- =============================================
CREATE OR REPLACE FUNCTION get_today_battle_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COALESCE(battle_count, 0) INTO v_count
  FROM daily_battles
  WHERE user_id = p_user_id AND battle_date = CURRENT_DATE;

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 유틸리티 함수: 대결 기록 추가/업데이트
-- =============================================
CREATE OR REPLACE FUNCTION record_battle(
  p_user_id UUID,
  p_is_win BOOLEAN,
  p_gold_earned INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  INSERT INTO daily_battles (user_id, battle_date, battle_count, wins, losses, gold_earned)
  VALUES (
    p_user_id,
    CURRENT_DATE,
    1,
    CASE WHEN p_is_win THEN 1 ELSE 0 END,
    CASE WHEN p_is_win THEN 0 ELSE 1 END,
    p_gold_earned
  )
  ON CONFLICT (user_id, battle_date)
  DO UPDATE SET
    battle_count = daily_battles.battle_count + 1,
    wins = daily_battles.wins + CASE WHEN p_is_win THEN 1 ELSE 0 END,
    losses = daily_battles.losses + CASE WHEN p_is_win THEN 0 ELSE 1 END,
    gold_earned = daily_battles.gold_earned + p_gold_earned
  RETURNING battle_count INTO v_new_count;

  RETURN v_new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Supabase Realtime 설정
-- =============================================
-- Supabase 대시보드에서 enhancement_history 테이블에 대해
-- Realtime을 활성화해주세요.
