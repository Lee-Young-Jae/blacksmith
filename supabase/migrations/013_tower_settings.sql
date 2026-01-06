-- =============================================
-- 무한의 탑 설정 및 관리자 제어 마이그레이션
-- =============================================

-- 1. 게임 설정 테이블 생성
CREATE TABLE IF NOT EXISTS game_settings (
  key VARCHAR(50) PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_by UUID REFERENCES user_profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 초기 설정 삽입 (무한탑 기본 닫힘)
INSERT INTO game_settings (key, value)
VALUES ('tower_status', '{"is_open": false, "message": "현재 무한의 탑은 점검 중입니다."}')
ON CONFLICT (key) DO NOTHING;

-- 3. RLS 정책
ALTER TABLE game_settings ENABLE ROW LEVEL SECURITY;

-- 누구나 설정 읽기 가능
CREATE POLICY "Game settings are publicly readable"
  ON game_settings FOR SELECT USING (true);

-- 관리자만 설정 변경 가능
CREATE POLICY "Only admins can update game settings"
  ON game_settings FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- 4. 무한탑 상태 조회 함수
CREATE OR REPLACE FUNCTION get_tower_status()
RETURNS TABLE (
  is_open BOOLEAN,
  message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (value->>'is_open')::BOOLEAN as is_open,
    (value->>'message')::TEXT as message
  FROM game_settings
  WHERE key = 'tower_status';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 무한탑 상태 변경 함수 (관리자 전용)
CREATE OR REPLACE FUNCTION set_tower_status(
  p_admin_id UUID,
  p_is_open BOOLEAN,
  p_message TEXT DEFAULT NULL
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
    RAISE EXCEPTION 'Only admins can change tower status';
  END IF;

  -- 설정 업데이트
  UPDATE game_settings
  SET
    value = jsonb_build_object(
      'is_open', p_is_open,
      'message', COALESCE(p_message, CASE
        WHEN p_is_open THEN '무한의 탑이 오픈되었습니다!'
        ELSE '현재 무한의 탑은 점검 중입니다.'
      END)
    ),
    updated_by = p_admin_id,
    updated_at = NOW()
  WHERE key = 'tower_status';

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 리더보드 함수 업데이트 (아바타 URL 추가)
-- 기존 함수 삭제 (반환 타입 변경을 위해 필요)
DROP FUNCTION IF EXISTS get_tower_leaderboard(INTEGER);

CREATE OR REPLACE FUNCTION get_tower_leaderboard(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  user_id UUID,
  username VARCHAR(50),
  avatar_url TEXT,
  highest_floor INTEGER,
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tr.user_id,
    up.username,
    up.avatar_url,
    tr.highest_floor,
    ROW_NUMBER() OVER (ORDER BY tr.highest_floor DESC, tr.updated_at ASC) as rank
  FROM tower_records tr
  JOIN user_profiles up ON up.id = tr.user_id
  WHERE tr.highest_floor > 0
  ORDER BY tr.highest_floor DESC, tr.updated_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 완료 메시지
-- =============================================
DO $$
BEGIN
  RAISE NOTICE 'Tower settings migration completed successfully!';
END $$;
