/*
 * 핏코치 (FitCoach) — 개인 맞춤 체중관리·근력·유산소·식단 코칭 앱
 * 사용자: 프로필 기반 개인 맞춤(성별·키·체중·목표 입력) / 주4회 4분할(가슴삼두·등이두·하체·팔어깨) / 식성·무릎 옵션 반영
 * IA: 4탭(홈/운동/식단/진행) · 신호등+숫자 식단 · 규칙형 다음무게제안 · 무릎위험 플래그+대체운동
 *
 * 브라우저 직접 실행용(전역 React). Vite/CRA로 옮기려면:
 *   맨 위에  import React,{useState,useEffect,useRef,useMemo} from 'react'
 *   맨 아래  const {useState..}=React / ReactDOM.createRoot 줄 삭제 후  export default App
 */
const { useState, useEffect, useRef, useMemo } = React;

/* ===================== 클라우드 동기화 설정 (Supabase) =====================
 * 아래 두 값은 빌드 시 사용자의 Supabase 프로젝트 값으로 치환됩니다.
 * anon key는 공개돼도 안전한 키이며, 데이터 보호는 DB의 Row Level Security가 담당합니다. */
const SUPABASE_URL = "https://kdggqlwpunuhcspbpmwt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_SrXljOFo0RJwKBg-t8cH8g_7lcVM-Ys";
const SYNC_ON = /^https:\/\/[a-z0-9.-]+\.supabase\.co/i.test(SUPABASE_URL) &&
  typeof window !== "undefined" && !!(window.supabase && window.supabase.createClient);
const sb = SYNC_ON ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const SMETA = "fc.__syncmeta";
const isFcKey = (k) => k.indexOf("fc.") === 0 && k !== SMETA;
function syncSnapshot() { const d = {}; for (const k of Object.keys(localStorage)) if (isFcKey(k)) { try { d[k] = JSON.parse(localStorage.getItem(k)); } catch {} } return d; }
function syncWrite(data) { for (const k of Object.keys(localStorage)) if (isFcKey(k)) localStorage.removeItem(k); for (const k of Object.keys(data || {})) { try { localStorage.setItem(k, JSON.stringify(data[k])); } catch {} } }
function hashOf(obj) { const ks = Object.keys(obj || {}).filter((k) => k !== SMETA).sort(); return ks.map((k) => k + "=" + JSON.stringify(obj[k])).join("\n"); }
function localHash() { return hashOf(syncSnapshot()); }
function readMeta() { try { return JSON.parse(localStorage.getItem(SMETA)) || {}; } catch { return {}; } }
function writeMeta(m) { try { localStorage.setItem(SMETA, JSON.stringify(m)); } catch {} }
function hasRealData() { try { return !!JSON.parse(localStorage.getItem("fc.profile") || "null"); } catch { return false; } }

/* ============================ 데이터(Node 주입) ============================ */
const STRENGTH = {
  "principles": [
    {
      "name": "점진적 과부하",
      "desc": "근육은 평소보다 조금 더 강한 자극을 받을 때 성장한다. 무게, 반복수, 세트수, 가동범위, 휴식 단축 중 하나를 매주 조금씩 늘려라. 한 번에 다 늘리지 말고 한 가지씩만 바꾼다."
    },
    {
      "name": "2 for 2 규칙(증량 기준)",
      "desc": "같은 운동에서 목표 반복수의 상한(예: 12회 목표면 12회)을 두 세트 연속으로 자세 무너짐 없이 성공하면, 다음 운동 때 무게를 약 2.5~5% 올린다. 못 채우면 그 무게를 유지한다."
    },
    {
      "name": "자세가 무게보다 우선",
      "desc": "초보자는 부상 위험이 크고, 체중이 많이 나갈수록 관절 부담이 더 크다. 처음 4주는 '무게를 든다'가 아니라 '정확한 패턴을 학습한다'가 목표다. 자세가 흔들리는 무게는 즉시 내린다."
    },
    {
      "name": "체중관리는 식단 70%",
      "desc": "체중 변화의 핵심은 칼로리 수지다 — 감량은 적자, 유지는 균형, 증량은 흑자. 한식 기준 흰쌀밥·국물·튀김·전·삼겹살의 칼로리를 의식해 목표에 맞게 양을 조절하고, 닭가슴살·두부·생선·나물·김치(저염) 같은 고단백·저열량 식품을 늘린다. 체중 1kg당 단백질 1.6~2.0g을 목표로 한다."
    },
    {
      "name": "저충격 유산소 병행",
      "desc": "무릎 보호를 위해 러닝 대신 실내자전거, 일립티컬, 빠른 걷기(경사), 수영을 주 3~5회 30~45분 병행한다. 근력운동 후 또는 별도 시간에 한다."
    },
    {
      "name": "회복과 수면",
      "desc": "근육은 운동이 아니라 쉴 때 자란다. 하루 7~8시간 수면, 운동 부위가 겹치지 않게 분할을 지키고, 같은 부위는 최소 48시간 휴식한다."
    },
    {
      "name": "운동 일지 기록",
      "desc": "매 세션 운동별 무게·반복수를 기록한다. 기록이 없으면 과부하를 객관적으로 관리할 수 없다. 앱/메모에 '지난주보다 +1회 또는 +2.5kg' 단위로 추적한다."
    },
    {
      "name": "통증과 불편의 구분",
      "desc": "근육의 타는 듯한 피로감은 정상이지만, 관절(무릎·허리·어깨)에서 찌르거나 시큰한 통증이 나면 즉시 중단한다. 통증을 참고 진행하지 않는다."
    }
  ],
  "warmup": [
    {
      "step": "전신 유산소",
      "detail": "실내자전거 또는 일립티컬로 5~10분, 가볍게 땀이 살짝 날 정도. 무릎 충격이 적은 기구를 사용한다."
    },
    {
      "step": "관절 가동성 운동",
      "detail": "팔 돌리기, 어깨 돌리기, 고관절 회전, 무릎 굽혔다 펴기, 발목 돌리기를 각 10회씩. 굳은 관절을 깨운다."
    },
    {
      "step": "동적 스트레칭",
      "detail": "레그 스윙(앞뒤·좌우), 워킹 니업, 상체 트위스트, 캣카우를 각 10회. 정적으로 오래 멈추지 말고 부드럽게 움직인다."
    },
    {
      "step": "운동별 준비세트",
      "detail": "그날 첫 운동, 특히 복합운동은 본세트 무게의 40~60%로 1~2세트(10~15회)를 먼저 해서 신경·관절을 적응시킨 뒤 본세트에 들어간다."
    }
  ],
  "phases": [
    {
      "id": "phase1",
      "name": "적응기 (자세 학습)",
      "weeks": "1~4주",
      "frequency": "주 4회",
      "split": "4분할(가슴삼두/등이두/하체/팔어깨)",
      "focus": "머신·맨몸·가벼운 덤벨 위주로 정확한 동작 패턴을 익히는 단계. 세트수를 적게(운동당 2~3세트) 가져가 회복을 우선하고, 가벼운 무게로 15회를 쉽게 할 수 있는 자세를 만든다.",
      "days": [
        {
          "focus": "가슴+삼두",
          "exercises": [
            {
              "name": "해머스트렝스 체스트 프레스",
              "engName": "Machine Chest Press",
              "equipment": "머신",
              "sets": 3,
              "reps": "12~15",
              "rest": 75,
              "targetMuscles": [
                "대흉근",
                "삼두",
                "전면 어깨"
              ],
              "formCues": [
                "등받이에 등 전체를 붙이고 손잡이가 가슴 중앙 높이에 오게 시트 조절",
                "팔꿈치를 너무 뒤로 빼지 말고 몸통 옆 45도 정도 유지",
                "밀 때 숨 내쉬고 가슴을 모은다는 느낌, 팔꿈치 완전히 펴 잠그지 않기"
              ],
              "progression": "15회를 두 세트 연속 자세 흐트러짐 없이 성공하면 다음 핀을 한 칸 올린다.",
              "caution": "어깨에 통증이 오면 가동범위를 줄이고 손잡이 위치를 조금 낮춘다."
            },
            {
              "name": "펙덱 플라이(테크노짐)",
              "engName": "Pec Deck Fly",
              "equipment": "머신",
              "sets": 2,
              "reps": "12~15",
              "rest": 60,
              "targetMuscles": [
                "대흉근"
              ],
              "formCues": [
                "팔꿈치를 살짝 굽힌 각도로 고정하고 그 각도를 유지한 채 모은다",
                "가슴을 펴고 어깨가 앞으로 말리지 않게 한다",
                "모을 때 1초 멈췄다가 천천히 벌린다"
              ],
              "progression": "무게보다 가슴이 모이는 느낌에 집중. 15회가 쉬우면 한 단계 증량."
            },
            {
              "name": "벽/벤치 인클라인 푸시업",
              "engName": "Incline Push-up",
              "equipment": "맨몸",
              "sets": 3,
              "reps": "8~12",
              "rest": 60,
              "targetMuscles": [
                "대흉근",
                "삼두",
                "코어"
              ],
              "formCues": [
                "손은 어깨너비보다 약간 넓게, 벽이나 높은 벤치를 잡아 부담을 낮춘다",
                "머리부터 발끝까지 일직선, 엉덩이가 처지지 않게 코어에 힘",
                "가슴이 손 높이까지 내려오게 천천히 내리고 밀어 올린다"
              ],
              "progression": "높은 벽에서 시작해 12회가 쉬워지면 점점 낮은 지지대(벤치→낮은 박스)로 난이도를 올린다.",
              "caution": "체중 부하가 크면 손목·어깨 부담이 크니 바닥 푸시업은 자세가 익을 때까지 미룬다."
            },
            {
              "name": "덤벨 라잉 트라이셉스 익스텐션",
              "engName": "Dumbbell Lying Triceps Extension",
              "equipment": "덤벨",
              "sets": 2,
              "reps": "12~15",
              "rest": 60,
              "targetMuscles": [
                "삼두"
              ],
              "formCues": [
                "가벼운 덤벨로 시작, 팔꿈치 위치를 고정하고 위팔은 움직이지 않는다",
                "팔꿈치만 굽혀 덤벨을 이마 옆까지 내린다",
                "올릴 때 팔꿈치를 완전히 펴 잠그지 말고 살짝 굽힘 유지"
              ],
              "progression": "15회 2세트 성공 시 0.5~1kg 증량."
            },
            {
              "name": "라이프피트니스 어시스트 딥",
              "engName": "Assisted Dip Machine",
              "equipment": "머신",
              "sets": 2,
              "reps": "10~12",
              "rest": 75,
              "targetMuscles": [
                "삼두",
                "대흉근 하부"
              ],
              "formCues": [
                "보조 패드 무게를 충분히 높여(체중 보조 많이) 시작한다",
                "몸을 거의 수직으로 세우면 삼두, 살짝 기울이면 가슴 자극",
                "어깨가 귀 쪽으로 올라가지 않게 가슴을 편 상태 유지"
              ],
              "progression": "보조 무게를 점차 줄여(자기 체중 비중 늘려) 난이도를 올린다."
            }
          ]
        },
        {
          "focus": "등+이두",
          "exercises": [
            {
              "name": "테크노짐 랫 풀다운",
              "engName": "Lat Pulldown",
              "equipment": "머신",
              "sets": 3,
              "reps": "12~15",
              "rest": 75,
              "targetMuscles": [
                "광배근",
                "승모근 하부",
                "이두"
              ],
              "formCues": [
                "바를 어깨너비보다 약간 넓게 잡고 가슴을 살짝 들어 올린다",
                "팔이 아니라 '팔꿈치를 주머니로' 당긴다는 느낌으로 견갑골을 모은다",
                "바를 쇄골 위쪽까지 당기고 천천히 통제하며 올린다"
              ],
              "progression": "15회 2세트 연속 성공 시 한 핀 증량.",
              "caution": "바를 목 뒤로 당기지 않는다(어깨 부상 위험)."
            },
            {
              "name": "해머스트렝스 시티드 로우",
              "engName": "Seated Machine Row",
              "equipment": "머신",
              "sets": 3,
              "reps": "12~15",
              "rest": 75,
              "targetMuscles": [
                "광배근",
                "중부 승모근",
                "능형근",
                "이두"
              ],
              "formCues": [
                "가슴 패드에 가슴을 붙이고 허리를 곧게 편다",
                "당길 때 어깨를 뒤로·아래로 모으며 견갑골을 조인다",
                "반동 없이 천천히 되돌린다"
              ],
              "progression": "목표 반복 상한 도달 시 증량."
            },
            {
              "name": "백 익스텐션 (척추기립근)",
              "engName": "Back Extension",
              "equipment": "맨몸",
              "sets": 2,
              "reps": "10~15",
              "rest": 60,
              "targetMuscles": [
                "척추기립근",
                "둔근",
                "햄스트링"
              ],
              "formCues": [
                "기구 패드를 골반 아래에 맞춰 상체를 자유롭게 한다",
                "허리를 꺾는 게 아니라 엉덩이를 조이며 몸을 일직선까지만 올린다",
                "과신전(허리 뒤로 꺾기) 금지"
              ],
              "progression": "맨몸 15회가 쉬우면 가슴 앞에 가벼운 원판을 든다.",
              "caution": "허리 통증 있으면 생략하고 코치/트레이너에게 문의."
            },
            {
              "name": "덤벨 바이셉스 컬",
              "engName": "Dumbbell Biceps Curl",
              "equipment": "덤벨",
              "sets": 3,
              "reps": "12~15",
              "rest": 60,
              "targetMuscles": [
                "이두"
              ],
              "formCues": [
                "팔꿈치를 몸통 옆에 고정하고 위팔이 앞뒤로 흔들리지 않게",
                "손목을 곧게 유지하며 덤벨을 들어 올린다",
                "내릴 때 천천히(2초) 통제, 반동 금지"
              ],
              "progression": "15회 2세트 성공 시 1kg 증량."
            },
            {
              "name": "해머 컬",
              "engName": "Hammer Curl",
              "equipment": "덤벨",
              "sets": 2,
              "reps": "12~15",
              "rest": 60,
              "targetMuscles": [
                "상완요골근",
                "이두"
              ],
              "formCues": [
                "엄지가 위를 향하는 중립 그립 유지",
                "팔꿈치 고정, 손목 꺾지 않기",
                "천천히 내린다"
              ],
              "progression": "목표 반복 도달 시 증량."
            }
          ]
        },
        {
          "focus": "하체",
          "exercises": [
            {
              "name": "해머스트렝스 레그 프레스",
              "engName": "Leg Press",
              "equipment": "머신",
              "sets": 3,
              "reps": "12~15",
              "rest": 90,
              "targetMuscles": [
                "대퇴사두",
                "둔근",
                "햄스트링"
              ],
              "formCues": [
                "발은 어깨너비, 발판 중앙~약간 위에 두어 무릎 부담을 줄인다",
                "무릎이 90도 정도까지만 내리고(너무 깊게 X) 발 안쪽으로 민다",
                "무릎이 안으로 모이지 않게 발끝 방향과 일치시킨다"
              ],
              "progression": "15회 2세트 성공 시 한 단계 증량.",
              "caution": "무릎을 가슴까지 깊게 내리면 관절·허리에 무리. 가동범위를 제한해 시작한다."
            },
            {
              "name": "테크노짐 레그 익스텐션",
              "engName": "Leg Extension",
              "equipment": "머신",
              "sets": 2,
              "reps": "12~15",
              "rest": 60,
              "targetMuscles": [
                "대퇴사두"
              ],
              "formCues": [
                "무릎 회전축을 기구 축에 맞추고 시트를 조절한다",
                "가벼운 무게로 시작, 끝에서 1초 멈추고 천천히 내린다",
                "반동으로 차올리지 않는다"
              ],
              "progression": "무게보다 통제된 수축 우선. 15회 쉬우면 증량.",
              "caution": "무릎 앞쪽 통증이 있으면 가동범위를 줄이고 무게를 낮춘다."
            },
            {
              "name": "테크노짐 레그 컬",
              "engName": "Seated/Lying Leg Curl",
              "equipment": "머신",
              "sets": 3,
              "reps": "12~15",
              "rest": 60,
              "targetMuscles": [
                "햄스트링"
              ],
              "formCues": [
                "발목 패드를 아킬레스건 바로 위에 맞춘다",
                "무릎만 굽혀 끝까지 당기고 천천히 편다",
                "골반이 들리지 않게 고정"
              ],
              "progression": "목표 반복 상한 도달 시 증량."
            },
            {
              "name": "박스 스쿼트 (의자 스쿼트)",
              "engName": "Box Squat",
              "equipment": "맨몸",
              "sets": 3,
              "reps": "10~12",
              "rest": 75,
              "targetMuscles": [
                "대퇴사두",
                "둔근",
                "코어"
              ],
              "formCues": [
                "의자/박스를 뒤에 두고 엉덩이를 뒤로 빼며 앉듯 내려간다",
                "무릎이 발끝을 과하게 넘지 않게, 발 전체로 바닥을 민다",
                "박스에 살짝 닿으면 둔근에 힘주며 일어선다"
              ],
              "progression": "맨몸 12회 3세트가 안정되면 박스 높이를 낮추거나 가벼운 덤벨을 가슴에 든다.",
              "caution": "무릎 보호를 위해 처음엔 의자 높이(반스쿼트)로 가동범위를 제한한다. 점프 스쿼트 금지."
            },
            {
              "name": "해머스트렝스 시티드 카프 레이즈",
              "engName": "Seated Calf Raise",
              "equipment": "머신",
              "sets": 2,
              "reps": "15~20",
              "rest": 45,
              "targetMuscles": [
                "비복근",
                "가자미근"
              ],
              "formCues": [
                "발 앞꿈치를 발판에 두고 발꿈치를 끝까지 올렸다 내린다",
                "맨 아래에서 1초 늘리고 맨 위에서 1초 짠다",
                "반동 없이 천천히"
              ],
              "progression": "20회가 쉬우면 증량."
            }
          ]
        },
        {
          "focus": "팔+어깨",
          "exercises": [
            {
              "name": "해머스트렝스 숄더 프레스",
              "engName": "Machine Shoulder Press",
              "equipment": "머신",
              "sets": 3,
              "reps": "12~15",
              "rest": 75,
              "targetMuscles": [
                "전면·측면 어깨",
                "삼두"
              ],
              "formCues": [
                "등받이에 등을 붙이고 손잡이가 귀 높이쯤 오게 시트 조절",
                "어깨를 으쓱 올리지 말고 끝에서 팔꿈치 완전 잠금 피하기",
                "밀 때 숨 내쉬기"
              ],
              "progression": "15회 2세트 성공 시 한 핀 증량.",
              "caution": "어깨 통증 시 가동범위를 줄인다. 바벨 오버헤드는 아직 하지 않는다."
            },
            {
              "name": "덤벨 사이드 레터럴 레이즈",
              "engName": "Dumbbell Side Lateral Raise",
              "equipment": "덤벨",
              "sets": 3,
              "reps": "12~15",
              "rest": 60,
              "targetMuscles": [
                "측면 어깨"
              ],
              "formCues": [
                "아주 가벼운 덤벨로 시작, 팔꿈치 살짝 굽힌 채 옆으로 든다",
                "어깨 높이까지만, 새끼손가락이 약간 위를 향하게",
                "반동 없이 천천히 내린다"
              ],
              "progression": "자세가 흔들리면 무게를 낮춘다. 15회 깔끔하면 0.5~1kg 증량."
            },
            {
              "name": "리버스 펙덱(테크노짐)",
              "engName": "Reverse Pec Deck",
              "equipment": "머신",
              "sets": 2,
              "reps": "12~15",
              "rest": 60,
              "targetMuscles": [
                "후면 어깨",
                "능형근"
              ],
              "formCues": [
                "가슴을 패드에 붙이고 팔을 약간 굽힌 채 뒤로 벌린다",
                "견갑골을 모으며 어깨 뒤쪽에 집중",
                "목·승모근에 힘이 들어가지 않게"
              ],
              "progression": "목표 반복 도달 시 증량."
            },
            {
              "name": "덤벨 바이셉스 컬",
              "engName": "Dumbbell Biceps Curl",
              "equipment": "덤벨",
              "sets": 2,
              "reps": "12~15",
              "rest": 60,
              "targetMuscles": [
                "이두"
              ],
              "formCues": [
                "팔꿈치 고정, 위팔 흔들지 않기",
                "손목 곧게, 천천히 내린다",
                "반동 금지"
              ],
              "progression": "15회 2세트 성공 시 증량."
            },
            {
              "name": "덤벨 트라이셉스 킥백",
              "engName": "Dumbbell Triceps Kickback",
              "equipment": "덤벨",
              "sets": 2,
              "reps": "12~15",
              "rest": 60,
              "targetMuscles": [
                "삼두"
              ],
              "formCues": [
                "벤치에 한 손·한 무릎을 대고 허리를 곧게 편다",
                "위팔을 몸통과 평행하게 고정하고 팔꿈치만 펴서 뒤로",
                "끝에서 1초 짜고 천천히 굽힌다"
              ],
              "progression": "가벼운 무게로 자세 우선, 15회 쉬우면 증량."
            }
          ]
        }
      ]
    },
    {
      "id": "phase2",
      "name": "발달기 (볼륨 증가)",
      "weeks": "5~12주",
      "frequency": "주 4회",
      "split": "4분할(가슴삼두/등이두/하체/팔어깨)",
      "focus": "적응된 자세 위에 덤벨과 케이블을 본격 도입해 자극 각도를 다양화하고, 운동당 3~4세트로 총 볼륨을 늘린다. 반복수는 10~15 구간을 섞어 근비대·근지구력을 함께 자극한다.",
      "days": [
        {
          "focus": "가슴+삼두",
          "exercises": [
            {
              "name": "덤벨 벤치 프레스",
              "engName": "Dumbbell Bench Press",
              "equipment": "덤벨",
              "sets": 4,
              "reps": "10~12",
              "rest": 90,
              "targetMuscles": [
                "대흉근",
                "삼두",
                "전면 어깨"
              ],
              "formCues": [
                "견갑골을 모아 벤치에 고정하고 가슴을 살짝 들어 아치 유지",
                "덤벨을 가슴 옆 라인까지 내리고 가슴으로 민다",
                "손목이 꺾이지 않게 덤벨 위에 곧게 세운다"
              ],
              "progression": "12회 2세트 성공 시 양손 각각 1~2kg 증량. 덤벨이 무거워지면 무릎으로 올려 시작하는 법을 익힌다.",
              "caution": "덤벨을 어깨 뒤로 과하게 떨어뜨리지 않는다(어깨 부담)."
            },
            {
              "name": "인클라인 덤벨 프레스",
              "engName": "Incline Dumbbell Press",
              "equipment": "덤벨",
              "sets": 3,
              "reps": "10~12",
              "rest": 90,
              "targetMuscles": [
                "상부 대흉근",
                "전면 어깨",
                "삼두"
              ],
              "formCues": [
                "벤치 각도 30도 정도(너무 세우면 어깨 위주)",
                "덤벨을 쇄골 방향으로 밀어 올린다",
                "팔꿈치 몸통 옆 45도 유지"
              ],
              "progression": "12회 2세트 성공 시 증량."
            },
            {
              "name": "케이블 크로스오버",
              "engName": "Cable Crossover",
              "equipment": "케이블",
              "sets": 3,
              "reps": "12~15",
              "rest": 60,
              "targetMuscles": [
                "대흉근"
              ],
              "formCues": [
                "도르래를 가슴 높이~약간 위로 설정, 한 발 앞으로 내딛어 안정",
                "팔꿈치 살짝 굽힌 각도 고정한 채 손을 가슴 앞으로 모은다",
                "모을 때 가슴을 짜고 천천히 벌린다"
              ],
              "progression": "목표 반복 도달 시 증량."
            },
            {
              "name": "케이블 트라이셉스 푸시다운",
              "engName": "Cable Triceps Pushdown",
              "equipment": "케이블",
              "sets": 3,
              "reps": "12~15",
              "rest": 60,
              "targetMuscles": [
                "삼두"
              ],
              "formCues": [
                "팔꿈치를 몸통 옆에 붙여 고정하고 위팔은 움직이지 않는다",
                "바를 끝까지 눌러 펴고 1초 짠 뒤 천천히 올린다",
                "상체를 앞으로 숙여 누르지 않기"
              ],
              "progression": "15회 2세트 성공 시 한 핀 증량."
            },
            {
              "name": "덤벨 오버헤드 트라이셉스 익스텐션",
              "engName": "Overhead Dumbbell Triceps Extension",
              "equipment": "덤벨",
              "sets": 3,
              "reps": "10~12",
              "rest": 60,
              "targetMuscles": [
                "삼두 장두"
              ],
              "formCues": [
                "덤벨 하나를 양손으로 잡고 머리 위로, 팔꿈치를 귀 옆에 고정",
                "팔꿈치만 굽혀 머리 뒤로 내리고 천천히 편다",
                "허리가 과하게 젖혀지지 않게 코어 고정"
              ],
              "progression": "12회 2세트 성공 시 증량."
            },
            {
              "name": "해머스트렝스 체스트 프레스 (마무리)",
              "engName": "Machine Chest Press",
              "equipment": "머신",
              "sets": 2,
              "reps": "15",
              "rest": 60,
              "targetMuscles": [
                "대흉근",
                "삼두"
              ],
              "formCues": [
                "지친 상태에서도 끝까지 통제",
                "끝에서 가슴을 모으는 느낌",
                "반동 없이"
              ],
              "progression": "마무리 펌핑용. 15회 쉬우면 증량."
            }
          ]
        },
        {
          "focus": "등+이두",
          "exercises": [
            {
              "name": "테크노짐 랫 풀다운",
              "engName": "Lat Pulldown",
              "equipment": "머신",
              "sets": 4,
              "reps": "10~12",
              "rest": 90,
              "targetMuscles": [
                "광배근",
                "능형근",
                "이두"
              ],
              "formCues": [
                "넓은 그립, 가슴 들고 견갑골을 아래로 당기며 시작",
                "팔꿈치를 바닥 쪽으로 끌어 쇄골 위까지",
                "천천히 통제하며 끝까지 늘린다"
              ],
              "progression": "12회 2세트 성공 시 증량."
            },
            {
              "name": "원암 덤벨 로우",
              "engName": "One-Arm Dumbbell Row",
              "equipment": "덤벨",
              "sets": 3,
              "reps": "10~12",
              "rest": 75,
              "targetMuscles": [
                "광배근",
                "능형근",
                "후면 어깨",
                "이두"
              ],
              "formCues": [
                "벤치에 한 손·한 무릎 지지, 등은 평평하게 테이블처럼",
                "덤벨을 골반 쪽으로 끌어올리며 견갑골을 모은다",
                "허리를 비틀지 않고 천천히 내린다"
              ],
              "progression": "12회 2세트 성공 시 증량."
            },
            {
              "name": "시티드 케이블 로우",
              "engName": "Seated Cable Row",
              "equipment": "케이블",
              "sets": 3,
              "reps": "12~15",
              "rest": 75,
              "targetMuscles": [
                "중부 등",
                "광배근",
                "이두"
              ],
              "formCues": [
                "가슴 펴고 상체는 거의 고정, 반동으로 당기지 않기",
                "팔꿈치를 몸통 옆으로 끌며 견갑골을 모은다",
                "되돌릴 때 광배가 늘어나는 걸 느끼며 천천히"
              ],
              "progression": "목표 반복 상한 도달 시 증량."
            },
            {
              "name": "케이블 스트레이트암 풀다운",
              "engName": "Straight-Arm Pulldown",
              "equipment": "케이블",
              "sets": 3,
              "reps": "12~15",
              "rest": 60,
              "targetMuscles": [
                "광배근"
              ],
              "formCues": [
                "팔을 거의 편 채(살짝 굽힘) 바를 허벅지 앞까지 호를 그리며 내린다",
                "팔이 아니라 광배로 누른다는 느낌",
                "상체를 앞으로 살짝 숙여 고정"
              ],
              "progression": "15회 2세트 성공 시 증량."
            },
            {
              "name": "덤벨 바이셉스 컬",
              "engName": "Dumbbell Biceps Curl",
              "equipment": "덤벨",
              "sets": 3,
              "reps": "10~12",
              "rest": 60,
              "targetMuscles": [
                "이두"
              ],
              "formCues": [
                "팔꿈치 고정, 위팔 흔들지 않기",
                "끝까지 짜고 천천히(2초) 내린다",
                "반동 금지"
              ],
              "progression": "12회 2세트 성공 시 증량."
            },
            {
              "name": "케이블 컬",
              "engName": "Cable Biceps Curl",
              "equipment": "케이블",
              "sets": 2,
              "reps": "12~15",
              "rest": 60,
              "targetMuscles": [
                "이두"
              ],
              "formCues": [
                "케이블의 일정한 장력을 느끼며 끝까지 수축",
                "팔꿈치 고정",
                "천천히 내려 장력 유지"
              ],
              "progression": "15회 2세트 성공 시 한 핀 증량."
            }
          ]
        },
        {
          "focus": "하체",
          "exercises": [
            {
              "name": "해머스트렝스 레그 프레스",
              "engName": "Leg Press",
              "equipment": "머신",
              "sets": 4,
              "reps": "10~12",
              "rest": 120,
              "targetMuscles": [
                "대퇴사두",
                "둔근",
                "햄스트링"
              ],
              "formCues": [
                "발 어깨너비, 발판 중앙~위쪽, 무릎과 발끝 방향 일치",
                "컨트롤하며 무릎 90도까지 내리고 강하게 민다",
                "무릎 완전히 펴 잠그지 않기"
              ],
              "progression": "12회 2세트 성공 시 증량. 점차 무게를 늘려 하체 주력 운동으로 활용.",
              "caution": "가동범위를 무릎·허리가 들리지 않는 선까지만."
            },
            {
              "name": "덤벨 고블릿 스쿼트",
              "engName": "Dumbbell Goblet Squat",
              "equipment": "덤벨",
              "sets": 3,
              "reps": "10~12",
              "rest": 90,
              "targetMuscles": [
                "대퇴사두",
                "둔근",
                "코어"
              ],
              "formCues": [
                "덤벨 한 개를 가슴 앞에 세워 잡고 팔꿈치를 안쪽으로",
                "가슴 들고 엉덩이를 뒤·아래로, 발 전체로 바닥을 민다",
                "무릎이 안으로 무너지지 않게 발끝 방향과 맞춘다"
              ],
              "progression": "통증 없이 12회가 안정되면 무게를 늘리거나 가동범위를 조금 더 깊게.",
              "caution": "바벨 백스쿼트 전 단계로 패턴을 익히는 운동. 무릎 통증 시 깊이를 줄인다."
            },
            {
              "name": "덤벨 루마니안 데드리프트",
              "engName": "Dumbbell Romanian Deadlift",
              "equipment": "덤벨",
              "sets": 3,
              "reps": "10~12",
              "rest": 90,
              "targetMuscles": [
                "햄스트링",
                "둔근",
                "척추기립근"
              ],
              "formCues": [
                "무릎 살짝 굽힌 채 고정, 엉덩이를 뒤로 밀며 상체를 숙인다",
                "등은 항상 곧게(둥글게 말지 않기), 덤벨은 허벅지에 붙여 내린다",
                "햄스트링이 당기는 지점까지만 내리고 둔근으로 일어선다"
              ],
              "progression": "자세 완벽하면 12회 2세트 성공 시 증량.",
              "caution": "허리를 둥글게 말면 부상 위험. 무게보다 등 중립 유지가 우선."
            },
            {
              "name": "테크노짐 레그 익스텐션",
              "engName": "Leg Extension",
              "equipment": "머신",
              "sets": 3,
              "reps": "12~15",
              "rest": 60,
              "targetMuscles": [
                "대퇴사두"
              ],
              "formCues": [
                "끝에서 1초 멈추고 천천히 내린다",
                "반동 금지",
                "무릎 축 정렬"
              ],
              "progression": "15회 2세트 성공 시 증량."
            },
            {
              "name": "테크노짐 레그 컬",
              "engName": "Leg Curl",
              "equipment": "머신",
              "sets": 3,
              "reps": "12~15",
              "rest": 60,
              "targetMuscles": [
                "햄스트링"
              ],
              "formCues": [
                "끝까지 당겨 1초 짜고 천천히 편다",
                "골반 들림 방지",
                "반동 없이"
              ],
              "progression": "목표 반복 상한 도달 시 증량."
            },
            {
              "name": "해머스트렝스 스탠딩 카프 레이즈",
              "engName": "Standing Calf Raise",
              "equipment": "머신",
              "sets": 3,
              "reps": "15~20",
              "rest": 45,
              "targetMuscles": [
                "비복근",
                "가자미근"
              ],
              "formCues": [
                "발 앞꿈치로 서서 발꿈치를 끝까지 올렸다 깊게 내린다",
                "아래에서 1초 늘리고 위에서 1초 짠다",
                "무릎 곧게 유지"
              ],
              "progression": "20회 쉬우면 증량."
            }
          ]
        },
        {
          "focus": "팔+어깨",
          "exercises": [
            {
              "name": "덤벨 숄더 프레스",
              "engName": "Seated Dumbbell Shoulder Press",
              "equipment": "덤벨",
              "sets": 4,
              "reps": "10~12",
              "rest": 90,
              "targetMuscles": [
                "전면·측면 어깨",
                "삼두"
              ],
              "formCues": [
                "등받이 있는 벤치에 등을 붙이고 코어 고정",
                "덤벨을 귀 높이에서 시작해 머리 위로 모으듯 민다",
                "끝에서 팔꿈치 완전 잠금 피하고 어깨 으쓱 금지"
              ],
              "progression": "12회 2세트 성공 시 증량.",
              "caution": "어깨에 시큰함이 오면 가동범위를 줄이고 무게를 낮춘다."
            },
            {
              "name": "덤벨 사이드 레터럴 레이즈",
              "engName": "Dumbbell Side Lateral Raise",
              "equipment": "덤벨",
              "sets": 4,
              "reps": "12~15",
              "rest": 60,
              "targetMuscles": [
                "측면 어깨"
              ],
              "formCues": [
                "팔꿈치 살짝 굽혀 고정, 어깨 높이까지만 옆으로",
                "반동 없이 천천히, 물 따르듯 새끼손가락 약간 위로",
                "승모근으로 으쓱하지 않기"
              ],
              "progression": "자세 유지되면 0.5~1kg씩 증량. 흔들리면 무게 낮추기."
            },
            {
              "name": "케이블 리어 델트 플라이",
              "engName": "Cable Rear Delt Fly",
              "equipment": "케이블",
              "sets": 3,
              "reps": "12~15",
              "rest": 60,
              "targetMuscles": [
                "후면 어깨",
                "능형근"
              ],
              "formCues": [
                "케이블을 교차로 잡고 팔을 옆·뒤로 벌린다",
                "견갑골을 모으며 어깨 뒤쪽에 집중",
                "목에 힘 빼고 일정한 장력 유지"
              ],
              "progression": "15회 2세트 성공 시 증량."
            },
            {
              "name": "덤벨 바이셉스 컬",
              "engName": "Dumbbell Biceps Curl",
              "equipment": "덤벨",
              "sets": 3,
              "reps": "10~12",
              "rest": 60,
              "targetMuscles": [
                "이두"
              ],
              "formCues": [
                "팔꿈치 고정, 위팔 흔들지 않기",
                "천천히 내린다",
                "반동 금지"
              ],
              "progression": "12회 2세트 성공 시 증량."
            },
            {
              "name": "케이블 트라이셉스 푸시다운",
              "engName": "Cable Triceps Pushdown",
              "equipment": "케이블",
              "sets": 3,
              "reps": "12~15",
              "rest": 60,
              "targetMuscles": [
                "삼두"
              ],
              "formCues": [
                "팔꿈치 몸통에 고정",
                "끝까지 펴 1초 짜기",
                "상체 숙여 누르지 않기"
              ],
              "progression": "15회 2세트 성공 시 한 핀 증량."
            },
            {
              "name": "해머 컬",
              "engName": "Hammer Curl",
              "equipment": "덤벨",
              "sets": 2,
              "reps": "12~15",
              "rest": 60,
              "targetMuscles": [
                "상완요골근",
                "이두"
              ],
              "formCues": [
                "중립 그립 유지",
                "팔꿈치 고정",
                "천천히 내린다"
              ],
              "progression": "15회 2세트 성공 시 증량."
            }
          ]
        }
      ]
    },
    {
      "id": "phase3",
      "name": "강화기 (프리웨이트·강도 증가)",
      "weeks": "13주 이후",
      "frequency": "주 4회",
      "split": "4분할(가슴삼두/등이두/하체/팔어깨)",
      "focus": "이제 패턴과 기초 근력이 갖춰졌으니 바벨 복합운동을 메인으로 도입한다. 복합운동은 6~10회 저반복·고중량으로 근력과 근비대를 자극하고, 머신·케이블·덤벨로 보조해 마무리한다. 복합운동은 충분한 휴식(90~120초)을 둔다.",
      "days": [
        {
          "focus": "가슴+삼두",
          "exercises": [
            {
              "name": "바벨 벤치 프레스",
              "engName": "Barbell Bench Press",
              "equipment": "바벨",
              "sets": 4,
              "reps": "6~10",
              "rest": 120,
              "targetMuscles": [
                "대흉근",
                "삼두",
                "전면 어깨"
              ],
              "formCues": [
                "견갑골을 모아 뒤로·아래로 고정, 가슴 아치 유지, 발은 바닥에 단단히",
                "바를 유두 라인으로 내리고 팔꿈치는 몸통 45도",
                "손목 곧게, 안전바 설치 또는 보조자와 함께 한다"
              ],
              "progression": "10회 2세트 성공 시 2.5kg 증량. 무거운 무게는 반드시 안전장치/스파터 사용.",
              "caution": "고중량 단독 운동 시 반드시 안전바를 걸거나 보조자를 둔다. 어깨를 으쓱하거나 바를 목 쪽으로 내리지 않기."
            },
            {
              "name": "인클라인 덤벨 프레스",
              "engName": "Incline Dumbbell Press",
              "equipment": "덤벨",
              "sets": 3,
              "reps": "8~12",
              "rest": 90,
              "targetMuscles": [
                "상부 대흉근",
                "전면 어깨",
                "삼두"
              ],
              "formCues": [
                "벤치 30도, 견갑골 고정",
                "쇄골 방향으로 밀어 올린다",
                "팔꿈치 45도 유지"
              ],
              "progression": "12회 2세트 성공 시 증량."
            },
            {
              "name": "케이블 크로스오버",
              "engName": "Cable Crossover",
              "equipment": "케이블",
              "sets": 3,
              "reps": "12~15",
              "rest": 60,
              "targetMuscles": [
                "대흉근"
              ],
              "formCues": [
                "일정 장력 유지하며 가슴 앞에서 모으기",
                "팔꿈치 각도 고정",
                "천천히 벌려 스트레치"
              ],
              "progression": "15회 2세트 성공 시 증량."
            },
            {
              "name": "클로즈그립 벤치 프레스",
              "engName": "Close-Grip Bench Press",
              "equipment": "바벨",
              "sets": 3,
              "reps": "8~10",
              "rest": 90,
              "targetMuscles": [
                "삼두",
                "대흉근 안쪽"
              ],
              "formCues": [
                "어깨너비보다 약간 좁게 잡되 손목 무리 없는 너비",
                "팔꿈치를 몸통에 가깝게 붙여 내린다",
                "삼두로 밀어 올린다"
              ],
              "progression": "10회 2세트 성공 시 2.5kg 증량.",
              "caution": "그립을 과도하게 좁히면 손목·어깨에 무리. 적당히 좁게."
            },
            {
              "name": "케이블 트라이셉스 푸시다운",
              "engName": "Cable Triceps Pushdown",
              "equipment": "케이블",
              "sets": 3,
              "reps": "10~15",
              "rest": 60,
              "targetMuscles": [
                "삼두"
              ],
              "formCues": [
                "팔꿈치 고정",
                "끝까지 펴 1초 짜기",
                "반동 금지"
              ],
              "progression": "15회 2세트 성공 시 한 핀 증량."
            },
            {
              "name": "덤벨 오버헤드 익스텐션",
              "engName": "Overhead Dumbbell Triceps Extension",
              "equipment": "덤벨",
              "sets": 3,
              "reps": "10~12",
              "rest": 60,
              "targetMuscles": [
                "삼두 장두"
              ],
              "formCues": [
                "팔꿈치 귀 옆 고정",
                "머리 뒤로 내렸다 편다",
                "코어 고정으로 허리 보호"
              ],
              "progression": "12회 2세트 성공 시 증량."
            }
          ]
        },
        {
          "focus": "등+이두",
          "exercises": [
            {
              "name": "바벨 로우",
              "engName": "Barbell Bent-Over Row",
              "equipment": "바벨",
              "sets": 4,
              "reps": "8~10",
              "rest": 120,
              "targetMuscles": [
                "광배근",
                "능형근",
                "척추기립근",
                "이두"
              ],
              "formCues": [
                "엉덩이를 뒤로 빼 상체를 약 45도 숙이고 등은 곧게 고정",
                "바를 배꼽~명치 쪽으로 당기며 견갑골을 모은다",
                "반동·허리 펴짐 없이 통제하며 내린다"
              ],
              "progression": "10회 2세트 성공 시 2.5kg 증량.",
              "caution": "허리를 둥글게 말면 부상 위험. 무게가 무거우면 상체 각도를 약간 높여 허리 부담을 줄인다."
            },
            {
              "name": "테크노짐 랫 풀다운 / 어시스트 풀업",
              "engName": "Lat Pulldown / Assisted Pull-up",
              "equipment": "머신",
              "sets": 3,
              "reps": "8~12",
              "rest": 90,
              "targetMuscles": [
                "광배근",
                "능형근",
                "이두"
              ],
              "formCues": [
                "넓은 그립, 견갑골 하강으로 시작",
                "팔꿈치를 아래로 끌어 가슴 위까지",
                "천천히 끝까지 늘린다"
              ],
              "progression": "풀업 머신은 보조 무게를 줄여 자기 체중 비중을 늘린다."
            },
            {
              "name": "시티드 케이블 로우",
              "engName": "Seated Cable Row",
              "equipment": "케이블",
              "sets": 3,
              "reps": "10~12",
              "rest": 75,
              "targetMuscles": [
                "중부 등",
                "광배근",
                "이두"
              ],
              "formCues": [
                "가슴 펴고 상체 고정, 반동 금지",
                "팔꿈치를 몸통 옆으로 끌며 견갑골 모으기",
                "천천히 되돌려 광배 스트레치"
              ],
              "progression": "12회 2세트 성공 시 증량."
            },
            {
              "name": "원암 덤벨 로우",
              "engName": "One-Arm Dumbbell Row",
              "equipment": "덤벨",
              "sets": 3,
              "reps": "10~12",
              "rest": 75,
              "targetMuscles": [
                "광배근",
                "능형근",
                "이두"
              ],
              "formCues": [
                "벤치 지지, 등 평평",
                "골반 쪽으로 끌어올리며 견갑골 모으기",
                "허리 비틀지 않기"
              ],
              "progression": "12회 2세트 성공 시 증량."
            },
            {
              "name": "바벨 바이셉스 컬",
              "engName": "Barbell Biceps Curl",
              "equipment": "바벨",
              "sets": 3,
              "reps": "8~12",
              "rest": 60,
              "targetMuscles": [
                "이두"
              ],
              "formCues": [
                "팔꿈치를 몸통 옆에 고정, 위팔 흔들지 않기",
                "반동(허리 젖힘) 없이 들어 올린다",
                "천천히 내려 끝까지 편다"
              ],
              "progression": "12회 2세트 성공 시 증량.",
              "caution": "무게 욕심에 허리를 젖혀 반동하면 허리 부담. 통제 가능한 무게 사용."
            },
            {
              "name": "인클라인 덤벨 컬",
              "engName": "Incline Dumbbell Curl",
              "equipment": "덤벨",
              "sets": 2,
              "reps": "10~12",
              "rest": 60,
              "targetMuscles": [
                "이두 장두"
              ],
              "formCues": [
                "벤치에 기대 팔을 뒤로 늘어뜨려 스트레치 강조",
                "팔꿈치 고정한 채 컬",
                "천천히 내려 늘린다"
              ],
              "progression": "12회 2세트 성공 시 증량."
            }
          ]
        },
        {
          "focus": "하체",
          "exercises": [
            {
              "name": "바벨 백스쿼트",
              "engName": "Barbell Back Squat",
              "equipment": "바벨",
              "sets": 4,
              "reps": "6~10",
              "rest": 150,
              "targetMuscles": [
                "대퇴사두",
                "둔근",
                "햄스트링",
                "코어"
              ],
              "formCues": [
                "바를 승모근 위에 얹고 가슴 들어 코어에 힘, 발은 어깨너비",
                "엉덩이를 뒤·아래로 앉으며 무릎과 발끝 방향 일치",
                "허벅지 평행 부근까지(통증 없는 깊이) 내리고 발 전체로 밀어 일어선다"
              ],
              "progression": "10회 2세트 성공 시 2.5~5kg 증량. 반드시 세이프티 바를 건 파워랙에서 한다.",
              "caution": "체중이 많이 나갈수록 무릎·허리 부담이 크므로 반드시 세이프티 바 설치, 깊이는 통증 없는 범위로 제한. 무릎이 안으로 무너지지 않게 주의."
            },
            {
              "name": "바벨 루마니안 데드리프트",
              "engName": "Barbell Romanian Deadlift",
              "equipment": "바벨",
              "sets": 3,
              "reps": "8~10",
              "rest": 120,
              "targetMuscles": [
                "햄스트링",
                "둔근",
                "척추기립근"
              ],
              "formCues": [
                "무릎 살짝 굽힌 채 엉덩이를 뒤로 밀며 바를 다리에 붙여 내린다",
                "등은 끝까지 곧게(둥글게 말지 않기)",
                "햄스트링 스트레치 지점까지만, 둔근으로 일어선다"
              ],
              "progression": "10회 2세트 성공 시 증량.",
              "caution": "허리 중립 유지가 최우선. 등이 말리면 즉시 무게를 줄인다."
            },
            {
              "name": "해머스트렝스 레그 프레스",
              "engName": "Leg Press",
              "equipment": "머신",
              "sets": 3,
              "reps": "10~12",
              "rest": 90,
              "targetMuscles": [
                "대퇴사두",
                "둔근"
              ],
              "formCues": [
                "발 어깨너비, 무릎·발끝 정렬",
                "90도까지 통제하며 내리고 강하게 민다",
                "무릎 잠금 피하기"
              ],
              "progression": "12회 2세트 성공 시 증량."
            },
            {
              "name": "덤벨 워킹 런지",
              "engName": "Dumbbell Walking Lunge",
              "equipment": "덤벨",
              "sets": 3,
              "reps": "한쪽 10",
              "rest": 75,
              "targetMuscles": [
                "대퇴사두",
                "둔근",
                "햄스트링",
                "코어"
              ],
              "formCues": [
                "양손에 덤벨, 상체 곧게 세우고 한 발 앞으로 내딛는다",
                "앞 무릎이 발끝을 과하게 넘지 않게, 뒤 무릎은 바닥 직전까지",
                "앞 발뒤꿈치로 밀며 일어난다"
              ],
              "progression": "통증 없으면 무게 증량 또는 보폭/세트 추가.",
              "caution": "무릎 통증 시 스플릿 스쿼트(제자리)로 대체하거나 가동범위 축소."
            },
            {
              "name": "테크노짐 레그 컬",
              "engName": "Leg Curl",
              "equipment": "머신",
              "sets": 3,
              "reps": "12~15",
              "rest": 60,
              "targetMuscles": [
                "햄스트링"
              ],
              "formCues": [
                "끝까지 당겨 1초 짜기",
                "골반 고정",
                "천천히 편다"
              ],
              "progression": "15회 2세트 성공 시 증량."
            },
            {
              "name": "해머스트렝스 스탠딩 카프 레이즈",
              "engName": "Standing Calf Raise",
              "equipment": "머신",
              "sets": 3,
              "reps": "15~20",
              "rest": 45,
              "targetMuscles": [
                "비복근",
                "가자미근"
              ],
              "formCues": [
                "풀 가동범위로 올렸다 깊게 내린다",
                "위·아래 각 1초 정지",
                "무릎 곧게"
              ],
              "progression": "20회 쉬우면 증량."
            }
          ]
        },
        {
          "focus": "팔+어깨",
          "exercises": [
            {
              "name": "바벨 오버헤드 프레스",
              "engName": "Barbell Overhead Press",
              "equipment": "바벨",
              "sets": 4,
              "reps": "6~10",
              "rest": 120,
              "targetMuscles": [
                "전면·측면 어깨",
                "삼두",
                "상부 가슴"
              ],
              "formCues": [
                "바를 쇄골 위에 얹고 코어·둔근 단단히 조여 허리 보호",
                "머리 위로 곧게 밀고 바가 지날 때 머리를 살짝 뒤로 뺀다",
                "끝에서 어깨가 귀 옆까지 오게, 허리 과신전 금지"
              ],
              "progression": "10회 2세트 성공 시 2.5kg 증량.",
              "caution": "허리를 뒤로 과하게 젖혀 미는 것 금지. 어깨 통증 시 덤벨 숄더프레스로 대체."
            },
            {
              "name": "덤벨 사이드 레터럴 레이즈",
              "engName": "Dumbbell Side Lateral Raise",
              "equipment": "덤벨",
              "sets": 4,
              "reps": "12~15",
              "rest": 60,
              "targetMuscles": [
                "측면 어깨"
              ],
              "formCues": [
                "팔꿈치 살짝 굽혀 어깨 높이까지",
                "반동 없이 천천히 내린다",
                "승모근 으쓱 금지"
              ],
              "progression": "자세 유지되면 증량, 흔들리면 드롭세트로 마무리."
            },
            {
              "name": "케이블 리어 델트 플라이",
              "engName": "Cable Rear Delt Fly",
              "equipment": "케이블",
              "sets": 3,
              "reps": "12~15",
              "rest": 60,
              "targetMuscles": [
                "후면 어깨",
                "능형근"
              ],
              "formCues": [
                "팔을 옆·뒤로 벌리며 견갑골 모으기",
                "어깨 뒤쪽에 집중, 목 힘 빼기",
                "일정 장력 유지"
              ],
              "progression": "15회 2세트 성공 시 증량."
            },
            {
              "name": "바벨 바이셉스 컬",
              "engName": "Barbell Biceps Curl",
              "equipment": "바벨",
              "sets": 3,
              "reps": "8~12",
              "rest": 60,
              "targetMuscles": [
                "이두"
              ],
              "formCues": [
                "팔꿈치 고정, 반동 금지",
                "끝까지 짜고 천천히 내린다",
                "손목 곧게"
              ],
              "progression": "12회 2세트 성공 시 증량."
            },
            {
              "name": "딥 / 클로즈그립 푸시업",
              "engName": "Dips / Close-Grip Push-up",
              "equipment": "맨몸",
              "sets": 3,
              "reps": "8~12",
              "rest": 75,
              "targetMuscles": [
                "삼두",
                "가슴 하부",
                "전면 어깨"
              ],
              "formCues": [
                "딥은 몸을 거의 수직으로 세워 삼두 위주, 어깨 통증 없는 깊이까지",
                "푸시업은 손을 어깨너비로 좁히고 팔꿈치를 몸통에 붙인다",
                "몸은 일직선, 코어 고정"
              ],
              "progression": "맨몸 12회가 쉬우면 어시스트 줄이기 또는 가중. 아직 어려우면 어시스트 딥 머신으로.",
              "caution": "체중 부하가 크면 정자세 딥이 어깨에 부담될 수 있음. 어시스트 머신/벤치 딥부터 단계적으로."
            },
            {
              "name": "케이블 트라이셉스 푸시다운",
              "engName": "Cable Triceps Pushdown",
              "engName2": "",
              "equipment": "케이블",
              "sets": 3,
              "reps": "12~15",
              "rest": 60,
              "targetMuscles": [
                "삼두"
              ],
              "formCues": [
                "팔꿈치 고정",
                "끝까지 펴 짜기",
                "반동 금지"
              ],
              "progression": "15회 2세트 성공 시 한 핀 증량."
            }
          ]
        }
      ]
    }
  ],
  "cooldown": [
    {
      "step": "저강도 유산소 정리",
      "detail": "실내자전거나 가벼운 걷기 5분으로 심박수를 서서히 낮춘다."
    },
    {
      "step": "정적 스트레칭",
      "detail": "그날 사용한 주요 근육(가슴·등·하체·어깨·팔)을 각 30초씩 천천히 늘린다. 반동 없이 호흡하며 통증 없는 범위까지만."
    },
    {
      "step": "하체 집중 스트레칭",
      "detail": "하체일에는 대퇴사두·햄스트링·종아리·둔근을 추가로 풀어 무릎·고관절 회복을 돕는다."
    },
    {
      "step": "호흡 정리",
      "detail": "코로 들이쉬고 입으로 길게 내쉬는 깊은 호흡 1~2분으로 마무리하고 수분을 보충한다."
    }
  ],
  "cautions": [
    {
      "topic": "무릎 보호 (최우선)",
      "detail": "체중이 많이 나가는 상태에서 깊은 스쿼트·런지·점프 동작은 무릎 연골에 큰 부담을 준다. 초기엔 박스 스쿼트와 레그 프레스로 가동범위를 제한하고, 점프·플라이오메트릭(점프 스쿼트, 박스 점프)은 관절이 충분히 적응할 때까지 하지 않는다."
    },
    {
      "topic": "저충격 유산소만",
      "detail": "유산소는 러닝·줄넘기 대신 실내자전거·일립티컬·경사 걷기·수영처럼 무릎 충격이 적은 종목을 선택한다. 관절과 체력이 적응하면 점차 러닝을 도입한다."
    },
    {
      "topic": "허리 보호",
      "detail": "데드리프트·로우·스쿼트에서 등이 둥글게 말리면 디스크 부담이 크다. 항상 등 중립을 유지하고, 무게보다 자세가 우선이다. 허리 통증이 있으면 해당 운동을 중단하고 머신으로 대체한다."
    },
    {
      "topic": "고중량은 안전장치 필수",
      "detail": "phase3의 바벨 벤치프레스·스쿼트·오버헤드프레스는 반드시 파워랙 세이프티 바를 걸거나 보조자(스파터)와 함께 한다. 단독으로 한계 무게에 도전하지 않는다."
    },
    {
      "topic": "어깨 충돌 주의",
      "detail": "랫풀다운 바를 목 뒤로 당기기, 비하인드넥 프레스, 과도하게 깊은 딥은 어깨 충돌·부상 위험이 크니 피한다. 어깨에 시큰한 통증이 오면 가동범위를 줄인다."
    },
    {
      "topic": "무게 욕심 금지·점진 적용",
      "detail": "초보자는 빠르게 무거워지고 싶은 욕심이 부상으로 이어진다. 한 주에 한 가지 변수만, 무게는 2.5~5%씩만 올린다. 한 단계(phase)를 건너뛰지 말고 자세가 안정된 뒤 다음 단계로 넘어간다."
    },
    {
      "topic": "혈압·어지럼증",
      "detail": "체중이 많이 나가면 고혈압 동반이 잦다. 무게를 들 때 숨을 참고 끙끙대는(과도한 발살바) 습관을 피하고, 들 때 내쉬고 내릴 때 들이쉰다. 일어설 때 어지럽거나 가슴 통증·심한 두근거림이 있으면 즉시 중단하고 의사와 상담한다."
    },
    {
      "topic": "관절 통증 신호",
      "detail": "근육의 타는 듯한 피로는 정상이지만, 관절에서 찌르는·시큰한·날카로운 통증은 멈추라는 신호다. 참고 진행하지 말고 무게를 낮추거나 종목을 바꾼다. 통증이 지속되면 정형외과 진료를 받는다."
    },
    {
      "topic": "운동 시작 전 건강 확인",
      "detail": "체중이 많이 나가거나 기저질환이 의심되면 시작 전 기본 건강검진(혈압·혈당·관절)을 권장한다. 무릎·허리에 기존 질환이 있으면 전문의·물리치료사와 종목을 조정한다."
    }
  ]
};
const CARDIO = {
  "modalities": [
    {
      "name": "경사 걷기(트레드밀 incline walk)",
      "impact": "매우 낮음",
      "pros": "무릎 충격이 거의 없어 체중이 많이 나가는 초보자에게 가장 안전. 경사(3~8%)로 속도를 높이지 않아도 심박을 Zone2로 올릴 수 있어 관절 부담 없이 칼로리 소모 큼. 난간 잡지 않고 자연스러운 보행 자세 유지 가능. 초보자 진입장벽 낮음.",
      "cons": "평지 걷기보다 종아리/아킬레스 자극이 커 처음엔 발목·발바닥 통증 가능(족저근막염 주의). 장시간 시 지루함. 속도를 높이면(빠른 걷기→달리기) 충격 급증하므로 속도 대신 경사로만 강도 조절해야 함."
    },
    {
      "name": "실내자전거(고정/리컴번트)",
      "impact": "매우 낮음",
      "pros": "체중이 안장에 실려 무릎 체중부하가 거의 없음. 리컴번트(등받이형)는 허리·무릎 부담이 더 적어 체중이 많이 나가는 초보에 최적. 강도 조절(저항) 정밀하고 날씨 무관. HIIT 전환 시에도 충격 없이 강도만 올릴 수 있음.",
      "cons": "안장 불편감(초기 엉덩이 통증), 안장 높이가 낮으면 오히려 무릎 앞쪽 통증 유발(안장은 다리 거의 펴질 높이로). 상체·전신 동원이 적어 같은 시간 대비 소모가 걷기보다 낮을 수 있음."
    },
    {
      "name": "일립티컬(엘립티컬)",
      "impact": "낮음",
      "pros": "발이 페달에서 떨어지지 않아 착지 충격(impact)이 0에 가까움. 상·하체 동시 사용으로 심박을 빠르게 올리고 시간당 소모 높음. 걷기보다 무릎 굴곡 부담 적음.",
      "cons": "기구에 따라 보폭·동작이 맞지 않으면 무릎/고관절 어색함. 균형·동작 학습 필요. 일부 기종은 발 저림 발생. 체중이 많이 나가면 안정적인 상용 기종 권장."
    },
    {
      "name": "로잉(실내 조정)",
      "impact": "낮음",
      "pros": "전신 90% 근육 동원으로 짧은 시간에 높은 심폐 자극, 등·하체 근력 보조 효과. 착지 충격 없음. Zone2~인터벌 모두 활용 가능.",
      "cons": "동작 난이도 높아 잘못하면 허리 부상 위험(다리→허리→팔 순서, 등 둥글게 금지). 초보자는 폼 학습 필수, 처음 2~3주는 짧게. 무릎 깊은 굴곡이 반복되어 무릎 전방 통증 있으면 캐치 구간 짧게."
    },
    {
      "name": "수영/아쿠아로빅",
      "impact": "무충격(제로)",
      "pros": "부력으로 관절 체중부하 사실상 0, 무릎 통증자에게 가장 안전한 회복·유산소. 전신 운동에 체온조절 좋아 과열 위험 적음. 아쿠아워킹은 수영 못해도 가능.",
      "cons": "접근성(수영장 이동·시간) 제약, 수영 기술 없으면 심박 유지 어려움. 염소·준비시간 번거로움. 칼로리 소모 직접 효과는 식단·총활동량 대비 과대평가 주의(끝나고 식욕 증가 경향)."
    }
  ],
  "heartRate": {
    "maxHR": 190,
    "zones": [
      {
        "zone": "Zone1 (회복, 50-60%)",
        "bpm": "95-114",
        "use": "준비운동/정리운동, 운동일 사이 활동적 회복. 무릎 통증 후 복귀 시 여기부터."
      },
      {
        "zone": "Zone2 (유산소 기초, 60-70%)",
        "bpm": "114-133",
        "use": "지방대사·기초 심폐 형성의 핵심 구간. 1~4주 모든 유산소는 여기. '대화 가능하지만 노래는 힘든' 강도. 지방대사 주력 존."
      },
      {
        "zone": "Zone3 (템포, 70-80%)",
        "bpm": "133-152",
        "use": "체력 향상된 5주차 이후 일부 세션에서 사용. 약간 숨찬 지속 강도(LISS 상단)."
      },
      {
        "zone": "Zone4 (역치/인터벌, 80-90%)",
        "bpm": "152-171",
        "use": "13주차 이후 HIIT 고강도 구간(저충격 기구에서만). 30초~2분 짧게 반복."
      },
      {
        "zone": "Zone5 (최대, 90-100%)",
        "bpm": "171-190",
        "use": "초보 단계, 특히 체중 부하가 클 때는 사용 금지/지양. 관절·심혈관 부담 큼, 장기적으로도 거의 불필요."
      }
    ],
    "note": "maxHR은 220-나이=190(추정치). 개인차 ±10~12bpm. 가능하면 워치/체스트스트랩으로 실측 보정. 약 복용·카페인은 심박에 영향."
  },
  "phases": [
    {
      "period": "1-4주 (적응기 / Zone2 기초)",
      "frequency": "주 3회 시작 → 4주차 주 4회",
      "intensity": "전부 Zone2 (114-133bpm). 인터벌 없음. '옆사람과 대화 가능' 강도만.",
      "duration": "세션당 20분 → 매주 5분씩 늘려 4주차 35분. 경사 걷기·실내자전거 위주.",
      "placement": "근력 4분할(가슴삼두/등이두/하체/팔어깨)과 '같은 날 근력 직후'에 배치 추천. 순서는 반드시 근력 먼저 → 유산소 나중(근력 수행력 보호+지방동원). 단 ▲하체 운동일에는 유산소를 빼거나 상체 위주 기구(실내자전거 가볍게/일립티컬)로 짧게(15분)만 — 무릎 누적부하 방지. 권장 배치: 가슴삼두일+자전거20분 / 등이두일+경사걷기20분 / 하체일=유산소 생략 또는 가벼운 자전거15분 / 팔어깨일+일립티컬20분. 근력 안 하는 휴식일 중 1일은 완전휴식, 1일은 가벼운 산책으로 NEAT만."
    },
    {
      "period": "5-12주 (발달기 / Zone2 확장 + LISS 시작)",
      "frequency": "주 4-5회 (근력 4회 동반일 + 휴식일 1~2회)",
      "intensity": "대부분 Zone2, 주 1회만 Zone3(133-152bpm) 템포 도입. 아직 본격 HIIT는 아님(LISS=저강도 지속 위주).",
      "duration": "근력 같은 날 유산소 30-40분, 별도 휴식일 LISS는 40-50분(경사 걷기·자전거).",
      "placement": "기본은 근력 직후(같은 날) 유지하되, 유산소 시간이 길어지므로 '분리 배치' 옵션 추가: 근력은 저녁, 유산소(공복 걷기 등)는 아침 등 같은 날이라도 시간대 분리하면 둘 다 질 확보. ▲하체일은 여전히 무릎 충격 큰 유산소 금지 → 그날 유산소가 필요하면 수영/아쿠아 또는 리컴번트 자전거로. 휴식일 1회는 무충격 회복세션(수영/아쿠아 또는 매우 가벼운 일립티컬)으로 배정해 관절 휴식. 예시 주간: 월 가슴삼두+자전거35 / 화 등이두+경사걷기35 / 수 휴식일 LISS 수영40 / 목 하체(유산소 생략) / 금 팔어깨+일립티컬35 / 토 LISS 경사걷기45 / 일 완전휴식."
    },
    {
      "period": "13주+ (강화기 / Zone2 + HIIT·LISS 혼합)",
      "frequency": "주 5회 (Zone2 LISS 3회 + 인터벌 2회)",
      "intensity": "인터벌은 Zone4(152-171bpm) 30초~1분 work / 60~90초 Zone1-2 회복 ×6-10세트. 반드시 무충격 기구(실내자전거·일립티컬·로잉)에서만. Zone5 진입 금지.",
      "duration": "HIIT 세션 총 20-25분(워밍·쿨다운 포함), LISS 세션 45-60분.",
      "placement": "인터벌(HIIT)은 '하체 근력일과 겹치지 않게', 그리고 가급적 근력과 다른 날 또는 충분히 분리해 배치(고강도끼리 같은 날 쌓지 않기). 권장: HIIT는 상체 근력일 직후 또는 휴식일 오전에. LISS Zone2는 근력 직후나 저녁에 자유 배치. ▲하체일 당일과 다음날은 HIIT 금지(무릎 회복 우선). 예시 주간: 월 가슴삼두+자전거HIIT22 / 화 등이두+LISS경사걷기50 / 수 휴식일 LISS 수영/일립티컬45 / 목 하체(유산소 생략, 산책만) / 금 팔어깨+로잉HIIT22 / 토 LISS 자전거60 / 일 완전휴식. 체중이 95kg 이하로 내려오면 트레드밀 가벼운 조깅 인터벌을 조심스럽게 시도 가능."
    }
  ],
  "neat": {
    "stepGoals": [
      "1-4주: 일 6,000보 (현재 활동량에서 무리 없이 시작, 통증 없으면 유지)",
      "5-8주: 일 8,000보",
      "9-12주: 일 10,000보",
      "13주+: 일 12,000보 (정체기 돌파·유지의 핵심, 무릎 통증 시 8,000~10,000보로 조정)"
    ],
    "tips": [
      "엘리베이터·에스컬레이터 대신 계단(단, 내려갈 때는 무릎 충격 크므로 내려갈 땐 엘리베이터/천천히)",
      "대중교통 한 정거장 미리 내려 걷기, 점심 식후 10분 산책(혈당·소화·NEAT 동시 효과)",
      "전화·통화는 서서 걸으며, 1시간마다 알람 맞춰 3분 일어나 움직이기",
      "장보기·집안일을 몰아서 하지 말고 자주 나눠서(움직임 빈도↑)",
      "집/사무실에 만보계·스마트워치로 실시간 피드백, 주간 평균 기록",
      "주말 '한 곳 정해 걷기'(공원·하천 평지) 루틴화 — 평지가 무릎에 가장 안전",
      "서서 일하는 스탠딩데스크나 높은 테이블 활용해 앉는 시간 줄이기"
    ]
  },
  "warningSigns": [
    "운동 중 무릎 '날카로운/찌르는' 통증 → 즉시 중단(둔한 근육통과 구분)",
    "무릎이 붓거나 열감·붉어짐 → 운동 중지, RICE(휴식·냉찜질·압박·거상), 지속 시 정형외과",
    "계단 내려갈 때·앉았다 일어날 때 무릎 앞쪽 통증(슬개대퇴 증후군 의심) → 충격운동 빼고 수영/자전거로 전환",
    "관절에서 '딱딱/걸리는' 소리와 함께 통증 동반 시 진료",
    "운동 다음날까지 가라앉지 않는 통증, 또는 통증이 매주 심해지는 추세 → 강도·빈도 1단계 낮추기",
    "걷기/달리기 중 무릎이 꺾이는 느낌(불안정감, giving way) → 즉시 중단",
    "발목·발바닥·정강이 통증(경사 걷기 과사용) → 경사·시간 줄이고 무충격 기구로 분산",
    "공통 원칙: 통증 척도 10점 중 3점 넘으면 그날 중단, 통증 부위는 48시간 휴식 후 Zone1부터 재개. 흉통·심한 어지럼·식은땀·호흡곤란은 즉시 운동 중단 및 의료진 연락."
  ]
};
const DIET = {
  "sampleDays": [
    {
      "day": "1일차 (집밥+편의점 위주)",
      "meals": [
        {
          "type": "아침",
          "foods": [
            "무가당 그릭요거트 200g",
            "프로틴 셰이크 1스쿱(물)",
            "오트밀 30g",
            "블루베리 한줌",
            "바나나 1개"
          ],
          "kcal": 500,
          "protein": 49
        },
        {
          "type": "점심",
          "foods": [
            "닭가슴살 180g 구이",
            "현미밥 150g",
            "모듬 샐러드+발사믹 드레싱"
          ],
          "kcal": 560,
          "protein": 47
        },
        {
          "type": "저녁",
          "foods": [
            "고등어구이 1토막",
            "된장찌개(두부 추가)",
            "현미밥 150g",
            "시금치나물",
            "김치"
          ],
          "kcal": 620,
          "protein": 42
        },
        {
          "type": "간식",
          "foods": [
            "편의점 단백질음료 1팩",
            "닭가슴살 소시지 2개",
            "방울토마토 1컵"
          ],
          "kcal": 350,
          "protein": 40
        }
      ],
      "totalKcal": 2030,
      "totalProtein": 178
    },
    {
      "day": "2일차 (점심 외식+저녁 집밥)",
      "meals": [
        {
          "type": "아침",
          "foods": [
            "편의점 스팀 닭가슴살 1팩",
            "무가당 그릭요거트 150g",
            "오트밀 40g",
            "바나나 1개"
          ],
          "kcal": 450,
          "protein": 43
        },
        {
          "type": "점심(외식)",
          "foods": [
            "닭갈비 1인분(볶음밥 생략)",
            "쌈채소 듬뿍",
            "무가당 두유 190ml"
          ],
          "kcal": 650,
          "protein": 42
        },
        {
          "type": "저녁",
          "foods": [
            "소고기 살코기 구이 150g",
            "상추쌈",
            "현미밥 120g",
            "미역국",
            "김치"
          ],
          "kcal": 610,
          "protein": 44
        },
        {
          "type": "간식",
          "foods": [
            "프로틴 셰이크 1스쿱",
            "무가당 그릭요거트 150g",
            "사과 1개"
          ],
          "kcal": 320,
          "protein": 40
        }
      ],
      "totalKcal": 2030,
      "totalProtein": 169
    },
    {
      "day": "3일차 (회식 포함)",
      "meals": [
        {
          "type": "아침",
          "foods": [
            "프로틴 오트밀(오트밀 40g+프로틴 1스쿱+무가당 두유 190ml)",
            "견과류 약간",
            "블루베리 한줌"
          ],
          "kcal": 470,
          "protein": 38
        },
        {
          "type": "점심",
          "foods": [
            "참치(라이트, 기름뺀) 야채비빔밥(고추장 소량)",
            "두부 1/2모",
            "김치"
          ],
          "kcal": 580,
          "protein": 44
        },
        {
          "type": "저녁(회식)",
          "foods": [
            "돼지 목살 구이 200g",
            "상추쌈+된장 약간",
            "쌈채소 듬뿍",
            "소주는 절제(1~2잔)"
          ],
          "kcal": 620,
          "protein": 48
        },
        {
          "type": "간식",
          "foods": [
            "무가당 그릭요거트 150g",
            "단백질바 1개",
            "저지방 우유 200ml"
          ],
          "kcal": 380,
          "protein": 38
        }
      ],
      "totalKcal": 2050,
      "totalProtein": 168
    }
  ],
  "foodDb": [
    {
      "name": "흰쌀밥",
      "serving": "1공기(210g)",
      "kcal": 310,
      "protein": 6,
      "tip": "반공기로 줄이면 약 150kcal 절약"
    },
    {
      "name": "현미밥",
      "serving": "1공기(210g)",
      "kcal": 300,
      "protein": 6.5,
      "tip": "흰밥 대신 선택, 식이섬유·포만감 우수"
    },
    {
      "name": "고구마",
      "serving": "중간 1개(150g)",
      "kcal": 180,
      "protein": 2.5,
      "tip": "흰밥 대체 탄수, 운동 전 좋음"
    },
    {
      "name": "닭가슴살(구이)",
      "serving": "100g",
      "kcal": 110,
      "protein": 23,
      "tip": "다이어트 단백질 1순위, 미리 손질해 보관"
    },
    {
      "name": "닭안심",
      "serving": "100g",
      "kcal": 105,
      "protein": 23,
      "tip": "닭가슴살보다 부드러워 질림 방지"
    },
    {
      "name": "편의점 스팀 닭가슴살",
      "serving": "1팩(100g)",
      "kcal": 110,
      "protein": 22,
      "tip": "나트륨 낮은 제품 선택"
    },
    {
      "name": "두부",
      "serving": "1/2모(150g)",
      "kcal": 120,
      "protein": 13,
      "tip": "데치거나 살짝 구워 기름 최소화"
    },
    {
      "name": "순두부/연두부",
      "serving": "1팩(300g)",
      "kcal": 110,
      "protein": 10,
      "tip": "찌개·국으로 데워 먹기 간편, 단백질 보충에 좋음"
    },
    {
      "name": "연어구이",
      "serving": "100g",
      "kcal": 200,
      "protein": 22,
      "tip": "오메가3 풍부, 주 2회 권장"
    },
    {
      "name": "고등어구이",
      "serving": "1토막(100g)",
      "kcal": 200,
      "protein": 21,
      "tip": "소금 적게, 구이로 기름 빼기"
    },
    {
      "name": "참치캔(라이트)",
      "serving": "1캔(100g, 기름뺀)",
      "kcal": 110,
      "protein": 25,
      "tip": "기름 따라내면 칼로리 크게 절감"
    },
    {
      "name": "소고기 살코기(우둔/홍두깨)",
      "serving": "100g",
      "kcal": 130,
      "protein": 21,
      "tip": "마블링 적은 부위 선택"
    },
    {
      "name": "돼지 안심/뒷다리",
      "serving": "100g",
      "kcal": 140,
      "protein": 21,
      "tip": "삼겹살 대신 살코기 부위로"
    },
    {
      "name": "제육볶음",
      "serving": "1인분",
      "kcal": 600,
      "protein": 28,
      "tip": "양념·기름 많음, 밥 줄이고 채소 추가"
    },
    {
      "name": "삼겹살 구이",
      "serving": "200g",
      "kcal": 660,
      "protein": 34,
      "tip": "목살/등심으로 대체 권장, 비계 제거"
    },
    {
      "name": "무가당 그릭요거트",
      "serving": "100g",
      "kcal": 65,
      "protein": 10,
      "tip": "가당 제품은 당 많으니 무가당으로"
    },
    {
      "name": "저지방 우유",
      "serving": "200ml",
      "kcal": 90,
      "protein": 7
    },
    {
      "name": "무가당 두유",
      "serving": "190ml",
      "kcal": 80,
      "protein": 6,
      "tip": "가당 두유는 당 주의"
    },
    {
      "name": "프로틴 셰이크",
      "serving": "1스쿱+물",
      "kcal": 120,
      "protein": 24,
      "tip": "단백질 목표 미달 시 간식으로 보충"
    },
    {
      "name": "편의점 단백질음료",
      "serving": "1팩",
      "kcal": 150,
      "protein": 20,
      "tip": "당 5g 이하 제품 추천"
    },
    {
      "name": "단백질바",
      "serving": "1개",
      "kcal": 200,
      "protein": 15,
      "tip": "당·지방 라벨 확인 후 선택"
    },
    {
      "name": "닭가슴살 소시지",
      "serving": "1개",
      "kcal": 70,
      "protein": 9
    },
    {
      "name": "삼각김밥(참치마요)",
      "serving": "1개",
      "kcal": 200,
      "protein": 5,
      "tip": "마요류보다 구운주먹밥/일반 김밥이 나음"
    },
    {
      "name": "김밥",
      "serving": "1줄",
      "kcal": 480,
      "protein": 12,
      "tip": "참치·야채 위주로, 절반만 먹기"
    },
    {
      "name": "김치찌개",
      "serving": "1인분",
      "kcal": 350,
      "protein": 18,
      "tip": "돼지 비계 걷어내고 건더기 위주로"
    },
    {
      "name": "된장찌개",
      "serving": "1인분",
      "kcal": 200,
      "protein": 12,
      "tip": "두부 추가하면 단백질 상승"
    },
    {
      "name": "미역국",
      "serving": "1그릇",
      "kcal": 100,
      "protein": 6
    },
    {
      "name": "비빔밥",
      "serving": "1그릇",
      "kcal": 550,
      "protein": 16,
      "tip": "고추장·참기름 적게, 밥 양 줄이기"
    },
    {
      "name": "물냉면",
      "serving": "1그릇",
      "kcal": 550,
      "protein": 16,
      "tip": "면 절반, 고기 고명 추가로 단백질 보강"
    },
    {
      "name": "라면",
      "serving": "1봉",
      "kcal": 500,
      "protein": 10,
      "tip": "가급적 피하고, 먹으면 채소·단백질 추가"
    },
    {
      "name": "떡볶이",
      "serving": "1인분",
      "kcal": 480,
      "protein": 9,
      "tip": "고탄수·고당, 단백질 별도 보충 필수"
    },
    {
      "name": "후라이드 치킨",
      "serving": "1조각",
      "kcal": 250,
      "protein": 15,
      "tip": "껍질 제거 또는 구운치킨 선택"
    },
    {
      "name": "닭갈비",
      "serving": "1인분",
      "kcal": 600,
      "protein": 35,
      "tip": "마무리 볶음밥은 생략"
    },
    {
      "name": "시금치나물",
      "serving": "1접시",
      "kcal": 50,
      "protein": 3
    },
    {
      "name": "콩나물무침",
      "serving": "1접시",
      "kcal": 45,
      "protein": 4
    },
    {
      "name": "방울토마토",
      "serving": "1컵",
      "kcal": 30,
      "protein": 1.5
    },
    {
      "name": "바나나",
      "serving": "1개",
      "kcal": 90,
      "protein": 1,
      "tip": "운동 전 탄수 보충에 좋음"
    },
    {
      "name": "사과",
      "serving": "1개",
      "kcal": 95,
      "protein": 0.5
    },
    {
      "name": "견과류",
      "serving": "한줌(25g)",
      "kcal": 150,
      "protein": 5,
      "tip": "몸에 좋아도 고칼로리, 한 줌까지만"
    },
    {
      "name": "오트밀",
      "serving": "건조 40g",
      "kcal": 150,
      "protein": 5,
      "tip": "우유/두유에 불려 그릭요거트와 함께"
    },
    {
      "name": "아메리카노",
      "serving": "1잔",
      "kcal": 5,
      "protein": 0,
      "tip": "라떼·프라푸치노 대신 기본 선택"
    },
    {
      "name": "소주",
      "serving": "1병",
      "kcal": 410,
      "protein": 0,
      "tip": "회식 시 절제, 안주는 단백질로"
    },
    {
      "name": "쌈채소(상추/깻잎)",
      "serving": "무제한",
      "kcal": 20,
      "protein": 1,
      "tip": "고기 쌈으로 포만감 채우기"
    }
  ],
  "eatingOut": [
    "밥은 반공기만 요청하고 면·튀김류는 절반만, 단백질 반찬부터 먼저 먹는다.",
    "국·찌개는 건더기 위주로 먹고 국물은 적게(나트륨·칼로리·부종 방지).",
    "고기 회식은 삼겹살 대신 목살·등심·안심을 고르고 비계는 걷어낸 뒤 쌈채소를 듬뿍 곁들인다.",
    "드레싱·고추장·마요·양념소스는 따로 달라고 해서 찍어 먹어 양을 절반으로 줄인다.",
    "술은 가능하면 피하고, 마시면 1~2잔으로 제한하며 안주는 회·수육·닭 등 단백질로 고른다.",
    "배달은 1인분만 주문하고 튀김·치즈·크림 메뉴 대신 구이·찜·국밥(밥 반공기)을 선택한다.",
    "식사 전 물 한 컵을 마시고 채소→단백질→탄수화물 순서로 먹어 과식을 막는다.",
    "후식·음료는 단 음료 대신 아메리카노나 제로 음료로 대체한다."
  ],
  "convenienceStore": [
    "스팀 닭가슴살 1팩 + 무가당 두유 190ml + 방울토마토(또는 바나나) → 약 330kcal, 단백질 29g (가벼운 한 끼)",
    "구운주먹밥 1개 + 단백질음료 1팩 + 닭가슴살 소시지 2개 → 약 450kcal, 단백질 33g (든든한 한 끼)",
    "무가당 그릭요거트 + 단백질바 1개 + 아메리카노 → 약 330kcal, 단백질 27g (간식 또는 가벼운 아침)"
  ],
  "swaps": [
    {
      "from": "흰쌀밥 1공기",
      "to": "현미밥 반공기",
      "save": "약 150kcal 절감 + 혈당 안정"
    },
    {
      "from": "삼겹살",
      "to": "돼지 목살/등심",
      "save": "100g당 약 150kcal·지방 절감"
    },
    {
      "from": "카페라떼",
      "to": "아메리카노",
      "save": "약 150~200kcal 절감"
    },
    {
      "from": "라면",
      "to": "곤약/두부면 + 닭가슴살",
      "save": "약 300kcal 절감 + 단백질 +20g"
    },
    {
      "from": "후라이드 치킨",
      "to": "구운치킨/닭가슴살",
      "save": "칼로리 약 50% + 트랜스지방 제거"
    }
  ],
  "generalRules": [
    "단백질 우선: 매 끼니 손바닥 1~2개 분량의 단백질(닭가슴살·두부·생선·살코기·달걀·유제품)을 먼저 채운다. 하루 목표는 체중 1kg당 약 1.6~2.0g, 부족하면 프로틴 셰이크로 보충한다.",
    "식사 순서 지키기: 물 → 채소·국 → 단백질 → 탄수화물 순으로 먹어 혈당 급상승과 과식을 막는다.",
    "탄수화물은 정제→복합으로: 흰밥·면·빵을 줄이고 현미·잡곡·고구마로 바꾸며 밥은 반공기를 기준으로 한다.",
    "가공식품·당 줄이기: 가당음료·과자·디저트를 끊고 라벨의 당·액상과당을 확인하며 음료는 물·아메리카노·제로로 대체한다.",
    "술 최소화: 회식에서도 1~2잔으로 제한한다. 술은 자체 칼로리가 높고 다음 날 식욕·폭식을 유발한다.",
    "관절 보호와 회복: 초보자는 무릎 충격이 적은 운동(걷기·실내자전거·수영·상체 위주 근력)부터 시작하고, 하루 물 2L 이상 마시며 체중은 주 1% 이내로 완만하게 변화시킨다."
  ]
};
const EDUCATION = {
  "lessons": [
    {
      "title": "왜 근손실 방지가 체중 관리의 핵심인가",
      "icon": "💪",
      "summary": "굶기만 하면 지방과 함께 근육도 빠져 기초대사량이 떨어지고, 결국 같은 양을 먹어도 살이 찌는 몸이 됩니다. 근육은 가만히 있어도 칼로리를 태우는 엔진이라, 체중을 바꾸는 긴 여정에서 근육을 지키는 것이 요요를 막는 가장 확실한 보험입니다.",
      "points": [
        "극단적 단식·폭식 대신 목표에 맞춰 하루 약 300~500kcal 범위에서 완만하게 조절한다(감량은 적자, 증량은 흑자)",
        "주 4회 근력운동으로 '체중이 변하는 동안에도 근육에 자극'을 준다",
        "체중계 숫자보다 거울·허리둘레·옷핏으로 체성분 변화를 함께 본다"
      ]
    },
    {
      "title": "단백질, 포만감과 근육을 동시에 잡는 무기",
      "icon": "🍗",
      "summary": "단백질은 근육의 재료이자 소화에 에너지를 많이 써서 같은 칼로리라도 살이 덜 찌고 더 오래 배부릅니다. 체중을 관리하는 시기에는 단백질 섭취를 충분히 해야 근육 손실을 막을 수 있습니다.",
      "points": [
        "목표 체중 1kg당 약 1.6~2.0g, 끼니마다 손바닥 크기 단백질을 채운다",
        "닭가슴살·생선·두부·콩·달걀·그릭요거트·살코기 등으로 단백질원을 다양하게 분산한다",
        "아침 단백질을 챙기면 하루 식욕과 군것질이 눈에 띄게 줄어든다"
      ]
    },
    {
      "title": "수면과 회복이 곧 지방 연소다",
      "icon": "😴",
      "summary": "잠이 부족하면 식욕 호르몬(그렐린)이 올라가고 포만 호르몬(렙틴)이 떨어져 다음 날 폭식 확률이 크게 높아집니다. 또한 근육은 운동할 때가 아니라 잘 때 회복·성장하므로 수면은 운동만큼 중요한 훈련입니다.",
      "points": [
        "매일 7~8시간, 가능하면 취침·기상 시간을 일정하게 고정한다",
        "잠들기 1시간 전 스마트폰·야식·음주를 끊는다",
        "운동한 부위가 아픈 날은 무리하지 말고 회복을 우선한다"
      ]
    },
    {
      "title": "물과 NEAT(일상 활동량)의 힘",
      "icon": "🚶",
      "summary": "물은 포만감을 주고 신진대사를 돕는데, 갈증을 배고픔으로 착각해 먹는 경우가 의외로 많습니다. NEAT는 운동 외 일상 움직임으로, 헬스 1시간보다 하루 종일 더 많이 움직이는 것이 총 소비 칼로리에 더 크게 기여하기도 합니다.",
      "points": [
        "하루 물 2~3L, 식사 30분 전 물 한 컵으로 과식을 예방한다",
        "엘리베이터 대신 계단, 한 정거장 미리 내려 걷기를 습관화한다",
        "목표 걸음수를 정하고(예: 하루 8,000보) 폰 만보기로 매일 확인한다"
      ]
    },
    {
      "title": "정체기는 실패가 아니라 통과 의례",
      "icon": "📉",
      "summary": "체중은 직선으로 빠지지 않고 2~4주씩 멈추는 구간이 반드시 옵니다. 몸이 적은 칼로리에 적응한 자연스러운 반응이므로, 멈췄다고 포기하는 것이 진짜 실패입니다.",
      "points": [
        "2주 이상 정체면 식단을 다시 기록해 '숨은 칼로리'부터 점검한다",
        "칼로리를 더 줄이기보다 걸음수·운동 강도를 먼저 올린다",
        "주 단위 평균 체중(매일 같은 조건 측정)으로 추세를 보고 하루 변동에 흔들리지 않는다"
      ]
    },
    {
      "title": "부상 예방과 워밍업, 무게보다 우선",
      "icon": "🦵",
      "summary": "체중이 많이 나갈수록 무릎·발목·허리 관절 부담이 커지고, 초반 부상은 운동을 통째로 멈추게 만드는 가장 큰 적입니다. 가벼운 워밍업과 올바른 자세가 무게나 횟수보다 우선입니다.",
      "points": [
        "운동 전 5~10분 가벼운 유산소와 관절 돌리기로 몸을 데운다",
        "유산소는 달리기 대신 빠르게 걷기·실내자전거·수영 등 무릎 충격이 적은 종목을 택한다",
        "근력운동은 빈 봉·가벼운 무게로 자세부터 익히고, 통증(특히 무릎)이 오면 즉시 멈춘다"
      ]
    },
    {
      "title": "술과 음료, 눈에 안 보이는 칼로리 폭탄",
      "icon": "🍺",
      "summary": "술은 그 자체 칼로리도 높지만 지방 연소를 우선순위에서 밀어내고 안주·야식으로 이어져 하루 노력을 한 번에 무너뜨립니다. 액체 칼로리는 포만감이 거의 없어 가장 줄이기 쉬운 칼로리이기도 합니다.",
      "points": [
        "소주 1병은 밥 두 공기 수준임을 기억하고 술자리 빈도를 먼저 줄인다",
        "탄산음료·과일주스·믹스커피 대신 물·탄산수·블랙커피로 바꾼다",
        "꼭 마셔야 하면 안주는 단백질·채소 위주로 고르고 양을 미리 정한다"
      ]
    },
    {
      "title": "완벽보다 꾸준함이 이긴다",
      "icon": "🔁",
      "summary": "하루 과식했다고 식단 관리가 끝나는 게 아니라, 그 다음 끼니에서 다시 평소대로 돌아오면 됩니다. 6개월~1년의 장기전에서는 100점짜리 3일보다 70점짜리 300일이 훨씬 큰 결과를 만듭니다.",
      "points": [
        "'올 오어 낫싱'을 버리고 한 끼 실수는 다음 끼니로 리셋한다",
        "운동 가기 싫은 날은 '10분만'이라는 최소 기준으로 일단 시작한다",
        "주 단위로 잘한 점 1가지를 기록해 작은 성공을 쌓는다"
      ]
    }
  ],
  "weeklySchedule": [
    {
      "day": "월",
      "activity": "근력: 가슴 + 삼두 (벤치프레스·체스트프레스·푸시업·삼두 익스텐션), 운동 전 5~10분 워밍업",
      "type": "근력"
    },
    {
      "day": "화",
      "activity": "유산소: 빠르게 걷기 또는 실내자전거 30~40분(무릎 충격 적게) + 가벼운 코어",
      "type": "유산소"
    },
    {
      "day": "수",
      "activity": "근력: 등 + 이두 (랫풀다운·시티드 로우·덤벨 컬), 가벼운 무게로 자세 위주",
      "type": "근력"
    },
    {
      "day": "목",
      "activity": "가벼운 활동/회복: 30분 산책과 전신 스트레칭, 무리하지 않기",
      "type": "휴식"
    },
    {
      "day": "금",
      "activity": "근력: 하체 (레그프레스·고블릿 스쿼트·레그컬), 무릎 통증 없는 가동범위로 시작",
      "type": "근력"
    },
    {
      "day": "토",
      "activity": "근력: 팔 + 어깨 (숄더프레스·사이드 레터럴·컬) + 마무리 유산소 20분",
      "type": "근력"
    },
    {
      "day": "일",
      "activity": "완전 휴식: 충분한 수면, 가벼운 스트레칭, 다음 주 식단·장보기 준비",
      "type": "휴식"
    }
  ],
  "habits": [
    "매일 같은 시간(아침 공복)에 체중을 재고 기록한다",
    "물병을 곁에 두고 하루 2L 이상 마신다",
    "끼니마다 손바닥 크기의 단백질을 먼저 챙긴다",
    "하루 8,000보 이상 걷기(만보기로 확인)",
    "밥 먹기 전 채소·국물부터 천천히 먹기",
    "자기 전 1시간은 폰·야식 끊고 같은 시간에 잠들기",
    "엘리베이터 대신 계단 이용하기",
    "오늘 먹은 것을 사진이나 앱으로 한 줄 기록하기"
  ],
  "mindset": [
    "숫자가 멈춰도 '과정'은 쌓이고 있다 — 추세를 믿고 하루 변동에 흔들리지 말 것",
    "'왜 시작했는가'(건강·무릎·자신감)를 적어 잘 보이는 곳에 붙여둔다",
    "의지력에 기대지 말고 환경을 바꾼다 — 집에 군것질 안 두고, 운동복 미리 꺼내두기",
    "한 번의 실수로 자책하지 말 것, 다음 한 끼가 진짜 식단 관리다",
    "전체 목표를 한 번에 보지 말고 '이번 주 작은 한 걸음'처럼 눈앞의 작은 목표에만 집중한다"
  ]
};

const NUTRITION = {
  plateau: [
    { method: "칼로리 재계산 및 소폭 하향", detail: "체중이 5~7kg 줄 때마다 TDEE가 떨어진다. 1주 평균이 2~3주간 그대로면 섭취 100~150kcal 감량, 또는 걸음수 1,500~2,000보 추가." },
    { method: "활동·운동 변수 조정", detail: "같은 운동에 몸이 적응한다. 근력 볼륨/중량을 늘리고, 유산소는 시간보다 강도(인터벌)·빈도를 바꾼다. 단 관절 보호 위해 저충격 위주." },
    { method: "다이어트 브레이크 + 정확도 점검", detail: "대사적응·코르티솔로 인한 정체는 1~2주 유지칼로리 휴식 후 풀리는 경우가 많다. 소스·기름·간식·음료의 '숨은 칼로리'를 기록으로 점검." },
  ],
  weightInterpretation: {
    method: "매일 같은 조건(기상 직후·공복) 측정 후 7일 이동평균으로 추세 판단. 하루치 숫자는 무시.",
    normalDailyFluctuationKg: "±1~2",
    causes: ["나트륨·탄수(글리코겐 1g당 수분 3g)", "전날 식사량·수분", "배변 여부", "근력운동 후 염증성 수분", "스트레스·수면(코르티솔)"],
    rule: "이번 주 평균 < 지난 주 평균이면 정상 진행. 정체 판단은 최소 2~3주 평균 비교로.",
  },
  hydration: { waterTargetLitersPerDay: "3.0~3.7", note: "현재 체중 × 30~35ml 기준. 운동 1시간당 +500~750ml." },
};

/* ============================ 유틸 ============================ */
const cls = (...a) => a.filter(Boolean).join(" ");
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const fmtDate = (k) => { const p = k.split("-"); return `${p[1]}.${p[2]}`; };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round = (v, step = 1) => Math.round(v / step) * step;
const WD = ["일","월","화","수","목","금","토"];
const daysBetween = (a, b) => Math.round((new Date(b+"T00:00:00") - new Date(a+"T00:00:00")) / 86400000);

function useLocal(key, initial) {
  const [val, setVal] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw != null ? JSON.parse(raw) : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(val)); window.dispatchEvent(new Event("fc:changed")); } catch {} }, [key, val]);
  return [val, setVal];
}

// 영양 계산 (Mifflin-St Jeor, 성별·목표 반영)
function computeNutrition(p) {
  const num = (v, d) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : d; };
  const sex = (p && p.sex === "female") ? "female" : "male";
  const goal = (p && (p.goal === "maintain" || p.goal === "gain")) ? p.goal : "cut"; // 기본 감량
  const weight = clamp(num(p && p.weight, 70), 30, 400);
  const height = clamp(num(p && p.height, 170), 100, 250);
  const age = clamp(num(p && p.age, 30), 14, 100);
  const activity = clamp(num(p && p.activity, 1.375), 1.2, 1.9);
  const basisW = clamp(num(p && p.goalWeight, weight), 30, 400); // 단백/지방 기준(목표체중 우선)

  const bmr = Math.round(10 * weight + 6.25 * height - 5 * age + (sex === "female" ? -161 : 5));
  const tdee = Math.round(bmr * activity);

  let target;
  if (goal === "maintain") {
    target = tdee;
  } else if (goal === "gain") {
    target = tdee + Math.min(500, Math.round(tdee * 0.125));
  } else {
    const floor = Math.max(sex === "female" ? 1200 : 1500, Math.round(bmr * 1.1));
    target = Math.max(Math.round(tdee * 0.825), floor);
  }
  target = Math.round(round(target, 10));

  const proteinPerKg = goal === "maintain" ? 1.6 : 2.0;
  const protein = Math.max(0, Math.round(basisW * proteinPerKg));
  const fat = Math.max(0, Math.round(basisW * 0.8));
  const carbs = Math.max(0, Math.round((target - protein * 4 - fat * 9) / 4));

  const maxHR = 220 - age;
  const zoneDefs = [["Zone1 회복",50,60,"준비·정리운동, 활동적 회복"],["Zone2 유산소 기초",60,70,"지방대사·기초 심폐. 지방대사 주력(대화O 노래X)"],["Zone3 템포",70,80,"체력 향상 후 일부 세션(약간 숨참)"],["Zone4 인터벌",80,90,"13주+ HIIT, 저충격 기구에서만"],["Zone5 최대",90,100,"초보·고부하 단계 지양"]];
  const zones = zoneDefs.map(([name, lo, hi, use]) => ({ name, lo: Math.round(maxHR*lo/100), hi: Math.round(maxHR*hi/100), use }));
  return { bmr, tdee, target, protein, fat, carbs, maxHR, zones };
}

// 마일스톤 (목표별 동적 생성) — startWeight/goalWeight/goal 기반
function computeMilestones(profile) {
  const start = profile.startWeight, goal = profile.goalWeight, g = profile.goal;
  const diff = Math.abs(start - goal);
  if (g === "maintain" || diff < 2) {
    return [
      { weeks: 2,  weight: null, label: "2주 · 루틴 안착",     expect: "주 4회 운동·식사 시간이 일정해지고 매일 체중 기록이 습관이 된다. 컨디션 기복이 줄어드는 시기." },
      { weeks: 4,  weight: null, label: "4주 · 체성분 변화",   expect: "체중은 거의 그대로지만 허리둘레·옷핏이 미세하게 달라진다. 같은 칼로리에서 근육이 늘고 지방이 줄기 시작." },
      { weeks: 8,  weight: null, label: "8주 · 근력 상승",     expect: "주요 종목 중량이 눈에 띄게 오르고 같은 무게가 가벼워진다. 거울로 보이는 라인이 또렷해진다." },
      { weeks: 12, weight: null, label: "12주 · 습관 고착",    expect: "건강한 식습관·운동이 의지가 아닌 '기본값'이 된다. 외식·회식 후에도 빠르게 루틴으로 복귀." },
      { weeks: 24, weight: null, label: "24주 · 라이프스타일", expect: "체중 유지가 자연스러워지고 체성분이 한 단계 좋아진다. 이제 수행능력·컨디션 중심으로 목표를 재설정." },
    ];
  }
  const dir = goal < start ? -1 : 1;
  const steps = clamp(Math.round(diff / 5), 4, 5);
  const stepKg = diff / steps;
  const cutExpect = [
    "초반 수분과 부기가 빠지며 몸이 가벼워지고, 무릎·발 부담이 줄어 걷기가 편해진다. 운동 루틴에 적응되는 시기.",
    "바지 허리가 눈에 띄게 헐거워지고 계단·산책 시 숨이 덜 찬다. 체력과 수면의 질이 좋아지는 게 느껴진다.",
    "얼굴·목선이 또렷해지고 근력운동 중량이 오르며 '몸이 단단해진다'는 감각이 생긴다.",
    "체지방이 빠지며 근육 라인이 보이기 시작하고 옷 사이즈가 확연히 바뀐다. 정체기가 올 수 있으니 활동량·강도를 점검할 시기.",
    "목표 구간에 근접. 마지막은 천천히 — 근력 강도를 유지해 제지방을 지키며 마무리한다.",
  ];
  const gainExpect = [
    "식사량·운동 볼륨에 적응하는 시기. 소화·식욕이 늘고 트레이닝 후 회복이 빨라진다.",
    "주요 종목 중량과 반복수가 오르고 펌핑·근육감이 또렷해진다. 체중이 꾸준히 우상향.",
    "어깨·가슴·팔 둘레가 눈에 띄게 커지고 옷의 핏이 달라진다. 단백질·총칼로리 재점검 시기.",
    "전반적인 근육량이 늘며 힘이 강해진다. 체지방이 과하게 늘지 않도록 증량 속도를 점검.",
    "목표 체중 구간 도달. 이제 클린 벌크 유지 또는 린매스 정리 단계로 전환을 고려.",
  ];
  const pool = dir < 0 ? cutExpect : gainExpect;
  const out = [];
  for (let i = 1; i <= steps; i++) {
    const last = i === steps;
    const w = round(start + dir * stepKg * i, 0.5);
    const wEnd = last ? goal : w;
    const delta = Math.round(Math.abs(start - wEnd));
    const label = last
      ? `${dir < 0 ? "-" : "+"}${delta}kg 목표 달성`
      : `${dir < 0 ? "-" : "+"}${delta}kg ${dir < 0 ? "감량" : "증량"}`;
    const ei = Math.round((i - 1) / (steps - 1) * (pool.length - 1));
    out.push({
      weight: wEnd,
      label,
      expect: last
        ? `목표 체중 ${goal}kg 도달. ${dir < 0 ? "이제 '빼기'에서 '유지'로 전환해 지금의 식습관·주 4회 운동을 라이프스타일로 굳히는 단계." : "이제 증량을 멈추고 체성분 정리·유지 단계로 전환하는 시기."}`
        : pool[ei],
    });
  }
  return out;
}
function milestoneReached(m, profile, cur) {
  if (m.weight == null) {
    const wks = profile.startDate ? daysBetween(profile.startDate, todayKey()) / 7 : 0;
    return wks >= m.weeks;
  }
  return profile.goal === "gain" ? cur >= m.weight : cur <= m.weight;
}
function nextMilestone(list, profile, cur) {
  return list.find((m) => !milestoneReached(m, profile, cur)) || list[list.length - 1];
}

// 예상 타임라인 (목표별 동적)
function computeTimeline(profile) {
  const start = profile.startWeight, goal = profile.goalWeight, g = profile.goal;
  const diff = Math.abs(start - goal);
  if (g === "maintain" || diff < 2) {
    return {
      phases: [
        { range: "0~4주 · 적응",    weeklyRateKg: "±0.2", note: "현재 체중 유지(TDEE 섭취). 운동 폼·루틴을 정착시키고 주 4회 출석률을 100%로." },
        { range: "4~12주 · 근비대", weeklyRateKg: "+0.1", note: "약한 잉여(+5~10%)로 제지방 위주 증가. 주요 종목 점진적 과부하에 집중." },
        { range: "12주+ · 재설계",  weeklyRateKg: "±0.2", note: "체성분·수행능력을 보고 컷/벌크 미니사이클로 재설정. 컨디션 우선." },
      ],
      estimatedDurationMonths: "지속(상시)",
      dietBreak: { frequency: "8~12주마다 1주", method: "강도·볼륨을 낮추는 디로드 주간으로 관절·신경을 회복. 섭취·단백질은 유지." },
    };
  }
  const cut = goal < start;
  const w0 = start;
  const w1 = start + (cut ? -diff * 0.45 : diff * 0.45);
  const w2 = start + (cut ? -diff * 0.78 : diff * 0.78);
  const w3 = goal;
  const fmt = (a, b) => `${Math.round(a)}→${Math.round(b)}kg`;
  let phases, totalWeeksLo, totalWeeksHi;
  if (cut) {
    const r = (w) => ({ lo: round(w * 0.005, 0.1), hi: round(w * 0.01, 0.1) });
    const p0 = r((w0 + w1) / 2), p1 = r((w1 + w2) / 2), p2 = r((w2 + w3) / 2);
    phases = [
      { range: fmt(w0, w1) + " (초기)", weeklyRateKg: `${p0.lo}~${p0.hi}`, note: "글리코겐·수분이 빠지며 감량이 가장 빠른 구간. 1% 미만 주간 변동은 대부분 수분." },
      { range: fmt(w1, w2) + " (중기)", weeklyRateKg: `${p1.lo}~${p1.hi}`, note: "체중이 줄며 TDEE 하락. 5~7kg 빠질 때마다 칼로리를 재계산한다." },
      { range: fmt(w2, w3) + " (후기)", weeklyRateKg: `${p2.lo}~${p2.hi}`, note: "근육 보존·관절 보호를 위해 천천히. 근력 강도를 유지해 제지방을 지킨다." },
    ];
    const avg = (w0 + w3) / 2;
    totalWeeksLo = diff / (avg * 0.01);
    totalWeeksHi = diff / (avg * 0.005);
  } else {
    phases = [
      { range: fmt(w0, w1) + " (초기)", weeklyRateKg: "+0.3~0.4",  note: "초보 적응기엔 근성장·증량이 비교적 빠르다. 단백질·총칼로리를 충분히 확보." },
      { range: fmt(w1, w2) + " (중기)", weeklyRateKg: "+0.2~0.3",  note: "체중이 늘며 유지칼로리 상승. 5kg 늘 때마다 섭취를 재계산한다." },
      { range: fmt(w2, w3) + " (후기)", weeklyRateKg: "+0.15~0.25", note: "지방 증가를 억제하기 위해 천천히. 과부하 원칙으로 근자극을 유지한다." },
    ];
    totalWeeksLo = diff / 0.4;
    totalWeeksHi = diff / 0.2;
  }
  const moLo = Math.max(1, Math.round(totalWeeksLo / 4.3));
  const moHi = Math.max(moLo, Math.round(totalWeeksHi / 4.3));
  return {
    phases,
    estimatedDurationMonths: moLo === moHi ? `${moLo}` : `${moLo}~${moHi}`,
    dietBreak: cut
      ? { frequency: "8~12주 다이어트 후 1~2주", method: "섭취칼로리를 유지(TDEE) 수준으로 상향, 단백질은 그대로. 대사적응 완화·렙틴 정상화. 폭식이 아니라 '계획된 유지'." }
      : { frequency: "10~12주 증량 후 1~2주",  method: "유지칼로리로 낮춰 늘어난 지방을 정리(미니컷)하거나 디로드로 회복. 단백질은 유지." },
  };
}
function phaseIndexForWeeks(weeks) { if (weeks < 4) return 0; if (weeks < 12) return 1; return 2; }
function topReps(reps) { const n = String(reps).match(/\d+/g); return n ? Number(n[n.length-1]) : 12; }
function botReps(reps) { const n = String(reps).match(/\d+/g); return n ? Number(n[0]) : 10; }

// 증량 단위
function incrementKg(ex) {
  const n = ex.name || ""; const eq = ex.equipment || "";
  const isolation = /(레터럴|컬|킥백|플라이|익스텐션|레이즈|푸시다운|펙덱|크로스오버)/.test(n);
  if (eq === "바벨") return /(스쿼트|데드|루마니안)/.test(n) ? 5 : 2.5;
  if (eq === "덤벨") return isolation ? 1 : 2;
  return 2.5; // 머신/케이블은 '핀' 단위지만 숫자 환산
}
function incrementLabel(ex) {
  const eq = ex.equipment || "";
  if (eq === "맨몸") return "반복수↑ 또는 난이도↑";
  if (eq === "머신" || eq === "케이블") return "다음 핀(한 칸)";
  return `+${incrementKg(ex)}kg`;
}

// 무릎 위험도 0~2 + 대체운동
function kneeRisk(ex) {
  const n = ex.name || "";
  if (/(워킹\s*런지|런지)/.test(n)) return 2;
  if (/바벨.*스쿼트|백스쿼트/.test(n)) return 2;
  if (/(고블릿|박스)\s*스쿼트|레그\s*프레스|레그\s*익스텐션|데드리프트|루마니안/.test(n)) return 1;
  if (ex.caution && /무릎/.test(ex.caution)) return 1;
  return 0;
}
function kneeAlternatives(ex) {
  const n = ex.name || "";
  if (/런지/.test(n)) return ["제자리 스플릿 스쿼트(가동범위↓)", "레그 프레스", "레그 컬+레그 익스텐션 조합"];
  if (/바벨.*스쿼트|백스쿼트/.test(n)) return ["레그 프레스(무릎 90°까지)", "박스 스쿼트(의자 높이)", "덤벨 고블릿 스쿼트(얕게)"];
  if (/레그\s*프레스/.test(n)) return ["가동범위를 무릎 90°까지만 제한", "발판 위치를 약간 위로(무릎 부담↓)"];
  if (/레그\s*익스텐션/.test(n)) return ["가동범위 축소 + 무게↓", "레그 프레스로 대체"];
  if (/데드리프트|루마니안/.test(n)) return ["허리 중립 유지 못하면 머신 백 익스텐션", "무게↓ 후 햄스트링 스트레치 집중"];
  return ["통증 시 가동범위↓ / 무게↓", "머신 버전으로 대체"];
}

// 워밍업 세트 자동생성 (working weight 기준)
function warmupSets(w) {
  const W = Number(w);
  if (!W || W <= 0) return [];
  return [
    { pct: "빈 봉/가볍게", weight: "-", reps: 12 },
    { pct: "50%", weight: round(W * 0.5, 2.5), reps: 8 },
    { pct: "70%", weight: round(W * 0.7, 2.5), reps: 5 },
    { pct: "85%", weight: round(W * 0.85, 2.5), reps: 3 },
  ];
}
// 플레이트 계산 (바벨 한쪽)
function platesPerSide(total, bar) {
  let per = (Number(total) - bar) / 2;
  if (!isFinite(per) || per <= 0) return null;
  const sizes = [25, 20, 15, 10, 5, 2.5, 1.25];
  const out = [];
  for (const s of sizes) { while (per >= s - 1e-6) { out.push(s); per = +(per - s).toFixed(3); } }
  return { plates: out, leftover: per };
}

// 직전 기록
function lastEntryFor(sessions, exName) {
  for (let i = sessions.length - 1; i >= 0; i--) {
    const e = sessions[i].entries && sessions[i].entries[exName];
    if (e && e.length) return { date: sessions[i].date, sets: e };
  }
  return null;
}
// 규칙형 다음 무게 제안 (설명가능)
function suggestNext(ex, last) {
  const top = topReps(ex.reps), bot = botReps(ex.reps);
  if (!last) return { tone: "sky", weight: null, text: `첫 세션 — ${top}회를 '여유 있게' 할 수 있는 가벼운 무게로 자세부터` };
  const reps = last.sets.map((s) => Number(s.reps) || 0);
  const maxW = Math.max(...last.sets.map((s) => Number(s.weight) || 0));
  const rirs = last.sets.map((s) => (s.rir === "" || s.rir == null ? null : Number(s.rir))).filter((v) => v != null);
  const avgRir = rirs.length ? rirs.reduce((a, b) => a + b, 0) / rirs.length : null;
  const allTop = reps.length > 0 && reps.every((r) => r >= top);
  const allBot = reps.length > 0 && reps.every((r) => r >= bot);
  const inc = incrementKg(ex);
  if (allTop && (avgRir == null || avgRir >= 1)) {
    const big = avgRir != null && avgRir >= 3;
    const add = big ? inc * 2 : inc;
    return { tone: "emerald", weight: maxW ? maxW + add : null,
      text: `지난번 전 세트 ${top}회 달성${big ? "(여유도 큼)" : ""} → ${incrementLabel(ex)}${big ? " (여유 많아 2배 증량 가능)" : ""}` };
  }
  if (allBot) return { tone: "amber", weight: maxW || null, text: `목표(${ex.reps}회) 범위 안 — 무게 유지하고 상단 ${top}회 채우기` };
  return { tone: "rose", weight: maxW || null, text: `목표 미달 — 무게 유지(또는 약간↓)하고 자세 우선으로 ${bot}회부터` };
}

// 음식 신호등 분류
function parseGrams(s) { const m = String(s).match(/(\d+)\s*g/); return m ? Number(m[1]) : null; }
const FOOD_GREEN = /닭가슴살|닭안심|두부|순두부|연두부|나물|쌈채소|상추|깻잎|시금치|콩나물|방울토마토|미역국|그릭요거트|참치|오징어|새우|샐러드|채소|아메리카노/;
const FOOD_RED = /라면|떡볶이|후라이드|삼겹살|제육|소주|짜장|탕수|피자|버거|도넛|케이크|과자|믹스커피|라떼/;
function trafficLight(f) {
  if (FOOD_RED.test(f.name)) return "red";
  if (FOOD_GREEN.test(f.name)) return "green";
  const g = parseGrams(f.serving);
  if (g) { const d = (f.kcal / g) * 100; return d < 130 ? "green" : d < 260 ? "yellow" : "red"; }
  return f.kcal < 150 ? "green" : f.kcal < 420 ? "yellow" : "red";
}
const TL = { green: { dot: "bg-lime-400", text: "text-lime-300", label: "저칼로리" }, yellow: { dot: "bg-amber-400", text: "text-amber-300", label: "보통" }, red: { dot: "bg-rose-400", text: "text-rose-300", label: "주의" } };
const hasEgg = (name) => /계란|달걀/.test(name);

/* ============================ 아이콘 ============================ */
function Ico({ name, className = "w-6 h-6", stroke = 2 }) {
  const c = { fill: "none", stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round" };
  const P = {
    home: <path {...c} d="M3 10.5 12 3l9 7.5M5 9.5V21h5v-6h4v6h5V9.5" />,
    dumbbell: <g {...c}><path d="M6.5 6.5l11 11M4 9l-1 1 11 11 1-1M20 15l1-1L10 3 9 4" /><path d="M3 14l2 2M19 6l2 2" /></g>,
    food: <g {...c}><path d="M4 3v7a3 3 0 0 0 3 3v8M5 3v5M9 3v5M9 3v7a3 3 0 0 1-3 3M16 3c-1.5 0-3 2-3 5s1.5 4 3 4v9" /></g>,
    chart: <g {...c}><path d="M4 19V5M4 19h16M8 16l3-4 3 2 4-6" /></g>,
    run: <g {...c}><circle cx="13" cy="4" r="1.6" /><path d="M5 21l3-5 3 1 1-4-4-1 3-3 3 2 3-1M11 13l2 3v5" /></g>,
    book: <g {...c}><path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2zM4 19a2 2 0 0 0 2 2h13" /></g>,
    plus: <path {...c} d="M12 5v14M5 12h14" />,
    timer: <g {...c}><circle cx="12" cy="13" r="8" /><path d="M12 13V9M9 2h6M19 6l1.5-1.5" /></g>,
    check: <path {...c} d="M5 12.5 10 17l9-10" />,
    water: <path {...c} d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />,
    fire: <path {...c} d="M12 3c1 3-2 4-2 7a2 2 0 0 0 4 0c2 2 3 3.5 3 6a5 5 0 0 1-10 0c0-4 3-6 5-13z" />,
    flag: <g {...c}><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></g>,
    chevron: <path {...c} d="M9 6l6 6-6 6" />,
    play: <path {...c} d="M7 5l12 7-12 7z" />,
    pause: <g {...c}><path d="M9 5v14M15 5v14" /></g>,
    reset: <g {...c}><path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4" /></g>,
    edit: <g {...c}><path d="M4 20h4L20 8l-4-4L4 16z" /><path d="M14 6l4 4" /></g>,
    trophy: <g {...c}><path d="M7 4h10v4a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M9 14h6M8 21h8M10 14l-.5 4h5l-.5-4" /></g>,
    info: <g {...c}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.5v.5" /></g>,
    sparkle: <path {...c} d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
    warn: <g {...c}><path d="M12 3 2 20h20zM12 10v5M12 18v.5" /></g>,
    swap: <g {...c}><path d="M4 8h13l-3-3M20 16H7l3 3" /></g>,
    x: <path {...c} d="M6 6l12 12M18 6 6 18" />,
    download: <g {...c}><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" /></g>,
    calc: <g {...c}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M16 15v2" /></g>,
  };
  return <svg viewBox="0 0 24 24" className={className} aria-hidden="true">{P[name] || null}</svg>;
}

/* ============================ 근육 지도 ============================ */
const MUSCLE_MAP = [[/대흉근|가슴/, "chest"],[/어깨|삼각근|델트/, "delts"],[/이두|상완이두/, "biceps"],[/삼두|상완삼두/, "triceps"],[/요골근|전완/, "forearms"],[/코어|복근|복부/, "core"],[/광배근|등(?!받이)/, "lats"],[/승모근|능형근/, "traps"],[/척추기립근|기립근/, "lowerback"],[/대퇴사두|사두/, "quads"],[/둔근|엉덩/, "glutes"],[/햄스트링/, "hams"],[/비복근|가자미근|종아리/, "calves"]];
function regionsOf(targets = []) { const s = new Set(); targets.forEach((t) => MUSCLE_MAP.forEach(([re, k]) => { if (re.test(t)) s.add(k); })); return s; }
function BodyMap({ targets }) {
  const r = regionsOf(targets), on = "#34d399", off = "#3f3f46", base = "#27272a", line = "#52525b";
  const f = (k) => (r.has(k) ? on : off);
  const g = (k) => (r.has(k) ? { filter: "drop-shadow(0 0 4px rgba(52,211,153,.7))" } : undefined);
  const SIL = "M70 8c8 0 13 5 13 12 0 5-2 8-2 8 6 1 14 4 16 11l5 24c1 4-4 6-6 2l-4-15v8c0 6-2 11-2 18l2 28c1 8 2 16 1 30l-2 38c-1 5-9 5-10 0l-4-44-3 0-4 44c-1 5-9 5-10 0l-2-38c-1-14 0-22 1-30l2-28c0-7-2-12-2-18v-8l-4 15c-2 4-7 2-6-2l5-24c2-7 10-10 16-11 0 0-2-3-2-8 0-7 5-12 13-12z";
  return (
    <div className="flex items-end justify-center gap-3 py-1">
      <svg viewBox="0 0 140 240" className="h-44 w-auto"><text x="70" y="234" textAnchor="middle" className="fill-zinc-500" fontSize="10">앞</text>
        <path fill={base} stroke={line} strokeWidth="1.5" d={SIL} />
        <ellipse cx="44" cy="62" rx="9" ry="7" fill={f("delts")} style={g("delts")} /><ellipse cx="96" cy="62" rx="9" ry="7" fill={f("delts")} style={g("delts")} />
        <rect x="52" y="66" width="14" height="16" rx="5" fill={f("chest")} style={g("chest")} /><rect x="74" y="66" width="14" height="16" rx="5" fill={f("chest")} style={g("chest")} />
        <rect x="60" y="88" width="20" height="34" rx="6" fill={f("core")} style={g("core")} />
        <ellipse cx="36" cy="84" rx="6" ry="13" fill={f("biceps")} style={g("biceps")} /><ellipse cx="104" cy="84" rx="6" ry="13" fill={f("biceps")} style={g("biceps")} />
        <ellipse cx="31" cy="112" rx="5" ry="12" fill={f("forearms")} style={g("forearms")} /><ellipse cx="109" cy="112" rx="5" ry="12" fill={f("forearms")} style={g("forearms")} />
        <rect x="55" y="128" width="13" height="40" rx="6" fill={f("quads")} style={g("quads")} /><rect x="72" y="128" width="13" height="40" rx="6" fill={f("quads")} style={g("quads")} />
        <ellipse cx="61" cy="196" rx="5" ry="14" fill={f("calves")} style={g("calves")} /><ellipse cx="79" cy="196" rx="5" ry="14" fill={f("calves")} style={g("calves")} />
      </svg>
      <svg viewBox="0 0 140 240" className="h-44 w-auto"><text x="70" y="234" textAnchor="middle" className="fill-zinc-500" fontSize="10">뒤</text>
        <path fill={base} stroke={line} strokeWidth="1.5" d={SIL} />
        <path d="M54 60 H86 L80 76 H60 Z" fill={f("traps")} style={g("traps")} />
        <path d="M52 80 L66 84 V104 L54 100 Z" fill={f("lats")} style={g("lats")} /><path d="M88 80 L74 84 V104 L86 100 Z" fill={f("lats")} style={g("lats")} />
        <rect x="62" y="104" width="16" height="18" rx="5" fill={f("lowerback")} style={g("lowerback")} />
        <ellipse cx="36" cy="84" rx="6" ry="13" fill={f("triceps")} style={g("triceps")} /><ellipse cx="104" cy="84" rx="6" ry="13" fill={f("triceps")} style={g("triceps")} />
        <rect x="55" y="126" width="13" height="20" rx="6" fill={f("glutes")} style={g("glutes")} /><rect x="72" y="126" width="13" height="20" rx="6" fill={f("glutes")} style={g("glutes")} />
        <rect x="55" y="150" width="13" height="34" rx="6" fill={f("hams")} style={g("hams")} /><rect x="72" y="150" width="13" height="34" rx="6" fill={f("hams")} style={g("hams")} />
        <ellipse cx="61" cy="200" rx="5" ry="14" fill={f("calves")} style={g("calves")} /><ellipse cx="79" cy="200" rx="5" ry="14" fill={f("calves")} style={g("calves")} />
      </svg>
    </div>
  );
}

/* ============================ 공통 UI ============================ */
function Card({ children, className = "" }) { return <div className={cls("rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur", className)}>{children}</div>; }
function Pill({ children, tone = "zinc" }) {
  const t = { zinc:"bg-zinc-800 text-zinc-300", emerald:"bg-lime-500/15 text-lime-300 ring-1 ring-lime-500/30", amber:"bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30", rose:"bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30", sky:"bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30", violet:"bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30" };
  return <span className={cls("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", t[tone])}>{children}</span>;
}
function SectionTitle({ icon, children, sub }) {
  return <div className="mb-3 flex items-center gap-2">{icon && <span className="text-lime-400"><Ico name={icon} className="w-5 h-5" /></span>}<h2 className="text-lg font-bold tracking-tight text-zinc-100">{children}</h2>{sub && <span className="text-xs text-zinc-500">{sub}</span>}</div>;
}
function Collapsible({ title, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return <Card className="overflow-hidden">
    <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-4 py-3 text-left">
      <span className="flex items-center gap-2 font-semibold text-zinc-100">{icon && <Ico name={icon} className="w-5 h-5 text-lime-400" />}{title}</span>
      <span className={cls("text-zinc-500 transition-transform", open && "rotate-90")}><Ico name="chevron" className="w-5 h-5" /></span>
    </button>
    {open && <div className="border-t border-zinc-800 px-4 py-3 text-sm text-zinc-300">{children}</div>}
  </Card>;
}
function Bar({ value, tone = "emerald" }) {
  const t = { emerald:"from-lime-400 to-lime-300", sky:"from-sky-400 to-cyan-300", amber:"from-amber-400 to-orange-300", violet:"from-violet-400 to-fuchsia-300", rose:"from-rose-400 to-orange-300" };
  return <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-800"><div className={cls("h-full rounded-full bg-gradient-to-r transition-all duration-500", t[tone])} style={{ width: `${clamp(value, 0, 100)}%` }} /></div>;
}
function Ring({ value, size = 96, stroke = 9, color = "#34d399", track = "#27272a", children }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - clamp(value, 0, 100) / 100);
  return <div className="relative" style={{ width: size, height: size }}>
    <svg width={size} height={size} className="-rotate-90"><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={stroke} /><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} className="transition-all duration-700" /></svg>
    <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
  </div>;
}

/* ============================ 타이머 ============================ */
function beep(times = 1) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return;
    const ctx = new Ctx();
    for (let i = 0; i < times; i++) { const o = ctx.createOscillator(), g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type = "sine"; o.frequency.value = 880; const t = ctx.currentTime + i * 0.28; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22); o.start(t); o.stop(t + 0.24); }
    if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
  } catch {}
}
function FloatingTimer({ timer, setTimer }) {
  useEffect(() => {
    if (!timer.running) return;
    const id = setInterval(() => setTimer((t) => { if (!t.running) return t; const rem = t.remaining - 1; if (rem <= 0) { beep(3); return { ...t, remaining: 0, running: false }; } return { ...t, remaining: rem }; }), 1000);
    return () => clearInterval(id);
  }, [timer.running, setTimer]);
  if (timer.total === 0) return null;
  const pct = timer.total ? (timer.remaining / timer.total) * 100 : 0;
  const mm = Math.floor(timer.remaining / 60), ss = String(timer.remaining % 60).padStart(2, "0");
  const done = timer.remaining === 0;
  return <div className="fixed bottom-20 right-3 z-40 sm:bottom-6">
    <div className={cls("flex items-center gap-3 rounded-2xl border bg-zinc-900/95 p-2.5 pr-3 shadow-2xl backdrop-blur", done ? "border-lime-500/60 ring-2 ring-lime-500/40 animate-pulse" : "border-zinc-700")}>
      <Ring value={pct} size={48} stroke={4}><span className="text-xs font-bold tabular-nums text-zinc-100">{mm}:{ss}</span></Ring>
      <div className="flex items-center gap-1">
        <button onClick={() => setTimer((t) => ({ ...t, running: !t.running }))} className="rounded-lg bg-zinc-800 p-2 text-zinc-200 hover:bg-zinc-700"><Ico name={timer.running ? "pause" : "play"} className="w-4 h-4" /></button>
        <button onClick={() => setTimer({ remaining: 0, total: 0, running: false })} className="rounded-lg bg-zinc-800 p-2 text-zinc-200 hover:bg-zinc-700"><Ico name="x" className="w-4 h-4" /></button>
      </div>
    </div>
    {done && <p className="mt-1 text-center text-xs font-semibold text-lime-400">휴식 끝! 다음 세트 💪</p>}
  </div>;
}

/* ============================ 체중 추세 차트 (7일 이동평균) ============================ */
function movingAvg(sorted, win = 7) {
  return sorted.map((d, i) => { const s = sorted.slice(Math.max(0, i - win + 1), i + 1); return { date: d.date, avg: s.reduce((a, x) => a + x.weight, 0) / s.length }; });
}
function WeightChart({ log, start, goal, showRaw = true }) {
  const W = 320, H = 160, pad = 26;
  if (!log.length) return <div className="flex h-[160px] items-center justify-center text-sm text-zinc-500">아직 기록이 없어요. 첫 체중을 입력해보세요.</div>;
  const sorted = [...log].sort((a, b) => a.date.localeCompare(b.date));
  const ma = movingAvg(sorted);
  const ws = sorted.map((d) => d.weight);
  const lo = Math.min(goal, ...ws) - 2, hi = Math.max(start, ...ws) + 2;
  const x = (i) => pad + (sorted.length === 1 ? (W - 2*pad)/2 : (i/(sorted.length-1))*(W-2*pad));
  const y = (w) => pad + (1 - (w - lo)/(hi - lo)) * (H - 2*pad);
  const trend = ma.map((d, i) => `${x(i)},${y(d.avg)}`).join(" ");
  const gy = y(goal);
  return <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
    <line x1={pad} y1={gy} x2={W-pad} y2={gy} stroke="#fbbf24" strokeWidth="1" strokeDasharray="4 4" />
    <text x={W-pad} y={gy-4} textAnchor="end" fontSize="9" className="fill-amber-400">목표 {goal}kg</text>
    {showRaw && sorted.map((d, i) => <circle key={i} cx={x(i)} cy={y(d.weight)} r="2.5" fill="#3f3f46" />)}
    <polyline points={trend} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    {ma.map((d, i) => <circle key={i} cx={x(i)} cy={y(d.avg)} r="2.5" fill="#34d399" />)}
    {sorted.length <= 8 && sorted.map((d, i) => <text key={i} x={x(i)} y={H-8} textAnchor="middle" fontSize="8" className="fill-zinc-500">{fmtDate(d.date)}</text>)}
    <text x={x(ma.length-1)} y={y(ma[ma.length-1].avg)-8} textAnchor="middle" fontSize="9" className="fill-lime-300 font-bold">{ma[ma.length-1].avg.toFixed(1)}</text>
  </svg>;
}

/* ============================ 온보딩 ============================ */
function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const [p, setP] = useState({ sex: "", height: "", weight: "", goalWeight: "", age: "", activity: 1.375, goal: "", excludeEgg: false, knee: true });

  const num = (v) => { const n = parseFloat(v); return isFinite(n) ? n : NaN; };
  const h = num(p.height), w = num(p.weight), gw = num(p.goalWeight), age = num(p.age);
  const ready = h > 0 && w > 0 && gw > 0 && age > 0;
  const nut = ready ? computeNutrition({ ...p, height: h, weight: w, goalWeight: gw, age }) : null;
  const canFinish = ready && !!p.sex && !!p.goal;

  let goalText = "—", periodText = "—", goalBadge = null;
  if (ready && p.goal) {
    if (p.goal === "maintain") { goalText = `${w}kg 유지`; periodText = "꾸준히"; }
    else if (p.goal === "cut") {
      goalText = `${w} → ${gw}kg`;
      const m = Math.round((w - gw) / 0.7 / 4.3);
      periodText = (w > gw && m > 0) ? `약 ${m}개월` : "—";
      goalBadge = <span className="text-lime-400"> (-{Number((w - gw).toFixed(1))}kg)</span>;
    } else {
      goalText = `${w} → ${gw}kg`;
      const m = Math.round((gw - w) / 0.35 / 4.3);
      periodText = (gw > w && m > 0) ? `약 ${m}개월` : "—";
      goalBadge = <span className="text-lime-400"> (+{Number((gw - w).toFixed(1))}kg)</span>;
    }
  }

  const field = (l, k, suf, ph) => <label className="block text-sm"><span className="text-zinc-400">{l}</span>
    <div className="mt-1 flex items-center rounded-xl border border-zinc-700 bg-zinc-800 px-3">
      <input value={p[k]} onChange={(e) => setP({ ...p, [k]: e.target.value.replace(/[^0-9.]/g, "") })} inputMode="decimal" placeholder={ph} className="w-full bg-transparent py-2.5 text-zinc-100 outline-none placeholder:text-zinc-600" />
      {suf && <span className="text-sm text-zinc-500">{suf}</span>}
    </div></label>;

  return <div className="min-h-screen bg-zinc-950 px-5 py-8 text-zinc-100">
    <div className="mx-auto max-w-md">
      <div className="mb-6 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-lime-400 to-lime-300 text-zinc-950"><Ico name="fire" className="w-5 h-5" stroke={2.4} /></span>
        <span className="text-xl font-extrabold">핏코치</span>
      </div>
      <div className="mb-5 flex gap-1.5">{[0,1,2].map((i) => <div key={i} className={cls("h-1.5 flex-1 rounded-full", i <= step ? "bg-lime-400" : "bg-zinc-800")} />)}</div>

      {step === 0 && <div className="space-y-4">
        <h1 className="text-2xl font-extrabold leading-snug">반가워요 👋<br />목표부터 정해볼까요?</h1>
        <p className="text-sm text-zinc-400">정확한 칼로리·운동 강도를 계산하기 위해 필요해요.</p>

        <div>
          <p className="mb-1.5 text-sm text-zinc-400">성별</p>
          <div className="grid grid-cols-2 gap-2">{[["male","남성"],["female","여성"]].map(([v,l]) => <button key={v} onClick={() => setP({ ...p, sex: v })} className={cls("rounded-xl py-3 text-sm font-semibold", p.sex === v ? "bg-lime-500 text-zinc-950" : "bg-zinc-800 text-zinc-300")}>{l}</button>)}</div>
        </div>

        <div className="grid grid-cols-2 gap-3">{field("키", "height", "cm", "175")}{field("현재 체중", "weight", "kg", "70")}{field("목표 체중", "goalWeight", "kg", "65")}{field("나이", "age", "세", "30")}</div>

        <div>
          <p className="mb-1.5 text-sm text-zinc-400">목표</p>
          <div className="grid grid-cols-3 gap-2">{[["cut","감량"],["maintain","유지"],["gain","증량"]].map(([v,l]) => <button key={v} onClick={() => setP({ ...p, goal: v })} className={cls("rounded-xl py-3 text-sm font-semibold", p.goal === v ? "bg-lime-500 text-zinc-950" : "bg-zinc-800 text-zinc-300")}>{l}</button>)}</div>
        </div>

        <button onClick={() => setStep(1)} className="w-full rounded-2xl bg-lime-500 py-3.5 font-bold text-zinc-950 hover:bg-lime-400">다음</button>
      </div>}

      {step === 1 && <div className="space-y-4">
        <h1 className="text-2xl font-extrabold leading-snug">안전이 먼저예요 🦵</h1>
        <Card className="p-4">
          <p className="mb-2 text-sm font-semibold text-zinc-200">무릎·관절에 통증이나 불편이 있나요?</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setP({ ...p, knee: true })} className={cls("rounded-xl py-3 text-sm font-semibold", p.knee ? "bg-lime-500 text-zinc-950" : "bg-zinc-800 text-zinc-300")}>네 / 걱정돼요</button>
            <button onClick={() => setP({ ...p, knee: false })} className={cls("rounded-xl py-3 text-sm font-semibold", !p.knee ? "bg-lime-500 text-zinc-950" : "bg-zinc-800 text-zinc-300")}>아니요</button>
          </div>
          <p className="mt-2 text-xs text-zinc-500">체중 부하가 큰 운동은 무릎에 부담이 될 수 있어요. 어느 쪽이든 저충격 운동과 안전한 가동범위로 시작합니다.</p>
        </Card>
        <p className="text-sm text-zinc-400">활동 수준</p>
        <div className="grid grid-cols-2 gap-2">{[[1.2,"거의 안 움직임"],[1.375,"가벼움(주1~3)"],[1.55,"보통(주3~5)"],[1.725,"활발(주6~7)"]].map(([v,l]) => <button key={v} onClick={() => setP({ ...p, activity: v })} className={cls("rounded-xl px-2 py-2.5 text-xs font-semibold", p.activity === v ? "bg-lime-500 text-zinc-950" : "bg-zinc-800 text-zinc-300")}>{l}</button>)}</div>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-semibold text-zinc-200">계란 제외</p><p className="text-xs text-zinc-500">알레르기·비선호 시 식단 추천에서 계란을 빼요.</p></div>
            <button onClick={() => setP({ ...p, excludeEgg: !p.excludeEgg })} className={cls("relative h-7 w-12 shrink-0 rounded-full transition-colors", p.excludeEgg ? "bg-lime-500" : "bg-zinc-700")}><span className={cls("absolute top-1 h-5 w-5 rounded-full bg-white transition-all", p.excludeEgg ? "left-6" : "left-1")} /></button>
          </div>
        </Card>
        <div className="flex gap-2"><button onClick={() => setStep(0)} className="rounded-2xl bg-zinc-800 px-5 py-3.5 font-bold text-zinc-300">이전</button><button onClick={() => setStep(2)} className="flex-1 rounded-2xl bg-lime-500 py-3.5 font-bold text-zinc-950 hover:bg-lime-400">다음</button></div>
      </div>}

      {step === 2 && <div className="space-y-4">
        <h1 className="text-2xl font-extrabold leading-snug">당신의 시작 플랜 ✨</h1>
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between"><span className="text-sm text-zinc-400">목표</span><span className="font-bold text-zinc-100">{goalText}{goalBadge}</span></div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl bg-zinc-800/60 p-3"><p className="text-xs text-zinc-400">하루 목표 칼로리</p><p className="text-xl font-bold text-lime-400">{nut ? nut.target.toLocaleString() : "—"}</p></div>
            <div className="rounded-xl bg-zinc-800/60 p-3"><p className="text-xs text-zinc-400">단백질</p><p className="text-xl font-bold text-lime-400">{nut ? `${nut.protein}g` : "—"}</p></div>
            <div className="rounded-xl bg-zinc-800/60 p-3"><p className="text-xs text-zinc-400">예상 기간</p><p className="text-xl font-bold text-zinc-100">{periodText}</p></div>
            <div className="rounded-xl bg-zinc-800/60 p-3"><p className="text-xs text-zinc-400">운동</p><p className="text-sm font-bold text-zinc-100">주4회 4분할</p></div>
          </div>
          <p className="mt-3 text-xs text-zinc-500">가슴+삼두 · 등+이두 · 하체 · 팔+어깨 / 저충격 유산소 병행</p>
        </Card>
        {!canFinish && <p className="rounded-xl bg-amber-500/10 px-3 py-2.5 text-[11px] leading-relaxed text-amber-300">성별·목표·키·체중·나이를 모두 입력하면 시작할 수 있어요.</p>}
        <p className="rounded-xl bg-zinc-900 px-3 py-2.5 text-[11px] leading-relaxed text-zinc-500">⚕ 본 앱은 의료 조언이 아닌 일반 건강·운동 정보를 제공합니다. 체중이 많이 나가거나 기저질환이 있다면 운동 시작 전 의사와 상담하고, 통증 발생 시 즉시 중단하세요.</p>
        <div className="flex gap-2"><button onClick={() => setStep(1)} className="rounded-2xl bg-zinc-800 px-5 py-3.5 font-bold text-zinc-300">이전</button><button disabled={!canFinish} onClick={() => onDone({ ...p, height: h, weight: w, goalWeight: gw, age })} className="flex-1 rounded-2xl bg-lime-500 py-3.5 font-bold text-zinc-950 hover:bg-lime-400 disabled:opacity-50">시작하기 🚀</button></div>
      </div>}
    </div>
  </div>;
}

/* ============================ 플레이트 계산기 ============================ */
function PlateCalc({ defaultWeight }) {
  const [w, setW] = useState(defaultWeight || 40);
  const [bar, setBar] = useState(20);
  const res = platesPerSide(w, bar);
  return <div className="rounded-xl bg-zinc-800/50 p-3">
    <div className="mb-2 flex items-center gap-2 text-xs">
      <span className="text-zinc-400">목표</span>
      <input value={w} onChange={(e) => setW(parseFloat(e.target.value) || 0)} inputMode="decimal" className="w-16 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-center text-zinc-100 outline-none" /><span className="text-zinc-500">kg</span>
      <span className="ml-2 text-zinc-400">봉</span>
      {[20,15,10].map((b) => <button key={b} onClick={() => setBar(b)} className={cls("rounded px-2 py-1", bar === b ? "bg-lime-500 text-zinc-950" : "bg-zinc-800 text-zinc-400")}>{b}</button>)}
    </div>
    {res ? <p className="text-sm text-zinc-200">한쪽: {res.plates.length ? res.plates.map((p, i) => <span key={i} className="mr-1 inline-block rounded bg-zinc-700 px-1.5 py-0.5 text-xs font-bold">{p}</span>) : <span className="text-zinc-500">봉만</span>}{res.leftover > 0 && <span className="text-amber-400"> (+{res.leftover}kg 부족)</span>}</p> : <p className="text-sm text-zinc-500">봉 무게보다 커야 해요.</p>}
  </div>;
}

/* ============================ 운동 카드 ============================ */
function ExerciseCard({ ex, sessions, session, setSession, setTimer }) {
  const [open, setOpen] = useState(false);
  const [showWarm, setShowWarm] = useState(false);
  const [showPlate, setShowPlate] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const planned = typeof ex.sets === "number" ? ex.sets : parseInt(ex.sets) || 3;
  const last = lastEntryFor(sessions, ex.name);
  const top = topReps(ex.reps);
  const sug = suggestNext(ex, last);
  const risk = kneeRisk(ex);
  const eqTone = { 머신:"sky", 덤벨:"violet", 바벨:"rose", 케이블:"emerald", 맨몸:"amber" }[ex.equipment] || "zinc";

  const ensure = () => { if (!(session[ex.name] || []).length) setSession({ ...session, [ex.name]: Array.from({ length: planned }, () => ({ weight: "", reps: "", rir: "", done: false })) }); };
  const upd = (i, k, v) => setSession({ ...session, [ex.name]: (session[ex.name] || []).map((s, j) => j === i ? { ...s, [k]: v } : s) });
  const add = () => setSession({ ...session, [ex.name]: [...(session[ex.name] || []), { weight: "", reps: "", rir: "", done: false }] });
  const toggleDone = (i) => {
    const arr = session[ex.name] || []; const s = arr[i]; const willDone = !s.done;
    upd(i, "done", willDone);
    if (willDone && i < arr.length - 1) setTimer({ remaining: ex.rest, total: ex.rest, running: true }); // 세트 완료 → 휴식 자동시작
  };
  const placeW = last ? `이전 ${Math.max(...last.sets.map((s)=>Number(s.weight)||0))||"-"}` : "-";

  return <Card className="overflow-hidden">
    <button onClick={() => { setOpen(!open); ensure(); }} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-bold text-zinc-100">{ex.name}</span>
          <Pill tone={eqTone}>{ex.equipment}</Pill>
          {risk > 0 && <span className={cls(risk === 2 ? "text-rose-400" : "text-amber-400")} title="무릎 주의"><Ico name="warn" className="w-4 h-4" /></span>}
        </div>
        <p className="mt-0.5 text-xs text-zinc-400">{ex.sets}세트 × {ex.reps}회 · 휴식 {ex.rest}초</p>
      </div>
      <span className={cls("shrink-0 text-zinc-500 transition-transform", open && "rotate-90")}><Ico name="chevron" className="w-5 h-5" /></span>
    </button>

    {open && <div className="space-y-3 border-t border-zinc-800 px-4 py-3">
      <BodyMap targets={ex.targetMuscles} />
      <p className="text-center text-xs text-zinc-500">{(ex.targetMuscles || []).join(" · ")}</p>

      {risk > 0 && <div className={cls("rounded-xl px-3 py-2", risk === 2 ? "bg-rose-500/10" : "bg-amber-500/10")}>
        <div className="flex items-center justify-between">
          <span className={cls("flex items-center gap-1.5 text-xs font-semibold", risk === 2 ? "text-rose-300" : "text-amber-300")}><Ico name="warn" className="w-4 h-4" />무릎 {risk === 2 ? "고위험" : "주의"} 운동</span>
          <button onClick={() => setShowSwap(!showSwap)} className="flex items-center gap-1 rounded-lg bg-zinc-800 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700"><Ico name="swap" className="w-3.5 h-3.5" />대체운동</button>
        </div>
        {ex.caution && <p className="mt-1 text-xs text-zinc-400">{ex.caution}</p>}
        {showSwap && <ul className="mt-2 space-y-1 border-t border-zinc-700/50 pt-2 text-xs text-zinc-300">{kneeAlternatives(ex).map((a, i) => <li key={i} className="flex gap-1.5"><span className="text-lime-400">→</span>{a}</li>)}</ul>}
      </div>}

      <div>
        <p className="mb-1 text-xs font-semibold text-zinc-400">자세 포인트</p>
        <ol className="space-y-1">{(ex.formCues || []).map((c, i) => <li key={i} className="flex gap-2 text-sm text-zinc-300"><span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-lime-500/20 text-[10px] font-bold text-lime-400">{i+1}</span>{c}</li>)}</ol>
      </div>

      <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + " 자세 " + (ex.engName||""))}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-zinc-800 py-2.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-700"><Ico name="play" className="w-4 h-4 text-rose-400" /> 시연 영상 보기 (YouTube)</a>

      <div className={cls("rounded-xl px-3 py-2 text-xs font-medium", sug.tone==="emerald"&&"bg-lime-500/10 text-lime-300", sug.tone==="amber"&&"bg-amber-500/10 text-amber-300", sug.tone==="sky"&&"bg-sky-500/10 text-sky-300", sug.tone==="rose"&&"bg-rose-500/10 text-rose-300")}>
        💡 다음 무게 제안: {sug.weight ? <b>{sug.weight}kg · </b> : null}{sug.text}
        {last && <span className="ml-1 block text-zinc-500">이전 기록: {last.sets.map((s) => `${s.weight||"-"}kg×${s.reps||"-"}${s.rir!==""&&s.rir!=null?`(여유${s.rir})`:""}`).join(", ")}</span>}
      </div>

      {/* 세트 기록 */}
      <div className="space-y-1.5">
        <div className="grid grid-cols-[1.6rem_1fr_1fr_2.4rem_2.4rem] gap-1.5 px-1 text-[11px] text-zinc-500"><span>세트</span><span>무게kg</span><span>횟수</span><span title="몇 개 더 가능?">여유</span><span></span></div>
        {(session[ex.name] || []).map((s, i) => <div key={i} className="grid grid-cols-[1.6rem_1fr_1fr_2.4rem_2.4rem] items-center gap-1.5">
          <span className="text-center text-sm font-bold text-zinc-500">{i+1}</span>
          <input value={s.weight} onChange={(e) => upd(i, "weight", e.target.value)} inputMode="decimal" placeholder={placeW} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-1 py-2 text-center text-sm text-zinc-100 outline-none focus:border-lime-500" />
          <input value={s.reps} onChange={(e) => upd(i, "reps", e.target.value)} inputMode="numeric" placeholder={String(top)} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-1 py-2 text-center text-sm text-zinc-100 outline-none focus:border-lime-500" />
          <input value={s.rir} onChange={(e) => upd(i, "rir", e.target.value)} inputMode="numeric" placeholder="-" className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-1 py-2 text-center text-sm text-zinc-100 outline-none focus:border-lime-500" />
          <button onClick={() => toggleDone(i)} className={cls("flex h-9 items-center justify-center rounded-lg", s.done ? "bg-lime-500 text-zinc-950" : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700")}><Ico name="check" className="w-4 h-4" stroke={3} /></button>
        </div>)}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <button onClick={add} className="flex-1 rounded-lg border border-dashed border-zinc-700 py-1.5 text-xs text-zinc-400 hover:text-zinc-300">+ 세트</button>
          <button onClick={() => setTimer({ remaining: ex.rest, total: ex.rest, running: true })} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-zinc-800 py-1.5 text-xs font-semibold text-lime-300 hover:bg-zinc-700"><Ico name="timer" className="w-4 h-4" />휴식 {ex.rest}s</button>
          <button onClick={() => setShowWarm(!showWarm)} className="flex items-center gap-1 rounded-lg bg-zinc-800 px-2 py-1.5 text-xs font-semibold text-amber-300 hover:bg-zinc-700"><Ico name="fire" className="w-4 h-4" />워밍업</button>
          {ex.equipment === "바벨" && <button onClick={() => setShowPlate(!showPlate)} className="flex items-center gap-1 rounded-lg bg-zinc-800 px-2 py-1.5 text-xs font-semibold text-sky-300 hover:bg-zinc-700"><Ico name="calc" className="w-4 h-4" />원판</button>}
        </div>
      </div>

      {showWarm && <div className="rounded-xl bg-zinc-800/50 p-3">
        <p className="mb-1 text-xs font-semibold text-amber-300">워밍업 세트 (본세트 {sug.weight || Math.max(...(last?last.sets.map((s)=>Number(s.weight)||0):[0]))||"?"}kg 기준)</p>
        {(() => { const base = sug.weight || (last ? Math.max(...last.sets.map((s)=>Number(s.weight)||0)) : 0); const ws = warmupSets(base); return ws.length ? <ul className="space-y-0.5 text-xs text-zinc-300">{ws.map((w, i) => <li key={i}>· {w.pct} — {w.weight}{w.weight!=="-"?"kg":""} × {w.reps}회</li>)}</ul> : <p className="text-xs text-zinc-500">본세트 무게를 입력하면 워밍업이 계산됩니다.</p>; })()}
      </div>}
      {showPlate && <PlateCalc defaultWeight={sug.weight || 40} />}

      <p className="text-[11px] text-zinc-500">📈 {ex.progression}</p>
    </div>}
  </Card>;
}

/* ============================ 버핏그라운드 신도림 머신 가이드 ============================ */
const GYM_MACHINES = {
  context: "버핏그라운드 신도림 · 디큐브시티 27–28F · 약 1000평 · 87종 머신 · ONE MORE REP",
  zones: [
    {
      id: "plate", label: "플레이트 로디드 존", en: "PLATE-LOADED",
      brand: "해머스트렝스", tone: "rose", icon: "dumbbell",
      desc: "원판을 직접 끼우는 아이솔레터럴 머신. 좌우 독립 구동으로 큰 가동범위와 고중량에 유리.",
      groups: [
        { part: "가슴", machines: ["아이소 체스트 프레스 (Iso-Lateral)", "인클라인 체스트 프레스", "와이드 체스트 프레스", "디클라인 프레스"] },
        { part: "등", machines: ["아이소 로우 로우 (Low Row)", "하이 로우", "프론트 풀다운", "디버징 로우", "파워 슈러그"] },
        { part: "어깨", machines: ["아이소 숄더 프레스"] },
        { part: "하체", machines: ["레그 프레스", "핵 스쿼트", "V-스쿼트", "라이너 레그 프레스"] },
        { part: "팔", machines: ["시티드 딥 (삼두)"] },
      ],
    },
    {
      id: "pin", label: "핀 로디드 존", en: "PIN-LOADED",
      brand: "테크노짐 · 라이프피트니스", tone: "emerald", icon: "dumbbell",
      desc: "핀 하나로 중량 조절. 궤적이 고정돼 초보자·고립운동에 안전하고 세팅이 빠름.",
      groups: [
        { part: "가슴", machines: ["체스트 프레스", "펙덱 플라이 (Pec Deck)"] },
        { part: "등", machines: ["랫 풀다운", "시티드 로우", "풀오버", "어시스트 풀업·딥"] },
        { part: "어깨", machines: ["숄더 프레스", "래터럴 레이즈 머신"] },
        { part: "하체", machines: ["레그 익스텐션", "레그 컬 (시티드·라잉)", "레그 프레스", "이너타이 (어덕터)", "아웃타이 (어브덕터)", "글루트 머신"] },
        { part: "팔", machines: ["바이셉 컬", "트라이셉 익스텐션", "암 컬"] },
        { part: "코어", machines: ["업도미널 크런치", "로터리 토르소", "백 익스텐션"] },
      ],
    },
    {
      id: "rack", label: "랙 · 프리웨이트 존", en: "RACK·FREE WEIGHT",
      brand: "짐레코 · 해머스트렝스", tone: "amber", icon: "dumbbell",
      desc: "바벨·덤벨·랙으로 복합운동. 스미스 머신은 가이드 레일이 있어 초보 스쿼트·벤치에 안전.",
      groups: [
        { part: "랙·바벨", machines: ["파워 랙", "스쿼트 랙", "스미스 머신", "플랫 벤치프레스", "인클라인 벤치프레스", "랜드마인"] },
        { part: "덤벨·케틀벨", machines: ["덤벨 1–50kg 풀세트", "케틀벨", "EZ바 · 프리처 컬 벤치"] },
        { part: "하체·둔근", machines: ["힙 쓰러스트 벤치", "백 익스텐션 (GHD)"] },
        { part: "맨몸", machines: ["풀업 바", "딥스 스테이션"] },
      ],
    },
    {
      id: "cardio", label: "카디오 존", en: "CARDIO",
      brand: "라이프피트니스 · 테크노짐", tone: "sky", icon: "run",
      desc: "유산소·워밍업용. 무릎 부담 적은 일립티컬·리컴번트 바이크·로잉을 우선 추천.",
      groups: [
        { part: "무충격 (무릎 친화)", machines: ["일립티컬 (크로스 트레이너)", "리컴번트 바이크", "업라이트 바이크", "로잉 머신 (Concept2)"] },
        { part: "유산소", machines: ["트레드밀", "스텝밀 (계단)", "아크 트레이너"] },
      ],
    },
    {
      id: "hyrox", label: "HYROX 컨디셔닝", en: "HYROX 공식",
      brand: "공식 파트너 존", tone: "violet", icon: "fire",
      desc: "전신 기능성 컨디셔닝. 고강도 인터벌·하이브리드 트레이닝용 소도구.",
      groups: [
        { part: "푸시·풀", machines: ["스키에르그 (SkiErg)", "썰매 밀기·끌기 (Sled)", "배틀 로프"] },
        { part: "전신", machines: ["에어 바이크 (어썰트)", "로잉 (RowErg)", "월볼", "샌드백", "케틀벨 · 파머스 캐리"] },
      ],
    },
  ],
};

function GymGuide() {
  return <div className="space-y-3">
    <Card className="p-3">
      <div className="flex items-center gap-2.5">
        <span className="text-lime-400"><Ico name="dumbbell" className="w-5 h-5" /></span>
        <div>
          <p className="text-sm font-bold text-zinc-100">버핏그라운드 신도림 머신 가이드</p>
          <p className="text-[11px] leading-snug text-zinc-500">{GYM_MACHINES.context}</p>
        </div>
      </div>
    </Card>
    {GYM_MACHINES.zones.map((z, i) => (
      <Collapsible key={z.id} defaultOpen={i === 0} icon={z.icon}
        title={<span className="flex flex-wrap items-center gap-1.5">{z.label}<Pill tone={z.tone}>{z.brand}</Pill></span>}>
        <p className="mb-3 text-[12px] leading-snug text-zinc-400">{z.desc}</p>
        <div className="space-y-3">
          {z.groups.map((g, j) => (
            <div key={j}>
              <div className="mb-1.5 flex items-center gap-2">
                <span className="text-xs font-bold text-lime-300">{g.part}</span>
                <span className="text-[10px] tabular-nums text-zinc-600">{g.machines.length}종</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {g.machines.map((m, k) => (
                  <span key={k} className="rounded-lg bg-zinc-800/70 px-2.5 py-1 text-[12px] text-zinc-200 ring-1 ring-zinc-700/50">{m}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Collapsible>
    ))}
    <p className="px-1 text-[11px] leading-relaxed text-zinc-600">⚐ 머신 구성은 지점 사정에 따라 변동될 수 있어요. 처음 쓰는 머신은 시트·핀·안전바부터 확인하고, 무릎·허리 통증 시 중량을 낮추세요.</p>
  </div>;
}

/* ============================ 운동 탭 ============================ */
function Workout({ phaseIdx, setPhaseIdx, dayIdx, setDayIdx, sessions, setSessions, setTimer, weeksSince, nut }) {
  const [sub, setSub] = useState("strength");
  const phase = STRENGTH.phases[phaseIdx];
  const day = phase.days[dayIdx];
  const tKey = `${todayKey()}|${phase.id}|${dayIdx}`;
  const [session, setSession] = useLocal(`fc.session.${tKey}`, {});
  const recommended = phaseIndexForWeeks(weeksSince);

  const save = () => {
    const entries = {};
    Object.entries(session).forEach(([n, arr]) => { const v = arr.filter((s) => s.weight !== "" || s.reps !== ""); if (v.length) entries[n] = v.map((s) => ({ weight: s.weight, reps: s.reps, rir: s.rir })); });
    if (!Object.keys(entries).length) { alert("기록된 세트가 없어요. 무게/횟수를 입력해주세요."); return; }
    let vol = 0; Object.values(entries).forEach((arr) => arr.forEach((s) => { vol += (Number(s.weight)||0) * (Number(s.reps)||0); }));
    setSessions([...sessions.filter((s) => !(s.date === todayKey() && s.day === day.focus)), { date: todayKey(), phaseId: phase.id, day: day.focus, entries, volume: Math.round(vol) }]);
    beep(1); alert("오늘 운동을 저장했어요! 💪 (진행 탭에서 확인)");
  };

  return <div className="space-y-4">
    <div className="grid grid-cols-3 gap-1.5">
      <button onClick={() => setSub("strength")} className={cls("rounded-xl py-2.5 text-sm font-bold", sub==="strength"?"bg-violet-500 text-zinc-950":"bg-zinc-800 text-zinc-300")}>💪 근력</button>
      <button onClick={() => setSub("cardio")} className={cls("rounded-xl py-2.5 text-sm font-bold", sub==="cardio"?"bg-sky-500 text-zinc-950":"bg-zinc-800 text-zinc-300")}>🏃 유산소</button>
      <button onClick={() => setSub("machines")} className={cls("rounded-xl py-2.5 text-sm font-bold", sub==="machines"?"bg-lime-500 text-zinc-950":"bg-zinc-800 text-zinc-300")}>🏋 머신</button>
    </div>

    {sub === "strength" && <>
      <Card className="p-3">
        <p className="mb-2 text-xs text-zinc-400">단계 (시작 후 약 {weeksSince}주차 · 추천 <span className="font-semibold text-lime-400">{STRENGTH.phases[recommended].name.split("(")[0]}</span>)</p>
        <div className="grid grid-cols-3 gap-1.5">{STRENGTH.phases.map((p, i) => <button key={p.id} onClick={() => setPhaseIdx(i)} className={cls("rounded-xl px-1 py-2 text-center text-xs font-semibold", i===phaseIdx?"bg-lime-500 text-zinc-950":"bg-zinc-800 text-zinc-300")}><div>{p.name.split(" ")[0]}</div><div className="text-[10px] opacity-70">{p.weeks}</div></button>)}</div>
        <p className="mt-2 text-[11px] leading-snug text-zinc-500">{phase.focus}</p>
      </Card>
      <div className="grid grid-cols-4 gap-1.5">{phase.days.map((d, i) => <button key={i} onClick={() => setDayIdx(i)} className={cls("rounded-xl py-2 text-center text-xs font-bold", i===dayIdx?"bg-violet-500 text-zinc-950":"bg-zinc-800 text-zinc-300")}>Day{i+1}<div className="text-[10px] font-medium opacity-80">{d.focus}</div></button>)}</div>
      <Collapsible title="워밍업 (운동 전 필수)" icon="fire"><ol className="space-y-1.5">{STRENGTH.warmup.map((w, i) => <li key={i}><b className="text-zinc-200">{w.step}</b> — {w.detail}</li>)}</ol></Collapsible>
      <div className="space-y-2.5">{day.exercises.map((ex, i) => <ExerciseCard key={ex.name+i} ex={ex} sessions={sessions} session={session} setSession={setSession} setTimer={setTimer} />)}</div>
      <button onClick={save} className="w-full rounded-2xl bg-lime-500 py-3.5 text-base font-bold text-zinc-950 shadow-lg shadow-lime-500/20 hover:bg-lime-400">✓ 오늘 운동 저장하기</button>
      <Collapsible title="쿨다운 스트레칭" icon="reset"><ol className="space-y-1.5">{STRENGTH.cooldown.map((w, i) => <li key={i}><b className="text-zinc-200">{w.step}</b> — {w.detail}</li>)}</ol></Collapsible>
      <Collapsible title="운동 원칙" icon="info"><ul className="space-y-2">{STRENGTH.principles.map((p, i) => <li key={i}><b className="text-lime-300">{p.name}</b><br /><span className="text-zinc-400">{p.desc}</span></li>)}</ul></Collapsible>
      <Collapsible title="⚠ 부상 예방 주의사항" icon="warn"><ul className="space-y-2">{STRENGTH.cautions.map((p, i) => <li key={i}><b className="text-rose-300">{p.topic}</b><br /><span className="text-zinc-400">{p.detail}</span></li>)}</ul></Collapsible>
    </>}

    {sub === "cardio" && <Cardio nut={nut} setTimer={setTimer} />}
    {sub === "machines" && <GymGuide />}
  </div>;
}

function Cardio({ nut, setTimer }) {
  const [min, setMin] = useState(30);
  return <div className="space-y-4">
    <Card className="p-4">
      <SectionTitle icon="timer">유산소 타이머</SectionTitle>
      <div className="flex items-center gap-2">{[20,30,40,50].map((m) => <button key={m} onClick={() => setMin(m)} className={cls("flex-1 rounded-lg py-2 text-sm font-semibold", min===m?"bg-sky-500 text-zinc-950":"bg-zinc-800 text-zinc-300")}>{m}분</button>)}</div>
      <button onClick={() => setTimer({ remaining: min*60, total: min*60, running: true })} className="mt-2 w-full rounded-xl bg-sky-500 py-2.5 text-sm font-bold text-zinc-950 hover:bg-sky-400">{min}분 시작</button>
    </Card>
    <Card className="p-4">
      <SectionTitle icon="fire" sub={`최대심박 ${nut.maxHR}`}>나의 심박존</SectionTitle>
      <div className="space-y-1.5">{nut.zones.map((z, i) => <div key={i} className={cls("flex items-center justify-between rounded-lg px-3 py-2 text-sm", i===1?"bg-lime-500/15 ring-1 ring-lime-500/30":"bg-zinc-800/60")}><span className={cls("font-semibold", i===1?"text-lime-300":"text-zinc-200")}>{z.name}</span><span className="tabular-nums text-zinc-300">{z.lo}–{z.hi} bpm</span></div>)}</div>
      <p className="mt-2 text-[11px] text-zinc-500">지방대사 주력은 <span className="text-lime-400">Zone2</span>. 1~4주는 전부 Zone2.</p>
    </Card>
    <SectionTitle icon="chart">단계별 유산소 계획</SectionTitle>
    {CARDIO.phases.map((p, i) => <Collapsible key={i} title={p.period} icon="run" defaultOpen={i===0}><div className="space-y-1.5"><p><span className="text-zinc-500">빈도</span> · {p.frequency}</p><p><span className="text-zinc-500">강도</span> · {p.intensity}</p><p><span className="text-zinc-500">시간</span> · {p.duration}</p><p className="rounded-lg bg-zinc-800/60 p-2"><b className="text-lime-300">근력과 배치</b> · {p.placement}</p></div></Collapsible>)}
    <SectionTitle icon="info">저충격 종목 (무릎 친화)</SectionTitle>
    <div className="space-y-2">{CARDIO.modalities.map((m, i) => <Card key={i} className="p-3"><div className="mb-1 flex items-center gap-2"><span className="font-bold text-zinc-100">{m.name}</span><Pill tone={/무충격|매우/.test(m.impact)?"emerald":"sky"}>충격 {m.impact}</Pill></div><p className="text-xs text-lime-300/90">👍 {m.pros}</p><p className="mt-1 text-xs text-zinc-400">👎 {m.cons}</p></Card>)}</div>
    <Collapsible title="걸음수(NEAT) 목표" icon="run"><ul className="mb-2 space-y-1">{CARDIO.neat.stepGoals.map((s, i) => <li key={i}>• {s}</li>)}</ul><p className="mb-1 font-semibold text-zinc-200">팁</p><ul className="space-y-1 text-zinc-400">{CARDIO.neat.tips.map((s, i) => <li key={i}>• {s}</li>)}</ul></Collapsible>
    <Collapsible title="⚠ 무릎 통증 위험 신호" icon="warn"><ul className="space-y-1.5 text-zinc-300">{CARDIO.warningSigns.map((s, i) => <li key={i}>• {s}</li>)}</ul></Collapsible>
  </div>;
}

/* ============================ 식단 탭 ============================ */
function Diet({ nut, foodLog, setFoodLog, water, setWater, excludeEgg = false, goal = "cut" }) {
  const [tab, setTab] = useState("log");
  const [q, setQ] = useState("");
  const tk = todayKey();
  const log = foodLog[tk] || [];
  const totals = log.reduce((a, f) => ({ kcal: a.kcal + f.kcal, protein: a.protein + f.protein }), { kcal: 0, protein: 0 });
  const db = useMemo(() => excludeEgg ? DIET.foodDb.filter((f) => !hasEgg(f.name)) : DIET.foodDb, [excludeEgg]);
  const filtered = useMemo(() => db.filter((f) => f.name.includes(q)), [q, db]);
  const addF = (f) => setFoodLog({ ...foodLog, [tk]: [...log, { name: f.name, kcal: f.kcal, protein: f.protein, tl: trafficLight(f) }] });
  const rmF = (i) => setFoodLog({ ...foodLog, [tk]: log.filter((_, j) => j !== i) });
  const PORTION_GUIDE = { cut: "감량 — 밥은 반공기, 단백질은 넉넉히, 기름·소스는 적게", maintain: "유지 — 밥 2/3공기, 단백질 충분히, 전체적으로 균형 있게", gain: "증량 — 밥 한 공기 이상, 단백질·간식 넉넉히 칼로리 확보" };
  const tabs = [["log","오늘 기록"],["menu","추천 식단"],["db","음식 DB"],["tips","꿀팁"]];

  return <div className="space-y-4">
    {/* 상단 요약 */}
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <Ring value={(totals.kcal/nut.target)*100} size={92} color={totals.kcal>nut.target?"#fb923c":"#34d399"}>
          <span className="text-lg font-extrabold text-zinc-100">{totals.kcal}</span><span className="text-[10px] text-zinc-500">/{nut.target}</span>
        </Ring>
        <div className="flex-1 space-y-2">
          <div>
            <div className="flex items-baseline justify-between"><span className="text-xs font-semibold text-lime-300">단백질 (최우선)</span><span className="text-sm font-bold text-lime-400">{totals.protein}<span className="text-xs text-zinc-500">/{nut.protein}g</span></span></div>
            <Bar value={(totals.protein/nut.protein)*100} tone="emerald" />
          </div>
          <div className="flex justify-between text-xs"><span className="text-zinc-400">남은 칼로리</span><span className="font-semibold text-zinc-200">{(nut.target-totals.kcal).toLocaleString()} kcal</span></div>
          <div className="flex justify-between text-xs"><span className="text-zinc-400">남은 단백질</span><span className="font-semibold text-lime-400">{Math.max(0, nut.protein-totals.protein)} g</span></div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-center gap-4 border-t border-zinc-800 pt-2 text-[11px]">
        {Object.entries(TL).map(([k, v]) => <span key={k} className="flex items-center gap-1 text-zinc-400"><span className={cls("h-2.5 w-2.5 rounded-full", v.dot)} />{v.label}</span>)}
        {excludeEgg && <span className="text-zinc-600">계란 자동제외 ✓</span>}
      </div>
    </Card>

    <div className="grid grid-cols-4 gap-1.5">{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={cls("rounded-xl py-2 text-xs font-semibold", tab===k?"bg-lime-500 text-zinc-950":"bg-zinc-800 text-zinc-300")}>{l}</button>)}</div>

    {tab === "log" && <div className="space-y-3">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="음식 검색 (예: 닭가슴살)" className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-lime-500" />
      {q && <Card className="max-h-60 overflow-y-auto p-1">{filtered.length ? filtered.map((f, i) => { const tl = trafficLight(f); return <button key={i} onClick={() => { addF(f); setQ(""); }} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-800"><span className="flex items-center gap-2 text-zinc-200"><span className={cls("h-2.5 w-2.5 rounded-full", TL[tl].dot)} />{f.name} <span className="text-xs text-zinc-500">{f.serving}</span></span><span className="text-xs text-zinc-400">{f.kcal}kcal·P{f.protein}</span></button>; }) : <p className="px-3 py-2 text-sm text-zinc-500">결과 없음</p>}</Card>}
      <Card className="p-2">{log.length ? log.map((f, i) => <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm"><span className="flex items-center gap-2 text-zinc-200"><span className={cls("h-2.5 w-2.5 rounded-full", TL[f.tl||"yellow"].dot)} />{f.name}</span><div className="flex items-center gap-3"><span className="text-xs text-zinc-400">{f.kcal}kcal·P{f.protein}</span><button onClick={() => rmF(i)} className="text-zinc-600 hover:text-rose-400">✕</button></div></div>) : <p className="px-3 py-4 text-center text-sm text-zinc-500">위에서 음식을 검색해 오늘 먹은 것을 기록하세요.</p>}</Card>
      <Card className="p-4"><SectionTitle icon="water">물 ({water}/12잔)</SectionTitle><Bar value={(water/12)*100} tone="sky" /><div className="mt-2 flex gap-2"><button onClick={() => setWater(Math.max(0, water-1))} className="flex-1 rounded-lg bg-zinc-800 py-1.5 text-zinc-300">−</button><button onClick={() => setWater(water+1)} className="flex-1 rounded-lg bg-sky-500/90 py-1.5 font-bold text-zinc-950">+ 한 잔</button></div></Card>
    </div>}

    {tab === "menu" && <div className="space-y-3"><Card className="p-3"><div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"><span className="font-semibold text-lime-300">🍽️ 포션 가이드</span><span className="text-zinc-300">{PORTION_GUIDE[goal] || PORTION_GUIDE.cut}</span></div></Card>{DIET.sampleDays.filter((d) => excludeEgg ? !d.meals.some((m) => m.foods.some(hasEgg)) : true).map((d, i) => <Card key={i} className="p-4"><div className="mb-2 flex items-center justify-between"><span className="font-bold text-zinc-100">{d.day}</span><Pill tone="emerald">{d.totalKcal}kcal·P{d.totalProtein}</Pill></div><div className="space-y-2">{d.meals.map((m, j) => <div key={j} className="rounded-lg bg-zinc-800/50 p-2.5"><div className="mb-0.5 flex items-center justify-between"><span className="text-xs font-semibold text-lime-300">{m.type}</span><span className="text-[11px] text-zinc-500">{m.kcal}kcal·P{m.protein}</span></div><p className="text-sm text-zinc-300">{m.foods.join(" · ")}</p></div>)}</div></Card>)}
      <Card className="p-4"><SectionTitle icon="water">편의점 조합</SectionTitle><ul className="space-y-1.5 text-sm text-zinc-300">{DIET.convenienceStore.map((c, i) => <li key={i}>🏪 {c}</li>)}</ul></Card>
    </div>}

    {tab === "db" && <div className="space-y-2"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="음식 검색" className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-lime-500" />
      <Card className="overflow-hidden">{filtered.map((f, i) => { const tl = trafficLight(f); return <div key={i} className="flex items-center justify-between border-b border-zinc-800/70 px-3 py-2.5 last:border-0"><div className="flex min-w-0 items-center gap-2"><span className={cls("h-3 w-3 shrink-0 rounded-full", TL[tl].dot)} /><div className="min-w-0"><p className="truncate text-sm font-medium text-zinc-200">{f.name} <span className="text-xs font-normal text-zinc-500">{f.serving}</span></p>{f.tip && <p className="truncate text-[11px] text-zinc-500">💡 {f.tip}</p>}</div></div><div className="ml-2 shrink-0 text-right"><p className="text-sm font-semibold text-zinc-100">{f.kcal}<span className="text-[10px] text-zinc-500">kcal</span></p><p className="text-[11px] text-lime-400">P {f.protein}g</p></div></div>; })}</Card>
    </div>}

    {tab === "tips" && <div className="space-y-3">
      <Collapsible title="식단 기본 원칙" icon="check" defaultOpen><ul className="space-y-2">{DIET.generalRules.map((r, i) => <li key={i} className="flex gap-2"><span className="text-lime-400">✓</span>{r}</li>)}</ul></Collapsible>
      <Collapsible title="외식·회식 칼로리 줄이기" icon="food"><ul className="space-y-1.5">{DIET.eatingOut.map((r, i) => <li key={i}>• {r}</li>)}</ul></Collapsible>
      <Collapsible title="저칼로리 대체 (스왑)" icon="swap"><div className="space-y-1.5">{DIET.swaps.map((s, i) => <div key={i} className="flex items-center gap-2 text-sm"><span className="text-zinc-400 line-through">{s.from}</span><span className="text-zinc-600">→</span><span className="font-semibold text-lime-300">{s.to}</span><span className="ml-auto text-[11px] text-amber-400">{s.save}</span></div>)}</div></Collapsible>
    </div>}
  </div>;
}

/* ============================ 진행 탭 ============================ */
function ProgressTab({ profile, weightLog, sessions, habits, setHabits, addWeight, exportData }) {
  const [w, setW] = useState("");
  const sorted = [...weightLog].sort((a, b) => a.date.localeCompare(b.date));
  const cur = sorted.length ? sorted[sorted.length-1].weight : profile.weight;
  const ma = sorted.length ? movingAvg(sorted) : [];
  const trendNow = ma.length ? ma[ma.length-1].avg : cur;
  const trendPrev = ma.length > 7 ? ma[ma.length-8].avg : (ma.length ? ma[0].avg : cur);
  const weekChange = ma.length > 7 ? (trendNow - trendPrev) : null; // +면 증가, -면 감소
  const toGoal = profile.goal === "maintain" ? null : Math.abs(cur - profile.goalWeight);
  const towardGoal = profile.goal === "gain" ? (weekChange != null && weekChange > 0.05)
    : profile.goal === "maintain" ? false : (weekChange != null && weekChange < -0.05);
  const eta = (towardGoal && toGoal != null) ? Math.round(toGoal / Math.abs(weekChange)) : null;
  const tk = todayKey();
  const todayHabits = habits[tk] || {};
  const toggle = (i) => setHabits({ ...habits, [tk]: { ...todayHabits, [i]: !todayHabits[i] } });
  const doneCount = Object.values(todayHabits).filter(Boolean).length;
  const totalVol = sessions.reduce((a, s) => a + (s.volume || 0), 0);
  const milestones = computeMilestones(profile);
  const timeline = computeTimeline(profile);

  return <div className="space-y-4">
    <SectionTitle icon="chart">기록 & 진행</SectionTitle>

    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between"><span className="font-semibold text-zinc-200">체중 추세 <span className="text-xs font-normal text-zinc-500">(7일 평균선)</span></span>{ma.length && <Pill tone="emerald">{trendNow.toFixed(1)}kg</Pill>}</div>
      <WeightChart log={weightLog} start={profile.startWeight} goal={profile.goalWeight} />
      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-zinc-800/50 p-2"><p className="text-zinc-500">주간 변화</p><p className="font-bold text-lime-400">{weekChange!=null?`${weekChange>0?"+":""}${weekChange.toFixed(2)}kg`:"–"}</p></div>
        <div className="rounded-lg bg-zinc-800/50 p-2"><p className="text-zinc-500">{profile.goal==="maintain"?"현재 체중":"목표까지"}</p><p className="font-bold text-zinc-100">{profile.goal==="maintain"?`${cur.toFixed(1)}kg`:`${(toGoal||0).toFixed(1)}kg`}</p></div>
        <div className="rounded-lg bg-zinc-800/50 p-2"><p className="text-zinc-500">예상 도달</p><p className="font-bold text-zinc-100">{eta!=null?`약 ${eta}주`:"–"}</p></div>
      </div>
      <div className="mt-3 flex gap-2"><input value={w} onChange={(e) => setW(e.target.value)} inputMode="decimal" placeholder="오늘 체중 (kg)" className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-lime-500" /><button onClick={() => { const n = parseFloat(w); if (!isNaN(n)) { addWeight(n); setW(""); } }} className="shrink-0 rounded-xl bg-lime-500 px-4 py-2 text-sm font-bold text-zinc-950">기록</button></div>
    </Card>

    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between"><SectionTitle icon="check">오늘의 습관</SectionTitle><Pill tone="emerald">{doneCount}/{EDUCATION.habits.length}</Pill></div>
      <div className="space-y-1">{EDUCATION.habits.map((h, i) => <button key={i} onClick={() => toggle(i)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-zinc-800/60"><span className={cls("flex h-5 w-5 shrink-0 items-center justify-center rounded-md", todayHabits[i]?"bg-lime-500 text-zinc-950":"border border-zinc-600")}>{todayHabits[i] && <Ico name="check" className="w-3.5 h-3.5" stroke={3} />}</span><span className={cls("text-sm", todayHabits[i]?"text-zinc-500 line-through":"text-zinc-200")}>{h}</span></button>)}</div>
    </Card>

    <Card className="p-4">
      <SectionTitle icon="trophy">{profile.goal==="gain"?"증량":profile.goal==="maintain"?"유지":"감량"} 마일스톤</SectionTitle>
      <div className="space-y-2.5">{milestones.map((m, i) => { const reached = milestoneReached(m, profile, cur); return <div key={i} className="flex gap-3"><div className={cls("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold", reached?"bg-lime-500 text-zinc-950":"bg-zinc-800 text-zinc-500")}>{reached?"✓":i+1}</div><div><p className={cls("text-sm font-semibold", reached?"text-lime-300":"text-zinc-300")}>{m.weight!=null?`${m.weight}kg · `:""}{m.label}</p><p className="text-[11px] leading-snug text-zinc-500">{m.expect}</p></div></div>; })}</div>
    </Card>

    <Card className="p-4"><SectionTitle icon="dumbbell" sub={`총 볼륨 ${(totalVol/1000).toFixed(1)}톤`}>최근 운동 기록</SectionTitle>{sessions.length ? <div className="space-y-2">{[...sessions].reverse().slice(0, 8).map((s, i) => <div key={i} className="rounded-lg bg-zinc-800/50 p-2.5 text-sm"><div className="flex items-center justify-between"><span className="font-semibold text-zinc-200">{fmtDate(s.date)} · {s.day}</span><span className="text-[11px] text-zinc-500">{Object.keys(s.entries).length}종목 · {(s.volume||0).toLocaleString()}kg</span></div><p className="mt-0.5 text-xs text-zinc-500">{Object.keys(s.entries).join(", ")}</p></div>)}</div> : <p className="text-sm text-zinc-500">운동 탭에서 세트를 기록·저장하면 쌓입니다.</p>}</Card>

    <Collapsible title="주간 체중, 어떻게 봐야 하나" icon="info"><p className="mb-2">{NUTRITION.weightInterpretation.method}</p><p className="mb-1 text-zinc-400">정상 변동 ±{NUTRITION.weightInterpretation.normalDailyFluctuationKg}kg · 원인:</p><ul className="mb-2 space-y-0.5 text-zinc-400">{NUTRITION.weightInterpretation.causes.map((c, i) => <li key={i}>• {c}</li>)}</ul><p className="rounded-lg bg-lime-500/10 p-2 text-lime-300">{NUTRITION.weightInterpretation.rule}</p></Collapsible>
    <Collapsible title={profile.goal==="maintain"?"단계별 트레이닝 타임라인":`예상 타임라인 (${timeline.estimatedDurationMonths}개월)`} icon="flag"><div className="space-y-2">{timeline.phases.map((p, i) => <div key={i} className="rounded-lg bg-zinc-800/50 p-2.5"><div className="flex items-center justify-between"><b className="text-zinc-200">{p.range}</b><Pill tone="sky">주 {p.weeklyRateKg}kg</Pill></div><p className="mt-1 text-xs text-zinc-400">{p.note}</p></div>)}<p className="text-xs text-zinc-500">{profile.goal==="maintain"?"🛋 디로드: ":"🛋 다이어트 브레이크: "}{timeline.dietBreak.frequency} — {timeline.dietBreak.method}</p></div></Collapsible>
    <Collapsible title="정체기 돌파법" icon="fire"><ul className="space-y-2">{NUTRITION.plateau.map((p, i) => <li key={i}><b className="text-amber-300">{p.method}</b><br /><span className="text-zinc-400">{p.detail}</span></li>)}</ul></Collapsible>

    <SectionTitle icon="sparkle">핵심 교육</SectionTitle>
    {EDUCATION.lessons.map((l, i) => <Collapsible key={i} title={<span>{l.icon} {l.title}</span>}><p className="mb-2 text-zinc-300">{l.summary}</p><ul className="space-y-1">{l.points.map((p, j) => <li key={j} className="flex gap-2"><span className="text-lime-400">›</span>{p}</li>)}</ul></Collapsible>)}
    <Collapsible title="멘탈 & 동기부여" icon="fire"><ul className="space-y-2">{EDUCATION.mindset.map((m, i) => <li key={i} className="flex gap-2"><span className="text-violet-400">★</span>{m}</li>)}</ul></Collapsible>

    <button onClick={exportData} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-700 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800"><Ico name="download" className="w-4 h-4" /> 내 데이터 백업 (JSON 내보내기)</button>
    <p className="pb-2 text-center text-[11px] leading-relaxed text-zinc-600">⚕ 본 앱은 의료 조언이 아닙니다. 통증·이상 증상 시 운동을 중단하고 전문의와 상담하세요.</p>
  </div>;
}

/* ============================ 홈 탭 ============================ */
const SCHEDULE = { 1: 0, 2: 1, 4: 2, 5: 3 }; // 월화목금 = 4분할, 수토 유산소, 일 휴식
function Home({ profile, nut, weightLog, sessions, water, go, lessonIdx }) {
  const sorted = [...weightLog].sort((a, b) => a.date.localeCompare(b.date));
  const cur = sorted.length ? sorted[sorted.length-1].weight : profile.weight;
  const lost = profile.startWeight - cur, total = profile.startWeight - profile.goalWeight;
  const pct = total !== 0 ? clamp((lost/total)*100, 0, 100) : (Math.abs(cur - profile.goalWeight) < 1 ? 100 : 0);
  const dow = new Date().getDay();
  const splitToday = SCHEDULE[dow];
  const isCardio = dow === 3 || dow === 6;
  const focusToday = splitToday != null ? STRENGTH.phases[0].days[splitToday].focus : null;
  // 이번 주 운동 횟수
  const now = new Date(); const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay()+6)%7));
  const weekKey = `${monday.getFullYear()}-${String(monday.getMonth()+1).padStart(2,"0")}-${String(monday.getDate()).padStart(2,"0")}`;
  const weekCount = sessions.filter((s) => s.date >= weekKey).length;
  const milestones = computeMilestones(profile);
  const nextM = nextMilestone(milestones, profile, cur);
  const lesson = EDUCATION.lessons[lessonIdx % EDUCATION.lessons.length];
  const macroBars = [["단백질", nut.protein, "emerald"], ["탄수", nut.carbs, "sky"], ["지방", nut.fat, "amber"]];

  return <div className="space-y-4">
    <div className="flex items-end justify-between">
      <div><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-lime-400">ONE MORE REP</p><h1 className="mt-0.5 text-2xl font-extrabold text-zinc-50">{cur}<span className="text-base text-zinc-400">kg</span> <span className="text-zinc-600">→</span> {profile.goalWeight}<span className="text-base text-zinc-400">kg</span></h1></div>
      <div className="text-right"><p className="text-xs text-zinc-500">{profile.goal==="gain"?"증량":profile.goal==="maintain"?"변화":"감량"}</p><p className="text-xl font-bold text-lime-400">{lost>0.05?"-":lost<-0.05?"+":""}{Math.abs(lost).toFixed(1)}</p></div>
    </div>

    <Card className="p-4"><div className="mb-2 flex items-center justify-between text-sm"><span className="font-semibold text-zinc-200">{profile.goal==="maintain"?`현재 ${cur.toFixed(1)}kg`:`목표까지 ${Math.abs(cur-profile.goalWeight).toFixed(1)}kg`}</span><span className="text-zinc-400">{pct.toFixed(0)}%</span></div><Bar value={pct} /><div className="mt-1.5 flex justify-between text-[11px] text-zinc-500"><span>{profile.startWeight}kg</span><span>{profile.goalWeight}kg</span></div></Card>

    {/* 오늘 운동 */}
    <Card className="p-4">
      <SectionTitle icon="dumbbell">오늘의 운동 <span className="text-zinc-500">({WD[dow]})</span></SectionTitle>
      <div className="flex items-center justify-between gap-3">
        <div>
          <Pill tone={focusToday?"violet":isCardio?"sky":"zinc"}>{focusToday?"근력":isCardio?"유산소":"휴식"}</Pill>
          <p className="mt-1.5 text-sm text-zinc-300">{focusToday ? focusToday : isCardio ? "저충격 유산소 30~40분 (실내자전거·경사걷기)" : "완전 휴식 · 회복"}</p>
        </div>
        {focusToday && <button onClick={() => go("workout", splitToday)} className="shrink-0 rounded-xl bg-lime-500 px-3 py-2 text-sm font-bold text-zinc-950">운동 시작</button>}
        {isCardio && <button onClick={() => go("workout")} className="shrink-0 rounded-xl bg-sky-500 px-3 py-2 text-sm font-bold text-zinc-950">유산소</button>}
      </div>
    </Card>

    {/* 주간 진행 + 칼로리 */}
    <div className="grid grid-cols-2 gap-3">
      <Card className="flex flex-col items-center p-4"><Ring value={(weekCount/4)*100} size={88} color="#a78bfa"><span className="text-xl font-extrabold text-zinc-100">{weekCount}<span className="text-sm text-zinc-500">/4</span></span></Ring><p className="mt-2 text-xs font-semibold text-zinc-300">이번 주 운동</p></Card>
      <Card className="p-4">
        <p className="mb-1 text-xs font-semibold text-zinc-300">오늘 목표 영양</p>
        <p className="text-lg font-extrabold text-lime-400">{nut.target.toLocaleString()}<span className="text-xs text-zinc-500">kcal</span></p>
        <div className="mt-1.5 space-y-1">{macroBars.map(([l, v, t]) => <div key={l} className="flex items-center gap-1.5 text-[11px]"><span className="w-8 text-zinc-500">{l}</span><div className="flex-1"><Bar value={100} tone={t} /></div><span className="w-7 text-right text-zinc-300">{v}g</span></div>)}</div>
      </Card>
    </div>

    {/* 체중 추세 미니 */}
    <Card className="p-4"><div className="mb-1 flex items-center justify-between"><span className="text-sm font-semibold text-zinc-200">체중 추세</span><button onClick={() => go("progress")} className="text-xs text-lime-400">기록하기 ›</button></div><WeightChart log={weightLog} start={profile.startWeight} goal={profile.goalWeight} /></Card>

    {/* 1분 레슨 + 다음 목표 */}
    <Card className="p-4"><div className="mb-1 flex items-center gap-2"><Ico name="sparkle" className="w-4 h-4 text-violet-400" /><span className="text-xs font-bold text-violet-300">1분 레슨</span></div><p className="text-sm font-semibold text-zinc-100">{lesson.icon} {lesson.title}</p><p className="mt-1 text-xs leading-snug text-zinc-400">{lesson.summary}</p></Card>
    <Card className="p-4 text-center"><p className="text-xs text-zinc-500">다음 마일스톤</p><p className="text-2xl font-extrabold text-amber-400">{nextM.weight!=null?`${nextM.weight}kg`:nextM.label}</p><p className="text-xs text-zinc-400">{nextM.weight!=null?nextM.label:nextM.expect}</p></Card>
  </div>;
}

/* ============================ 프로필 편집 ============================ */
function ProfileModal({ profile, setProfile, onClose }) {
  const [p, setP] = useState(profile);
  const acts = [[1.2,"거의 안 움직임"],[1.375,"가벼움"],[1.55,"보통"],[1.725,"활발"]];
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
    <div className="w-full max-w-md rounded-t-3xl border border-zinc-800 bg-zinc-900 p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
      <h2 className="mb-4 text-lg font-bold text-zinc-100">내 정보</h2>
      <div className="grid grid-cols-2 gap-3">{[["키(cm)","height"],["현재 체중(kg)","weight"],["목표 체중(kg)","goalWeight"],["나이","age"],["시작 체중(kg)","startWeight"]].map(([l, k]) => <label key={k} className="text-sm"><span className="text-zinc-400">{l}</span><input value={p[k]} onChange={(e) => setP({ ...p, [k]: parseFloat(e.target.value)||0 })} inputMode="decimal" className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 outline-none focus:border-lime-500" /></label>)}</div>
      <p className="mb-1 mt-4 text-sm text-zinc-400">활동 수준</p>
      <div className="grid grid-cols-2 gap-1.5">{acts.map(([v, l]) => <button key={v} onClick={() => setP({ ...p, activity: v })} className={cls("rounded-xl px-2 py-2 text-xs font-semibold", p.activity===v?"bg-lime-500 text-zinc-950":"bg-zinc-800 text-zinc-300")}>{l}</button>)}</div>
      <p className="mb-1 mt-4 text-sm text-zinc-400">목표</p>
      <div className="grid grid-cols-3 gap-1.5">{[["cut","감량"],["maintain","유지"],["gain","증량"]].map(([v, l]) => <button key={v} onClick={() => setP({ ...p, goal: v })} className={cls("rounded-xl px-2 py-2 text-xs font-semibold", p.goal===v?"bg-lime-500 text-zinc-950":"bg-zinc-800 text-zinc-300")}>{l}</button>)}</div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-zinc-400">계란 제외</span>
        <button onClick={() => setP({ ...p, excludeEgg: !p.excludeEgg })} className={cls("relative h-7 w-12 shrink-0 rounded-full transition-colors", p.excludeEgg ? "bg-lime-500" : "bg-zinc-700")}><span className={cls("absolute top-1 h-5 w-5 rounded-full bg-white transition-all", p.excludeEgg ? "left-6" : "left-1")} /></button>
      </div>
      <button onClick={() => { setProfile(p); onClose(); }} className="mt-5 w-full rounded-2xl bg-lime-500 py-3 font-bold text-zinc-950 hover:bg-lime-400">저장</button>
    </div>
  </div>;
}

/* ============================ 앱 루트 ============================ */
/* ============================ 클라우드 동기화 훅·UI ============================ */
function fmtSyncTime(iso) {
  try { return new Date(iso).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
}
const SYNC_STATUS = { idle: "대기", syncing: "동기화 중…", saved: "최신 상태", error: "오류", offline: "오프라인" };

function useCloudSync() {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("idle");
  const [lastSync, setLastSync] = useState(() => readMeta().remoteUpdatedAt || null);
  const [err, setErr] = useState("");
  const pushTimer = useRef(null);
  const busy = useRef(false);
  const userRef = useRef(null);
  userRef.current = user;

  async function pushRaw(uid) {
    const snap = syncSnapshot();
    const now = new Date().toISOString();
    const { error } = await sb.from("app_state").upsert({ user_id: uid, data: snap, updated_at: now });
    if (error) throw error;
    const m = readMeta(); m.syncedHash = hashOf(snap); m.remoteUpdatedAt = now; writeMeta(m); setLastSync(now);
  }
  function applyRemote(data) {
    syncWrite(data.data || {});
    const m = readMeta();
    m.syncedHash = hashOf(data.data || {}); m.remoteUpdatedAt = data.updated_at;
    m.localChangedAt = Date.parse(data.updated_at) || Date.now(); writeMeta(m);
    location.reload();
  }
  async function reconcile(uid) {
    if (!sb || busy.current) return;
    busy.current = true; setStatus("syncing"); setErr("");
    try {
      const { data, error } = await sb.from("app_state").select("data,updated_at").eq("user_id", uid).maybeSingle();
      if (error) throw error;
      const m = readMeta();
      if (!data) { await pushRaw(uid); setStatus("saved"); return; }
      const rh = hashOf(data.data || {});
      if (rh === localHash()) { m.syncedHash = rh; m.remoteUpdatedAt = data.updated_at; writeMeta(m); setLastSync(data.updated_at); setStatus("saved"); return; }
      let remoteWins;
      if (!hasRealData()) remoteWins = true;
      else remoteWins = window.confirm(
        "클라우드에 저장된 데이터가 이 기기와 다릅니다.\n\n[확인] 클라우드 데이터를 이 기기로 받기\n[취소] 이 기기 데이터를 클라우드에 올리기\n\n(클라우드 최종 수정: " + fmtSyncTime(data.updated_at) + ")");
      if (remoteWins) { applyRemote(data); return; }
      await pushRaw(uid); setStatus("saved");
    } catch (e) { setStatus("error"); setErr((e && e.message) || String(e)); }
    finally { busy.current = false; }
  }
  async function pullApply(uid) {
    if (!sb || busy.current) return;
    try {
      const { data, error } = await sb.from("app_state").select("data,updated_at").eq("user_id", uid).maybeSingle();
      if (error || !data) return;
      const m = readMeta();
      if (data.updated_at === m.remoteUpdatedAt) return;
      if (hashOf(data.data || {}) === localHash()) { m.remoteUpdatedAt = data.updated_at; writeMeta(m); return; }
      const remoteMs = Date.parse(data.updated_at) || 0, localMs = m.localChangedAt || 0;
      if (remoteMs >= localMs) applyRemote(data);
    } catch {}
  }
  async function doPush() {
    const u = userRef.current;
    if (!sb || !u || busy.current) return;
    if (readMeta().syncedHash === localHash()) return;
    busy.current = true; setStatus("syncing");
    try { await pushRaw(u.id); setStatus("saved"); }
    catch (e) { setStatus("error"); setErr((e && e.message) || String(e)); }
    finally { busy.current = false; }
  }

  // 인증 부트스트랩
  useEffect(() => {
    if (!sb) return;
    let sub;
    sb.auth.getSession().then(({ data }) => {
      const u = data.session ? data.session.user : null;
      setUser(u ? { id: u.id, email: u.email } : null);
      if (u) reconcile(u.id);
    });
    try { sub = sb.auth.onAuthStateChange((_e, session) => {
      const u = session ? session.user : null;
      setUser(u ? { id: u.id, email: u.email } : null);
      if (u) reconcile(u.id);
    }).data.subscription; } catch {}
    return () => { try { sub && sub.unsubscribe(); } catch {} };
  }, []);

  // 로컬 변경 → 디바운스 푸시
  useEffect(() => {
    if (!sb) return;
    const onChange = () => {
      const m = readMeta();
      if (localHash() === m.syncedHash) return;
      m.localChangedAt = Date.now(); writeMeta(m);
      if (!userRef.current) return;
      clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(doPush, 1500);
    };
    window.addEventListener("fc:changed", onChange);
    return () => window.removeEventListener("fc:changed", onChange);
  }, []);

  // 포커스/주기적 풀
  useEffect(() => {
    if (!sb || !user) return;
    const onFocus = () => { if (document.visibilityState === "visible") pullApply(user.id); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    const iv = setInterval(onFocus, 30000);
    return () => { window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); clearInterval(iv); };
  }, [user]);

  return {
    enabled: !!sb, user, status, lastSync, err,
    signIn: async (email, password) => { setErr(""); const { error } = await sb.auth.signInWithPassword({ email, password }); if (error) { setErr(error.message); return false; } return true; },
    signUp: async (email, password) => { setErr(""); const { data, error } = await sb.auth.signUp({ email, password }); if (error) { setErr(error.message); return false; } if (!data.session) { setErr("가입됨. 이메일 인증이 켜져 있으면 받은 메일을 확인한 뒤 로그인하세요."); return false; } return true; },
    signOut: async () => { try { await sb.auth.signOut(); } catch {} setUser(null); setStatus("idle"); writeMeta({}); },
    syncNow: async () => { const u = userRef.current; if (u) { await pullApply(u.id); await doPush(); } },
  };
}

function SyncModal({ sync, onClose }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [mode, setMode] = useState("in");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    if (mode === "in") await sync.signIn(email.trim(), pw);
    else await sync.signUp(email.trim(), pw);
    setBusy(false);
  };
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" onClick={onClose}>
    <div className="w-full max-w-md rounded-t-3xl bg-zinc-900 p-5 ring-1 ring-zinc-700/50 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-extrabold">☁ 기기 간 동기화</h2>
        <button onClick={onClose} className="px-1 text-xl leading-none text-zinc-500 hover:text-zinc-300">✕</button>
      </div>
      {sync.user ? <div className="space-y-3">
        <p className="text-sm text-zinc-300">로그인됨 · <b className="text-lime-300">{sync.user.email}</b></p>
        <p className="text-xs text-zinc-500">상태: {SYNC_STATUS[sync.status] || sync.status}{sync.lastSync ? " · 마지막 동기화 " + fmtSyncTime(sync.lastSync) : ""}</p>
        <p className="text-xs leading-relaxed text-zinc-500">이 계정으로 로그인한 모든 기기에서 데이터가 자동으로 동기화됩니다. 기록을 바꾸면 잠시 뒤 자동 저장되고, 다른 기기에서 앱을 열면 최신 데이터를 받아옵니다.</p>
        {sync.err && <p className="rounded-lg bg-rose-500/10 p-2 text-xs text-rose-300">{sync.err}</p>}
        <div className="flex gap-2">
          <button onClick={sync.syncNow} className="flex-1 rounded-2xl bg-lime-500 py-3 text-sm font-bold text-zinc-950 hover:bg-lime-400">지금 동기화</button>
          <button onClick={sync.signOut} className="rounded-2xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800">로그아웃</button>
        </div>
      </div> : <div className="space-y-3">
        <p className="text-xs leading-relaxed text-zinc-400">이메일로 계정을 만들면 폰·PC 등 모든 기기에서 같은 데이터를 쓸 수 있어요. 비밀번호는 이 앱 동기화 전용입니다.</p>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" autoComplete="email" placeholder="이메일" className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-3 text-sm outline-none focus:border-lime-500" />
        <input value={pw} onChange={(e) => setPw(e.target.value)} type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} placeholder="비밀번호 (6자 이상)" className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-3 text-sm outline-none focus:border-lime-500" />
        {sync.err && <p className="rounded-lg bg-rose-500/10 p-2 text-xs text-rose-300">{sync.err}</p>}
        <button disabled={busy || !email || pw.length < 6} onClick={submit} className="w-full rounded-2xl bg-lime-500 py-3 text-sm font-bold text-zinc-950 hover:bg-lime-400 disabled:opacity-50">{busy ? "처리 중…" : (mode === "in" ? "로그인" : "계정 만들기")}</button>
        <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="w-full text-center text-xs text-zinc-400 hover:text-zinc-200">{mode === "in" ? "처음이세요? 계정 만들기" : "이미 계정이 있어요 → 로그인"}</button>
        <p className="text-[11px] leading-relaxed text-zinc-600">⚠ 여러 기기를 처음 연결할 땐 어느 데이터를 쓸지 물어봅니다. 걱정되면 먼저 진행 탭에서 '백업(JSON)'을 받아두세요.</p>
      </div>}
    </div>
  </div>;
}

function AuthGate({ sync, onGuest }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [mode, setMode] = useState("in");
  const [busy, setBusy] = useState(false);
  const ok = email && pw.length >= 6 && !busy;
  const submit = async () => {
    setBusy(true);
    if (mode === "in") await sync.signIn(email.trim(), pw);
    else await sync.signUp(email.trim(), pw);
    setBusy(false);
  };
  return <div className="flex min-h-screen flex-col justify-center bg-zinc-950 px-5 py-10 text-zinc-100" style={{ fontFamily: "'Pretendard','Apple SD Gothic Neo',system-ui,sans-serif" }}>
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center text-center">
        <span className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-lime-300 to-lime-400 text-zinc-950 shadow-lg shadow-lime-500/20"><Ico name="fire" className="w-9 h-9" stroke={2.5} /></span>
        <span className="text-3xl font-extrabold tracking-tight">핏코치</span>
        <p className="mt-2 text-[11px] font-extrabold uppercase tracking-[0.3em] text-lime-400">ONE MORE REP</p>
        <p className="mt-2 text-sm text-zinc-400">감량·유지·증량, 운동·식단을 한 곳에서</p>
      </div>
      <div className="space-y-3">
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" autoComplete="email" placeholder="이메일" onKeyDown={(e) => { if (e.key === "Enter" && ok) submit(); }} className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-3 text-sm outline-none focus:border-lime-500" />
        <input value={pw} onChange={(e) => setPw(e.target.value)} type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} placeholder="비밀번호 (6자 이상)" onKeyDown={(e) => { if (e.key === "Enter" && ok) submit(); }} className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-3 text-sm outline-none focus:border-lime-500" />
        {sync.err && <p className="rounded-lg bg-rose-500/10 p-2 text-xs text-rose-300">{sync.err}</p>}
        <button disabled={!ok} onClick={submit} className="w-full rounded-2xl bg-lime-500 py-3.5 text-sm font-bold text-zinc-950 hover:bg-lime-400 disabled:opacity-50">{busy ? "처리 중…" : (mode === "in" ? "로그인" : "계정 만들기")}</button>
        <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="w-full text-center text-xs text-zinc-400 hover:text-zinc-200">{mode === "in" ? "처음이세요? 계정 만들기" : "이미 계정이 있어요 → 로그인"}</button>
      </div>
      <div className="mt-8 border-t border-zinc-800 pt-5 text-center">
        <button onClick={onGuest} className="text-sm font-semibold text-zinc-400 hover:text-zinc-200">계정 없이 시작하기 →</button>
        <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-600">나중에 헤더의 ☁ 버튼으로 로그인하면 기기 간 동기화가 켜져요.</p>
      </div>
    </div>
  </div>;
}

function App() {
  const [profile, setProfile] = useLocal("fc.profile", null);
  const [weightLog, setWeightLog] = useLocal("fc.weightLog", []);
  const [sessions, setSessions] = useLocal("fc.sessions", []);
  const [foodLog, setFoodLog] = useLocal("fc.foodLog", {});
  const [waterMap, setWaterMap] = useLocal("fc.water", {});
  const [habits, setHabits] = useLocal("fc.habits", {});
  const [phaseIdx, setPhaseIdx] = useLocal("fc.phaseIdx", 0);
  const sync = useCloudSync();
  const [showSync, setShowSync] = useState(false);
  const [guest, setGuest] = useLocal("fc.guest", false);
  const [dayIdx, setDayIdx] = useState(0);
  const [tab, setTab] = useState("home");
  const [showProfile, setShowProfile] = useState(false);
  const [timer, setTimer] = useState({ remaining: 0, total: 0, running: false });

  const tk = todayKey();
  const water = waterMap[tk] || 0;
  const setWater = (n) => setWaterMap({ ...waterMap, [tk]: n });
  const lessonIdx = useMemo(() => { const d = new Date(); return d.getFullYear()*366 + (d.getMonth()*31 + d.getDate()); }, []);

  const nut = useMemo(() => {
    if (!profile) return null;
    const cur = weightLog.length ? [...weightLog].sort((a,b)=>a.date.localeCompare(b.date))[weightLog.length-1].weight : profile.weight;
    return computeNutrition({ ...profile, weight: cur });
  }, [profile, weightLog]);

  const weeksSince = useMemo(() => { if (!profile?.startDate) return 0; return Math.max(0, Math.floor(daysBetween(profile.startDate, tk) / 7)); }, [profile, tk]);

  const addWeight = (n) => { setWeightLog(weightLog.filter((d) => d.date !== tk).concat({ date: tk, weight: n })); setProfile({ ...profile, weight: n }); };
  const go = (t, d) => { if (d != null) setDayIdx(d); setTab(t); };
  const exportData = () => {
    const data = {}; Object.keys(localStorage).filter((k) => k.startsWith("fc.")).forEach((k) => { try { data[k] = JSON.parse(localStorage.getItem(k)); } catch {} });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `fitcoach-backup-${tk}.json`; a.click(); URL.revokeObjectURL(url);
  };

  if (sync.enabled && !sync.user && !profile && !guest)
    return <AuthGate sync={sync} onGuest={() => setGuest(true)} />;

  if (!profile) return <>
    <Onboarding onDone={(p) => { setProfile({ ...p, startWeight: p.weight, startDate: tk }); setWeightLog([{ date: tk, weight: p.weight }]); }} />
    {showSync && <SyncModal sync={sync} onClose={() => setShowSync(false)} />}
  </>;

  const NAV = [["home","홈","home"],["workout","운동","dumbbell"],["diet","식단","food"],["progress","진행","chart"]];

  return <div className="min-h-screen bg-zinc-950 text-zinc-100" style={{ fontFamily: "'Pretendard','Apple SD Gothic Neo',system-ui,sans-serif" }}>
    <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-lime-400 to-lime-300 text-zinc-950"><Ico name="fire" className="w-5 h-5" stroke={2.4} /></span><span className="text-lg font-extrabold tracking-tight">핏코치</span></div>
        <div className="flex items-center gap-2">
          {sync.enabled && <button onClick={() => setShowSync(true)} title="기기 간 동기화" className="flex items-center gap-1.5 rounded-full bg-zinc-800 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"><span className={cls("h-2 w-2 rounded-full", sync.user ? (sync.status === "error" ? "bg-rose-400" : "bg-lime-400") : "bg-zinc-500")} />☁</button>}
          <button onClick={() => setShowProfile(true)} className="flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"><Ico name="edit" className="w-3.5 h-3.5" /> 내 정보</button>
        </div>
      </div>
    </header>

    <main className="mx-auto max-w-md px-4 py-5 pb-28">
      {tab === "home" && <Home profile={profile} nut={nut} weightLog={weightLog} sessions={sessions} water={water} go={go} lessonIdx={lessonIdx} />}
      {tab === "workout" && <Workout phaseIdx={phaseIdx} setPhaseIdx={setPhaseIdx} dayIdx={dayIdx} setDayIdx={setDayIdx} sessions={sessions} setSessions={setSessions} setTimer={setTimer} weeksSince={weeksSince} nut={nut} />}
      {tab === "diet" && <Diet nut={nut} foodLog={foodLog} setFoodLog={setFoodLog} water={water} setWater={setWater} excludeEgg={profile.excludeEgg} goal={profile.goal} />}
      {tab === "progress" && <ProgressTab profile={profile} weightLog={weightLog} sessions={sessions} habits={habits} setHabits={setHabits} addWeight={addWeight} exportData={exportData} />}
    </main>

    <FloatingTimer timer={timer} setTimer={setTimer} />

    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-4">{NAV.map(([k, l, ic]) => <button key={k} onClick={() => setTab(k)} className={cls("flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium", tab===k?"text-lime-400":"text-zinc-500 hover:text-zinc-300")}><Ico name={ic} className="w-6 h-6" />{l}</button>)}</div>
    </nav>

    {showProfile && <ProfileModal profile={profile} setProfile={setProfile} onClose={() => setShowProfile(false)} />}
    {showSync && <SyncModal sync={sync} onClose={() => setShowSync(false)} />}
  </div>;
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
