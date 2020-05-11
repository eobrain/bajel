
module.exports = t => {
  const t0 = Date.now()

  if (t === 0) {
    return 'does not exist'
  }
  const ms = t0 - t
  if (ms < 1000) {
    return `modified ${ms.toPrecision(3)}ms ago`
  }
  const s = ms / 1000
  if (s < 60) {
    return `modified ${s.toPrecision(3)}s ago`
  }
  const min = s / 60
  if (min < 60) {
    return `modified ${min.toPrecision(3)} min ago`
  }
  const hour = min / 60
  if (hour < 24) {
    return `modified ${hour.toPrecision(3)} hours ago`
  }
  const day = hour / 24
  return `modified ${day.toPrecision(3)} days ago`
}
