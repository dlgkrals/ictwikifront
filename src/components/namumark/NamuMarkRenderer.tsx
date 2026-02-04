import { useMemo } from 'react';
import { useWiki } from '../../context/WikiContext';
import { parseBlocks } from './blockParser';
import { renderBlocks } from './renderNodes';
import FootnoteArea from './FootnoteArea';
import type { FootnoteRef, RenderContext, HeadingNode, BlockNode } from './types';

export interface ExtractedHeading {
  title: string;
  level: number;
  id: string;
}

interface NamuMarkRendererProps {
  content: string;
  onHeadingsExtracted?: (headings: ExtractedHeading[]) => void;
  className?: string;
}

function extractHeadingText(node: HeadingNode): string {
  return node.children
    .map((child) => {
      if (child.type === 'text') return child.content;
      return '';
    })
    .join('');
}

function collectHeadings(blocks: BlockNode[]): ExtractedHeading[] {
  const headings: ExtractedHeading[] = [];
  for (const block of blocks) {
    if (block.type === 'heading') {
      headings.push({
        title: extractHeadingText(block),
        level: block.level,
        id: block.id,
      });
    }
  }
  return headings;
}

export default function NamuMarkRenderer({ content, onHeadingsExtracted, className }: NamuMarkRendererProps) {
  const { documents } = useWiki();

  const findDocumentByTitle = (title: string) => {
    return documents.find((doc) => doc.title.toLowerCase() === title.toLowerCase());
  };

  const { renderedContent, footnotes, ctx } = useMemo(() => {
    const footnotes: FootnoteRef[] = [];
    const headingCounter = { current: 0 };

    const ctx: RenderContext = {
      findDocumentByTitle,
      footnotes,
      headingCounter,
    };

    const blocks = parseBlocks(content);

    if (onHeadingsExtracted) {
      const headings = collectHeadings(blocks);
      onHeadingsExtracted(headings);
    }

    const renderedContent = renderBlocks(blocks, ctx);

    return { renderedContent, footnotes, ctx };
  }, [content, documents]);

  return (
    <div className={className || 'namu-content'}>
      {renderedContent}
      <FootnoteArea footnotes={footnotes} ctx={ctx} />
    </div>
  );
}
