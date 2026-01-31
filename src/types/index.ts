// Document
export interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// Notice
export interface Notice {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoticeFormData {
  title: string;
  content: string;
}

// Inquiry
export type InquiryType =
  | 'PC'
  | '네트워크'
  | '소프트웨어'
  | '복합기'
  | '프린터'
  | '전자교탁'
  | '빔프로젝터'
  | '주변기기';

export type InquiryStatus = '시작 전' | '진행 중' | '완료' | '보류';

export type InquiryMethod = '원격' | '방문' | '';

export interface Inquiry {
  id: number;
  title: string;
  type: InquiryType;
  status: InquiryStatus;
  worker: string;
  workDate: string;
  method: InquiryMethod;
  description: string;
  solution: string;
  requester: string;
  createdAt: string;
}

export interface InquiryFormData {
  title: string;
  type: InquiryType;
  status: InquiryStatus;
  worker: string;
  workDate: string;
  method: InquiryMethod;
  description: string;
  solution: string;
  requester: string;
}

// Wiki Context
export interface WikiContextType {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  documents: Document[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  getDocument: (id: string) => Document | undefined;
  createDocument: (title: string, content: string) => string;
  updateDocument: (id: string, title: string, content: string) => void;
  deleteDocument: (id: string) => void;
  searchDocuments: (query: string) => Document[];
  notices: Notice[];
  getNotice: (id: number) => Notice | undefined;
  addNotice: (notice: NoticeFormData) => void;
  updateNotice: (id: number, updates: Partial<Notice>) => void;
  deleteNotice: (id: number) => void;
  inquiries: Inquiry[];
  addInquiry: (inquiry: InquiryFormData) => void;
  updateInquiry: (id: number, updates: Partial<Inquiry>) => void;
}

// Table of Contents
export interface TocItem {
  title: string;
  level: number;
  id: string;
}

// Section
export interface Section {
  title: string;
  level: number;
  content: string[];
  startIndex: number;
  id?: string;
}

// Wiki Link Part
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

// Filter
export interface InquiryFilters {
  status: InquiryStatus | '전체';
  type: InquiryType | '전체';
  worker: string;
  method: InquiryMethod | '전체';
}
