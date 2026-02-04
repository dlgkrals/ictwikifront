import { useState, type ReactNode } from 'react';

interface FoldingBlockProps {
  title: string;
  children: ReactNode;
}

export default function FoldingBlock({ title, children }: FoldingBlockProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="namu-folding">
      <button
        className="namu-folding-toggle"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        {isOpen ? '\u25BC' : '\u25B6'} {title}
      </button>
      {isOpen && <div className="namu-folding-content">{children}</div>}
    </div>
  );
}
