import { useEffect, useRef, useState } from 'react'

export function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number>(0)

  useEffect(() => {
    if (target === 0) { setCount(0); return }
    startRef.current = performance.now()
    const tick = (now: number) => {
      const elapsed = now - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setCount(target)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return count
}
