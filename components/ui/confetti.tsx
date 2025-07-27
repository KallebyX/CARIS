"use client"

import { useEffect, useState } from "react"

interface ConfettiPiece {
  id: number
  x: number
  y: number
  rotation: number
  color: string
  size: number
  speedX: number
  speedY: number
  gravity: number
}

export function Confetti() {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([])
  const [isActive, setIsActive] = useState(true)

  const colors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", 
    "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9"
  ]

  useEffect(() => {
    // Criar peças iniciais de confetti
    const initialPieces: ConfettiPiece[] = []
    
    for (let i = 0; i < 100; i++) {
      initialPieces.push({
        id: i,
        x: Math.random() * window.innerWidth,
        y: -10,
        rotation: Math.random() * 360,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        speedX: (Math.random() - 0.5) * 4,
        speedY: Math.random() * 3 + 2,
        gravity: 0.1 + Math.random() * 0.1
      })
    }
    
    setPieces(initialPieces)

    // Animação
    const animate = () => {
      setPieces(prevPieces => 
        prevPieces.map(piece => ({
          ...piece,
          x: piece.x + piece.speedX,
          y: piece.y + piece.speedY,
          rotation: piece.rotation + piece.speedX,
          speedY: piece.speedY + piece.gravity
        })).filter(piece => piece.y < window.innerHeight + 50)
      )
    }

    const interval = setInterval(animate, 16) // ~60fps

    // Parar depois de 5 segundos
    const timeout = setTimeout(() => {
      setIsActive(false)
      clearInterval(interval)
    }, 5000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [])

  if (!isActive || pieces.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map(piece => (
        <div
          key={piece.id}
          className="absolute"
          style={{
            left: piece.x,
            top: piece.y,
            width: piece.size,
            height: piece.size,
            backgroundColor: piece.color,
            transform: `rotate(${piece.rotation}deg)`,
            borderRadius: "2px",
            opacity: 0.8
          }}
        />
      ))}
    </div>
  )
} 