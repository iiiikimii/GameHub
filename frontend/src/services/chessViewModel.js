export function normalizeChessFriends(payload) {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.friends)
      ? payload.friends
      : []

  return rows.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []

    // The social API currently returns flat friend records. Accept the nested
    // shape too so the chess page remains compatible with older responses.
    const friend = entry.user && typeof entry.user === 'object' ? entry.user : entry
    if (friend.id == null || typeof friend.username !== 'string' || !friend.username.trim()) return []

    return [{
      friendshipId: entry.friendshipId ?? entry.id ?? friend.id,
      user: { id: friend.id, username: friend.username },
    }]
  })
}
