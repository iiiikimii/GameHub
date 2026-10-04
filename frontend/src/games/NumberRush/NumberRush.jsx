import { ArrowLeft, CheckCircle2, Grid2X2, Loader2, RefreshCw, Send, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { submitScore } from '../../services/gameService.js'
import { calculateNumberRushScore, generateGrid, GRID_SIZE, TOTAL_TIME } from './utils.js'

const GAME_SLUG = 'number-rush'

export default function NumberRush() {
  const [phase, setPhase] = useState('idle')  // idle | playing | finished | submitting | submitted
  const [grid, setGrid] = useState([])
  const [nextExpected, setNextExpected] = useState(1)
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [flashCell, setFlashCell] = useState(null) // { index, type: 'correct'|'wrong' }
  const [score, setScore] = useState(0)
  const [submitError, setSubmitError] = useState('')
  const [newTotal, setNewTotal] = useState(null)
  const [elapsedDuration, setElapsedDuration] = useState(TOTAL_TIME)

  const timerRef = useRef(null)
  const startTimeRef = useRef(null)

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const startGame = useCallback(() => {
    stopTimer()
    const newGrid = generateGrid(GRID_SIZE)
    setGrid(newGrid)
    setNextExpected(1)
    setTimeLeft(TOTAL_TIME)
    setCorrect(0)
    setWrong(0)
    setScore(0)
    setFlashCell(null)
    setSubmitError('')
    setNewTotal(null)
    startTimeRef.current = Date.now()
    setPhase('playing')

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopTimer()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  // End game when time hits 0
  useEffect(() => {
    if (phase === 'playing' && timeLeft === 0) {
      const elapsed = startTimeRef.current
        ? Math.min(TOTAL_TIME, (Date.now() - startTimeRef.current) / 1000)
        : TOTAL_TIME
      setElapsedDuration(parseFloat(elapsed.toFixed(3)))

      // Calculate final score based on current correct/wrong state
      setScore((prevScore) => prevScore)  // already updated on each click
      setPhase('finished')
    }
  }, [timeLeft, phase])

  const handleCellClick = useCallback(
    (num, index) => {
      if (phase !== 'playing') return

      if (num === nextExpected) {
        // Correct
        const newCorrect = correct + 1
        const newNext = nextExpected + 1
        setCorrect(newCorrect)
        setFlashCell({ index, type: 'correct' })
        setTimeout(() => setFlashCell(null), 300)

        if (newNext > GRID_SIZE) {
          // Completed all numbers — regenerate grid, reset sequence
          const newGrid = generateGrid(GRID_SIZE)
          setGrid(newGrid)
          setNextExpected(1)
        } else {
          setNextExpected(newNext)
        }

        // Recalculate score
        const s = calculateNumberRushScore({
          correct: newCorrect,
          wrong,
          timeLeft,
          totalTime: TOTAL_TIME,
          gridSize: GRID_SIZE,
        })
        setScore(s)
      } else {
        // Wrong
        const newWrong = wrong + 1
        setWrong(newWrong)
        setFlashCell({ index, type: 'wrong' })
        setTimeout(() => setFlashCell(null), 400)

        const s = calculateNumberRushScore({
          correct,
          wrong: newWrong,
          timeLeft,
          totalTime: TOTAL_TIME,
          gridSize: GRID_SIZE,
        })
        setScore(s)
      }
    },
    [phase, nextExpected, correct, wrong, timeLeft],
  )

  const handleSubmit = useCallback(async () => {
    setPhase('submitting')
    setSubmitError('')
    try {
      const result = await submitScore({
        gameSlug: GAME_SLUG,
        score,
        duration: elapsedDuration,
      })
      setNewTotal(result.newTotalScore)
      setPhase('submitted')
    } catch (err) {
      setSubmitError(err.response?.data?.message ?? 'Gagal mengirim skor.')
      setPhase('finished')
    }
  }, [score, elapsedDuration])

  useEffect(() => () => stopTimer(), [])

  // Timer color
  const timerColor = timeLeft > 10 ? 'text-[#c8f169]' : timeLeft > 5 ? 'text-[#ef8b72]' : 'text-red-400 animate-pulse'

  // ── Phase: idle ──
  if (phase === 'idle') {
    return (
      <GameShell>
        <span className="grid size-20 place-items-center rounded-full bg-[#8fd2dd]/10 text-[#8fd2dd]">
          <Grid2X2 className="size-9" />
        </span>
        <h2 className="mt-6 text-2xl font-semibold">Number Rush</h2>
        <p className="mt-2 max-w-xs text-center text-sm leading-6 text-white/50">
          Numbers will appear in a 3×3 grid. Click them in ascending order (1, 2, 3…) before time runs out!
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2 text-sm text-white/40">
          <div className="border border-white/[0.08] bg-[#1a1f1d] p-3 text-center">
            <p className="text-[#8fd2dd] font-semibold">+80</p>
            <p className="text-xs mt-1">Per correct</p>
          </div>
          <div className="border border-white/[0.08] bg-[#1a1f1d] p-3 text-center">
            <p className="text-[#ef8b72] font-semibold">-40</p>
            <p className="text-xs mt-1">Per wrong</p>
          </div>
          <div className="border border-white/[0.08] bg-[#1a1f1d] p-3 text-center">
            <p className="text-white font-semibold">{TOTAL_TIME}s</p>
            <p className="text-xs mt-1">Time limit</p>
          </div>
        </div>
        <button
          onClick={startGame}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#8fd2dd] px-8 py-3.5 font-semibold text-[#0f1f22] transition hover:bg-[#a8e0e9] hover:-translate-y-0.5"
        >
          Start Game
        </button>
      </GameShell>
    )
  }

  // ── Phase: playing ──
  if (phase === 'playing') {
    return (
      <div className="flex flex-col items-center gap-6 px-4 py-8">
        {/* HUD */}
        <div className="flex w-full max-w-sm items-center justify-between gap-4">
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase text-white/35">Next</p>
            <p className="text-2xl font-bold text-[#8fd2dd]">{nextExpected}</p>
          </div>
          <div className="text-center">
            <p className={`text-4xl font-bold tabular-nums ${timerColor}`}>{timeLeft}</p>
            <p className="text-[10px] uppercase text-white/30">seconds</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase text-white/35">Score</p>
            <p className="text-2xl font-bold text-[#c8f169]">{score.toLocaleString('id-ID')}</p>
          </div>
        </div>

        {/* Timer bar */}
        <div className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-[#8fd2dd] transition-[width] duration-1000 ease-linear"
            style={{ width: `${(timeLeft / TOTAL_TIME) * 100}%` }}
          />
        </div>

        {/* Stats pills */}
        <div className="flex gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#c8f169]/8 px-3 py-1 text-[#c8f169]">
            <CheckCircle2 className="size-3.5" /> {correct}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ef8b72]/8 px-3 py-1 text-[#ef8b72]">
            <X className="size-3.5" /> {wrong}
          </span>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
          {grid.map((num, index) => {
            const isFlash = flashCell?.index === index
            const flashStyle = isFlash
              ? flashCell.type === 'correct'
                ? 'border-[#c8f169]/60 bg-[#c8f169]/15 scale-95'
                : 'border-[#ef8b72]/60 bg-[#ef8b72]/12 scale-95'
              : 'border-white/[0.08] bg-[#1a1f1d] hover:border-[#8fd2dd]/30 hover:bg-[#8fd2dd]/5'

            return (
              <button
                key={`${index}-${num}`}
                onClick={() => handleCellClick(num, index)}
                className={`flex h-[88px] items-center justify-center border text-3xl font-bold text-white transition duration-150 ${flashStyle}`}
                aria-label={`Number ${num}`}
              >
                {num}
              </button>
            )
          })}
        </div>

        <p className="text-xs text-white/25">Click numbers in order: 1 → 2 → 3 → …</p>
      </div>
    )
  }

  // ── Phase: finished ──
  if (phase === 'finished') {
    const accuracy = correct + wrong > 0 ? Math.round((correct / (correct + wrong)) * 100) : 0

    return (
      <GameShell>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#8fd2dd]">Game Over</p>
        <h2 className="mt-3 text-3xl font-semibold">Time's Up!</h2>

        <div className="mt-7 grid grid-cols-3 gap-3 w-full max-w-sm">
          <StatBox label="Score" value={score.toLocaleString('id-ID')} color="text-[#c8f169]" />
          <StatBox label="Correct" value={correct} color="text-[#8fd2dd]" />
          <StatBox label="Accuracy" value={`${accuracy}%`} color="text-white/70" />
        </div>

        {submitError && <p className="mt-4 text-sm text-[#ef8b72]">{submitError}</p>}

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 rounded-full bg-[#8fd2dd] px-6 py-3 text-sm font-semibold text-[#0f1f22] transition hover:bg-[#a8e0e9] hover:-translate-y-0.5"
          >
            <Send className="size-4" /> Submit Score
          </button>
          <button
            onClick={startGame}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
          >
            <RefreshCw className="size-4" /> Play Again
          </button>
        </div>
      </GameShell>
    )
  }

  // ── Phase: submitting ──
  if (phase === 'submitting') {
    return (
      <GameShell>
        <Loader2 className="size-10 animate-spin text-[#8fd2dd]" />
        <p className="mt-4 text-sm text-white/50">Submitting score…</p>
      </GameShell>
    )
  }

  // ── Phase: submitted ──
  if (phase === 'submitted') {
    return (
      <GameShell>
        <CheckCircle2 className="size-14 text-[#8fd2dd]" />
        <h2 className="mt-4 text-2xl font-semibold">Score Saved!</h2>
        <div className="mt-5 flex items-center gap-3">
          <div className="border border-[#8fd2dd]/20 bg-[#8fd2dd]/5 px-5 py-3 text-center">
            <p className="text-xs text-white/40">Score earned</p>
            <p className="text-2xl font-semibold text-[#8fd2dd]">{score.toLocaleString('id-ID')}</p>
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
            onClick={startGame}
            className="inline-flex items-center gap-2 rounded-full bg-[#8fd2dd] px-6 py-3 text-sm font-semibold text-[#0f1f22] transition hover:bg-[#a8e0e9]"
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
      </GameShell>
    )
  }

  return null
}

function GameShell({ children }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-12">
      {children}
    </div>
  )
}

function StatBox({ label, value, color }) {
  return (
    <div className="border border-white/[0.08] bg-[#1a1f1d] p-4 text-center">
      <p className="text-xs text-white/40">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  )
}
