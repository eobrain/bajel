
const matchPatt = ([prefix, suffix]) => (s) => {
  if (s.length <= prefix.length + suffix.length) {
    return undefined
  }
  if (s.startsWith(prefix) && s.endsWith(suffix)) {
    return s.substring(prefix.length, s.length - suffix.length)
  }
  return undefined
}

module.exports = pattern => {
  const fixes = pattern.split('%')
  switch (fixes.length) {
    case 1:
      return undefined
    case 2:
      return { match: matchPatt(fixes) }
    default:
      throw new Error(`Too many percents in "${pattern}`)
  }
}
