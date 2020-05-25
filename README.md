# Bajel : a Simple Build System

![logo][1]

Bajel is an easy way of executing commands for building any kind of target
files.

It will only build a target file if is out of date relative to its dependencies.

You specify the build targets, their dependencies, and the build commands in a
build file which has a very simple conceptual structure:

* A set of targets, each of which has
  * a set of dependencies (`deps`)
  * a command to execute (`exec`)
* Declarations of variables that you can use in the `exec`

You can write the build file in your favorite format:

* TOML if you like things clean and readable
* YAML if that's your thing
* JSON if you want just the basics
* JavaScript if you want more control
* Markdown if you like literate programming

See the article [Bajel, A Simple, Flexible Build and Scripting Tool for NPM][8] the motivation for creating Bajel.

## Installation

```sh
npm install --save-dev bajel
```

## Usage

The command

```sh
npx bajel
```

will build the default target in build file in the current directory.

The default target is the first target in the file that is not a file pattern
(with a `%` wildcard).

```sh
npx bajel foo
```

Will build target `foo`.

```sh
npx bajel -n
```

Will do a dry run, printing out the commands that it would execute, but not
actually executing them.

The build file must be one of the following names:

* `build.toml`
* `build.yaml`
* `build.json`
* `build.cjs` (JavaScript, as a classic Node-JS module)
* `build.mjs` (JavaScript, as a new-style ES6 module -- Node version 13.2.0 or later)
* `build.md`

All these different languages are alternate syntaxes of specifying the same
underlying build file structure, as shown by the following examples (based on a [makefile example][2]), each of which specify the same thing.

## Examples

### build.toml

```toml
CC = "gcc"
CFLAGS = "-I."
OBJ = ["hellomake.o", "hellofunc.o"]

["%.o"]
deps = ["%.c", "hellomake.h"]
exec = "$(CC) -c -o $@ $< $(CFLAGS)"

[hellomake]
deps = ["hellomake.o", "hellofunc.o"]
exec = "$(CC) -o $@ $+ $(CFLAGS)"

[clean]
exec = "rm -f hellomake $(OBJ)"
```

### build.yaml

```yaml
CC: gcc
CFLAGS: -I.
OBJ:
- hellomake.o
- hellofunc.o

"%.o":
  deps:
    - "%.c"
    - hellomake.h
  exec: $(CC) -c -o $@ $< $(CFLAGS)

hellomake:
  deps:
    - hellomake.o
    - hellofunc.o
  exec: $(CC) -o $@ $+ $(CFLAGS)

clean:
  exec: rm -f hellomake $(OBJ)
```

### build.json

```json
{
  "CC": "gcc",
  "CFLAGS": "-I.",
  "OBJ": [
    "hellomake.o",
    "hellofunc.o"
  ],
  "%.o": {
    "deps": [
      "%.c",
      "hellomake.h"
    ],
    "exec": "$(CC) -c -o $@ $< $(CFLAGS)"
  },
  "hellomake": {
    "deps": [
      "hellomake.o",
      "hellofunc.o"
    ],
    "exec": "$(CC) -o $@ $+ $(CFLAGS)"
  },
  "clean": {
    "exec": "rm -f hellomake $(OBJ)"
  }
}
```

### build.cjs

(This JavaScript module format supported with all versions of Node.)

```js
const CC = 'gcc'
const CFLAGS = '-I.'
const DEPS = ['hellomake.h']
const OBJ = ['hellomake.o', 'hellofunc.o']

module.exports = {

  '%.o': {
    deps: ['%.c', ...DEPS],
    exec: `${CC} -c -o $@ $< ${CFLAGS}`
  },

  hellomake: {
    deps: OBJ,
    exec: `${CC} -o $@ $+ ${CFLAGS}`
  },

  clean: {
    exec: `rm -f hellomake ${OBJ.join(' ')}`
  }

}
```

### build.mjs

(This JavaScript module format is only supported if your version of Node is 13.2.0 or later.)

```js
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
    exec: `rm -f hellomake ${OBJ.join(' ')}`
  }

}
```

### build.md

<pre>
# Markdown version of build file

## %.o

Deps: `%.c` `hellomake.h`

```sh
gcc -c -o $@ $< -I.
```

## hellomake

Deps: `hellomake.o` `hellofunc.o`

```sh
gcc -o $@ $+ -I.
```

## clean

```sh
rm -f hellomake hellomake.o hellofunc.o
```
</pre>

### Real world examples

* Diagmap's [build.toml][5] is a fairly straightforward build file in TOML
  format. The only slightly tricky aspect is that it take advantage of the `%`
  wild card to create empty `.ok` files to indicate that the corresponding `.js`
  file has successfully passed the StandardJS linter.
* Maxichrome's [build.toml][6] is another straightforward TOML build file.
* The [build.cjs][4] for a blog uses JavaScript variables, but it is otherwise
  fairly simple.
* Mergi's [build.mjs][7] is a fairly complex build file which uses the power of
  JavaScript to remove duplication by refactoring out common elements. For
  example it extensively uses the `...` spread operator to insert sub arrays
  into the `deps` arrays and to insert new dynamically generated targets into
  the main dictionary.

### Advanced feature: JavaScript functions as actions

As an alternative to using the `exec` property to specify a shell command to execute, you can use the `call` property to specify a JavaScript function to be executed.

The function takes a `deps` parameter containing the values returned by the dependency functions.

The example below shows how this can be used to create something that works like a spreadsheet.

```js
export default {

  result: {
    deps: ['B4'],
    exec: 'cat $0'
  },

  A1: {
    call: deps => 10
  },
  A2: {
    call: deps => 12
  },
  A3: {
    call: deps => 14
  },
  A4: {
    deps: ['A1', 'A2', 'A3'],
    call: ({ A1, A2, A3 }) => A1 + A2 + A3
  },

  'B%': {
    deps: ['A%'],
    call: deps => deps[0] * 100
  }
}
```

## Build File Structure

A build file is an object with the following structure:

* *variable*: *variableValue*
* *variable*: *variableValue*
* ...
* *target*:
  * deps: *dependencies*
  * exec: *shellCommand*
  * call: *JavaScript function*
* *target*:
  * deps: *dependencies*
  * exec: *shellCommand*
  * call: *JavaScript function*

The "call" property can only appear in the JavaScript syntax.

There can be any number of *variables* and *targets*.

A *variableValue* is either a string or an arrays

A *target* can be

1. a file, that may or may not already exist
2. or a file pattern with a `%` representing a wildcard.
3. otherwise just a label

The *dependencies* is an array of strings, each of which can be either:

1. Another target in the build file
2. An existing file or file pattern

The *shellCommand* is a string that gets executed by the
Linux-style shell, but only if the target does not exist as a file, or if the
target is older than all the `deps`.

The *shellCommand* may have some special patterns:

* `%` expands to whatever matched the `%` in the target
* `$@` is replaced by the target (after `%` expansion)
* `$<` is replaced by the first `deps` field (after `%` expansion)
* `$+` is replaced by the all the `deps` fields (after `%` expansion) separated
  by spaces
* `$(`*variable*`)` is replaced by the corresponding *variableValue*. (And the *variableValue* may contain `$(`*variable*`)` patterns for other variables.)
* `$i` (where `i` is an integer) is replaced by the path to a tmp file containing the return value of the `call` function the `i`th dep (zero-based).

(If you are familiar with makefiles you will note that the semantics are the
same, though much simplified.)

## Notes

The idea of using markdown came from [maid][3].

## Legal

Copyright (c) 2020 Eamonn O'Brien-Strain All rights reserved. This
program and the accompanying materials are made available under the
terms of the Eclipse Public License v1.0 which accompanies this
distribution, and is available at
http://www.eclipse.org/legal/epl-v10.html

> This is a purely personal project, not a project of my employer.

[1]: bajel.jpg
[2]: http://www.cs.colby.edu/maxwell/courses/tutorials/maketutor/
[3]: https://github.com/egoist/maid
[4]: https://github.com/eobrain/webhome/blob/master/build.cjs
[5]: https://github.com/eobrain/diagmap/blob/master/build.toml
[6]: https://github.com/eobrain/maxichrome/blob/master/build.toml
[7]: https://github.com/eobrain/mergi/blob/master/build.mjs
[8]: https://eamonn.org/programming/2020/05/22/bajel.html
