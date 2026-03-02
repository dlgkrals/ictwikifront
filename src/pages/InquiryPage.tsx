import { useState, useMemo, useEffect, Fragment, type FormEvent, type MouseEvent } from 'react';
import { LinkItUrl } from 'react-linkify-it';
import { useWiki, INQUIRY_TYPES, INQUIRY_STATUS, INQUIRY_METHOD } from '../context/WikiContext';
import { inquiryApi } from '../api/inquiryApi';
import type {
  Inquiry,
  InquiryCreateRequest,
  InquiryUpdateRequest,
  InquiryFilters,
  InquiryTypeLabel,
  InquiryMethodLabel,
  InquiryStatusEnum,
  InquiryStatusOption,
  LocationRequest,
  LocationResponse,
} from '../types';
import {
  INQUIRY_TYPE_MAP,
  INQUIRY_STATUS_MAP,
  INQUIRY_METHOD_MAP,
  INQUIRY_TYPE_REVERSE_MAP,
  INQUIRY_METHOD_REVERSE_MAP,
  BUILDINGS,
  type BuildingCode,
} from '../types';

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
    const buildingName = locs[0].buildingName;
    if (locs.length === 1) return locs[0].formatted;
    const allPureNumbers = locs.every((l) => l.roomNumber != null && !l.roomName);
    if (allPureNumbers) {
      const parts = locs.map((l, i) => (i === locs.length - 1 ? `${l.roomNumber}호` : `${l.roomNumber}`));
      return `${buildingName} ${parts.join(', ')}`;
    }
    const parts = locs.map((l) => {
      if (l.roomNumber != null && l.roomName) return `${l.roomNumber}호 ${l.roomName}`;
      if (l.roomNumber != null) return `${l.roomNumber}호`;
      return l.roomName || '';
    });
    return `${buildingName} ${parts.join(', ')}`;
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

interface RoomFormItem {
  roomNumber: string;
  roomName: string;
}

interface LocationGroup {
  buildingCode: BuildingCode | '';
  rooms: RoomFormItem[];
}

const emptyRoom: RoomFormItem = { roomNumber: '', roomName: '' };
const emptyLocationGroup: LocationGroup = { buildingCode: '', rooms: [emptyRoom] };

interface InquiryFormData {
  title: string;
  type: InquiryTypeLabel;
  description: string;
  requester: string;
  locations: LocationGroup[];
  status: InquiryStatusEnum;
  workerId: number | null;
  subWorkerId: number | null;
  method: InquiryMethodLabel;
  solution: string;
}

const emptyForm: InquiryFormData = {
  title: '',
  type: 'PC',
  description: '',
  requester: '',
  locations: [emptyLocationGroup],
  status: 'PENDING',
  workerId: null,
  subWorkerId: null,
  method: '',
  solution: '',
};

export default function InquiryPage() {
  const { inquiries, addInquiry, updateInquiry, deleteInquiry, fetchInquiries, staffUsers, fetchStaffUsers } = useWiki();
  const [statusOptions, setStatusOptions] = useState<InquiryStatusOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<InquiryFormData>(emptyForm);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<InquiryFormData>(emptyForm);

  useEffect(() => {
    inquiryApi.getStatusOptions().then(setStatusOptions).catch(() => {});
  }, []);

  // 폼이 열릴 때 STAFF 목록 가져오기
  useEffect(() => {
    if (showForm || editingId !== null) {
      fetchStaffUsers();
    }
  }, [showForm, editingId, fetchStaffUsers]);

  const [filters, setFilters] = useState<InquiryFilters>({
    status: '전체',
    type: '전체',
    worker: '전체',
    method: '전체',
  });
  const [todayOnly, setTodayOnly] = useState(false);

  const workers = useMemo(() => {
    const workerSet = new Set(
      inquiries.map((inq) => inq.workerName).filter((w): w is string => Boolean(w))
    );
    return Array.from(workerSet).sort();
  }, [inquiries]);

  const filteredInquiries = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayStart.getDate() + 1);

    return inquiries.filter((inq) => {
      const statusLabel = INQUIRY_STATUS_MAP[inq.status];
      const typeLabel = INQUIRY_TYPE_MAP[inq.type];
      const methodLabel = inq.method ? INQUIRY_METHOD_MAP[inq.method] : '';

      if (filters.status !== '전체' && statusLabel !== filters.status) return false;
      if (filters.type !== '전체' && typeLabel !== filters.type) return false;
      if (filters.worker !== '전체' && inq.workerName !== filters.worker) return false;
      if (filters.method !== '전체' && methodLabel !== filters.method) return false;
      if (todayOnly) {
        const createdAt = new Date(inq.createdAt);
        if (createdAt < todayStart || createdAt >= todayEnd) return false;
      }
      return true;
    });
  }, [inquiries, filters, todayOnly]);

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
    setTodayOnly(false);
  };

  const activeFilterCount = Object.values(filters).filter((v) => v !== '전체').length + (todayOnly ? 1 : 0);

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

  const handleChange = (field: keyof InquiryFormData, value: string | number | null) => {
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

  const handleEditChange = (field: keyof InquiryFormData, value: string | number | null) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

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

  const handleRowClick = (id: number) => {
    if (editingId && editingId !== id) return;
    setExpandedId(expandedId === id ? null : id);
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
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={todayOnly}
              onChange={(e) => setTodayOnly(e.target.checked)}
            />
            당일 민원만 보기
          </label>
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
            <div className="form-group form-group-full">
              <label>위치</label>
              {formData.locations.map((group, gIdx) => (
                <div key={gIdx} className="location-group">
                  <div className="location-group-header">
                    <select
                      value={group.buildingCode}
                      onChange={(e) => {
                        const next = [...formData.locations];
                        next[gIdx] = { ...next[gIdx], buildingCode: e.target.value as BuildingCode | '' };
                        handleChange('locations', next);
                      }}
                      className="form-select"
                    >
                      <option value="">건물 선택</option>
                      {BUILDINGS.map((b) => (<option key={b.code} value={b.code}>{b.label}</option>))}
                    </select>
                    <input
                      type="text"
                      value={group.rooms[0].roomNumber}
                      onChange={(e) => {
                        const next = [...formData.locations];
                        next[gIdx] = { ...next[gIdx], rooms: next[gIdx].rooms.map((r, i) => i === 0 ? { ...r, roomNumber: e.target.value } : r) };
                        handleChange('locations', next);
                      }}
                      className="form-input"
                      placeholder="예: 502"
                    />
                    <input
                      type="text"
                      value={group.rooms[0].roomName}
                      onChange={(e) => {
                        const next = [...formData.locations];
                        next[gIdx] = { ...next[gIdx], rooms: next[gIdx].rooms.map((r, i) => i === 0 ? { ...r, roomName: e.target.value } : r) };
                        handleChange('locations', next);
                      }}
                      className="form-input"
                      placeholder="예: 소강당"
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => {
                        const next = [...formData.locations];
                        next[gIdx] = { ...next[gIdx], rooms: [...next[gIdx].rooms, emptyRoom] };
                        handleChange('locations', next);
                      }}
                    >
                      + 호실 추가
                    </button>
                    {formData.locations.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => handleChange('locations', formData.locations.filter((_, i) => i !== gIdx))}
                      >
                        건물 삭제
                      </button>
                    )}
                  </div>
                  {group.rooms.slice(1).map((room, rIdx) => (
                    <div key={rIdx + 1} className="location-room-row">
                      <input
                        type="text"
                        value={room.roomNumber}
                        onChange={(e) => {
                          const next = [...formData.locations];
                          next[gIdx] = { ...next[gIdx], rooms: next[gIdx].rooms.map((r, i) => i === rIdx + 1 ? { ...r, roomNumber: e.target.value } : r) };
                          handleChange('locations', next);
                        }}
                        className="form-input"
                        placeholder="예: 502"
                      />
                      <input
                        type="text"
                        value={room.roomName}
                        onChange={(e) => {
                          const next = [...formData.locations];
                          next[gIdx] = { ...next[gIdx], rooms: next[gIdx].rooms.map((r, i) => i === rIdx + 1 ? { ...r, roomName: e.target.value } : r) };
                          handleChange('locations', next);
                        }}
                        className="form-input"
                        placeholder="예: 소강당"
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => {
                          const next = [...formData.locations];
                          next[gIdx] = { ...next[gIdx], rooms: next[gIdx].rooms.filter((_, i) => i !== rIdx + 1) };
                          handleChange('locations', next);
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              ))}
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => handleChange('locations', [...formData.locations, emptyLocationGroup])}
              >
                + 건물 추가
              </button>
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
              <label>상태</label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="form-select"
              >
                {statusOptions.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>작업자</label>
              <select
                value={formData.workerId ?? ''}
                onChange={(e) => handleChange('workerId', e.target.value ? Number(e.target.value) : null)}
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
            <div className="form-group">
              <label>보조 작업자</label>
              <select
                value={formData.subWorkerId ?? ''}
                onChange={(e) => handleChange('subWorkerId', e.target.value ? Number(e.target.value) : null)}
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
            <div className="form-group">
              <label>처리 방식</label>
              <select
                value={formData.method}
                onChange={(e) => handleChange('method', e.target.value)}
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
          <div className="form-group">
            <label>증상 *</label>
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
              placeholder="해결 방법을 입력하세요"
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
            <th>위치</th>
            <th>처리</th>
            <th>등록일</th>
          </tr>
        </thead>
        <tbody>
          {filteredInquiries.length === 0 ? (
            <tr>
              <td colSpan={8} className="empty-message">
                조건에 맞는 민원이 없습니다.
              </td>
            </tr>
          ) : (
            filteredInquiries.map((inquiry) => {
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
                      <span className={`status-badge ${getStatusClass(inquiry.status)}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td>{typeLabel}</td>
                    <td className="inquiry-title-cell">{inquiry.title}</td>
                    <td>{inquiry.requester}</td>
                    <td>
                      <div>{inquiry.workerName || '-'}</div>
                      {inquiry.subWorkerName && (
                        <div className="sub-worker-name">{inquiry.subWorkerName}</div>
                      )}
                    </td>
                    <td>
                      {(() => {
                        const groups = formatLocationGroups(inquiry.locations);
                        return groups.length > 0 ? groups.join(', ') : '-';
                      })()}
                    </td>
                    <td>{methodLabel}</td>
                    <td>{getRelativeTime(inquiry.createdAt)}</td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${inquiry.id}-detail`} className="inquiry-detail-row">
                      <td colSpan={8}>
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
                                      <input
                                        type="text"
                                        value={group.rooms[0].roomNumber}
                                        onChange={(e) => {
                                          const next = [...editData.locations];
                                          next[gIdx] = { ...next[gIdx], rooms: next[gIdx].rooms.map((r, i) => i === 0 ? { ...r, roomNumber: e.target.value } : r) };
                                          handleEditChange('locations', next);
                                        }}
                                        className="form-input"
                                        placeholder="예: 502"
                                      />
                                      <input
                                        type="text"
                                        value={group.rooms[0].roomName}
                                        onChange={(e) => {
                                          const next = [...editData.locations];
                                          next[gIdx] = { ...next[gIdx], rooms: next[gIdx].rooms.map((r, i) => i === 0 ? { ...r, roomName: e.target.value } : r) };
                                          handleEditChange('locations', next);
                                        }}
                                        className="form-input"
                                        placeholder="예: 소강당"
                                      />
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-secondary"
                                        onClick={() => {
                                          const next = [...editData.locations];
                                          next[gIdx] = { ...next[gIdx], rooms: [...next[gIdx].rooms, emptyRoom] };
                                          handleEditChange('locations', next);
                                        }}
                                      >
                                        + 호실 추가
                                      </button>
                                      {editData.locations.length > 1 && (
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-danger"
                                          onClick={() => handleEditChange('locations', editData.locations.filter((_, i) => i !== gIdx))}
                                        >
                                          건물 삭제
                                        </button>
                                      )}
                                    </div>
                                    {group.rooms.slice(1).map((room, rIdx) => (
                                      <div key={rIdx + 1} className="location-room-row">
                                        <input
                                          type="text"
                                          value={room.roomNumber}
                                          onChange={(e) => {
                                            const next = [...editData.locations];
                                            next[gIdx] = { ...next[gIdx], rooms: next[gIdx].rooms.map((r, i) => i === rIdx + 1 ? { ...r, roomNumber: e.target.value } : r) };
                                            handleEditChange('locations', next);
                                          }}
                                          className="form-input"
                                          placeholder="예: 502"
                                        />
                                        <input
                                          type="text"
                                          value={room.roomName}
                                          onChange={(e) => {
                                            const next = [...editData.locations];
                                            next[gIdx] = { ...next[gIdx], rooms: next[gIdx].rooms.map((r, i) => i === rIdx + 1 ? { ...r, roomName: e.target.value } : r) };
                                            handleEditChange('locations', next);
                                          }}
                                          className="form-input"
                                          placeholder="예: 소강당"
                                        />
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-danger"
                                          onClick={() => {
                                            const next = [...editData.locations];
                                            next[gIdx] = { ...next[gIdx], rooms: next[gIdx].rooms.filter((_, i) => i !== rIdx + 1) };
                                            handleEditChange('locations', next);
                                          }}
                                        >
                                          삭제
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => handleEditChange('locations', [...editData.locations, emptyLocationGroup])}
                                >
                                  + 건물 추가
                                </button>
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
                                    handleEditChange('status', e.target.value as InquiryStatusEnum)
                                  }
                                  className="form-select"
                                >
                                  {statusOptions.map((s) => (
                                    <option key={s.code} value={s.code}>
                                      {s.displayName}
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
                                <label>보조 작업자</label>
                                <select
                                  value={editData.subWorkerId ?? ''}
                                  onChange={(e) => handleEditChange('subWorkerId', e.target.value ? Number(e.target.value) : null)}
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
                              {inquiry.status !== 'COMPLETED' && (
                                <button
                                  className="btn btn-sm btn-primary"
                                  onClick={(e: MouseEvent) => handleComplete(inquiry.id, e)}
                                >
                                  완료
                                </button>
                              )}
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={(e: MouseEvent) => {
                                  e.stopPropagation();
                                  handleDelete(inquiry.id);
                                }}
                              >
                                삭제
                              </button>
                            </div>
                            <div className="detail-content">
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
                              {inquiry.description && (
                                <div className="detail-row">
                                  <span className="detail-label">증상:</span>
                                  <span className="detail-text"><LinkItUrl>{inquiry.description}</LinkItUrl></span>
                                </div>
                              )}
                              {inquiry.solution && (
                                <div className="detail-row solution">
                                  <span className="detail-label">해결 내용:</span>
                                  <span className="detail-text"><LinkItUrl>{inquiry.solution}</LinkItUrl></span>
                                </div>
                              )}
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
    </div>
  );
}
