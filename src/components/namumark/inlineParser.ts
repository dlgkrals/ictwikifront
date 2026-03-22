import type { InlineNode } from './types';

export function parseInline(text: string): InlineNode[] {
  const result: InlineNode[] = [];
  let cursor = 0;
  let textBuffer = '';

  const flushText = () => {
    if (textBuffer) {
      result.push({ type: 'text', content: textBuffer });
      textBuffer = '';
    }
  };

  const charAt = (offset = 0) => text[cursor + offset];

  while (cursor < text.length) {
    // 1. Escape: \문자
    if (charAt() === '\\' && cursor + 1 < text.length) {
      textBuffer += text[cursor + 1];
      cursor += 2;
      continue;
    }

    // 2. Triple brace: {{{...}}}
    if (text.startsWith('{{{', cursor)) {
      const node = parseTripleBrace(text, cursor);
      if (node) {
        flushText();
        result.push(node.node);
        cursor = node.end;
        continue;
      }
    }

    // 3. Wiki link: [[...]]
    if (text.startsWith('[[', cursor)) {
      const node = parseWikiLink(text, cursor);
      if (node) {
        flushText();
        result.push(node.node);
        cursor = node.end;
        continue;
      }
    }

    // 4. Footnote: [* ...] or [*name ...]
    if (text.startsWith('[*', cursor)) {
      const node = parseFootnote(text, cursor);
      if (node) {
        flushText();
        result.push(node.node);
        cursor = node.end;
        continue;
      }
    }

    // 5. Bold: '''...'''
    if (text.startsWith("'''", cursor)) {
      const node = parsePairedDelimiter(text, cursor, "'''", "'''", 'bold');
      if (node) {
        flushText();
        result.push(node.node);
        cursor = node.end;
        continue;
      }
    }

    // 6. Italic: ''...''
    if (text.startsWith("''", cursor)) {
      const node = parsePairedDelimiter(text, cursor, "''", "''", 'italic');
      if (node) {
        flushText();
        result.push(node.node);
        cursor = node.end;
        continue;
      }
    }

    // 7. Underline: __...__
    if (text.startsWith('__', cursor)) {
      const node = parsePairedDelimiter(text, cursor, '__', '__', 'underline');
      if (node) {
        flushText();
        result.push(node.node);
        cursor = node.end;
        continue;
      }
    }

    // 8. Strikethrough: ~~...~~
    if (text.startsWith('~~', cursor)) {
      const node = parsePairedDelimiter(text, cursor, '~~', '~~', 'strikethrough');
      if (node) {
        flushText();
        result.push(node.node);
        cursor = node.end;
        continue;
      }
    }

    // 9. Strikethrough alt: --...--
    if (text.startsWith('--', cursor)) {
      const node = parsePairedDelimiter(text, cursor, '--', '--', 'strikethrough');
      if (node) {
        flushText();
        result.push(node.node);
        cursor = node.end;
        continue;
      }
    }

    // 10. Superscript: ^^...^^
    if (text.startsWith('^^', cursor)) {
      const node = parsePairedDelimiter(text, cursor, '^^', '^^', 'superscript');
      if (node) {
        flushText();
        result.push(node.node);
        cursor = node.end;
        continue;
      }
    }

    // 11. Subscript: ,,...,,
    if (text.startsWith(',,', cursor)) {
      const node = parsePairedDelimiter(text, cursor, ',,', ',,', 'subscript');
      if (node) {
        flushText();
        result.push(node.node);
        cursor = node.end;
        continue;
      }
    }

    // 12. Line break macro: [br]
    if (text.startsWith('[br]', cursor)) {
      flushText();
      result.push({ type: 'line-break' });
      cursor += 4;
      continue;
    }

    // No pattern matched
    textBuffer += charAt();
    cursor++;
  }

  flushText();
  return result;
}

interface ParseResult {
  node: InlineNode;
  end: number;
}

function parseTripleBrace(text: string, start: number): ParseResult | null {
  // Find matching }}}
  const openLen = 3;
  const inner = start + openLen;

  let depth = 1;
  let i = inner;
  while (i < text.length) {
    if (text.startsWith('{{{', i)) {
      depth++;
      i += 3;
    } else if (text.startsWith('}}}', i)) {
      depth--;
      if (depth === 0) break;
      i += 3;
    } else {
      i++;
    }
  }

  if (depth !== 0) return null;

  const content = text.slice(inner, i);
  const end = i + 3;

  // Check for size modifier: {{{+N text}}} or {{{-N text}}}
  const sizeMatch = content.match(/^([+-][1-5])\s([\s\S]*)$/);
  if (sizeMatch) {
    return {
      node: {
        type: 'sized-text',
        size: parseInt(sizeMatch[1], 10),
        children: parseInline(sizeMatch[2]),
      },
      end,
    };
  }

  // Check for color: {{{#color text}}}
  const colorMatch = content.match(/^(#[a-fA-F0-9]{3,8}|#[a-zA-Z]+)\s([\s\S]*)$/);
  if (colorMatch) {
    return {
      node: {
        type: 'colored-text',
        color: colorMatch[1],
        children: parseInline(colorMatch[2]),
      },
      end,
    };
  }

  // Plain triple brace → inline code
  return {
    node: { type: 'inline-code', content },
    end,
  };
}

function parseWikiLink(text: string, start: number): ParseResult | null {
  const openLen = 2;
  const inner = start + openLen;

  // Find matching ]]
  let i = inner;
  let depth = 0;
  while (i < text.length) {
    if (text.startsWith('[[', i)) {
      depth++;
      i += 2;
    } else if (text.startsWith(']]', i)) {
      if (depth === 0) break;
      depth--;
      i += 2;
    } else {
      i++;
    }
  }

  if (i >= text.length) return null;

  const content = text.slice(inner, i);
  const end = i + 2;

  // Split by | for display text
  const pipeIndex = content.indexOf('|');
  let target: string;
  let display: string;

  if (pipeIndex !== -1) {
    target = content.slice(0, pipeIndex);
    display = content.slice(pipeIndex + 1);
  } else {
    target = content;
    display = content;
  }

  // Image: [[파일:URL]] or [[파일:URL|alt]]
  if (target.startsWith('파일:')) {
    const url = target.slice(3);
    const alt = pipeIndex !== -1 ? display : '';
    return {
      node: { type: 'image', url, alt },
      end,
    };
  }

  // External link
  if (target.startsWith('http://') || target.startsWith('https://')) {
    return {
      node: { type: 'external-link', url: target, display },
      end,
    };
  }

  // Anchor link
  if (target.startsWith('#')) {
    return {
      node: { type: 'anchor-link', anchor: target.slice(1), display },
      end,
    };
  }

  // Wiki link
  return {
    node: { type: 'wiki-link', target, display },
    end,
  };
}

function parseFootnote(text: string, start: number): ParseResult | null {
  // [* content] or [*name content]
  if (text[start + 2] !== ' ' && text[start + 2] !== undefined) {
    // Named footnote: [*name content]
    // Find the closing ]
    const closeIndex = findClosingBracket(text, start);
    if (closeIndex === -1) return null;

    const inner = text.slice(start + 2, closeIndex);
    const spaceIndex = inner.indexOf(' ');
    if (spaceIndex === -1) return null;

    const name = inner.slice(0, spaceIndex);
    const content = inner.slice(spaceIndex + 1);

    return {
      node: {
        type: 'footnote',
        name,
        children: parseInline(content),
      },
      end: closeIndex + 1,
    };
  }

  if (text[start + 2] === ' ') {
    // Anonymous footnote: [* content]
    const closeIndex = findClosingBracket(text, start);
    if (closeIndex === -1) return null;

    const content = text.slice(start + 3, closeIndex);

    return {
      node: {
        type: 'footnote',
        children: parseInline(content),
      },
      end: closeIndex + 1,
    };
  }

  return null;
}

function findClosingBracket(text: string, start: number): number {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '[') depth++;
    else if (text[i] === ']') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

type PairedType = 'bold' | 'italic' | 'underline' | 'strikethrough' | 'superscript' | 'subscript';

function parsePairedDelimiter(
  text: string,
  start: number,
  open: string,
  close: string,
  nodeType: PairedType,
): ParseResult | null {
  const inner = start + open.length;

  // Find closing delimiter (not nested for simplicity with same delimiter)
  const closeIndex = text.indexOf(close, inner);
  if (closeIndex === -1 || closeIndex === inner) return null;

  const content = text.slice(inner, closeIndex);

  // Don't allow content that spans too many lines for inline
  if (content.includes('\n')) return null;

  const children = parseInline(content);

  return {
    node: { type: nodeType, children } as InlineNode,
    end: closeIndex + close.length,
  };
}
