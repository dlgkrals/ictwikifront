import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authApi, documentApi, inquiryApi, noticeApi } from '../api';
import type {
  Document,
  Notice,
  NoticeFormData,
  Inquiry,
  InquiryCreateRequest,
  InquiryUpdateRequest,
  WikiContextType,
  InquiryTypeLabel,
  InquiryStatusLabel,
  InquiryMethodLabel,
  User,
  StaffUser,
  DocumentSummary,
  NoticeSummary,
  DocumentCategoryCode,
} from '../types';

const WikiContext = createContext<WikiContextType | null>(null);

// UI용 상수 (기존 그대로)
export const INQUIRY_TYPES: InquiryTypeLabel[] = [
  'PC', '네트워크', '소프트웨어', '복합기', '프린터',
  '전자교탁', '빔프로젝터', '주변기기',
];

export const INQUIRY_STATUS: InquiryStatusLabel[] = ['시작 전', '진행 중', '완료', '보류'];

export const INQUIRY_METHOD: InquiryMethodLabel[] = ['원격', '방문'];

interface WikiProviderProps {
  children: ReactNode;
}

export function WikiProvider({ children }: WikiProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // 요약 타입으로 상태 변경
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [notices, setNotices] = useState<NoticeSummary[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);

  const [searchQuery, setSearchQuery] = useState('');

  // 인증 상태 확인
  const checkAuth = useCallback(async () => {
    try {
      const user = await authApi.getCurrentUser();
      setCurrentUser(user);
      setIsAuthenticated(true);
      // 인증 성공 시 데이터도 가져오기
      await Promise.all([fetchDocuments(), fetchNotices(), fetchInquiries()]);
    } catch {
      setCurrentUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      // 앱 시작 시 CSRF 토큰 먼저 취득한 뒤 인증 상태 확인
      try {
        await authApi.fetchCsrfToken();
      } catch {
        // CSRF 토큰 취득 실패 시에도 인증 확인은 계속 진행
      }
      await checkAuth();
    };
    init();
  }, [checkAuth]);

  // 세션 만료 이벤트 처리
  useEffect(() => {
    const handleSessionExpired = () => {
      if (isAuthenticated) {
        setCurrentUser(null);
        setIsAuthenticated(false);
        setDocuments([]);
        setNotices([]);
        setInquiries([]);
        setSessionExpired(true);
      }
    };
    window.addEventListener('session-expired', handleSessionExpired);
    return () => window.removeEventListener('session-expired', handleSessionExpired);
  }, [isAuthenticated]);

  // 로그인
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setSessionExpired(false);
      const response = await authApi.login(email, password);
      setCurrentUser({
        userId: 0,
        name: response.user.name,
        email: response.user.email,
        phoneNumber: null,
        role: response.user.role,
      });
      setIsAuthenticated(true);
      await Promise.all([fetchDocuments(), fetchNotices(), fetchInquiries()]);
      return true;
    } catch (error) {
      const axiosError = error as { response?: { data?: { error?: string } } };
      throw new Error(axiosError.response?.data?.error || '아이디 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  // 로그아웃
  const logout = async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setCurrentUser(null);
      setIsAuthenticated(false);
      setDocuments([]);
      setNotices([]);
      setInquiries([]);
    }
  };

  // ========== Document ==========

  const fetchDocuments = async (): Promise<void> => {
    try {
      const summaries = await documentApi.getAll();
      setDocuments(summaries);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      setDocuments([]);
    }
  };

  const getDocument = async (id: number): Promise<Document | null> => {
    try {
      return await documentApi.getById(id);
    } catch {
      return null;
    }
  };

  const createDocument = async (title: string, content: string, categoryCode: DocumentCategoryCode): Promise<number> => {
    const doc = await documentApi.create({ title, content, categoryCode });
    await fetchDocuments(); // 목록 갱신
    return doc.id;
  };

  const updateDocument = async (id: number, title: string, content: string, categoryCode: DocumentCategoryCode): Promise<void> => {
    await documentApi.update(id, { title, content, categoryCode });
    await fetchDocuments();
  };

  const deleteDocument = async (id: number): Promise<void> => {
    await documentApi.delete(id);
    await fetchDocuments();
  };

  const searchDocuments = async (query: string): Promise<DocumentSummary[]> => {
    if (!query.trim()) return documents;
    try {
      return await documentApi.search(query); // 요약 반환 가정
    } catch {
      return [];
    }
  };

  // ========== Notice ==========

  const fetchNotices = async (): Promise<void> => {
    try {
      const summaries = await noticeApi.getAll();
      setNotices(summaries);
    } catch (error) {
      console.error('Failed to fetch notices:', error);
      setNotices([]);
    }
  };

  const getNotice = async (id: number): Promise<Notice | null> => {
    try {
      return await noticeApi.getById(id);
    } catch {
      return null;
    }
  };

  const addNotice = async (notice: NoticeFormData): Promise<void> => {
    const created = await noticeApi.create(notice);
    setNotices((prev) => [created, ...prev]);
  };

  const updateNotice = async (id: number, updates: NoticeFormData): Promise<void> => {
    const updated = await noticeApi.update(id, updates);
    setNotices((prev) => prev.map((n) => (n.id === id ? updated : n)));
  };

  const deleteNotice = async (id: number): Promise<void> => {
    await noticeApi.delete(id);
    setNotices((prev) => prev.filter((n) => n.id !== id));
  };

  // ========== Inquiry ==========

  const fetchInquiries = async (): Promise<void> => {
    try {
      const list = await inquiryApi.getAll();
      setInquiries(list);
    } catch (error) {
      console.error('Failed to fetch inquiries:', error);
    }
  };

  const addInquiry = async (inquiry: InquiryCreateRequest): Promise<void> => {
    const created = await inquiryApi.create(inquiry);
    setInquiries((prev) => [created, ...prev]);
  };

  const updateInquiry = async (id: number, updates: InquiryUpdateRequest): Promise<void> => {
    const updated = await inquiryApi.update(id, updates);
    setInquiries((prev) => prev.map((inq) => (inq.id === id ? updated : inq)));
  };

  const deleteInquiry = async (id: number): Promise<void> => {
    await inquiryApi.delete(id);
    setInquiries((prev) => prev.filter((inq) => inq.id !== id));
  };

  // ========== Staff Users ==========

  const fetchStaffUsers = useCallback(async (): Promise<void> => {
    try {
      const list = await authApi.getStaffUsers();
      setStaffUsers(list);
    } catch (error) {
      console.error('Failed to fetch staff users:', error);
      setStaffUsers([]);
    }
  }, []);

  return (
      <WikiContext.Provider
          value={{
            isAuthenticated,
            currentUser,
            loading,
            sessionExpired,
            login,
            logout,
            checkAuth,
            documents,
            searchQuery,
            setSearchQuery,
            getDocument,
            createDocument,
            updateDocument,
            deleteDocument,
            searchDocuments,
            fetchDocuments,
            notices,
            getNotice,
            addNotice,
            updateNotice,
            deleteNotice,
            fetchNotices,
            inquiries,
            addInquiry,
            updateInquiry,
            deleteInquiry,
            fetchInquiries,
            staffUsers,
            fetchStaffUsers,
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