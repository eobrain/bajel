const test = require('ava')
const build = require('../src/index.js')
const fs = require('fs')
const { buildFileTree } = require('./_test_helper.js')

// all calls concatenate their deps
const call = deps => Object.keys(deps).map(p => deps[p]).join()

const cats = folder => ({
  [`${folder}/abcab`]: {
    deps: [`${folder}/abca`, `${folder}/b`],
    call
  },
  [`${folder}/ab`]: {
    deps: [`${folder}/a`, `${folder}/b`],
    call
  },
  [`${folder}/abc`]: {
    deps: [`${folder}/ab`, `${folder}/c`],
    call
  },
  [`${folder}/abca`]: {
    deps: [`${folder}/abc`, `${folder}/a`],
    call
  }
})

const expected = folder =>
  `calling function: --> ${folder}/ab\n` +
    `calling function: --> ${folder}/abc\n` +
    `calling function: --> ${folder}/abca\n` +
    `calling function: --> ${folder}/abcab\n`

test('abc existing', async t => {
  const folder = await buildFileTree({
    a: 'aaa',
    b: 'bbb',
    c: 'ccc'
  })
  try {
    const [code, stdout, stderr, result] = await build(
      cats(folder)
    )

    t.deepEqual(stdout + stderr.toString(),
      expected(folder)
    )
    t.deepEqual(result, 'aaa,bbb,ccc,aaa,bbb')
    t.deepEqual(0, code)
  } finally {
    fs.rmdirSync(folder, { recursive: true })
  }
})

test('abc generated', async t => {
  const folder = await buildFileTree({})
  try {
    const [code, stdout, stderr, result] = await build(
      {
        ...cats(folder),
        [`${folder}/a`]: { call: deps => 'Aaa' },
        [`${folder}/b`]: { call: deps => 'Bbb' },
        [`${folder}/c`]: { call: deps => 'Ccc' }
      }
    )

    const out = stdout + stderr
    t.regex(out, /^calling function: --> .*\/a$/m)
    t.regex(out, /^calling function: --> .*\/b$/m)
    t.regex(out, /^calling function: --> .*\/c$/m)
    t.deepEqual(result, 'Aaa,Bbb,Ccc,Aaa,Bbb')
    t.deepEqual(0, code)
  } finally {
    fs.rmdirSync(folder, { recursive: true })
  }
})
