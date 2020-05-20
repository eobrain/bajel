class Graph {
  constructor () {
    /** @private @type Object<string,!Set<string>> */
    this._outgoings = {}
  }

  /**
   * @param {string} from
   * @param {string} to
   */
  arc (from, to) {
    this._outgoings[from] = this._outgoings[from] || new Set()
    this._outgoings[from].add(to)
  }

  remove (node) {
    delete this._outgoings[node]
  }

  /**
   * @param {string} start
   * @return {boolean}
   */
  findLoop (start) {
    const recurse = (path, node) => {
      if (!this._outgoings[node]) {
        return ''
      }
      for (const outgoing of this._outgoings[node]) {
        if (outgoing === start) {
          return path + ' → ' + start
        }
        const recursePath = recurse(path + ' → ' + outgoing, outgoing)
        if (recursePath) {
          return recursePath
        }
      }
      return ''
    }
    return recurse(start, start)
  }
}

module.exports = Graph
