
const exec = `
  cd $@
  ../../../src/cli.js clean
  ../../../src/cli.js
  ../../../src/cli.js
  ../../../src/cli.js clean
`

module.exports = {

  all: { deps: ['toml', 'json', 'yaml', 'cjs', 'mjs', 'md'] },

  toml: { exec },
  json: { exec },
  yaml: { exec },
  cjs: { exec },
  mjs: { exec },
  md: { exec }

}
