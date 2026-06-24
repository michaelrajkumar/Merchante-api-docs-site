'use client';

import React, { useMemo, useRef, useState } from 'react';
import clsx from 'clsx';

export type CodeSample = {
  key: string;
  label: string;
  code: string;
};

type Props = {
  title?: string;
  samples: CodeSample[];
  compact?: boolean;
};

const el = React.createElement;
const Frag = React.Fragment;

export function CodeSampleTabs({ title = 'Code samples', samples, compact = false }: Props) {
  const safe = useMemo(() => samples.filter((s) => s.code && s.code.trim().length > 0), [samples]);
  const [active, setActive] = useState(safe[0]?.key || '');
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const codeRef = useRef<HTMLPreElement | null>(null);

  const current = useMemo(() => safe.find((s) => s.key === active) ?? safe[0], [active, safe]);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(current?.code || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // no-op
    }
  }

  const header = !compact
    ? el(
        'div',
        { className: 'flex items-end justify-between' },
        el('h3', { className: 'text-sm font-semibold text-omise-gray-100' }, title),
        el('div', { className: 'text-xs text-omise-gray-400' }, 'Copy/paste friendly'),
      )
    : el(
        'div',
        { className: 'mb-2 flex items-center justify-between' },
        el('div', { className: 'text-xs font-semibold text-omise-gray-100' }, title),
        el(
          'div',
          { className: 'flex items-center gap-2' },
          el(
            'button',
            {
              type: 'button',
              onClick: () => setExpanded((v) => !v),
              className: 'rounded-md border border-omise-border bg-omise-dark-tertiary px-2 py-1 text-xs text-omise-gray-300 hover:bg-omise-dark',
            },
            expanded ? 'Collapse' : 'Expand',
          ),
          el(
            'button',
            {
              type: 'button',
              onClick: onCopy,
              className: 'rounded-md border border-omise-border bg-omise-dark-tertiary px-2 py-1 text-xs text-omise-gray-300 hover:bg-omise-dark',
            },
            copied ? 'Copied' : 'Copy',
          ),
        ),
      );

  const copyRow =
    !compact &&
    el(
      'div',
      { className: 'mt-3 flex items-center justify-end' },
      el(
        'button',
        {
          type: 'button',
          onClick: onCopy,
          className: 'text-xs font-medium text-omise-gray-300 hover:text-omise-gray-100',
        },
        copied ? 'Copied' : 'Copy',
      ),
    );

  const tabs = el(
    'div',
    {
      className: clsx('flex flex-wrap gap-1 border-b border-omise-border bg-omise-dark-tertiary', compact ? 'p-1.5' : 'p-2'),
    },
    ...safe.map((s) =>
      el(
        'button',
        {
          key: s.key,
          type: 'button',
          onClick: () => setActive(s.key),
          className: clsx(
            'rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all',
            active === s.key ? 'bg-gradient-to-r from-omise-teal to-omise-cyan text-white shadow-glow-cyan' : 'text-omise-gray-300 hover:bg-omise-dark-secondary hover:text-omise-cyan',
          ),
        },
        s.label,
      ),
    ),
  );

  const pre = el(
    'pre',
    {
      ref: codeRef as any,
      className: clsx(
        'max-h-[360px] overflow-auto rounded-b-xl bg-omise-dark p-4 text-[12px] leading-5 text-omise-gray-100',
        expanded && compact ? 'max-h-[520px]' : '',
      ),
    },
    el('code', { className: 'whitespace-pre' }, current?.code || ''),
  );

  return el(
    'div',
    { className: clsx(compact ? 'mt-0' : 'mt-6') },
    header,
    copyRow,
    el(
      'div',
      { className: clsx('overflow-hidden rounded-xl border border-omise-border bg-omise-dark-secondary', compact ? '' : 'mt-3') },
      tabs,
      pre,
    ),
  );
}
