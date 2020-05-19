const test = require('ava')
const Percent = require('../src/percent.js')

test('simple', t => {
  const p = new Percent('abc%def')

  t.falsy(p.match('def'))
  t.falsy(p.match(''))
  t.deepEqual(p.match('abcPQRdef'), 'PQR')
})

test('noprefix', t => {
  const p = new Percent('%def')

  t.falsy(p.match('def'))
  t.falsy(p.match(''))
  t.deepEqual(p.match('PQRdef'), 'PQR')
})

test('no suffix', t => {
  const p = new Percent('abc%')

  t.falsy(p.match('def'))
  t.falsy(p.match(''))
  t.deepEqual(p.match('abcPQR'), 'PQR')
})

test('anything', t => {
  const p = new Percent('%')

  t.falsy(p.match(''))
  t.deepEqual(p.match('abcPQRdef'), 'abcPQRdef')
})

test('no percent', t => {
  const p = new Percent('abc')

  t.falsy(p.hasMatch())
})

test('too many percents', t => {
  t.throws(() => Percent('a%b%c'))
})

test('toString', t => {
  const p = new Percent('abc%def')

  t.deepEqual(p.toString(), 'Pattern{["abc","def"]}')
})
