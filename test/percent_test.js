const test = require('ava')
const Percent = require('../percent.js')

test('simple', t => {
  const p = Percent('abc%def')

  t.falsy(p.match('def'))
  t.falsy(p.match(''))
  t.deepEqual(p.match('abcPQRdef'), 'PQR')
})

test('noprefix', t => {
  const p = Percent('%def')

  t.falsy(p.match('def'))
  t.falsy(p.match(''))
  t.deepEqual(p.match('PQRdef'), 'PQR')
})

test('no suffix', t => {
  const p = Percent('abc%')

  t.falsy(p.match('def'))
  t.falsy(p.match(''))
  t.deepEqual(p.match('abcPQR'), 'PQR')
})

test('anything', t => {
  const p = Percent('%')

  t.falsy(p.match(''))
  t.deepEqual(p.match('abcPQRdef'), 'abcPQRdef')
})


test('no percent', t => {
  const p = Percent('abc')

  t.falsy(p)
})

test('too many percents', t => {
  t.throws(() => Percent('a%b%c'))
})
