// ===== User =====
export type UserRole = 'STUDENT' | 'STAFF' | 'MANAGER' | 'TA' | 'ADMIN';

export interface RoleOption {
  code: UserRole;
  displayName: string;
}

export interface User {
  userId: number;
  name: string;
  email: string;
  phoneNumber: string | null;
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

// ===== Document Category =====
export type DocumentCategoryCode = 'WORK' | 'INQUIRY' | 'SOLUTION' | 'TASK' | 'STORAGE' | 'EQUIPMENT';

export type DocumentCategoryLabel = '업무' | '민원' | '해결 방법' | '작업' | '창고' | '장비';

export const DOCUMENT_CATEGORY_MAP: Record<DocumentCategoryCode, DocumentCategoryLabel> = {
  WORK: '업무',
  INQUIRY: '민원',
  SOLUTION: '해결 방법',
  TASK: '작업',
  STORAGE: '창고',
  EQUIPMENT: '장비',
};

export const DOCUMENT_CATEGORIES: { code: DocumentCategoryCode; label: DocumentCategoryLabel }[] = [
  { code: 'WORK', label: '업무' },
  { code: 'INQUIRY', label: '민원' },
  { code: 'SOLUTION', label: '해결 방법' },
  { code: 'TASK', label: '작업' },
  { code: 'STORAGE', label: '창고' },
  { code: 'EQUIPMENT', label: '장비' },
];

// ===== Document =====
export interface Document {
  id: number;
  title: string;
  content: string;
  categoryCode: DocumentCategoryCode;
  categoryName: DocumentCategoryLabel;
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
  categoryCode: DocumentCategoryCode;
  categoryName: DocumentCategoryLabel;
  authorName: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentCreateRequest {
  title: string;
  content: string;
  categoryCode: DocumentCategoryCode;
}

export interface DocumentUpdateRequest {
  title: string;
  content: string;
  categoryCode: DocumentCategoryCode;
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

export type InquiryStatusEnum = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'OVERNIGHT';

export interface InquiryStatusOption {
  code: InquiryStatusEnum;
  displayName: string;
}

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

export type InquiryStatusLabel = '시작 전' | '진행 중' | '완료' | '보류' | '야간';

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
  OVERNIGHT: '야간',
};

export const INQUIRY_STATUS_REVERSE_MAP: Record<InquiryStatusLabel, InquiryStatusEnum> = {
  '시작 전': 'PENDING',
  '진행 중': 'IN_PROGRESS',
  '완료': 'COMPLETED',
  '보류': 'ON_HOLD',
  '야간': 'OVERNIGHT',
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

// ===== Building (위치) =====
export type BuildingCode =
  | 'HEUNGHAK'
  | 'HOCHEON'
  | 'SEJONG'
  | 'SEOIL'
  | 'JIDEOK'
  | 'NURI'
  | 'LIBRARY'
  | 'BAEYANG'
  | 'CLUB'
  | 'CAFETERIA'
  | 'FRONT_GATE'
  | 'BACK_GATE'
  | 'SANGHAK';

export type BuildingLabel =
  | '흥학관'
  | '호천관'
  | '세종관'
  | '서일관'
  | '지덕관'
  | '누리관'
  | '도서관'
  | '배양관'
  | '동아리관'
  | '학생식당'
  | '정문'
  | '후문'
  | '산학관';

export const BUILDING_MAP: Record<BuildingCode, BuildingLabel> = {
  HEUNGHAK: '흥학관',
  HOCHEON: '호천관',
  SEJONG: '세종관',
  SEOIL: '서일관',
  JIDEOK: '지덕관',
  NURI: '누리관',
  LIBRARY: '도서관',
  BAEYANG: '배양관',
  CLUB: '동아리관',
  CAFETERIA: '학생식당',
  FRONT_GATE: '정문',
  BACK_GATE: '후문',
  SANGHAK: '산학관',
};

export const BUILDING_REVERSE_MAP: Record<BuildingLabel, BuildingCode> = {
  '흥학관': 'HEUNGHAK',
  '호천관': 'HOCHEON',
  '세종관': 'SEJONG',
  '서일관': 'SEOIL',
  '지덕관': 'JIDEOK',
  '누리관': 'NURI',
  '도서관': 'LIBRARY',
  '배양관': 'BAEYANG',
  '동아리관': 'CLUB',
  '학생식당': 'CAFETERIA',
  '정문': 'FRONT_GATE',
  '후문': 'BACK_GATE',
  '산학관': 'SANGHAK',
};

export const BUILDINGS: { code: BuildingCode; label: BuildingLabel }[] = [
  { code: 'HEUNGHAK', label: '흥학관' },
  { code: 'HOCHEON', label: '호천관' },
  { code: 'SEJONG', label: '세종관' },
  { code: 'SEOIL', label: '서일관' },
  { code: 'JIDEOK', label: '지덕관' },
  { code: 'NURI', label: '누리관' },
  { code: 'LIBRARY', label: '도서관' },
  { code: 'BAEYANG', label: '배양관' },
  { code: 'CLUB', label: '동아리관' },
  { code: 'CAFETERIA', label: '학생식당' },
  { code: 'FRONT_GATE', label: '정문' },
  { code: 'BACK_GATE', label: '후문' },
  { code: 'SANGHAK', label: '산학관' },
];

export interface LocationResponse {
  buildingCode: BuildingCode;
  buildingName: string;
  roomNumber: number | null;
  roomName: string | null;
  formatted: string;
}

export interface LocationRequest {
  building: BuildingCode;
  roomNumber?: number;
  roomName?: string;
}

// 백엔드 응답 타입
export interface Inquiry {
  id: number;
  title: string;
  type: InquiryTypeEnum;
  status: InquiryStatusEnum;
  workerId: number | null;
  workerName: string | null;
  subWorkerId: number | null;
  subWorkerName: string | null;
  method: InquiryMethodEnum | null;
  description: string;
  solution: string;
  requester: string;
  locations: LocationResponse[];
  createdAt: string;
  completedAt: string | null;
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
  locations?: LocationRequest[];
  status?: InquiryStatusEnum;
  workerId?: number;
  subWorkerId?: number;
  method?: InquiryMethodEnum;
  solution?: string;
}

export interface InquiryUpdateRequest {
  title?: string;
  type?: InquiryTypeEnum;
  status?: InquiryStatusEnum;
  workerId?: number;
  subWorkerId?: number;
  method?: InquiryMethodEnum;
  description?: string;
  solution?: string;
  requester?: string;
  locations?: LocationRequest[];
}

// ===== Wiki Context =====
export interface WikiContextType {
  isAuthenticated: boolean;
  currentUser: User | null;
  loading: boolean;
  sessionExpired: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  documents: DocumentSummary[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  getDocument: (id: number) => Promise<Document | null>;
  createDocument: (title: string, content: string, categoryCode: DocumentCategoryCode) => Promise<number>;
  updateDocument: (id: number, title: string, content: string, categoryCode: DocumentCategoryCode) => Promise<void>;
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
  deleteInquiry: (id: number) => Promise<void>;
  fetchInquiries: () => Promise<void>;
  staffUsers: StaffUser[];
  fetchStaffUsers: () => Promise<void>;
  roleOptions: RoleOption[];
  getRoleLabel: (code: UserRole) => string;
}

// ===== Admin =====
export interface AdminUser {
  id: number;
  email: string;
  name: string;
  phoneNumber: string | null;
  role: UserRole;
  active: boolean;
  approved: boolean;
  createdAt: string;
  modifiedAt: string;
}

export interface AdminUserStats {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  staffCount: number;
  adminCount: number;
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
