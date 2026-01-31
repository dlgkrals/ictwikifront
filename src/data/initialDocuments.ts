import type { Document } from '../types';

export const initialDocuments: Document[] = [
  {
    id: 'test1',
    title: '테스트 문서 1',
    content: `# 테스트 문서 1

이것은 첫 번째 테스트 문서입니다.

## 개요
위키 시스템의 기본 기능을 테스트하기 위한 문서입니다.

## 내용
- 항목 1: 기본 텍스트 표시
- 항목 2: 마크다운 지원 확인
- 항목 3: 문서 구조 테스트

## 참고
이 문서는 디자인 확인 및 기능 테스트 용도로 작성되었습니다.

다른 문서를 원하면 [[여기로|테스트 문서 2]] 이동하세요. 또는 [[테스트 문서 3]]도 확인해보세요.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'test2',
    title: '테스트 문서 2',
    content: `# 테스트 문서 2

두 번째 테스트 문서입니다.

## 기능 설명
이 위키는 다음 기능을 제공합니다:

1. **문서 조회**: 작성된 문서를 열람할 수 있습니다.
2. **문서 검색**: 제목이나 내용으로 문서를 검색할 수 있습니다.
3. **문서 생성**: 새로운 문서를 작성할 수 있습니다.
4. **문서 수정**: 기존 문서를 편집할 수 있습니다.

## 코드 예시
\`\`\`javascript
function hello() {
  console.log("Hello, Wiki!");
}
\`\`\`

## 마무리
테스트가 완료되면 실제 콘텐츠로 교체할 수 있습니다.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'test3',
    title: '테스트 문서 3',
    content: `# 테스트 문서 3

세 번째이자 마지막 테스트 문서입니다.

## 목적
- UI 레이아웃 확인
- 반응형 디자인 테스트
- 사용자 경험 검증

## 상세 내용

### 섹션 A
위키 스타일의 각진 디자인을 적용하여 깔끔한 인터페이스를 제공합니다.

### 섹션 B
사이드바를 통해 문서 목록을 빠르게 탐색할 수 있습니다.

### 섹션 C
검색 기능으로 원하는 문서를 쉽게 찾을 수 있습니다.

## 결론
이 위키 시스템은 기본적인 문서 관리 기능을 모두 갖추고 있습니다.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
