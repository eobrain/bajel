const test = require('ava')
const { timestamp /*, walkDir */ } = require('../fs_util.js')

test('timestamp not exist', async t => {
  t.deepEqual(await timestamp('does_not_exist'), 0)
})
