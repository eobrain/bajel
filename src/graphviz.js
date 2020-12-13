// const { pp } = require('passprint')
module.exports = bajelfile => {
  const edges = () => {
    const result = []
    for (const taskName of Object.keys(bajelfile)) {
      const task = bajelfile[taskName]
      if (!task.deps) {
        continue
      }
      for (const dep of task.deps) {
        result.push(`"${dep}" -> "${taskName}"`)
      }
    }
    return result
  }

  return `digraph G {
    ${edges().join('\n    ')}
    rankdir=LR
}`
}
