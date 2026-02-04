import type { FootnoteRef, RenderContext } from './types';
import { renderInlineNodes } from './renderNodes';

interface FootnoteAreaProps {
  footnotes: FootnoteRef[];
  ctx: RenderContext;
}

export default function FootnoteArea({ footnotes, ctx }: FootnoteAreaProps) {
  if (footnotes.length === 0) return null;

  return (
    <div className="namu-footnotes">
      <hr />
      <ol>
        {footnotes.map((fn) => (
          <li key={fn.id} id={`fn-${fn.id}`}>
            <a href={`#fnref-${fn.id}`} className="footnote-back">
              [{fn.name || fn.id}]
            </a>{' '}
            {renderInlineNodes(fn.children, ctx)}
          </li>
        ))}
      </ol>
    </div>
  );
}
