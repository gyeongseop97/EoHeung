# Samsung Lions Watch Party Manager - Supabase Version

회사 사람들과 삼성 라이온즈 직관 모임을 관리하기 위한 Supabase 연동형 웹앱입니다.

## 1. 구성 파일

```text
index.html                                  # 실제 화면 파일
supabase_schema.sql                         # Supabase DB 테이블/RLS 생성 SQL
supabase/functions/kbo-sync/index.ts        # Supabase Edge Function 보조 동기화
scripts/sync_kbo_schedule.py                # KBO 공식 사이트 연간 일정 수집 후 Supabase 저장
.github/workflows/sync-kbo-schedule.yml     # GitHub Actions 자동 실행 예시
requirements.txt                            # Python 크롤러 의존성
```

## 2. Supabase DB 만들기

1. Supabase 프로젝트 생성
2. Dashboard > SQL Editor > New query
3. `supabase_schema.sql` 전체 붙여넣기 후 실행
4. Authentication > Users에서 사용할 계정을 생성하거나, 앱 첫 화면의 회원가입을 사용

> SQL은 RLS를 활성화하고 `authenticated` 사용자만 읽기/쓰기 가능하게 해 둔 구조입니다.

## 3. index.html 사용하기

1. `index.html`을 브라우저에서 열거나 GitHub Pages에 업로드합니다.
2. Supabase Project URL과 anon public key를 입력합니다.
3. 이메일/비밀번호로 로그인합니다.
4. 회원, 경기, 직관 예정/완료를 관리합니다.

## 4. 경기 일정 자동 동기화 권장 구조

KBO 공식 한국어 일정 페이지는 동적 페이지입니다. 따라서 안정적인 연간 수집은 브라우저 조작이 가능한 GitHub Actions + Playwright 방식이 가장 현실적입니다.

### GitHub Actions 방식

GitHub 저장소에 이 폴더 구조를 그대로 올린 뒤, Repository Settings > Secrets and variables > Actions에 아래 secrets를 등록합니다.

```text
SUPABASE_URL=본인 Supabase 프로젝트 URL
SUPABASE_SERVICE_ROLE_KEY=Supabase service_role key
```

그 다음 Actions > Sync KBO Schedule to Supabase > Run workflow를 실행합니다.

기본 설정은 2026년 기준입니다. 다른 연도는 workflow_dispatch 입력값으로 변경하면 됩니다.

## 5. Supabase Edge Function 보조 동기화

`supabase/functions/kbo-sync/index.ts`는 보조용입니다. KBO 영문 Daily Schedule 페이지에 현재 노출되는 경기 데이터를 읽어 Supabase에 저장합니다.

배포 예시:

```bash
supabase functions deploy kbo-sync
supabase secrets set SUPABASE_URL="https://xxxx.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

배포 후 앱의 `KBO 일정 동기화 함수 실행` 버튼을 누르면 Edge Function을 호출합니다.

단, 연간 전체 일정/과거 결과까지 안정적으로 채우려면 GitHub Actions 방식이 더 적합합니다.

## 6. 데이터 구조 요약

| 테이블 | 용도 |
|---|---|
| members | 회원 정보 |
| games | 경기 일정/결과 |
| game_members | 경기별 직관 예정/완료 회원 |
| quick_links | 관련 링크 |

## 7. 주의사항

- `anon public key`는 클라이언트에 노출되어도 되는 키입니다.
- `service_role key`는 절대 HTML에 넣으면 안 됩니다. GitHub Actions secrets 또는 Supabase Edge Function secrets에만 저장해야 합니다.
- KBO 공식 사이트 구조가 바뀌면 크롤러 선택자도 수정해야 합니다.

## 8. 시즌 종료와 포스트시즌

대시보드의 **KBO 팀별 순위 추이 왼쪽**에 포스트시즌 대진표가 표시됩니다. 5개 팀의 로고와 정규시즌 순위에서 와일드카드·준플레이오프·플레이오프·한국시리즈로 이어지는 연결선을 따라 각 차전의 날짜·구장·시간·점수와 시리즈 전적을 확인할 수 있습니다. 연도를 바꾸어 지난 시즌도 조회하며, 작은 화면에서는 대진표를 좌우로 이동합니다.

- 정규시즌 종료 후 순위를 고정하고, 포스트시즌 경기는 순위·연승·최근 경기·순위 추이 계산에서 제외합니다.
- 한국시리즈 4승 확정 시 우승 팀을 표시합니다. 모든 라운드 결과가 확인되면 대진표 아래 **시즌 최종 순위 전체보기**에서 포스트시즌을 반영한 전체 최종 순위와 정규시즌 순위를 함께 확인합니다. 정규시즌 승·무·패·승률은 기존 KBO 순위표에 유지됩니다.
- 와일드카드의 상위 팀 어드밴티지, 무승부, 우천 연기/취소와 시리즈 조기 종료 후 미개최 경기를 구분합니다.
- 새 시즌과 다른 연도 경기가 섞이지 않으며, 다년간 DB 결과는 1,000건 단위로 끝까지 읽습니다.

공식 자료는 `scripts/sync_kbo_season.py`가 `data/kbo-seasons/<연도>.json`에 보관합니다. KBO 영문 공식 페이지의 TYPE 셀과 rowspan을 읽으므로 `Playoff final game5`, `Korean Series game1`도 누락하지 않습니다. 종료 시즌은 정규시즌 720경기 결과와 공식 순위표를 검산합니다. 과거 연도 선택에도 현재 순위가 반환되는 경우에는 완전한 720경기 결과로 다시 집계하며, 동률로 공식 순위 판단이 필요하면 잘못된 자료를 덮어쓰지 않고 실패로 보고합니다.

공식 자료는 30분마다 자동 갱신됩니다(GitHub Actions 실행 지연 가능). 수동 갱신은 Actions의 **Update KBO season and postseason → Run workflow → year**에서 실행합니다. 연도를 비우면 현재 한국 날짜의 시즌, 연도를 입력하면 과거 시즌 자료를 저장합니다. 반복 실행은 저장소의 Actions에서 관리합니다. 공개 공식 자료만 읽으므로 Supabase 비밀키는 필요 없습니다. 브라우저는 5분 간격으로 저장된 새 자료를 확인하며 수집 실패 시 마지막 검증 자료를 유지합니다. 기존 Vercel `/data/` GitHub 원본 연결을 그대로 사용하므로 자료만 갱신할 때 사이트를 재빌드할 필요가 없습니다. 기존 Supabase 일정·결과 동기화 주기는 유지되며 DB에 반영된 포스트시즌 결과도 화면에 적용됩니다.

기존 Supabase에는 `supabase/sql/season_postseason.sql`을 한 번 실행하면 경기 구분·라운드·차전 필드가 추가됩니다. 마이그레이션 전에도 공식 시즌 화면은 동작하고, 일정 동기화 및 수동 저장은 기존 source 필드에 구분 정보를 보존해 호환됩니다. 새 설치는 갱신된 `supabase_schema.sql`을 사용합니다.

검증 명령:

```text
node --test tests/kbo-season.test.cjs
python -m unittest discover -s tests -p "test_*.py"
```

테스트용 종료/진행 시즌 자료는 `tests/fixtures/`에 고정하여 실제 경기 결과가 업데이트되어도 검증 기준이 바뀌지 않습니다.

## 9. 화면 구성

`eoheung-layout.css`에서 전체 메뉴의 간격·카드·표·입력창과 화면 크기별 배치를 관리합니다. 기존 기본·그룹웨어·엑셀 테마의 색상은 유지합니다. 대시보드는 요약 지표, 모임 순위, 경기 정보와 KBO 순위표, 포스트시즌과 순위 추이 순서로 표시합니다. `eoheung-layout.js`는 삼성 일정·오늘 경기·어제 결과를 키보드로도 전환할 수 있는 탭으로 묶습니다. 캘린더는 넓은 주 영역에 배치하고, 작은 화면에서는 선택 날짜의 참석 정보를 아래에 표시합니다.

## 10. 선수 기록과 내 직관 기록

선수표의 모든 열은 제목 클릭 또는 Enter/Space로 양방향 정렬합니다. 세부 열이 나중에 추가되어도 현재 열의 위치를 다시 확인하므로 WAR 이후 열도 정확히 정렬됩니다. 빈 값은 양방향 모두 마지막에 둡니다. 비율 지표는 KBO 선수 자료와 같은 시점의 팀 정규시즌 경기 수로 규정 충족 여부를 판단합니다. 규정타석은 팀 경기 수 × 3.1을 반올림하며 144경기에서는 446타석입니다. 시범·포스트시즌은 제외하고, 공식 팀 기록을 읽을 수 없을 때만 중복을 제거한 정규시즌 DB 경기로 계산합니다. 표 위의 스크롤·이동 버튼·지표 선택은 아래 표와 동기화됩니다.

**내 기록**(`/my-records`)은 로그인 계정의 `auth_user_id`와 연결된 회원을 찾으며, 미연동 회원은 중복 없는 이메일 일치로만 연결합니다. 타인의 기록을 기본값으로 대신 표시하지 않습니다. 기존 참석 체크 자료를 사용하므로 추가 DB 테이블은 필요 없습니다. 시즌·월·경기 구분을 바꾸면 완료 직관, 승무패, 평균·누적 득실점, 최고·최저 스코어, 연승·연패, 월별·홈원정·상대 팀별 기록과 날짜별 일지를 함께 다시 계산합니다. 연기·취소·예정 경기는 완료 통계에서 제외하며, 점수가 없는 종료 경기는 득실점 평균의 분모에서 제외합니다. 승률은 승/(승+패)입니다. 일지의 캘린더 버튼은 해당 날짜로 이동합니다. 경기·참석 자료는 1,000건을 넘겨도 끝까지 읽습니다.

추가 회귀 검증: `node --test tests/records.test.cjs`.

## 11. 삼성 라이온즈 테마와 공유 이미지

설정 → 테마의 **삼성 라이온즈**에서 블루 `#074CA1`, 딥블루 `#003B7A`, 화이트, 아이스블루 `#EDF5FF`, 실버 `#C5CED8` 색상칩을 확인하고 선택합니다. `lions-theme.css`는 구단의 청백 색상을 참고한 화면용 팔레트입니다. 선택은 이 브라우저에 저장되며 다른 테마로 되돌릴 수 있습니다.

내 기록 → **이미지로 내보내기**는 선택한 시즌·월·경기 구분의 통계를 1080×1920(세로 9:16) PNG로 만듭니다. 직관 횟수·승률·승무패·득실점·홈런·탈삼진·끝내기·주요 기록과 9개 구단별 상대 전적을 담습니다. 미리본 뒤 PNG를 저장하며 계정 이메일이나 연락처는 포함하지 않습니다. 이미지 생성은 브라우저 안에서 이루어집니다.

**나의 관전 기록**과 **기억에 남는 기록**의 홈런·탈삼진·타자 삼진·허용 홈런·끝내기는 KBO 공식 게임센터의 경기별 기록을 연결합니다. `scripts/sync_kbo_game_details.py`는 선수 이름이나 고정 열 번호에 의존하지 않고 공식 투수 기록의 열 제목으로 합계를 검산합니다. 상대 투수의 피홈런이 삼성의 홈런이며, 삼성 투수의 삼진은 삼성의 탈삼진입니다. 날짜·원정팀·홈팀·시작 시각·최종 점수가 유일하게 일치할 때만 직관 기록에 연결합니다. 끝내기는 9회 이후 마지막 홈 공격 직전 점수와 최종 점수를 검산하며, 판정할 수 없는 경기는 미확인으로 남깁니다. 기록이 확인된 경기 수를 화면과 이미지에 표시하고, 누락을 0으로 대체하지 않습니다.

공개 자료는 `data/kbo-game-details/<연도>.json`에 보관하며 기존 30분 시즌 자동 갱신에 함께 반영됩니다. 지난 기록은 재사용하고 최근 7일과 누락 경기를 다시 확인합니다. 수동 수집: `python scripts/sync_kbo_game_details.py --year 2026`. 2025·2026년 자료를 제공하며 다른 연도의 미수집 기록은 확인 전까지 빈 값으로 표시합니다.
