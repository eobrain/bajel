const test = require('ava')
const build = require('../src/index.js')
const fs = require('fs')
const { buildFileTree } = require('./_test_helper.js')

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
const catsVar = folder => ({
  FOLDER: `${folder}`,
  '$(FOLDER)/abcab': {
    deps: ['$(FOLDER)/abca', '$(FOLDER)/b'],
    exec
  },
  '$(FOLDER)/ab': {
    deps: ['$(FOLDER)/a', '$(FOLDER)/b'],
    exec
  },
  '$(FOLDER)/abc': {
    deps: ['$(FOLDER)/ab', '$(FOLDER)/c'],
    exec
  },
  '$(FOLDER)/abca': {
    deps: ['$(FOLDER)/abc', '$(FOLDER)/a'],
    exec
  }
})

const expected = folder =>
  `cat ${folder}/a ${folder}/b > ${folder}/ab\n` +
    `cat ${folder}/ab ${folder}/c > ${folder}/abc\n` +
    `cat ${folder}/abc ${folder}/a > ${folder}/abca\n` +
    `cat ${folder}/abca ${folder}/b > ${folder}/abcab\n`

test('abc existing', async t => {
  const { folder, cleanup } = await buildFileTree({
    a: 'aaa',
    b: 'bbb',
    c: 'ccc'
  })
  try {
    const [code, stdout, stderr] = await build(
      cats(folder)
    )

    t.deepEqual(stdout + stderr.toString(),
      expected(folder)
    )
    const abcab = fs.readFileSync(`${folder}/abcab`, 'utf8')
    t.deepEqual(abcab, 'aaabbbcccaaabbb')
    t.deepEqual(0, code)
  } finally {
    cleanup()
  }
})

test('abc existing var', async t => {
  const { folder, cleanup } = await buildFileTree({
    a: 'aaa',
    b: 'bbb',
    c: 'ccc'
  })
  try {
    const [code, stdout, stderr] = await build(
      catsVar(folder)
    )

    t.deepEqual(stdout + stderr.toString(),
      expected(folder)
    )
    const abcab = fs.readFileSync(`${folder}/abcab`, 'utf8')
    t.deepEqual(abcab, 'aaabbbcccaaabbb')
    t.deepEqual(0, code)
  } finally {
    cleanup()
  }
})

test('abc generated', async t => {
  const { folder, cleanup } = await buildFileTree({})
  try {
    const [code, stdout, stderr] = await build(
      {
        ...cats(folder),
        [`${folder}/a`]: { exec: 'echo "Aaa" > $@' },
        [`${folder}/b`]: { exec: 'echo "Bbb" > $@' },
        [`${folder}/c`]: { exec: 'echo "Ccc" > $@' }
      }
    )

    const out = stdout + stderr
    t.regex(out, /^echo "Aaa" > .*\/a$/m)
    t.regex(out, /^echo "Bbb" > .*\/b$/m)
    t.regex(out, /^echo "Ccc" > .*\/c$/m)
    const abcab = fs.readFileSync(`${folder}/abcab`, 'utf8')
    t.deepEqual(abcab, 'Aaa\nBbb\nCcc\nAaa\nBbb\n')
    t.deepEqual(0, code)
  } finally {
    cleanup()
  }
})

test('abc generated var', async t => {
  const { folder, cleanup } = await buildFileTree({})
  try {
    const [code, stdout, stderr] = await build(
      {
        MAKE_AAA: 'echo "Aaa" > $@',
        MAKE_BBB: 'echo "Bbb" > $@',
        MAKE_CCC: 'echo "Ccc" > $@',
        ...cats(folder),
        [`${folder}/a`]: { exec: '$(MAKE_AAA)' },
        [`${folder}/b`]: { exec: '$(MAKE_BBB)' },
        [`${folder}/c`]: { exec: '$(MAKE_CCC)' }
      }
    )

    const out = stdout + stderr
    t.regex(out, /^echo "Aaa" > .*\/a$/m)
    t.regex(out, /^echo "Bbb" > .*\/b$/m)
    t.regex(out, /^echo "Ccc" > .*\/c$/m)
    const abcab = fs.readFileSync(`${folder}/abcab`, 'utf8')
    t.deepEqual(abcab, 'Aaa\nBbb\nCcc\nAaa\nBbb\n')
    t.deepEqual(0, code)
  } finally {
    cleanup()
  }
})
