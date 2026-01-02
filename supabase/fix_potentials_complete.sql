-- =============================================
-- 잠재옵션 테이블 완전 수정
-- Supabase SQL Editor에서 실행하세요
-- =============================================

-- 먼저 현재 테이블 구조 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'equipment_potentials'
ORDER BY ordinal_position;

-- =============================================
-- 옵션 1: 기존 데이터가 없거나 삭제해도 되는 경우
-- 테이블을 완전히 재생성
-- =============================================

-- 기존 테이블 삭제 (주의: 데이터 손실!)
DROP TABLE IF EXISTS equipment_potentials CASCADE;

-- 테이블 새로 생성
CREATE TABLE equipment_potentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES user_equipment(id) ON DELETE CASCADE,
  line_index INTEGER NOT NULL CHECK (line_index >= 0 AND line_index <= 2),
  stat_type VARCHAR(20) NOT NULL CHECK (stat_type IN ('attack', 'defense', 'hp', 'critRate', 'critDamage', 'penetration', 'attackSpeed')),
  stat_value INTEGER NOT NULL,
  is_percentage BOOLEAN NOT NULL DEFAULT FALSE,
  tier VARCHAR(20) NOT NULL DEFAULT 'common' CHECK (tier IN ('common', 'rare', 'epic', 'unique', 'legendary')),
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  is_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(equipment_id, line_index)
);

-- 인덱스
CREATE INDEX idx_equipment_potentials_equipment_id ON equipment_potentials(equipment_id);

-- RLS 활성화
ALTER TABLE equipment_potentials ENABLE ROW LEVEL SECURITY;

-- RLS 정책
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

-- 트리거
CREATE OR REPLACE TRIGGER update_equipment_potentials_updated_at
  BEFORE UPDATE ON equipment_potentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 완료
SELECT 'equipment_potentials table recreated successfully!' as status;
