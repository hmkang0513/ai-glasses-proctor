# AI 안경 감독관

수능 감독관이 되어 AI 안경을 비롯한 부정행위 학생을 잡는 웹 픽셀 게임입니다.
2026년 AI 스마트 안경 시험 부정행위 논란(토익·자격시험·대학 논술 적발, 2027 수능 반입 금지)에서 출발했습니다.

## 실행

```bash
cd D:\dev\ai-glasses-proctor
npm install      # 처음 한 번 (pixelfx를 GitHub에서 받으므로 git 필요)
npm run dev      # http://localhost:5180
```

배포용 빌드: `npm run build` → `dist/` 폴더를 아무 정적 호스팅에 올리면 됩니다(상대 경로 빌드).

## 조작

| 키 | 동작 |
|---|---|
| WASD / 방향키 | 걷기 (화면을 클릭하면 마우스가 고정되어 시선을 돌릴 수 있음) |
| E | 화면 가운데 학생 관찰 (얼굴 + 책상 위 손 확대) |
| F | 관찰한 학생 적발 (2.6m 안에서) |
| T | 관찰 중 열화상 (교시당 3회) |
| Tab | CCTV 화면 전환 (학생 클릭으로 표시) |
| Q | 감독 명부 · 감독관 수첩 (←/→ 넘기기) |
| 입실 검사 | 물건 클릭 → 확대경, 1 PASS · 2 HOLD · 3 CHECK |

개발용: 주소 끝에 `#lv=12` 를 붙이면 12번째 감독으로 바로 시작합니다. 콘솔의 `window.__game` 으로 상태를 볼 수 있습니다.

## 한 판의 흐름

입실 검사(2회차부터) → 1교시 국어 → 쉬는 시간 → 2교시 수학 → 감독 결과 보고서

## 폴더

```
src/
  main.ts            장면 전환·게임 루프
  core/              픽셀 그리기, 입력, 난수, 저장
  data/cheats.ts     부정행위 수법 30종 (실제 근거 URL 포함)
  data/levels.ts     회차별 시험실 생성·난이도 곡선
  data/rules.ts      규칙 숫자 (END_WHEN_ALL_CAUGHT 등)
  world/             학생 데이터·행동·스프라이트·안경 디자인
  render/            1인칭 렌더러, 조명(LUT), CCTV, pixelfx 효과
  game/              시작·입실 검사·시험·쉬는 시간·결과 장면
  ui/closeup.ts      관찰 패널
docs/                기획, 작업 기록, 리뷰, 사실 조사
mockup/mockup.html   기획 단계 목업
```

## 사용한 것

- [pixelfx](https://github.com/patch-gg/pixelfx) (MIT, Patch · Hugo Duprez) — 시작 화면 낙엽, CCTV 전환 글리치
- 조명은 [LutLight2D](https://github.com/NullTale/LutLight2D)의 팔레트 램프 원리를 Canvas로 직접 구현
- 그림은 모두 코드로 그린 픽셀
