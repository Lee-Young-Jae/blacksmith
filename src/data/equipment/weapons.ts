import type { EquipmentBase, EquipmentLevel } from "../../types/equipment";

/**
 * 레벨별 장비 진화 데이터 생성 헬퍼
 */
function createLevels(
  equipmentId: string,
  levelData: Omit<EquipmentLevel, "image">[]
): EquipmentLevel[] {
  return levelData.map((data, index) => ({
    ...data,
    image: `/equipment/${equipmentId}/${index}.png`,
  }));
}

export const WEAPONS: EquipmentBase[] = [
  // ===== 나무 검 시리즈 (밸런스형) =====
  {
    id: "weapon-wooden-sword",
    slot: "weapon",
    baseStats: { attack: 31, hp: 10, attackSpeed: 3 },
    emoji: "🗡️",
    potentialSlots: 3,
    levels: createLevels("weapon-wooden-sword", [
      { name: "거친 나무 검", comment: "흠... 시작이 반이지." },
      { name: "다듬어진 나무 검", comment: "조금 나아졌군." },
      { name: "단단한 나무 검", comment: "제법인데?" },
      { name: "강화된 나무 검", comment: "나무치곤 꽤 단단해졌어." },
      { name: "빛나는 나무 검", comment: "오? 빛이 나기 시작했네!" },
      { name: "정령의 나무 검", comment: "숲의 기운이 느껴진다." },
      { name: "고대의 나무 검", comment: "이건 꽤 오래된 힘이야." },
      { name: "세계수의 가지", comment: "세계수의 축복이 깃들었군." },
      { name: "신목의 검", comment: "신성한 힘이 느껴져." },
      { name: "생명의 검", comment: "검에서 생명력이 뿜어져 나와!" },
      { name: "엘프의 검", comment: "엘프 장인도 인정할 만해." },
      { name: "숲의 수호자", comment: "숲 전체가 너를 응원해." },
      { name: "자연의 분노", comment: "자연의 힘이 폭발할 것 같아!" },
      { name: "대지의 검", comment: "대지의 정수가 담겼어." },
      { name: "영원의 나무 검", comment: "이 검은 영원히 썩지 않아." },
      { name: "신성한 엘더우드", comment: "전설의 재료로 만들어졌군." },
      { name: "드루이드의 검", comment: "드루이드의 지혜가 깃들었어." },
      { name: "자연신의 축복", comment: "자연의 신이 인정했다!" },
      { name: "세계수의 정수", comment: "세계수의 핵심 힘이야." },
      { name: "창세의 나무 검", comment: "세상을 창조한 힘이 느껴져." },
      { name: "이그드라실", comment: "이것이... 세계수 그 자체다!" },
    ]),
  },

  // ===== 철 도끼 시리즈 (파워형 - 느린 무기) =====
  {
    id: "weapon-iron-axe",
    slot: "weapon",
    baseStats: { attack: 30, critDamage: 12 }, // 공속 없음 (느린 무기)
    emoji: "🪓",
    potentialSlots: 3,
    levels: createLevels("weapon-iron-axe", [
      { name: "녹슨 철 도끼", comment: "녹이 좀 슬었네..." },
      { name: "철 도끼", comment: "기본 중의 기본이지." },
      { name: "날카로운 철 도끼", comment: "제법 잘 드네." },
      { name: "강철 도끼", comment: "강철로 업그레이드!" },
      { name: "전사의 도끼", comment: "전사가 쓸 법 해." },
      { name: "전투 도끼", comment: "전투에 최적화됐어." },
      { name: "파괴의 도끼", comment: "무엇이든 부숴버려!" },
      { name: "폭풍 도끼", comment: "휘두르면 폭풍이 일어!" },
      { name: "뇌신의 도끼", comment: "번개가 치는군!" },
      { name: "심판의 도끼", comment: "심판의 날이 왔다!" },
      { name: "천둥 도끼", comment: "천둥소리가 들려." },
      { name: "폭군의 도끼", comment: "아무도 막을 수 없어!" },
      { name: "타이탄 도끼", comment: "거인의 힘이다!" },
      { name: "세계를 가르는 도끼", comment: "세계도 두 쪽 낼 수 있어." },
      { name: "혼돈의 도끼", comment: "혼돈의 기운이 느껴져." },
      { name: "종말의 도끼", comment: "종말을 가져올 힘이야." },
      { name: "신들의 도끼", comment: "신들도 두려워하는 힘!" },
      { name: "창조와 파괴", comment: "창조하고 파괴하는 힘." },
      { name: "우주의 도끼", comment: "우주를 가를 수 있어." },
      { name: "차원을 베는 도끼", comment: "차원조차 베어버려!" },
      { name: "레바테인", comment: "세계를 태울 불꽃이다!" },
    ]),
  },

  // ===== 단궁 시리즈 (정밀형 - 빠른 무기) =====
  {
    id: "weapon-short-bow",
    slot: "weapon",
    baseStats: { attack: 26, critRate: 8, attackSpeed: 5 },
    emoji: "🏹",
    potentialSlots: 3,
    levels: createLevels("weapon-short-bow", [
      { name: "낡은 단궁", comment: "시위가 좀 늘어났네." },
      { name: "단궁", comment: "기본적인 활이야." },
      { name: "사냥꾼의 단궁", comment: "사냥에 쓰기 좋아." },
      { name: "정밀 단궁", comment: "정확도가 올랐어." },
      { name: "속사 단궁", comment: "빠르게 쏠 수 있어!" },
      { name: "강화 단궁", comment: "위력이 올랐네." },
      { name: "명사수의 활", comment: "백발백중이야!" },
      { name: "바람의 활", comment: "바람을 가르는 화살!" },
      { name: "폭풍의 활", comment: "폭풍 같은 화살 세례!" },
      { name: "천공의 활", comment: "하늘을 뚫어!" },
      { name: "별의 활", comment: "별빛을 담은 화살." },
      { name: "은하궁", comment: "은하수를 쏘아라!" },
      { name: "성신의 활", comment: "별들의 축복이야." },
      { name: "천상의 활", comment: "천상의 힘이 깃들었어." },
      { name: "신궁", comment: "신들의 활이다!" },
      { name: "운명의 활", comment: "운명을 바꾸는 화살." },
      { name: "시간의 활", comment: "시간을 꿰뚫어!" },
      { name: "영원의 활", comment: "영원히 날아가는 화살." },
      { name: "우주궁", comment: "우주를 관통해!" },
      { name: "차원궁", comment: "차원을 넘어 명중해." },
      { name: "아르테미스", comment: "달의 여신의 활이다!" },
    ]),
  },

  // ===== 가죽 채찍 시리즈 (유틸형) =====
  {
    id: "weapon-leather-whip",
    slot: "weapon",
    baseStats: { attack: 27, critRate: 4, penetration: 4, attackSpeed: 3 },
    emoji: "⛓️",
    potentialSlots: 3,
    levels: createLevels("weapon-leather-whip", [
      { name: "낡은 가죽 채찍", comment: "좀 낡았네..." },
      { name: "가죽 채찍", comment: "기본 채찍이야." },
      { name: "강화 가죽 채찍", comment: "더 단단해졌어." },
      { name: "쇠사슬 채찍", comment: "쇠사슬로 바꿨어!" },
      { name: "가시 채찍", comment: "가시가 달렸네." },
      { name: "맹독 채찍", comment: "독이 발려있어, 조심해." },
      { name: "화염 채찍", comment: "불타오르는 채찍!" },
      { name: "번개 채찍", comment: "전기가 흐르네!" },
      { name: "냉기 채찍", comment: "얼어붙을 것 같아." },
      { name: "영혼 채찍", comment: "영혼을 때려!" },
      { name: "악마의 채찍", comment: "악마의 힘이 깃들었어." },
      { name: "지옥의 채찍", comment: "지옥에서 왔어!" },
      { name: "심연의 채찍", comment: "심연의 어둠이야." },
      { name: "혼돈의 채찍", comment: "혼돈을 가져와." },
      { name: "파멸의 채찍", comment: "모든 것을 파멸시켜." },
      { name: "절망의 채찍", comment: "희망을 빼앗아." },
      { name: "저주의 채찍", comment: "저주가 서려있어." },
      { name: "타락의 채찍", comment: "타락의 기운이야." },
      { name: "암흑의 채찍", comment: "어둠 그 자체!" },
      { name: "종말의 채찍", comment: "종말을 가져와." },
      { name: "벨몬트의 채찍", comment: "전설의 뱀파이어 헌터!" },
    ]),
  },

  // ===== 청동 창 시리즈 (관통형) =====
  {
    id: "weapon-bronze-spear",
    slot: "weapon",
    baseStats: { attack: 29, penetration: 8, attackSpeed: 2 },
    emoji: "🔱",
    potentialSlots: 3,
    levels: createLevels("weapon-bronze-spear", [
      { name: "녹슨 청동 창", comment: "청동이라 녹이 슬었네." },
      { name: "청동 창", comment: "기본적인 창이야." },
      { name: "강화 청동 창", comment: "좀 더 단단해졌어." },
      { name: "철 창", comment: "철로 업그레이드!" },
      { name: "강철 창", comment: "강철의 힘이야." },
      { name: "기사의 창", comment: "기사가 쓸 법 해." },
      { name: "성기사의 창", comment: "신성한 힘이 깃들었어." },
      { name: "용기사의 창", comment: "용을 사냥할 수 있어!" },
      { name: "천룡창", comment: "하늘의 용의 힘!" },
      { name: "신룡창", comment: "신룡의 축복이야!" },
      { name: "뇌전창", comment: "번개가 내려쳐!" },
      { name: "폭풍창", comment: "폭풍을 일으켜!" },
      { name: "심판의 창", comment: "심판을 내려!" },
      { name: "천벌의 창", comment: "하늘의 벌이다!" },
      { name: "신의 창", comment: "신의 무기야!" },
      { name: "운명의 창", comment: "운명을 꿰뚫어!" },
      { name: "영원의 창", comment: "영원히 빛나는 창!" },
      { name: "우주의 창", comment: "우주를 관통해!" },
      { name: "차원의 창", comment: "차원을 넘어!" },
      { name: "창세의 창", comment: "세상을 창조한 힘!" },
      { name: "게이볼그", comment: "불멸의 영웅의 창!" },
    ]),
  },

  // ===== 녹슨 단검 시리즈 (치명형 - 빠른 무기) =====
  {
    id: "weapon-rusty-dagger",
    slot: "weapon",
    baseStats: { attack: 22, critRate: 8, critDamage: 12, attackSpeed: 5 },
    emoji: "🔪",
    potentialSlots: 3,
    levels: createLevels("weapon-rusty-dagger", [
      { name: "녹슨 단검", comment: "녹이 심하네..." },
      { name: "단검", comment: "기본 단검이야." },
      { name: "날카로운 단검", comment: "날이 서 있어." },
      { name: "암살 단검", comment: "암살에 적합해." },
      { name: "그림자 단검", comment: "그림자처럼 빨라." },
      { name: "독사 단검", comment: "뱀처럼 빠르게!" },
      { name: "맹독 단검", comment: "독이 발려있어." },
      { name: "저주받은 단검", comment: "저주가 서려있어." },
      { name: "사신의 단검", comment: "죽음을 가져와." },
      { name: "영혼 단검", comment: "영혼을 베어!" },
      { name: "악몽 단검", comment: "악몽을 선사해." },
      { name: "공포 단검", comment: "공포를 심어줘." },
      { name: "심연 단검", comment: "심연의 어둠이야." },
      { name: "허무 단검", comment: "모든 것을 허무로." },
      { name: "절망 단검", comment: "희망을 끊어." },
      { name: "종말 단검", comment: "종말을 가져와." },
      { name: "파멸 단검", comment: "파멸의 일격!" },
      { name: "소멸 단검", comment: "존재를 소멸시켜." },
      { name: "무(無) 단검", comment: "무의 경지야." },
      { name: "공(空) 단검", comment: "공의 경지다." },
      { name: "타나토스", comment: "죽음의 신의 단검!" },
    ]),
  },

  // ===== 견습생 지팡이 시리즈 (마법형) =====
  {
    id: "weapon-apprentice-staff",
    slot: "weapon",
    baseStats: { attack: 27, critRate: 5, critDamage: 8, attackSpeed: 2 },
    emoji: "🪄",
    potentialSlots: 3,
    levels: createLevels("weapon-apprentice-staff", [
      { name: "견습생 지팡이", comment: "마법 배우는 중이지?" },
      { name: "마법사 지팡이", comment: "이제 마법사야!" },
      { name: "강화 지팡이", comment: "마력이 올랐어." },
      { name: "비전 지팡이", comment: "비전의 힘이야." },
      { name: "현자의 지팡이", comment: "현자의 지혜가 담겼어." },
      { name: "대마법사 지팡이", comment: "대마법사급이야!" },
      { name: "원소 지팡이", comment: "원소를 다뤄!" },
      { name: "정령 지팡이", comment: "정령의 힘이야." },
      { name: "천상 지팡이", comment: "천상의 마력!" },
      { name: "성스러운 지팡이", comment: "성스러운 힘이야." },
      { name: "신성 지팡이", comment: "신성한 축복이야." },
      { name: "신의 지팡이", comment: "신의 힘을 다뤄!" },
      { name: "우주 지팡이", comment: "우주의 마력이야!" },
      { name: "차원 지팡이", comment: "차원을 넘어!" },
      { name: "시공 지팡이", comment: "시공을 지배해!" },
      { name: "영원 지팡이", comment: "영원의 마력!" },
      { name: "무한 지팡이", comment: "무한한 힘이야!" },
      { name: "절대 지팡이", comment: "절대적인 힘!" },
      { name: "근원 지팡이", comment: "마법의 근원이야!" },
      { name: "창세 지팡이", comment: "창세의 힘!" },
      { name: "마법사의 극의", comment: "마법의 끝에 도달했다!" },
    ]),
  },

  // ===== 돌 해머 시리즈 (파워형 - 느린 무기) =====
  {
    id: "weapon-stone-hammer",
    slot: "weapon",
    baseStats: { attack: 32, critDamage: 10 }, // 공속 없음 (느린 무기)
    emoji: "🔨",
    potentialSlots: 3,
    levels: createLevels("weapon-stone-hammer", [
      { name: "거친 돌 해머", comment: "돌덩이에 손잡이를 달았네." },
      { name: "돌 해머", comment: "기본 해머야." },
      { name: "단단한 돌 해머", comment: "좀 더 단단해졌어." },
      { name: "철 해머", comment: "철로 만들었어!" },
      { name: "강철 해머", comment: "강철의 힘이야!" },
      { name: "대장장이 해머", comment: "나도 이거 써!" },
      { name: "전쟁 해머", comment: "전쟁터에서 쓸 만해." },
      { name: "심판 해머", comment: "심판을 내려!" },
      { name: "정의 해머", comment: "정의의 철퇴!" },
      { name: "천둥 해머", comment: "천둥을 부르는 힘!" },
      { name: "번개 해머", comment: "번개가 내려쳐!" },
      { name: "폭풍 해머", comment: "폭풍을 일으켜!" },
      { name: "뇌신 해머", comment: "뇌신의 힘이야!" },
      { name: "천벌 해머", comment: "하늘의 벌이다!" },
      { name: "신의 해머", comment: "신의 무기야!" },
      { name: "우주 해머", comment: "우주를 두드려!" },
      { name: "차원 해머", comment: "차원을 부숴!" },
      { name: "창세 해머", comment: "세상을 창조한 힘!" },
      { name: "파멸 해머", comment: "모든 것을 파멸시켜!" },
      { name: "종말 해머", comment: "종말을 가져와!" },
      { name: "묠니르", comment: "천둥의 신의 해머!" },
    ]),
  },

  // ===== 농부의 낫 시리즈 (하이브리드형) =====
  {
    id: "weapon-farmer-scythe",
    slot: "weapon",
    baseStats: { attack: 27, critRate: 5, penetration: 5, attackSpeed: 3 },
    emoji: "🌾",
    potentialSlots: 3,
    levels: createLevels("weapon-farmer-scythe", [
      { name: "녹슨 낫", comment: "농부가 쓰던 거네." },
      { name: "농부의 낫", comment: "수확용 낫이야." },
      { name: "날카로운 낫", comment: "날이 서 있어." },
      { name: "전투용 낫", comment: "전투에도 쓸 수 있어." },
      { name: "사신의 낫", comment: "사신이 쓸 법 해." },
      { name: "죽음의 낫", comment: "죽음을 가져와." },
      { name: "영혼의 낫", comment: "영혼을 거둬!" },
      { name: "저승사자 낫", comment: "저승으로 데려가." },
      { name: "명계의 낫", comment: "명계의 힘이야." },
      { name: "지옥의 낫", comment: "지옥에서 온 낫!" },
      { name: "악마의 낫", comment: "악마의 힘이 깃들었어." },
      { name: "심연의 낫", comment: "심연의 어둠이야." },
      { name: "혼돈의 낫", comment: "혼돈을 가져와." },
      { name: "종말의 낫", comment: "종말을 예고해." },
      { name: "파멸의 낫", comment: "모든 것을 파멸시켜." },
      { name: "절망의 낫", comment: "희망을 베어!" },
      { name: "허무의 낫", comment: "모든 것이 허무해." },
      { name: "무(無)의 낫", comment: "무의 경지야." },
      { name: "소멸의 낫", comment: "존재를 소멸시켜." },
      { name: "근원의 낫", comment: "근원을 베어!" },
      { name: "타나토스의 낫", comment: "죽음의 신 그 자체!" },
    ]),
  },

  // ===== 나무 몽둥이 시리즈 (브루저형 - 느린 무기) =====
  {
    id: "weapon-wooden-club",
    slot: "weapon",
    baseStats: { attack: 30, hp: 15 }, // 공속 없음 (느린 무기)
    emoji: "🏏",
    potentialSlots: 3,
    levels: createLevels("weapon-wooden-club", [
      { name: "울퉁불퉁 몽둥이", comment: "그냥 나무 막대기네." },
      { name: "나무 몽둥이", comment: "때리기엔 충분해." },
      { name: "단단한 몽둥이", comment: "좀 더 단단해졌어." },
      { name: "철심 몽둥이", comment: "철심을 넣었어." },
      { name: "강철 몽둥이", comment: "강철로 만들었지!" },
      { name: "전쟁 곤봉", comment: "전쟁터에서 쓸 만해." },
      { name: "박쥐 방망이", comment: "타격감이 좋아!" },
      { name: "거인의 곤봉", comment: "거인이 쓸 법 해." },
      { name: "트롤 곤봉", comment: "트롤도 울고 갈 힘!" },
      { name: "오우거 곤봉", comment: "오우거의 힘이야!" },
      { name: "거신의 곤봉", comment: "거신의 무기다." },
      { name: "대지의 곤봉", comment: "대지를 울려!" },
      { name: "산을 부수는 곤봉", comment: "산도 무너뜨려!" },
      { name: "지진 곤봉", comment: "지진을 일으켜!" },
      { name: "대륙 곤봉", comment: "대륙을 흔들어!" },
      { name: "행성 곤봉", comment: "행성을 부숴!" },
      { name: "항성 곤봉", comment: "별도 부숴버려!" },
      { name: "은하 곤봉", comment: "은하를 휘둘러!" },
      { name: "우주 곤봉", comment: "우주를 때려!" },
      { name: "차원 곤봉", comment: "차원을 부숴!" },
      { name: "헤라클레스의 곤봉", comment: "영웅 중의 영웅!" },
    ]),
  },

  {
    id: "weapon-guardian-shield",
    slot: "weapon",
    baseStats: { attack: 12, hp: 120, critRate: 2 }, // 방어형
    emoji: "🛡️",
    potentialSlots: 3,
    levels: createLevels("weapon-guardian-shield", [
      {
        name: "찌그러진 버클러",
        comment: "한 번의 막음이 남긴 흔적. 다음은 네가 남을지도 모른다.",
      },
      {
        name: "낡은 수련 방패",
        comment: "검은 상처를 주고, 방패는 상처를 견딘다. 선택은 단순하다.",
      },
      {
        name: "가죽끈 보강 방패",
        comment: "방패는 벗겨지는 순간 끝난다. 그러니 먼저 “붙잡아라”.",
      },
      {
        name: "철테 두른 방패",
        comment: "가장자리에 철이 둘러지자, 막음은 더 이상 변명이 아니게 됐다.",
      },
      {
        name: "철제 버클러",
        comment:
          "작고 빠르다. 생존은 거대한 의지가 아니라, 정확한 각도에서 시작된다.",
      },
      {
        name: "강철 방패",
        comment:
          "칼날이 울어도 물러서지 않는다. 금속은 두려움을 흡수하지 않는다.",
      },
      {
        name: "파수꾼의 방패",
        comment: "깨어있는 자만이 지킨다. 잠든 순간, 신념은 피로 바뀐다.",
      },
      {
        name: "성벽의 파편",
        comment:
          "무너진 성벽의 조각. 이 조각은 아직 “무너지는 법”을 잊지 않았다.",
      },
      {
        name: "타워실드",
        comment:
          "몸을 숨기는 대가로, 세상과의 거리를 얻는다. 살아남기 위한 거리.",
      },
      {
        name: "성기사의 방패",
        comment: "신성은 빛이 아니다. 끝까지 버티는 자에게 남는 마지막 형태다.",
      },
      {
        name: "성역의 방패",
        comment: "방패 뒤는 잠깐의 평온. 하지만 평온은 늘 대가를 요구한다.",
      },
      {
        name: "결계의 방패",
        comment: "충격은 사라지지 않는다. 단지 “너를 지나가지 못할 뿐”이다.",
      },
      {
        name: "반격의 방패",
        comment: "막음은 종결이 아니다. 견딘 자만이 “대답”할 권리를 가진다.",
      },
      {
        name: "불굴의 보루",
        comment:
          "부서지는 것은 금속이 아니라 마음이다. 이 방패는 마음을 먼저 지킨다.",
      },
      {
        name: "왕국의 수호문",
        comment: "문이 무너지면 왕국이 무너진다. 나는 오늘, 문이 된다.",
      },
      {
        name: "바스티온",
        comment:
          "패배는 죽음이 아니라 균열에서 시작된다. 이 방패는 균열을 막는다.",
      },
      {
        name: "천상의 아이기스",
        comment: "축복은 가볍지 않다. 축복을 든 팔은 늘 피로 젖는다.",
      },
      {
        name: "운명의 방벽",
        comment: "운명은 칼끝으로 쓰인다. 그리고 방벽은 그 문장을 찢는다.",
      },
      {
        name: "시간의 장벽",
        comment:
          "승리는 힘이 아니라 “한 호흡”에서 결정된다. 이 방패는 호흡을 벌어준다.",
      },
      {
        name: "창세의 방패",
        comment: "처음의 약속으로 돌아간다. “여기서 끝나지 않는다.”",
      },
      {
        name: "아테나의 아이기스",
        comment: "지혜는 예견이 아니다. 살기 위해 무엇을 버릴지 아는 것.",
      },
    ]),
  },
];
