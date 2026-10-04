import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface SafeMarkdownProps {
  content: string;
  className?: string;
}

export const SafeMarkdown: React.FC<SafeMarkdownProps> = ({ content, className = '' }) => {
  // Strip any dangerous HTML/script injection attempts before processing
  const sanitized = content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');

  const blocks = parseBlocks(sanitized);

  return (
    <div className={`space-y-2 text-xs leading-relaxed break-words ${className}`}>
      {blocks.map((block, i) => (
        <RenderBlock key={i} block={block} />
      ))}
    </div>
  );
};

interface Block {
  type: 'paragraph' | 'heading' | 'code' | 'list' | 'table' | 'quote';
  level?: number;
  lang?: string;
  content?: string;
  items?: string[];
  headers?: string[];
  rows?: string[][];
}

function parseBlocks(text: string): Block[] {
  const lines = text.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({
        type: 'code',
        lang: lang || 'text',
        content: codeLines.join('\n'),
      });
      continue;
    }

    // Heading
    if (line.startsWith('#')) {
      const match = line.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        blocks.push({
          type: 'heading',
          level: match[1].length,
          content: match[2],
        });
        i++;
        continue;
      }
    }

    // Blockquote
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({
        type: 'quote',
        content: quoteLines.join('\n'),
      });
      continue;
    }

    // Table
    if (line.includes('|') && line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].includes('|') &&
        lines[i].trim().startsWith('|') &&
        lines[i].trim().endsWith('|')
      ) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const parseRow = (r: string) =>
          r
            .slice(1, -1)
            .split('|')
            .map((c) => c.trim());
        const headers = parseRow(tableLines[0]);
        // line 1 is separator |---|---|
        const rows = tableLines.slice(2).map(parseRow);
        blocks.push({
          type: 'table',
          headers,
          rows,
        });
        continue;
      }
    }

    // Unordered List
    if (/^\s*[-*•]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*•]\s+/, ''));
        i++;
      }
      blocks.push({
        type: 'list',
        items,
      });
      continue;
    }

    // Ordered List
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push({
        type: 'list',
        items,
      });
      continue;
    }

    // Regular paragraph
    if (line.trim() !== '') {
      const pLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() !== '' &&
        !lines[i].startsWith('#') &&
        !lines[i].startsWith('>') &&
        !lines[i].trim().startsWith('```') &&
        !/^\s*[-*•]\s+/.test(lines[i]) &&
        !/^\s*\d+\.\s+/.test(lines[i])
      ) {
        pLines.push(lines[i]);
        i++;
      }
      blocks.push({
        type: 'paragraph',
        content: pLines.join(' '),
      });
      continue;
    }

    i++;
  }

  return blocks;
}

const RenderBlock: React.FC<{ block: Block }> = ({ block }) => {
  const [copied, setCopied] = useState(false);

  switch (block.type) {
    case 'heading': {
      const level = block.level || 1;
      const Tag = level === 1 ? 'h2' : level === 2 ? 'h3' : 'h4';
      const headingStyles =
        level === 1
          ? 'text-sm font-bold text-slate-900 dark:text-slate-100 mt-3 mb-1'
          : level === 2
          ? 'text-xs font-bold text-slate-900 dark:text-slate-100 mt-2 mb-1'
          : 'text-xs font-semibold text-slate-800 dark:text-slate-200 mt-2 mb-0.5';

      return (
        <Tag className={headingStyles}>
          <RenderInline text={block.content || ''} />
        </Tag>
      );
    }

    case 'quote':
      return (
        <div className="border-l-2 border-indigo-500 pl-3 py-1 text-slate-600 dark:text-slate-300 italic bg-indigo-50/40 dark:bg-indigo-950/20 rounded-r-lg my-1.5">
          <RenderInline text={block.content || ''} />
        </div>
      );

    case 'code': {
      const handleCopy = () => {
        if (block.content) {
          navigator.clipboard.writeText(block.content);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      };

      return (
        <div className="rounded-xl overflow-hidden border border-slate-700/60 bg-slate-950 text-slate-200 font-mono my-2">
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/80 border-b border-slate-800 text-[10px] text-slate-400">
            <span>{block.lang || 'code'}</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 hover:text-slate-200 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="p-3 overflow-x-auto text-[11px] leading-relaxed">
            <code>{block.content}</code>
          </pre>
        </div>
      );
    }

    case 'list':
      return (
        <ul className="list-disc list-inside space-y-1 my-1 pl-1">
          {block.items?.map((item, idx) => (
            <li key={idx} className="text-slate-700 dark:text-slate-300">
              <RenderInline text={item} />
            </li>
          ))}
        </ul>
      );

    case 'table':
      return (
        <div className="overflow-x-auto my-2 rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            {block.headers && (
              <thead className="bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  {block.headers.map((h, idx) => (
                    <th key={idx} className="p-2 font-semibold text-slate-800 dark:text-slate-200">
                      <RenderInline text={h} />
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {block.rows?.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="border-b last:border-0 border-slate-100 dark:border-slate-800/40 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                >
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-2 text-slate-700 dark:text-slate-300">
                      <RenderInline text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'paragraph':
    default:
      return (
        <p className="text-slate-700 dark:text-slate-300">
          <RenderInline text={block.content || ''} />
        </p>
      );
  }
};

const RenderInline: React.FC<{ text: string }> = ({ text }) => {
  // Regex tokenization for **bold**, *italic*, `code`
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Inline code `code`
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)$/);
    // Bold **text**
    const boldMatch = remaining.match(/^(.*?)\*\*([^*]+)\*\*(.*)$/);
    // Italic *text*
    const italicMatch = remaining.match(/^(.*?)\*([^*]+)\*(.*)$/);

    // Find earliest match index
    type Candidate = { type: 'code' | 'bold' | 'italic'; index: number; before: string; match: string; after: string };
    const candidates: Candidate[] = [];

    if (codeMatch) {
      candidates.push({ type: 'code', index: codeMatch[1].length, before: codeMatch[1], match: codeMatch[2], after: codeMatch[3] });
    }
    if (boldMatch) {
      candidates.push({ type: 'bold', index: boldMatch[1].length, before: boldMatch[1], match: boldMatch[2], after: boldMatch[3] });
    }
    if (italicMatch && !boldMatch) {
      candidates.push({ type: 'italic', index: italicMatch[1].length, before: italicMatch[1], match: italicMatch[2], after: italicMatch[3] });
    }

    if (candidates.length === 0) {
      parts.push(remaining);
      break;
    }

    candidates.sort((a, b) => a.index - b.index);
    const win = candidates[0];

    if (win.before) {
      parts.push(win.before);
    }

    if (win.type === 'code') {
      parts.push(
        <code
          key={key++}
          className="px-1 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-mono text-[11px]"
        >
          {win.match}
        </code>
      );
    } else if (win.type === 'bold') {
      parts.push(
        <strong key={key++} className="font-bold text-slate-900 dark:text-slate-100">
          {win.match}
        </strong>
      );
    } else if (win.type === 'italic') {
      parts.push(
        <em key={key++} className="italic text-slate-800 dark:text-slate-200">
          {win.match}
        </em>
      );
    }

    remaining = win.after;
  }

  return <>{parts}</>;
};
