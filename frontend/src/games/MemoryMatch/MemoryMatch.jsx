import { ArrowLeft, Brain, CheckCircle2, Loader2, RefreshCw, Send } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { submitScore } from '../../services/gameService.js'
import { calculateMemoryScore, DIFFICULTIES, generateCards } from './utils.js'

const GAME_SLUG = 'memory-match'
const FLIP_DELAY = 900  // ms before mismatched cards flip back

export default function MemoryMatch() {
  const [phase, setPhase] = useState('select')   // select | playing | finished | submitting | submitted
  const [difficulty, setDifficulty] = useState(null)
  const [cards, setCards] = useState([])
  const [flipped, setFlipped] = useState([])      // up to 2 card IDs
  const [matched, setMatched] = useState(new Set())
  const [moves, setMoves] = useState(0)
  const [timer, setTimer] = useState(0)
  const [locked, setLocked] = useState(false)
  const [score, setScore] = useState(0)
  const [submitError, setSubmitError] = useState('')
  const [newTotal, setNewTotal] = useState(null)

  const timerRef = useRef(null)
  const timerValue = useRef(0)

  const startTimer = () => {
    timerValue.current = 0
    setTimer(0)
    timerRef.current = setInterval(() => {
      timerValue.current += 1
      setTimer(timerValue.current)
    }, 1000)
  }

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const startGame = useCallback((diff) => {
    stopTimer()
    const config = DIFFICULTIES[diff]
    const newCards = generateCards(config.pairs)
    setDifficulty(diff)
    setCards(newCards)
    setFlipped([])
    setMatched(new Set())
    setMoves(0)
    setScore(0)
    setSubmitError('')
    setNewTotal(null)
    setLocked(false)
    setPhase('playing')
    startTimer()
  }, [])

  const handleCardClick = useCallback(
    (cardId) => {
      if (locked || phase !== 'playing') return
      if (matched.has(cardId)) return
      if (flipped.includes(cardId)) return
      if (flipped.length >= 2) return

      const newFlipped = [...flipped, cardId]
      setFlipped(newFlipped)

      if (newFlipped.length === 2) {
        const [a, b] = newFlipped
        const cardA = cards.find((c) => c.id === a)
        const cardB = cards.find((c) => c.id === b)
        const newMoves = moves + 1
        setMoves(newMoves)

        if (cardA.value === cardB.value) {
          // Match!
          const newMatched = new Set([...matched, a, b])
          setMatched(newMatched)
          setFlipped([])

          // Check win condition
          if (newMatched.size === cards.length) {
            stopTimer()
            const config = DIFFICULTIES[difficulty]
            const finalScore = calculateMemoryScore({
              pairs: config.pairs,
              moves: newMoves,
              timeSeconds: timerValue.current,
              difficulty,
            })
            setScore(finalScore)
            setPhase('finished')
          }
        } else {
          // Mismatch — lock board briefly then flip back
          setLocked(true)
          setTimeout(() => {
            setFlipped([])
            setLocked(false)
          }, FLIP_DELAY)
        }
      }
    },
    [locked, phase, matched, flipped, cards, moves, difficulty],
  )

  const handleSubmit = useCallback(async () => {
    setPhase('submitting')
    setSubmitError('')
    try {
      const result = await submitScore({
        gameSlug: GAME_SLUG,
        score,
        duration: timerValue.current,
      })
      setNewTotal(result.newTotalScore)
      setPhase('submitted')
    } catch (err) {
      setSubmitError(err.response?.data?.message ?? 'Gagal mengirim skor.')
      setPhase('finished')
    }
  }, [score])

  useEffect(() => () => stopTimer(), [])

  const config = difficulty ? DIFFICULTIES[difficulty] : null

  // ── Phase: select difficulty ──
  if (phase === 'select') {
    return (
      <GameShell>
        <span className="grid size-20 place-items-center rounded-full bg-[#ef8b72]/10 text-[#ef8b72]">
          <Brain className="size-9" />
        </span>
        <h2 className="mt-6 text-2xl font-semibold">Memory Match</h2>
        <p className="mt-2 max-w-xs text-center text-sm leading-6 text-white/50">
          Flip cards to find matching pairs. Complete the board as fast as possible!
        </p>

        <div className="mt-8 grid gap-3 w-full max-w-sm">
          {Object.entries(DIFFICULTIES).map(([key, diff]) => (
            <button
              key={key}
              onClick={() => startGame(key)}
              className="group flex items-center justify-between border border-white/[0.08] bg-[#1a1f1d] px-5 py-4 text-left transition duration-200 hover:border-[#ef8b72]/30 hover:bg-[#ef8b72]/5"
            >
              <div>
                <p className="font-semibold text-white">{diff.label}</p>
                <p className="mt-0.5 text-xs text-white/40">{diff.description}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                key === 'easy' ? 'bg-[#c8f169]/10 text-[#c8f169] group-hover:bg-[#c8f169]/20' :
                key === 'medium' ? 'bg-[#8fd2dd]/10 text-[#8fd2dd] group-hover:bg-[#8fd2dd]/20' :
                'bg-[#ef8b72]/10 text-[#ef8b72] group-hover:bg-[#ef8b72]/20'
              }`}>
                {diff.label}
              </span>
            </button>
          ))}
        </div>
      </GameShell>
    )
  }

  // ── Phase: playing ──
  if (phase === 'playing') {
    const totalPairs = config.pairs
    const matchedPairs = matched.size / 2

    return (
      <div className="flex flex-col items-center gap-5 px-4 py-6">
        {/* HUD */}
        <div className="flex w-full max-w-lg items-center justify-between gap-4">
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase text-white/35">Pairs</p>
            <p className="text-xl font-bold text-[#ef8b72]">
              {matchedPairs}<span className="text-white/30">/{totalPairs}</span>
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase text-white/35">Time</p>
            <p className="text-xl font-bold tabular-nums">{formatTime(timer)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase text-white/35">Moves</p>
            <p className="text-xl font-bold text-white/70">{moves}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full max-w-lg overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-[#ef8b72] transition-[width] duration-300"
            style={{ width: `${(matchedPairs / totalPairs) * 100}%` }}
          />
        </div>

        {/* Card grid */}
        <div
          className={`grid gap-2.5 w-full max-w-lg ${
            config.pairs <= 4 ? 'grid-cols-4' :
            config.pairs <= 6 ? 'grid-cols-4' :
            'grid-cols-4'
          }`}
        >
          {cards.map((card) => {
            const isFlipped = flipped.includes(card.id) || matched.has(card.id)
            const isMatched = matched.has(card.id)

            return (
              <button
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                disabled={isMatched || locked}
                aria-label={isFlipped ? `Card: ${card.value}` : 'Hidden card'}
                className={`relative aspect-square flex items-center justify-center border text-3xl transition duration-200
                  ${isMatched
                    ? 'border-[#ef8b72]/30 bg-[#ef8b72]/8 cursor-default'
                    : isFlipped
                    ? 'border-white/20 bg-[#242b27] scale-95'
                    : 'border-white/[0.08] bg-[#1a1f1d] hover:border-white/18 hover:bg-[#1e2420] cursor-pointer'
                  }`}
              >
                {isFlipped ? (
                  <span className={`select-none ${isMatched ? 'opacity-70' : ''}`}>
                    {card.value}
                  </span>
                ) : (
                  <span className="text-white/15 text-lg font-bold">?</span>
                )}
              </button>
            )
          })}
        </div>

        <button
          onClick={() => { stopTimer(); setPhase('select') }}
          className="text-xs text-white/30 transition hover:text-white/60"
        >
          ← Change difficulty
        </button>
      </div>
    )
  }

  // ── Phase: finished ──
  if (phase === 'finished') {
    return (
      <GameShell>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#ef8b72]">
          Complete!
        </p>
        <h2 className="mt-3 text-3xl font-semibold">You matched them all! 🎉</h2>

        <div className="mt-7 grid grid-cols-3 gap-3 w-full max-w-sm">
          <StatBox label="Score" value={score.toLocaleString('id-ID')} color="text-[#c8f169]" />
          <StatBox label="Moves" value={moves} color="text-[#ef8b72]" />
          <StatBox label="Time" value={formatTime(timerValue.current)} color="text-[#8fd2dd]" />
        </div>

        {submitError && <p className="mt-4 text-sm text-[#ef8b72]">{submitError}</p>}

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 rounded-full bg-[#ef8b72] px-6 py-3 text-sm font-semibold text-[#1a0c07] transition hover:bg-[#f5a289] hover:-translate-y-0.5"
          >
            <Send className="size-4" /> Submit Score
          </button>
          <button
            onClick={() => startGame(difficulty)}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
          >
            <RefreshCw className="size-4" /> Play Again
          </button>
          <button
            onClick={() => setPhase('select')}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-6 py-3 text-sm text-white/50 transition hover:text-white/80"
          >
            Change Difficulty
          </button>
        </div>
      </GameShell>
    )
  }

  // ── Phase: submitting ──
  if (phase === 'submitting') {
    return (
      <GameShell>
        <Loader2 className="size-10 animate-spin text-[#ef8b72]" />
        <p className="mt-4 text-sm text-white/50">Submitting score…</p>
      </GameShell>
    )
  }

  // ── Phase: submitted ──
  if (phase === 'submitted') {
    return (
      <GameShell>
        <CheckCircle2 className="size-14 text-[#ef8b72]" />
        <h2 className="mt-4 text-2xl font-semibold">Score Saved!</h2>
        <p className="mt-1 text-sm text-white/45 capitalize">
          Difficulty: <span className="font-semibold text-white">{difficulty}</span>
        </p>
        <div className="mt-5 flex items-center gap-3">
          <div className="border border-[#ef8b72]/20 bg-[#ef8b72]/5 px-5 py-3 text-center">
            <p className="text-xs text-white/40">Score earned</p>
            <p className="text-2xl font-semibold text-[#ef8b72]">{score.toLocaleString('id-ID')}</p>
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
            onClick={() => startGame(difficulty)}
            className="inline-flex items-center gap-2 rounded-full bg-[#ef8b72] px-6 py-3 text-sm font-semibold text-[#1a0c07] transition hover:bg-[#f5a289]"
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

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
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
