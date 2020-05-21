const test = require('ava')
const Graph = require('../src/graph.js')

test('false', t => {
  const g = new Graph()

  g.arc('aaa', 'bbb')
  g.arc('aaa', 'ccc')
  g.arc('ccc', 'ddd')

  t.falsy(g.findLoop('aaa'))
  t.deepEqual(g.findLoop('aaa'), '')
})

test('true', t => {
  const g = new Graph()

  g.arc('aaa', 'bbb')
  g.arc('aaa', 'ccc')
  g.arc('ccc', 'ddd')
  g.arc('ddd', 'aaa')

  t.truthy(g.findLoop('aaa'))
  t.deepEqual(g.findLoop('aaa'), 'aaa → ccc → ddd → aaa')
})
