-- =============================================
-- 장비 시스템 마이그레이션
-- 다중 장비 + 스탯 + 잠재옵션 + PvP
-- =============================================
-- NOTE: 장비 기본 데이터(equipment_bases)는 프론트엔드 TypeScript 파일에서 관리
-- src/data/equipment/ 디렉토리 참조

-- =============================================
-- 1. 유저 장비 인스턴스 테이블
-- =============================================
CREATE TABLE IF NOT EXISTS user_equipment (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  equipment_base_id VARCHAR(100) NOT NULL, -- 프론트엔드 장비 데이터 ID 참조
  rarity VARCHAR(20) NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'unique', 'legendary')),
  star_level INTEGER NOT NULL DEFAULT 0 CHECK (star_level >= 0 AND star_level <= 25),
  consecutive_fails INTEGER NOT NULL DEFAULT 0,
  potential_tier VARCHAR(20) NOT NULL DEFAULT 'common' CHECK (potential_tier IN ('common', 'rare', 'epic', 'unique', 'legendary')),
  is_equipped BOOLEAN NOT NULL DEFAULT FALSE,
  equipped_slot VARCHAR(20) CHECK (equipped_slot IS NULL OR equipped_slot IN ('hat', 'top', 'bottom', 'weapon', 'gloves', 'shoes', 'earring')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 슬롯당 하나만 착용 가능 제약
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_equipment_equipped_slot
  ON user_equipment(user_id, equipped_slot)
  WHERE is_equipped = TRUE;

-- =============================================
-- 3. 장비 잠재옵션 테이블
-- =============================================
CREATE TABLE IF NOT EXISTS equipment_potentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES user_equipment(id) ON DELETE CASCADE,
  line_index INTEGER NOT NULL CHECK (line_index >= 0 AND line_index <= 2),
  stat_type VARCHAR(20) NOT NULL CHECK (stat_type IN ('attack', 'defense', 'hp', 'critRate', 'critDamage', 'penetration')),
  stat_value INTEGER NOT NULL,
  is_percentage BOOLEAN NOT NULL DEFAULT FALSE,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(equipment_id, line_index)
);

-- =============================================
-- 4. PvP 배틀 기록 테이블
-- =============================================
CREATE TABLE IF NOT EXISTS pvp_battles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  attacker_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  defender_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- 스냅샷 (JSON)
  attacker_snapshot JSONB NOT NULL,
  defender_snapshot JSONB NOT NULL,

  -- 배틀 결과
  attacker_damage INTEGER NOT NULL,
  defender_damage INTEGER NOT NULL,
  attacker_crit BOOLEAN NOT NULL DEFAULT FALSE,
  defender_crit BOOLEAN NOT NULL DEFAULT FALSE,
  winner_id UUID REFERENCES user_profiles(id),
  result VARCHAR(20) NOT NULL CHECK (result IN ('attacker_win', 'defender_win', 'draw')),

  -- 보상
  attacker_reward INTEGER NOT NULL DEFAULT 0,
  defender_reward INTEGER NOT NULL DEFAULT 0,
  attacker_rating_change INTEGER NOT NULL DEFAULT 0,
  defender_rating_change INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 5. PvP 랭킹 테이블
-- =============================================
CREATE TABLE IF NOT EXISTS pvp_rankings (
  user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL DEFAULT 1000,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  win_streak INTEGER NOT NULL DEFAULT 0,
  highest_rating INTEGER NOT NULL DEFAULT 1000,
  combat_power INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 6. 가챠 천장 추적 테이블
-- =============================================
CREATE TABLE IF NOT EXISTS gacha_pity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  banner_id VARCHAR(100) NOT NULL,
  banner_type VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (banner_type IN ('normal', 'premium', 'event')),
  pull_count INTEGER NOT NULL DEFAULT 0,
  last_pull_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, banner_id)
);

-- =============================================
-- 7. 일일 PvP 기록 테이블
-- =============================================
CREATE TABLE IF NOT EXISTS daily_pvp (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  battle_date DATE NOT NULL DEFAULT CURRENT_DATE,
  battle_count INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  gold_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, battle_date)
);

-- =============================================
-- 인덱스
-- =============================================
CREATE INDEX IF NOT EXISTS idx_user_equipment_user_id ON user_equipment(user_id);
CREATE INDEX IF NOT EXISTS idx_user_equipment_slot ON user_equipment(user_id, equipped_slot) WHERE is_equipped = TRUE;
CREATE INDEX IF NOT EXISTS idx_equipment_potentials_equipment_id ON equipment_potentials(equipment_id);
CREATE INDEX IF NOT EXISTS idx_pvp_battles_attacker ON pvp_battles(attacker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pvp_battles_defender ON pvp_battles(defender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pvp_rankings_rating ON pvp_rankings(rating DESC);
CREATE INDEX IF NOT EXISTS idx_pvp_rankings_combat_power ON pvp_rankings(combat_power DESC);
CREATE INDEX IF NOT EXISTS idx_gacha_pity_user_banner ON gacha_pity(user_id, banner_id);
CREATE INDEX IF NOT EXISTS idx_daily_pvp_user_date ON daily_pvp(user_id, battle_date);

-- =============================================
-- 트리거: updated_at 자동 업데이트
-- =============================================
CREATE TRIGGER update_user_equipment_updated_at
  BEFORE UPDATE ON user_equipment
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_potentials_updated_at
  BEFORE UPDATE ON equipment_potentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pvp_rankings_updated_at
  BEFORE UPDATE ON pvp_rankings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_pvp_updated_at
  BEFORE UPDATE ON daily_pvp
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- RLS (Row Level Security)
-- =============================================
ALTER TABLE user_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_potentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE pvp_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pvp_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gacha_pity ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_pvp ENABLE ROW LEVEL SECURITY;

-- 유저 장비
CREATE POLICY "Users can read own equipment"
  ON user_equipment FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own equipment"
  ON user_equipment FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own equipment"
  ON user_equipment FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own equipment"
  ON user_equipment FOR DELETE USING (auth.uid() = user_id);

-- 장비 잠재옵션
CREATE POLICY "Users can read own equipment potentials"
  ON equipment_potentials FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_equipment ue
    WHERE ue.id = equipment_potentials.equipment_id
    AND ue.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own equipment potentials"
  ON equipment_potentials FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_equipment ue
    WHERE ue.id = equipment_potentials.equipment_id
    AND ue.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own equipment potentials"
  ON equipment_potentials FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_equipment ue
    WHERE ue.id = equipment_potentials.equipment_id
    AND ue.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own equipment potentials"
  ON equipment_potentials FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM user_equipment ue
    WHERE ue.id = equipment_potentials.equipment_id
    AND ue.user_id = auth.uid()
  ));

-- PvP 배틀 (자신의 배틀만 조회 가능)
CREATE POLICY "Users can read own battles"
  ON pvp_battles FOR SELECT
  USING (auth.uid() = attacker_id OR auth.uid() = defender_id);

CREATE POLICY "Users can insert battles as attacker"
  ON pvp_battles FOR INSERT
  WITH CHECK (auth.uid() = attacker_id);

-- PvP 랭킹 (공개 읽기)
CREATE POLICY "Rankings are publicly readable"
  ON pvp_rankings FOR SELECT USING (true);

CREATE POLICY "Users can insert own ranking"
  ON pvp_rankings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ranking"
  ON pvp_rankings FOR UPDATE USING (auth.uid() = user_id);

-- 가챠 천장
CREATE POLICY "Users can read own pity"
  ON gacha_pity FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pity"
  ON gacha_pity FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pity"
  ON gacha_pity FOR UPDATE USING (auth.uid() = user_id);

-- 일일 PvP
CREATE POLICY "Users can read own daily pvp"
  ON daily_pvp FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily pvp"
  ON daily_pvp FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily pvp"
  ON daily_pvp FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- 헬퍼 함수: PvP 상대 검색
-- =============================================
CREATE OR REPLACE FUNCTION get_pvp_opponents(
  p_user_id UUID,
  p_combat_power INTEGER,
  p_range INTEGER DEFAULT 200,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  username VARCHAR(50),
  rating INTEGER,
  combat_power INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pr.user_id,
    up.username,
    pr.rating,
    pr.combat_power
  FROM pvp_rankings pr
  JOIN user_profiles up ON up.id = pr.user_id
  WHERE pr.user_id != p_user_id
    AND pr.combat_power BETWEEN (p_combat_power - p_range) AND (p_combat_power + p_range)
  ORDER BY RANDOM()
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 헬퍼 함수: 오늘의 PvP 횟수 조회
-- =============================================
CREATE OR REPLACE FUNCTION get_today_pvp_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COALESCE(battle_count, 0) INTO v_count
  FROM daily_pvp
  WHERE user_id = p_user_id AND battle_date = CURRENT_DATE;

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 헬퍼 함수: PvP 랭킹 조회 (순위 포함)
-- =============================================
CREATE OR REPLACE FUNCTION get_pvp_leaderboard(p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  username VARCHAR(50),
  rating INTEGER,
  wins INTEGER,
  losses INTEGER,
  win_streak INTEGER,
  combat_power INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY pr.rating DESC) as rank,
    pr.user_id,
    up.username,
    pr.rating,
    pr.wins,
    pr.losses,
    pr.win_streak,
    pr.combat_power
  FROM pvp_rankings pr
  JOIN user_profiles up ON up.id = pr.user_id
  ORDER BY pr.rating DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 완료 메시지
-- =============================================
DO $$
BEGIN
  RAISE NOTICE 'Equipment system migration completed successfully!';
END $$;
