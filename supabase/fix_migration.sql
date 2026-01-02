-- =============================================
-- 기존 정책 삭제 후 재생성 (에러 방지)
-- =============================================

-- user_equipment 정책 삭제
DROP POLICY IF EXISTS "Users can read own equipment" ON user_equipment;
DROP POLICY IF EXISTS "Users can insert own equipment" ON user_equipment;
DROP POLICY IF EXISTS "Users can update own equipment" ON user_equipment;
DROP POLICY IF EXISTS "Users can delete own equipment" ON user_equipment;

-- equipment_potentials 정책 삭제
DROP POLICY IF EXISTS "Users can read own equipment potentials" ON equipment_potentials;
DROP POLICY IF EXISTS "Users can insert own equipment potentials" ON equipment_potentials;
DROP POLICY IF EXISTS "Users can update own equipment potentials" ON equipment_potentials;
DROP POLICY IF EXISTS "Users can delete own equipment potentials" ON equipment_potentials;

-- pvp_battles 정책 삭제
DROP POLICY IF EXISTS "Users can read own battles" ON pvp_battles;
DROP POLICY IF EXISTS "Users can insert battles as attacker" ON pvp_battles;

-- pvp_rankings 정책 삭제
DROP POLICY IF EXISTS "Rankings are publicly readable" ON pvp_rankings;
DROP POLICY IF EXISTS "Users can insert own ranking" ON pvp_rankings;
DROP POLICY IF EXISTS "Users can update own ranking" ON pvp_rankings;

-- daily_pvp 정책 삭제
DROP POLICY IF EXISTS "Users can read own daily pvp" ON daily_pvp;
DROP POLICY IF EXISTS "Users can insert own daily pvp" ON daily_pvp;
DROP POLICY IF EXISTS "Users can update own daily pvp" ON daily_pvp;

-- =============================================
-- RLS 정책 재생성
-- =============================================

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

-- PvP 배틀
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

-- 일일 PvP
CREATE POLICY "Users can read own daily pvp"
  ON daily_pvp FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily pvp"
  ON daily_pvp FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily pvp"
  ON daily_pvp FOR UPDATE USING (auth.uid() = user_id);

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE 'RLS policies recreated successfully!';
END $$;
