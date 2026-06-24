'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import clsx from 'clsx'

export function Markdown({ className, children }: { className?: string; children: string }) {
  return (
    <div className={clsx('prose prose-invert max-w-none prose-table:text-sm prose-pre:bg-omise-dark prose-pre:text-omise-gray-100 prose-headings:text-omise-gray-100 prose-p:text-omise-gray-300 prose-a:text-omise-cyan prose-strong:text-omise-gray-100 prose-code:text-omise-cyan prose-code:bg-omise-dark-tertiary', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  )
}
