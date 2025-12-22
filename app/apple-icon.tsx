import { ImageResponse } from 'next/og'

// Image metadata for Apple Touch Icon
export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

// Image generation - CÁRIS Apple icon with teal theme
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 120,
          background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '36px',
        }}
      >
        <span style={{ color: 'white', fontWeight: 'bold' }}>C</span>
      </div>
    ),
    {
      ...size,
    }
  )
}
