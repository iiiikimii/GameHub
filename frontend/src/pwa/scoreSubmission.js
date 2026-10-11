export function assertOnlineForScoreSubmission() {
  if (!navigator.onLine) {
    throw new Error('Anda sedang offline. Skor belum tersimpan; sambungkan internet untuk mengirimnya.')
  }
}
