import { useState, useEffect, useRef, Fragment } from 'react';
import { createPortal } from 'react-dom';
import html2canvas from 'html2canvas';
import { useParams } from 'react-router-dom';
import { useWiki } from '../context/WikiContext';
import { timetableApi } from '../api/timetableApi';
import type {
  ClassroomResponse,
  ClassroomSoftwareResponse,
  SoftwareResponse,
  ScheduleResponse,
  MakeupResponse,
  ScheduleUpdateRequest,
} from '../api/timetableApi';
import '../styles/timetablestyle.css';

type TimetableTab = 'schedule' | 'register' | 'makeup' | 'classroom' | 'software' | 'swstatus';

// ── Helpers ──────────────────────────────────────────

function getCurrentSemester(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 3 && month <= 8) return `${year}-1`;
  if (month >= 9) return `${year}-2`;
  return `${year - 1}-2`;
}


function buildCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function formatSemester(s: string): string {
  const [year, term] = s.split('-');
  return `${year}년도 ${term}학기`;
}

function padTwo(n: number): string {
  return String(n).padStart(2, '0');
}

// ── Icons ──────────────────────────────────────────

const IconClose = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

// ── Constants ──────────────────────────────────────────

const DAY_PERIODS = Array.from({ length: 10 }, (_, i) => i + 1);
const NIGHT_PERIODS = Array.from({ length: 6 }, (_, i) => i + 1);
const DAYS = ['월', '화', '수', '목', '금'];
const DAY_HEADERS = ['일', '월', '화', '수', '목', '금', '토'];

const PERIOD_TIMES: Record<'DAY' | 'NIGHT', { startTime: string; endTime: string }[]> = {
  DAY: [
    { startTime: '09:00', endTime: '09:50' },
    { startTime: '10:00', endTime: '10:50' },
    { startTime: '11:00', endTime: '11:50' },
    { startTime: '12:00', endTime: '12:50' },
    { startTime: '13:00', endTime: '13:50' },
    { startTime: '14:00', endTime: '14:50' },
    { startTime: '15:00', endTime: '15:50' },
    { startTime: '16:00', endTime: '16:50' },
    { startTime: '17:00', endTime: '17:50' },
    { startTime: '18:00', endTime: '18:50' },
  ],
  NIGHT: [
    { startTime: '17:30', endTime: '18:15' },
    { startTime: '18:15', endTime: '19:00' },
    { startTime: '19:05', endTime: '19:50' },
    { startTime: '19:50', endTime: '20:35' },
    { startTime: '20:40', endTime: '21:25' },
    { startTime: '21:25', endTime: '22:10' },
  ],
};

const ALL_PERIOD_OPTIONS = [
  ...PERIOD_TIMES.DAY.map((t, i) => ({ value: `DAY:${i + 1}`, label: `주${i + 1} (${t.startTime})`, endLabel: `주${i + 1} (~${t.endTime})`, periodType: 'DAY' as const, period: i + 1 })),
  ...PERIOD_TIMES.NIGHT.map((t, i) => ({ value: `NIGHT:${i + 1}`, label: `야${i + 1} (${t.startTime})`, endLabel: `야${i + 1} (~${t.endTime})`, periodType: 'NIGHT' as const, period: i + 1 })),
];

function getMakeupTimes(type: 'DAY' | 'NIGHT', periodStart: number, periodEnd: number) {
  const times = PERIOD_TIMES[type];
  return {
    startTime: times[periodStart - 1].startTime,
    endTime: times[periodEnd - 1].endTime,
  };
}

// ── Component ──────────────────────────────────────────

export default function TimetablePage() {
  const { tab } = useParams<{ tab: string }>();
  const { currentUser } = useWiki();
  const activeTab: TimetableTab = (tab as TimetableTab) || 'schedule';

  // ─ Common ─
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(t);
  }, [message]);

  // ─ Schedule ─
  const [semester, setSemester] = useState(getCurrentSemester());
  const [semesters, setSemesters] = useState<string[]>([]);
  const [schedules, setSchedules] = useState<ScheduleResponse[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [schedDetailModal, setSchedDetailModal] = useState<ScheduleResponse | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => Promise<void> } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [unassigned, setUnassigned] = useState<ScheduleResponse[]>([]);
  const [classroomsForAssign, setClassroomsForAssign] = useState<ClassroomResponse[]>([]);
  const [assignMap, setAssignMap] = useState<Record<number, string>>({});
  const [assignLoading, setAssignLoading] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [editRowId, setEditRowId] = useState<number | null>(null);
  const [expandedSwNotes, setExpandedSwNotes] = useState<Set<number>>(new Set());
  const [editRowForm, setEditRowForm] = useState<{
    priority: string; department: string; grade: string; section: string;
    courseName: string; professor: string; softwareNote: string;
    hasOption: boolean; optionNote: string;
    periodType: 'DAY' | 'NIGHT';
    dayOfWeek: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI';
    periodStart: string; periodEnd: string; classroomId: string;
  }>({
    priority: '', department: '', grade: '', section: '', courseName: '',
    professor: '', softwareNote: '', hasOption: false, optionNote: '',
    periodType: 'DAY', dayOfWeek: 'MON', periodStart: '', periodEnd: '',
    classroomId: '',
  });
  const [editRowLoading, setEditRowLoading] = useState(false);
  const [schedAddModal, setSchedAddModal] = useState(false);
  const [schedAddLoading, setSchedAddLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [schedAddStart, setSchedAddStart] = useState<{
    day: string; pType: '주' | '야'; period: number; roomNumber: number;
  } | null>(null);
  const [draggingSchedId, setDraggingSchedId] = useState<number | null>(null);
  const [schedContextMenu, setSchedContextMenu] = useState<{ x: number; y: number; sched: ScheduleResponse } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragOverCell, setDragOverCell] = useState<{
    day: string; pType: '주' | '야'; period: number; roomNumber: number;
  } | null>(null);
  const [schedAddForm, setSchedAddForm] = useState<{
    priority: string; department: string; grade: string; section: string;
    courseName: string; professor: string; softwareNote: string;
    hasOption: boolean; optionNote: string;
    periodType: 'DAY' | 'NIGHT';
    dayOfWeek: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI';
    periodStart: string; periodEnd: string; classroomId: string;
  }>({
    priority: '', department: '', grade: '', section: '', courseName: '',
    professor: '', softwareNote: '', hasOption: false, optionNote: '',
    periodType: 'DAY', dayOfWeek: 'MON', periodStart: '', periodEnd: '',
    classroomId: '',
  });
  const [autoSwModal, setAutoSwModal] = useState<{ semester: string; classroomCount: number; assignedCount: number; failureCount: number } | null>(null);
  const [autoSwLoading, setAutoSwLoading] = useState(false);
  const [allClassroomSoftwares, setAllClassroomSoftwares] = useState<{ classroomId: number; roomNumber: number; floor: number; grade: number; softwares: { id: number; softwareId: number; softwareName: string; default: boolean }[] }[]>([]);
  const appFileRef = useRef<HTMLInputElement>(null);
  const ttFileRef = useRef<HTMLInputElement>(null);
  const scheduleGridRef = useRef<HTMLDivElement>(null);
  const [imageDownloadLoading, setImageDownloadLoading] = useState(false);

  // ─ Makeup ─
  const [makeupYear, setMakeupYear] = useState(new Date().getFullYear());
  const [makeupMonth, setMakeupMonth] = useState(new Date().getMonth() + 1);
  const [makeups, setMakeups] = useState<MakeupResponse[]>([]);
  const [makeupLoading, setMakeupLoading] = useState(false);
  const [makeupDetailModal, setMakeupDetailModal] = useState<MakeupResponse | null>(null);
  const [makeupRegisterModal, setMakeupRegisterModal] = useState(false);
  const [makeupRows, setMakeupRows] = useState<{
    key: number; department: string; date: string;
    periodType: 'DAY' | 'NIGHT'; periodStart: number; periodEnd: number;
    courseName: string; professor: string; softwareNote: string; purpose: string;
    classroomId: number; roomNumber: number;
    availableRooms: ClassroomResponse[] | null; roomsLoading: boolean;
  }[]>([]);
  const [makeupRowKey, setMakeupRowKey] = useState(0);
  const [makeupSubmitLoading, setMakeupSubmitLoading] = useState(false);
  const [autoAssignLoading, setAutoAssignLoading] = useState(false);
  const [fillDrag, setFillDrag] = useState<{ field: keyof MakeupRow; sourceKey: number; targetKey: number | null } | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<number>>(new Set());
  const [rowDrag, setRowDrag] = useState<{ startKey: number; endKey: number } | null>(null);
  const [openRoomPickerKey, setOpenRoomPickerKey] = useState<number | null>(null);
  const [roomPickerPos, setRoomPickerPos] = useState<{ top: number; left: number } | null>(null);

  // ─ Classroom ─
  const [classrooms, setClassrooms] = useState<ClassroomResponse[]>([]);
  const [classroomLoading, setClassroomLoading] = useState(false);
  const [crForm, setCrForm] = useState({ roomNumber: '', floor: '', grade: '1' });
  const [crFormLoading, setCrFormLoading] = useState(false);
  const [expandedCrId, setExpandedCrId] = useState<number | null>(null);
  const [crSoftwares, setCrSoftwares] = useState<Record<number, ClassroomSoftwareResponse[]>>({});
  const [editGrades, setEditGrades] = useState<Record<number, number>>({});
  const [addSwSelect, setAddSwSelect] = useState<Record<number, string>>({});
  const [allSoftwares, setAllSoftwares] = useState<SoftwareResponse[]>([]);

  // ─ Software ─
  const [softwares, setSoftwares] = useState<SoftwareResponse[]>([]);
  const [softwareLoading, setSoftwareLoading] = useState(false);
  const [swForm, setSwForm] = useState({ name: '', aliases: '', isDefault: false });
  const [swFormLoading, setSwFormLoading] = useState(false);
  const [editAliasMode, setEditAliasMode] = useState<Record<number, boolean>>({});
  const [editAliasText, setEditAliasText] = useState<Record<number, string>>({});
  const [aliasLoading, setAliasLoading] = useState<number | null>(null);

  // ── Permission check ──
  const isTimetableAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'TA';

  // 시간표/보강 탭은 전체 공개, 나머지 탭은 ADMIN/TA 전용
  const isRestrictedTab = activeTab !== 'schedule' && activeTab !== 'makeup';
  if (isRestrictedTab && !isTimetableAdmin) {
    return (
      <div className="page">
        <h1 className="page-title">접근 권한이 없습니다</h1>
        <p>이 페이지는 관리자 또는 TA만 접근할 수 있습니다.</p>
      </div>
    );
  }

  // ── Effects ──
  useEffect(() => {
    loadSemesters();
  }, []);

  useEffect(() => {
    setMessage(null);
    if (activeTab === 'schedule') {
      loadSchedules();
      loadClassroomsForAssign();
    } else if (activeTab === 'register') {
      loadSchedules();
      loadClassroomsForAssign();
    } else if (activeTab === 'makeup') {
      loadMakeups();
      loadClassroomsForAssign();
    } else if (activeTab === 'classroom') {
      loadClassrooms();
      loadAllSoftwares();
    } else if (activeTab === 'software') {
      loadSoftwares();
    } else if (activeTab === 'swstatus') {
      loadAllClassroomSoftwares();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'makeup') loadMakeups();
  }, [makeupYear, makeupMonth]);

  // ── Loaders ──
  const loadAllClassroomSoftwares = async () => {
    try {
      const data = await timetableApi.classrooms.getAllSoftwares();
      setAllClassroomSoftwares(data);
    } catch {
      setMessage({ type: 'error', text: '강의실 소프트웨어 목록을 불러오는데 실패했습니다.' });
    }
  };

  const loadSemesters = async () => {
    try {
      const data = await timetableApi.schedules.getSemesters();
      setSemesters(data);
    } catch {
      // ignore silently
    }
  };

  const loadSchedules = async () => {
    setScheduleLoading(true);
    try {
      const data = await timetableApi.schedules.getBySemester(semester);
      setSchedules(data);
      setUnassigned(data.filter((s) => !(s.roomNumber > 0)));
    } catch {
      setMessage({ type: 'error', text: '시간표를 불러오는데 실패했습니다.' });
    } finally {
      setScheduleLoading(false);
    }
  };

  const loadClassroomsForAssign = async () => {
    try {
      const data = await timetableApi.classrooms.getAll();
      setClassroomsForAssign(data);
    } catch {
      // ignore silently
    }
  };

  const loadMakeups = async () => {
    setMakeupLoading(true);
    try {
      const data = await timetableApi.makeups.getByMonth(makeupYear, makeupMonth);
      setMakeups(data);
    } catch {
      setMessage({ type: 'error', text: '보강 목록을 불러오는데 실패했습니다.' });
    } finally {
      setMakeupLoading(false);
    }
  };

  const loadClassrooms = async () => {
    setClassroomLoading(true);
    try {
      const data = await timetableApi.classrooms.getAll();
      setClassrooms(data);
      const initialGrades: Record<number, number> = {};
      data.forEach((c) => { initialGrades[c.id] = c.grade; });
      setEditGrades(initialGrades);
    } catch {
      setMessage({ type: 'error', text: '강의실 목록을 불러오는데 실패했습니다.' });
    } finally {
      setClassroomLoading(false);
    }
  };

  const loadAllSoftwares = async () => {
    try {
      const data = await timetableApi.softwares.getAll();
      setAllSoftwares(data);
    } catch {
      // ignore silently
    }
  };

  const loadCrSoftwares = async (crId: number) => {
    try {
      const data = await timetableApi.classrooms.getSoftwares(crId);
      setCrSoftwares((prev) => ({ ...prev, [crId]: data }));
    } catch {
      setMessage({ type: 'error', text: '소프트웨어 목록을 불러오는데 실패했습니다.' });
    }
  };

  const loadSoftwares = async () => {
    setSoftwareLoading(true);
    try {
      const data = await timetableApi.softwares.getAll();
      setSoftwares(data);
    } catch {
      setMessage({ type: 'error', text: '소프트웨어 목록을 불러오는데 실패했습니다.' });
    } finally {
      setSoftwareLoading(false);
    }
  };

  // ── Schedule Handlers ──
  const handleQuerySchedule = async () => {
    setScheduleLoading(true);
    try {
      const data = await timetableApi.schedules.getBySemester(semester);
      setSchedules(data);
    } catch {
      setMessage({ type: 'error', text: '시간표를 불러오는데 실패했습니다.' });
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!scheduleGridRef.current) return;
    setImageDownloadLoading(true);
    try {
      const canvas = await html2canvas(scheduleGridRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      link.download = `시간표_${semester}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      setMessage({ type: 'error', text: '이미지 저장에 실패했습니다.' });
    } finally {
      setImageDownloadLoading(false);
    }
  };

  const handleImportApp = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await timetableApi.schedules.importApplication(semester, file);
      setMessage({ type: 'success', text: '수강신청 파일이 업로드되었습니다.' });
      await loadSchedules();
    } catch {
      setMessage({ type: 'error', text: '수강신청 파일 업로드에 실패했습니다.' });
    } finally {
      e.target.value = '';
    }
  };

  const handleImportTimetable = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await timetableApi.schedules.importTimetable(semester, file);
      setMessage({ type: 'success', text: '완성 시간표가 업로드되었습니다.' });
      await loadSchedules();
    } catch {
      setMessage({ type: 'error', text: '완성 시간표 업로드에 실패했습니다.' });
    } finally {
      e.target.value = '';
    }
  };

  const handleExportExcel = async () => {
    try {
      const blob = await timetableApi.schedules.exportExcel(semester);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${semester}_시간표.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setMessage({ type: 'error', text: '엑셀 다운로드에 실패했습니다.' });
    }
  };

  const openConfirm = (title: string, message: string, onConfirm: () => Promise<void>) =>
    setConfirmModal({ title, message, onConfirm });

  const handleDeleteAllSchedules = () => {
    openConfirm('전체 시간표 삭제', `${formatSemester(semester)} 전체 시간표를 삭제하시겠습니까?`, async () => {
      try {
        await timetableApi.schedules.deleteAllBySemester(semester);
        setMessage({ type: 'success', text: '전체 시간표가 삭제되었습니다.' });
        await loadSchedules();
      } catch {
        setMessage({ type: 'error', text: '전체 삭제에 실패했습니다.' });
      }
    });
  };

  const handleScheduleDelete = (id: number) => {
    openConfirm('강의 삭제', '이 강의를 삭제하시겠습니까?', async () => {
      setSchedDetailModal(null);
      setDeleteLoading(id);
      try {
        await timetableApi.schedules.delete(id);
        setMessage({ type: 'success', text: '강의가 삭제되었습니다.' });
        await loadSchedules();
      } catch {
        setMessage({ type: 'error', text: '삭제에 실패했습니다.' });
      } finally {
        setDeleteLoading(null);
      }
    });
  };

  const handleSchedChipDelete = async () => {
    if (!schedDetailModal) return;
    setSchedDeleteLoading(true);
    try {
      await timetableApi.schedules.delete(schedDetailModal.id);
      setMessage({ type: 'success', text: '강의가 삭제되었습니다.' });
      setSchedDetailModal(null);
      await loadSchedules();
    } catch {
      setMessage({ type: 'error', text: '삭제에 실패했습니다.' });
    } finally {
      setSchedDeleteLoading(false);
    }
  };

  const handleAssign = async (scheduleId: number) => {
    const crIdStr = assignMap[scheduleId];
    if (!crIdStr) return;
    setAssignLoading(scheduleId);
    try {
      await timetableApi.schedules.assignClassroom(scheduleId, Number(crIdStr));
      setMessage({ type: 'success', text: '강의실이 배정되었습니다.' });
      await loadSchedules();
    } catch {
      setMessage({ type: 'error', text: '강의실 배정에 실패했습니다.' });
    } finally {
      setAssignLoading(null);
    }
  };

  const DAY_TO_API: Record<string, 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI'> = {
    '월': 'MON', '화': 'TUE', '수': 'WED', '목': 'THU', '금': 'FRI',
  };
  const PERIOD_TO_API: Record<string, 'DAY' | 'NIGHT'> = { '주': 'DAY', '야': 'NIGHT' };

  const startEditRow = (s: ScheduleResponse) => {
    const classroom = classroomsForAssign.find((c) => c.roomNumber === s.roomNumber);
    setEditRowId(s.id);
    setEditRowForm({
      priority: s.priority != null ? String(s.priority) : '',
      department: s.department,
      grade: s.grade != null ? String(s.grade) : '',
      section: s.section || '',
      courseName: s.courseName,
      professor: s.professor,
      softwareNote: s.softwareNote || '',
      hasOption: s.hasOption,
      optionNote: s.optionNote || '',
      periodType: PERIOD_TO_API[s.periodType] || 'DAY',
      dayOfWeek: DAY_TO_API[s.dayOfWeek] || 'MON',
      periodStart: String(s.periodStart),
      periodEnd: String(s.periodEnd),
      classroomId: classroom ? String(classroom.id) : '',
    });
  };

  const handleScheduleUpdate = async () => {
    if (!editRowId) return;
    setEditRowLoading(true);
    try {
      const body: ScheduleUpdateRequest = {
        classroomId: editRowForm.classroomId ? Number(editRowForm.classroomId) : undefined,
        clearClassroom: editRowForm.classroomId ? undefined : true,
        department: editRowForm.department || undefined,
        grade: editRowForm.grade ? Number(editRowForm.grade) : undefined,
        section: editRowForm.section || undefined,
        courseName: editRowForm.courseName || undefined,
        professor: editRowForm.professor || undefined,
        dayOfWeek: editRowForm.dayOfWeek,
        periodType: editRowForm.periodType,
        periodStart: editRowForm.periodStart ? Number(editRowForm.periodStart) : undefined,
        periodEnd: editRowForm.periodEnd ? Number(editRowForm.periodEnd) : undefined,
        softwareNote: editRowForm.softwareNote || undefined,
        hasOption: editRowForm.hasOption,
        optionNote: editRowForm.optionNote || undefined,
        priority: editRowForm.priority ? Number(editRowForm.priority) : undefined,
      };
      await timetableApi.schedules.update(editRowId, body);
      setMessage({ type: 'success', text: '강의가 수정되었습니다.' });
      setEditRowId(null);
      await loadSchedules();
    } catch {
      setMessage({ type: 'error', text: '수정에 실패했습니다.' });
    } finally {
      setEditRowLoading(false);
    }
  };

  const handleEmptyCellClick = (
    day: string,
    pType: '주' | '야',
    period: number,
    roomNumber: number,
  ) => {
    if (!schedAddStart) {
      // 1단계: 시작 교시 선택
      setSchedAddStart({ day, pType, period, roomNumber });
    } else if (
      schedAddStart.day === day &&
      schedAddStart.pType === pType &&
      schedAddStart.roomNumber === roomNumber
    ) {
      // 2단계: 같은 호실+요일+주야 → 종료 교시 선택 후 모달 오픈
      const periodStart = Math.min(schedAddStart.period, period);
      const periodEnd = Math.max(schedAddStart.period, period);
      const classroom = classroomsForAssign.find((c) => c.roomNumber === roomNumber);
      setSchedAddForm((prev) => ({
        ...prev,
        dayOfWeek: DAY_TO_API[day],
        periodType: pType === '주' ? 'DAY' : 'NIGHT',
        periodStart: String(periodStart),
        periodEnd: String(periodEnd),
        classroomId: classroom ? String(classroom.id) : '',
      }));
      setSchedAddStart(null);
      setSchedAddModal(true);
    } else {
      // 다른 호실/요일 클릭 → 시작점 재선택
      setSchedAddStart({ day, pType, period, roomNumber });
    }
  };

  useEffect(() => {
    if (!schedContextMenu) return;
    const onDown = () => setSchedContextMenu(null);
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [schedContextMenu]);

  const handleSchedContextDelete = () => {
    if (!schedContextMenu) return;
    const sched = schedContextMenu.sched;
    setSchedContextMenu(null);
    openConfirm('강의 삭제', `"${sched.courseName}" 강의를 삭제하시겠습니까?`, async () => {
      try {
        await timetableApi.schedules.delete(sched.id);
        setSchedules((prev) => prev.filter((s) => s.id !== sched.id));
        setMessage({ type: 'success', text: '강의가 삭제되었습니다.' });
      } catch {
        setMessage({ type: 'error', text: '삭제에 실패했습니다.' });
      }
    });
  };

  const handleSchedDrop = async (day: string, pType: '주' | '야', period: number, roomNumber: number) => {
    if (draggingSchedId === null) return;
    const sched = schedules.find((s) => s.id === draggingSchedId);
    if (!sched) return;

    const span = sched.periodEnd - sched.periodStart;
    const newPeriodStart = period - dragOffset;
    const newPeriodEnd = newPeriodStart + span;
    const maxPeriod = pType === '주' ? DAY_PERIODS.length : NIGHT_PERIODS.length;

    if (newPeriodStart < 1 || newPeriodEnd > maxPeriod) {
      setMessage({ type: 'error', text: '교시 범위를 초과해 이동할 수 없습니다.' });
      setDraggingSchedId(null);
      return;
    }

    const classroom = classroomsForAssign.find((c) => c.roomNumber === roomNumber);
    try {
      const updated = await timetableApi.schedules.update(draggingSchedId, {
        dayOfWeek: DAY_TO_API[day],
        periodType: pType === '주' ? 'DAY' : 'NIGHT',
        periodStart: newPeriodStart,
        periodEnd: newPeriodEnd,
        classroomId: classroom?.id,
        clearClassroom: !classroom,
      });
      setSchedules((prev) => prev.map((s) => s.id === updated.id ? updated : s));
      setMessage({ type: 'success', text: '강의가 이동되었습니다.' });
    } catch {
      setMessage({ type: 'error', text: '강의 이동에 실패했습니다.' });
    } finally {
      setDraggingSchedId(null);
      setDragOverCell(null);
    }
  };

  const resetSchedAddForm = () => {
    setSchedAddForm({
      priority: '', department: '', grade: '', section: '', courseName: '',
      professor: '', softwareNote: '', hasOption: false, optionNote: '',
      periodType: 'DAY', dayOfWeek: 'MON', periodStart: '', periodEnd: '',
      classroomId: '',
    });
  };

  const handleScheduleAdd = async () => {
    if (!schedAddForm.department || !schedAddForm.courseName || !schedAddForm.professor ||
        !schedAddForm.periodStart || !schedAddForm.periodEnd) {
      setMessage({ type: 'error', text: '학과, 교과목, 교수명, 교시를 모두 입력해주세요.' });
      return;
    }
    setSchedAddLoading(true);
    try {
      await timetableApi.schedules.create({
        semester,
        classroomId: schedAddForm.classroomId ? Number(schedAddForm.classroomId) : undefined,
        department: schedAddForm.department,
        grade: schedAddForm.grade ? Number(schedAddForm.grade) : undefined,
        section: schedAddForm.section || undefined,
        courseName: schedAddForm.courseName,
        professor: schedAddForm.professor,
        dayOfWeek: schedAddForm.dayOfWeek,
        periodType: schedAddForm.periodType,
        periodStart: Number(schedAddForm.periodStart),
        periodEnd: Number(schedAddForm.periodEnd),
        softwareNote: schedAddForm.softwareNote || undefined,
        hasOption: schedAddForm.hasOption,
        optionNote: schedAddForm.optionNote || undefined,
        priority: schedAddForm.priority ? Number(schedAddForm.priority) : undefined,
      });
      setMessage({ type: 'success', text: '강의가 추가되었습니다.' });
      setSchedAddModal(false);
      resetSchedAddForm();
      await loadSchedules();
    } catch {
      setMessage({ type: 'error', text: '강의 추가에 실패했습니다.' });
    } finally {
      setSchedAddLoading(false);
    }
  };

  const handleAutoAssignSoftwares = () => {
    openConfirm('소프트웨어 자동 배정', `${formatSemester(semester)} 시간표 기준으로 강의실별 소프트웨어를 자동 배정합니다. 기존 배정이 초기화됩니다.`, async () => {
    setAutoSwLoading(true);
    try {
      const result = await timetableApi.classrooms.autoAssignSoftwares(semester);
      const allSw = await timetableApi.classrooms.getAllSoftwares();
      setAllClassroomSoftwares(allSw);
      setAutoSwModal(result);
    } catch {
      setMessage({ type: 'error', text: '소프트웨어 자동 배정에 실패했습니다.' });
    } finally {
      setAutoSwLoading(false);
    }
    });
  };

  // ── Makeup Handlers ──
  const handleMakeupNavPrev = () => {
    if (makeupMonth === 1) { setMakeupYear((y) => y - 1); setMakeupMonth(12); }
    else setMakeupMonth((m) => m - 1);
  };

  const handleMakeupNavNext = () => {
    if (makeupMonth === 12) { setMakeupYear((y) => y + 1); setMakeupMonth(1); }
    else setMakeupMonth((m) => m + 1);
  };

  type MakeupRow = { key: number; department: string; date: string; periodType: 'DAY' | 'NIGHT'; periodStart: number; periodEnd: number; courseName: string; professor: string; softwareNote: string; purpose: string; classroomId: number; roomNumber: number; availableRooms: ClassroomResponse[] | null; roomsLoading: boolean; };
  const newMakeupRow = (key: number): MakeupRow => ({
    key, department: '', date: '', periodType: 'DAY', periodStart: 0, periodEnd: 0,
    courseName: '', professor: '', softwareNote: '', purpose: '',
    classroomId: 0, roomNumber: 0, availableRooms: null, roomsLoading: false,
  });

  const updateRow = (key: number, updates: Partial<MakeupRow>) =>
    setMakeupRows((prev) => prev.map((r) => r.key === key ? { ...r, ...updates } : r));

  const handleRowTimeChange = async (key: number, row: MakeupRow, updates: Partial<MakeupRow>) => {
    const updated = { ...row, ...updates };
    setMakeupRows((prev) => prev.map((r) => r.key === key
      ? { ...updated, availableRooms: null, classroomId: 0, roomNumber: 0, roomsLoading: false }
      : r));
    if (updated.date && updated.periodStart > 0 && updated.periodEnd > 0) {
      setMakeupRows((prev) => prev.map((r) => r.key === key ? { ...r, ...updated, availableRooms: null, classroomId: 0, roomNumber: 0, roomsLoading: true } : r));
      try {
        const { startTime, endTime } = getMakeupTimes(updated.periodType, updated.periodStart, updated.periodEnd);
        const data = await timetableApi.makeups.getAvailableClassrooms({ date: updated.date, startTime, endTime });
        setMakeupRows((prev) => prev.map((r) => r.key === key ? { ...r, availableRooms: data, roomsLoading: false } : r));
      } catch {
        setMakeupRows((prev) => prev.map((r) => r.key === key ? { ...r, roomsLoading: false } : r));
      }
    }
  };

  const handleAutoAssign = async () => {
    setAutoAssignLoading(true);
    try {
      const toAssign = makeupRows.filter((r) => r.classroomId === 0 && r.date && r.periodStart > 0 && r.periodEnd > 0);
      const groups = new Map<string, typeof toAssign>();
      for (const r of toAssign) {
        const { startTime, endTime } = getMakeupTimes(r.periodType, r.periodStart, r.periodEnd);
        const k = `${r.date}_${startTime}_${endTime}`;
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(r);
      }
      const assignments = new Map<number, { classroomId: number; roomNumber: number }>();
      for (const rows of groups.values()) {
        const first = rows[0];
        const { startTime, endTime } = getMakeupTimes(first.periodType, first.periodStart, first.periodEnd);
        const available = first.availableRooms ?? await timetableApi.makeups.getAvailableClassrooms({ date: first.date, startTime, endTime });
        const taken = new Set(makeupRows.filter((r) => {
          if (!r.classroomId) return false;
          const { startTime: s, endTime: e } = getMakeupTimes(r.periodType, r.periodStart, r.periodEnd);
          return r.date === first.date && s === startTime && e === endTime;
        }).map((r) => r.classroomId));
        let idx = 0;
        for (const r of rows) {
          while (idx < available.length && taken.has(available[idx].id)) idx++;
          if (idx < available.length) {
            assignments.set(r.key, { classroomId: available[idx].id, roomNumber: available[idx].roomNumber });
            taken.add(available[idx].id);
            idx++;
          }
        }
      }
      if (assignments.size > 0)
        setMakeupRows((prev) => prev.map((r) => { const a = assignments.get(r.key); return a ? { ...r, ...a } : r; }));
      else
        setMessage({ type: 'error', text: '배정 가능한 강의실이 없습니다.' });
    } catch {
      setMessage({ type: 'error', text: '자동 배정에 실패했습니다.' });
    } finally {
      setAutoAssignLoading(false);
    }
  };

  const handleMakeupBatchSubmit = async () => {
    const valid = makeupRows.filter((r) => r.department && r.date && r.periodStart > 0 && r.periodEnd > 0 && r.classroomId > 0);
    if (valid.length === 0) { setMessage({ type: 'error', text: '학과, 날짜, 시간, 강의실이 모두 입력된 항목이 없습니다.' }); return; }
    setMakeupSubmitLoading(true);
    try {
      const requests = valid.map((r) => {
        const { startTime, endTime } = getMakeupTimes(r.periodType, r.periodStart, r.periodEnd);
        return { classroomId: r.classroomId, department: r.department, courseName: r.courseName || undefined, professor: r.professor || undefined, date: r.date, startTime, endTime, softwareNote: r.softwareNote || undefined, purpose: r.purpose || undefined };
      });
      await timetableApi.makeups.createBatch(requests);
      setMessage({ type: 'success', text: `보강 ${valid.length}건이 등록되었습니다.` });
      setMakeupRegisterModal(false);
      setMakeupRows([]);
      await loadMakeups();
    } catch {
      setMessage({ type: 'error', text: '보강 등록에 실패했습니다.' });
    } finally {
      setMakeupSubmitLoading(false);
    }
  };

  useEffect(() => {
    if (!fillDrag) return;
    const onUp = () => {
      if (fillDrag.targetKey !== null && fillDrag.targetKey !== fillDrag.sourceKey) {
        const sourceIdx = makeupRows.findIndex((r) => r.key === fillDrag.sourceKey);
        const targetIdx = makeupRows.findIndex((r) => r.key === fillDrag.targetKey);
        if (sourceIdx >= 0 && targetIdx > sourceIdx) {
          const source = makeupRows[sourceIdx];
          const toFill = makeupRows.slice(sourceIdx + 1, targetIdx + 1);
          for (const r of toFill) {
            if (['department', 'courseName', 'professor', 'softwareNote', 'purpose'].includes(fillDrag.field)) {
              updateRow(r.key, { [fillDrag.field]: source[fillDrag.field] });
            } else if (fillDrag.field === 'date') {
              handleRowTimeChange(r.key, r, { date: source.date });
            } else if (fillDrag.field === 'periodStart') {
              const keepEnd = r.periodEnd > 0 && r.periodType === source.periodType && r.periodEnd >= source.periodStart ? r.periodEnd : source.periodStart;
              handleRowTimeChange(r.key, r, { periodType: source.periodType, periodStart: source.periodStart, periodEnd: keepEnd });
            } else if (fillDrag.field === 'periodEnd') {
              handleRowTimeChange(r.key, r, { periodEnd: source.periodEnd });
            }
          }
        }
      }
      setFillDrag(null);
    };
    document.addEventListener('mouseup', onUp);
    return () => document.removeEventListener('mouseup', onUp);
  }, [fillDrag, makeupRows]);

  useEffect(() => {
    if (!rowDrag) return;
    const si = makeupRows.findIndex((r) => r.key === rowDrag.startKey);
    const ei = makeupRows.findIndex((r) => r.key === rowDrag.endKey);
    const [from, to] = si <= ei ? [si, ei] : [ei, si];
    setSelectedRowKeys(new Set(makeupRows.slice(from, to + 1).map((r) => r.key)));
  }, [rowDrag, makeupRows]);

  useEffect(() => {
    if (!rowDrag) return;
    const onUp = () => setRowDrag(null);
    document.addEventListener('mouseup', onUp);
    return () => document.removeEventListener('mouseup', onUp);
  }, [rowDrag]);

  useEffect(() => {
    if (openRoomPickerKey === null) return;
    const onDown = (e: MouseEvent) => {
      const picker = document.querySelector('.tt-room-picker-popup');
      if (picker && picker.contains(e.target as Node)) return;
      setOpenRoomPickerKey(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [openRoomPickerKey]);

  const handleMakeupDelete = (id: number) => {
    openConfirm('보강 삭제', '이 보강을 삭제하시겠습니까?', async () => {
      try {
        await timetableApi.makeups.delete(id);
        setMessage({ type: 'success', text: '보강이 삭제되었습니다.' });
        setMakeupDetailModal(null);
        await loadMakeups();
      } catch {
        setMessage({ type: 'error', text: '보강 삭제에 실패했습니다.' });
      }
    });
  };

  // ── Classroom Handlers ──
  const handleCrCreate = async () => {
    if (!crForm.roomNumber || !crForm.floor) {
      setMessage({ type: 'error', text: '호실 번호와 층을 입력해주세요.' });
      return;
    }
    setCrFormLoading(true);
    try {
      await timetableApi.classrooms.create({
        roomNumber: Number(crForm.roomNumber),
        floor: Number(crForm.floor),
        grade: Number(crForm.grade),
      });
      setMessage({ type: 'success', text: '강의실이 추가되었습니다.' });
      setCrForm({ roomNumber: '', floor: '', grade: '1' });
      await loadClassrooms();
    } catch {
      setMessage({ type: 'error', text: '강의실 추가에 실패했습니다.' });
    } finally {
      setCrFormLoading(false);
    }
  };

  const handleGradeSave = async (crId: number) => {
    try {
      await timetableApi.classrooms.updateGrade(crId, editGrades[crId]);
      setMessage({ type: 'success', text: 'PC 등급이 업데이트되었습니다.' });
      await loadClassrooms();
    } catch {
      setMessage({ type: 'error', text: 'PC 등급 변경에 실패했습니다.' });
    }
  };

  const handleToggleCrExpand = async (crId: number) => {
    if (expandedCrId === crId) {
      setExpandedCrId(null);
    } else {
      setExpandedCrId(crId);
      await loadCrSoftwares(crId);
    }
  };

  const handleAddSwToClassroom = async (crId: number) => {
    const swIdStr = addSwSelect[crId];
    if (!swIdStr) return;
    try {
      await timetableApi.classrooms.addSoftware(crId, Number(swIdStr));
      setMessage({ type: 'success', text: '소프트웨어가 추가되었습니다.' });
      setAddSwSelect((prev) => ({ ...prev, [crId]: '' }));
      await loadCrSoftwares(crId);
    } catch {
      setMessage({ type: 'error', text: '소프트웨어 추가에 실패했습니다.' });
    }
  };

  const handleRemoveSwFromClassroom = async (crId: number, softwareId: number) => {
    try {
      await timetableApi.classrooms.removeSoftware(crId, softwareId);
      setMessage({ type: 'success', text: '소프트웨어가 제거되었습니다.' });
      await loadCrSoftwares(crId);
    } catch {
      setMessage({ type: 'error', text: '소프트웨어 제거에 실패했습니다.' });
    }
  };

  // ── Software Handlers ──
  const handleSwCreate = async () => {
    if (!swForm.name) {
      setMessage({ type: 'error', text: '소프트웨어 이름을 입력해주세요.' });
      return;
    }
    setSwFormLoading(true);
    try {
      const aliases = swForm.aliases
        ? swForm.aliases.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      await timetableApi.softwares.create({ name: swForm.name, aliases, isDefault: swForm.isDefault });
      setMessage({ type: 'success', text: '소프트웨어가 추가되었습니다.' });
      setSwForm({ name: '', aliases: '', isDefault: false });
      await loadSoftwares();
    } catch {
      setMessage({ type: 'error', text: '소프트웨어 추가에 실패했습니다.' });
    } finally {
      setSwFormLoading(false);
    }
  };

  const handleSwDelete = (id: number) => {
    openConfirm('소프트웨어 삭제', '이 소프트웨어를 삭제하시겠습니까?', async () => {
      try {
        await timetableApi.softwares.delete(id);
        setMessage({ type: 'success', text: '소프트웨어가 삭제되었습니다.' });
        await loadSoftwares();
      } catch {
        setMessage({ type: 'error', text: '소프트웨어 삭제에 실패했습니다.' });
      }
    });
  };

  const handleAliasEdit = (sw: SoftwareResponse) => {
    setEditAliasText((prev) => ({ ...prev, [sw.id]: sw.aliases.join(', ') }));
    setEditAliasMode((prev) => ({ ...prev, [sw.id]: true }));
  };

  const handleAliasSave = async (id: number) => {
    setAliasLoading(id);
    try {
      const aliases = (editAliasText[id] || '').split(',').map((s) => s.trim()).filter(Boolean);
      await timetableApi.softwares.updateAliases(id, aliases);
      setMessage({ type: 'success', text: '별칭이 업데이트되었습니다.' });
      setEditAliasMode((prev) => ({ ...prev, [id]: false }));
      await loadSoftwares();
    } catch {
      setMessage({ type: 'error', text: '별칭 업데이트에 실패했습니다.' });
    } finally {
      setAliasLoading(null);
    }
  };

  // ── Render: Schedule (조회 전용) ──
  const renderSchedule = () => {
    // Derive room list from schedules (floor = hundreds digit of roomNumber)
    const scheduleRooms = [...new Map(
      schedules
        .filter(s => s.roomNumber > 0)
        .map(s => [s.roomNumber, { roomNumber: s.roomNumber, floor: Math.floor(s.roomNumber / 100) }])
    ).values()].sort((a, b) => a.roomNumber - b.roomNumber);

    const availableFloors = [...new Set(scheduleRooms.map(r => r.floor))].sort();
    const floorGroups = availableFloors.map(floor => ({
      floor,
      rooms: scheduleRooms.filter(r => r.floor === floor),
    }));
    // First room of each floor group after the first (for visual separator)
    const floorStartRooms = new Set(
      floorGroups.slice(1).map(g => g.rooms[0]?.roomNumber).filter(Boolean)
    );

    const buildSection = (pType: '주' | '야', periods: number[]) => {
      const apiType = pType === '주' ? 'DAY' : 'NIGHT';
      const hasAny = schedules.some(s => s.periodType === pType && s.roomNumber > 0);
      if (!hasAny) return null;

      return (
        <div className="tt-excel-section">
          {pType === '야' && <div className="tt-excel-section-label">야간</div>}
          <div className="tt-excel-wrap">
            <table className="tt-excel-table">
              <thead>
                <tr>
                  <th className="tt-excel-th-day" rowSpan={2}>요일</th>
                  <th className="tt-excel-th-time" rowSpan={2}>시간</th>
                  {floorGroups.map(({ floor, rooms }) => (
                    <th key={floor} colSpan={rooms.length} className="tt-excel-th-floor"
                        style={floor !== floorGroups[0].floor ? { borderLeft: '2px solid #94a3b8' } : undefined}>
                      {floor}층
                    </th>
                  ))}
                </tr>
                <tr>
                  {scheduleRooms.map(r => (
                    <th key={r.roomNumber} className="tt-excel-th-room"
                        style={floorStartRooms.has(r.roomNumber) ? { borderLeft: '2px solid #94a3b8' } : undefined}>
                      배 {r.roomNumber}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.flatMap(day => {
                  const startMap = new Map<string, ScheduleResponse & { rowspan: number }>();
                  const coveredSet = new Set<string>();

                  periods.forEach((p, pi) => {
                    scheduleRooms.forEach(room => {
                      const sched = schedules.find(s =>
                        s.roomNumber === room.roomNumber &&
                        s.dayOfWeek === day &&
                        s.periodType === pType &&
                        s.periodStart === p
                      );
                      if (sched) {
                        const rowspan = Math.min(sched.periodEnd - sched.periodStart + 1, periods.length - pi);
                        startMap.set(`${room.roomNumber}-${pi}`, { ...sched, rowspan });
                        for (let rp = pi + 1; rp < pi + rowspan; rp++) {
                          coveredSet.add(`${room.roomNumber}-${rp}`);
                        }
                      }
                    });
                  });

                  return periods.map((p, pi) => (
                    <tr key={`${day}-${pType}-${p}`}>
                      {pi === 0 && (
                        <td rowSpan={periods.length} className="tt-excel-day">{day}</td>
                      )}
                      <td className="tt-excel-time"
                          title={`${PERIOD_TIMES[apiType][p - 1]?.startTime}~${PERIOD_TIMES[apiType][p - 1]?.endTime}`}>
                        <span className="tt-excel-period-num">{p}교시</span>
                        <span className="tt-excel-period-time">
                          {PERIOD_TIMES[apiType][p - 1]?.startTime}~{PERIOD_TIMES[apiType][p - 1]?.endTime}
                        </span>
                      </td>
                      {scheduleRooms.map(room => {
                        if (coveredSet.has(`${room.roomNumber}-${pi}`)) return null;
                        const floorBorder = floorStartRooms.has(room.roomNumber)
                          ? { borderLeft: '2px solid #94a3b8' } : undefined;
                        const schedInfo = startMap.get(`${room.roomNumber}-${pi}`);
                        if (schedInfo) {
                          const isDragging = draggingSchedId === schedInfo.id;
                          return (
                            <td
                              key={room.roomNumber}
                              rowSpan={schedInfo.rowspan}
                              className="tt-excel-cell tt-excel-cell-filled"
                              style={{
                                ...(floorBorder ?? {}),
                                opacity: isDragging ? 0.4 : 1,
                                cursor: isTimetableAdmin && editMode ? 'grab' : 'pointer',
                              }}
                              title={`${schedInfo.courseName}\n${schedInfo.professor}\n${schedInfo.grade ?? ''}${schedInfo.section ? `-${schedInfo.section}` : ''}`}
                              draggable={isTimetableAdmin && editMode}
                              onDragStart={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const relY = e.clientY - rect.top;
                                const periodHeight = rect.height / schedInfo.rowspan;
                                const offset = Math.floor(relY / periodHeight);
                                setDragOffset(offset);
                                setDraggingSchedId(schedInfo.id);
                                e.dataTransfer.effectAllowed = 'move';
                              }}
                              onDragEnd={() => { setDraggingSchedId(null); setDragOffset(0); setDragOverCell(null); }}
                              onClick={() => { if (!draggingSchedId) setSchedDetailModal(schedInfo); }}
                              onContextMenu={(e) => { if (!isTimetableAdmin || !editMode) return; e.preventDefault(); setSchedContextMenu({ x: e.clientX, y: e.clientY, sched: schedInfo }); }}
                            >
                              <span className="tt-excel-course">{schedInfo.courseName}</span>
                              <span className="tt-excel-prof">{schedInfo.professor}</span>
                              {(schedInfo.grade != null || schedInfo.section) && (
                                <span className="tt-excel-class">
                                  {schedInfo.grade ?? ''}{schedInfo.section ? `-${schedInfo.section}` : ''}
                                </span>
                              )}
                            </td>
                          );
                        }
                        const isAddStart = editMode && schedAddStart &&
                          schedAddStart.day === day && schedAddStart.pType === pType &&
                          schedAddStart.roomNumber === room.roomNumber && schedAddStart.period === p;
                        const isAddEnd = editMode && schedAddStart &&
                          schedAddStart.day === day && schedAddStart.pType === pType &&
                          schedAddStart.roomNumber === room.roomNumber && schedAddStart.period !== p;
                        const draggingSched = draggingSchedId !== null
                          ? schedules.find((s) => s.id === draggingSchedId) : null;
                        const dragSpan = draggingSched
                          ? draggingSched.periodEnd - draggingSched.periodStart : 0;
                        const dropStart = dragOverCell ? dragOverCell.period - dragOffset : 0;
                        const isDropTarget = draggingSched !== null && dragOverCell !== null &&
                          dragOverCell.day === day && dragOverCell.pType === pType &&
                          dragOverCell.roomNumber === room.roomNumber &&
                          p >= dropStart && p <= dropStart + dragSpan;
                        const addCellClass = isDropTarget
                          ? ' tt-excel-cell-drop-target'
                          : editMode
                          ? isAddStart ? ' tt-excel-cell-add-start'
                          : isAddEnd   ? ' tt-excel-cell-add-end'
                          : ' tt-excel-cell-addable'
                          : '';
                        return (
                          <td
                            key={room.roomNumber}
                            className={`tt-excel-cell${addCellClass}`}
                            style={floorBorder}
                            onClick={editMode ? () => handleEmptyCellClick(day, pType, p, room.roomNumber) : undefined}
                            onDragOver={draggingSched ? (e) => { e.preventDefault(); setDragOverCell({ day, pType, period: p, roomNumber: room.roomNumber }); } : undefined}
                            onDragLeave={draggingSched ? () => setDragOverCell(null) : undefined}
                            onDrop={draggingSched ? (e) => { e.preventDefault(); handleSchedDrop(day, pType, p, room.roomNumber); } : undefined}
                          />
                        );
                      })}
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    };

    const contextMenuPortal = schedContextMenu && createPortal(
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{ position: 'fixed', top: schedContextMenu.y, left: schedContextMenu.x, zIndex: 9999, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: 120, overflow: 'hidden' }}>
        <div style={{ padding: '6px 8px', fontSize: '0.75rem', color: '#94a3b8', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
          {schedContextMenu.sched.courseName}
        </div>
        <button
          style={{ display: 'block', width: '100%', padding: '8px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: '#ef4444' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#fef2f2'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
          onClick={handleSchedContextDelete}>
          삭제
        </button>
      </div>,
      document.body
    );

    return (
      <div>
        {contextMenuPortal}
        <div className="tt-section-header">
          <div>
            <h2 className="tt-section-title">시간표</h2>
            <p className="tt-section-desc">강의를 클릭하면 상세 정보 및 삭제가 가능합니다</p>
          </div>
        </div>

        <div className="tt-action-row">
          <select
            className="tt-select"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            style={{ width: 160 }}
          >
            {semesters.includes(semester) ? null : (
              <option value={semester}>{formatSemester(semester)}</option>
            )}
            {semesters.map((s) => (
              <option key={s} value={s}>{formatSemester(s)}</option>
            ))}
          </select>
          <button className="tt-btn tt-btn-primary" onClick={handleQuerySchedule} disabled={scheduleLoading}>
            {scheduleLoading ? '조회 중...' : '조회'}
          </button>
          {schedules.length > 0 && (
            <button className="tt-btn tt-btn-secondary" onClick={handleDownloadImage} disabled={imageDownloadLoading}>
              {imageDownloadLoading ? '저장 중...' : 'PNG 저장'}
            </button>
          )}
          {isTimetableAdmin && schedules.length > 0 && (
            <button
              className={`tt-btn ${editMode ? 'tt-btn-primary' : 'tt-btn-outline'}`}
              onClick={() => { setEditMode((v) => !v); setSchedAddStart(null); }}
            >
              {editMode ? '편집 완료' : '편집'}
            </button>
          )}
        </div>

        {editMode && (
          <div className="tt-add-mode-banner">
            {schedAddStart
              ? `종료 교시를 클릭하세요 — ${schedAddStart.day}요일 ${schedAddStart.roomNumber}호 ${schedAddStart.period}교시 선택됨`
              : '편집 모드: 빈 셀을 클릭해 강의를 추가하거나, 강의를 드래그해 이동할 수 있습니다'}
          </div>
        )}

        {scheduleLoading ? (
          <p className="tt-loading">시간표 로딩 중...</p>
        ) : schedules.length > 0 && (
          <div ref={scheduleGridRef}>
            {buildSection('주', DAY_PERIODS)}
            {buildSection('야', NIGHT_PERIODS)}
          </div>
        )}

        {/* 강의 추가 모달 (schedule 탭) */}
        {schedAddModal && activeTab === 'schedule' && (
          <div className="tt-modal-overlay" onClick={() => { setSchedAddModal(false); resetSchedAddForm(); }}>
            <div className="tt-modal tt-modal-large" onClick={(e) => e.stopPropagation()}>
              <div className="tt-modal-head">
                <div>
                  <h3 className="tt-modal-title">강의 추가</h3>
                  <p className="tt-modal-subtitle">강의실은 나중에 배정할 수 있습니다</p>
                </div>
                <button className="tt-modal-close" onClick={() => { setSchedAddModal(false); resetSchedAddForm(); }}>
                  <IconClose />
                </button>
              </div>
              <div className="tt-modal-grid">
                <div className="tt-modal-field">
                  <label className="tt-modal-label">학과 *</label>
                  <input className="tt-modal-input" value={schedAddForm.department}
                    onChange={(e) => setSchedAddForm((p) => ({ ...p, department: e.target.value }))}
                    placeholder="학과명" />
                </div>
                <div className="tt-modal-field">
                  <label className="tt-modal-label">교수명 *</label>
                  <input className="tt-modal-input" value={schedAddForm.professor}
                    onChange={(e) => setSchedAddForm((p) => ({ ...p, professor: e.target.value }))}
                    placeholder="교수명" />
                </div>
                <div className="tt-modal-field" style={{ gridColumn: '1 / -1' }}>
                  <label className="tt-modal-label">교과목명 *</label>
                  <input className="tt-modal-input" value={schedAddForm.courseName}
                    onChange={(e) => setSchedAddForm((p) => ({ ...p, courseName: e.target.value }))}
                    placeholder="교과목명" />
                </div>
                <div className="tt-modal-field">
                  <label className="tt-modal-label">학년</label>
                  <input className="tt-modal-input" type="number" min="1" max="4"
                    value={schedAddForm.grade}
                    onChange={(e) => setSchedAddForm((p) => ({ ...p, grade: e.target.value }))}
                    placeholder="예: 1" />
                </div>
                <div className="tt-modal-field">
                  <label className="tt-modal-label">반</label>
                  <input className="tt-modal-input" value={schedAddForm.section}
                    onChange={(e) => setSchedAddForm((p) => ({ ...p, section: e.target.value }))}
                    placeholder="예: A" />
                </div>
                <div className="tt-modal-field">
                  <label className="tt-modal-label">요일 *</label>
                  <select className="tt-select tt-modal-input" value={schedAddForm.dayOfWeek}
                    onChange={(e) => setSchedAddForm((p) => ({ ...p, dayOfWeek: e.target.value as 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' }))}>
                    <option value="MON">월</option>
                    <option value="TUE">화</option>
                    <option value="WED">수</option>
                    <option value="THU">목</option>
                    <option value="FRI">금</option>
                  </select>
                </div>
                <div className="tt-modal-field">
                  <label className="tt-modal-label">주/야 *</label>
                  <select className="tt-select tt-modal-input" value={schedAddForm.periodType}
                    onChange={(e) => setSchedAddForm((p) => ({ ...p, periodType: e.target.value as 'DAY' | 'NIGHT' }))}>
                    <option value="DAY">주</option>
                    <option value="NIGHT">야</option>
                  </select>
                </div>
                <div className="tt-modal-field">
                  <label className="tt-modal-label">시작 교시 *</label>
                  <input className="tt-modal-input" type="number" min="1" max="12"
                    value={schedAddForm.periodStart}
                    onChange={(e) => setSchedAddForm((p) => ({ ...p, periodStart: e.target.value }))}
                    placeholder="예: 1" />
                </div>
                <div className="tt-modal-field">
                  <label className="tt-modal-label">종료 교시 *</label>
                  <input className="tt-modal-input" type="number" min="1" max="12"
                    value={schedAddForm.periodEnd}
                    onChange={(e) => setSchedAddForm((p) => ({ ...p, periodEnd: e.target.value }))}
                    placeholder="예: 3" />
                </div>
                <div className="tt-modal-field" style={{ gridColumn: '1 / -1' }}>
                  <label className="tt-modal-label">강의실 (미선택 시 나중에 배정 가능)</label>
                  <select className="tt-select tt-modal-input" value={schedAddForm.classroomId}
                    onChange={(e) => setSchedAddForm((p) => ({ ...p, classroomId: e.target.value }))}>
                    <option value="">미배정</option>
                    {classroomsForAssign.map((c) => (
                      <option key={c.id} value={c.id}>{c.roomNumber}호</option>
                    ))}
                  </select>
                </div>
                <div className="tt-modal-field" style={{ gridColumn: '1 / -1' }}>
                  <label className="tt-modal-label">필요 소프트웨어</label>
                  <input className="tt-modal-input" value={schedAddForm.softwareNote}
                    onChange={(e) => setSchedAddForm((p) => ({ ...p, softwareNote: e.target.value }))}
                    placeholder="예: AutoCAD, MATLAB" />
                </div>
              </div>
              <div className="tt-modal-actions">
                <button
                  className="tt-btn tt-btn-primary"
                  style={{ flex: 1 }}
                  onClick={handleScheduleAdd}
                  disabled={schedAddLoading}
                >
                  {schedAddLoading ? '추가 중...' : '추가'}
                </button>
                <button className="tt-btn tt-btn-secondary"
                  onClick={() => { setSchedAddModal(false); resetSchedAddForm(); }}>
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 강의 상세 모달 */}
        {schedDetailModal && (
          <div className="tt-modal-overlay" onClick={() => setSchedDetailModal(null)}>
            <div className="tt-modal" onClick={(e) => e.stopPropagation()}>
              <div className="tt-modal-head">
                <div>
                  <h3 className="tt-modal-title">{schedDetailModal.courseName}</h3>
                  <p className="tt-modal-subtitle">{schedDetailModal.department}{schedDetailModal.grade ? ` ${schedDetailModal.grade}학년` : ''}{schedDetailModal.section ? ` ${schedDetailModal.section}반` : ''}</p>
                </div>
                <button className="tt-modal-close" onClick={() => setSchedDetailModal(null)}><IconClose /></button>
              </div>
              <div className="tt-modal-detail-row"><span className="tt-modal-detail-label">강의실</span><span className="tt-modal-detail-value">{schedDetailModal.roomNumber}호</span></div>
              <div className="tt-modal-detail-row"><span className="tt-modal-detail-label">교수</span><span className="tt-modal-detail-value">{schedDetailModal.professor}</span></div>
              <div className="tt-modal-detail-row"><span className="tt-modal-detail-label">요일</span><span className="tt-modal-detail-value">{schedDetailModal.dayOfWeek}요일</span></div>
              <div className="tt-modal-detail-row"><span className="tt-modal-detail-label">교시</span><span className="tt-modal-detail-value">{schedDetailModal.periodType} {schedDetailModal.periodStart}~{schedDetailModal.periodEnd}교시</span></div>
              <div className="tt-modal-detail-row"><span className="tt-modal-detail-label">시간</span><span className="tt-modal-detail-value">{schedDetailModal.startTime?.slice(0, 5)} ~ {schedDetailModal.endTime?.slice(0, 5)}</span></div>
              {schedDetailModal.softwareNote && <div className="tt-modal-detail-row"><span className="tt-modal-detail-label">소프트웨어</span><span className="tt-modal-detail-value">{schedDetailModal.softwareNote}</span></div>}
              {schedDetailModal.optionNote && <div className="tt-modal-detail-row"><span className="tt-modal-detail-label">옵션</span><span className="tt-modal-detail-value">{schedDetailModal.optionNote}</span></div>}
              <div className="tt-modal-actions">
                <button
                  className="tt-btn tt-btn-danger"
                  style={{ flex: 1 }}
                  onClick={handleSchedChipDelete}
                  disabled={schedDeleteLoading}
                >
                  {schedDeleteLoading ? '삭제 중...' : '삭제'}
                </button>
                <button className="tt-btn tt-btn-secondary" onClick={() => setSchedDetailModal(null)}>닫기</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Render: Register (시간표 등록/관리) ──
  const renderRegister = () => (
    <div>
      <div className="tt-section-header">
        <div>
          <h2 className="tt-section-title">시간표 등록</h2>
          <p className="tt-section-desc">강의 등록, 엑셀 업로드 및 강의실 배정을 관리합니다</p>
        </div>
      </div>

      <div className="tt-action-row">
        <input
          className="tt-input"
          type="text"
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
          placeholder="예: 2025-1"
          style={{ width: 100 }}
        />
        <button className="tt-btn tt-btn-primary" onClick={handleQuerySchedule} disabled={scheduleLoading}>
          {scheduleLoading ? '조회 중...' : '조회'}
        </button>
        <button className="tt-btn tt-btn-primary" onClick={() => { resetSchedAddForm(); setSchedAddModal(true); }}>
          <IconPlus /> 단건 추가
        </button>
        <input ref={appFileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImportApp} />
        <input ref={ttFileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImportTimetable} />
        <button className="tt-btn tt-btn-secondary" onClick={() => appFileRef.current?.click()}>
          <IconPlus /> 수강신청 업로드
        </button>
        <button className="tt-btn tt-btn-secondary" onClick={() => ttFileRef.current?.click()}>
          <IconPlus /> 완성 시간표 업로드
        </button>
        <button className="tt-btn tt-btn-outline" onClick={handleExportExcel}>
          엑셀 다운로드
        </button>
        <button className="tt-btn tt-btn-danger" onClick={handleDeleteAllSchedules}>
          전체 삭제
        </button>
        <button className="tt-btn tt-btn-outline" onClick={handleAutoAssignSoftwares} disabled={autoSwLoading}>
          {autoSwLoading ? '분석 중...' : '강의실 소프트웨어 자동 배정'}
        </button>
      </div>

      {autoSwModal && (
        <div className="tt-modal-overlay" onClick={() => setAutoSwModal(null)}>
          <div className="tt-modal tt-modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="tt-modal-head">
              <div>
                <h3 className="tt-modal-title">소프트웨어 자동 배정 완료</h3>
                <p className="tt-modal-subtitle">{formatSemester(autoSwModal.semester)}</p>
              </div>
              <button className="tt-modal-close" onClick={() => setAutoSwModal(null)}><IconClose /></button>
            </div>
            <div className="tt-modal-detail-row">
              <span className="tt-modal-detail-label">처리 강의실</span>
              <span className="tt-modal-detail-value">{autoSwModal.classroomCount}개</span>
            </div>
            <div className="tt-modal-detail-row">
              <span className="tt-modal-detail-label">배정된 소프트웨어</span>
              <span className="tt-modal-detail-value">{autoSwModal.assignedCount}건</span>
            </div>
            {autoSwModal.failureCount > 0 && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#b45309', marginBottom: 6 }}>
                  매칭 실패 ({autoSwModal.failureCount}건)
                </p>
              </div>
            )}
            {allClassroomSoftwares.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>강의실별 소프트웨어 배정 현황</p>
                <div className="tt-table-wrap" style={{ maxHeight: 320, overflowY: 'auto' }}>
                  <table className="tt-table">
                    <thead>
                      <tr>
                        <th>강의실</th>
                        <th>소프트웨어</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allClassroomSoftwares.map((cr) => (
                        <tr key={cr.classroomId}>
                          <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{cr.roomNumber}호</td>
                          <td>
                            {cr.softwares.length === 0 ? (
                              <span style={{ color: '#94a3b8' }}>없음</span>
                            ) : (
                              cr.softwares.map((sw) => (
                                <span
                                  key={sw.id}
                                  className={`tt-sw-tag${sw.default ? ' tt-sw-tag-default' : ''}`}
                                >
                                  {sw.softwareName}
                                </span>
                              ))
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="tt-modal-actions">
              <button className="tt-btn tt-btn-primary" style={{ flex: 1 }} onClick={() => setAutoSwModal(null)}>확인</button>
            </div>
          </div>
        </div>
      )}

      {unassigned.length > 0 && (
        <div className="tt-unassigned-section">
          <div className="tt-unassigned-header">
            <h4 className="tt-unassigned-title">미배정 강의</h4>
            <span className="tt-unassigned-count">{unassigned.length}</span>
          </div>
          <div className="tt-table-wrap" style={{ marginBottom: 0 }}>
            <table className="tt-table">
              <thead>
                <tr>
                  <th>순위</th>
                  <th>학과</th>
                  <th>교과목</th>
                  <th>교수명</th>
                  <th>요일</th>
                  <th>주/야</th>
                  <th>시간</th>
                  <th>강의실 배정</th>
                </tr>
              </thead>
              <tbody>
                {[...unassigned].sort((a, b) => {
                    const p = (a.priority ?? Infinity) - (b.priority ?? Infinity);
                    if (p !== 0) return p;
                    const g = (a.grade ?? Infinity) - (b.grade ?? Infinity);
                    if (g !== 0) return g;
                    return (a.section ?? '').localeCompare(b.section ?? '');
                  }).map((s) => (
                  <tr key={s.id}>
                    <td>{s.priority || '-'}</td>
                    <td>{s.department}{s.grade ? ` ${s.grade}학년` : ''}{s.section ? ` ${s.section}반` : ''}</td>
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>{s.courseName}</td>
                    <td>{s.professor}</td>
                    <td>{s.dayOfWeek}</td>
                    <td>{s.periodType}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{s.periodStart}~{s.periodEnd}교시</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
                        <select
                          className="tt-select"
                          value={assignMap[s.id] || ''}
                          onChange={(e) => setAssignMap((prev) => ({ ...prev, [s.id]: e.target.value }))}
                        >
                          <option value="">강의실 선택</option>
                          {classroomsForAssign.map((c) => (
                            <option key={c.id} value={c.id}>{c.roomNumber}호 ({c.floor}층 / {c.grade}등급)</option>
                          ))}
                        </select>
                        <button
                          className="tt-btn tt-btn-primary tt-btn-xs"
                          onClick={() => handleAssign(s.id)}
                          disabled={!assignMap[s.id] || assignLoading === s.id}
                        >
                          배정
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {scheduleLoading ? (
        <p className="tt-loading">로딩 중...</p>
      ) : schedules.length === 0 ? (
        <p className="tt-empty">등록된 강의가 없습니다. 학기를 입력하고 조회하거나 엑셀을 업로드하세요.</p>
      ) : (
        <div className="tt-table-wrap">
          <table className="tt-table">
            <thead>
              <tr>
                <th >순위</th>
                <th>학과</th>
                <th>학년</th>
                <th>반</th>
                <th>교과목</th>
                <th>교수명</th>
                <th>필요 소프트웨어</th>
                <th>옵션</th>
                <th>강의실</th>
                <th>주/야</th>
                <th>요일</th>
                <th>시간</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const sorted = [...schedules].sort((a, b) => {
                  const p = (a.priority ?? Infinity) - (b.priority ?? Infinity);
                  if (p !== 0) return p;
                  const g = (a.grade ?? Infinity) - (b.grade ?? Infinity);
                  if (g !== 0) return g;
                  return (a.section ?? '').localeCompare(b.section ?? '');
                });
                return sorted.map((s, i) => {
                  const priorityGroupHasEdit = editRowId !== null &&
                    sorted.some(r => r.id === editRowId && r.priority === s.priority);
                  const deptGroupHasEdit = editRowId !== null &&
                    sorted.some(r => r.id === editRowId && r.priority === s.priority && r.department === s.department);

                  let priorityShow = false, priorityRowspan = 1;
                  if (priorityGroupHasEdit) {
                    priorityShow = true;
                  } else if (i === 0 || sorted[i - 1].priority !== s.priority) {
                    priorityShow = true;
                    for (let j = i + 1; j < sorted.length; j++) {
                      if (sorted[j].priority === s.priority) priorityRowspan++;
                      else break;
                    }
                  }

                  let deptShow = false, deptRowspan = 1;
                  if (deptGroupHasEdit) {
                    deptShow = true;
                  } else if (i === 0 || sorted[i - 1].priority !== s.priority || sorted[i - 1].department !== s.department) {
                    deptShow = true;
                    for (let j = i + 1; j < sorted.length; j++) {
                      if (sorted[j].priority === s.priority && sorted[j].department === s.department) deptRowspan++;
                      else break;
                    }
                  }

                  return editRowId === s.id ? (
                    <tr key={s.id} style={{ background: '#f0f9ff' }}>
                      <td style={{ borderRight: '1px solid #e2e8f0' }}>
                        <input className="tt-input" type="number" value={editRowForm.priority}
                          onChange={(e) => setEditRowForm((p) => ({ ...p, priority: e.target.value }))}
                          style={{ width: 48 }} />
                      </td>
                      <td style={{ borderRight: '1px solid #e2e8f0' }}>
                        <input className="tt-input" value={editRowForm.department}
                          onChange={(e) => setEditRowForm((p) => ({ ...p, department: e.target.value }))}
                          style={{ width: 80 }} />
                      </td>
                      <td>
                        <input className="tt-input" type="number" min="1" max="4" value={editRowForm.grade}
                          onChange={(e) => setEditRowForm((p) => ({ ...p, grade: e.target.value }))}
                          style={{ width: 44 }} />
                      </td>
                      <td>
                        <input className="tt-input" value={editRowForm.section}
                          onChange={(e) => setEditRowForm((p) => ({ ...p, section: e.target.value }))}
                          style={{ width: 40 }} />
                      </td>
                      <td>
                        <input className="tt-input" value={editRowForm.courseName}
                          onChange={(e) => setEditRowForm((p) => ({ ...p, courseName: e.target.value }))}
                          style={{ minWidth: 80 }} />
                      </td>
                      <td>
                        <input className="tt-input" value={editRowForm.professor}
                          onChange={(e) => setEditRowForm((p) => ({ ...p, professor: e.target.value }))}
                          style={{ width: 72 }} />
                      </td>
                      <td>
                        <input className="tt-input" value={editRowForm.softwareNote}
                          onChange={(e) => setEditRowForm((p) => ({ ...p, softwareNote: e.target.value }))}
                          style={{ width: 100 }} />
                      </td>
                      <td>
                        <input type="checkbox" checked={editRowForm.hasOption}
                          onChange={(e) => setEditRowForm((p) => ({ ...p, hasOption: e.target.checked }))} />
                      </td>
                      <td>
                        <select className="tt-select" value={editRowForm.classroomId}
                          onChange={(e) => setEditRowForm((p) => ({ ...p, classroomId: e.target.value }))}
                          style={{ width: 80 }}>
                          <option value="">미배정</option>
                          {classroomsForAssign.map((c) => (
                            <option key={c.id} value={c.id}>{c.roomNumber}호</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select className="tt-select" value={editRowForm.periodType}
                          onChange={(e) => setEditRowForm((p) => ({ ...p, periodType: e.target.value as 'DAY' | 'NIGHT' }))}
                          style={{ width: 56 }}>
                          <option value="DAY">주</option>
                          <option value="NIGHT">야</option>
                        </select>
                      </td>
                      <td>
                        <select className="tt-select" value={editRowForm.dayOfWeek}
                          onChange={(e) => setEditRowForm((p) => ({ ...p, dayOfWeek: e.target.value as 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' }))}
                          style={{ width: 56 }}>
                          <option value="MON">월</option>
                          <option value="TUE">화</option>
                          <option value="WED">수</option>
                          <option value="THU">목</option>
                          <option value="FRI">금</option>
                        </select>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                          <input className="tt-input" type="number" min="1" max="12" value={editRowForm.periodStart}
                            onChange={(e) => setEditRowForm((p) => ({ ...p, periodStart: e.target.value }))}
                            style={{ width: 36 }} />
                          ~
                          <input className="tt-input" type="number" min="1" max="12" value={editRowForm.periodEnd}
                            onChange={(e) => setEditRowForm((p) => ({ ...p, periodEnd: e.target.value }))}
                            style={{ width: 36 }} />
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="tt-btn tt-btn-primary tt-btn-xs"
                            onClick={handleScheduleUpdate} disabled={editRowLoading}>
                            {editRowLoading ? '...' : '저장'}
                          </button>
                          <button className="tt-btn tt-btn-secondary tt-btn-xs"
                            onClick={() => setEditRowId(null)}>
                            취소
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={s.id}>
                      {priorityShow && <td rowSpan={priorityRowspan} style={{ verticalAlign: 'middle', fontWeight: 600, borderRight: '1px solid #e2e8f0' }}>{s.priority ?? '-'}</td>}
                      {deptShow && <td rowSpan={deptRowspan} style={{ verticalAlign: 'middle', borderRight: '1px solid #e2e8f0' }}>{s.department}</td>}
                      <td>{s.grade ? `${s.grade}학년` : '-'}</td>
                      <td>{s.section || '-'}</td>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{s.courseName}</td>
                      <td>{s.professor}</td>
                      <td style={{ maxWidth: 200 }}>
                        {s.softwareNote
                          ? (() => {
                              const chips = s.softwareNote.split(',').map(t => t.trim()).filter(Boolean);
                              const isExpanded = expandedSwNotes.has(s.id);
                              let visible = chips;
                              let hiddenCount = 0;
                              if (!isExpanded) {
                                const BUDGET = 168;
                                let used = 0, count = 0;
                                for (const chip of chips) {
                                  const w = chip.length * 7 + 14;
                                  if (count > 0 && used + 3 + w > BUDGET) break;
                                  used += (count > 0 ? 3 : 0) + w;
                                  count++;
                                }
                                visible = chips.slice(0, count || 1);
                                hiddenCount = chips.length - visible.length;
                              }
                              return (
                                <div style={{ display: 'flex', flexWrap: isExpanded ? 'wrap' : 'nowrap', gap: 3, alignItems: 'center', overflow: 'hidden' }}>
                                  {visible.map((chip, idx) => (
                                    <span key={idx} className="tt-sw-chip">{chip}</span>
                                  ))}
                                  {hiddenCount > 0 && (
                                    <button className="tt-sw-chip-more" style={{ flexShrink: 0 }}
                                      onClick={() => setExpandedSwNotes(prev => new Set([...prev, s.id]))}>
                                      +{hiddenCount}개
                                    </button>
                                  )}
                                  {isExpanded && chips.length > 1 && (
                                    <button className="tt-sw-chip-more"
                                      onClick={() => setExpandedSwNotes(prev => { const n = new Set(prev); n.delete(s.id); return n; })}>
                                      접기
                                    </button>
                                  )}
                                </div>
                              );
                            })()
                          : '-'
                        }
                      </td>
                      <td>
                        {s.hasOption
                          ? <span className="tt-badge tt-badge-blue" title={s.optionNote || ''}>O</span>
                          : <span style={{ color: '#94a3b8' }}>-</span>
                        }
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        {s.roomNumber > 0
                          ? `${s.roomNumber}호`
                          : <span style={{ color: '#ef4444' }}>미배정</span>
                        }
                      </td>
                      <td>{s.periodType}</td>
                      <td>{s.dayOfWeek}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{s.periodStart}~{s.periodEnd}교시</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="tt-btn tt-btn-secondary tt-btn-xs"
                            onClick={() => startEditRow(s)}>
                            수정
                          </button>
                          <button
                            className="tt-btn tt-btn-danger tt-btn-xs"
                          onClick={() => handleScheduleDelete(s.id)}
                          disabled={deleteLoading === s.id}
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                )
                });
              })()}
            </tbody>
          </table>
        </div>
      )}

      {/* 단건 추가 모달 */}
      {schedAddModal && (
        <div className="tt-modal-overlay" onClick={() => { setSchedAddModal(false); resetSchedAddForm(); }}>
          <div className="tt-modal tt-modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="tt-modal-head">
              <div>
                <h3 className="tt-modal-title">강의 단건 추가</h3>
                <p className="tt-modal-subtitle">강의실은 나중에 배정할 수 있습니다</p>
              </div>
              <button className="tt-modal-close" onClick={() => { setSchedAddModal(false); resetSchedAddForm(); }}>
                <IconClose />
              </button>
            </div>
            <div className="tt-modal-grid">
              <div className="tt-modal-field">
                <label className="tt-modal-label">학과 *</label>
                <input className="tt-modal-input" value={schedAddForm.department}
                  onChange={(e) => setSchedAddForm((p) => ({ ...p, department: e.target.value }))}
                  placeholder="학과명" />
              </div>
              <div className="tt-modal-field">
                <label className="tt-modal-label">교수명 *</label>
                <input className="tt-modal-input" value={schedAddForm.professor}
                  onChange={(e) => setSchedAddForm((p) => ({ ...p, professor: e.target.value }))}
                  placeholder="교수명" />
              </div>
              <div className="tt-modal-field" style={{ gridColumn: '1 / -1' }}>
                <label className="tt-modal-label">교과목명 *</label>
                <input className="tt-modal-input" value={schedAddForm.courseName}
                  onChange={(e) => setSchedAddForm((p) => ({ ...p, courseName: e.target.value }))}
                  placeholder="교과목명" />
              </div>
              <div className="tt-modal-field">
                <label className="tt-modal-label">학년</label>
                <input className="tt-modal-input" type="number" min="1" max="4"
                  value={schedAddForm.grade}
                  onChange={(e) => setSchedAddForm((p) => ({ ...p, grade: e.target.value }))}
                  placeholder="예: 1" />
              </div>
              <div className="tt-modal-field">
                <label className="tt-modal-label">반</label>
                <input className="tt-modal-input" value={schedAddForm.section}
                  onChange={(e) => setSchedAddForm((p) => ({ ...p, section: e.target.value }))}
                  placeholder="예: A" />
              </div>
              <div className="tt-modal-field">
                <label className="tt-modal-label">요일 *</label>
                <select className="tt-select tt-modal-input" value={schedAddForm.dayOfWeek}
                  onChange={(e) => setSchedAddForm((p) => ({ ...p, dayOfWeek: e.target.value as 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' }))}>
                  <option value="MON">월</option>
                  <option value="TUE">화</option>
                  <option value="WED">수</option>
                  <option value="THU">목</option>
                  <option value="FRI">금</option>
                </select>
              </div>
              <div className="tt-modal-field">
                <label className="tt-modal-label">주/야 *</label>
                <select className="tt-select tt-modal-input" value={schedAddForm.periodType}
                  onChange={(e) => setSchedAddForm((p) => ({ ...p, periodType: e.target.value as 'DAY' | 'NIGHT' }))}>
                  <option value="DAY">주</option>
                  <option value="NIGHT">야</option>
                </select>
              </div>
              <div className="tt-modal-field">
                <label className="tt-modal-label">시작 교시 *</label>
                <input className="tt-modal-input" type="number" min="1" max="12"
                  value={schedAddForm.periodStart}
                  onChange={(e) => setSchedAddForm((p) => ({ ...p, periodStart: e.target.value }))}
                  placeholder="예: 1" />
              </div>
              <div className="tt-modal-field">
                <label className="tt-modal-label">종료 교시 *</label>
                <input className="tt-modal-input" type="number" min="1" max="12"
                  value={schedAddForm.periodEnd}
                  onChange={(e) => setSchedAddForm((p) => ({ ...p, periodEnd: e.target.value }))}
                  placeholder="예: 3" />
              </div>
              <div className="tt-modal-field" style={{ gridColumn: '1 / -1' }}>
                <label className="tt-modal-label">필요 소프트웨어</label>
                <input className="tt-modal-input" value={schedAddForm.softwareNote}
                  onChange={(e) => setSchedAddForm((p) => ({ ...p, softwareNote: e.target.value }))}
                  placeholder="예: AutoCAD, MATLAB" />
              </div>
              <div className="tt-modal-field">
                <label className="tt-modal-label">순위</label>
                <input className="tt-modal-input" type="number" min="1"
                  value={schedAddForm.priority}
                  onChange={(e) => setSchedAddForm((p) => ({ ...p, priority: e.target.value }))}
                  placeholder="배정 순위" />
              </div>
              <div className="tt-modal-field" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
                <label className="tt-checkbox-row" style={{ margin: 0 }}>
                  <input type="checkbox" checked={schedAddForm.hasOption}
                    onChange={(e) => setSchedAddForm((p) => ({ ...p, hasOption: e.target.checked }))} />
                  옵션 있음
                </label>
              </div>
              {schedAddForm.hasOption && (
                <div className="tt-modal-field" style={{ gridColumn: '1 / -1' }}>
                  <label className="tt-modal-label">옵션 내용</label>
                  <input className="tt-modal-input" value={schedAddForm.optionNote}
                    onChange={(e) => setSchedAddForm((p) => ({ ...p, optionNote: e.target.value }))}
                    placeholder="옵션 상세 내용" />
                </div>
              )}
              <div className="tt-modal-field" style={{ gridColumn: '1 / -1' }}>
                <label className="tt-modal-label">강의실 (선택 — 미선택 시 나중에 배정 가능)</label>
                <select className="tt-select tt-modal-input" value={schedAddForm.classroomId}
                  onChange={(e) => setSchedAddForm((p) => ({ ...p, classroomId: e.target.value }))}>
                  <option value="">미배정</option>
                  {classroomsForAssign.map((c) => (
                    <option key={c.id} value={c.id}>{c.roomNumber}호 ({c.floor}층 / {c.grade}등급)</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="tt-modal-actions">
              <button
                className="tt-btn tt-btn-primary"
                style={{ flex: 1 }}
                onClick={handleScheduleAdd}
                disabled={schedAddLoading}
              >
                {schedAddLoading ? '추가 중...' : '추가'}
              </button>
              <button className="tt-btn tt-btn-secondary"
                onClick={() => { setSchedAddModal(false); resetSchedAddForm(); }}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── Render: Makeup ──
  const renderMakeup = () => {
    const calendarDays = buildCalendarDays(makeupYear, makeupMonth);
    const today = new Date();

    const getMakeupsForDay = (day: number): MakeupResponse[] => {
      const dateStr = `${makeupYear}-${padTwo(makeupMonth)}-${padTwo(day)}`;
      return makeups.filter((m) => m.date === dateStr);
    };

    const pickerRow = makeupRows.find((r) => r.key === openRoomPickerKey) ?? null;
    const roomPickerPortal = pickerRow && roomPickerPos && createPortal(
      <div className="tt-room-picker-popup" style={{ position: 'fixed', top: roomPickerPos.top, left: roomPickerPos.left, zIndex: 9999, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: 150, maxHeight: 220, overflowY: 'auto' }}>
        {pickerRow.availableRooms === null || pickerRow.roomsLoading ? (
          <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>검색 중...</span>
        ) : pickerRow.availableRooms.length === 0 ? (
          <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>사용 가능한 강의실 없음</span>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {(() => {
              const usedIds = new Set(makeupRows.filter((r) => r.key !== pickerRow.key && r.classroomId > 0 && r.date === pickerRow.date && r.periodType === pickerRow.periodType && r.periodStart === pickerRow.periodStart && r.periodEnd === pickerRow.periodEnd).map((r) => r.classroomId));
              return pickerRow.availableRooms!.filter((c) => !usedIds.has(c.id) || c.id === pickerRow.classroomId).map((c) => (
                <button key={c.id}
                  style={{ padding: '2px 9px', borderRadius: 4, border: '1px solid', fontSize: '0.75rem', cursor: 'pointer', background: pickerRow.classroomId === c.id ? '#1e40af' : '#fff', color: pickerRow.classroomId === c.id ? '#fff' : '#1e40af', borderColor: '#3b82f6' }}
                  onClick={() => { updateRow(pickerRow.key, pickerRow.classroomId === c.id ? { classroomId: 0, roomNumber: 0 } : { classroomId: c.id, roomNumber: c.roomNumber }); setOpenRoomPickerKey(null); setRoomPickerPos(null); }}>
                  {c.roomNumber}호
                </button>
              ));
            })()}
          </div>
        )}
      </div>,
      document.body
    );

    return (
      <div>
        {roomPickerPortal}
        <div className="tt-section-header">
          <div>
            <h2 className="tt-section-title">보강 관리</h2>
            <p className="tt-section-desc">월별 보강 일정을 관리합니다</p>
          </div>
          {isTimetableAdmin && (
            <button className="tt-btn tt-btn-primary" onClick={() => { setMakeupRows([{ ...newMakeupRow(0) }]); setMakeupRowKey(1); setMakeupRegisterModal(true); }}>
              <IconPlus /> 보강 등록
            </button>
          )}
        </div>

        <div className="tt-calendar">
          <div className="tt-calendar-nav">
            <button className="tt-calendar-nav-btn" onClick={handleMakeupNavPrev}>‹</button>
            <h3 className="tt-calendar-nav-title">{makeupYear}년 {padTwo(makeupMonth)}월</h3>
            <button className="tt-calendar-nav-btn" onClick={handleMakeupNavNext}>›</button>
          </div>
          <div className="tt-calendar-grid">
            {DAY_HEADERS.map((h) => (
              <div key={h} className="tt-calendar-day-header">{h}</div>
            ))}
            {calendarDays.map((day, idx) => (
              <div key={idx} className={`tt-calendar-cell${day === null ? ' empty' : ''}`}>
                {day !== null && (
                  <>
                    <span
                      className={`tt-calendar-date${
                        today.getFullYear() === makeupYear &&
                        today.getMonth() + 1 === makeupMonth &&
                        today.getDate() === day ? ' today' : ''
                      }`}
                    >
                      {day}
                    </span>
                    {(() => {
                      const dayMakeups = getMakeupsForDay(day);
                      const groups: Record<string, MakeupResponse[]> = {};
                      dayMakeups.forEach((m) => {
                        const key = m.startTime?.slice(0, 5) ?? '';
                        if (!groups[key]) groups[key] = [];
                        groups[key].push(m);
                      });
                      return Object.entries(groups).map(([timeKey, items]) => (
                        <div key={timeKey} className="tt-event-chip-row">
                          <span className="tt-event-chip">{timeKey}</span>
                          {items.map((m) => (
                            <button
                              key={m.id}
                              className="tt-event-chip-room"
                              onClick={() => setMakeupDetailModal(m)}
                            >
                              {m.roomNumber}호
                            </button>
                          ))}
                        </div>
                      ));
                    })()}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {makeupLoading && <p className="tt-loading">보강 로딩 중...</p>}

        {/* Detail Modal */}
        {makeupDetailModal && (
          <div className="tt-modal-overlay" onClick={() => setMakeupDetailModal(null)}>
            <div className="tt-modal" onClick={(e) => e.stopPropagation()}>
              <div className="tt-modal-head">
                <div>
                  <h3 className="tt-modal-title">보강 상세</h3>
                  <p className="tt-modal-subtitle">{makeupDetailModal.date}</p>
                </div>
                <button className="tt-modal-close" onClick={() => setMakeupDetailModal(null)}><IconClose /></button>
              </div>
              <div className="tt-modal-detail-row">
                <span className="tt-modal-detail-label">강의실</span>
                <span className="tt-modal-detail-value">{makeupDetailModal.roomNumber}호</span>
              </div>
              <div className="tt-modal-detail-row">
                <span className="tt-modal-detail-label">학과</span>
                <span className="tt-modal-detail-value">{makeupDetailModal.department}</span>
              </div>
              {makeupDetailModal.courseName && (
                <div className="tt-modal-detail-row">
                  <span className="tt-modal-detail-label">과목</span>
                  <span className="tt-modal-detail-value">{makeupDetailModal.courseName}</span>
                </div>
              )}
              {makeupDetailModal.professor && (
                <div className="tt-modal-detail-row">
                  <span className="tt-modal-detail-label">교수</span>
                  <span className="tt-modal-detail-value">{makeupDetailModal.professor}</span>
                </div>
              )}
              <div className="tt-modal-detail-row">
                <span className="tt-modal-detail-label">시간</span>
                <span className="tt-modal-detail-value">
                  {makeupDetailModal.startTime?.slice(0, 5)} ~ {makeupDetailModal.endTime?.slice(0, 5)}
                </span>
              </div>
              {makeupDetailModal.purpose && (
                <div className="tt-modal-detail-row">
                  <span className="tt-modal-detail-label">목적</span>
                  <span className="tt-modal-detail-value">{makeupDetailModal.purpose}</span>
                </div>
              )}
              {makeupDetailModal.softwareNote && (
                <div className="tt-modal-detail-row">
                  <span className="tt-modal-detail-label">소프트웨어</span>
                  <span className="tt-modal-detail-value">{makeupDetailModal.softwareNote}</span>
                </div>
              )}
              {makeupDetailModal.note && (
                <div className="tt-modal-detail-row">
                  <span className="tt-modal-detail-label">비고</span>
                  <span className="tt-modal-detail-value">{makeupDetailModal.note}</span>
                </div>
              )}
              <div className="tt-modal-actions">
                <button
                  className="tt-btn tt-btn-danger"
                  style={{ flex: 1 }}
                  onClick={() => handleMakeupDelete(makeupDetailModal.id)}
                >
                  삭제
                </button>
                <button className="tt-btn tt-btn-secondary" onClick={() => setMakeupDetailModal(null)}>닫기</button>
              </div>
            </div>
          </div>
        )}

        {/* Register Makeup Modal */}
        {makeupRegisterModal && (
          <div className="tt-modal-overlay" onClick={() => setMakeupRegisterModal(false)}>
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', width: '96vw', maxWidth: 1200, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
              <div className="tt-modal-head" style={{ flexShrink: 0 }}>
                <h3 className="tt-modal-title">보강 등록</h3>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button className="tt-btn tt-btn-outline" onClick={handleAutoAssign} disabled={autoAssignLoading}>
                    {autoAssignLoading ? '배정 중...' : '자동 배정'}
                  </button>
                  <button className="tt-btn tt-btn-primary" onClick={handleMakeupBatchSubmit} disabled={makeupSubmitLoading}>
                    {makeupSubmitLoading ? '등록 중...' : `등록 (${makeupRows.filter(r => r.department && r.date && r.periodStart > 0 && r.classroomId > 0).length}건)`}
                  </button>
                  <button className="tt-modal-close" onClick={() => setMakeupRegisterModal(false)}><IconClose /></button>
                </div>
              </div>

              {/* Spreadsheet Table */}
              <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px 16px' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 1000, fontSize: '0.8125rem', marginTop: 12 }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '8px 4px', width: 28, textAlign: 'center', color: '#94a3b8', fontWeight: 400 }}>#</th>
                        {['학과*', '일자*', '시작교시*', '종료교시*', '과목명', '교수명', '소프트웨어', '사용목적', '배정호실*', ''].map((h) => (
                          <th key={h} style={{ padding: '8px 6px', textAlign: 'left', whiteSpace: 'nowrap', fontWeight: 600, color: '#475569' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {makeupRows.map((row, rowIdx) => {
                        const timeReady = row.date && row.periodStart > 0 && row.periodEnd > 0;
                        const fillInRange = fillDrag !== null && fillDrag.targetKey !== null && (() => {
                          const si = makeupRows.findIndex((r) => r.key === fillDrag.sourceKey);
                          const ti = makeupRows.findIndex((r) => r.key === fillDrag.targetKey);
                          return rowIdx > si && rowIdx <= ti;
                        })();
                        const isSelected = selectedRowKeys.has(row.key);
                        const fillCell = (field: keyof MakeupRow): React.CSSProperties =>
                          fillInRange && fillDrag?.field === field ? { background: '#eff6ff' } : {};
                        const cellStyle: React.CSSProperties = { padding: '4px 4px', borderBottom: '1px solid #e2e8f0', verticalAlign: 'top', position: 'relative' };
                        const inputStyle: React.CSSProperties = { width: '100%', border: '1px solid #e2e8f0', borderRadius: 4, padding: '4px 6px', fontSize: '0.8125rem', outline: 'none', background: '#fff' };
                        const handle = (field: keyof MakeupRow) => fillDrag ? null : (
                          <div
                            className="tt-fill-handle"
                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setFillDrag({ field, sourceKey: row.key, targetKey: null }); }}
                          />
                        );
                        return (
                          <tr key={row.key}
                            style={{ background: isSelected ? '#dbeafe' : row.key % 2 === 0 ? '#fff' : '#fafafa' }}
                            onMouseEnter={() => {
                              if (fillDrag) setFillDrag((p) => p ? { ...p, targetKey: row.key } : p);
                              if (rowDrag) setRowDrag((p) => p ? { ...p, endKey: row.key } : p);
                            }}>
                            <td
                              style={{ padding: '4px 2px', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', cursor: 'ns-resize', userSelect: 'none', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', background: isSelected ? '#bfdbfe' : 'transparent', minWidth: 24 }}
                              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setRowDrag({ startKey: row.key, endKey: row.key }); setSelectedRowKeys(new Set([row.key])); }}
                            >
                              {rowIdx + 1}
                            </td>
                            <td style={{ ...cellStyle, ...fillCell('department') }}>
                              <input style={{ ...inputStyle, minWidth: 110 }} placeholder="학과명" value={row.department}
                                onChange={(e) => updateRow(row.key, { department: e.target.value })} />
                              {handle('department')}
                            </td>
                            <td style={{ ...cellStyle, ...fillCell('date') }}>
                              <input type="date" style={{ ...inputStyle, minWidth: 120 }} value={row.date}
                                onChange={(e) => handleRowTimeChange(row.key, row, { date: e.target.value })} />
                              {handle('date')}
                            </td>
                            <td style={{ ...cellStyle, ...fillCell('periodStart') }}>
                              <select style={{ ...inputStyle, minWidth: 120 }}
                                value={row.periodStart > 0 ? `${row.periodType}:${row.periodStart}` : ''}
                                onChange={(e) => {
                                  const opt = ALL_PERIOD_OPTIONS.find((o) => o.value === e.target.value);
                                  if (!opt) return;
                                  const newEnd = row.periodEnd > 0 && row.periodType === opt.periodType && row.periodEnd >= opt.period ? row.periodEnd : opt.period;
                                  handleRowTimeChange(row.key, row, { periodType: opt.periodType, periodStart: opt.period, periodEnd: newEnd });
                                }}>
                                <option value="">선택</option>
                                {ALL_PERIOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                              {handle('periodStart')}
                            </td>
                            <td style={{ ...cellStyle, ...fillCell('periodEnd') }}>
                              <select style={{ ...inputStyle, minWidth: 120 }}
                                value={row.periodEnd > 0 ? `${row.periodType}:${row.periodEnd}` : ''}
                                onChange={(e) => {
                                  const opt = ALL_PERIOD_OPTIONS.find((o) => o.value === e.target.value);
                                  if (!opt) return;
                                  handleRowTimeChange(row.key, row, { periodEnd: opt.period });
                                }}>
                                <option value="">선택</option>
                                {ALL_PERIOD_OPTIONS.filter((o) => o.periodType === row.periodType && (row.periodStart === 0 || o.period >= row.periodStart)).map((o) => (
                                  <option key={o.value} value={o.value}>{o.endLabel}</option>
                                ))}
                              </select>
                              {handle('periodEnd')}
                            </td>
                            <td style={{ ...cellStyle, ...fillCell('courseName') }}>
                              <input style={{ ...inputStyle, minWidth: 100 }} placeholder="선택" value={row.courseName}
                                onChange={(e) => updateRow(row.key, { courseName: e.target.value })} />
                              {handle('courseName')}
                            </td>
                            <td style={{ ...cellStyle, ...fillCell('professor') }}>
                              <input style={{ ...inputStyle, minWidth: 80 }} placeholder="선택" value={row.professor}
                                onChange={(e) => updateRow(row.key, { professor: e.target.value })} />
                              {handle('professor')}
                            </td>
                            <td style={{ ...cellStyle, ...fillCell('softwareNote') }}>
                              <input style={{ ...inputStyle, minWidth: 100 }} placeholder="선택" value={row.softwareNote}
                                onChange={(e) => updateRow(row.key, { softwareNote: e.target.value })} />
                              {handle('softwareNote')}
                            </td>
                            <td style={{ ...cellStyle, ...fillCell('purpose') }}>
                              <input style={{ ...inputStyle, minWidth: 80 }} placeholder="선택" value={row.purpose}
                                onChange={(e) => updateRow(row.key, { purpose: e.target.value })} />
                              {handle('purpose')}
                            </td>
                            <td style={{ ...cellStyle, minWidth: 90 }}>
                              {!timeReady ? (
                                <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>시간 먼저 입력</span>
                              ) : (
                                <button
                                  style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid', fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap', background: row.classroomId > 0 ? '#1e40af' : '#fff', color: row.classroomId > 0 ? '#fff' : '#64748b', borderColor: row.classroomId > 0 ? '#3b82f6' : '#e2e8f0' }}
                                  onClick={(e) => {
                                    if (openRoomPickerKey === row.key) { setOpenRoomPickerKey(null); setRoomPickerPos(null); return; }
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setRoomPickerPos({ top: rect.bottom + 4, left: rect.left });
                                    setOpenRoomPickerKey(row.key);
                                  }}>
                                  {row.roomsLoading ? '검색 중...' : row.classroomId > 0 ? `${row.roomNumber}호 ▾` : '선택 ▾'}
                                </button>
                              )}
                            </td>
                            <td style={cellStyle}>
                              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.1rem', lineHeight: 1, padding: '2px 4px' }}
                                onClick={() => setMakeupRows((prev) => prev.filter((r) => r.key !== row.key))}>×</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: '10px 8px 0', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button className="tt-btn tt-btn-outline" style={{ fontSize: '0.8125rem' }}
                    onClick={() => { setMakeupRows((prev) => [...prev, newMakeupRow(makeupRowKey)]); setMakeupRowKey((k) => k + 1); }}>
                    + 행 추가
                  </button>
                  {selectedRowKeys.size > 0 && (
                    <button className="tt-btn tt-btn-danger" style={{ fontSize: '0.8125rem' }}
                      onClick={() => { setMakeupRows((prev) => prev.filter((r) => !selectedRowKeys.has(r.key))); setSelectedRowKeys(new Set()); }}>
                      선택 행 삭제 ({selectedRowKeys.size})
                    </button>
                  )}
                </div>
                {(() => {
                  const assigned = makeupRows.filter((r) => r.department && r.date && r.periodStart > 0 && r.classroomId > 0);
                  if (assigned.length === 0) return null;
                  const rows = assigned.map((r) => {
                    const { startTime, endTime } = getMakeupTimes(r.periodType, r.periodStart, r.periodEnd);
                    return { ...r, startTime, endTime };
                  });
                  const htmlTable = `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px;font-family:sans-serif;">
<thead><tr style="background:#f1f5f9;">
<th>학과</th><th>일자</th><th>시작시간</th><th>종료시간</th><th>과목명</th><th>교수명</th><th>배정호실</th>${rows.some(r => r.softwareNote) ? '<th>소프트웨어</th>' : ''}${rows.some(r => r.purpose) ? '<th>사용목적</th>' : ''}
</tr></thead>
<tbody>${rows.map((r) => `<tr><td>${r.department}</td><td>${r.date}</td><td>${r.startTime}</td><td>${r.endTime}</td><td>${r.courseName || '-'}</td><td>${r.professor || '-'}</td><td>${r.roomNumber}호</td>${rows.some(x => x.softwareNote) ? `<td>${r.softwareNote || '-'}</td>` : ''}${rows.some(x => x.purpose) ? `<td>${r.purpose || '-'}</td>` : ''}</tr>`).join('')}
</tbody></table>`;
                  const fullHtml = `<p>안녕하세요. ICT지원실 조교입니다.<br>보강 배정 결과를 안내드립니다.</p>${htmlTable}<p>감사합니다.</p>`;
                  const handleCopyEmail = async () => {
                    try {
                      await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([fullHtml], { type: 'text/html' }), 'text/plain': new Blob([`안녕하세요. ICT지원실 조교입니다.\n보강 배정 결과를 안내드립니다.\n\n${rows.map(r => `${r.department} | ${r.date} | ${r.startTime}~${r.endTime} | ${r.courseName || '-'} | ${r.professor || '-'} | ${r.roomNumber}호`).join('\n')}\n\n감사합니다.`], { type: 'text/plain' }) })]);
                      setMessage({ type: 'success', text: '답장 메일 내용이 클립보드에 복사되었습니다.' });
                    } catch {
                      setMessage({ type: 'error', text: '복사에 실패했습니다. 브라우저 권한을 확인하세요.' });
                    }
                  };
                  return (
                    <div style={{ margin: '16px 8px 0', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>답장 메일 양식</span>
                        <button className="tt-btn tt-btn-outline" style={{ fontSize: '0.8125rem' }} onClick={handleCopyEmail}>복사</button>
                      </div>
                      <div style={{ padding: '14px 16px', fontSize: '0.8125rem', color: '#374151', lineHeight: 1.7 }}>
                        <p style={{ margin: '0 0 10px' }}>안녕하세요. ICT지원실 조교입니다.<br />보강 배정 결과를 안내드립니다.</p>
                        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.8125rem' }}>
                          <thead>
                            <tr style={{ background: '#f1f5f9' }}>
                              {['학과', '일자', '시작시간', '종료시간', '과목명', '교수명', '배정호실', ...(rows.some(r => r.softwareNote) ? ['소프트웨어'] : []), ...(rows.some(r => r.purpose) ? ['사용목적'] : [])].map((h) => (
                                <th key={h} style={{ border: '1px solid #e2e8f0', padding: '5px 8px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap', color: '#475569' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r, i) => (
                              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                {[r.department, r.date, r.startTime, r.endTime, r.courseName || '-', r.professor || '-', `${r.roomNumber}호`, ...(rows.some(x => x.softwareNote) ? [r.softwareNote || '-'] : []), ...(rows.some(x => x.purpose) ? [r.purpose || '-'] : [])].map((v, j) => (
                                  <td key={j} style={{ border: '1px solid #e2e8f0', padding: '5px 8px', whiteSpace: 'nowrap' }}>{v}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <p style={{ margin: '10px 0 0' }}>감사합니다.</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Render: Classroom ──
  const renderClassroom = () => (
    <div>
      <div className="tt-section-header">
        <div>
          <h2 className="tt-section-title">강의실 관리</h2>
          <p className="tt-section-desc">강의실 정보 및 소프트웨어를 관리합니다</p>
        </div>
      </div>

      <div className="tt-add-card">
        <h4 className="tt-add-card-title">강의실 추가</h4>
        <div className="tt-add-form-row">
          <div className="tt-add-form-field">
            <span className="tt-add-form-label">호실 번호</span>
            <input
              className="tt-input"
              type="number"
              value={crForm.roomNumber}
              onChange={(e) => setCrForm((p) => ({ ...p, roomNumber: e.target.value }))}
              placeholder="예: 301"
              style={{ width: 100 }}
            />
          </div>
          <div className="tt-add-form-field">
            <span className="tt-add-form-label">층</span>
            <input
              className="tt-input"
              type="number"
              value={crForm.floor}
              onChange={(e) => setCrForm((p) => ({ ...p, floor: e.target.value }))}
              placeholder="예: 3"
              style={{ width: 72 }}
            />
          </div>
          <div className="tt-add-form-field">
            <span className="tt-add-form-label">PC 등급</span>
            <select
              className="tt-select"
              value={crForm.grade}
              onChange={(e) => setCrForm((p) => ({ ...p, grade: e.target.value }))}
            >
              {[1, 2, 3, 4, 5].map((g) => <option key={g} value={g}>{g}등급</option>)}
            </select>
          </div>
          <button
            className="tt-btn tt-btn-primary"
            onClick={handleCrCreate}
            disabled={crFormLoading}
            style={{ marginTop: 'auto' }}
          >
            추가
          </button>
        </div>
      </div>

      {classroomLoading ? (
        <p className="tt-loading">로딩 중...</p>
      ) : classrooms.length === 0 ? (
        <p className="tt-empty">등록된 강의실이 없습니다.</p>
      ) : (
        <div className="tt-table-wrap">
          <table className="tt-table">
            <thead>
              <tr>
                <th>호실</th>
                <th>층</th>
                <th>PC 등급</th>
                <th>소프트웨어 관리</th>
              </tr>
            </thead>
            <tbody>
              {classrooms.map((c) => (
                <Fragment key={c.id}>
                  <tr>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{c.roomNumber}호</td>
                    <td>{c.floor}층</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <select
                          className="tt-select"
                          value={editGrades[c.id] ?? c.grade}
                          onChange={(e) =>
                            setEditGrades((prev) => ({ ...prev, [c.id]: Number(e.target.value) }))
                          }
                          style={{ width: 90 }}
                        >
                          {[1, 2, 3, 4, 5].map((g) => (
                            <option key={g} value={g}>{g}등급</option>
                          ))}
                        </select>
                        {(editGrades[c.id] ?? c.grade) !== c.grade && (
                          <button
                            className="tt-btn tt-btn-primary tt-btn-xs"
                            onClick={() => handleGradeSave(c.id)}
                          >
                            저장
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <button
                        className={`tt-btn tt-btn-xs ${expandedCrId === c.id ? 'tt-btn-outline' : 'tt-btn-secondary'}`}
                        onClick={() => handleToggleCrExpand(c.id)}
                      >
                        {expandedCrId === c.id ? '닫기' : '소프트웨어 관리'}
                      </button>
                    </td>
                  </tr>
                  {expandedCrId === c.id && (
                    <tr className="tt-sw-expand-row">
                      <td colSpan={4}>
                        <div className="tt-sw-expand-inner">
                          <div style={{ flex: 1 }}>
                            <p className="tt-sw-expand-label">설치된 소프트웨어</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 8 }}>
                              {(crSoftwares[c.id] || []).length === 0 ? (
                                <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>없음</span>
                              ) : (
                                (crSoftwares[c.id] || []).map((sw) => (
                                  <span
                                    key={sw.id}
                                    className={`tt-sw-tag${sw.isDefault ? ' tt-sw-tag-default' : ''}`}
                                  >
                                    {sw.softwareName}
                                    <button
                                      className="tt-sw-tag-remove"
                                      onClick={() => handleRemoveSwFromClassroom(c.id, sw.softwareId)}
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))
                              )}
                            </div>
                            <div className="tt-sw-add-row">
                              <select
                                className="tt-select"
                                value={addSwSelect[c.id] || ''}
                                onChange={(e) =>
                                  setAddSwSelect((prev) => ({ ...prev, [c.id]: e.target.value }))
                                }
                              >
                                <option value="">소프트웨어 선택</option>
                                {allSoftwares
                                  .filter(
                                    (sw) => !(crSoftwares[c.id] || []).some((cs) => cs.softwareId === sw.id)
                                  )
                                  .map((sw) => (
                                    <option key={sw.id} value={sw.id}>{sw.name}</option>
                                  ))}
                              </select>
                              <button
                                className="tt-btn tt-btn-primary tt-btn-xs"
                                onClick={() => handleAddSwToClassroom(c.id)}
                                disabled={!addSwSelect[c.id]}
                              >
                                추가
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ── Render: Software ──
  const renderSoftware = () => (
    <div>
      <div className="tt-section-header">
        <div>
          <h2 className="tt-section-title">소프트웨어 관리</h2>
          <p className="tt-section-desc">설치 소프트웨어 목록 및 별칭을 관리합니다</p>
        </div>
      </div>

      <div className="tt-add-card">
        <h4 className="tt-add-card-title">소프트웨어 추가</h4>
        <div className="tt-add-form-row">
          <div className="tt-add-form-field">
            <span className="tt-add-form-label">이름</span>
            <input
              className="tt-input"
              value={swForm.name}
              onChange={(e) => setSwForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="소프트웨어 이름"
              style={{ width: 160 }}
            />
          </div>
          <div className="tt-add-form-field" style={{ flex: 1, minWidth: 160 }}>
            <span className="tt-add-form-label">별칭 (쉼표 구분)</span>
            <input
              className="tt-input"
              value={swForm.aliases}
              onChange={(e) => setSwForm((p) => ({ ...p, aliases: e.target.value }))}
              placeholder="예: VS Code, vscode"
              style={{ width: '100%' }}
            />
          </div>
          <div className="tt-add-form-field">
            <span className="tt-add-form-label">기본 설치</span>
            <label className="tt-checkbox-row" style={{ marginTop: 8 }}>
              <input
                type="checkbox"
                checked={swForm.isDefault}
                onChange={(e) => setSwForm((p) => ({ ...p, isDefault: e.target.checked }))}
              />
              기본 설치
            </label>
          </div>
          <button
            className="tt-btn tt-btn-primary"
            onClick={handleSwCreate}
            disabled={swFormLoading}
            style={{ marginTop: 'auto' }}
          >
            추가
          </button>
        </div>
      </div>

      {softwareLoading ? (
        <p className="tt-loading">로딩 중...</p>
      ) : softwares.length === 0 ? (
        <p className="tt-empty">등록된 소프트웨어가 없습니다.</p>
      ) : (
        <div className="tt-table-wrap">
          <table className="tt-table">
            <thead>
              <tr>
                <th>이름</th>
                <th>기본 설치</th>
                <th>별칭</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {softwares.map((sw) => (
                <tr key={sw.id}>
                  <td style={{ fontWeight: 700, color: '#0f172a' }}>{sw.name}</td>
                  <td>
                    {sw.isDefault ? (
                      <span className="tt-badge tt-badge-blue">기본</span>
                    ) : (
                      <span className="tt-badge" style={{ background: '#f1f5f9', color: '#94a3b8' }}>선택</span>
                    )}
                  </td>
                  <td>
                    {editAliasMode[sw.id] ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                        <textarea
                          className="tt-modal-textarea"
                          value={editAliasText[sw.id] || ''}
                          onChange={(e) =>
                            setEditAliasText((prev) => ({ ...prev, [sw.id]: e.target.value }))
                          }
                          placeholder="별칭을 쉼표로 구분해 입력"
                          style={{ minHeight: 48, fontSize: '0.8125rem' }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                          <button
                            className="tt-btn tt-btn-primary tt-btn-xs"
                            onClick={() => handleAliasSave(sw.id)}
                            disabled={aliasLoading === sw.id}
                          >
                            저장
                          </button>
                          <button
                            className="tt-btn tt-btn-secondary tt-btn-xs"
                            onClick={() => setEditAliasMode((prev) => ({ ...prev, [sw.id]: false }))}
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => handleAliasEdit(sw)}
                        style={{ cursor: 'pointer' }}
                        title="클릭하여 편집"
                      >
                        {sw.aliases.length === 0 ? (
                          <span className="tt-alias-chip" style={{ color: '#94a3b8' }}>클릭하여 추가</span>
                        ) : (
                          sw.aliases.map((a, i) => (
                            <span key={i} className="tt-alias-chip">{a}</span>
                          ))
                        )}
                      </div>
                    )}
                  </td>
                  <td>
                    <button
                      className="tt-btn tt-btn-danger tt-btn-xs"
                      onClick={() => handleSwDelete(sw.id)}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderSwStatus = () => {
    const col2 = allClassroomSoftwares.filter((cr) => Math.floor(cr.roomNumber / 100) === 2).sort((a, b) => a.roomNumber - b.roomNumber);
    const col3 = allClassroomSoftwares.filter((cr) => Math.floor(cr.roomNumber / 100) === 3).sort((a, b) => a.roomNumber - b.roomNumber);
    const col4 = allClassroomSoftwares.filter((cr) => Math.floor(cr.roomNumber / 100) === 4).sort((a, b) => a.roomNumber - b.roomNumber);

    const renderColumn = (rooms: typeof allClassroomSoftwares) => (
      <div style={{ flex: 1, minWidth: 0 }}>
        {rooms.map((cr) => (
          <div key={cr.classroomId} style={{ marginBottom: 10, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a', padding: '6px 10px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {cr.roomNumber}호
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', padding: '6px 8px' }}>
              {cr.softwares.length === 0 ? (
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>없음</span>
              ) : (
                cr.softwares.map((sw) => (
                  <span key={sw.id} className={`tt-sw-tag${sw.default ? ' tt-sw-tag-default' : ''}`}>
                    {sw.softwareName}
                  </span>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    );

    return (
      <div>
        <div className="tt-section-header">
          <div>
            <h2 className="tt-section-title">호실별 소프트웨어 현황</h2>
            <p className="tt-section-desc">전체 강의실에 설치된 소프트웨어 목록입니다</p>
          </div>
          <button className="tt-btn tt-btn-secondary" onClick={loadAllClassroomSoftwares}>새로고침</button>
        </div>
        {allClassroomSoftwares.length === 0 ? (
          <p className="tt-empty">데이터가 없습니다.</p>
        ) : (
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            {renderColumn(col2)}
            {renderColumn(col3)}
            {renderColumn(col4)}
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'schedule':  return renderSchedule();
      case 'register':  return renderRegister();
      case 'makeup':    return renderMakeup();
      case 'classroom': return renderClassroom();
      case 'software':  return renderSoftware();
      case 'swstatus':  return renderSwStatus();
      default:          return renderSchedule();
    }
  };

  return (
    <div className="page timetable-page">
      {message && (
        <div
          className={`tt-message ${
            message.type === 'success' ? 'tt-message-success' : 'tt-message-error'
          }`}
        >
          {message.text}
        </div>
      )}
      {renderContent()}
      {confirmModal && createPortal(
        <div className="tt-modal-overlay" onClick={() => { if (!confirmLoading) setConfirmModal(null); }}>
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', width: 360, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 20 }} onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 700, color: '#111827' }}>{confirmModal.title}</h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.6 }}>{confirmModal.message}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="tt-btn tt-btn-outline" onClick={() => setConfirmModal(null)} disabled={confirmLoading}>취소</button>
              <button className="tt-btn tt-btn-danger" disabled={confirmLoading}
                onClick={async () => { setConfirmLoading(true); try { await confirmModal.onConfirm(); } finally { setConfirmLoading(false); setConfirmModal(null); } }}>
                {confirmLoading ? '처리 중...' : '확인'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
