import { createContext, useContext, useState, type ReactNode } from 'react';
import { initialDocuments } from '../data/initialDocuments';
import type {
  Document,
  Notice,
  NoticeFormData,
  Inquiry,
  InquiryFormData,
  WikiContextType,
  InquiryType,
  InquiryStatus,
  InquiryMethod,
} from '../types';

const WikiContext = createContext<WikiContextType | null>(null);

const initialNotices: Notice[] = [
  {
    id: 1,
    title: '위키 사이트 오픈 안내',
    content: `ICT 위키 사이트가 정식 오픈되었습니다.

## 주요 기능
- **문서 관리**: 기술 문서 작성, 수정, 삭제
- **민원 처리**: IT 관련 민원 접수 및 처리 현황 확인
- **검색 기능**: 문서 제목 및 내용 검색

## 이용 안내
1. 상단 검색창에서 원하는 문서를 검색할 수 있습니다.
2. 새 문서 버튼을 통해 문서를 작성할 수 있습니다.
3. 민원은 메인 페이지 또는 민원 페이지에서 등록할 수 있습니다.

문의사항은 ICT팀으로 연락 바랍니다.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    title: '시스템 점검 안내 (1/30)',
    content: `## 점검 일시
2025년 1월 30일 (목) 22:00 ~ 24:00

## 점검 내용
- 서버 보안 패치 적용
- 데이터베이스 최적화 작업

## 영향 범위
점검 시간 동안 위키 사이트 접속이 일시적으로 불가능합니다.

양해 부탁드립니다.`,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 3,
    title: '민원 처리 지연 안내',
    content: `현재 민원 요청이 많아 처리가 지연되고 있습니다.

긴급한 건은 내선 **1234**로 연락 바랍니다.

순차적으로 처리하고 있으니 양해 부탁드립니다.`,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

export const INQUIRY_TYPES: InquiryType[] = [
  'PC',
  '네트워크',
  '소프트웨어',
  '복합기',
  '프린터',
  '전자교탁',
  '빔프로젝터',
  '주변기기',
];

export const INQUIRY_STATUS: InquiryStatus[] = ['시작 전', '진행 중', '완료', '보류'];

export const INQUIRY_METHOD: InquiryMethod[] = ['원격', '방문'];

const initialInquiries: Inquiry[] = [
  {
    id: 1,
    title: '문서 작성 관련 문의',
    type: '소프트웨어',
    status: '완료',
    worker: '김기술',
    workDate: '2025-01-24',
    method: '원격',
    description: '문서 작성 버튼이 동작하지 않음',
    solution: '브라우저 캐시 삭제 후 정상 작동',
    requester: '간호학과 조교',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 2,
    title: 'IP 주소 설정 요청',
    type: '네트워크',
    status: '완료',
    worker: '박네트',
    workDate: '2025-01-23',
    method: '방문',
    description: 'IP 주소 없음',
    solution: 'IP 넣어서 해결',
    requester: '간호학과 조교',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 3,
    title: '프린터 용지 걸림',
    type: '프린터',
    status: '진행 중',
    worker: '이하드',
    workDate: '2025-01-25',
    method: '방문',
    description: '프린터에서 용지가 계속 걸림',
    solution: '',
    requester: '컴퓨터공학과 행정실',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 4,
    title: '빔프로젝터 화면 안나옴',
    type: '빔프로젝터',
    status: '시작 전',
    worker: '',
    workDate: '',
    method: '',
    description: '강의실 빔프로젝터 전원은 들어오나 화면 출력 안됨',
    solution: '',
    requester: '경영학과 교수',
    createdAt: new Date().toISOString(),
  },
];

interface WikiProviderProps {
  children: ReactNode;
}

export function WikiProvider({ children }: WikiProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [searchQuery, setSearchQuery] = useState('');
  const [notices, setNotices] = useState<Notice[]>(initialNotices);
  const [inquiries, setInquiries] = useState<Inquiry[]>(initialInquiries);

  const login = () => {
    setIsAuthenticated(true);
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  const getDocument = (id: string): Document | undefined => {
    return documents.find((doc) => doc.id === id);
  };

  const createDocument = (title: string, content: string): string => {
    const id = title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9가-힣-]/g, '');
    const newDoc: Document = {
      id,
      title,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setDocuments((prev) => [...prev, newDoc]);
    return id;
  };

  const updateDocument = (id: string, title: string, content: string): void => {
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === id
          ? { ...doc, title, content, updatedAt: new Date().toISOString() }
          : doc
      )
    );
  };

  const deleteDocument = (id: string): void => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  const searchDocuments = (query: string): Document[] => {
    if (!query.trim()) return documents;
    const lowerQuery = query.toLowerCase();
    return documents.filter(
      (doc) =>
        doc.title.toLowerCase().includes(lowerQuery) ||
        doc.content.toLowerCase().includes(lowerQuery)
    );
  };

  const getNotice = (id: number): Notice | undefined => {
    return notices.find((notice) => notice.id === id);
  };

  const addNotice = (notice: NoticeFormData): void => {
    const newNotice: Notice = {
      id: Date.now(),
      ...notice,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotices((prev) => [newNotice, ...prev]);
  };

  const updateNotice = (id: number, updates: Partial<Notice>): void => {
    setNotices((prev) =>
      prev.map((notice) =>
        notice.id === id
          ? { ...notice, ...updates, updatedAt: new Date().toISOString() }
          : notice
      )
    );
  };

  const deleteNotice = (id: number): void => {
    setNotices((prev) => prev.filter((notice) => notice.id !== id));
  };

  const addInquiry = (inquiry: InquiryFormData): void => {
    const newInquiry: Inquiry = {
      id: Date.now(),
      ...inquiry,
      createdAt: new Date().toISOString(),
    };
    setInquiries((prev) => [newInquiry, ...prev]);
  };

  const updateInquiry = (id: number, updates: Partial<Inquiry>): void => {
    setInquiries((prev) =>
      prev.map((inq) => (inq.id === id ? { ...inq, ...updates } : inq))
    );
  };

  return (
    <WikiContext.Provider
      value={{
        isAuthenticated,
        login,
        logout,
        documents,
        searchQuery,
        setSearchQuery,
        getDocument,
        createDocument,
        updateDocument,
        deleteDocument,
        searchDocuments,
        notices,
        getNotice,
        addNotice,
        updateNotice,
        deleteNotice,
        inquiries,
        addInquiry,
        updateInquiry,
      }}
    >
      {children}
    </WikiContext.Provider>
  );
}

export function useWiki(): WikiContextType {
  const context = useContext(WikiContext);
  if (!context) {
    throw new Error('useWiki must be used within a WikiProvider');
  }
  return context;
}
