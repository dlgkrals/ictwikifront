import { useState, useEffect, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { LinkItUrl } from 'react-linkify-it';
import { useWiki, INQUIRY_TYPES, INQUIRY_STATUS, INQUIRY_METHOD } from '../context/WikiContext';
import type { Inquiry, InquiryUpdateRequest } from '../types';
import {
  INQUIRY_TYPE_MAP,
  INQUIRY_TYPE_REVERSE_MAP,
  INQUIRY_STATUS_MAP,
  INQUIRY_METHOD_MAP,
  INQUIRY_STATUS_REVERSE_MAP,
  INQUIRY_METHOD_REVERSE_MAP,
  DOCUMENT_CATEGORIES,
  type DocumentCategoryCode,
  type InquiryTypeLabel,
  type InquiryStatusLabel,
  type InquiryMethodLabel,
} from '../types';

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

interface EditData {
  title: string;
  type: InquiryTypeLabel;
  description: string;
  requester: string;
  status: InquiryStatusLabel;
  workerId: number | null;
  workDate: string;
  method: InquiryMethodLabel;
  solution: string;
}

const emptyEditData: EditData = {
  title: '',
  type: 'PC',
  description: '',
  requester: '',
  status: '시작 전',
  workerId: null,
  workDate: '',
  method: '',
  solution: '',
};

export default function Home() {
  const { notices, inquiries, documents, updateInquiry, deleteInquiry, staffUsers, fetchStaffUsers } = useWiki();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<EditData>(emptyEditData);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategoryCode | null>(null);

  // 수정 폼이 열릴 때 STAFF 목록 가져오기
  useEffect(() => {
    if (editingId !== null) {
      fetchStaffUsers();
    }
  }, [editingId, fetchStaffUsers]);

  const recentInquiries = inquiries.slice(0, 10);

  const getStatusClass = (status: string): string => {
    const statusLabel = INQUIRY_STATUS_MAP[status as keyof typeof INQUIRY_STATUS_MAP] || status;
    switch (statusLabel) {
      case '시작 전':
        return 'status-pending';
      case '진행 중':
        return 'status-progress';
      case '완료':
        return 'status-done';
      case '보류':
        return 'status-hold';
      default:
        return '';
    }
  };

  const startEdit = (inquiry: Inquiry) => {
    setEditingId(inquiry.id);
    setEditData({
      title: inquiry.title,
      type: INQUIRY_TYPE_MAP[inquiry.type],
      description: inquiry.description,
      requester: inquiry.requester,
      status: INQUIRY_STATUS_MAP[inquiry.status],
      workerId: inquiry.workerId,
      workDate: inquiry.workDate || '',
      method: inquiry.method ? INQUIRY_METHOD_MAP[inquiry.method] : '',
      solution: inquiry.solution || '',
    });
    setExpandedId(inquiry.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData(emptyEditData);
  };

  const saveEdit = async () => {
    if (editingId !== null) {
      if (!editData.title.trim() || !editData.description.trim() || !editData.requester.trim()) {
        alert('작업 이름, 증상, 요청자는 필수 항목입니다.');
        return;
      }
      const updates: InquiryUpdateRequest = {
        title: editData.title,
        type: INQUIRY_TYPE_REVERSE_MAP[editData.type],
        description: editData.description,
        requester: editData.requester,
        status: INQUIRY_STATUS_REVERSE_MAP[editData.status],
        workerId: editData.workerId || undefined,
        method: INQUIRY_METHOD_REVERSE_MAP[editData.method] || undefined,
        workDate: editData.workDate || undefined,
        solution: editData.solution || undefined,
      };
      await updateInquiry(editingId, updates);
      setEditingId(null);
      setEditData(emptyEditData);
    }
  };

  const handleEditChange = (field: keyof EditData, value: string | number | null) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRowClick = (id: number) => {
    if (editingId && editingId !== id) return;
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="page home-page">
      <h1 className="page-title">ICT Wiki</h1>

      <div className="home-grid">
        <div className="home-left">
          <div className="notice-section">
        <div className="notice-header">
          <h2>공지사항</h2>
          <Link to="/notices" className="btn btn-secondary">
            더보기
          </Link>
        </div>
        <ul className="notice-list">
          {notices.slice(0, 3).map((notice) => (
            <li key={notice.id} className="notice-item">
              <Link to={`/notices/${notice.id}`} className="notice-link">
                <span className="notice-badge">공지</span>
                <span className="notice-title">{notice.title}</span>
                <span className="notice-date">{getRelativeTime(notice.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="inquiry-section">
        <div className="inquiry-header">
          <h2>최근 민원</h2>
          <Link to="/inquiries" className="btn btn-secondary">
            더보기
          </Link>
        </div>

        <table className="inquiry-table">
          <thead>
            <tr>
              <th>상태</th>
              <th>유형</th>
              <th>작업 이름</th>
              <th>요청자</th>
              <th>작업자</th>
              <th>처리</th>
              <th>등록일</th>
            </tr>
          </thead>
          <tbody>
            {recentInquiries.map((inquiry) => {
              const isExpanded = expandedId === inquiry.id;
              const isEditing = editingId === inquiry.id;
              const statusLabel = INQUIRY_STATUS_MAP[inquiry.status];
              const typeLabel = INQUIRY_TYPE_MAP[inquiry.type];
              const methodLabel = inquiry.method ? INQUIRY_METHOD_MAP[inquiry.method] : '-';

              return (
                <>
                  <tr
                    key={inquiry.id}
                    className={`inquiry-row ${isExpanded ? 'expanded' : ''}`}
                    onClick={() => handleRowClick(inquiry.id)}
                  >
                    <td>
                      <span className={`status-badge ${getStatusClass(inquiry.status)}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td>{typeLabel}</td>
                    <td className="inquiry-title-cell">{inquiry.title}</td>
                    <td>{inquiry.requester}</td>
                    <td>{inquiry.workerName || '-'}</td>
                    <td>{methodLabel}</td>
                    <td>{getRelativeTime(inquiry.createdAt)}</td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${inquiry.id}-detail`} className="inquiry-detail-row">
                      <td colSpan={7}>
                        {isEditing ? (
                          <div className="inquiry-edit-form">
                            <div className="edit-grid">
                              <div className="edit-group">
                                <label>작업 이름 *</label>
                                <input
                                  type="text"
                                  value={editData.title}
                                  onChange={(e) => handleEditChange('title', e.target.value)}
                                  className="form-input"
                                />
                              </div>
                              <div className="edit-group">
                                <label>요청자 *</label>
                                <input
                                  type="text"
                                  value={editData.requester}
                                  onChange={(e) => handleEditChange('requester', e.target.value)}
                                  className="form-input"
                                />
                              </div>
                              <div className="edit-group">
                                <label>유형</label>
                                <select
                                  value={editData.type}
                                  onChange={(e) =>
                                    handleEditChange('type', e.target.value as InquiryTypeLabel)
                                  }
                                  className="form-select"
                                >
                                  {INQUIRY_TYPES.map((t) => (
                                    <option key={t} value={t}>
                                      {t}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="edit-group">
                                <label>상태</label>
                                <select
                                  value={editData.status}
                                  onChange={(e) =>
                                    handleEditChange('status', e.target.value as InquiryStatusLabel)
                                  }
                                  className="form-select"
                                >
                                  {INQUIRY_STATUS.map((s) => (
                                    <option key={s} value={s}>
                                      {s}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="edit-group">
                                <label>작업자</label>
                                <select
                                  value={editData.workerId ?? ''}
                                  onChange={(e) => handleEditChange('workerId', e.target.value ? Number(e.target.value) : null)}
                                  className="form-select"
                                >
                                  <option value="">선택</option>
                                  {staffUsers.map((staff) => (
                                    <option key={staff.id} value={staff.id}>
                                      {staff.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="edit-group">
                                <label>작업 날짜</label>
                                <input
                                  type="date"
                                  value={editData.workDate}
                                  onChange={(e) => handleEditChange('workDate', e.target.value)}
                                  className="form-input"
                                />
                              </div>
                              <div className="edit-group">
                                <label>처리 방식</label>
                                <select
                                  value={editData.method}
                                  onChange={(e) =>
                                    handleEditChange('method', e.target.value as InquiryMethodLabel)
                                  }
                                  className="form-select"
                                >
                                  <option value="">선택</option>
                                  {INQUIRY_METHOD.map((m) => (
                                    <option key={m} value={m}>
                                      {m}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="edit-group full">
                              <label>증상 *</label>
                              <textarea
                                value={editData.description}
                                onChange={(e) => handleEditChange('description', e.target.value)}
                                className="form-textarea"
                                rows={2}
                              />
                            </div>
                            <div className="edit-group full">
                              <label>해결 내용</label>
                              <textarea
                                value={editData.solution}
                                onChange={(e) => handleEditChange('solution', e.target.value)}
                                className="form-textarea"
                                rows={2}
                                placeholder="해결 방법을 입력하세요"
                              />
                            </div>
                            <div className="edit-actions">
                              <button className="btn btn-primary" onClick={saveEdit}>
                                저장
                              </button>
                              <button className="btn btn-secondary" onClick={cancelEdit}>
                                취소
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="inquiry-detail">
                            <div className="detail-header">
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={(e: MouseEvent) => {
                                  e.stopPropagation();
                                  startEdit(inquiry);
                                }}
                              >
                                수정
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={(e: MouseEvent) => {
                                  e.stopPropagation();
                                  if (window.confirm('정말로 이 민원을 삭제하시겠습니까?')) {
                                    deleteInquiry(inquiry.id);
                                  }
                                }}
                              >
                                삭제
                              </button>
                            </div>
                            <div className="detail-content">
                              <div className="detail-row">
                                <span className="detail-label">작업 날짜:</span>
                                <span>{inquiry.workDate || '미정'}</span>
                              </div>
                              <div className="detail-row">
                                <span className="detail-label">증상:</span>
                                <span><LinkItUrl>{inquiry.description}</LinkItUrl></span>
                              </div>
                              {inquiry.solution && (
                                <div className="detail-row solution">
                                  <span className="detail-label">해결 내용:</span>
                                  <span><LinkItUrl>{inquiry.solution}</LinkItUrl></span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
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
          <div className="documents-section">
            <div className="documents-header">
              <h2>문서 목록</h2>
              <Link to="/create" className="btn btn-secondary">
                새 문서
              </Link>
            </div>
            <div className="document-category-filters">
              <button
                className={`category-filter-btn ${selectedCategory === null ? 'active' : ''}`}
                onClick={() => setSelectedCategory(null)}
              >
                전체
              </button>
              {DOCUMENT_CATEGORIES.map((cat) => (
                <button
                  key={cat.code}
                  className={`category-filter-btn ${selectedCategory === cat.code ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat.code)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="documents-list">
              {(selectedCategory
                ? DOCUMENT_CATEGORIES.filter(cat => cat.code === selectedCategory)
                : DOCUMENT_CATEGORIES
              ).map((cat) => {
                const categoryDocs = documents.filter(doc => doc.categoryCode === cat.code);
                if (categoryDocs.length === 0) return null;
                return (
                  <div key={cat.code} className="document-category-group">
                    <h3 className="document-category-title">{cat.label}</h3>
                    <ul className="document-category-items">
                      {categoryDocs.map((doc) => (
                        <li key={doc.id} className="document-item">
                          <Link to={`/wiki/${doc.id}`} className="document-link">
                            <span className="document-title">{doc.title}</span>
                            <span className="document-date">{getRelativeTime(doc.updatedAt)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              {documents.length === 0 && (
                <p className="empty-message">등록된 문서가 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
