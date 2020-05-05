import fs from 'fs'

const CC = 'gcc'
const CFLAGS = '-I.'
const DEPS = ['hellomake.h']
const OBJ = ['hellomake.o', 'hellofunc.o']

export default {

  '%.o': {
    deps: ['%.c', ...DEPS],
    exec: `${CC} -c -o $@ $< ${CFLAGS}`
  },

  hellomake: {
    deps: OBJ,
    exec: `${CC} -o $@ $+ ${CFLAGS}`
  },

  clean: {
    call: ['hellomake', ...OBJ].forEach(path => {
      if (fs.existsSync(path)) {
        fs.unlinkSync(path)
      }
    })
  }
}
