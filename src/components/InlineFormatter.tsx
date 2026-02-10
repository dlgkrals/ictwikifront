import { type ReactNode } from 'react';
import { LinkItUrl } from 'react-linkify-it';

export function formatInlineText(text: string): ReactNode[] {
  const result: ReactNode[] = [];
  const regex = /(\*\*(.*?)\*\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push(<LinkItUrl key={key++}>{text.slice(lastIndex, match.index)}</LinkItUrl>);
    }
    if (match[2] !== undefined) {
      result.push(<strong key={key++}><LinkItUrl>{match[2]}</LinkItUrl></strong>);
    } else if (match[3] !== undefined) {
      result.push(<code key={key++}>{match[3]}</code>);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    result.push(<LinkItUrl key={key++}>{text.slice(lastIndex)}</LinkItUrl>);
  }

  return result;
}

export function renderLinesSafe(content: string): ReactNode[] {
  return content.split('\n').map((line, index) => renderLineSafe(line, index));
}

function renderLineSafe(line: string, index: number): ReactNode {
  if (line.startsWith('### ')) {
    return <h3 key={index}>{formatInlineText(line.slice(4))}</h3>;
  }
  if (line.startsWith('## ')) {
    return <h2 key={index}>{formatInlineText(line.slice(3))}</h2>;
  }
  if (line.startsWith('# ')) {
    return <h1 key={index}>{formatInlineText(line.slice(2))}</h1>;
  }
  if (line.startsWith('- ')) {
    return <li key={index}>{formatInlineText(line.slice(2))}</li>;
  }
  if (/^\d+\.\s/.test(line)) {
    return <li key={index}>{formatInlineText(line.replace(/^\d+\.\s/, ''))}</li>;
  }
  if (line.trim() === '') {
    return <br key={index} />;
  }
  return <p key={index}>{formatInlineText(line)}</p>;
}
