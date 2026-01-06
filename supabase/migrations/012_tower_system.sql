-- =============================================
-- 무한의 탑 시스템 마이그레이션
-- =============================================

-- 1. 타워 기록 테이블
CREATE TABLE IF NOT EXISTS tower_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- 진행 상태
  highest_floor INTEGER NOT NULL DEFAULT 0,
  current_floor INTEGER NOT NULL DEFAULT 1,

  -- 10층 단위 최초 클리어 플래그 (배열)
  first_clear_milestones INTEGER[] DEFAULT '{}',

  -- 통계
  total_attempts INTEGER NOT NULL DEFAULT 0,
  total_gold_earned INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- 2. 인덱스
CREATE INDEX IF NOT EXISTS idx_tower_records_user ON tower_records(user_id);
CREATE INDEX IF NOT EXISTS idx_tower_records_highest ON tower_records(highest_floor DESC);

-- 3. RLS 정책
ALTER TABLE tower_records ENABLE ROW LEVEL SECURITY;

-- 타워 기록 읽기 (본인 + 리더보드용 전체 공개)
CREATE POLICY "Tower records are publicly readable"
  ON tower_records FOR SELECT USING (true);

-- 타워 기록 생성
CREATE POLICY "Users can insert own tower records"
  ON tower_records FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 타워 기록 수정
CREATE POLICY "Users can update own tower records"
  ON tower_records FOR UPDATE USING (auth.uid() = user_id);

-- 4. 업데이트 트리거
CREATE TRIGGER update_tower_records_updated_at
  BEFORE UPDATE ON tower_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. 리더보드 조회 함수
CREATE OR REPLACE FUNCTION get_tower_leaderboard(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  user_id UUID,
  username VARCHAR(50),
  highest_floor INTEGER,
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tr.user_id,
    up.username,
    tr.highest_floor,
    ROW_NUMBER() OVER (ORDER BY tr.highest_floor DESC, tr.updated_at ASC) as rank
  FROM tower_records tr
  JOIN user_profiles up ON up.id = tr.user_id
  WHERE tr.highest_floor > 0
  ORDER BY tr.highest_floor DESC, tr.updated_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 내 랭킹 조회 함수
CREATE OR REPLACE FUNCTION get_my_tower_rank(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_rank INTEGER;
BEGIN
  SELECT rank INTO v_rank
  FROM (
    SELECT
      tr.user_id,
      ROW_NUMBER() OVER (ORDER BY tr.highest_floor DESC, tr.updated_at ASC) as rank
    FROM tower_records tr
    WHERE tr.highest_floor > 0
  ) ranked
  WHERE ranked.user_id = p_user_id;

  RETURN COALESCE(v_rank, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
