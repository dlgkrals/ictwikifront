import { createContext, useContext, useState } from 'react';
import { initialDocuments } from '../data/initialDocuments';

const WikiContext = createContext();

const initialNotices = [
  {
    id: 1,
    title: '위키 사이트 오픈 안내',
    content: '위키 사이트가 오픈되었습니다. 많은 이용 부탁드립니다.',
    createdAt: new Date().toISOString(),
  },
];

export const INQUIRY_TYPES = ['PC', '네트워크', '소프트웨어', '복합기', '프린터', '전자교탁', '빔프로젝터', '주변기기'];
export const INQUIRY_STATUS = ['시작 전', '진행 중', '완료', '보류'];
export const INQUIRY_METHOD = ['원격', '방문'];

const initialInquiries = [
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

export function WikiProvider({ children }) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [searchQuery, setSearchQuery] = useState('');
  const [notices, setNotices] = useState(initialNotices);
  const [inquiries, setInquiries] = useState(initialInquiries);

  const getDocument = (id) => {
    return documents.find((doc) => doc.id === id);
  };

  const createDocument = (title, content) => {
    const id = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9가-힣-]/g, '');
    const newDoc = {
      id,
      title,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setDocuments((prev) => [...prev, newDoc]);
    return id;
  };

  const updateDocument = (id, title, content) => {
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === id
          ? { ...doc, title, content, updatedAt: new Date().toISOString() }
          : doc
      )
    );
  };

  const deleteDocument = (id) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  const searchDocuments = (query) => {
    if (!query.trim()) return documents;
    const lowerQuery = query.toLowerCase();
    return documents.filter(
      (doc) =>
        doc.title.toLowerCase().includes(lowerQuery) ||
        doc.content.toLowerCase().includes(lowerQuery)
    );
  };

  const addInquiry = (inquiry) => {
    const newInquiry = {
      id: Date.now(),
      ...inquiry,
      createdAt: new Date().toISOString(),
    };
    setInquiries((prev) => [newInquiry, ...prev]);
  };

  const updateInquiry = (id, updates) => {
    setInquiries((prev) =>
      prev.map((inq) => (inq.id === id ? { ...inq, ...updates } : inq))
    );
  };

  return (
    <WikiContext.Provider
      value={{
        documents,
        searchQuery,
        setSearchQuery,
        getDocument,
        createDocument,
        updateDocument,
        deleteDocument,
        searchDocuments,
        notices,
        inquiries,
        addInquiry,
        updateInquiry,
      }}
    >
      {children}
    </WikiContext.Provider>
  );
}

export function useWiki() {
  const context = useContext(WikiContext);
  if (!context) {
    throw new Error('useWiki must be used within a WikiProvider');
  }
  return context;
}
