// ===== Block Nodes =====

export interface HeadingNode {
  type: 'heading';
  level: number; // 2-6
  children: InlineNode[];
  id: string;
}

export interface ParagraphNode {
  type: 'paragraph';
  children: InlineNode[];
}

export interface UnorderedListNode {
  type: 'unordered-list';
  items: ListItemNode[];
}

export interface OrderedListNode {
  type: 'ordered-list';
  items: ListItemNode[];
}

export interface ListItemNode {
  type: 'list-item';
  depth: number;
  children: InlineNode[];
  subList?: UnorderedListNode | OrderedListNode;
}

export interface BlockquoteNode {
  type: 'blockquote';
  children: BlockNode[];
}

export interface HorizontalRuleNode {
  type: 'hr';
}

export interface TableNode {
  type: 'table';
  rows: TableRowNode[];
}

export interface TableRowNode {
  type: 'table-row';
  cells: TableCellNode[];
}

export interface TableCellNode {
  type: 'table-cell';
  children: InlineNode[];
  colspan: number;
  rowspan: number;
  align: 'left' | 'center' | 'right';
  bgColor?: string;
  width?: string;
}

export interface FoldingNode {
  type: 'folding';
  title: string;
  children: BlockNode[];
}

export type BlockNode =
  | HeadingNode
  | ParagraphNode
  | UnorderedListNode
  | OrderedListNode
  | BlockquoteNode
  | HorizontalRuleNode
  | TableNode
  | FoldingNode;

// ===== Inline Nodes =====

export interface TextNode {
  type: 'text';
  content: string;
}

export interface BoldNode {
  type: 'bold';
  children: InlineNode[];
}

export interface ItalicNode {
  type: 'italic';
  children: InlineNode[];
}

export interface UnderlineNode {
  type: 'underline';
  children: InlineNode[];
}

export interface StrikethroughNode {
  type: 'strikethrough';
  children: InlineNode[];
}

export interface SuperscriptNode {
  type: 'superscript';
  children: InlineNode[];
}

export interface SubscriptNode {
  type: 'subscript';
  children: InlineNode[];
}

export interface SizedTextNode {
  type: 'sized-text';
  size: number; // -5 to +5
  children: InlineNode[];
}

export interface ColoredTextNode {
  type: 'colored-text';
  color: string;
  children: InlineNode[];
}

export interface WikiLinkNode {
  type: 'wiki-link';
  target: string;
  display: string;
}

export interface ExternalLinkNode {
  type: 'external-link';
  url: string;
  display: string;
}

export interface AnchorLinkNode {
  type: 'anchor-link';
  anchor: string;
  display: string;
}

export interface FootnoteNode {
  type: 'footnote';
  name?: string;
  children: InlineNode[];
}

export interface InlineCodeNode {
  type: 'inline-code';
  content: string;
}

export interface LineBreakNode {
  type: 'line-break';
}

export type InlineNode =
  | TextNode
  | BoldNode
  | ItalicNode
  | UnderlineNode
  | StrikethroughNode
  | SuperscriptNode
  | SubscriptNode
  | SizedTextNode
  | ColoredTextNode
  | WikiLinkNode
  | ExternalLinkNode
  | AnchorLinkNode
  | FootnoteNode
  | InlineCodeNode
  | LineBreakNode;

// ===== Footnote Reference =====

export interface FootnoteRef {
  id: number;
  name?: string;
  children: InlineNode[];
}

// ===== Render Context =====

export interface RenderContext {
  findDocumentByTitle?: (title: string) => { id: number } | undefined;
  footnotes: FootnoteRef[];
  headingCounter: { current: number };
}
