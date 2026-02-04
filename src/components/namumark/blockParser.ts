import type {
  BlockNode,
  HeadingNode,
  ParagraphNode,
  UnorderedListNode,
  OrderedListNode,
  ListItemNode,
  BlockquoteNode,
  TableNode,
  TableRowNode,
  TableCellNode,
  FoldingNode,
} from './types';
import { parseInline } from './inlineParser';

let headingIdCounter = 0;

export function resetHeadingCounter() {
  headingIdCounter = 0;
}

function generateHeadingId(title: string): string {
  const idx = headingIdCounter++;
  const slug = title.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9가-힣-]/g, '');
  return `section-${idx}-${slug}`;
}

export function parseBlocks(content: string): BlockNode[] {
  headingIdCounter = 0;
  const lines = content.split('\n');
  return parseLines(lines, 0, lines.length);
}

function parseLines(lines: string[], start: number, end: number): BlockNode[] {
  const result: BlockNode[] = [];
  let i = start;

  while (i < end) {
    const line = lines[i];

    // 1. Folding block: {{{#!folding ...
    if (line.trimStart().startsWith('{{{#!folding')) {
      const folding = parseFolding(lines, i);
      if (folding) {
        result.push(folding.node);
        i = folding.nextLine;
        continue;
      }
    }

    // 2. Heading: == title == (2~6 levels)
    const headingMatch = line.match(/^(={2,6})\s+(.+?)\s+\1\s*$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = headingMatch[2];
      const heading: HeadingNode = {
        type: 'heading',
        level,
        children: parseInline(title),
        id: generateHeadingId(title),
      };
      result.push(heading);
      i++;
      continue;
    }

    // 3. Horizontal rule: ---- (4-10 hyphens)
    if (/^-{4,10}\s*$/.test(line)) {
      result.push({ type: 'hr' });
      i++;
      continue;
    }

    // 4. Table: || ... ||
    if (line.trimStart().startsWith('||') && line.trimEnd().endsWith('||')) {
      const table = parseTable(lines, i);
      result.push(table.node);
      i = table.nextLine;
      continue;
    }

    // 5. Unordered list: * item (with leading spaces for nesting)
    if (/^\s*\*\s+/.test(line)) {
      const list = parseUnorderedList(lines, i);
      result.push(list.node);
      i = list.nextLine;
      continue;
    }

    // 6. Ordered list: 1. item (with leading spaces for nesting)
    if (/^\s*\d+\.\s+/.test(line)) {
      const list = parseOrderedList(lines, i);
      result.push(list.node);
      i = list.nextLine;
      continue;
    }

    // 7. Blockquote: > text
    if (/^>{1,}\s*/.test(line)) {
      const quote = parseBlockquote(lines, i);
      result.push(quote.node);
      i = quote.nextLine;
      continue;
    }

    // 8. Empty line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // 9. Paragraph: accumulate consecutive non-special lines
    const para = parseParagraph(lines, i, end);
    result.push(para.node);
    i = para.nextLine;
  }

  return result;
}

interface BlockParseResult<T extends BlockNode> {
  node: T;
  nextLine: number;
}

function parseFolding(lines: string[], start: number): BlockParseResult<FoldingNode> | null {
  const line = lines[start];
  const match = line.match(/^\s*\{{3}#!folding\s*(.*)/);
  if (!match) return null;

  const title = match[1].trim();
  let depth = 1;
  let i = start + 1;

  while (i < lines.length && depth > 0) {
    const l = lines[i];
    // Count opening {{{ (that aren't part of inline constructs on same line as closing)
    let j = 0;
    while (j < l.length) {
      if (l.startsWith('{{{', j)) {
        depth++;
        j += 3;
      } else if (l.startsWith('}}}', j)) {
        depth--;
        if (depth === 0) break;
        j += 3;
      } else {
        j++;
      }
    }
    i++;
  }

  const innerLines = lines.slice(start + 1, i - 1);
  const children = parseLines(innerLines, 0, innerLines.length);

  return {
    node: { type: 'folding', title, children },
    nextLine: i,
  };
}

function parseTable(lines: string[], start: number): BlockParseResult<TableNode> {
  const rows: TableRowNode[] = [];
  let i = start;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line.startsWith('||') || !line.endsWith('||')) break;

    const row = parseTableRow(line);
    rows.push(row);
    i++;
  }

  return {
    node: { type: 'table', rows },
    nextLine: i,
  };
}

function parseTableRow(line: string): TableRowNode {
  // Remove leading and trailing ||
  const inner = line.slice(2, -2);
  const cellTexts = inner.split('||');

  const cells: TableCellNode[] = cellTexts.map((cellText) => {
    let text = cellText;
    let colspan = 1;
    let rowspan = 1;
    let align: 'left' | 'center' | 'right' = 'left';
    let bgColor: string | undefined;
    let width: string | undefined;

    // Parse cell modifiers at the start: <modifier>
    while (text.startsWith('<')) {
      const modEnd = text.indexOf('>');
      if (modEnd === -1) break;

      const mod = text.slice(1, modEnd);
      text = text.slice(modEnd + 1);

      // Colspan: <-N>
      const colMatch = mod.match(/^-(\d+)$/);
      if (colMatch) {
        colspan = parseInt(colMatch[1], 10);
        continue;
      }

      // Rowspan: <|N>
      const rowMatch = mod.match(/^\|(\d+)$/);
      if (rowMatch) {
        rowspan = parseInt(rowMatch[1], 10);
        continue;
      }

      // Align
      if (mod === ':' || mod === '(') {
        align = 'left';
        continue;
      }
      if (mod === ')') {
        align = 'right';
        continue;
      }
      // Center can be <:> too in some variants
      if (mod === ':>') {
        align = 'center';
        continue;
      }

      // Background color: <bgcolor=#xxx>
      const bgMatch = mod.match(/^bgcolor=(#?[a-fA-F0-9]{3,8}|[a-zA-Z]+)$/);
      if (bgMatch) {
        bgColor = bgMatch[1].startsWith('#') ? bgMatch[1] : `#${bgMatch[1]}`;
        continue;
      }

      // Width: <width=Npx> or <width=N%>
      const widthMatch = mod.match(/^width=(\d+(?:px|%))$/);
      if (widthMatch) {
        width = widthMatch[1];
        continue;
      }
    }

    return {
      type: 'table-cell',
      children: parseInline(text.trim()),
      colspan,
      rowspan,
      align,
      bgColor,
      width,
    };
  });

  return { type: 'table-row', cells };
}

function parseUnorderedList(lines: string[], start: number): BlockParseResult<UnorderedListNode> {
  const items: ListItemNode[] = [];
  let i = start;

  while (i < lines.length) {
    const match = lines[i].match(/^(\s*)\*\s+(.*)/);
    if (!match) break;

    const depth = match[1].length;
    const content = match[2];

    items.push({
      type: 'list-item',
      depth,
      children: parseInline(content),
    });
    i++;
  }

  // Build nested structure
  const nested = buildNestedList(items, 'unordered');

  return {
    node: nested as UnorderedListNode,
    nextLine: i,
  };
}

function parseOrderedList(lines: string[], start: number): BlockParseResult<OrderedListNode> {
  const items: ListItemNode[] = [];
  let i = start;

  while (i < lines.length) {
    const match = lines[i].match(/^(\s*)\d+\.\s+(.*)/);
    if (!match) break;

    const depth = match[1].length;
    const content = match[2];

    items.push({
      type: 'list-item',
      depth,
      children: parseInline(content),
    });
    i++;
  }

  const nested = buildNestedList(items, 'ordered');

  return {
    node: nested as OrderedListNode,
    nextLine: i,
  };
}

function buildNestedList(
  items: ListItemNode[],
  listType: 'unordered' | 'ordered',
): UnorderedListNode | OrderedListNode {
  // Simple flat list for now - nesting handled by CSS indentation
  return {
    type: listType === 'unordered' ? 'unordered-list' : 'ordered-list',
    items,
  } as UnorderedListNode | OrderedListNode;
}

function parseBlockquote(lines: string[], start: number): BlockParseResult<BlockquoteNode> {
  const innerLines: string[] = [];
  let i = start;

  while (i < lines.length) {
    const match = lines[i].match(/^>(.*)/);
    if (!match) break;

    // Remove one level of > and optional space
    let inner = match[1];
    if (inner.startsWith(' ')) inner = inner.slice(1);
    innerLines.push(inner);
    i++;
  }

  const children = parseLines(innerLines, 0, innerLines.length);

  return {
    node: { type: 'blockquote', children },
    nextLine: i,
  };
}

function parseParagraph(lines: string[], start: number, end: number): BlockParseResult<ParagraphNode> {
  const parts: string[] = [];
  let i = start;

  while (i < end) {
    const line = lines[i];

    // Stop at empty line or any block-level pattern
    if (line.trim() === '') break;
    if (/^={2,6}\s+.+\s+={2,6}\s*$/.test(line)) break;
    if (/^-{4,10}\s*$/.test(line)) break;
    if (line.trimStart().startsWith('||') && line.trimEnd().endsWith('||')) break;
    if (/^\s*\*\s+/.test(line)) break;
    if (/^\s*\d+\.\s+/.test(line)) break;
    if (/^>{1,}\s*/.test(line)) break;
    if (line.trimStart().startsWith('{{{#!folding')) break;

    parts.push(line);
    i++;
  }

  const text = parts.join('\n');

  return {
    node: {
      type: 'paragraph',
      children: parseInline(text),
    },
    nextLine: i,
  };
}
