const { rm } = require('nodejs-sh')
const fs = require('fs')
const test = require('ava')

// const proxyquire = require('proxyquire')
const build = require('../../index.js')

// const fakeChildProcess = {
//  spawn: cmd => { console.log('spawn', cmd) }
// }

// const build = proxyquire('./index', { child_process: fakeChildProcess })

// http://www.cs.colby.edu/maxwell/courses/tutorials/maketutor/

test('Colby1', async t => {
  process.chdir(__dirname)
  await rm('-f', 'hellomake')
  t.false(fs.existsSync('hellomake'))

  const success = await build({
    hellomake: ['hellomake.c', 'hellofunc.c',
      c => 'gcc -o hellomake hellomake.c hellofunc.c -I.']
  })

  t.true(success)
  t.true(fs.existsSync('hellomake'))
})
