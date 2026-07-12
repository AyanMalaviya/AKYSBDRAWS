import React, { useEffect, useRef } from 'react'

export default function Footer() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf
    let t = 0

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()
    window.addEventListener('resize', resize)

    const waves = [
      { amp: 5, freq: 0.022, speed: 0.022, color: 'rgba(0,212,255,0.55)', width: 1.5, offset: 0 },
      { amp: 4, freq: 0.030, speed: 0.030, color: 'rgba(180,0,255,0.45)', width: 1.2, offset: 1.8 },
      { amp: 3, freq: 0.018, speed: 0.016, color: 'rgba(0,255,180,0.35)', width: 1.0, offset: 3.5 },
    ]

    const draw = () => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      ctx.clearRect(0, 0, w, h)

      waves.forEach(wave => {
        ctx.beginPath()
        ctx.moveTo(0, h / 2)
        for (let x = 0; x <= w; x++) {
          const y = h / 2 + Math.sin(x * wave.freq + t * wave.speed * 60 + wave.offset) * wave.amp
          ctx.lineTo(x, y)
        }
        ctx.strokeStyle = wave.color
        ctx.lineWidth = wave.width
        ctx.shadowColor = wave.color
        ctx.shadowBlur = 8
        ctx.stroke()
      })

      t += 0.016
      raf = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <footer className="site-footer">
      <canvas ref={canvasRef} className="footer-wave-canvas" aria-hidden="true" />
      <div className="footer-content">
        <span className="footer-text">Developed by&nbsp;</span>
        <a
          href="https://www.instagram.com/ayanmalaviya/"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
        >
          Ayan Malaviya
        </a>
      </div>
    </footer>
  )
}
