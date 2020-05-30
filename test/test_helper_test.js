const test = require('ava')
const fs = require('fs')
const { buildFileTree, sleep } = require('./_test_helper.js')

test('basic', async t => {
  const { folder, cleanup } = await buildFileTree({
    a: 'aaa',
    b: 'bbb',
    c: 'ccc'
  })
  try {
    const a = fs.readFileSync(`${folder}/a`, 'utf8')
    const b = fs.readFileSync(`${folder}/b`, 'utf8')
    const c = fs.readFileSync(`${folder}/c`, 'utf8')
    t.deepEqual(a, 'aaa')
    t.deepEqual(b, 'bbb')
    t.deepEqual(c, 'ccc')
  } finally {
    cleanup()
  }
})

test('many', async t => {
  const N = 1000
  const spec = {}
  for (let i = 0; i < N; ++i) {
    const path = `a${i}`
    const content = `a${i * 99}`
    spec[path] = content
  }

  const { folder, cleanup } = await buildFileTree(spec)

  try {
    for (let i = 0; i < N; ++i) {
      const path = `a${i}`
      const expectedContent = `a${i * 99}`
      const content = fs.readFileSync(`${folder}/${path}`, 'utf8')

      t.deepEqual(content, expectedContent)
    }
  } finally {
    cleanup()
  }
})

test('delay', async t => {
  const { folder, cleanup } = await buildFileTree({
    a: 'aaa',
    b: 'bbb',
    c: 'ccc'
  })
  try {
    await sleep(1000)

    const a = fs.readFileSync(`${folder}/a`, 'utf8')
    const b = fs.readFileSync(`${folder}/b`, 'utf8')
    const c = fs.readFileSync(`${folder}/c`, 'utf8')
    t.deepEqual(a, 'aaa')
    t.deepEqual(b, 'bbb')
    t.deepEqual(c, 'ccc')
  } finally {
    cleanup()
  }
})
