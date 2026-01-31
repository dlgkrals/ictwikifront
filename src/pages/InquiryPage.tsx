import { useState, useMemo, type FormEvent, type MouseEvent } from 'react';
import { useWiki, INQUIRY_TYPES, INQUIRY_STATUS, INQUIRY_METHOD } from '../context/WikiContext';
import type { Inquiry, InquiryFormData, InquiryFilters } from '../types';

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

const emptyForm: InquiryFormData = {
  title: '',
  type: 'PC',
  status: '시작 전',
  worker: '',
  workDate: '',
  method: '',
  description: '',
  solution: '',
  requester: '',
};

export default function InquiryPage() {
  const { inquiries, addInquiry, updateInquiry } = useWiki();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<InquiryFormData>(emptyForm);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Inquiry>>({});

  const [filters, setFilters] = useState<InquiryFilters>({
    status: '전체',
    type: '전체',
    worker: '전체',
    method: '전체',
  });

  const workers = useMemo(() => {
    const workerSet = new Set(inquiries.map((inq) => inq.worker).filter(Boolean));
    return Array.from(workerSet).sort();
  }, [inquiries]);

  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inq) => {
      if (filters.status !== '전체' && inq.status !== filters.status) return false;
      if (filters.type !== '전체' && inq.type !== filters.type) return false;
      if (filters.worker !== '전체' && inq.worker !== filters.worker) return false;
      if (filters.method !== '전체' && inq.method !== filters.method) return false;
      return true;
    });
  }, [inquiries, filters]);

  const handleFilterChange = (key: keyof InquiryFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      status: '전체',
      type: '전체',
      worker: '전체',
      method: '전체',
    });
  };

  const activeFilterCount = Object.values(filters).filter((v) => v !== '전체').length;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim() || !formData.requester.trim()) {
      alert('작업 이름, 작업 설명, 요청자는 필수 항목입니다.');
      return;
    }
    addInquiry(formData);
    setFormData(emptyForm);
    setShowForm(false);
  };

  const handleChange = (field: keyof InquiryFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const startEdit = (inquiry: Inquiry) => {
    setEditingId(inquiry.id);
    setEditData({ ...inquiry });
    setExpandedId(inquiry.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = () => {
    if (editingId !== null) {
      updateInquiry(editingId, editData);
      setEditingId(null);
      setEditData({});
    }
  };

  const handleEditChange = (field: keyof Inquiry, value: string) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const getStatusClass = (status: string): string => {
    switch (status) {
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

  const handleRowClick = (id: number) => {
    if (editingId && editingId !== id) return;
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="page inquiry-page">
      <h1 className="page-title">민원/작업 요청</h1>

      <div className="inquiry-controls">
        <div className="filter-bar">
          <div className="filter-item">
            <label>상태</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="form-select"
            >
              <option value="전체">전체</option>
              {INQUIRY_STATUS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-item">
            <label>유형</label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="form-select"
            >
              <option value="전체">전체</option>
              {INQUIRY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-item">
            <label>작업자</label>
            <select
              value={filters.worker}
              onChange={(e) => handleFilterChange('worker', e.target.value)}
              className="form-select"
            >
              <option value="전체">전체</option>
              {workers.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-item">
            <label>처리방식</label>
            <select
              value={filters.method}
              onChange={(e) => handleFilterChange('method', e.target.value)}
              className="form-select"
            >
              <option value="전체">전체</option>
              {INQUIRY_METHOD.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          {activeFilterCount > 0 && (
            <button className="btn btn-sm btn-reset" onClick={resetFilters}>
              필터 초기화
            </button>
          )}
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '취소' : '새 요청'}
        </button>
      </div>

      {showForm && (
        <form className="inquiry-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>작업 이름 *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="form-input"
                placeholder="예: IP 주소 설정 요청"
              />
            </div>
            <div className="form-group">
              <label>요청자 *</label>
              <input
                type="text"
                value={formData.requester}
                onChange={(e) => handleChange('requester', e.target.value)}
                className="form-input"
                placeholder="예: 간호학과 조교"
              />
            </div>
            <div className="form-group">
              <label>유형</label>
              <select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className="form-select"
              >
                {INQUIRY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>진행상태</label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="form-select"
              >
                {INQUIRY_STATUS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>작업자</label>
              <input
                type="text"
                value={formData.worker}
                onChange={(e) => handleChange('worker', e.target.value)}
                className="form-input"
                placeholder="담당자 이름"
              />
            </div>
            <div className="form-group">
              <label>작업 날짜</label>
              <input
                type="date"
                value={formData.workDate}
                onChange={(e) => handleChange('workDate', e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>처리 방식</label>
              <select
                value={formData.method}
                onChange={(e) => handleChange('method', e.target.value)}
                className="form-select"
              >
                <option value="">선택</option>
                {INQUIRY_METHOD.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>작업 설명 *</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="form-textarea"
              rows={3}
              placeholder="문제 상황이나 요청 내용을 설명해주세요"
            />
          </div>
          <div className="form-group">
            <label>해결 내용</label>
            <textarea
              value={formData.solution}
              onChange={(e) => handleChange('solution', e.target.value)}
              className="form-textarea"
              rows={2}
              placeholder="해결 방법 (작업 완료 후 작성)"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            등록
          </button>
        </form>
      )}

      <div className="inquiry-stats">
        {activeFilterCount > 0 ? (
          <>
            필터 적용: {filteredInquiries.length}건 / 전체 {inquiries.length}건
          </>
        ) : (
          <>총 {inquiries.length}건</>
        )}
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
          {filteredInquiries.length === 0 ? (
            <tr>
              <td colSpan={7} className="empty-message">
                조건에 맞는 민원이 없습니다.
              </td>
            </tr>
          ) : (
            filteredInquiries.map((inquiry) => {
              const isExpanded = expandedId === inquiry.id;
              const isEditing = editingId === inquiry.id;

              return (
                <>
                  <tr
                    key={inquiry.id}
                    className={`inquiry-row ${isExpanded ? 'expanded' : ''}`}
                    onClick={() => handleRowClick(inquiry.id)}
                  >
                    <td>
                      <span className={`status-badge ${getStatusClass(inquiry.status)}`}>
                        {inquiry.status}
                      </span>
                    </td>
                    <td>{inquiry.type}</td>
                    <td className="inquiry-title-cell">{inquiry.title}</td>
                    <td>{inquiry.requester}</td>
                    <td>{inquiry.worker || '-'}</td>
                    <td>{inquiry.method || '-'}</td>
                    <td>{getRelativeTime(inquiry.createdAt)}</td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${inquiry.id}-detail`} className="inquiry-detail-row">
                      <td colSpan={7}>
                        {isEditing ? (
                          <div className="inquiry-edit-form">
                            <div className="edit-grid">
                              <div className="edit-group">
                                <label>상태</label>
                                <select
                                  value={editData.status}
                                  onChange={(e) => handleEditChange('status', e.target.value)}
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
                                <input
                                  type="text"
                                  value={editData.worker}
                                  onChange={(e) => handleEditChange('worker', e.target.value)}
                                  className="form-input"
                                />
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
                                  onChange={(e) => handleEditChange('method', e.target.value)}
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
                              <label>작업 설명</label>
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
                            </div>
                            <div className="detail-content">
                              <div className="detail-row">
                                <span className="detail-label">작업 날짜:</span>
                                <span>{inquiry.workDate || '미정'}</span>
                              </div>
                              <div className="detail-row">
                                <span className="detail-label">작업 설명:</span>
                                <span>{inquiry.description}</span>
                              </div>
                              {inquiry.solution && (
                                <div className="detail-row solution">
                                  <span className="detail-label">해결 내용:</span>
                                  <span>{inquiry.solution}</span>
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
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
