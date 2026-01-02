/**
 * 한국 게임 스타일 닉네임 생성기
 * 실제 게이머들이 사용하는 다양한 패턴의 닉네임을 생성합니다.
 */

// 형용사 (앞에 붙는 수식어)
const ADJECTIVES = [
  '어둠의', '빛나는', '불꽃의', '얼음의', '번개의', '바람의', '대지의',
  '고독한', '용맹한', '전설의', '숨겨진', '잠들지않는', '영원한', '불멸의',
  '광기의', '폭풍의', '심연의', '황금의', '진홍의', '칠흑의', '순백의',
  '미친', '무적의', '최강의', '진정한', '유일한', '마지막', '첫번째',
  '귀여운', '무서운', '배고픈', '졸린', '행복한', '슬픈', '화난',
  '떠도는', '방황하는', '길잃은', '돌아온', '새벽의', '황혼의', '달빛의',
]

// 명사 (캐릭터 타입)
const NOUNS = [
  '기사', '전사', '마법사', '궁수', '암살자', '성기사', '광전사', '검사',
  '드래곤', '늑대', '호랑이', '독수리', '불사조', '용', '사자', '곰',
  '그림자', '불꽃', '폭풍', '천둥', '서리', '빙결', '화염', '대지',
  '왕', '여왕', '황제', '공주', '왕자', '영주', '군주', '패왕',
  '사냥꾼', '수호자', '파괴자', '정복자', '방랑자', '모험가', '용병', '검객',
  '달인', '고수', '초보', '뉴비', '장인', '대장장이', '연금술사', '마스터',
]

// 접미사 (뒤에 붙는 것)
const SUFFIXES = [
  '', '', '', '', '', // 빈 접미사 가중치
  '님', '쓰', '맨', '킹', '갓', '신', '짱',
]

// 영어 형용사
const ENGLISH_ADJ = [
  'Dark', 'Light', 'Shadow', 'Fire', 'Ice', 'Storm', 'Thunder',
  'Black', 'White', 'Red', 'Blue', 'Golden', 'Silver', 'Crystal',
  'Silent', 'Wild', 'Crazy', 'Mad', 'Epic', 'Legend', 'Pro',
  'Ultra', 'Mega', 'Super', 'Hyper', 'Neo', 'True', 'Real',
]

// 영어 명사
const ENGLISH_NOUNS = [
  'Knight', 'Warrior', 'Mage', 'Archer', 'Assassin', 'Paladin', 'Hunter',
  'Dragon', 'Wolf', 'Tiger', 'Eagle', 'Phoenix', 'Lion', 'Bear',
  'King', 'Queen', 'Lord', 'Master', 'Slayer', 'Killer', 'Destroyer',
  'Blade', 'Sword', 'Edge', 'Storm', 'Flame', 'Frost', 'Thunder',
]

// 재미있는/밈 스타일 닉네임 요소
const FUNNY_PREFIXES = [
  '떡볶이', '치킨', '피자', '라면', '김치', '불닭', '짜장', '짬뽕',
  '출근싫은', '퇴근하고싶은', '야근하는', '주말없는', '월요일싫은',
  '잠이오는', '배고픈', '배부른', '심심한', '할일없는', '놀고싶은',
  '숙제안한', '과제폭탄', '시험망한', '올A받은', '장학금',
]

const FUNNY_SUFFIXES = [
  '전사', '용사', '기사', '마스터', '킬러', '사냥꾼', '파괴자',
  '대장', '왕', '신', '고수', '초보', '뉴비', '장인',
  '러버', '매니아', '중독자', '덕후', '팬', '마니아',
]

// 숫자 패턴
const NUMBER_PATTERNS = [
  () => '',
  () => '',
  () => String(Math.floor(Math.random() * 100)),
  () => String(Math.floor(Math.random() * 1000)),
  () => String(Math.floor(Math.random() * 10) * 111), // 111, 222, 333...
  () => 'x' + String(Math.floor(Math.random() * 10)),
  () => String(Math.floor(Math.random() * 10)) + String(Math.floor(Math.random() * 10)),
]

// 특수 문자 패턴
const SPECIAL_CHARS = ['', '', '', '_', '.', 'x', 'X', 'o', 'O']

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomNumber(): string {
  return randomFrom(NUMBER_PATTERNS)()
}

/**
 * 한국어 스타일 닉네임 생성
 * 예: 어둠의기사, 불꽃전사님, 전설의마법사
 */
function generateKoreanStyle(): string {
  const adj = randomFrom(ADJECTIVES)
  const noun = randomFrom(NOUNS)
  const suffix = randomFrom(SUFFIXES)
  const number = Math.random() < 0.2 ? randomNumber() : ''

  return `${adj}${noun}${suffix}${number}`
}

/**
 * 영어 스타일 닉네임 생성
 * 예: DarkKnight, ShadowHunter123, ProGamer
 */
function generateEnglishStyle(): string {
  const adj = randomFrom(ENGLISH_ADJ)
  const noun = randomFrom(ENGLISH_NOUNS)
  const special = randomFrom(SPECIAL_CHARS)
  const number = Math.random() < 0.4 ? randomNumber() : ''

  return `${adj}${special}${noun}${number}`
}

/**
 * 혼합 스타일 닉네임 생성
 * 예: Dark전사, 불꽃Knight, 전설의Hunter
 */
function generateMixedStyle(): string {
  if (Math.random() < 0.5) {
    // 한국어 형용사 + 영어 명사
    const adj = randomFrom(ADJECTIVES)
    const noun = randomFrom(ENGLISH_NOUNS)
    return `${adj}${noun}${randomNumber()}`
  } else {
    // 영어 형용사 + 한국어 명사
    const adj = randomFrom(ENGLISH_ADJ)
    const noun = randomFrom(NOUNS)
    return `${adj}${noun}${randomNumber()}`
  }
}

/**
 * 재미있는 스타일 닉네임 생성
 * 예: 떡볶이전사, 치킨마스터, 야근하는용사
 */
function generateFunnyStyle(): string {
  const prefix = randomFrom(FUNNY_PREFIXES)
  const suffix = randomFrom(FUNNY_SUFFIXES)
  const number = Math.random() < 0.15 ? randomNumber() : ''

  return `${prefix}${suffix}${number}`
}

/**
 * 심플 스타일 닉네임 생성
 * 예: 검은늑대, 푸른하늘, 작은별
 */
function generateSimpleStyle(): string {
  const simpleAdj = ['검은', '흰', '푸른', '붉은', '작은', '큰', '밝은', '어두운', '빠른', '느린']
  const simpleNoun = ['늑대', '호랑이', '별', '달', '해', '바람', '구름', '산', '강', '바다', '숲', '하늘']

  const adj = randomFrom(simpleAdj)
  const noun = randomFrom(simpleNoun)
  const number = Math.random() < 0.3 ? randomNumber() : ''

  return `${adj}${noun}${number}`
}

/**
 * 랜덤 닉네임 생성
 * 여러 스타일 중 하나를 무작위로 선택
 */
export function generateNickname(): string {
  const styles = [
    { fn: generateKoreanStyle, weight: 35 },
    { fn: generateEnglishStyle, weight: 20 },
    { fn: generateMixedStyle, weight: 15 },
    { fn: generateFunnyStyle, weight: 15 },
    { fn: generateSimpleStyle, weight: 15 },
  ]

  const totalWeight = styles.reduce((sum, s) => sum + s.weight, 0)
  let random = Math.random() * totalWeight

  for (const style of styles) {
    random -= style.weight
    if (random <= 0) {
      return style.fn()
    }
  }

  return generateKoreanStyle()
}

/**
 * 특정 스타일의 닉네임 생성
 */
export function generateNicknameByStyle(style: 'korean' | 'english' | 'mixed' | 'funny' | 'simple'): string {
  switch (style) {
    case 'korean':
      return generateKoreanStyle()
    case 'english':
      return generateEnglishStyle()
    case 'mixed':
      return generateMixedStyle()
    case 'funny':
      return generateFunnyStyle()
    case 'simple':
      return generateSimpleStyle()
    default:
      return generateNickname()
  }
}

/**
 * 여러 개의 닉네임 생성 (선택지 제공용)
 */
export function generateNicknameOptions(count: number = 5): string[] {
  const nicknames: string[] = []
  const usedStyles = ['korean', 'english', 'mixed', 'funny', 'simple'] as const

  for (let i = 0; i < count; i++) {
    const style = usedStyles[i % usedStyles.length]
    nicknames.push(generateNicknameByStyle(style))
  }

  return nicknames
}

/**
 * 라이브 피드용 닉네임 캐시
 * 같은 닉네임이 너무 자주 나오지 않도록 관리
 */
const feedNicknameCache: string[] = []
const CACHE_SIZE = 50

export function generateFeedNickname(): string {
  // 캐시가 부족하면 채우기
  while (feedNicknameCache.length < CACHE_SIZE) {
    feedNicknameCache.push(generateNickname())
  }

  // 랜덤하게 하나 선택
  const index = Math.floor(Math.random() * feedNicknameCache.length)
  const nickname = feedNicknameCache[index]

  // 선택된 닉네임 제거하고 새로운 것 추가
  feedNicknameCache.splice(index, 1)
  feedNicknameCache.push(generateNickname())

  return nickname
}
