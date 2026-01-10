-- =============================================
-- 장비 세트 시스템
-- 장비 착용 구성을 세트로 저장하고 빠르게 전환
-- =============================================

-- =============================================
-- 1. 장비 세트 테이블 생성
-- =============================================
CREATE TABLE IF NOT EXISTS user_equipment_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL CHECK (set_number IN (1, 2)),  -- 세트 1 또는 2
  set_name VARCHAR(20) DEFAULT NULL,  -- 선택적 세트 이름
  -- 각 슬롯별 장비 ID (NULL = 빈 슬롯)
  equipment_ids JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- 예: {"hat": "uuid", "top": "uuid", "bottom": null, ...}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 유저당 세트 번호는 고유해야 함
  UNIQUE(user_id, set_number)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_equipment_sets_user_id ON user_equipment_sets(user_id);

-- RLS 정책
ALTER TABLE user_equipment_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own equipment sets"
  ON user_equipment_sets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 2. 세트 저장 함수 (현재 착용 상태를 세트로 저장)
-- =============================================
CREATE OR REPLACE FUNCTION save_equipment_set(
  p_user_id UUID,
  p_set_number INTEGER,
  p_set_name VARCHAR(20) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_equipment_ids JSONB := '{}'::jsonb;
  v_row RECORD;
BEGIN
  -- 현재 착용 중인 장비들 조회
  FOR v_row IN
    SELECT equipped_slot, id
    FROM user_equipment
    WHERE user_id = p_user_id AND is_equipped = true AND equipped_slot IS NOT NULL
  LOOP
    v_equipment_ids := v_equipment_ids || jsonb_build_object(v_row.equipped_slot, v_row.id::text);
  END LOOP;

  -- UPSERT: 기존 세트가 있으면 업데이트, 없으면 생성
  INSERT INTO user_equipment_sets (user_id, set_number, set_name, equipment_ids, updated_at)
  VALUES (p_user_id, p_set_number, p_set_name, v_equipment_ids, NOW())
  ON CONFLICT (user_id, set_number)
  DO UPDATE SET
    set_name = COALESCE(p_set_name, user_equipment_sets.set_name),
    equipment_ids = v_equipment_ids,
    updated_at = NOW();

  RETURN v_equipment_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 3. 세트 불러오기 함수 (세트의 장비들을 일괄 착용)
-- 반환: 성공 여부, 누락된 장비 정보
-- =============================================
CREATE OR REPLACE FUNCTION load_equipment_set(
  p_user_id UUID,
  p_set_number INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_set_record RECORD;
  v_slot TEXT;
  v_equipment_id TEXT;
  v_missing_slots TEXT[] := '{}';
  v_equipment_exists BOOLEAN;
  v_equipment_base_id TEXT;
BEGIN
  -- 세트 조회
  SELECT * INTO v_set_record
  FROM user_equipment_sets
  WHERE user_id = p_user_id AND set_number = p_set_number;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SET_NOT_FOUND',
      'message', '저장된 세트가 없습니다.'
    );
  END IF;

  -- 1. 먼저 모든 장비 해제
  UPDATE user_equipment
  SET is_equipped = false, equipped_slot = NULL
  WHERE user_id = p_user_id AND is_equipped = true;

  -- 2. 세트의 각 슬롯별 장비 착용
  FOR v_slot, v_equipment_id IN
    SELECT key, value #>> '{}'
    FROM jsonb_each(v_set_record.equipment_ids)
  LOOP
    -- NULL이거나 빈 문자열이면 스킵 (빈 슬롯)
    IF v_equipment_id IS NULL OR v_equipment_id = '' THEN
      CONTINUE;
    END IF;

    -- 장비가 존재하는지 확인
    SELECT EXISTS(
      SELECT 1 FROM user_equipment
      WHERE id = v_equipment_id::uuid AND user_id = p_user_id
    ) INTO v_equipment_exists;

    IF v_equipment_exists THEN
      -- 장비 착용
      UPDATE user_equipment
      SET is_equipped = true, equipped_slot = v_slot
      WHERE id = v_equipment_id::uuid AND user_id = p_user_id;
    ELSE
      -- 장비가 없음 (삭제/판매됨)
      v_missing_slots := array_append(v_missing_slots, v_slot);
    END IF;
  END LOOP;

  -- 결과 반환
  IF array_length(v_missing_slots, 1) > 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'warning', 'SOME_EQUIPMENT_MISSING',
      'missing_slots', to_jsonb(v_missing_slots),
      'message', '일부 장비가 삭제되어 착용되지 않았습니다.'
    );
  ELSE
    RETURN jsonb_build_object(
      'success', true,
      'message', '세트를 불러왔습니다.'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 4. 세트 삭제 함수
-- =============================================
CREATE OR REPLACE FUNCTION delete_equipment_set(
  p_user_id UUID,
  p_set_number INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM user_equipment_sets
  WHERE user_id = p_user_id AND set_number = p_set_number;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. 세트 이름 변경 함수
-- =============================================
CREATE OR REPLACE FUNCTION rename_equipment_set(
  p_user_id UUID,
  p_set_number INTEGER,
  p_new_name VARCHAR(20)
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE user_equipment_sets
  SET set_name = p_new_name, updated_at = NOW()
  WHERE user_id = p_user_id AND set_number = p_set_number;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 6. 유저의 모든 세트 조회 함수
-- =============================================
CREATE OR REPLACE FUNCTION get_equipment_sets(p_user_id UUID)
RETURNS TABLE (
  set_number INTEGER,
  set_name VARCHAR(20),
  equipment_ids JSONB,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.set_number,
    s.set_name,
    s.equipment_ids,
    s.updated_at
  FROM user_equipment_sets s
  WHERE s.user_id = p_user_id
  ORDER BY s.set_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 완료 메시지
-- =============================================
DO $$
BEGIN
  RAISE NOTICE 'Equipment Sets system created!';
  RAISE NOTICE '- Table: user_equipment_sets';
  RAISE NOTICE '- Functions: save_equipment_set, load_equipment_set, delete_equipment_set, rename_equipment_set, get_equipment_sets';
END $$;
