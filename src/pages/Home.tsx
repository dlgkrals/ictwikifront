import { useState, useMemo, useEffect, useRef, useCallback, Fragment, type FormEvent, type MouseEvent } from 'react';
import '../styles/homestyle.css';
import { Link } from 'react-router-dom';
import { LinkItUrl } from 'react-linkify-it';
import { useWiki, INQUIRY_TYPES, INQUIRY_METHOD } from '../context/WikiContext';
import { inquiryApi } from '../api/inquiryApi';
import { documentApi } from '../api/documentApi';
import { ragApi } from '../api/ragApi';
import type { SimilarCaseResult, DocumentSummary } from '../types';
import type {
  Inquiry,
  InquiryCreateRequest,
  InquiryUpdateRequest,
  InquiryStatusEnum,
  InquiryStatusOption,
  InquiryTypeLabel,
  InquiryMethodLabel,
  LocationRequest,
  LocationResponse,
} from '../types';
import {
  INQUIRY_TYPE_MAP,
  INQUIRY_TYPE_REVERSE_MAP,
  INQUIRY_STATUS_MAP,
  INQUIRY_METHOD_MAP,
  INQUIRY_METHOD_REVERSE_MAP,
  BUILDINGS,
  DOCUMENT_CATEGORIES,
  type DocumentCategoryCode,
  type BuildingCode,
} from '../types';
import InquiryForm, {
  emptyForm,
  emptyRoom,
  emptyLocationGroup,
  type InquiryFormData,
  type RoomFormItem,
} from '../components/InquiryForm';

function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const d = new Date(dateString);
  const currentYear = new Date().getFullYear();
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = d.getHours();
  const minute = d.getMinutes().toString().padStart(2, '0');
  if (year === currentYear) {
    return `${month}월 ${day}일 ${hour}시 ${minute}분`;
  }
  return `${year}년 ${month}월 ${day}일 ${hour}시 ${minute}분`;
}

function formatRoomParts(locs: LocationResponse[]): string[] {
  const parts: string[] = [];
  let i = 0;
  while (i < locs.length) {
    const loc = locs[i];
    if (loc.roomNumber != null && !loc.roomName) {
      let j = i + 1;
      while (j < locs.length && locs[j].roomNumber != null && !locs[j].roomName && locs[j].roomNumber === locs[j - 1].roomNumber! + 1) {
        j++;
      }
      if (j - i === 1) {
        parts.push(`${loc.roomNumber}호`);
      } else {
        parts.push(`${loc.roomNumber}~${locs[j - 1].roomNumber}호`);
      }
      i = j;
    } else {
      if (loc.roomNumber != null && loc.roomName) parts.push(`${loc.roomNumber}호 ${loc.roomName}`);
      else if (loc.roomNumber != null) parts.push(`${loc.roomNumber}호`);
      else parts.push(loc.roomName || '');
      i++;
    }
  }
  return parts;
}

function formatLocationGroups(locations: LocationResponse[]): string[] {
  if (locations.length === 0) return [];
  const order: string[] = [];
  const grouped = new Map<string, LocationResponse[]>();
  for (const loc of locations) {
    if (!grouped.has(loc.buildingCode)) {
      order.push(loc.buildingCode);
      grouped.set(loc.buildingCode, []);
    }
    grouped.get(loc.buildingCode)!.push(loc);
  }
  return order.map((code) => {
    const locs = grouped.get(code)!.slice().sort((a, b) => {
      if (a.roomNumber != null && b.roomNumber != null) return a.roomNumber - b.roomNumber;
      if (a.roomNumber != null) return -1;
      if (b.roomNumber != null) return 1;
      return (a.roomName || '').localeCompare(b.roomName || '');
    });
    if (locs.length === 1) return locs[0].formatted;
    const buildingName = locs[0].buildingName;
    return `${buildingName} ${formatRoomParts(locs).join(', ')}`;
  });
}

function getRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds}초 전`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}시간 전`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}일 전`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}달 전`;
  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears}년 전`;
}


const DOC_PAGE_SIZE = 30;

export default function Home() {
  const {
    notices, inquiries,
    addInquiry, updateInquiry, deleteInquiry, fetchInquiries,
    staffUsers, fetchStaffUsers,
    fetchDocuments,
  } = useWiki();

  const [docItems, setDocItems] = useState<DocumentSummary[]>([]);
  const [docNextCursor, setDocNextCursor] = useState<number | null>(null);
  const [docHasNext, setDocHasNext] = useState(true);
  const [docInitialized, setDocInitialized] = useState(false);
  const [docLoadingMore, setDocLoadingMore] = useState(false);
  const docSentinelRef = useRef<HTMLDivElement>(null);
  const docIsLoadingRef = useRef(false);

  const loadDocPage = useCallback(async (cursor: number | null, reset = false) => {
    if (docIsLoadingRef.current) return;
    docIsLoadingRef.current = true;
    setDocLoadingMore(true);
    try {
      const page = await documentApi.getPage(cursor === null ? undefined : cursor, DOC_PAGE_SIZE);
      setDocItems(prev => reset ? page.content : [...prev, ...page.content]);
      setDocNextCursor(page.nextCursor);
      setDocHasNext(page.hasNext);
      setDocInitialized(true);
    } finally {
      docIsLoadingRef.current = false;
      setDocLoadingMore(false);
    }
  }, []);

  useEffect(() => { loadDocPage(null, true); }, [loadDocPage]);

  useEffect(() => {
    if (!docInitialized || !docHasNext) return;
    const sentinel = docSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadDocPage(docNextCursor);
    }, { rootMargin: '200px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [docInitialized, docHasNext, docNextCursor, loadDocPage]);

  const [statusOptions, setStatusOptions] = useState<InquiryStatusOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<InquiryFormData>(emptyForm);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<InquiryFormData>(emptyForm);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategoryCode | null>(null);

  const [ragOpenId, setRagOpenId] = useState<number | null>(null);
  const [ragLoading, setRagLoading] = useState(false);
  const [ragResult, setRagResult] = useState<SimilarCaseResult | null>(null);
  const [ragError, setRagError] = useState<string | null>(null);

  const [trashOpen, setTrashOpen] = useState(false);
  const [deletedDocs, setDeletedDocs] = useState<DocumentSummary[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashActionLoading, setTrashActionLoading] = useState<number | null>(null);
  const [trashMessage, setTrashMessage] = useState<string | null>(null);
  const [restoreConflictId, setRestoreConflictId] = useState<number | null>(null);

  useEffect(() => {
    inquiryApi.getStatusOptions().then(setStatusOptions).catch(() => {});
  }, []);

  useEffect(() => {
    if (showForm || editingId !== null) {
      fetchStaffUsers();
    }
  }, [showForm, editingId, fetchStaffUsers]);

  const recentInquiries = useMemo(() => inquiries.slice(0, 10), [inquiries]);

  const getStatusClass = (status: string): string => {
    const statusLabel = INQUIRY_STATUS_MAP[status as keyof typeof INQUIRY_STATUS_MAP] || status;
    switch (statusLabel) {
      case '시작 전': return 'status-pending';
      case '진행 중': return 'status-progress';
      case '완료': return 'status-done';
      case '보류': return 'status-hold';
      case '야간': return 'status-overnight';
      default: return '';
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim() || !formData.requester.trim()) {
      alert('작업 이름, 증상, 요청자는 필수 항목입니다.');
      return;
    }
    const locations: LocationRequest[] = formData.locations
      .filter((g) => g.buildingCode !== '')
      .flatMap((g) => {
        const validRooms = g.rooms.filter((r) => r.roomNumber || r.roomName);
        if (validRooms.length === 0) return [{ building: g.buildingCode as BuildingCode }];
        return validRooms.map((r) => ({
          building: g.buildingCode as BuildingCode,
          roomNumber: r.roomNumber ? parseInt(r.roomNumber, 10) : undefined,
          roomName: r.roomName || undefined,
        }));
      });
    const request: InquiryCreateRequest = {
      title: formData.title,
      type: INQUIRY_TYPE_REVERSE_MAP[formData.type],
      description: formData.description,
      requester: formData.requester,
      locations: locations.length > 0 ? locations : undefined,
      status: formData.status,
      workerId: formData.workerId || undefined,
      subWorkerId: formData.subWorkerId || undefined,
      method: INQUIRY_METHOD_REVERSE_MAP[formData.method] || undefined,
      solution: formData.solution || undefined,
    };
    await addInquiry(request);
    setFormData(emptyForm);
    setShowForm(false);
  };

  const handleChange = <K extends keyof InquiryFormData>(field: K, value: InquiryFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const startEdit = (inquiry: Inquiry) => {
    setEditingId(inquiry.id);
    setEditData({
      title: inquiry.title,
      type: INQUIRY_TYPE_MAP[inquiry.type],
      description: inquiry.description,
      requester: inquiry.requester,
      locations: (() => {
        if (inquiry.locations.length === 0) return [emptyLocationGroup];
        const order: string[] = [];
        const map = new Map<string, RoomFormItem[]>();
        for (const l of inquiry.locations) {
          if (!map.has(l.buildingCode)) { order.push(l.buildingCode); map.set(l.buildingCode, []); }
          map.get(l.buildingCode)!.push({ roomNumber: l.roomNumber != null ? String(l.roomNumber) : '', roomName: l.roomName || '' });
        }
        return order.map((code) => ({ buildingCode: code as BuildingCode, rooms: map.get(code)! }));
      })(),
      status: inquiry.status,
      workerId: inquiry.workerId,
      subWorkerId: inquiry.subWorkerId,
      method: inquiry.method ? INQUIRY_METHOD_MAP[inquiry.method] : '',
      solution: inquiry.solution || '',
    });
    setExpandedId(inquiry.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData(emptyForm);
  };

  const saveEdit = async () => {
    if (editingId !== null) {
      if (!editData.title.trim() || !editData.description.trim() || !editData.requester.trim()) {
        alert('작업 이름, 증상, 요청자는 필수 항목입니다.');
        return;
      }
      const editLocations: LocationRequest[] = editData.locations
        .filter((g) => g.buildingCode !== '')
        .flatMap((g) => {
          const validRooms = g.rooms.filter((r) => r.roomNumber || r.roomName);
          if (validRooms.length === 0) return [{ building: g.buildingCode as BuildingCode }];
          return validRooms.map((r) => ({
            building: g.buildingCode as BuildingCode,
            roomNumber: r.roomNumber ? parseInt(r.roomNumber, 10) : undefined,
            roomName: r.roomName || undefined,
          }));
        });
      const updates: InquiryUpdateRequest = {
        title: editData.title,
        type: INQUIRY_TYPE_REVERSE_MAP[editData.type],
        description: editData.description,
        requester: editData.requester,
        locations: editLocations,
        status: editData.status,
        workerId: editData.workerId || undefined,
        subWorkerId: editData.subWorkerId || undefined,
        method: INQUIRY_METHOD_REVERSE_MAP[editData.method] || undefined,
        solution: editData.solution || undefined,
      };
      await updateInquiry(editingId, updates);
      setEditingId(null);
      setEditData(emptyForm);
    }
  };

  const handleEditChange = <K extends keyof InquiryFormData>(field: K, value: InquiryFormData[K]) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRowClick = (id: number) => {
    if (editingId && editingId !== id) return;
    if (expandedId === id) {
      setExpandedId(null);
      setRagOpenId(null);
      setRagResult(null);
      setRagError(null);
    } else {
      setExpandedId(id);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('정말로 이 민원을 삭제하시겠습니까?')) {
      await deleteInquiry(id);
      setExpandedId(null);
    }
  };

  const handleComplete = async (id: number, e: MouseEvent) => {
    e.stopPropagation();
    await inquiryApi.complete(id);
    await fetchInquiries();
  };

  const handleOpenTrash = async () => {
    setTrashOpen(true);
    setTrashMessage(null);
    setTrashLoading(true);
    try {
      const data = await documentApi.getDeletedDocuments();
      setDeletedDocs(data);
    } catch {
      setTrashMessage('삭제된 문서 목록을 불러오는데 실패했습니다.');
    } finally {
      setTrashLoading(false);
    }
  };

  const handleRestore = async (docId: number, force = false) => {
    setTrashActionLoading(docId);
    try {
      await documentApi.restore(docId, force);
      setTrashMessage('문서가 복구되었습니다.');
      const [data] = await Promise.all([
        documentApi.getDeletedDocuments(),
        fetchDocuments(),
        loadDocPage(null, true),
      ]);
      setDeletedDocs(data);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setRestoreConflictId(docId);
      } else {
        setTrashMessage('문서 복구에 실패했습니다.');
      }
    } finally {
      setTrashActionLoading(null);
    }
  };

  const handleRagClick = async (inquiryId: number, e: MouseEvent) => {
    e.stopPropagation();
    if (ragOpenId === inquiryId) {
      setRagOpenId(null);
      setRagResult(null);
      setRagError(null);
      return;
    }
    setRagOpenId(inquiryId);
    setRagResult(null);
    setRagError(null);
    setRagLoading(true);
    try {
      const result = await ragApi.getSimilarCases(inquiryId);
      setRagResult(result);
    } catch {
      setRagError('유사 사례를 불러오는데 실패했습니다.');
    } finally {
      setRagLoading(false);
    }
  };

  return (
    <div className="page home-page">
      {restoreConflictId !== null && (
        <div className="admin-modal-overlay" onClick={() => setRestoreConflictId(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>제목 충돌</h3>
            <p className="admin-modal-desc">
              같은 제목의 문서가 이미 존재합니다.<br />
              기존 문서를 삭제하고 복구하시겠습니까?
            </p>
            <div className="admin-modal-actions">
              <button
                className="btn btn-danger"
                onClick={() => {
                  const id = restoreConflictId;
                  setRestoreConflictId(null);
                  handleRestore(id, true);
                }}
              >
                덮어쓰기
              </button>
              <button className="btn btn-secondary" onClick={() => setRestoreConflictId(null)}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {trashOpen && (
        <div className="trash-modal-overlay" onClick={() => setTrashOpen(false)}>
          <div className="trash-modal" onClick={(e) => e.stopPropagation()}>
            <div className="trash-modal-header">
              <h3>삭제된 문서</h3>
              <button className="trash-modal-close" onClick={() => setTrashOpen(false)}>✕</button>
            </div>
            {trashMessage && (
              <p className="trash-modal-message">{trashMessage}</p>
            )}
            {trashLoading ? (
              <p className="trash-modal-empty">불러오는 중...</p>
            ) : deletedDocs.length === 0 ? (
              <p className="trash-modal-empty">삭제된 문서가 없습니다.</p>
            ) : (
              <ul className="trash-doc-list">
                {deletedDocs.map((doc) => (
                  <li key={doc.id} className="trash-doc-item">
                    <div className="trash-doc-info">
                      <span className="trash-doc-title">{doc.title}</span>
                      <span className="trash-doc-meta">{doc.categoryName} · {doc.authorName}</span>
                    </div>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleRestore(doc.id)}
                      disabled={trashActionLoading === doc.id}
                    >
                      {trashActionLoading === doc.id ? '복구 중...' : '복구'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="home-grid">
        <div className="home-left">
          <div className="home-card notice-section">
            <div className="home-card-header">
              <div className="home-card-title-group">
                <span className="home-card-accent notice-accent" />
                <h2 className="home-card-title">공지사항</h2>
              </div>
              <Link to="/notices" className="home-card-more">더보기 ›</Link>
            </div>
            <ul className="home-notice-list">
              {notices.slice(0, 3).map((notice) => (
                <li key={notice.id} className="home-notice-item">
                  <Link to={`/notices/${notice.id}`} className="home-notice-link">
                    <div className="home-notice-left">
                      <span className="home-notice-badge">공지</span>
                      <span className="home-notice-title">{notice.title}</span>
                    </div>
                    <span className="home-notice-date">{getRelativeTime(notice.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="home-card inquiry-section">
            <div className="home-card-header">
              <div className="home-card-title-group">
                <span className="home-card-accent inquiry-accent" />
                <h2 className="home-card-title">최근 민원</h2>
              </div>
              <div className="inquiry-header-actions">
                <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
                  {showForm ? '취소' : '새 요청'}
                </button>
                <Link to="/inquiries" className="btn btn-secondary btn-sm">더보기</Link>
              </div>
            </div>

            {showForm && (
              <InquiryForm
                formData={formData}
                onChange={handleChange}
                onSubmit={handleSubmit}
                onCancel={() => setShowForm(false)}
                statusOptions={statusOptions}
                staffUsers={staffUsers}
              />
            )}

            <table className="inquiry-table">
              <thead>
                <tr>
                  <th>상태</th>
                  <th>유형</th>
                  <th>작업 이름</th>
                  <th>요청자</th>
                  <th>작업자</th>
                  <th>위치</th>
                  <th>처리</th>
                  <th>등록일</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentInquiries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="empty-message">등록된 민원이 없습니다.</td>
                  </tr>
                ) : (
                  recentInquiries.map((inquiry) => {
                    const isExpanded = expandedId === inquiry.id;
                    const isEditing = editingId === inquiry.id;
                    const statusLabel = INQUIRY_STATUS_MAP[inquiry.status];
                    const typeLabel = INQUIRY_TYPE_MAP[inquiry.type];
                    const methodLabel = inquiry.method ? INQUIRY_METHOD_MAP[inquiry.method] : '-';

                    return (
                      <Fragment key={inquiry.id}>
                        <tr
                          className={`inquiry-row ${isExpanded ? 'expanded' : ''}`}
                          onClick={() => handleRowClick(inquiry.id)}
                        >
                          <td>
                            <span className={`status-badge ${getStatusClass(inquiry.status)}`}>{statusLabel}</span>
                          </td>
                          <td>{typeLabel}</td>
                          <td className="inquiry-title-cell">{inquiry.title}</td>
                          <td>{inquiry.requester}</td>
                          <td>
                            {inquiry.workerName
                              ? inquiry.subWorkerName
                                ? `${inquiry.workerName} / ${inquiry.subWorkerName}`
                                : inquiry.workerName
                              : '-'}
                          </td>
                          <td>
                            {(() => {
                              const groups = formatLocationGroups(inquiry.locations);
                              return groups.length > 0 ? groups.join(', ') : '-';
                            })()}
                          </td>
                          <td>{methodLabel}</td>
                          <td>{getRelativeTime(inquiry.createdAt)}</td>
                          <td
                            className="inquiry-rag-cell"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              className={`btn-rag${ragOpenId === inquiry.id ? ' active' : ''}`}
                              onClick={(e: MouseEvent) => {
                                if (!isExpanded) setExpandedId(inquiry.id);
                                handleRagClick(inquiry.id, e);
                              }}
                              title="유사 사례 조회"
                            >
                              💡
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="inquiry-detail-row">
                            <td colSpan={9}>
                              {isEditing ? (
                                <div className="inquiry-edit-form">
                                  <div className="edit-grid">
                                    <div className="edit-group">
                                      <label>작업 이름 *</label>
                                      <input type="text" value={editData.title} onChange={(e) => handleEditChange('title', e.target.value)} className="form-input" />
                                    </div>
                                    <div className="edit-group">
                                      <label>요청자 *</label>
                                      <input type="text" value={editData.requester} onChange={(e) => handleEditChange('requester', e.target.value)} className="form-input" />
                                    </div>
                                    <div className="edit-group edit-group-full">
                                      <label>위치</label>
                                      {editData.locations.map((group, gIdx) => (
                                        <div key={gIdx} className="location-group">
                                          <div className="location-group-header">
                                            <select
                                              value={group.buildingCode}
                                              onChange={(e) => {
                                                const next = [...editData.locations];
                                                next[gIdx] = { ...next[gIdx], buildingCode: e.target.value as BuildingCode | '' };
                                                handleEditChange('locations', next);
                                              }}
                                              className="form-select"
                                            >
                                              <option value="">건물 선택</option>
                                              {BUILDINGS.map((b) => (<option key={b.code} value={b.code}>{b.label}</option>))}
                                            </select>
                                            <input type="text" value={group.rooms[0].roomNumber} onChange={(e) => {
                                              const next = [...editData.locations];
                                              next[gIdx] = { ...next[gIdx], rooms: next[gIdx].rooms.map((r, i) => i === 0 ? { ...r, roomNumber: e.target.value } : r) };
                                              handleEditChange('locations', next);
                                            }} className="form-input" placeholder="예: 502" />
                                            <input type="text" value={group.rooms[0].roomName} onChange={(e) => {
                                              const next = [...editData.locations];
                                              next[gIdx] = { ...next[gIdx], rooms: next[gIdx].rooms.map((r, i) => i === 0 ? { ...r, roomName: e.target.value } : r) };
                                              handleEditChange('locations', next);
                                            }} className="form-input" placeholder="예: 소강당" />
                                            <button type="button" className="btn btn-sm btn-secondary" onClick={() => {
                                              const next = [...editData.locations];
                                              next[gIdx] = { ...next[gIdx], rooms: [...next[gIdx].rooms, emptyRoom] };
                                              handleEditChange('locations', next);
                                            }}>+ 호실 추가</button>
                                            {editData.locations.length > 1 && (
                                              <button type="button" className="btn btn-sm btn-danger" onClick={() => handleEditChange('locations', editData.locations.filter((_, i) => i !== gIdx))}>건물 삭제</button>
                                            )}
                                          </div>
                                          {group.rooms.slice(1).map((room, rIdx) => (
                                            <div key={rIdx + 1} className="location-room-row">
                                              <input type="text" value={room.roomNumber} onChange={(e) => {
                                                const next = [...editData.locations];
                                                next[gIdx] = { ...next[gIdx], rooms: next[gIdx].rooms.map((r, i) => i === rIdx + 1 ? { ...r, roomNumber: e.target.value } : r) };
                                                handleEditChange('locations', next);
                                              }} className="form-input" placeholder="예: 502" />
                                              <input type="text" value={room.roomName} onChange={(e) => {
                                                const next = [...editData.locations];
                                                next[gIdx] = { ...next[gIdx], rooms: next[gIdx].rooms.map((r, i) => i === rIdx + 1 ? { ...r, roomName: e.target.value } : r) };
                                                handleEditChange('locations', next);
                                              }} className="form-input" placeholder="예: 소강당" />
                                              <button type="button" className="btn btn-sm btn-danger" onClick={() => {
                                                const next = [...editData.locations];
                                                next[gIdx] = { ...next[gIdx], rooms: next[gIdx].rooms.filter((_, i) => i !== rIdx + 1) };
                                                handleEditChange('locations', next);
                                              }}>삭제</button>
                                            </div>
                                          ))}
                                        </div>
                                      ))}
                                      <button type="button" className="btn btn-sm btn-secondary" onClick={() => handleEditChange('locations', [...editData.locations, emptyLocationGroup])}>+ 건물 추가</button>
                                    </div>
                                    <div className="edit-group">
                                      <label>유형</label>
                                      <select value={editData.type} onChange={(e) => handleEditChange('type', e.target.value as InquiryTypeLabel)} className="form-select">
                                        {INQUIRY_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
                                      </select>
                                    </div>
                                    <div className="edit-group">
                                      <label>상태</label>
                                      <select value={editData.status} onChange={(e) => handleEditChange('status', e.target.value as InquiryStatusEnum)} className="form-select">
                                        {statusOptions.map((s) => (<option key={s.code} value={s.code}>{s.displayName}</option>))}
                                      </select>
                                    </div>
                                    <div className="edit-group">
                                      <label>작업자</label>
                                      <select value={editData.workerId ?? ''} onChange={(e) => handleEditChange('workerId', e.target.value ? Number(e.target.value) : null)} className="form-select">
                                        <option value="">선택</option>
                                        {staffUsers.map((staff) => (<option key={staff.id} value={staff.id}>{staff.name}</option>))}
                                      </select>
                                    </div>
                                    <div className="edit-group">
                                      <label>보조 작업자</label>
                                      <select value={editData.subWorkerId ?? ''} onChange={(e) => handleEditChange('subWorkerId', e.target.value ? Number(e.target.value) : null)} className="form-select">
                                        <option value="">선택</option>
                                        {staffUsers.map((staff) => (<option key={staff.id} value={staff.id}>{staff.name}</option>))}
                                      </select>
                                    </div>
                                    <div className="edit-group">
                                      <label>처리 방식</label>
                                      <select value={editData.method} onChange={(e) => handleEditChange('method', e.target.value as InquiryMethodLabel)} className="form-select">
                                        <option value="">선택</option>
                                        {INQUIRY_METHOD.map((m) => (<option key={m} value={m}>{m}</option>))}
                                      </select>
                                    </div>
                                  </div>
                                  <div className="edit-group full">
                                    <label>증상 *</label>
                                    <textarea value={editData.description} onChange={(e) => handleEditChange('description', e.target.value)} className="form-textarea" rows={2} />
                                  </div>
                                  <div className="edit-group full">
                                    <label>해결 내용</label>
                                    <textarea value={editData.solution} onChange={(e) => handleEditChange('solution', e.target.value)} className="form-textarea" rows={2} placeholder="해결 방법을 입력하세요" />
                                  </div>
                                  <div className="edit-actions">
                                    <button className="btn btn-primary" onClick={saveEdit}>저장</button>
                                    <button className="btn btn-secondary" onClick={cancelEdit}>취소</button>
                                  </div>
                                </div>
                              ) : (
                                <div className="inquiry-detail">
                                  <div className="detail-header">
                                    <button className="btn btn-sm btn-secondary" onClick={(e: MouseEvent) => { e.stopPropagation(); startEdit(inquiry); }}>수정</button>
                                    {inquiry.status !== 'COMPLETED' && (
                                      <button className="btn btn-sm btn-primary" onClick={(e: MouseEvent) => handleComplete(inquiry.id, e)}>완료</button>
                                    )}
                                    <button className="btn btn-sm btn-danger" onClick={(e: MouseEvent) => { e.stopPropagation(); handleDelete(inquiry.id); }}>삭제</button>
                                  </div>
                                  {ragOpenId === inquiry.id && (
                                    <div className="rag-bubble">
                                      <p className="rag-title">유사사례</p>
                                      {ragLoading ? (
                                        <p className="rag-loading">유사사례를 조회하는 중입니다...</p>
                                      ) : ragError ? (
                                        <p className="rag-error">{ragError}</p>
                                      ) : ragResult ? (
                                        <>
                                          <p className="rag-summary">{ragResult.summary}</p>
                                          {ragResult.references.length > 0 && (
                                            <>
                                              <p className="rag-references-title">참고 사례 ({ragResult.referenceCount}건)</p>
                                              {ragResult.references.map((ref) => (
                                                <div key={ref.inquiryId} className="rag-reference-item">
                                                  <p className="rag-reference-meta">{ref.type} · {ref.location}</p>
                                                  <p className="rag-reference-problem"><strong>증상:</strong> {ref.problem}</p>
                                                  <p className="rag-reference-solution"><strong>해결:</strong> {ref.solution}</p>
                                                </div>
                                              ))}
                                            </>
                                          )}
                                        </>
                                      ) : null}
                                    </div>
                                  )}
                                  <div className="detail-content">
                                    <div className="detail-meta-row">
                                      {inquiry.locations.length > 0 && (
                                        <div className="detail-row">
                                          <span className="detail-label">위치:</span>
                                          <span>
                                            {formatLocationGroups(inquiry.locations).map((g, i) => (
                                              <span key={i}>{i > 0 && <br />}{g}</span>
                                            ))}
                                          </span>
                                        </div>
                                      )}
                                      <div className="detail-row">
                                        <span className="detail-label">접수 날짜:</span>
                                        <span>{formatDateTime(inquiry.createdAt)}</span>
                                      </div>
                                      <div className="detail-row">
                                        <span className="detail-label">처리 날짜:</span>
                                        <span>{formatDateTime(inquiry.completedAt)}</span>
                                      </div>
                                    </div>
                                    <div className="detail-split">
                                      <div className="detail-symptoms">
                                        <div className="detail-split-label">증상</div>
                                        <div className="detail-split-body">
                                          {inquiry.description
                                            ? <LinkItUrl>{inquiry.description}</LinkItUrl>
                                            : <span className="detail-empty">-</span>}
                                        </div>
                                      </div>
                                      <div className="detail-solution-panel">
                                        <div className="detail-split-label">해결 내용</div>
                                        <div className="detail-split-body">
                                          {inquiry.solution
                                            ? <LinkItUrl>{inquiry.solution}</LinkItUrl>
                                            : <span className="detail-empty">-</span>}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>

            {inquiries.length > 10 && (
              <div className="more-link">
                <Link to="/inquiries">전체 {inquiries.length}건 보기</Link>
              </div>
            )}
          </div>
        </div>

        <div className="home-right">
          <div className="home-card documents-section">
            <div className="home-card-header">
              <div className="home-card-title-group">
                <span className="home-card-accent document-accent" />
                <h2 className="home-card-title">문서 목록</h2>
              </div>
              <div className="documents-header-actions">
                <a className="home-icon-btn" onClick={handleOpenTrash} role="button" title="문서 복구" style={{ cursor: 'pointer' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                    <path d="M3 3v5h5"/>
                    <path d="M12 7v5l4 2"/>
                  </svg>
                </a>
                <Link to="/create" className="home-icon-btn home-icon-btn-primary" title="새 문서">＋</Link>
              </div>
            </div>
            <div className="home-category-filters">
              <button className={`home-category-btn ${selectedCategory === null ? 'active' : ''}`} onClick={() => setSelectedCategory(null)}>전체</button>
              {DOCUMENT_CATEGORIES.map((cat) => (
                <button key={cat.code} className={`home-category-btn ${selectedCategory === cat.code ? 'active' : ''}`} onClick={() => setSelectedCategory(cat.code)}>{cat.label}</button>
              ))}
            </div>
            <div className="documents-list">
              {(selectedCategory
                ? DOCUMENT_CATEGORIES.filter(cat => cat.code === selectedCategory)
                : DOCUMENT_CATEGORIES
              ).map((cat) => {
                const categoryDocs = docItems.filter(doc => doc.categoryCode === cat.code);
                if (categoryDocs.length === 0) return null;
                return (
                  <div key={cat.code} className="home-doc-group">
                    <h3 className="home-doc-category">{cat.label}</h3>
                    <ul className="home-doc-list">
                      {categoryDocs.map((doc) => (
                        <li key={doc.id}>
                          <Link to={`/wiki/${doc.id}`} className="home-doc-link">
                            <span className="home-doc-title">{doc.title}</span>
                            <span className="home-doc-date">{getRelativeTime(doc.updatedAt)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              {docInitialized && docItems.length === 0 && (
                <p className="empty-message">등록된 문서가 없습니다.</p>
              )}
              {docLoadingMore && (
                <div style={{ textAlign: 'center', padding: '0.5rem', color: 'var(--text-secondary, #888)', fontSize: '0.8rem' }}>
                  불러오는 중...
                </div>
              )}
              <div ref={docSentinelRef} style={{ height: 1 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
