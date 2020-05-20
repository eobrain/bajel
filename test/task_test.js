const test = require('ava')
const Task = require('../src/task.js')

test('toString', t => {
  const task = new Task('aTarget', {
    deps: ['aDep', 'anotherDep'],
    exec: 'anExec',
    call: () => 'aCall'
  })

  t.deepEqual(task.toString(),
    'aTarget:{deps:["aDep","anotherDep"],exec:"anExec",call:() => \'aCall\'}')
})

test('call', t => {
  const task = new Task('aTarget', {
    deps: [],
    call: () => 'aResult'
  })
  const { callHappened, result } = task.doCall(false, console, [])
  t.deepEqual(result, 'aResult')
  t.truthy(callHappened)
})

/* test('expanded -- noop', t => {
  const task = new Task('aTarget', {
    deps: ['aDep', 'anotherDep'],
    exec: 'anExec',
    call: () => 'aCall'
  })

  const expandedTask = task.expanded('aFile', 'theMatch')

  t.deepEqual(expandedTask.toString(),
    'aTarget:{deps:["aFile","aDep","anotherDep"],exec:"anExec",call:$ => this._call({ ...$, match })}')
}) */
