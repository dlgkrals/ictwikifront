import ExcelJS from 'exceljs';

// ===== 강의실 배정 시트 컬럼 매핑 =====
// C1: 순위  C2: 학과  C3: 학년  C4: 반   C5: 교과목
// C6: 교수명  C7: 신청 소프트웨어  C9: 옵션
// C11: 강의실  C12: 주/야  C13: 요일  C14: 시간(1~3)

export interface ScheduleImportRow {
  department: string;
  grade?: number;
  section?: string;
  courseName: string;
  professor?: string;
  softwareNote?: string;
  optionStr?: string;
  dayOfWeek?: string;
  periodStr?: string;
  periodType?: string;
}

export interface ScheduleExcelImportRow extends ScheduleImportRow {
  priority?: number;
  roomNumber?: number;
}

function str(row: ExcelJS.Row, col: number): string {
  const v = row.getCell(col).value;
  if (v === null || v === undefined) return '';
  if (typeof v === 'object' && 'richText' in (v as object)) {
    return ((v as ExcelJS.CellRichTextValue).richText ?? []).map((r: { text: string }) => r.text).join('').trim();
  }
  return String(v).trim();
}

function num(row: ExcelJS.Row, col: number): number | undefined {
  const v = row.getCell(col).value;
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}

async function loadWorkbook(file: File): Promise<ExcelJS.Workbook> {
  const buffer = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  return wb;
}

function getTargetSheet(wb: ExcelJS.Workbook): ExcelJS.Worksheet {
  return wb.getWorksheet('강의실 배정') ?? wb.worksheets[0];
}

function parseRow(row: ExcelJS.Row): ScheduleExcelImportRow | null {
  const department = str(row, 2);
  const courseName  = str(row, 5);
  if (!department || !courseName) return null;

  return {
    priority:     num(row, 1),
    department,
    grade:        num(row, 3),
    section:      str(row, 4) || undefined,
    courseName,
    professor:    str(row, 6) || undefined,
    softwareNote: str(row, 7) || undefined,
    optionStr:    str(row, 9) || undefined,
    roomNumber:   num(row, 11),
    periodType:   str(row, 12) || undefined,
    dayOfWeek:    str(row, 13) || undefined,
    periodStr:    str(row, 14) || undefined,
  };
}

// 수강신청 가져오기 — roomNumber/priority 제외
export async function parseApplicationExcel(file: File): Promise<ScheduleImportRow[]> {
  const wb = await loadWorkbook(file);
  const ws = getTargetSheet(wb);
  const results: ScheduleImportRow[] = [];

  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const parsed = parseRow(row);
    if (!parsed) return;
    const { priority: _p, roomNumber: _r, ...rest } = parsed;
    results.push(rest);
  });

  return results;
}

// 시간표 가져오기 — 전체 필드 (강의실 포함)
export async function parseTimetableExcel(file: File): Promise<ScheduleExcelImportRow[]> {
  const wb = await loadWorkbook(file);
  const ws = getTargetSheet(wb);
  const results: ScheduleExcelImportRow[] = [];

  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const parsed = parseRow(row);
    if (parsed) results.push(parsed);
  });

  return results;
}
