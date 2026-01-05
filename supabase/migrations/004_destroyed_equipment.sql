-- =============================================
-- 파괴된 장비 복구 시스템 마이그레이션
-- =============================================

-- =============================================
-- 1. 파괴된 장비 테이블
-- =============================================
CREATE TABLE IF NOT EXISTS destroyed_equipment (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  equipment_base_id VARCHAR(100) NOT NULL,
  original_star_level INTEGER NOT NULL DEFAULT 0,
  -- 잠재옵션 스냅샷 (JSON)
  potentials_snapshot JSONB NOT NULL DEFAULT '[]',
  destroyed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 유저당 최대 5개 제한을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_destroyed_equipment_user_id
  ON destroyed_equipment(user_id, destroyed_at DESC);

-- =============================================
-- 2. 트리거: 오래된 파괴 장비 자동 삭제 (5개 초과 시)
-- =============================================
CREATE OR REPLACE FUNCTION cleanup_old_destroyed_equipment()
RETURNS TRIGGER AS $$
BEGIN
  -- 유저당 5개 초과 시 가장 오래된 것 삭제
  DELETE FROM destroyed_equipment
  WHERE id IN (
    SELECT id FROM destroyed_equipment
    WHERE user_id = NEW.user_id
    ORDER BY destroyed_at DESC
    OFFSET 5
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_destroyed_equipment
  AFTER INSERT ON destroyed_equipment
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_destroyed_equipment();

-- =============================================
-- 3. RLS (Row Level Security)
-- =============================================
ALTER TABLE destroyed_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own destroyed equipment"
  ON destroyed_equipment FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own destroyed equipment"
  ON destroyed_equipment FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own destroyed equipment"
  ON destroyed_equipment FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- 완료 메시지
-- =============================================
DO $$
BEGIN
  RAISE NOTICE 'Destroyed equipment system migration completed successfully!';
END $$;
