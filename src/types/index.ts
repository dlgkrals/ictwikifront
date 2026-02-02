// ===== User =====
export type UserRole = 'STUDENT' | 'STAFF' | 'ADMIN';

export interface User {
  userId: number;
  name: string;
  email: string;
  studentId: string;
  department: string;
  role: UserRole;
}

export interface StaffUser {
  id: number;
  name: string;
  email: string;
}

export interface LoginResponse {
  name: string;
  email: string;
  role: UserRole;
}

// ===== Document =====
export interface Document {
  id: number;
  title: string;
  content: string;
  viewCount: number;
  version: number;
  deleted: boolean;
  authorId: number;
  authorName: string;
  authorEmail: string;
  lastEditorId: number | null;
  lastEditorName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentSummary {
  id: number;
  title: string;
  authorName: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentCreateRequest {
  title: string;
  content: string;
}

export interface DocumentUpdateRequest {
  title: string;
  content: string;
}

// ===== Notice =====
export interface Notice {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  modifiedAt: string;
  createdBy: string;
  modifiedBy: string;
}

export interface NoticeSummary {
  id: number;
  title: string;
  createdAt: string;
}

export interface NoticeFormData {
  title: string;
  content: string;
}

// ===== Inquiry =====
// 백엔드 Enum 값
export type InquiryTypeEnum =
  | 'PC'
  | 'NETWORK'
  | 'SOFTWARE'
  | 'MULTIFUNCTION'
  | 'PRINTER'
  | 'PODIUM'
  | 'PROJECTOR'
  | 'PERIPHERAL';

export type InquiryStatusEnum = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';

export type InquiryMethodEnum = 'REMOTE' | 'ON_SITE';

// 한글 표시용 (UI)
export type InquiryTypeLabel =
  | 'PC'
  | '네트워크'
  | '소프트웨어'
  | '복합기'
  | '프린터'
  | '전자교탁'
  | '빔프로젝터'
  | '주변기기';

export type InquiryStatusLabel = '시작 전' | '진행 중' | '완료' | '보류';

export type InquiryMethodLabel = '원격' | '방문' | '';

// Enum 매핑
export const INQUIRY_TYPE_MAP: Record<InquiryTypeEnum, InquiryTypeLabel> = {
  PC: 'PC',
  NETWORK: '네트워크',
  SOFTWARE: '소프트웨어',
  MULTIFUNCTION: '복합기',
  PRINTER: '프린터',
  PODIUM: '전자교탁',
  PROJECTOR: '빔프로젝터',
  PERIPHERAL: '주변기기',
};

export const INQUIRY_TYPE_REVERSE_MAP: Record<InquiryTypeLabel, InquiryTypeEnum> = {
  'PC': 'PC',
  '네트워크': 'NETWORK',
  '소프트웨어': 'SOFTWARE',
  '복합기': 'MULTIFUNCTION',
  '프린터': 'PRINTER',
  '전자교탁': 'PODIUM',
  '빔프로젝터': 'PROJECTOR',
  '주변기기': 'PERIPHERAL',
};

export const INQUIRY_STATUS_MAP: Record<InquiryStatusEnum, InquiryStatusLabel> = {
  PENDING: '시작 전',
  IN_PROGRESS: '진행 중',
  COMPLETED: '완료',
  ON_HOLD: '보류',
};

export const INQUIRY_STATUS_REVERSE_MAP: Record<InquiryStatusLabel, InquiryStatusEnum> = {
  '시작 전': 'PENDING',
  '진행 중': 'IN_PROGRESS',
  '완료': 'COMPLETED',
  '보류': 'ON_HOLD',
};

export const INQUIRY_METHOD_MAP: Record<InquiryMethodEnum, InquiryMethodLabel> = {
  REMOTE: '원격',
  ON_SITE: '방문',
};

export const INQUIRY_METHOD_REVERSE_MAP: Record<string, InquiryMethodEnum | null> = {
  '원격': 'REMOTE',
  '방문': 'ON_SITE',
  '': null,
};

// 백엔드 응답 타입
export interface Inquiry {
  id: number;
  title: string;
  type: InquiryTypeEnum;
  status: InquiryStatusEnum;
  workerId: number | null;
  workerName: string | null;
  workDate: string | null;
  method: InquiryMethodEnum | null;
  description: string;
  solution: string;
  requester: string;
  createdAt: string;
  modifiedAt: string;
  createdBy: string;
  modifiedBy: string;
}

// UI용 변환된 타입
export interface InquiryDisplay {
  id: number;
  title: string;
  type: InquiryTypeLabel;
  status: InquiryStatusLabel;
  workerName: string;
  workDate: string;
  method: InquiryMethodLabel;
  description: string;
  solution: string;
  requester: string;
  createdAt: string;
}

export interface InquiryFormData {
  title: string;
  type: InquiryTypeLabel;
  status: InquiryStatusLabel;
  worker: string;
  workDate: string;
  method: InquiryMethodLabel;
  description: string;
  solution: string;
  requester: string;
}

export interface InquiryCreateRequest {
  title: string;
  type: InquiryTypeEnum;
  description: string;
  requester: string;
  status?: InquiryStatusEnum;
  workerId?: number;
  workDate?: string;
  method?: InquiryMethodEnum;
  solution?: string;
}

export interface InquiryUpdateRequest {
  title?: string;
  type?: InquiryTypeEnum;
  status?: InquiryStatusEnum;
  workerId?: number;
  workDate?: string;
  method?: InquiryMethodEnum;
  description?: string;
  solution?: string;
  requester?: string;
}

// ===== Wiki Context =====
export interface WikiContextType {
  isAuthenticated: boolean;
  currentUser: User | null;
  loading: boolean;
  useMockData: boolean;
  login: (emailPrefix: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  documents: DocumentSummary[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  getDocument: (id: number) => Promise<Document | null>;
  createDocument: (title: string, content: string) => Promise<number>;
  updateDocument: (id: number, title: string, content: string) => Promise<void>;
  deleteDocument: (id: number) => Promise<void>;
  searchDocuments: (query: string) => Promise<DocumentSummary[]>;
  fetchDocuments: () => Promise<void>;
  notices: NoticeSummary[];
  getNotice: (id: number) => Promise<Notice | null>;
  addNotice: (notice: NoticeFormData) => Promise<void>;
  updateNotice: (id: number, updates: NoticeFormData) => Promise<void>;
  deleteNotice: (id: number) => Promise<void>;
  fetchNotices: () => Promise<void>;
  inquiries: Inquiry[];
  addInquiry: (inquiry: InquiryCreateRequest) => Promise<void>;
  updateInquiry: (id: number, updates: InquiryUpdateRequest) => Promise<void>;
  fetchInquiries: () => Promise<void>;
  staffUsers: StaffUser[];
  fetchStaffUsers: () => Promise<void>;
}

// ===== Table of Contents =====
export interface TocItem {
  title: string;
  level: number;
  id: string;
}

// ===== Section =====
export interface Section {
  title: string;
  level: number;
  content: string[];
  startIndex: number;
  id?: string;
}

// ===== Wiki Link Part =====
export interface WikiLinkPart {
  type: 'link';
  display: string;
  target: string;
}

export interface WikiTextPart {
  type: 'text';
  content: string;
}

export type WikiPart = WikiLinkPart | WikiTextPart;

// ===== Filter =====
export interface InquiryFilters {
  status: InquiryStatusLabel | '전체';
  type: InquiryTypeLabel | '전체';
  worker: string;
  method: InquiryMethodLabel | '전체';
}

// ===== Helper Functions =====
export function toInquiryDisplay(inquiry: Inquiry): InquiryDisplay {
  return {
    id: inquiry.id,
    title: inquiry.title,
    type: INQUIRY_TYPE_MAP[inquiry.type],
    status: INQUIRY_STATUS_MAP[inquiry.status],
    workerName: inquiry.workerName || '',
    workDate: inquiry.workDate || '',
    method: inquiry.method ? INQUIRY_METHOD_MAP[inquiry.method] : '',
    description: inquiry.description,
    solution: inquiry.solution || '',
    requester: inquiry.requester,
    createdAt: inquiry.createdAt,
  };
}
