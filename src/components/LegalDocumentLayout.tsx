import Link from 'next/link';
import type { ReactNode } from 'react';

type LegalDocumentLayoutProps = {
  title: string;
  children: ReactNode;
};

export function LegalDocumentLayout({ title, children }: LegalDocumentLayoutProps) {
  return (
    <div className="min-h-dvh bg-nave text-text-body">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgb(255_196_107_/_0.06),_transparent_55%)]" aria-hidden />
      <div className="relative mx-auto flex w-full max-w-2xl flex-col px-4 pb-16 pt-6 sm:px-6">
        <Link
          href="/"
          className="mb-8 inline-flex w-fit items-center gap-2 text-caption tracking-(--tracking-hangul) text-text-mute transition-colors hover:text-flame"
        >
          <span aria-hidden>←</span>
          성당으로 돌아가기
        </Link>

        <header className="mb-8 space-y-4 border-b border-line pb-6">
          <p className="font-display text-overline uppercase tracking-[0.18em] text-flame">
            Neon Cathedral
          </p>
          <h1 className="font-serif text-title text-text-hi">{title}</h1>
          <p className="inline-flex rounded-md border border-flame/25 bg-flame/10 px-3 py-1.5 text-caption text-flame">
            법무 검토 전 초안(v0.1)
          </p>
        </header>

        <article className="legal-prose space-y-8 text-body leading-relaxed text-text-body">
          {children}
        </article>
      </div>
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-serif text-heading text-text-hi">{title}</h2>
      <div className="space-y-3 text-label sm:text-body">{children}</div>
    </section>
  );
}

export function LegalMeta({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-1 rounded-[18px] border border-line bg-surface/60 px-4 py-3 text-label text-text-mute backdrop-blur-sm">
      {children}
    </div>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ol className="list-decimal space-y-2 pl-5 marker:text-flame">
      {items.map((item, index) => (
        <li key={index} className="pl-1">
          {item}
        </li>
      ))}
    </ol>
  );
}

export function LegalBulletList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 marker:text-flame">
      {items.map((item, index) => (
        <li key={index} className="pl-1">
          {item}
        </li>
      ))}
    </ul>
  );
}

export function LegalTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto rounded-[16px] border border-line bg-surface/50">
      <table className="w-full min-w-[280px] border-collapse text-left text-label">
        <thead>
          <tr className="border-b border-line text-text-mute">
            {headers.map((header) => (
              <th key={header} className="px-3 py-2.5 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-line/70 last:border-b-0">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2.5 align-top text-text-body">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
