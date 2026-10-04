import { ArrowLeft, CheckCircle2, Loader2, RefreshCw, Send, Zap } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { submitScore } from '../../services/gameService.js'
import { calculateReactionScore, getPerformanceLabel, getRandomDelay } from './utils.js'

// States: idle | waiting | ready | result | submitting | submitted | tooEarly
const GAME_SLUG = 'reaction-test'

export default function ReactionTest() {
  const [phase, setPhase] = useState('idle')       // idle | waiting | ready | tooEarly | result | submitting | submitted
  const [reactionMs, setReactionMs] = useState(null)
  const [score, setScore] = useState(null)
  const [submitError, setSubmitError] = useState('')
  const [newTotal, setNewTotal] = useState(null)

  const startTimeRef = useRef(null)
  const timerRef = useRef(null)

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  // Start a new round
  const startRound = useCallback(() => {
    clearTimer()
    setPhase('waiting')
    setReactionMs(null)
    setScore(null)
    setSubmitError('')
    setNewTotal(null)

    const delay = getRandomDelay()
    timerRef.current = setTimeout(() => {
      startTimeRef.current = performance.now()
      setPhase('ready')
    }, delay)
  }, [])

  // Handle click/tap
  const handleClick = useCallback(() => {
    if (phase === 'idle') {
      startRound()
    } else if (phase === 'waiting') {
      // Clicked too early
      clearTimer()
      setPhase('tooEarly')
    } else if (phase === 'ready') {
      const elapsed = Math.round(performance.now() - startTimeRef.current)
      const calculatedScore = calculateReactionScore(elapsed)
      setReactionMs(elapsed)
      setScore(calculatedScore)
      setPhase('result')
    }
  }, [phase, startRound])

  // Submit score to backend
  const handleSubmit = useCallback(async () => {
    if (score === null || reactionMs === null) return
    setPhase('submitting')
    setSubmitError('')
    try {
      const result = await submitScore({
        gameSlug: GAME_SLUG,
        score,
        duration: reactionMs / 1000,
      })
      setNewTotal(result.newTotalScore)
      setPhase('submitted')
    } catch (err) {
      setSubmitError(err.response?.data?.message ?? 'Gagal mengirim skor. Coba lagi.')
      setPhase('result')
    }
  }, [score, reactionMs])

  // Cleanup on unmount
  useEffect(() => () => clearTimer(), [])

  const perf = reactionMs !== null ? getPerformanceLabel(reactionMs) : null

  // ── Phase: idle ──
  if (phase === 'idle') {
    return (
      <GameShell>
        <div className="flex flex-col items-center text-center">
          <span className="grid size-20 place-items-center rounded-full bg-[#c8f169]/10 text-[#c8f169]">
            <Zap className="size-9" />
          </span>
          <h2 className="mt-6 text-2xl font-semibold">Reaction Test</h2>
          <p className="mt-2 max-w-xs text-sm leading-6 text-white/50">
            Wait for the signal, then click as fast as you can. How quick are your reflexes?
          </p>
          <button
            onClick={handleClick}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#c8f169] px-8 py-3.5 font-semibold text-[#172015] transition hover:bg-[#d7fa91] hover:-translate-y-0.5"
          >
            Start Game
          </button>
        </div>
      </GameShell>
    )
  }

  // ── Phase: waiting ──
  if (phase === 'waiting') {
    return (
      <ClickZone onClick={handleClick} bg="bg-[#1a1f1d]">
        <div className="flex flex-col items-center gap-6 text-center select-none pointer-events-none">
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="size-2.5 rounded-full bg-white/20 animate-pulse"
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </div>
          <p className="text-3xl font-semibold text-white/40">Wait…</p>
          <p className="text-sm text-white/25">Don't click yet!</p>
        </div>
      </ClickZone>
    )
  }

  // ── Phase: too early ──
  if (phase === 'tooEarly') {
    return (
      <GameShell>
        <div className="flex flex-col items-center text-center">
          <span className="grid size-16 place-items-center rounded-full bg-[#ef8b72]/12 text-[#ef8b72]">
            <span className="text-2xl font-bold">!</span>
          </span>
          <h2 className="mt-5 text-xl font-semibold text-[#ef8b72]">Too Early!</h2>
          <p className="mt-2 text-sm text-white/45">Wait for the green signal before clicking.</p>
          <button
            onClick={startRound}
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#c8f169] px-7 py-3 font-semibold text-[#172015] transition hover:bg-[#d7fa91]"
          >
            <RefreshCw className="size-4" /> Try Again
          </button>
        </div>
      </GameShell>
    )
  }

  // ── Phase: ready ──
  if (phase === 'ready') {
    return (
      <ClickZone onClick={handleClick} bg="bg-[#c8f169]/8" border="border-[#c8f169]/30">
        <div className="flex flex-col items-center gap-5 text-center select-none pointer-events-none">
          <div className="grid size-20 place-items-center rounded-full bg-[#c8f169]/20 animate-pulse-glow">
            <Zap className="size-9 text-[#c8f169]" />
          </div>
          <p className="text-3xl font-bold text-[#c8f169]">CLICK!</p>
          <p className="text-sm text-[#c8f169]/60">As fast as you can!</p>
        </div>
      </ClickZone>
    )
  }

  // ── Phase: result ──
  if (phase === 'result') {
    return (
      <GameShell>
        <div className="flex flex-col items-center text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: perf.color }}>
            {perf.label}
          </p>

          <div className="mt-4 flex flex-col items-center">
            <p className="text-6xl font-semibold tracking-tight" style={{ color: perf.color }}>
              {reactionMs}
              <span className="ml-1 text-2xl font-normal text-white/40">ms</span>
            </p>
            <p className="mt-1 text-sm text-white/40">Reaction time</p>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-3 w-full max-w-xs">
            <div className="flex items-center justify-between border border-white/[0.08] bg-[#1a1f1d] px-5 py-4">
              <span className="text-sm text-white/50">Score</span>
              <span className="text-xl font-semibold text-[#c8f169]">{score?.toLocaleString('id-ID')}</span>
            </div>
          </div>

          {submitError && (
            <p className="mt-4 text-sm text-[#ef8b72]">{submitError}</p>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 rounded-full bg-[#c8f169] px-6 py-3 text-sm font-semibold text-[#172015] transition hover:bg-[#d7fa91] hover:-translate-y-0.5"
            >
              <Send className="size-4" /> Submit Score
            </button>
            <button
              onClick={startRound}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
            >
              <RefreshCw className="size-4" /> Play Again
            </button>
          </div>
        </div>
      </GameShell>
    )
  }

  // ── Phase: submitting ──
  if (phase === 'submitting') {
    return (
      <GameShell>
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="size-10 animate-spin text-[#c8f169]" />
          <p className="text-sm text-white/50">Submitting your score…</p>
        </div>
      </GameShell>
    )
  }

  // ── Phase: submitted ──
  if (phase === 'submitted') {
    return (
      <GameShell>
        <div className="flex flex-col items-center text-center">
          <CheckCircle2 className="size-14 text-[#c8f169]" />
          <h2 className="mt-4 text-2xl font-semibold">Score Saved!</h2>
          <p className="mt-2 text-sm text-white/50">
            Your reaction time: <span className="font-semibold text-white">{reactionMs}ms</span>
          </p>
          <div className="mt-5 flex items-center gap-3">
            <div className="border border-[#c8f169]/20 bg-[#c8f169]/5 px-5 py-3 text-center">
              <p className="text-xs text-white/40">Score earned</p>
              <p className="text-2xl font-semibold text-[#c8f169]">{score?.toLocaleString('id-ID')}</p>
            </div>
            {newTotal !== null && (
              <div className="border border-white/[0.08] bg-[#1a1f1d] px-5 py-3 text-center">
                <p className="text-xs text-white/40">Total score</p>
                <p className="text-2xl font-semibold">{newTotal.toLocaleString('id-ID')}</p>
              </div>
            )}
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button
              onClick={startRound}
              className="inline-flex items-center gap-2 rounded-full bg-[#c8f169] px-6 py-3 text-sm font-semibold text-[#172015] transition hover:bg-[#d7fa91]"
            >
              <RefreshCw className="size-4" /> Play Again
            </button>
            <Link
              to="/games"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
            >
              <ArrowLeft className="size-4" /> Back to Games
            </Link>
          </div>
        </div>
      </GameShell>
    )
  }

  return null
}

// ── Sub-components ──────────────────────────────────────────

function GameShell({ children }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-12">
      {children}
    </div>
  )
}

function ClickZone({ onClick, bg = 'bg-[#1a1f1d]', border = 'border-white/[0.08]', children }) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-[55vh] w-full cursor-pointer flex-col items-center justify-center rounded-none border-2 ${border} ${bg} transition duration-150 active:scale-[0.99] focus:outline-none`}
      aria-label="Click zone"
    >
      {children}
    </button>
  )
}
