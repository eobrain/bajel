const test = require('ava')
const Tasks = require('../src/tasks.js')

test('create', t => {
  const tasks = new Tasks({
    ignore: 'ignore this',
    alsoIgnore: ['not', 'a', 'task'],
    target1: {
      deps: ['depA', 'depB'],
      exec: 'exec1'
    },
    target2: {
      deps: ['depC', 'depD'],
      exec: 'exec2'
    }
  })

  t.deepEqual(tasks.targets(), ['target1', 'target2'])
})

test('targets', t => {
  const tasks = new Tasks({
    aaa: { exec: 'AAA' },
    bbb: { exec: 'BBB' }
  })

  t.deepEqual(tasks.targets(), ['aaa', 'bbb'])
})

test('removeAll', t => {
  const tasks = new Tasks({
    aaa: { exec: 'AAA' },
    bbb: { exec: 'BBB' },
    ccc: { exec: 'CCC' }
  })

  tasks.removeAll(['bbb', 'ccc', 'ddd'])

  t.deepEqual(tasks.targets(), ['aaa'])
})

test('addAll', t => {
  const tasks = new Tasks({
    aaa: { exec: 'AAA' },
    bbb: { exec: 'BBB' },
    ccc: { exec: 'CCC' }
  }, console)

  tasks.addAll({
    ccc: { exec: 'gamma' },
    ddd: { exec: 'delta' },
    eee: { exec: 'epsilon' }
  })

  t.deepEqual(tasks.targets(), ['aaa', 'bbb', 'ccc', 'ddd', 'eee'])
})
