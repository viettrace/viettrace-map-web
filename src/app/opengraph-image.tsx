import { ImageResponse } from 'next/og';

export const alt = 'Viettrace — Bản đồ lịch sử Việt Nam';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: 'linear-gradient(135deg, #fff7ed 0%, #eff6ff 55%, #f8fafc 100%)',
          color: '#111827',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Arial, sans-serif',
          height: '100%',
          justifyContent: 'center',
          padding: 72,
          width: '100%',
        }}
      >
        <div style={{ color: '#dc2626', fontSize: 28, fontWeight: 700, letterSpacing: 2 }}>
          VIETTRACE
        </div>
        <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.08, marginTop: 28, textAlign: 'center' }}>
          Bản đồ lịch sử Việt Nam
        </div>
        <div style={{ color: '#475569', fontSize: 32, marginTop: 28, textAlign: 'center' }}>
          So sánh 63 tỉnh trước 7/2025 và 34 tỉnh sau sáp nhập
        </div>
      </div>
    ),
    size,
  );
}
