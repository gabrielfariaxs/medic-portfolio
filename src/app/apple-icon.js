import { ImageResponse } from 'next/og';
import fs from 'fs';
import path from 'path';

export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

export default function Icon() {
  const filePath = path.join(process.cwd(), 'public', 'logo-medic.png');
  const fileBuffer = fs.readFileSync(filePath);
  const base64Image = `data:image/png;base64,${fileBuffer.toString('base64')}`;

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
          padding: '12px',
        }}
      >
        <img
          src={base64Image}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
