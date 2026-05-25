import ExcelJS from 'exceljs';
import type { DailyReportResponse, DailyReportInquiryRowData } from '../types';

// ===== 색상 (백엔드 palette index 40~42 대응) =====
const COLOR_BEIGE  = 'FFEEECE1'; // index 40
const COLOR_SILVER = 'FFC0C0C0'; // index 41
const COLOR_WHITE  = 'FFFFFFFF'; // index 42

type HAlign = 'center' | 'left' | 'right';
type VAlign = 'middle' | 'top' | 'bottom';

interface StyleOptions {
  bold?: boolean;
  fontSize?: number; // 백엔드 fontHeight(twip) → pt 변환: /20
  bgColor?: string;  // ARGB
  hAlign?: HAlign;
  vAlign?: VAlign;
  borders?: boolean;
}

function applyStyle(cell: ExcelJS.Cell, opts: StyleOptions) {
  cell.font = {
    name: '맑은 고딕',
    bold: opts.bold ?? false,
    size: opts.fontSize ?? 10,
  };
  cell.alignment = {
    horizontal: opts.hAlign ?? 'left',
    vertical:   opts.vAlign ?? 'middle',
    wrapText:   true,
  };
  if (opts.bgColor) {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: opts.bgColor },
    };
  }
  if (opts.borders) {
    cell.border = {
      top:    { style: 'thin' },
      bottom: { style: 'thin' },
      left:   { style: 'thin' },
      right:  { style: 'thin' },
    };
  }
}

// 백엔드 makeStyle 파라미터 대응
// fontHeight(twip) → size(pt): /20
const STYLES = {
  title:     { bold: false, fontSize: 22,  hAlign: 'center' as HAlign, vAlign: 'middle' as VAlign, borders: false },
  dateBold:  { bold: true,  fontSize: 14,  hAlign: 'left'   as HAlign, vAlign: 'middle' as VAlign, borders: false },
  nameNorm:  { bold: false, fontSize: 11,  hAlign: 'left'   as HAlign, vAlign: 'middle' as VAlign, borders: false },
  empty:     { bold: false, fontSize: 10,  hAlign: 'left'   as HAlign, vAlign: 'middle' as VAlign, borders: false },
  white:     { bold: false, fontSize: 10,  bgColor: COLOR_WHITE,  hAlign: 'left'   as HAlign, vAlign: 'middle' as VAlign, borders: false },
  header:    { bold: true,  fontSize: 11,  bgColor: COLOR_BEIGE,  hAlign: 'center' as HAlign, vAlign: 'middle' as VAlign, borders: true  },
  dataC:     { bold: false, fontSize: 10,  hAlign: 'center' as HAlign, vAlign: 'middle' as VAlign, borders: true  },
  dataL:     { bold: false, fontSize: 10,  hAlign: 'left'   as HAlign, vAlign: 'middle' as VAlign, borders: true  },
  secTitle:  { bold: true,  fontSize: 18,  hAlign: 'center' as HAlign, vAlign: 'middle' as VAlign, borders: false },
  signLabel: { bold: true,  fontSize: 11,  bgColor: COLOR_SILVER, hAlign: 'center' as HAlign, vAlign: 'middle' as VAlign, borders: true  },
  signValue: { bold: false, fontSize: 11,  hAlign: 'left'   as HAlign, vAlign: 'middle' as VAlign, borders: true  },
};

// 백엔드 row.setHeight(twip) → ExcelJS row.height(pt): /15 (1pt = 15 twips in HSSF)
const H = {
  title:    560 / 15,
  blank135: 135 / 15,
  r2:       375 / 15,
  blank120: 120 / 15,
  header:   435 / 15,
  dataRow:  435 / 15,
  dataRowB: 495 / 15,
  div:      495 / 15,
  secTitle: 495 / 15,
  sign:     495 / 15,
};

// 백엔드 setColumnWidth(units * 256) → ExcelJS width(chars): units
// 원본: 2133/256≈8.33, 2730/256≈10.66, 2432/256≈9.5, 14506/256≈56.66, 7680/256=30, 2602/256≈10.16
const COL_WIDTHS = [8.33, 10.66, 9.5, 56.66, 10.66, 10.66, 30, 10.16, 10.16];

function setRow(ws: ExcelJS.Worksheet, rowNum: number, height: number): ExcelJS.Row {
  const row = ws.getRow(rowNum);
  row.height = height;
  return row;
}

function sc(ws: ExcelJS.Worksheet, rowNum: number, col: number, value: string, opts: StyleOptions) {
  const cell = ws.getRow(rowNum).getCell(col);
  cell.value = value;
  applyStyle(cell, opts);
}

function merge(ws: ExcelJS.Worksheet, r1: number, r2: number, c1: number, c2: number) {
  ws.mergeCells(r1, c1, r2, c2);
}

function writeInquiryRows(
  ws: ExcelJS.Worksheet,
  startRow: number,
  inq: DailyReportInquiryRowData,
  isBottom: boolean,
): number {
  const lines = inq.locations;
  const rowCount = lines.length;
  const rowH = isBottom ? H.dataRowB : H.dataRow;

  for (let i = 0; i < rowCount; i++) {
    const rn = startRow + i;
    setRow(ws, rn, rowH);

    sc(ws, rn, 1, lines[i].building, STYLES.dataC);
    sc(ws, rn, 2, lines[i].room,     STYLES.dataC);

    if (i === 0) {
      sc(ws, rn, 3, inq.receivedTime,  STYLES.dataC);
      sc(ws, rn, 4, inq.description,   STYLES.dataL);
      sc(ws, rn, 5, inq.solution,      STYLES.dataL);
      sc(ws, rn, 6, '',                STYLES.dataL);
      sc(ws, rn, 7, '',                STYLES.dataL);
      sc(ws, rn, 8, !isBottom ? inq.completedTime : '', STYLES.dataC);
      sc(ws, rn, 9, inq.status,        STYLES.dataC);
    } else {
      sc(ws, rn, 3, '', STYLES.dataC);
      sc(ws, rn, 4, '', STYLES.dataL);
      sc(ws, rn, 5, '', STYLES.dataL);
      sc(ws, rn, 6, '', STYLES.dataL);
      sc(ws, rn, 7, '', STYLES.dataL);
      sc(ws, rn, 8, '', STYLES.dataC);
      sc(ws, rn, 9, '', STYLES.dataC);
    }
  }

  // 처리내역(5~7) 병합 + 다중 위치 세로 병합
  if (rowCount === 1) {
    merge(ws, startRow, startRow, 5, 7);
  } else {
    merge(ws, startRow, startRow + rowCount - 1, 3, 3);
    merge(ws, startRow, startRow + rowCount - 1, 4, 4);
    merge(ws, startRow, startRow + rowCount - 1, 5, 7);
    merge(ws, startRow, startRow + rowCount - 1, 8, 8);
    merge(ws, startRow, startRow + rowCount - 1, 9, 9);
  }

  return rowCount;
}

export async function generateDailyReportExcel(data: DailyReportResponse): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(data.sheetName);

  // 열 너비 설정
  COL_WIDTHS.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  let rn = 1;

  // ===== 행1: 제목 =====
  setRow(ws, rn, H.title);
  for (let c = 1; c <= 9; c++) sc(ws, rn, c, c === 1 ? '장애 발생 처리 내역' : '', STYLES.title);
  merge(ws, rn, rn, 1, 9);
  rn++;

  // ===== 행2: 빈행 =====
  setRow(ws, rn, H.blank135);
  rn++;

  // ===== 행3: 날짜 / 담당자 =====
  setRow(ws, rn, H.r2);
  sc(ws, rn, 1, data.date,                          STYLES.dateBold);
  sc(ws, rn, 2, '',                                  STYLES.dateBold);
  sc(ws, rn, 3, '',                                  STYLES.dateBold);
  merge(ws, rn, rn, 1, 3);
  sc(ws, rn, 4, `${data.userName} ${data.userRole}`, STYLES.nameNorm);
  for (let c = 5; c <= 9; c++) sc(ws, rn, c, '', STYLES.empty);
  merge(ws, rn, rn, 5, 9);
  rn++;

  // ===== 행4: 빈행 =====
  setRow(ws, rn, H.blank120);
  rn++;

  // ===== 행5: 헤더 =====
  setRow(ws, rn, H.header);
  sc(ws, rn, 1, '장소',     STYLES.header);
  sc(ws, rn, 2, '',         STYLES.header);
  merge(ws, rn, rn, 1, 2);
  sc(ws, rn, 3, '접수시간', STYLES.header);
  sc(ws, rn, 4, '증상',     STYLES.header);
  sc(ws, rn, 5, '처리내역', STYLES.header);
  sc(ws, rn, 6, '',         STYLES.header);
  sc(ws, rn, 7, '',         STYLES.header);
  merge(ws, rn, rn, 5, 7);
  sc(ws, rn, 8, '처리시간', STYLES.header);
  sc(ws, rn, 9, '완료여부', STYLES.header);
  rn++;

  // ===== 위쪽 데이터 섹션 (완료 + 진행중) =====
  let filledTopRows = 0;
  for (const inq of data.allSection) {
    const used = writeInquiryRows(ws, rn, inq, false);
    rn += used;
    filledTopRows += used;
  }
  // 빈 행 채우기
  for (let i = filledTopRows; i < data.topCount; i++) {
    setRow(ws, rn, H.dataRow);
    sc(ws, rn, 1, '', STYLES.dataC);
    sc(ws, rn, 2, '', STYLES.dataC);
    sc(ws, rn, 3, '', STYLES.dataC);
    sc(ws, rn, 4, '', STYLES.dataL);
    sc(ws, rn, 5, '', STYLES.dataL);
    sc(ws, rn, 6, '', STYLES.dataL);
    sc(ws, rn, 7, '', STYLES.dataL);
    merge(ws, rn, rn, 5, 7);
    sc(ws, rn, 8, '', STYLES.dataC);
    sc(ws, rn, 9, '', STYLES.dataC);
    rn++;
  }

  // ===== 구분행 =====
  setRow(ws, rn, H.div);
  for (let c = 1; c <= 9; c++) sc(ws, rn, c, '', STYLES.empty);
  merge(ws, rn, rn, 1, 9);
  rn++;

  // ===== 진행중 제목 =====
  setRow(ws, rn, H.secTitle);
  sc(ws, rn, 1, '진행중인 장애발생 처리내역', STYLES.secTitle);
  for (let c = 2; c <= 9; c++) sc(ws, rn, c, '', STYLES.secTitle);
  merge(ws, rn, rn, 1, 9);
  rn++;

  // ===== 진행중 헤더 =====
  setRow(ws, rn, H.secTitle);
  sc(ws, rn, 1, '위치',     STYLES.header);
  sc(ws, rn, 2, '',         STYLES.header);
  merge(ws, rn, rn, 1, 2);
  sc(ws, rn, 3, '접수일자', STYLES.header);
  sc(ws, rn, 4, '증상',     STYLES.header);
  sc(ws, rn, 5, '처리내역', STYLES.header);
  sc(ws, rn, 6, '',         STYLES.header);
  sc(ws, rn, 7, '',         STYLES.header);
  merge(ws, rn, rn, 5, 7);
  sc(ws, rn, 8, '처리일자', STYLES.header);
  sc(ws, rn, 9, '완료여부', STYLES.header);
  rn++;

  // ===== 진행중 데이터 섹션 =====
  let filledBottomRows = 0;
  for (const inq of data.inProgressSection) {
    const used = writeInquiryRows(ws, rn, inq, true);
    rn += used;
    filledBottomRows += used;
  }
  // 빈 행 채우기
  for (let i = filledBottomRows; i < data.bottomCount; i++) {
    setRow(ws, rn, H.dataRowB);
    sc(ws, rn, 1, '', STYLES.dataC);
    sc(ws, rn, 2, '', STYLES.dataC);
    sc(ws, rn, 3, '', STYLES.dataC);
    sc(ws, rn, 4, '', STYLES.dataL);
    sc(ws, rn, 5, '', STYLES.dataL);
    sc(ws, rn, 6, '', STYLES.dataL);
    sc(ws, rn, 7, '', STYLES.dataL);
    merge(ws, rn, rn, 5, 7);
    sc(ws, rn, 8, '', STYLES.dataC);
    sc(ws, rn, 9, '', STYLES.dataC);
    rn++;
  }

  // ===== 흰색 구분행 =====
  setRow(ws, rn, H.div);
  for (let c = 1; c <= 9; c++) sc(ws, rn, c, '', STYLES.white);
  merge(ws, rn, rn, 1, 9);
  rn++;

  // ===== 서명란 (2행) =====
  const s0 = rn;
  const s1 = rn + 1;
  setRow(ws, s0, H.sign);
  setRow(ws, s1, H.sign);

  // 처리자 (2행 병합)
  sc(ws, s0, 1, '처리자', STYLES.signLabel);
  sc(ws, s1, 1, '',       STYLES.signLabel);
  sc(ws, s0, 2, '',       STYLES.signLabel);
  sc(ws, s1, 2, '',       STYLES.signLabel);
  merge(ws, s0, s1, 1, 2);

  sc(ws, s0, 3, '회사', STYLES.signLabel);
  sc(ws, s0, 4, '㈜제이엠티미디어', STYLES.signValue);

  sc(ws, s0, 5, '확인자', STYLES.signLabel);
  sc(ws, s1, 5, '',       STYLES.signLabel);
  merge(ws, s0, s1, 5, 5);

  sc(ws, s0, 6, '부서', STYLES.signLabel);
  sc(ws, s0, 7, '',     STYLES.signValue);
  sc(ws, s0, 8, '',     STYLES.signValue);
  sc(ws, s0, 9, '',     STYLES.signValue);
  merge(ws, s0, s0, 7, 9);

  sc(ws, s1, 3, '성명', STYLES.signLabel);
  sc(ws, s1, 4, `${data.userName} ${data.userRole}`, STYLES.signValue);
  sc(ws, s1, 6, '성명', STYLES.signLabel);
  sc(ws, s1, 7, '',     STYLES.signValue);
  sc(ws, s1, 8, '',     STYLES.signValue);
  sc(ws, s1, 9, '',     STYLES.signValue);
  merge(ws, s1, s1, 7, 9);

  // ===== 다운로드 =====
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const [, month, day] = data.date.split('-');
  link.href = url;
  link.download = `${parseInt(month)}월${parseInt(day)}일_${data.userName}_업무일지.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
