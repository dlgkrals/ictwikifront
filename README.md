# ICT Wiki — Frontend

> 프로젝트 전체 소개는 [백엔드 리포지토리](https://github.com/dlgkrals/ictwikiback)를 참고하세요.

---

## 기술 스택

- **React 19** + **TypeScript** + **Vite 7**
- **React Router v7** — SPA 클라이언트 사이드 라우팅
- **Axios** — CSRF 토큰 자동 첨부, 401/403 인터셉터
- **ExcelJS** — 시간표 엑셀 가져오기/내보내기 (브라우저 처리)
- **PWA** (`vite-plugin-pwa`) — 오프라인 캐싱 및 홈 화면 설치
- **HEIC 변환** (`libheif-js`, `heic2any`) — iOS 이미지 업로드 대응

---

## 구조

```
src/
├── api/          # Axios 인스턴스 및 도메인별 API 함수
├── components/   # 공통 컴포넌트 (Header, Sidebar 등)
├── context/      # WikiContext — 인증 상태 및 currentUser 전역 관리
├── pages/        # 페이지 컴포넌트 (라우트 1:1 대응)
├── styles/       # 페이지별 CSS (클래스 접두사로 네임스페이스 분리)
├── types/        # 공유 TypeScript 타입
└── utils/        # 유틸 함수
```

---

## 설계 포인트

### 인증 흐름
세션 쿠키 기반 인증을 사용합니다. `WikiContext`에서 초기 로드 시 `/api/auth/me`를 호출해 `isAuthenticated`와 `currentUser`(역할: ADMIN / TA / STUDENT / STAFF / MANAGER)를 전역 상태로 관리합니다. 401 응답은 Axios 인터셉터가 감지해 로그인 화면으로 전환하고, 403은 `access-denied` 커스텀 이벤트로 `/forbidden` 페이지로 라우팅합니다.

### 역할 기반 접근 제어
페이지 컴포넌트 진입 시 `currentUser.role`을 직접 확인합니다. 별도의 라우트 가드 레이어 없이 각 페이지에서 판단하며, 권한 부족 시 Forbidden 컴포넌트를 반환합니다.

### CSS 네임스페이스
전역 CSS 충돌을 방지하기 위해 페이지별 접두사를 사용합니다 (예: 관리자 페이지 `acp-`, 시간표 페이지 `tt-`). CSS Modules 대신 접두사 컨벤션을 택해 기존 스타일 파일과 일관성을 유지합니다.

### 엑셀 처리 브라우저 이관
백엔드가 GraalVM 환경으로 전환되면서 Apache POI 사용이 불가해졌습니다. 시간표 엑셀 가져오기/내보내기를 ExcelJS 기반으로 프론트엔드에서 처리합니다.
