'use client';

import { useEffect, useRef, useState } from 'react';
import { Mail } from 'lucide-react';

export default function TemplatePreview({ content }: { content: any }) {
  const [html, setHtml] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.35);

  useEffect(() => {
    if (!content) return;
    let cancelled = false;
    Promise.all([
      import('mjml-browser'),
      import('easy-email-core'),
    ]).then(([mjmlMod, coreMod]) => {
      if (cancelled) return;
      try {
        const mjmlString = coreMod.JsonToMjml({ data: content, mode: 'production', context: content });
        const result = mjmlMod.default(mjmlString, {}).html;
        setHtml(result);
      } catch {
        setHtml('');
      }
    });
    return () => { cancelled = true; };
  }, [content]);

  useEffect(() => {
    if (!html || !containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setScale(entry.contentRect.width / 600);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [html]);

  if (!html) {
    return (
      <div className='w-full flex items-center justify-center bg-gray-50' style={{ height: 200 }}>
        <Mail className='w-12 h-12 text-gray-300' />
      </div>
    );
  }

  const displayHeight = Math.min(600 * scale, 400);

  return (
    <div
      ref={containerRef}
      className='w-full overflow-hidden bg-white'
      style={{ height: displayHeight }}
    >
      <iframe
        srcDoc={html}
        style={{
          width: 600,
          height: 600,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          border: 'none',
          pointerEvents: 'none',
          display: 'block',
        }}
        sandbox=''
      />
    </div>
  );
}
