import type { FormEvent } from 'react';
import { INQUIRY_TYPES, INQUIRY_METHOD } from '../context/WikiContext';
import type {
  InquiryStatusEnum,
  InquiryStatusOption,
  InquiryTypeLabel,
  InquiryMethodLabel,
  StaffUser,
} from '../types';
import { BUILDINGS, type BuildingCode } from '../types';

export interface RoomFormItem {
  roomNumber: string;
  roomName: string;
}

export interface LocationGroup {
  buildingCode: BuildingCode | '';
  rooms: RoomFormItem[];
}

export interface InquiryFormData {
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

export const emptyRoom: RoomFormItem = { roomNumber: '', roomName: '' };
export const emptyLocationGroup: LocationGroup = { buildingCode: '', rooms: [{ roomNumber: '', roomName: '' }] };
export const emptyForm: InquiryFormData = {
  title: '',
  type: 'PC',
  description: '',
  requester: '',
  locations: [{ buildingCode: '', rooms: [{ roomNumber: '', roomName: '' }] }],
  status: 'PENDING',
  workerId: null,
  subWorkerId: null,
  method: '',
  solution: '',
};

interface InquiryFormProps {
  formData: InquiryFormData;
  onChange: <K extends keyof InquiryFormData>(field: K, value: InquiryFormData[K]) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  statusOptions: InquiryStatusOption[];
  staffUsers: StaffUser[];
}

export default function InquiryForm({ formData, onChange, onSubmit, onCancel, statusOptions, staffUsers }: InquiryFormProps) {
  return (
    <div className="iform-wrap">
      <div className="iform-header">
        <span className="iform-title">새 민원 등록</span>
        <button type="button" className="iform-cancel" onClick={onCancel}>✕</button>
      </div>

      <form onSubmit={onSubmit}>
        <div className="iform-grid">
          <div className="iform-field">
            <label className="iform-label">작업 이름 <span className="iform-required">*</span></label>
            <input
              type="text"
              className="iform-input"
              value={formData.title}
              onChange={(e) => onChange('title', e.target.value)}
              placeholder="예: IP 주소 설정 요청"
            />
          </div>
          <div className="iform-field">
            <label className="iform-label">요청자 <span className="iform-required">*</span></label>
            <input
              type="text"
              className="iform-input"
              value={formData.requester}
              onChange={(e) => onChange('requester', e.target.value)}
              placeholder="예: 간호학과 조교"
            />
          </div>

          <div className="iform-field iform-field-full">
            <label className="iform-label">위치</label>
            <div className="iform-locations">
              {formData.locations.map((group, gIdx) => (
                <div key={gIdx} className="iform-location-group">
                  <div className="iform-location-row">
                    <select
                      className="iform-select"
                      value={group.buildingCode}
                      onChange={(e) => {
                        const next = [...formData.locations];
                        next[gIdx] = { ...next[gIdx], buildingCode: e.target.value as BuildingCode | '' };
                        onChange('locations', next);
                      }}
                    >
                      <option value="">건물 선택</option>
                      {BUILDINGS.map((b) => (
                        <option key={b.code} value={b.code}>{b.label}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      className="iform-input iform-input-room"
                      value={group.rooms[0].roomNumber}
                      onChange={(e) => {
                        const next = [...formData.locations];
                        next[gIdx] = { ...next[gIdx], rooms: next[gIdx].rooms.map((r, i) => i === 0 ? { ...r, roomNumber: e.target.value } : r) };
                        onChange('locations', next);
                      }}
                      placeholder="호실 번호"
                    />
                    <input
                      type="text"
                      className="iform-input iform-input-room"
                      value={group.rooms[0].roomName}
                      onChange={(e) => {
                        const next = [...formData.locations];
                        next[gIdx] = { ...next[gIdx], rooms: next[gIdx].rooms.map((r, i) => i === 0 ? { ...r, roomName: e.target.value } : r) };
                        onChange('locations', next);
                      }}
                      placeholder="호실 이름"
                    />
                    <button
                      type="button"
                      className="iform-btn-ghost"
                      onClick={() => {
                        const next = [...formData.locations];
                        next[gIdx] = { ...next[gIdx], rooms: [...next[gIdx].rooms, emptyRoom] };
                        onChange('locations', next);
                      }}
                    >
                      + 호실
                    </button>
                    {formData.locations.length > 1 && (
                      <button
                        type="button"
                        className="iform-btn-danger-ghost"
                        onClick={() => onChange('locations', formData.locations.filter((_, i) => i !== gIdx))}
                      >
                        삭제
                      </button>
                    )}
                  </div>
                  {group.rooms.slice(1).map((room, rIdx) => (
                    <div key={rIdx + 1} className="iform-location-extra-row">
                      <input
                        type="text"
                        className="iform-input iform-input-room"
                        value={room.roomNumber}
                        onChange={(e) => {
                          const next = [...formData.locations];
                          next[gIdx] = { ...next[gIdx], rooms: next[gIdx].rooms.map((r, i) => i === rIdx + 1 ? { ...r, roomNumber: e.target.value } : r) };
                          onChange('locations', next);
                        }}
                        placeholder="호실 번호"
                      />
                      <input
                        type="text"
                        className="iform-input iform-input-room"
                        value={room.roomName}
                        onChange={(e) => {
                          const next = [...formData.locations];
                          next[gIdx] = { ...next[gIdx], rooms: next[gIdx].rooms.map((r, i) => i === rIdx + 1 ? { ...r, roomName: e.target.value } : r) };
                          onChange('locations', next);
                        }}
                        placeholder="호실 이름"
                      />
                      <button
                        type="button"
                        className="iform-btn-danger-ghost"
                        onClick={() => {
                          const next = [...formData.locations];
                          next[gIdx] = { ...next[gIdx], rooms: next[gIdx].rooms.filter((_, i) => i !== rIdx + 1) };
                          onChange('locations', next);
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
                className="iform-btn-ghost"
                onClick={() => onChange('locations', [...formData.locations, emptyLocationGroup])}
              >
                + 건물 추가
              </button>
            </div>
          </div>

          <div className="iform-field">
            <label className="iform-label">유형</label>
            <select
              className="iform-select"
              value={formData.type}
              onChange={(e) => onChange('type', e.target.value as InquiryTypeLabel)}
            >
              {INQUIRY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="iform-field">
            <label className="iform-label">상태</label>
            <select
              className="iform-select"
              value={formData.status}
              onChange={(e) => onChange('status', e.target.value as InquiryStatusEnum)}
            >
              {statusOptions.map((s) => (
                <option key={s.code} value={s.code}>{s.displayName}</option>
              ))}
            </select>
          </div>
          <div className="iform-field">
            <label className="iform-label">작업자</label>
            <select
              className="iform-select"
              value={formData.workerId ?? ''}
              onChange={(e) => onChange('workerId', e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">선택</option>
              {staffUsers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="iform-field">
            <label className="iform-label">보조 작업자</label>
            <select
              className="iform-select"
              value={formData.subWorkerId ?? ''}
              onChange={(e) => onChange('subWorkerId', e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">선택</option>
              {staffUsers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="iform-field">
            <label className="iform-label">처리 방식</label>
            <select
              className="iform-select"
              value={formData.method}
              onChange={(e) => onChange('method', e.target.value as InquiryMethodLabel)}
            >
              <option value="">선택</option>
              {INQUIRY_METHOD.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="iform-field iform-field-full">
            <label className="iform-label">증상 <span className="iform-required">*</span></label>
            <textarea
              className="iform-textarea"
              rows={3}
              value={formData.description}
              onChange={(e) => onChange('description', e.target.value)}
              placeholder="문제 상황이나 요청 내용을 설명해주세요"
            />
          </div>
          <div className="iform-field iform-field-full">
            <label className="iform-label">해결 내용</label>
            <textarea
              className="iform-textarea"
              rows={2}
              value={formData.solution}
              onChange={(e) => onChange('solution', e.target.value)}
              placeholder="해결 방법을 입력하세요"
            />
          </div>
        </div>

        <div className="iform-footer">
          <button type="button" className="iform-btn-secondary" onClick={onCancel}>취소</button>
          <button type="submit" className="iform-btn-primary">등록</button>
        </div>
      </form>
    </div>
  );
}
