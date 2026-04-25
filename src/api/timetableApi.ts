import apiClient from './client';

// ── Types ──────────────────────────────────────────

export interface ClassroomResponse {
  id: number;
  roomNumber: number;
  floor: number;
  grade: number;
}

export interface ClassroomSoftwareResponse {
  id: number;
  softwareId: number;
  softwareName: string;
  isDefault: boolean;
}

export interface SoftwareResponse {
  id: number;
  name: string;
  aliases: string[];
  isDefault: boolean;
}

export interface ScheduleResponse {
  id: number;
  semester: string;
  roomNumber: number;
  department: string;
  grade?: number;
  section?: string;
  courseName: string;
  professor: string;
  dayOfWeek: '월' | '화' | '수' | '목' | '금';
  periodType: '주' | '야';
  periodStart: number;
  periodEnd: number;
  startTime: string;
  endTime: string;
  softwareNote?: string;
  hasOption: boolean;
  optionNote?: string;
  priority: number;
}

export interface MakeupResponse {
  id: number;
  roomNumber: number;
  department: string;
  courseName?: string;
  professor?: string;
  date: string;
  startTime: string;
  endTime: string;
  softwareNote?: string;
  purpose?: string;
  note?: string;
}

export interface ScheduleCreateRequest {
  semester: string;
  classroomId?: number;
  department: string;
  grade?: number;
  section?: string;
  courseName: string;
  professor: string;
  dayOfWeek: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI';
  periodType: 'DAY' | 'NIGHT';
  periodStart: number;
  periodEnd: number;
  softwareNote?: string;
  hasOption?: boolean;
  optionNote?: string;
  priority?: number;
}

export interface MakeupCreateRequest {
  classroomId: number;
  department: string;
  courseName?: string;
  professor?: string;
  date: string;
  startTime: string;
  endTime: string;
  softwareNote?: string;
  purpose?: string;
  note?: string;
}

export interface MakeupAvailableRequest {
  date: string;
  startTime: string;
  endTime: string;
  softwareIds?: number[];
}

export interface ScheduleUpdateRequest {
  classroomId?: number;
  clearClassroom?: boolean;
  department?: string;
  grade?: number;
  section?: string;
  courseName?: string;
  professor?: string;
  dayOfWeek?: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI';
  periodType?: 'DAY' | 'NIGHT';
  periodStart?: number;
  periodEnd?: number;
  softwareNote?: string;
  hasOption?: boolean;
  optionNote?: string;
  priority?: number;
}

// ── API ────────────────────────────────────────────

export const timetableApi = {
  classrooms: {
    getAll: async (): Promise<ClassroomResponse[]> => {
      const res = await apiClient.get<ClassroomResponse[]>('/api/classrooms');
      return res.data;
    },
    getById: async (id: number): Promise<ClassroomResponse> => {
      const res = await apiClient.get<ClassroomResponse>(`/api/classrooms/${id}`);
      return res.data;
    },
    getAvailable: async (softwareIds?: number[]): Promise<ClassroomResponse[]> => {
      const params = softwareIds?.length ? { softwareIds: softwareIds.join(',') } : {};
      const res = await apiClient.get<ClassroomResponse[]>('/api/classrooms/available', { params });
      return res.data;
    },
    create: async (body: { roomNumber: number; floor: number; grade: number }): Promise<ClassroomResponse> => {
      const res = await apiClient.post<ClassroomResponse>('/api/classrooms', body);
      return res.data;
    },
    updateGrade: async (id: number, grade: number): Promise<ClassroomResponse> => {
      const res = await apiClient.patch<ClassroomResponse>(`/api/classrooms/${id}/grade`, { grade });
      return res.data;
    },
    getSoftwares: async (id: number): Promise<ClassroomSoftwareResponse[]> => {
      const res = await apiClient.get<ClassroomSoftwareResponse[]>(`/api/classrooms/${id}/softwares`);
      return res.data;
    },
    getAllSoftwares: async (): Promise<{ classroomId: number; roomNumber: number; floor: number; grade: number; softwares: { id: number; softwareId: number; softwareName: string; default: boolean }[] }[]> => {
      const res = await apiClient.get('/api/classrooms/softwares');
      return res.data;
    },
    autoAssignSoftwares: async (semester: string): Promise<{ semester: string; classroomCount: number; assignedCount: number; failureCount: number }> => {
      const res = await apiClient.post('/api/classrooms/software-auto', null, { params: { semester } });
      return res.data;
    },
    addSoftware: async (id: number, softwareId: number): Promise<void> => {
      await apiClient.post(`/api/classrooms/${id}/softwares`, { softwareId });
    },
    removeSoftware: async (id: number, softwareId: number): Promise<void> => {
      await apiClient.delete(`/api/classrooms/${id}/softwares/${softwareId}`);
    },
  },

  softwares: {
    getAll: async (): Promise<SoftwareResponse[]> => {
      const res = await apiClient.get<SoftwareResponse[]>('/api/softwares');
      return res.data;
    },
    search: async (keyword: string): Promise<SoftwareResponse[]> => {
      const res = await apiClient.get<SoftwareResponse[]>('/api/softwares/search', { params: { keyword } });
      return res.data;
    },
    create: async (body: { name: string; aliases?: string[]; isDefault: boolean }): Promise<SoftwareResponse> => {
      const res = await apiClient.post<SoftwareResponse>('/api/softwares', body);
      return res.data;
    },
    updateAliases: async (id: number, aliases: string[]): Promise<SoftwareResponse> => {
      const res = await apiClient.put<SoftwareResponse>(`/api/softwares/${id}/aliases`, { aliases });
      return res.data;
    },
    delete: async (id: number): Promise<void> => {
      await apiClient.delete(`/api/softwares/${id}`);
    },
  },

  schedules: {
    getSemesters: async (): Promise<string[]> => {
      const res = await apiClient.get<string[]>('/api/schedules/semesters');
      return res.data;
    },
    getBySemester: async (semester: string): Promise<ScheduleResponse[]> => {
      const res = await apiClient.get<ScheduleResponse[]>('/api/schedules', { params: { semester } });
      return res.data;
    },
    getById: async (id: number): Promise<ScheduleResponse> => {
      const res = await apiClient.get<ScheduleResponse>(`/api/schedules/${id}`);
      return res.data;
    },
    getByClassroom: async (classroomId: number): Promise<ScheduleResponse[]> => {
      const res = await apiClient.get<ScheduleResponse[]>(`/api/schedules/classroom/${classroomId}`);
      return res.data;
    },
    create: async (body: ScheduleCreateRequest): Promise<ScheduleResponse> => {
      const res = await apiClient.post<ScheduleResponse>('/api/schedules', body);
      return res.data;
    },
    update: async (id: number, body: ScheduleUpdateRequest): Promise<ScheduleResponse> => {
      const res = await apiClient.patch<ScheduleResponse>(`/api/schedules/${id}`, body);
      return res.data;
    },
    delete: async (id: number): Promise<void> => {
      await apiClient.delete(`/api/schedules/${id}`);
    },
    deleteAllBySemester: async (semester: string): Promise<void> => {
      await apiClient.delete('/api/schedules', { params: { semester } });
    },
    importApplication: async (semester: string, file: File): Promise<ScheduleResponse[]> => {
      const form = new FormData();
      // 한글 파일명은 multipart 전송 시 인코딩 오류 발생 → ASCII 이름으로 교체
      const safeFile = new File([file], 'application_import.xlsx', { type: file.type });
      form.append('file', safeFile);
      form.append('semester', semester);
      const res = await apiClient.post<ScheduleResponse[]>('/api/schedules/import/application', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    importTimetable: async (semester: string, file: File): Promise<ScheduleResponse[]> => {
      const form = new FormData();
      // 한글 파일명은 multipart 전송 시 인코딩 오류 발생 → ASCII 이름으로 교체
      const safeFile = new File([file], 'timetable_import.xlsx', { type: file.type });
      form.append('file', safeFile);
      form.append('semester', semester);
      const res = await apiClient.post<ScheduleResponse[]>('/api/schedules/import/timetable', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    getUnassigned: async (): Promise<ScheduleResponse[]> => {
      const res = await apiClient.get<ScheduleResponse[]>('/api/schedules/import/unassigned');
      return res.data;
    },
    assignClassroom: async (id: number, classroomId: number): Promise<ScheduleResponse> => {
      const res = await apiClient.patch<ScheduleResponse>(`/api/schedules/import/${id}/assign`, { classroomId });
      return res.data;
    },
    exportExcel: async (semester: string): Promise<Blob> => {
      const res = await apiClient.get('/api/schedules/export', {
        params: { semester },
        responseType: 'blob',
      });
      return res.data;
    },
  },

  makeups: {
    getByMonth: async (year: number, month: number): Promise<MakeupResponse[]> => {
      const res = await apiClient.get<MakeupResponse[]>('/api/makeups', { params: { year, month } });
      return res.data;
    },
    getById: async (id: number): Promise<MakeupResponse> => {
      const res = await apiClient.get<MakeupResponse>(`/api/makeups/${id}`);
      return res.data;
    },
    getAvailableClassrooms: async (body: MakeupAvailableRequest): Promise<ClassroomResponse[]> => {
      const res = await apiClient.post<ClassroomResponse[]>('/api/makeups/available-classrooms', body);
      return res.data;
    },
    create: async (body: MakeupCreateRequest): Promise<MakeupResponse> => {
      const res = await apiClient.post<MakeupResponse>('/api/makeups', body);
      return res.data;
    },
    createBatch: async (bodies: MakeupCreateRequest[]): Promise<MakeupResponse[]> => {
      const res = await apiClient.post<MakeupResponse[]>('/api/makeups/batch', bodies);
      return res.data;
    },
    delete: async (id: number): Promise<void> => {
      await apiClient.delete(`/api/makeups/${id}`);
    },
  },
};
