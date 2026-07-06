import { ImageResponse } from 'next/og';

export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '20%',
        }}
      >
        <svg width="130" height="130" viewBox="0 0 64 64" fill="none">
          <defs>
            <linearGradient id="agBrand" x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
              <stop stopColor="#1f29de"/>
              <stop offset="0.55" stopColor="#0e8fb8"/>
              <stop offset="1" stopColor="#06df82"/>
            </linearGradient>
          </defs>
          <path d="M30 8c2-2 6-1 7 2l16 40c1 3-1 6-4 6-2 0-4-1-5-3L34 24 24 49c-1 2-3 3-5 3-3 0-5-3-4-6L30 8Z" fill="url(#agBrand)"/>
          <path d="M22 33c1-3 5-4 8-2 2 2 3 5 1 8-2 4-7 5-11 4-3-1-4-4-2-7l4-3Z" fill="url(#agBrand)"/>
          <path d="M36 36c4-2 9-1 11 3 1 3-1 6-5 7-5 1-11-1-13-5-1-3 1-5 3-5l4 0Z" fill="url(#agBrand)"/>
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
