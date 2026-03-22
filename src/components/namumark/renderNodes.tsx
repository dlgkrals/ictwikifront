import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LinkItUrl } from 'react-linkify-it';
import type { BlockNode, InlineNode, RenderContext } from './types';
import FoldingBlock from './FoldingBlock';

export function renderBlocks(nodes: BlockNode[], ctx: RenderContext): ReactNode[] {
  return nodes.map((node, i) => renderBlock(node, i, ctx));
}

export function renderBlock(node: BlockNode, key: number, ctx: RenderContext): ReactNode {
  switch (node.type) {
    case 'heading': {
      const Tag = `h${node.level}` as 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      ctx.headingCounter.current++;
      return (
        <Tag key={key} id={node.id}>
          {renderInlineNodes(node.children, ctx)}
        </Tag>
      );
    }

    case 'paragraph':
      return <p key={key}>{renderInlineNodes(node.children, ctx)}</p>;

    case 'unordered-list':
      return (
        <ul key={key}>
          {node.items.map((item, i) => (
            <li key={i} style={item.depth > 0 ? { marginLeft: `${item.depth * 20}px` } : undefined}>
              {renderInlineNodes(item.children, ctx)}
              {item.subList && renderBlock(item.subList, i, ctx)}
            </li>
          ))}
        </ul>
      );

    case 'ordered-list':
      return (
        <ol key={key}>
          {node.items.map((item, i) => (
            <li key={i} style={item.depth > 0 ? { marginLeft: `${item.depth * 20}px` } : undefined}>
              {renderInlineNodes(item.children, ctx)}
              {item.subList && renderBlock(item.subList, i, ctx)}
            </li>
          ))}
        </ol>
      );

    case 'blockquote':
      return (
        <blockquote key={key} className="namu-blockquote">
          {renderBlocks(node.children, ctx)}
        </blockquote>
      );

    case 'hr':
      return <hr key={key} />;

    case 'table':
      return (
        <table key={key} className="namu-table">
          <tbody>
            {node.rows.map((row, ri) => (
              <tr key={ri}>
                {row.cells.map((cell, ci) => (
                  <td
                    key={ci}
                    colSpan={cell.colspan > 1 ? cell.colspan : undefined}
                    rowSpan={cell.rowspan > 1 ? cell.rowspan : undefined}
                    style={{
                      textAlign: cell.align !== 'left' ? cell.align : undefined,
                      backgroundColor: cell.bgColor,
                      width: cell.width,
                    }}
                  >
                    {renderInlineNodes(cell.children, ctx)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );

    case 'folding':
      return (
        <FoldingBlock key={key} title={node.title}>
          {renderBlocks(node.children, ctx)}
        </FoldingBlock>
      );
  }
}

export function renderInlineNodes(nodes: InlineNode[], ctx: RenderContext): ReactNode[] {
  return nodes.map((node, i) => renderInline(node, i, ctx));
}

export function renderInline(node: InlineNode, key: number, ctx: RenderContext): ReactNode {
  switch (node.type) {
    case 'text':
      return <LinkItUrl key={key}>{node.content}</LinkItUrl>;

    case 'bold':
      return <strong key={key}>{renderInlineNodes(node.children, ctx)}</strong>;

    case 'italic':
      return <em key={key}>{renderInlineNodes(node.children, ctx)}</em>;

    case 'underline':
      return <u key={key}>{renderInlineNodes(node.children, ctx)}</u>;

    case 'strikethrough':
      return <del key={key}>{renderInlineNodes(node.children, ctx)}</del>;

    case 'superscript':
      return <sup key={key}>{renderInlineNodes(node.children, ctx)}</sup>;

    case 'subscript':
      return <sub key={key}>{renderInlineNodes(node.children, ctx)}</sub>;

    case 'sized-text': {
      const baseSize = 1;
      const sizeRem = baseSize + node.size * 0.2;
      return (
        <span key={key} style={{ fontSize: `${sizeRem}rem` }}>
          {renderInlineNodes(node.children, ctx)}
        </span>
      );
    }

    case 'colored-text':
      return (
        <span key={key} style={{ color: node.color }}>
          {renderInlineNodes(node.children, ctx)}
        </span>
      );

    case 'wiki-link': {
      const doc = ctx.findDocumentByTitle?.(node.target);
      if (doc) {
        return (
          <Link key={key} to={`/wiki/${doc.id}`} className="wiki-link">
            {node.display}
          </Link>
        );
      }
      return (
        <span key={key} className="wiki-link-broken" title="문서가 존재하지 않습니다">
          {node.display}
        </span>
      );
    }

    case 'external-link':
      return (
        <a key={key} href={node.url} target="_blank" rel="noopener noreferrer" className="external-link">
          {node.display}
        </a>
      );

    case 'anchor-link':
      return (
        <a key={key} href={`#${node.anchor}`} className="anchor-link">
          {node.display}
        </a>
      );

    case 'footnote': {
      const fnIndex = ctx.footnotes.length + 1;
      ctx.footnotes.push({ id: fnIndex, name: node.name, children: node.children });
      return (
        <sup key={key} id={`fnref-${fnIndex}`}>
          <a href={`#fn-${fnIndex}`} className="footnote-ref">
            [{node.name || fnIndex}]
          </a>
        </sup>
      );
    }

    case 'inline-code':
      return <code key={key} className="namu-inline-code">{node.content}</code>;

    case 'line-break':
      return <br key={key} />;

    case 'image':
      return (
        <img
          key={key}
          src={node.url}
          alt={node.alt}
          className="namu-image"
        />
      );
  }
}
