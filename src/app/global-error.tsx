'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="vi">
      <body>
        <main style={{ alignItems: 'center', display: 'flex', minHeight: '100vh', justifyContent: 'center', padding: 24 }}>
          <section style={{ maxWidth: 440, textAlign: 'center' }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Viettrace gặp lỗi</h1>
            <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.6 }}>
              Không thể tải ứng dụng lúc này. Vui lòng thử lại sau.
            </p>
          </section>
        </main>
      </body>
    </html>
  );
}
