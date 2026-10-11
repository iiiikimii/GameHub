import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Clock3, Copy, Crown, RefreshCw, Shield, Swords, Trophy } from 'lucide-react'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { apiErrorMessage } from '../services/apiErrorMessage.js'
import { getFriends } from '../services/socialService.js'
import { normalizeChessFriends } from '../services/chessViewModel.js'
import './ChessPage.css'
import {
  createChessRematch,
  createChessRoom,
  createChessSocket,
  getActiveChessRoom,
  getChessInvitations,
  getChessRoom,
  joinChessRoomByCode,
  respondChessInvitation,
} from '../services/chessService.js'

const PIECE_NAMES = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' }
const PIECES = { wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙', bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟' }

function errorMessage(error, fallback) {
  return apiErrorMessage(error, fallback)
}

function gameResult(room) {
  if (room.result === 'DRAW') return 'The match ended in a draw.'
  if (room.result === 'WHITE_WIN') return `${room.players.white.username} wins.`
  if (room.result === 'BLACK_WIN') return `${room.players.black?.username ?? 'Black'} wins.`
  return room.termination === 'ABANDONED' ? 'The match was marked abandoned.' : 'Match complete.'
}

function ChessBoard({ room, playerColor, selectedSquare, onSquareClick, disabled }) {
  const rankOrder = playerColor === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0]
  const fileOrder = playerColor === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0]
  const lastMove = room.moveHistory.at(-1)
  const legalFromSelected = room.legalMoves.filter((move) => move.from === selectedSquare)
  const legalDestinations = new Set(legalFromSelected.map((move) => move.to))

  return (
    <div className="chess-board-frame">
      <div className="chess-board">
        {rankOrder.flatMap((rankIndex, visibleRow) => fileOrder.map((fileIndex, visibleColumn) => {
          const piece = room.board[rankIndex][fileIndex]
          const square = `${String.fromCharCode(97 + fileIndex)}${8 - rankIndex}`
          const isLight = (visibleRow + visibleColumn) % 2 === 0
          const isLastMove = lastMove?.from === square || lastMove?.to === square
          const isLegalDestination = legalDestinations.has(square)
          const isSelected = selectedSquare === square
          const color = piece?.color === 'w' ? 'White' : 'Black'
          const name = piece ? `${color} ${PIECE_NAMES[piece.type]}` : 'Empty square'
          const highlight = isSelected
            ? 'inset 0 0 0 4px #8b8bff'
            : isLegalDestination
              ? 'inset 0 0 0 999px rgba(139, 139, 255,0.34)'
              : isLastMove
                ? 'inset 0 0 0 999px rgba(245,209,80,0.28)'
                : 'none'

          return (
            <button
              key={square}
              type="button"
              disabled={disabled}
              onClick={() => onSquareClick(square, piece)}
              aria-label={`${name} on ${square}`}
              aria-pressed={isSelected}
              className={`chess-square ${isLight ? 'chess-square--light' : 'chess-square--dark'} ${disabled ? 'chess-square--disabled' : ''}`}
              style={{ boxShadow: highlight }}
            >
              {piece && <span className={`chess-piece ${piece.color === 'w' ? 'chess-piece--white' : 'chess-piece--black'}`}>{PIECES[`${piece.color}${piece.type}`]}</span>}
              {visibleColumn === 0 && <span className={`absolute left-1 top-0.5 text-[9px] font-bold ${isLight ? 'text-[#4c5685]' : 'text-[#e4e6f3]'}`}>{8 - rankIndex}</span>}
              {visibleRow === 7 && <span className={`absolute bottom-0 right-1 text-[9px] font-bold ${isLight ? 'text-[#4c5685]' : 'text-[#e4e6f3]'}`}>{String.fromCharCode(97 + fileIndex)}</span>}
            </button>
          )
        }))}
      </div>
    </div>
  )
}

function PlayerCard({ player, color, active, mine }) {
  if (!player) return <div className="flex items-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-3"><span className="grid size-10 place-items-center rounded-lg bg-white/5 text-white/30"><Clock3 className="size-4" /></span><div><p className="text-sm text-white/45">Waiting for friend</p><p className="mt-1 text-[11px] text-white/25">Invitation expires after 15 minutes</p></div></div>
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3 ${active ? 'border-[#8b8bff]/25 bg-[#8b8bff]/[0.06]' : 'border-white/[0.08] bg-white/[0.025]'}`}>
      <span className={`grid size-10 place-items-center rounded-lg text-lg ${color === 'w' ? 'bg-[#f4f1df] text-[#2b2e55]' : 'bg-[#252949] text-[#e6eedc]'}`}>{color === 'w' ? '♔' : '♚'}</span>
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white/85">{player.username}</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/35">{color === 'w' ? 'White' : 'Black'}{mine ? ' · You' : ''}</p></div>
      {active && <span className="size-2 rounded-full bg-[#8b8bff] shadow-[0_0_12px_#8b8bff]" aria-label="Current turn" />}
    </div>
  )
}

export default function ChessPage() {
  const { token, user } = useAuth()
  const [friends, setFriends] = useState([])
  const [invitations, setInvitations] = useState({ incoming: [], outgoing: [] })
  const [room, setRoom] = useState(null)
  const [roomViewOpen, setRoomViewOpen] = useState(false)
  const [selectedFriend, setSelectedFriend] = useState('')
  const [roomCodeInput, setRoomCodeInput] = useState('')
  const [selectedSquare, setSelectedSquare] = useState(null)
  const [promotionMove, setPromotionMove] = useState(null)
  const socketRef = useRef(null)
  const [connection, setConnection] = useState('Connecting')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const playerColor = useMemo(() => {
    if (!room || !user) return 'w'
    return String(room.players.white.id) === String(user.id) ? 'w' : 'b'
  }, [room, user])
  const isMyTurn = room?.status === 'ACTIVE' && room.turn === playerColor
  const activeRoomCode = room?.roomCode
  const activeRoomStatus = room?.status

  const fetchHub = useCallback(() => Promise.all([
    getActiveChessRoom(),
    getChessInvitations(),
    getFriends(1),
  ]), [])

  const refreshHub = useCallback(async () => {
    try {
      const [activeRoom, inviteData, friendData] = await fetchHub()
      setRoom(activeRoom)
      setInvitations(inviteData)
      setFriends(normalizeChessFriends(friendData))
      setError('')
    } catch (loadError) {
      setError(errorMessage(loadError, 'Could not load chess rooms and invitations.'))
    }
  }, [fetchHub])

  useEffect(() => {
    let mounted = true
    fetchHub()
      .then(([activeRoom, inviteData, friendData]) => {
        if (!mounted) return
        setRoom(activeRoom)
        setInvitations(inviteData)
        setFriends(normalizeChessFriends(friendData))
        setError('')
      })
      .catch((loadError) => {
        if (mounted) setError(errorMessage(loadError, 'Could not load chess rooms and invitations.'))
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => { mounted = false }
  }, [fetchHub])

  useEffect(() => {
    if (roomViewOpen) return undefined
    const timer = setInterval(async () => {
      try { setInvitations(await getChessInvitations()) } catch { /* Invitations remain persisted for the next refresh. */ }
    }, 5000)
    return () => clearInterval(timer)
  }, [roomViewOpen])

  useEffect(() => {
    if (!room || room.status !== 'WAITING' || roomViewOpen) return undefined
    const timer = setInterval(async () => {
      try {
        const current = await getChessRoom(room.roomCode)
        setRoom(current)
      } catch (pollError) {
        if (pollError.response?.status === 410) setRoom(null)
      }
      try { setInvitations(await getChessInvitations()) } catch { /* The main page reports initial load failures. */ }
    }, 3500)
    return () => clearInterval(timer)
  }, [room, roomViewOpen])

  useEffect(() => {
    if (!roomViewOpen || !activeRoomCode || activeRoomStatus === 'COMPLETED' || !token) return undefined
    const currentSocket = createChessSocket(token)
    socketRef.current = currentSocket
    currentSocket.on('connect', () => {
      setConnection('Connected')
      currentSocket.emit('chess:join', { roomCode: activeRoomCode }, (response) => {
        if (response?.ok) setRoom(response.state)
        else setError(response?.error ?? 'Could not rejoin this match.')
      })
    })
    currentSocket.on('disconnect', () => setConnection('Reconnecting'))
    currentSocket.on('connect_error', () => setConnection('Offline'))
    currentSocket.on('chess:state', (nextRoom) => setRoom(nextRoom))
    currentSocket.connect()
    return () => {
      currentSocket.removeAllListeners()
      currentSocket.disconnect()
      if (socketRef.current === currentSocket) socketRef.current = null
    }
  }, [activeRoomCode, activeRoomStatus, roomViewOpen, token])

  async function startRoom(friendId) {
    setBusy(true); setError(''); setNotice('')
    try {
      const created = await createChessRoom(friendId)
      const state = await getChessRoom(created.roomCode)
      setConnection('Connecting')
      setRoom(state)
      setRoomViewOpen(true)
      setNotice(`Invitation sent to ${created.invitee}. It expires in ${created.expiresInMinutes} minutes.`)
       await refreshHub()
    } catch (requestError) {
      setError(errorMessage(requestError, 'Could not create the chess invitation.'))
    } finally { setBusy(false) }
  }

  async function respondToInvite(invitation, accept) {
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await respondChessInvitation(invitation.id, accept)
      if (response.status === 'ACCEPTED') {
        const state = await getChessRoom(response.roomCode)
        setConnection('Connecting')
        setRoom(state)
        setRoomViewOpen(true)
      } else {
        setNotice(response.status === 'EXPIRED' ? 'That chess invitation has expired.' : 'Invitation declined.')
      }
       await refreshHub()
    } catch (requestError) {
      setError(errorMessage(requestError, 'Could not respond to the chess invitation.'))
    } finally { setBusy(false) }
  }

  async function joinByCode(event) {
    event.preventDefault()
    setBusy(true); setError(''); setNotice('')
    try {
      const joined = await joinChessRoomByCode(roomCodeInput.trim().toUpperCase())
      const state = await getChessRoom(joined.roomCode)
      setConnection('Connecting')
      setRoom(state)
      setRoomViewOpen(true)
      setRoomCodeInput('')
       await refreshHub()
    } catch (requestError) {
      setError(errorMessage(requestError, 'Could not join that chess room.'))
    } finally { setBusy(false) }
  }

  async function sendMove(from, to, promotion) {
    const socket = socketRef.current
    if (!socket?.connected || !room) return
    setBusy(true); setError('')
    socket.timeout(8000).emit('chess:move', { roomCode: room.roomCode, from, to, promotion, expectedPly: room.ply }, (timeoutError, response) => {
      if (timeoutError) {
        setError('The connection dropped before the move was confirmed. Reconnect to sync the board.')
        setBusy(false)
        return
      }
      if (response?.ok) {
        setRoom(response.state)
        setSelectedSquare(null)
        setPromotionMove(null)
      } else {
        setError(response?.error ?? 'The move could not be submitted.')
        socket.emit('chess:join', { roomCode: room.roomCode }, (sync) => { if (sync?.ok) setRoom(sync.state) })
      }
      setBusy(false)
    })
  }

  function clickSquare(square, piece) {
    if (!room || !isMyTurn || busy || !socketRef.current?.connected) return
    if (selectedSquare) {
      const candidates = room.legalMoves.filter((move) => move.from === selectedSquare && move.to === square)
      if (candidates.some((move) => move.promotion)) {
        setPromotionMove({ from: selectedSquare, to: square, choices: candidates.map((move) => move.promotion) })
        return
      }
      if (candidates.length) {
        sendMove(selectedSquare, square)
        return
      }
    }
    if (piece?.color === playerColor) setSelectedSquare(square)
    else setSelectedSquare(null)
  }

  async function matchAction(action) {
    const socket = socketRef.current
    if (!room || !socket?.connected) return
    setBusy(true); setError('')
    socket.timeout(8000).emit('chess:action', { roomCode: room.roomCode, action }, (timeoutError, response) => {
      if (timeoutError) {
        setError('The connection dropped before the action was confirmed. Reconnect to sync the match.')
        setBusy(false)
        return
      }
      if (response?.ok) setRoom(response.state)
      else setError(response?.error ?? 'Chess action failed.')
      setBusy(false)
    })
  }

  async function playRematch() {
    setBusy(true); setError('')
    try {
      const created = await createChessRematch(room.roomCode)
      const state = await getChessRoom(created.roomCode)
      setRoom(state)
      setRoomViewOpen(true)
      setNotice(`Rematch invitation sent to ${created.invitee}.`)
       await refreshHub()
    } catch (requestError) {
      setError(errorMessage(requestError, 'Could not create a rematch.'))
    } finally { setBusy(false) }
  }

  async function copyRoomCode() {
    try {
      await navigator.clipboard.writeText(room?.roomCode ?? '')
      setNotice('Room code copied. Only the invited friend can use it.')
    } catch {
      setNotice(`Room code: ${room?.roomCode}`)
    }
  }

  if (loading) return <DashboardLayout><p className="py-16 text-center text-sm text-white/45" aria-live="polite">Loading chess…</p></DashboardLayout>

  return (
    <DashboardLayout>
      <section className="mx-auto w-full max-w-[1680px]">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#b9b9ff]">Play together</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Chess with friends</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">Private matches, legal moves, and live board updates. Your active match is saved so you can return later.</p><p className="mt-2 max-w-2xl text-xs leading-5 text-white/35">For a second player, open another browser tab and sign in with the other account. Each tab keeps its own session.</p></div>
          <div className="flex flex-wrap gap-2"><span className="rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-xs text-white/50">{friends.length} friends loaded</span><span className={`rounded-lg border px-3 py-2 text-xs ${roomViewOpen && connection === 'Connected' ? 'border-[#8b8bff]/20 text-[#8b8bff]' : 'border-white/10 text-white/45'}`}>{roomViewOpen ? connection : 'Live chess'}</span></div>
        </header>

        {notice && <p role="status" className="mb-4 rounded-xl border border-[#8b8bff]/20 bg-[#8b8bff]/[0.06] px-4 py-3 text-sm text-[#8b8bff]">{notice}</p>}
        {error && <p role="alert" className="mb-4 rounded-xl border border-[#ef8b72]/25 bg-[#ef8b72]/[0.06] px-4 py-3 text-sm text-[#ef8b72]">{error}</p>}

        {room && roomViewOpen ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><button onClick={() => { setRoomViewOpen(false); setSelectedSquare(null) }} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 hover:text-white"><ArrowLeft className="size-4" /> Chess lobby</button><div className="flex flex-wrap gap-2"><button onClick={copyRoomCode} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-xs text-white/60 hover:text-white"><Copy className="size-3.5" /> Room {room.roomCode}</button><span className={`rounded-lg border px-3 py-2 text-xs ${connection === 'Connected' ? 'border-[#8b8bff]/20 text-[#8b8bff]' : 'border-amber-300/20 text-amber-200'}`}>{connection}</span></div></div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="flex min-w-0 flex-col items-center rounded-xl border border-white/[0.09] bg-[#191c21] p-3 sm:p-5 lg:p-6">
                <div className="mb-3 grid w-full max-w-[850px] gap-2 sm:grid-cols-2"><PlayerCard player={room.players.black} color="b" mine={playerColor === 'b'} active={room.turn === 'b' && room.status === 'ACTIVE'} /><PlayerCard player={room.players.white} color="w" mine={playerColor === 'w'} active={room.turn === 'w' && room.status === 'ACTIVE'} /></div>
                {room.status === 'WAITING' ? <div className="mb-4 w-full max-w-[850px] rounded-lg border border-[#8b8bff]/20 bg-[#8b8bff]/[0.06] p-3 text-center text-sm text-[#d0d0ff]">Invitation sent. This board will start when your friend accepts.</div> : room.status === 'COMPLETED' || room.status === 'ABANDONED' ? <div className="mb-4 w-full max-w-[850px] rounded-lg border border-white/10 bg-white/[0.03] p-3 text-center text-sm text-white/75">{gameResult(room)}</div> : <p className="mb-3 text-sm font-medium text-white/65">{room.inCheck ? 'Check! ' : ''}{isMyTurn ? 'Your turn' : 'Opponent’s turn'}{room.status === 'ACTIVE' && room.connectionStatus === 'Offline' ? ' · waiting for connection' : ''}</p>}
                <ChessBoard room={room} playerColor={playerColor} selectedSquare={selectedSquare} onSquareClick={clickSquare} disabled={room.status !== 'ACTIVE' || !isMyTurn || busy || connection !== 'Connected'} />
                {promotionMove && <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-[#1b211d] p-3" role="dialog" aria-label="Choose promotion piece"><span className="mr-2 text-xs text-white/50">Promote pawn to</span>{promotionMove.choices.map((piece) => <button key={piece} onClick={() => sendMove(promotionMove.from, promotionMove.to, piece)} className="grid size-11 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-2xl hover:border-[#8b8bff]/40" aria-label={`Promote to ${PIECE_NAMES[piece]}`}>{PIECES[`${playerColor}${piece}`]}</button>)}</div>}
                {room.status === 'ACTIVE' && <div className="mt-4 flex w-full max-w-[850px] flex-wrap justify-center gap-2">
                  {!room.drawOfferBy && <button disabled={busy || connection !== 'Connected'} onClick={() => matchAction('offer_draw')} className="min-h-11 rounded-lg border border-white/10 px-4 py-2 text-xs text-white/60 hover:text-white disabled:opacity-40">Offer draw</button>}
                  {room.drawOfferBy && room.drawOfferBy !== String(user.id) && <><button disabled={busy || connection !== 'Connected'} onClick={() => matchAction('accept_draw')} className="min-h-11 rounded-lg border border-[#8b8bff]/25 px-4 py-2 text-xs text-[#8b8bff] disabled:opacity-40">Accept draw</button><button disabled={busy || connection !== 'Connected'} onClick={() => matchAction('decline_draw')} className="min-h-11 rounded-lg border border-white/10 px-4 py-2 text-xs text-white/60 disabled:opacity-40">Decline draw</button></>}
                  {room.drawOfferBy === String(user.id) && <span className="py-3 text-xs text-white/40">Draw offer sent — waiting for your friend</span>}
                  <button disabled={busy || connection !== 'Connected'} onClick={() => window.confirm('Resign this match? Your opponent will win.') && matchAction('resign')} className="min-h-11 rounded-lg border border-[#ef8b72]/20 px-4 py-2 text-xs text-[#ef8b72] disabled:opacity-40">Resign</button>
                </div>}
                {(room.status === 'COMPLETED' || room.status === 'ABANDONED') && <button disabled={busy} onClick={playRematch} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#8b8bff] px-5 py-2 text-sm font-bold text-[#172015] disabled:opacity-50"><RefreshCw className="size-4" /> Invite to rematch</button>}
              </div>

              <aside className="space-y-4">
                <div className="rounded-2xl border border-white/[0.08] bg-[#141629] p-4 sm:p-5"><h2 className="flex items-center gap-2 text-sm font-semibold"><Swords className="size-4 text-[#8b8bff]" /> Match details</h2><dl className="mt-4 space-y-3 text-xs"><div className="flex justify-between gap-3"><dt className="text-white/40">Status</dt><dd className="font-semibold text-white/75">{room.status === 'ACTIVE' ? isMyTurn ? 'Your move' : 'Opponent to move' : room.status}</dd></div><div className="flex justify-between gap-3"><dt className="text-white/40">Move count</dt><dd className="tabular-nums text-white/75">{room.ply}</dd></div><div className="flex justify-between gap-3"><dt className="text-white/40">Rules</dt><dd className="text-right text-white/75">Standard chess · no clock</dd></div></dl></div>
                <div className="rounded-2xl border border-white/[0.08] bg-[#141629] p-4 sm:p-5"><h2 className="flex items-center gap-2 text-sm font-semibold"><Clock3 className="size-4 text-[#7dd3fc]" /> Move history</h2><div className="mt-4 max-h-[360px] overflow-y-auto" aria-live="polite">{room.moveHistory.length ? <ol className="divide-y divide-white/[0.05]">{room.moveHistory.map((move) => <li key={move.ply} className="flex items-center gap-3 py-2 text-xs"><span className="w-8 text-white/30">{Math.ceil(move.ply / 2)}{move.color === 'w' ? '.' : '…'}</span><span className={`font-semibold ${move.color === 'w' ? 'text-white/80' : 'text-[#7dd3fc]'}`}>{move.san}</span><span className="ml-auto text-white/25">{move.from} → {move.to}</span></li>)}</ol> : <p className="text-xs text-white/35">No moves have been played.</p>}</div></div>
                <div className="rounded-2xl border border-[#7dd3fc]/10 bg-[#7dd3fc]/[0.035] p-4"><p className="flex items-center gap-2 text-xs font-semibold text-[#7dd3fc]"><Shield className="size-4" /> Server-verified moves</p><p className="mt-2 text-xs leading-5 text-white/40">Every move is checked against the current position and player turn on GameHub’s server. Reconnects reload the saved board.</p></div>
              </aside>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.85fr)]">
            <div className="space-y-5">
              {room && <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#8b8bff]/20 bg-[#8b8bff]/[0.05] p-5"><span className="grid size-12 place-items-center rounded-xl bg-[#8b8bff]/10 text-[#8b8bff]"><Crown className="size-6" /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{room.status === 'WAITING' ? 'Waiting for your friend' : 'You have an active match'}</p><p className="mt-1 text-xs text-white/40">Room {room.roomCode}{room.players.black ? ` · vs ${room.players.black.username}` : ''}</p></div><button onClick={() => { setConnection('Connecting'); setRoomViewOpen(true); getChessRoom(room.roomCode).then(setRoom).catch((loadError) => setError(errorMessage(loadError, 'Could not resume this match.'))) }} className="min-h-11 rounded-lg bg-[#8b8bff] px-4 py-2 text-xs font-bold text-[#172015]">Resume match</button></div>}

              <div className="rounded-2xl border border-white/[0.08] bg-[#141629] p-5 sm:p-6"><div className="flex items-start gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[#8b8bff]/10 text-[#8b8bff]"><Swords className="size-5" /></span><div><h2 className="text-base font-semibold">Invite a friend</h2><p className="mt-1 text-xs leading-5 text-white/40">Create a private room. Only the friend you invite can join it.</p></div></div><div className="mt-5 flex flex-col gap-3 sm:flex-row"><label className="sr-only" htmlFor="chess-friend">Choose friend</label><select id="chess-friend" value={selectedFriend} onChange={(event) => setSelectedFriend(event.target.value)} className="min-h-12 min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0f1120] px-3 text-sm text-white/80 focus:border-[#8b8bff]/40"><option value="">Choose a friend</option>{friends.map((entry) => <option key={entry.friendshipId} value={entry.user.id}>{entry.user.username}</option>)}</select><button disabled={!selectedFriend || busy} onClick={() => startRoom(selectedFriend)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#8b8bff] px-5 text-sm font-bold text-[#172015] disabled:cursor-not-allowed disabled:opacity-40"><Swords className="size-4" /> Invite to chess</button></div>{!friends.length && <p className="mt-3 text-xs text-white/35">Add a friend first from <a className="text-[#8b8bff] underline" href="/friends">Players & friends</a>.</p>}</div>

              <div className="rounded-2xl border border-white/[0.08] bg-[#141629] p-5 sm:p-6"><h2 className="flex items-center gap-2 text-base font-semibold"><ArrowLeft className="size-4 text-[#7dd3fc]" /> Join with a room code</h2><p className="mt-1 text-xs text-white/40">The code works only if the host has invited your account.</p><form onSubmit={joinByCode} className="mt-4 flex flex-col gap-3 sm:flex-row"><label className="sr-only" htmlFor="chess-room-code">Room code</label><input id="chess-room-code" value={roomCodeInput} onChange={(event) => setRoomCodeInput(event.target.value.toUpperCase().replace(/[^A-F0-9]/g, '').slice(0, 10))} placeholder="10-character code" autoComplete="off" className="min-h-12 min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0f1120] px-4 font-mono text-sm tracking-[.2em] text-white/85 outline-none focus:border-[#7dd3fc]/45" /><button disabled={busy || roomCodeInput.length !== 10} className="min-h-12 rounded-lg border border-[#7dd3fc]/25 px-5 text-sm font-semibold text-[#7dd3fc] disabled:opacity-40">Join room</button></form></div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-white/[0.08] bg-[#141629] p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold">Incoming invitations</h2><p className="mt-1 text-xs text-white/40">Accept or decline a friend’s private match.</p></div><button onClick={refreshHub} className="grid size-10 place-items-center rounded-lg border border-white/10 text-white/45 hover:text-white" aria-label="Refresh chess invitations"><RefreshCw className="size-4" /></button></div><div className="mt-4 space-y-3">{invitations.incoming.length ? invitations.incoming.map((invite) => <div key={invite.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"><span className="grid size-10 place-items-center rounded-lg bg-[#7dd3fc]/10 text-[#7dd3fc]"><Trophy className="size-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{invite.user.username}</p><p className="mt-1 text-[11px] text-white/35">Room {invite.roomCode} · expires in 15 min</p></div><button disabled={busy} onClick={() => respondToInvite(invite, true)} className="min-h-10 rounded-lg bg-[#8b8bff] px-3 text-xs font-bold text-[#172015] disabled:opacity-40">Accept</button><button disabled={busy} onClick={() => respondToInvite(invite, false)} className="min-h-10 rounded-lg border border-white/10 px-3 text-xs text-white/55 disabled:opacity-40">Decline</button></div>) : <p className="rounded-xl border border-dashed border-white/10 px-4 py-7 text-center text-xs text-white/35">No incoming chess invitations.</p>}</div></div>

              <div className="rounded-2xl border border-white/[0.08] bg-[#141629] p-5 sm:p-6"><h2 className="text-sm font-semibold">Invitations you sent</h2><div className="mt-3 space-y-2">{invitations.outgoing.length ? invitations.outgoing.map((invite) => <div key={invite.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.025] px-3 py-3"><span className="truncate text-xs text-white/70">{invite.user.username}</span><span className="shrink-0 text-[10px] text-amber-200/70">Waiting · {invite.roomCode}</span></div>) : <p className="text-xs text-white/35">No pending invitations.</p>}</div></div>
            </div>
          </div>
        )}
      </section>
    </DashboardLayout>
  )
}
