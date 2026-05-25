import ExcelJS from 'exceljs';
import type { ScheduleExportResponse, ScheduleExportFloorData, ScheduleExportNightGroup } from '../types';

// ===== 레이아웃 상수 (백엔드 SEC*F_COL, 1-indexed) =====
const SEC2F = 1;
const SEC3F = 18;
const SEC4F = 35;
const FLOOR_SECCOLS = [SEC2F, SEC3F, SEC4F] as const;

// ===== 색상 =====
const COLOR_DATA        = 'FFFFF2CC';
const COLOR_GRAY_HEADER = 'FFC0C0C0';
const COLOR_NIGHT_LABEL = 'FFFFFF00';

// ===== 행 높이 (pt) =====
const H_DATA = 45;

// ===== 주간 빈 칸 병합 구간 (0-indexed, exclusive end) =====
const DAY_SEGMENTS: [number, number][] = [[0, 3], [4, 10]];

// ===== 야간 그룹 =====
const NIGHT_GROUP_SIZE  = 3;
const NIGHT_GROUP_COUNT = 2;

// ===== 스타일 =====
function border(): Partial<ExcelJS.Borders> {
  const t: ExcelJS.Border = { style: 'thin', color: { argb: 'FF000000' } };
  return { top: t, bottom: t, left: t, right: t };
}

function applyHeader(cell: ExcelJS.Cell) {
  cell.font      = { name: '맑은 고딕', size: 9, bold: true };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GRAY_HEADER } };
  cell.border    = border();
}

function applyDay(cell: ExcelJS.Cell) {
  cell.font      = { name: '맑은 고딕', size: 10, bold: true };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  cell.border    = border();
}

function applyBorderOnly(cell: ExcelJS.Cell) {
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  cell.border    = border();
}

function applyTime(cell: ExcelJS.Cell) {
  cell.font      = { name: '맑은 고딕', size: 9 };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cell.border    = border();
}

function applyData(cell: ExcelJS.Cell, filled: boolean) {
  cell.font      = { name: '맑은 고딕', size: 9 };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cell.border    = border();
  if (filled) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_DATA } };
  }
}

function applyNightLabel(cell: ExcelJS.Cell) {
  cell.font      = { name: '맑은 고딕', size: 11, bold: true };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NIGHT_LABEL } };
  cell.border    = border();
}

// ===== 셀 쓰기 =====
function sc(ws: ExcelJS.Worksheet, rn: number, col: number, value: string, fn: (c: ExcelJS.Cell) => void) {
  const cell = ws.getRow(rn).getCell(col);
  cell.value = value;
  fn(cell);
}

// ===== 열 너비 =====
function setColumnWidths(ws: ExcelJS.Worksheet, floors: ScheduleExportFloorData[]) {
  FLOOR_SECCOLS.forEach((secCol, fi) => {
    ws.getColumn(secCol).width     = 5;
    ws.getColumn(secCol + 1).width = 8;
    floors[fi].rooms.forEach((_, ri) => {
      ws.getColumn(secCol + 2 + ri).width = 8.17;
    });
    if (fi < 2) {
      ws.getColumn(secCol + 2 + floors[fi].rooms.length).width = 2; // gap
    }
  });
}

// ===== 전체 헤더 행 (요일 | 시간 | 호실번호 × n층) =====
function writeHeaderRow(ws: ExcelJS.Worksheet, rn: number, floors: ScheduleExportFloorData[], floorCount = floors.length) {
  for (let fi = 0; fi < floorCount; fi++) {
    const secCol = FLOOR_SECCOLS[fi];
    sc(ws, rn, secCol,     '요일', applyHeader);
    sc(ws, rn, secCol + 1, '시간', applyHeader);
    floors[fi].rooms.forEach((roomNum, ri) => {
      sc(ws, rn, secCol + 2 + ri, `배 ${roomNum}`, applyHeader);
    });
  }
}

// ===== 주간 교시 행 =====
function writeDayPeriodRow(
  ws: ExcelJS.Worksheet,
  rn: number,
  periodIdx: number,
  floors: ScheduleExportFloorData[],
  dayIdx: number,
) {
  floors.forEach((floor, fi) => {
    const secCol    = FLOOR_SECCOLS[fi];
    const periodRow = floor.days[dayIdx].dayPeriods[periodIdx];
    sc(ws, rn, secCol + 1, periodRow.periodLabel, applyTime);
    floor.rooms.forEach((roomNum, ri) => {
      const cell = ws.getRow(rn).getCell(secCol + 2 + ri);
      const cd   = periodRow.cells[String(roomNum)];
      if (cd) {
        cell.value = `${cd.courseName}\n${cd.professor}\n${cd.grade}-${cd.section}`;
        applyData(cell, true);
      } else {
        applyData(cell, false);
      }
    });
  });
}

// ===== 요일 셀 (세로 병합) =====
function writeDayCell(ws: ExcelJS.Worksheet, dayRowStart: number, periodCount: number, label: string, secCol: number) {
  sc(ws, dayRowStart, secCol, label, applyDay);
  for (let i = 1; i < periodCount; i++) {
    applyBorderOnly(ws.getRow(dayRowStart + i).getCell(secCol));
  }
  if (periodCount > 1) {
    ws.mergeCells(dayRowStart, secCol, dayRowStart + periodCount - 1, secCol);
  }
}

// ===== 주간 구분행 =====
// 참고 엑셀 구조: 2F/4F → 요일열 비움, 3F → "요일" 표시; 전 층 시간+호실번호 포함
function writeDaySepRow(ws: ExcelJS.Worksheet, rn: number, floors: ScheduleExportFloorData[]) {
  floors.forEach((floor, fi) => {
    const secCol = FLOOR_SECCOLS[fi];
    if (fi === 1) {
      // 3F만 "요일" 표시
      sc(ws, rn, secCol, '요일', applyHeader);
    } else {
      applyBorderOnly(ws.getRow(rn).getCell(secCol));
    }
    sc(ws, rn, secCol + 1, '시간', applyTime);
    floor.rooms.forEach((roomNum, ri) => {
      sc(ws, rn, secCol + 2 + ri, `배 ${roomNum}`, applyHeader);
    });
  });
}

// ===== 야간 구분행 — 전 층 풀 헤더 =====
function writeNightSepRow(ws: ExcelJS.Worksheet, rn: number, floors: ScheduleExportFloorData[]) {
  writeHeaderRow(ws, rn, floors);
}

// ===== 주간 수업 셀 병합 =====
function mergeFilledDayPeriods(
  ws: ExcelJS.Worksheet,
  dayRowStart: number,
  floor: ScheduleExportFloorData,
  dayIdx: number,
  roomColOffset: number,
) {
  const dayPeriods = floor.days[dayIdx].dayPeriods;
  const maxPeriod  = dayPeriods.length;

  floor.rooms.forEach((roomNum, ri) => {
    const col     = roomColOffset + ri;
    const roomKey = String(roomNum);
    let p = 0;
    while (p < maxPeriod) {
      const cd   = dayPeriods[p]?.cells[roomKey];
      const span = cd?.rowSpan ?? 1;
      if (cd && span > 1) {
        const mergeStart = dayRowStart + p;
        const mergeEnd   = mergeStart + span - 1;
        if (mergeEnd < dayRowStart + maxPeriod) {
          try { ws.mergeCells(mergeStart, col, mergeEnd, col); } catch { /* ignore */ }
        }
      }
      p += span;
    }
  });
}

// ===== 주간 빈 칸 병합 =====
function mergeEmptyDay(
  ws: ExcelJS.Worksheet,
  dayRowStart: number,
  floor: ScheduleExportFloorData,
  dayIdx: number,
  roomColOffset: number,
) {
  const dayPeriods = floor.days[dayIdx].dayPeriods;

  floor.rooms.forEach((roomNum, ri) => {
    const col     = roomColOffset + ri;
    const roomKey = String(roomNum);

    for (const [segStart, segEnd] of DAY_SEGMENTS) {
      let p = segStart;
      while (p < segEnd) {
        const cd = dayPeriods[p]?.cells[roomKey];
        if (cd) {
          p += cd.rowSpan ?? 1;
          continue;
        }
        const emptyStart = p;
        while (p < segEnd && !dayPeriods[p]?.cells[roomKey]) p++;
        let idx = emptyStart;
        while (idx < p) {
          const blockSize = Math.min(3, p - idx);
          if (blockSize >= 2) {
            try { ws.mergeCells(dayRowStart + idx, col, dayRowStart + idx + blockSize - 1, col); } catch { /* ignore */ }
          }
          idx += blockSize;
        }
      }
    }
  });
}

// ===== 야간 레이블 (2층/3층/4층 야간, 3행 병합) =====
function writeNightLabels(ws: ExcelJS.Worksheet, rn: number, floors: ScheduleExportFloorData[]) {
  const labels = ['2층 야간', '3층 야간', '4층 야간'];
  floors.forEach((floor, fi) => {
    const secCol  = FLOOR_SECCOLS[fi];
    const lastCol = secCol + 1 + floor.rooms.length;
    for (let r = 0; r < 3; r++) {
      for (let c = secCol; c <= lastCol; c++) {
        const cell = ws.getRow(rn + r).getCell(c);
        if (r === 0 && c === secCol) cell.value = labels[fi];
        applyNightLabel(cell);
      }
    }
    ws.mergeCells(rn, secCol, rn + 2, lastCol);
  });
}

// ===== 야간 교시 행 =====
function writeNightPeriodRow(
  ws: ExcelJS.Worksheet,
  rn: number,
  periodOffset: number,
  floor: ScheduleExportFloorData,
  dayIdx: number,
  secCol: number,
) {
  const groupIdx   = periodOffset < NIGHT_GROUP_SIZE ? 0 : 1;
  const inGroupIdx = periodOffset % NIGHT_GROUP_SIZE;
  const group: ScheduleExportNightGroup = floor.days[dayIdx].nightGroups[groupIdx];

  sc(ws, rn, secCol + 1, group.periodLabels[inGroupIdx], applyTime);

  floor.rooms.forEach((roomNum, ri) => {
    const cell = ws.getRow(rn).getCell(secCol + 2 + ri);
    const cd   = inGroupIdx === 0 ? group.cells[String(roomNum)] : null;
    if (cd) {
      cell.value = `${cd.courseName}\n${cd.professor}\n${cd.grade}-${cd.section}`;
      applyData(cell, true);
    } else {
      applyData(cell, false);
    }
  });
}

// ===== 야간 셀 병합 (그룹 3교시 단위) =====
function mergeNightCells(ws: ExcelJS.Worksheet, dayRowStart: number, floor: ScheduleExportFloorData, roomColOffset: number) {
  for (let gi = 0; gi < NIGHT_GROUP_COUNT; gi++) {
    const groupRowStart = dayRowStart + gi * NIGHT_GROUP_SIZE;
    floor.rooms.forEach((_, ri) => {
      try { ws.mergeCells(groupRowStart, roomColOffset + ri, groupRowStart + NIGHT_GROUP_SIZE - 1, roomColOffset + ri); } catch { /* ignore */ }
    });
  }
}

// ===== 메인 export 함수 =====
export async function generateScheduleExportExcel(data: ScheduleExportResponse): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('2F공용PC실습실');

  setColumnWidths(ws, data.floors);

  const DAYS          = 5;
  const DAY_PERIODS   = 10;
  const NIGHT_PERIODS = 6;

  let rn = 1;

  // ===== 주간 헤더 =====
  writeHeaderRow(ws, rn, data.floors);
  rn++;

  // ===== 주간 섹션 =====
  for (let d = 0; d < DAYS; d++) {
    const dayStart = rn;

    for (let p = 0; p < DAY_PERIODS; p++) {
      ws.getRow(rn + p).height = H_DATA;
      writeDayPeriodRow(ws, rn + p, p, data.floors, d);
    }

    FLOOR_SECCOLS.forEach((secCol, fi) => {
      writeDayCell(ws, dayStart, DAY_PERIODS, data.floors[fi].days[d].label, secCol);
    });

    data.floors.forEach((floor, fi) => {
      mergeFilledDayPeriods(ws, dayStart, floor, d, FLOOR_SECCOLS[fi] + 2);
      mergeEmptyDay(ws, dayStart, floor, d, FLOOR_SECCOLS[fi] + 2);
    });

    rn += DAY_PERIODS;

    if (d < DAYS - 1) {
      writeDaySepRow(ws, rn, data.floors);
      rn++;
    }
  }

  // ===== 야간 레이블 (2층/3층/4층 야간, 3행) =====
  writeNightLabels(ws, rn, data.floors);
  rn += 3;

  // ===== 야간 헤더 =====
  writeHeaderRow(ws, rn, data.floors);
  rn++;

  // ===== 야간 섹션 (전 층) =====
  for (let d = 0; d < DAYS; d++) {
    const dayStart = rn;

    for (let p = 0; p < NIGHT_PERIODS; p++) {
      ws.getRow(rn + p).height = H_DATA;
      data.floors.forEach((floor, fi) => {
        writeNightPeriodRow(ws, rn + p, p, floor, d, FLOOR_SECCOLS[fi]);
      });
    }

    data.floors.forEach((floor, fi) => {
      writeDayCell(ws, dayStart, NIGHT_PERIODS, floor.days[d].label, FLOOR_SECCOLS[fi]);
      mergeNightCells(ws, dayStart, floor, FLOOR_SECCOLS[fi] + 2);
    });

    rn += NIGHT_PERIODS;

    if (d < DAYS - 1) {
      writeNightSepRow(ws, rn, data.floors);
      rn++;
    }
  }

  // ===== 다운로드 =====
  const buffer = await wb.xlsx.writeBuffer();
  const blob   = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = `${data.semester}_시간표.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
