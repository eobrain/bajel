const test = require('ava')
const build = require('../index.js')
const fs = require('fs')
const { StreamToString, buildFileTree } = require('./_test_helper.js')

const exec = 'cat $+ > $@' // all execs concatenate their deps
const cats = folder => ({
  [`${folder}/abcab`]: {
    deps: [`${folder}/abca`, `${folder}/b`],
    exec
  },
  [`${folder}/ab`]: {
    deps: [`${folder}/a`, `${folder}/b`],
    exec
  },
  [`${folder}/abc`]: {
    deps: [`${folder}/ab`, `${folder}/c`],
    exec
  },
  [`${folder}/abca`]: {
    deps: [`${folder}/abc`, `${folder}/a`],
    exec
  }
})

const expected = folder =>
  `cat ${folder}/a ${folder}/b > ${folder}/ab\n` +
    `cat ${folder}/ab ${folder}/c > ${folder}/abc\n` +
    `cat ${folder}/abc ${folder}/a > ${folder}/abca\n` +
    `cat ${folder}/abca ${folder}/b > ${folder}/abcab\n`

test('abc existing', async t => {
  const fakeStdout = StreamToString()
  const fakeStderr = StreamToString()

  const folder = await buildFileTree({
    a: 'aaa',
    b: 'bbb',
    c: 'ccc'
  })
  try {
    const code = await build(
      cats(folder),
      fakeStdout.stream, fakeStderr.stream
    )

    t.deepEqual(fakeStdout.toString() + fakeStderr.toString(),
      expected(folder)
    )
    const abcab = await fs.readFileSync(`${folder}/abcab`, 'utf8')
    t.deepEqual(abcab, 'aaabbbcccaaabbb')
    t.deepEqual(0, code)
  } finally {
    console.log('folder=', folder)
    fs.rmdirSync(folder, { recursive: true })
  }
})

test('abc generated', async t => {
  const fakeStdout = StreamToString()
  const fakeStderr = StreamToString()

  const folder = await buildFileTree({})
  try {
    const code = await build(
      {
        ...cats(folder),
        [`${folder}/a`]: { exec: 'echo "Aaa" > $@' },
        [`${folder}/b`]: { exec: 'echo "Bbb" > $@' },
        [`${folder}/c`]: { exec: 'echo "Ccc" > $@' }
      },
      fakeStdout.stream, fakeStderr.stream
    )

    const out = fakeStdout.toString() + fakeStderr.toString()
    t.regex(out, /^echo "Aaa" > .*\/a$/m)
    t.regex(out, /^echo "Bbb" > .*\/b$/m)
    t.regex(out, /^echo "Ccc" > .*\/c$/m)
    const abcab = await fs.readFileSync(`${folder}/abcab`, 'utf8')
    t.deepEqual(abcab, 'Aaa\nBbb\nCcc\nAaa\nBbb\n')
    t.deepEqual(0, code)
  } finally {
    fs.rmdirSync(folder, { recursive: true })
  }
})
