'use client'

import { useState } from 'react'

interface TeamLogoProps {
  src: string | null
  abbreviation: string
  name: string
  primaryColor: string | null
  secondaryColor: string | null
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: { box: 'w-8 h-8', text: 'text-[8px]' },
  md: { box: 'w-10 h-10', text: 'text-[10px]' },
  lg: { box: 'w-12 h-12', text: 'text-xs' },
}

export default function TeamLogo({
  src,
  abbreviation,
  name,
  primaryColor,
  secondaryColor,
  size = 'sm',
}: TeamLogoProps) {
  const [failed, setFailed] = useState(false)
  const dims = sizes[size]

  if (!src || failed) {
    return (
      <div
        className={`${dims.box} rounded-full flex items-center justify-center font-mono font-bold uppercase shrink-0`}
        style={{
          backgroundColor: primaryColor ?? '#2D3139',
          color: secondaryColor ?? '#FFFFFF',
        }}
      >
        <span className={dims.text}>
          {abbreviation?.substring(0, 3) ?? '??'}
        </span>
      </div>
    )
  }

  return (
    <div className={`${dims.box} flex items-center justify-center shrink-0`}>
      <img
        src={src}
        alt={abbreviation ?? name}
        className="w-full h-full object-contain"
        onError={() => setFailed(true)}
      />
    </div>
  )
}
