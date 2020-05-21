export default {
  result: {
    deps: ['C1'],
    call: ({ C1 }) => console.log('C1=', C1)
  },

  A1: {
    call: () => 10
  },
  A2: {
    call: () => 12
  },
  A3: {
    call: () => 14
  },
  'B%': {
    deps: ['A%'],
    call: deps => deps[Object.keys(deps)[0]] * 100
  },
  C1: {
    deps: ['B1', 'B2', 'B3'],
    call: ({ B1, B2, B3 }) => B1 + B2 + B3
  }

}

