# 식단/칼로리 트래킹 앱 리서치 (2024~2026 기준)

대상 앱: MyFitnessPal · FatSecret · MacroFactor · Cronometer · Lose It! · 한국 음식 DB군(다이어트카메라/인아웃/MFDS 공공DB) + 참고(Cal AI/SnapCalorie)
우리 앱 컨텍스트: 188cm 113→83kg 감량, 운동 초보, **계란 제외 고단백 식단**, 무릎 보호. 식단 로깅은 "마찰 최소화 + 단백질 우선 + 적응형 칼로리"가 핵심.

---

## 1. MacroFactor — (적응형 매크로 트래커 / 다이어트 코치) · iOS·Android
*Stronger By Science 팀 개발. 이 카테고리에서 우리 앱이 가장 많이 벤치마크해야 할 앱.*

**핵심기능**
- **적응형 TDEE 알고리즘**: 정적 공식이 아니라 "실제 체중 추이 + 섭취 칼로리"로 매주 에너지 소비량(소비 칼로리)을 역산해 칼로리/매크로 목표를 자동 재계산. 다이어트 중 발생하는 대사 적응(metabolic adaptation)을 반영.
- **Trend Weight(추세 체중)**: 일일 변동(수분 등)을 평활화한 추세선으로 진짜 진행을 보여줌 → 하루 +1kg에 좌절하지 않게 함.
- **3가지 코칭 모드**: Coached(앱이 전부 자동 조정) / Collaborative(주간 칼로리는 앱이, 일별 분배는 사용자) / Manual(전부 수동).
- **빠른 로깅 UX**: 바코드, 115만 식품 초고속 검색, Quick Add(매크로만 입력), 커스텀 식품/레시피, 시간대별 자주 먹는 음식 자동 추천(먹는 패턴 학습).
- **2025년 신기능**: 4월 AI 사진 로깅(사진→식재료별로 분해, 편집 가능) 출시. "Step-Informed Updates"로 걸음수 활동 데이터를 소비량 추정에 직접 반영. 단백질 타이밍/분배 표시 추가. (2026년 자체 운동 앱 개발 중)

**우리 앱에 적용할 점 (takeaway)** ⭐
- **이 사용자(30kg 감량)에게 적응형 칼로리가 핵심.** 113→83kg 진행 중 대사가 떨어지면 고정 칼로리는 정체기를 부른다. 우리 앱도 "매주 체중 추이로 TDEE 재계산 → 다음 주 목표 자동 갱신" 루프를 1순위로 구현하라.
- **Trend Weight를 기본 진행 지표로** 써라. 초보 고체중 사용자는 일일 변동에 멘탈이 흔들리기 쉬움(요구사항 ⑦ 체중추적과 직결).
- **"앱이 판단/비난하지 않음(no judgment)" 철학** 채택. 과식한 날 기록을 건너뛰면 오히려 소비량 추정이 부정확해진다고 안내 → 꾸준한 로깅 유도.
- 코칭 모드 중 우리는 초보용 **Coached(완전 자동)를 디폴트**로 두는 게 맞다.

**강점**: 알고리즘 정확도(3~4주 사용 후 일반 TDEE 공식보다 120~170% 정확, 추정 오차 중앙값 135kcal vs 공식 335kcal). 광고 없음, 빠른 로깅.
**약점/주의**: 무료 없음(유료 전용). **전용 물 추적 기능은 검색상 확인 안 됨**[추정: 미지원/약함]. 정확도 이점은 "3~4주 일관 로깅" 전제 → 초기엔 효과 체감 늦음.
**수익모델**: 구독 약 **$72/년** (무료 티어 없음, 보통 7일 무료 체험).

---

## 2. MyFitnessPal (MFP) — (종합 칼로리 카운터) · iOS·Android·Web
*시장 점유 1위, 가장 큰 식품 DB지만 "유료화 공격성"이 반면교사.*

**핵심기능**
- **2025 Summer Release**: 검색·스캔·음성(speak)을 한 화면에 통합한 로깅 UI. Premium/Premium+는 향상된 AI **Meal Scan**(사진 인식).
- 음성 입력, 바코드 스캔, 실시간 사진으로 매크로/미량영양소 로깅.
- **Premium+ Meal Planner**: 목표·식이선호·가구원수·예산 기반 맞춤 식단 플랜.
- (검색 정보) **2026년 3월 Cal AI 인수** → 사진 기반 로깅을 Premium에 통합.

**우리 앱에 적용할 점 (takeaway)**
- **"검색+바코드+음성+사진을 한 입력창에 통합"하는 단일 로깅 진입점**은 좋은 패턴. 모달 전환 없이 한 곳에서 다 되게 설계.
- 우리 앱은 **계란 제외/고단백이라는 식이선호를 온보딩에서 받아 식단 제안에 반영**(MFP Meal Planner가 dietary preference를 받는 방식과 동일 발상).

**강점**: 가장 방대한 식품/브랜드 DB, 음성·사진·바코드 풀 채널.
**약점/주의** ⚠️: **유료화가 매우 공격적.** 한때 무료였던 **바코드 스캔, 커스텀 매크로 목표, Meal Scan, 음성 로깅, 광고 제거가 전부 Premium 뒤로** 이동. 크라우드소싱 DB라 동일 음식 중복/부정확 항목 많음. → 우리 비영리 앱은 "핵심 기능 유료벽" 패턴을 **따라가지 말 것**.
**수익모델**: Free / **Premium $79.99/년** / **Premium+ $99.99/년**.

---

## 3. Cronometer — (정밀 영양/미량영양소 트래커) · iOS·Android·Web

**핵심기능**
- **미량영양소 84종 + 칼로리**(영양소/화합물 최대 95종) 추적. 특정 비타민, 미량 미네랄(셀레늄·아연), 개별 아미노산(류신·발린)까지.
- **검증된 DB**: 사용자 무검증 제출이 아니라 **USDA FoodData Central, NCCDB, NCC** 등 큐레이션·검증된 출처 기반(약 110만 식품).
- **Nutrient Summary 뷰**: 하루 섭취가 모든 영양소 목표 대비 어디까지 찼는지 한눈에(B12·철은 충족, 마그네슘·칼륨 부족 식으로).

**우리 앱에 적용할 점 (takeaway)** ⭐
- **계란 제외 식단의 최대 리스크 = 특정 미량영양소 결핍 모니터링.** Cronometer식 "목표 대비 달성률 바(bar)" UI를 차용해 **단백질·철·비타민D/B12 등 핵심 영양소 게이지**를 보여주면, 계란 빼고도 균형을 잡게 도와줄 수 있다.
- 데이터 신뢰가 핵심인 우리 앱(메모리상 "적대적 데이터 무결성" 원칙)과 철학이 맞음 → **검증된 출처 우선** 채택.

**강점**: 업계 최고 정확도/검증 기준, 무료 티어가 넉넉(무제한 로깅+풀 미량영양소+Nutrient Summary).
**약점/주의**: 깊이가 깊어 초보에겐 정보 과부하 가능. DB가 미국/일반 식품 중심이라 **한식 가공/외식 항목은 상대적으로 약함**[추정].
**수익모델**: 무료 / **Gold $8.99/월 또는 $35.99/년**(광고제거·커스텀 목표·트렌드 차트·Oracle AI 제안·혈당 분석·내보내기).

---

## 4. Lose It! — (게이미피케이션 칼로리 카운터) · iOS·Android

**핵심기능**
- **Snap It**(Premium): 식사 사진 인식. 최신 모델은 개별 재료가 아니라 "완성된 요리(complete dish)" 단위 인식 → 외식 로깅 정확도 개선. 단, 카테고리 인식 ~70%, **분량 추정은 부정확**.
- **Say It**: 음성으로 식사 서술("스크램블에그 2개, 버터 토스트 한 장, 블랙커피")하면 항목별 자동 로깅.
- 무료 티어가 관대(무제한 로깅·매크로·2,700만 식품 DB).

**우리 앱에 적용할 점 (takeaway)**
- **음성 자연어 로깅(Say It)**은 PC/모바일 웹에서도 구현 가능하고 입력 마찰을 크게 줄임 → 도입 검토 가치 높음.
- **사진 인식은 "분량 추정이 약점"이라는 한계를 UX로 보완**: 인식 후 분량(g/인분)을 슬라이더로 빠르게 보정하는 단계를 반드시 넣어라.

**강점**: 관대한 무료 DB, 게이미피케이션(동기부여), 음성/사진 입력.
**약점/주의** ⚠️: **신규 계정은 바코드 스캐너가 Premium으로 이동**(과거 무료 → 다운그레이드). 사진 분량 추정 신뢰도 낮음.
**수익모델**: Free / **Premium $9.99/월 또는 $39.99/년**.

---

## 5. FatSecret (글로벌 + FatSecret Korea) — (칼로리 카운터 + B2B 데이터 플랫폼) · iOS·Android·Web·API

**핵심기능**
- 소비자 앱: 한식 칼로리/영양정보 한국어 제공(fatsecret.kr), iOS·Android.
- **FatSecret Platform API**(개발자용): **230만+ 검증 식품, 58개국·26개 언어**, 칼로리·매크로·미량영양소·**알레르겐/식이선호 태그**·식품 이미지·다중 분량 옵션. **바코드(UPC/EAN) 커버리지 90%+**. 35,000+ 개발자, 월 7억+ 호출.

**우리 앱에 적용할 점 (takeaway)** ⭐ (데이터 백엔드 후보)
- **단일 JSX/React 앱의 식품 DB 백엔드로 FatSecret Platform API가 유력 후보.** 바코드·다중 분량·**알레르겐 태그(계란 자동 필터링에 직접 활용)**까지 한 번에 해결.
- 단, **소비자 앱의 크라우드소싱 DB는 정확도 편차 큼**(공통 음식 칼로리 15~30% 편차, 하루 300~500kcal 오차 가능) → 우리는 **Platform API의 "verified" 데이터를 쓰되 한식은 아래 MFDS 공공DB로 교차검증**.

**강점**: 글로벌 최대급 검증 DB + 한국어 서비스 동시 보유, 우수한 바코드 커버리지, 알레르겐/식이 태그.
**약점/주의**: 소비자 앱 DB 품질 편차(사용자 편집 허용). Platform API는 상용/유료(에디션별 과금)[추정: 무료 Basic + 유료 Premier].
**수익모델**: 소비자 앱 프리미엄 + **B2B 플랫폼 API 라이선스**(이중 구조).

---

## 6. 한국 음식 DB 군 (한식 정확도 핵심)

### 6-A. 다이어트카메라 AI (Doinglab / FoodLens) · iOS·Android
**핵심기능**: 사진 한 장으로 AI 음식 인식, **한 번에 수십 개 멀티 인식**. **FoodLens** 엔진. 칼로리+탄단지·나트륨·식이섬유 등 16종+ 영양 자동 분석. 1주~1년 변화추이 그래프/식사패턴 리포트.
**takeaway** ⭐: **한식 인식률이 강점**("된장찌개·김치찌개·반찬류 구분 잘함" 리뷰). 글로벌 AI(Cal AI 등)가 약한 영역 → 한식 사진 로깅이 필요하면 **FoodLens 같은 한국 특화 엔진/API 연동**이 글로벌 엔진보다 유리.
**강점**: 한식 특화 인식, 무료 핵심 기능, 멀티 인식. **약점/주의**: 사진 인식 공통 한계(분량 추정·복합요리)[추정]. Google Play 4.2★(4,240리뷰). **수익모델**: 무료 기반 + B2B FoodLens API[추정].

### 6-B. 인아웃(InOut) · iOS·Android
**핵심기능**: 음식 자동 칼로리/매크로 계산, BMR·권장칼로리 자동 산출, **식단타입 선택(일반/운동/키토/비건)별 매크로 비율**. AI 코치 'Mallang'(체형·목표 기억, 주간 AI 리포트). 2,000+ 운동 부위·기구별 검색, Apple Watch 연동, **단식(간헐적) 타이머**, 게이미피케이션(애플 포인트·미션), 광고 없음.
**takeaway** ⭐: **한국 사용자 눈높이의 "올인원 코치" UX 레퍼런스.** 우리 요구기능과 거의 1:1 매핑(식단+운동+체중+AI코치+타이머). 특히 **목표 기반 매크로 비율 프리셋**과 **주간 AI 리포트** 패턴을 벤치마크. 우리는 여기에 "계란 제외/무릎 보호" 특화를 더하면 차별화.
**강점**: 한국형 통합 UX, 무광고, 워치 연동, 커뮤니티. **약점/주의**: 글로벌 대비 식품 검증·미량영양소 깊이는 약할 수 있음[추정]. **수익모델**: 프리미엄 구독[추정].

### 6-C. 식약처 식품영양성분 통합DB (MFDS Open API) · 공공데이터
**핵심기능**: 식약처+교육부/농식품부/해수부 협업으로 구축한 **통합 영양성분 DB**. **약 92,000건**(원재료 3,600 · 가공식품 76,000 · **음식(요리) 12,200**). 식품명/분류/코드/에너지/탄단지·영양성분/제조사/원산지 등. data.go.kr 및 foodsafetykorea.go.kr **Open API 무료 제공**, "건강관리 앱/웹 개발 지원" 명시.
**takeaway** ⭐ (데이터 무결성 핵심): **한식·외식·가공식품의 정부 검증 기준값 소스.** 비영리 앱이므로 **무료 공공 API를 1차 한식 소스로, FatSecret을 글로벌/바코드 보강, 그리고 교차검증 레이어**로 쌓는 하이브리드 DB 전략이 최적(메모리상 "적대적 데이터 무결성" 원칙과 합치).
**강점**: 정부 검증·무료·한식 요리 12,200건 포함. **약점/주의**: 외식 프랜차이즈/신상품 커버리지 한계, 분량 표준화 작업 필요. **수익모델**: 무료(공공).

---

## (참고) AI 사진 인식 정확도 — 도입 시 기대치 설정용
- **SnapCalorie**: LiDAR(깊이센서) 부피 측정, **평균 오차 ~16%**(발표 데이터).
- **Cal AI**(2025 화제, 10대가 개발·100만+ 다운로드, MFP가 인수 정보): 단순/명확 음식 **85~92%**, 바코드는 거의 완벽. **복합·혼합요리(볶음·부리토·카레+밥)에서 크게 흔들림.**
- 업계 공통: 단일 인식 음식 **±10~15%**, 복합요리 **±25~35%** 오차.
- **결론(우리 앱)**: 사진 인식은 "빠른 1차 추정 + 사용자 분량 보정" 보조 수단으로만. **고단백 목표 정밀 추적은 검색/바코드/직접입력이 신뢰축.**

---

## 이 카테고리 핵심 교훈 3가지

1. **로깅은 "마찰 최소화", 정확도는 "검증 DB + 적응형 칼로리"로 분리 공략.**
   입력은 MFP·Lose It!식 단일 진입점(검색+바코드+음성+사진 보정)으로 마찰을 없애고, 신뢰는 Cronometer·MFDS식 검증 DB로 확보. 우리 데이터 전략은 **MFDS 공공API(한식·무료) + FatSecret Platform(글로벌·바코드·알레르겐) 하이브리드 + 교차검증**이 비영리·데이터무결성 원칙에 최적.

2. **30kg 감량 사용자에겐 "적응형 TDEE + Trend Weight"가 단일 최고 기능.**
   고정 칼로리는 대사 적응으로 정체기를 부른다. MacroFactor처럼 **매주 체중 추이로 소비칼로리 역산→다음 목표 자동 갱신**, 일일 변동은 추세체중으로 평활화, 그리고 **"비난하지 않는" 톤**으로 초보의 꾸준한 로깅을 유지(요구 ⑤ 점진적 과부하의 식단 버전).

3. **"계란 제외 고단백"은 두 가지로 구현 — 단백질 우선 시각화 + 미량영양소 안전망.**
   매크로 중 **단백질을 최상단/우선 게이지**로 노출(MacroFactor 단백질 분배 + Cronometer 영양소 달성 바), **알레르겐 태그(FatSecret)로 계란 함유 식품 자동 필터**, 계란 제외로 생길 수 있는 비타민D/B12·콜린 등 결핍을 **목표 대비 달성률 UI**로 모니터링. 한식 사진 로깅이 필요하면 글로벌 AI보다 **FoodLens 같은 한국 특화 엔진**이 정확.

---
### Sources
- MacroFactor: [adaptive algorithm](https://macrofactorapp.com/algorithm-accuracy/), [AI food logging](https://macrofactor.com/ai-food-logging/), [program styles](https://help.macrofactorapp.com/en/articles/91-program-styles), [food logger](https://macrofactor.com/new-food-logger/), [review $72/yr](https://www.trygaya.com/review/macrofactor-review)
- MyFitnessPal: [2025 Summer Release](https://www.prnewswire.com/news-releases/myfitnesspal-announces-its-2025-summer-release-302536319.html), [membership tiers](https://blog.myfitnesspal.com/myfitnesspal-membership-pricing-tiers/), [Meal Scan FAQ](https://support.myfitnesspal.com/hc/en-us/articles/360045761612-Meal-Scan-FAQ)
- Cronometer: [features](https://cronometer.com/features/index.html), [review 2025](https://repreturn.com/cronometer-review/), [nutrient targets](https://support.cronometer.com/hc/en-us/articles/360060170532-Nutrient-Targets)
- Lose It!: [pricing 2026](https://nutriscan.app/blog/posts/lose-it-pricing-2026-free-vs-premium-2b4e921555), [free vs premium](https://www.snapcalorie.com/blog/lose-it-free-vs-premium-differences-what-you-need-to-know.html)
- FatSecret: [Platform API](https://platform.fatsecret.com/platform-api), [FatSecret Korea](https://www.fatsecret.kr/), [accuracy note](https://www.nutrola.app/en/blog/what-is-the-most-accurate-calorie-counting-app)
- 한국 DB: [다이어트카메라/FoodLens](https://dietcamera.doinglab.com/), [인아웃](https://www.inout.team/), [MFDS 식품영양성분DB Open API](https://www.data.go.kr/data/15127578/openapi.do), [식약처 통합DB](https://various.foodsafetykorea.go.kr/nutrient/industry/openApi/info.do)
- AI 정확도: [Cal AI/SnapCalorie 정확도](https://www.getkalohealth.com/blog/how-accurate-are-ai-calorie-counters), [Cal AI TechCrunch](https://techcrunch.com/2025/03/16/photo-calorie-app-cal-ai-downloaded-over-a-million-times-was-built-by-two-teenagers/)