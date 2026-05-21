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
