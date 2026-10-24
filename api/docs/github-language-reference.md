# GitHub language reference

This is the language-name reference for the GitHub language bar endpoint:

```text
GET https://api.paryx.uk/github/languages/bar?target=TARGET
```

Use the lowercase endpoint value from the second column or a short name from the fourth column with the `include` or `exclude` query parameter. Use the URL-encoded value from the third column when inserting a language directly into a REST URL. Language matching is case-insensitive, so `rust`, `Rust`, and `RuSt` all select GitHub's `Rust` language.

## Filtering examples

Show only Rust:

```text
/github/languages/bar?target=Paryx-games&include=rust
```

Show Rust and TypeScript:

```text
/github/languages/bar?target=Paryx-games&include=rust%2Ctypescript
```

Exclude Python:

```text
/github/languages/bar?target=Paryx-games&exclude=python
```

Display the five largest language groups:

```text
/github/languages/bar?target=Paryx-games&limit=5
```

`include` and `exclude` cannot be used together. Languages that are not displayed are combined into the gray `Other` segment. `limit` accepts an integer from `1` to `100`.

Useful short names include `js`, `ts`, `py`, `cpp`, `csharp`, `kt`, `objc`, `gql`, `ipynb`, `docker`, and `vuejs`. Short names are only provided where they are reasonably unambiguous; distinct GitHub languages such as Bash, JSX, and TSX are not silently merged into another language.

## URL encoding

The values in this table are language names, not always URL-safe strings. Encode a value when constructing a REST URL:

```text
1c enterprise       -> 1c%20enterprise
visual basic .net   -> visual%20basic%20.net
```

For multiple languages, separate the values with commas and URL-encode the comma when building the complete URL:

```text
include=1c%20enterprise%2Crust
```

Most HTTP clients encode query parameters automatically. For example:

```js
const params = new URLSearchParams({
  target: "Paryx-games",
  include: "1c enterprise,rust",
});
const url = `https://api.paryx.uk/github/languages/bar?${params}`;
```

This produces a valid request with the encoded query value:

```text
https://api.paryx.uk/github/languages/bar?target=Paryx-games&include=1c+enterprise%2Crust
```

| GitHub language name | Endpoint value | URL-encoded value | Short names |
| --- | --- | --- | --- |
| 1C Enterprise | `1c enterprise` | `1c%20enterprise` | - |
| 2-Dimensional Array | `2-dimensional array` | `2-dimensional%20array` | - |
| 4D | `4d` | `4d` | - |
| ABAP | `abap` | `abap` | - |
| ABAP CDS | `abap cds` | `abap%20cds` | - |
| ActionScript | `actionscript` | `actionscript` | - |
| Ada | `ada` | `ada` | - |
| Adblock Filter List | `adblock filter list` | `adblock%20filter%20list` | - |
| Adobe Font Metrics | `adobe font metrics` | `adobe%20font%20metrics` | - |
| Agda | `agda` | `agda` | - |
| AGS Script | `ags script` | `ags%20script` | - |
| AIDL | `aidl` | `aidl` | - |
| Aiken | `aiken` | `aiken` | - |
| AL | `al` | `al` | - |
| Aleo | `aleo` | `aleo` | - |
| ALGOL | `algol` | `algol` | - |
| Alloy | `alloy` | `alloy` | - |
| Alpine Abuild | `alpine abuild` | `alpine%20abuild` | - |
| Altium Designer | `altium designer` | `altium%20designer` | - |
| AMPL | `ampl` | `ampl` | - |
| AngelScript | `angelscript` | `angelscript` | - |
| Answer Set Programming | `answer set programming` | `answer%20set%20programming` | - |
| Ant Build System | `ant build system` | `ant%20build%20system` | - |
| Antlers | `antlers` | `antlers` | - |
| ANTLR | `antlr` | `antlr` | - |
| ApacheConf | `apacheconf` | `apacheconf` | - |
| Apex | `apex` | `apex` | - |
| API Blueprint | `api blueprint` | `api%20blueprint` | - |
| APL | `apl` | `apl` | - |
| Apollo Guidance Computer | `apollo guidance computer` | `apollo%20guidance%20computer` | - |
| AppleScript | `applescript` | `applescript` | - |
| Arc | `arc` | `arc` | - |
| ArkTS | `arkts` | `arkts` | - |
| AsciiDoc | `asciidoc` | `asciidoc` | - |
| ASP.NET | `asp.net` | `asp.net` | - |
| AspectJ | `aspectj` | `aspectj` | - |
| Assembly | `assembly` | `assembly` | asm |
| Astro | `astro` | `astro` | - |
| Asymptote | `asymptote` | `asymptote` | - |
| ATS | `ats` | `ats` | - |
| Augeas | `augeas` | `augeas` | - |
| AutoHotkey | `autohotkey` | `autohotkey` | - |
| AutoIt | `autoit` | `autoit` | - |
| Avro IDL | `avro idl` | `avro%20idl` | - |
| Awk | `awk` | `awk` | - |
| B | `b` | `b` | - |
| B (Formal Method) | `b (formal method)` | `b%20(formal%20method)` | - |
| B4X | `b4x` | `b4x` | - |
| Ballerina | `ballerina` | `ballerina` | - |
| BAML | `baml` | `baml` | - |
| BASIC | `basic` | `basic` | - |
| Batchfile | `batchfile` | `batchfile` | - |
| BBCode | `bbcode` | `bbcode` | - |
| Beef | `beef` | `beef` | - |
| Berry | `berry` | `berry` | - |
| BibTeX | `bibtex` | `bibtex` | - |
| Bicep | `bicep` | `bicep` | - |
| Bikeshed | `bikeshed` | `bikeshed` | - |
| BIRD2 | `bird2` | `bird2` | - |
| Bison | `bison` | `bison` | - |
| BitBake | `bitbake` | `bitbake` | - |
| Blade | `blade` | `blade` | - |
| BlitzBasic | `blitzbasic` | `blitzbasic` | - |
| BlitzMax | `blitzmax` | `blitzmax` | - |
| Blueprint | `blueprint` | `blueprint` | - |
| Bluespec | `bluespec` | `bluespec` | - |
| Bluespec BH | `bluespec bh` | `bluespec%20bh` | - |
| Boo | `boo` | `boo` | - |
| Boogie | `boogie` | `boogie` | - |
| BQN | `bqn` | `bqn` | - |
| Brainfuck | `brainfuck` | `brainfuck` | - |
| BrighterScript | `brighterscript` | `brighterscript` | - |
| Brightscript | `brightscript` | `brightscript` | - |
| Browserslist | `browserslist` | `browserslist` | - |
| Bru | `bru` | `bru` | - |
| BuildStream | `buildstream` | `buildstream` | - |
| C | `c` | `c` | - |
| C# | `c#` | `c#` | cs, csharp |
| C++ | `c++` | `c++` | cpp, cxx |
| C3 | `c3` | `c3` | - |
| Cabal Config | `cabal config` | `cabal%20config` | - |
| Caddyfile | `caddyfile` | `caddyfile` | - |
| Cadence | `cadence` | `cadence` | - |
| Cairo | `cairo` | `cairo` | - |
| Cairo Zero | `cairo zero` | `cairo%20zero` | - |
| CameLIGO | `cameligo` | `cameligo` | - |
| Cangjie | `cangjie` | `cangjie` | - |
| CAP CDS | `cap cds` | `cap%20cds` | - |
| Cap'n Proto | `cap'n proto` | `cap'n%20proto` | - |
| Carbon | `carbon` | `carbon` | - |
| Ceylon | `ceylon` | `ceylon` | - |
| Chapel | `chapel` | `chapel` | - |
| ChucK | `chuck` | `chuck` | - |
| Circom | `circom` | `circom` | - |
| Cirru | `cirru` | `cirru` | - |
| Clarion | `clarion` | `clarion` | - |
| Clarity | `clarity` | `clarity` | - |
| Classic ASP | `classic asp` | `classic%20asp` | - |
| Clean | `clean` | `clean` | - |
| Click | `click` | `click` | - |
| CLIPS | `clips` | `clips` | - |
| Clojure | `clojure` | `clojure` | clj |
| Closure Templates | `closure templates` | `closure%20templates` | - |
| Cloud Firestore Security Rules | `cloud firestore security rules` | `cloud%20firestore%20security%20rules` | - |
| Clue | `clue` | `clue` | - |
| CMake | `cmake` | `cmake` | - |
| CodeQL | `codeql` | `codeql` | - |
| CoffeeScript | `coffeescript` | `coffeescript` | - |
| ColdFusion | `coldfusion` | `coldfusion` | - |
| ColdFusion CFC | `coldfusion cfc` | `coldfusion%20cfc` | - |
| COLLADA | `collada` | `collada` | - |
| Common Lisp | `common lisp` | `common%20lisp` | - |
| Common Workflow Language | `common workflow language` | `common%20workflow%20language` | - |
| Component Pascal | `component pascal` | `component%20pascal` | - |
| Cooklang | `cooklang` | `cooklang` | - |
| CQL | `cql` | `cql` | - |
| crontab | `crontab` | `crontab` | - |
| Crystal | `crystal` | `crystal` | - |
| CSON | `cson` | `cson` | - |
| Csound | `csound` | `csound` | - |
| Csound Document | `csound document` | `csound%20document` | - |
| Csound Score | `csound score` | `csound%20score` | - |
| CSS | `css` | `css` | - |
| CSV | `csv` | `csv` | - |
| Cuda | `cuda` | `cuda` | - |
| CUE | `cue` | `cue` | - |
| Curry | `curry` | `curry` | - |
| CWeb | `cweb` | `cweb` | - |
| Cylc | `cylc` | `cylc` | - |
| Cypher | `cypher` | `cypher` | - |
| Cython | `cython` | `cython` | - |
| D | `d` | `d` | - |
| D2 | `d2` | `d2` | - |
| Dafny | `dafny` | `dafny` | - |
| Darcs Patch | `darcs patch` | `darcs%20patch` | - |
| Dart | `dart` | `dart` | - |
| Daslang | `daslang` | `daslang` | - |
| DataWeave | `dataweave` | `dataweave` | - |
| Debian Package Control File | `debian package control file` | `debian%20package%20control%20file` | - |
| DenizenScript | `denizenscript` | `denizenscript` | - |
| Dhall | `dhall` | `dhall` | - |
| DirectX 3D File | `directx 3d file` | `directx%203d%20file` | - |
| DM | `dm` | `dm` | - |
| Dockerfile | `dockerfile` | `dockerfile` | docker |
| Dogescript | `dogescript` | `dogescript` | - |
| Dotenv | `dotenv` | `dotenv` | - |
| Dune | `dune` | `dune` | - |
| Dylan | `dylan` | `dylan` | - |
| E | `e` | `e` | - |
| Earthly | `earthly` | `earthly` | - |
| Easybuild | `easybuild` | `easybuild` | - |
| eC | `ec` | `ec` | - |
| Ecere Projects | `ecere projects` | `ecere%20projects` | - |
| ECL | `ecl` | `ecl` | - |
| ECLiPSe | `eclipse` | `eclipse` | - |
| Ecmarkup | `ecmarkup` | `ecmarkup` | - |
| Edge | `edge` | `edge` | - |
| EdgeQL | `edgeql` | `edgeql` | - |
| EditorConfig | `editorconfig` | `editorconfig` | - |
| Eiffel | `eiffel` | `eiffel` | - |
| EJS | `ejs` | `ejs` | - |
| Elixir | `elixir` | `elixir` | ex |
| Elm | `elm` | `elm` | - |
| Elvish | `elvish` | `elvish` | - |
| Elvish Transcript | `elvish transcript` | `elvish%20transcript` | - |
| Emacs Lisp | `emacs lisp` | `emacs%20lisp` | - |
| EmberScript | `emberscript` | `emberscript` | - |
| EQ | `eq` | `eq` | - |
| Erlang | `erlang` | `erlang` | erl |
| Euphoria | `euphoria` | `euphoria` | - |
| F* | `f*` | `f*` | - |
| F# | `f#` | `f#` | fsharp, fs |
| Factor | `factor` | `factor` | - |
| Fancy | `fancy` | `fancy` | - |
| Fantom | `fantom` | `fantom` | - |
| Faust | `faust` | `faust` | - |
| Fennel | `fennel` | `fennel` | - |
| FIGlet Font | `figlet font` | `figlet%20font` | - |
| Filebench WML | `filebench wml` | `filebench%20wml` | - |
| FIRRTL | `firrtl` | `firrtl` | - |
| fish | `fish` | `fish` | - |
| FlatBuffers | `flatbuffers` | `flatbuffers` | - |
| Flix | `flix` | `flix` | - |
| Fluent | `fluent` | `fluent` | - |
| FLUX | `flux` | `flux` | - |
| Forth | `forth` | `forth` | - |
| Fortran | `fortran` | `fortran` | - |
| Fortran Free Form | `fortran free form` | `fortran%20free%20form` | - |
| FPP | `fpp` | `fpp` | - |
| FreeBASIC | `freebasic` | `freebasic` | - |
| FreeMarker | `freemarker` | `freemarker` | - |
| Frege | `frege` | `frege` | - |
| Futhark | `futhark` | `futhark` | - |
| G-code | `g-code` | `g-code` | - |
| Game Maker Language | `game maker language` | `game%20maker%20language` | - |
| GAML | `gaml` | `gaml` | - |
| GAMS | `gams` | `gams` | - |
| GAP | `gap` | `gap` | - |
| GCC Machine Description | `gcc machine description` | `gcc%20machine%20description` | - |
| GDScript | `gdscript` | `gdscript` | - |
| GDShader | `gdshader` | `gdshader` | - |
| GEDCOM | `gedcom` | `gedcom` | - |
| Gemfile.lock | `gemfile.lock` | `gemfile.lock` | - |
| Gemini | `gemini` | `gemini` | - |
| Genero 4gl | `genero 4gl` | `genero%204gl` | - |
| Genero per | `genero per` | `genero%20per` | - |
| Genie | `genie` | `genie` | - |
| Genshi | `genshi` | `genshi` | - |
| Gentoo Ebuild | `gentoo ebuild` | `gentoo%20ebuild` | - |
| Gentoo Eclass | `gentoo eclass` | `gentoo%20eclass` | - |
| Gerber Image | `gerber image` | `gerber%20image` | - |
| Gherkin | `gherkin` | `gherkin` | - |
| Git Attributes | `git attributes` | `git%20attributes` | - |
| Git Commit | `git commit` | `git%20commit` | - |
| Git Config | `git config` | `git%20config` | - |
| Git Revision List | `git revision list` | `git%20revision%20list` | - |
| Gleam | `gleam` | `gleam` | - |
| Glimmer JS | `glimmer js` | `glimmer%20js` | - |
| Glimmer TS | `glimmer ts` | `glimmer%20ts` | - |
| GLSL | `glsl` | `glsl` | - |
| Glyph | `glyph` | `glyph` | - |
| Gno | `gno` | `gno` | - |
| Gnuplot | `gnuplot` | `gnuplot` | - |
| Go | `go` | `go` | golang |
| Go Checksums | `go checksums` | `go%20checksums` | - |
| Go Module | `go module` | `go%20module` | - |
| Go Template | `go template` | `go%20template` | - |
| Go Workspace | `go workspace` | `go%20workspace` | - |
| Godot Resource | `godot resource` | `godot%20resource` | - |
| Golo | `golo` | `golo` | - |
| Gosu | `gosu` | `gosu` | - |
| Grace | `grace` | `grace` | - |
| Gradle | `gradle` | `gradle` | - |
| Gradle Kotlin DSL | `gradle kotlin dsl` | `gradle%20kotlin%20dsl` | - |
| Grammatical Framework | `grammatical framework` | `grammatical%20framework` | - |
| GraphQL | `graphql` | `graphql` | gql |
| Graphviz (DOT) | `graphviz (dot)` | `graphviz%20(dot)` | - |
| Groovy | `groovy` | `groovy` | - |
| Groovy Server Pages | `groovy server pages` | `groovy%20server%20pages` | - |
| GSC | `gsc` | `gsc` | - |
| GtkRC | `gtkrc` | `gtkrc` | - |
| Hack | `hack` | `hack` | - |
| Haml | `haml` | `haml` | - |
| Handlebars | `handlebars` | `handlebars` | - |
| HAProxy | `haproxy` | `haproxy` | - |
| Harbour | `harbour` | `harbour` | - |
| Hare | `hare` | `hare` | - |
| Haskell | `haskell` | `haskell` | hs |
| Haxe | `haxe` | `haxe` | - |
| HCL | `hcl` | `hcl` | - |
| HIP | `hip` | `hip` | - |
| HiveQL | `hiveql` | `hiveql` | - |
| HLSL | `hlsl` | `hlsl` | - |
| HOCON | `hocon` | `hocon` | - |
| HolyC | `holyc` | `holyc` | - |
| hoon | `hoon` | `hoon` | - |
| Hosts File | `hosts file` | `hosts%20file` | - |
| HTML | `html` | `html` | htm |
| HTML+ECR | `html+ecr` | `html+ecr` | - |
| HTML+EEX | `html+eex` | `html+eex` | - |
| HTML+ERB | `html+erb` | `html+erb` | - |
| HTML+PHP | `html+php` | `html+php` | - |
| HTML+Razor | `html+razor` | `html+razor` | - |
| HTTP | `http` | `http` | - |
| Hurl | `hurl` | `hurl` | - |
| HXML | `hxml` | `hxml` | - |
| Hy | `hy` | `hy` | - |
| iCalendar | `icalendar` | `icalendar` | - |
| IDL | `idl` | `idl` | - |
| Idris | `idris` | `idris` | - |
| Ignore List | `ignore list` | `ignore%20list` | - |
| IGOR Pro | `igor pro` | `igor%20pro` | - |
| IL Assembly | `il assembly` | `il%20assembly` | - |
| ImageJ Macro | `imagej macro` | `imagej%20macro` | - |
| Imba | `imba` | `imba` | - |
| ImHex Pattern Language | `imhex pattern language` | `imhex%20pattern%20language` | - |
| INI | `ini` | `ini` | - |
| Inno Setup | `inno setup` | `inno%20setup` | - |
| Io | `io` | `io` | - |
| Ioke | `ioke` | `ioke` | - |
| Isabelle | `isabelle` | `isabelle` | - |
| Isabelle ROOT | `isabelle root` | `isabelle%20root` | - |
| ISPC | `ispc` | `ispc` | - |
| J | `j` | `j` | - |
| Jac | `jac` | `jac` | - |
| Jai | `jai` | `jai` | - |
| Janet | `janet` | `janet` | - |
| JAR Manifest | `jar manifest` | `jar%20manifest` | - |
| Jasmin | `jasmin` | `jasmin` | - |
| JASS | `jass` | `jass` | - |
| Java | `java` | `java` | - |
| Java Properties | `java properties` | `java%20properties` | - |
| Java Server Pages | `java server pages` | `java%20server%20pages` | - |
| Java Template Engine | `java template engine` | `java%20template%20engine` | - |
| JavaScript | `javascript` | `javascript` | js |
| JavaScript+ERB | `javascript+erb` | `javascript+erb` | - |
| JCL | `jcl` | `jcl` | - |
| Jest Snapshot | `jest snapshot` | `jest%20snapshot` | - |
| JetBrains MPS | `jetbrains mps` | `jetbrains%20mps` | - |
| JFlex | `jflex` | `jflex` | - |
| Jinja | `jinja` | `jinja` | - |
| Jison | `jison` | `jison` | - |
| Jison Lex | `jison lex` | `jison%20lex` | - |
| Jolie | `jolie` | `jolie` | - |
| jq | `jq` | `jq` | - |
| JSON | `json` | `json` | - |
| JSON with Comments | `json with comments` | `json%20with%20comments` | - |
| JSON5 | `json5` | `json5` | - |
| JSONiq | `jsoniq` | `jsoniq` | - |
| JSONLD | `jsonld` | `jsonld` | - |
| Jsonnet | `jsonnet` | `jsonnet` | - |
| Julia | `julia` | `julia` | jl |
| Julia REPL | `julia repl` | `julia%20repl` | - |
| Jupyter Notebook | `jupyter notebook` | `jupyter%20notebook` | ipynb |
| Just | `just` | `just` | - |
| Kaitai Struct | `kaitai struct` | `kaitai%20struct` | - |
| KakouneScript | `kakounescript` | `kakounescript` | - |
| KCL | `kcl` | `kcl` | - |
| KDL | `kdl` | `kdl` | - |
| KerboScript | `kerboscript` | `kerboscript` | - |
| KFramework | `kframework` | `kframework` | - |
| KiCad Layout | `kicad layout` | `kicad%20layout` | - |
| KiCad Legacy Layout | `kicad legacy layout` | `kicad%20legacy%20layout` | - |
| KiCad Schematic | `kicad schematic` | `kicad%20schematic` | - |
| Koka | `koka` | `koka` | - |
| KoLmafia ASH | `kolmafia ash` | `kolmafia%20ash` | - |
| Kotlin | `kotlin` | `kotlin` | kt, kts |
| KRL | `krl` | `krl` | - |
| kvlang | `kvlang` | `kvlang` | - |
| LabVIEW | `labview` | `labview` | - |
| Lambdapi | `lambdapi` | `lambdapi` | - |
| Langium | `langium` | `langium` | - |
| Lark | `lark` | `lark` | - |
| Lasso | `lasso` | `lasso` | - |
| Latte | `latte` | `latte` | - |
| Leo | `leo` | `leo` | - |
| Less | `less` | `less` | - |
| Lex | `lex` | `lex` | - |
| LFE | `lfe` | `lfe` | - |
| LigoLANG | `ligolang` | `ligolang` | - |
| LilyPond | `lilypond` | `lilypond` | - |
| Liquid | `liquid` | `liquid` | - |
| Liquidsoap | `liquidsoap` | `liquidsoap` | - |
| Literate Agda | `literate agda` | `literate%20agda` | - |
| Literate CoffeeScript | `literate coffeescript` | `literate%20coffeescript` | - |
| Literate Haskell | `literate haskell` | `literate%20haskell` | - |
| LiveCode Script | `livecode script` | `livecode%20script` | - |
| LiveScript | `livescript` | `livescript` | - |
| LLVM | `llvm` | `llvm` | - |
| LLVM TableGen | `llvm tablegen` | `llvm%20tablegen` | - |
| Lobster | `lobster` | `lobster` | - |
| Logtalk | `logtalk` | `logtalk` | - |
| LOLCODE | `lolcode` | `lolcode` | - |
| LookML | `lookml` | `lookml` | - |
| LSL | `lsl` | `lsl` | - |
| Lua | `lua` | `lua` | - |
| Luau | `luau` | `luau` | - |
| M3U | `m3u` | `m3u` | - |
| Macaulay2 | `macaulay2` | `macaulay2` | - |
| Makefile | `makefile` | `makefile` | make |
| Mako | `mako` | `mako` | - |
| Markdown | `markdown` | `markdown` | md |
| Marko | `marko` | `marko` | - |
| Mask | `mask` | `mask` | - |
| Mathematical Programming System | `mathematical programming system` | `mathematical%20programming%20system` | - |
| MATLAB | `matlab` | `matlab` | - |
| Max | `max` | `max` | - |
| MAXScript | `maxscript` | `maxscript` | - |
| mcfunction | `mcfunction` | `mcfunction` | - |
| mdsvex | `mdsvex` | `mdsvex` | - |
| MDX | `mdx` | `mdx` | - |
| Mercury | `mercury` | `mercury` | - |
| Mermaid | `mermaid` | `mermaid` | - |
| Meson | `meson` | `meson` | - |
| Metal | `metal` | `metal` | - |
| MeTTa | `metta` | `metta` | - |
| MiniScript | `miniscript` | `miniscript` | - |
| MiniYAML | `miniyaml` | `miniyaml` | - |
| MiniZinc | `minizinc` | `minizinc` | - |
| Mint | `mint` | `mint` | - |
| Mirah | `mirah` | `mirah` | - |
| mIRC Script | `mirc script` | `mirc%20script` | - |
| MLIR | `mlir` | `mlir` | - |
| Modelica | `modelica` | `modelica` | - |
| Modula-2 | `modula-2` | `modula-2` | - |
| Modula-3 | `modula-3` | `modula-3` | - |
| Mojo | `mojo` | `mojo` | - |
| Monkey C | `monkey c` | `monkey%20c` | - |
| MoonBit | `moonbit` | `moonbit` | - |
| MoonScript | `moonscript` | `moonscript` | - |
| Motoko | `motoko` | `motoko` | - |
| Motorola 68K Assembly | `motorola 68k assembly` | `motorola%2068k%20assembly` | - |
| Move | `move` | `move` | - |
| MQL4 | `mql4` | `mql4` | - |
| MQL5 | `mql5` | `mql5` | - |
| MTML | `mtml` | `mtml` | - |
| mupad | `mupad` | `mupad` | - |
| Mustache | `mustache` | `mustache` | - |
| nanorc | `nanorc` | `nanorc` | - |
| Nasal | `nasal` | `nasal` | - |
| NCL | `ncl` | `ncl` | - |
| Nearley | `nearley` | `nearley` | - |
| Nemerle | `nemerle` | `nemerle` | - |
| nesC | `nesc` | `nesc` | - |
| NetLinx | `netlinx` | `netlinx` | - |
| NetLinx+ERB | `netlinx+erb` | `netlinx+erb` | - |
| NetLogo | `netlogo` | `netlogo` | - |
| NewLisp | `newlisp` | `newlisp` | - |
| Nextflow | `nextflow` | `nextflow` | - |
| Nginx | `nginx` | `nginx` | - |
| Nickel | `nickel` | `nickel` | - |
| Nim | `nim` | `nim` | - |
| Nit | `nit` | `nit` | - |
| Nix | `nix` | `nix` | - |
| NMODL | `nmodl` | `nmodl` | - |
| Noir | `noir` | `noir` | - |
| NPM Config | `npm config` | `npm%20config` | - |
| Nu | `nu` | `nu` | - |
| NumPy | `numpy` | `numpy` | - |
| Nunjucks | `nunjucks` | `nunjucks` | - |
| Nushell | `nushell` | `nushell` | - |
| NWScript | `nwscript` | `nwscript` | - |
| OASv2-json | `oasv2-json` | `oasv2-json` | - |
| OASv2-yaml | `oasv2-yaml` | `oasv2-yaml` | - |
| OASv3-json | `oasv3-json` | `oasv3-json` | - |
| OASv3-yaml | `oasv3-yaml` | `oasv3-yaml` | - |
| Objective-C | `objective-c` | `objective-c` | objc |
| Objective-C++ | `objective-c++` | `objective-c++` | objc++ |
| Objective-J | `objective-j` | `objective-j` | - |
| ObjectScript | `objectscript` | `objectscript` | - |
| OCaml | `ocaml` | `ocaml` | - |
| Odin | `odin` | `odin` | - |
| Omgrofl | `omgrofl` | `omgrofl` | - |
| OMNeT++ MSG | `omnet++ msg` | `omnet++%20msg` | - |
| OMNeT++ NED | `omnet++ ned` | `omnet++%20ned` | - |
| ooc | `ooc` | `ooc` | - |
| Opal | `opal` | `opal` | - |
| Open Policy Agent | `open policy agent` | `open%20policy%20agent` | - |
| OpenAPI Specification v2 | `openapi specification v2` | `openapi%20specification%20v2` | - |
| OpenAPI Specification v3 | `openapi specification v3` | `openapi%20specification%20v3` | - |
| OpenCL | `opencl` | `opencl` | - |
| OpenEdge ABL | `openedge abl` | `openedge%20abl` | - |
| OpenQASM | `openqasm` | `openqasm` | - |
| OpenSCAD | `openscad` | `openscad` | - |
| Option List | `option list` | `option%20list` | - |
| Org | `org` | `org` | - |
| OverpassQL | `overpassql` | `overpassql` | - |
| OverPy | `overpy` | `overpy` | - |
| Oxygene | `oxygene` | `oxygene` | - |
| Oz | `oz` | `oz` | - |
| P4 | `p4` | `p4` | - |
| Pact | `pact` | `pact` | - |
| Pan | `pan` | `pan` | - |
| Papyrus | `papyrus` | `papyrus` | - |
| Parrot | `parrot` | `parrot` | - |
| Pascal | `pascal` | `pascal` | - |
| Pawn | `pawn` | `pawn` | - |
| PDDL | `pddl` | `pddl` | - |
| PEG.js | `peg.js` | `peg.js` | - |
| Pep8 | `pep8` | `pep8` | - |
| Perl | `perl` | `perl` | pl |
| PHP | `php` | `php` | - |
| PicoLisp | `picolisp` | `picolisp` | - |
| PigLatin | `piglatin` | `piglatin` | - |
| Pike | `pike` | `pike` | - |
| Pip Requirements | `pip requirements` | `pip%20requirements` | - |
| pkg-config | `pkg-config` | `pkg-config` | - |
| Pkl | `pkl` | `pkl` | - |
| PlantUML | `plantuml` | `plantuml` | - |
| PLpgSQL | `plpgsql` | `plpgsql` | - |
| PLSQL | `plsql` | `plsql` | - |
| PogoScript | `pogoscript` | `pogoscript` | - |
| Polar | `polar` | `polar` | - |
| Portugol | `portugol` | `portugol` | - |
| PostCSS | `postcss` | `postcss` | - |
| PostScript | `postscript` | `postscript` | - |
| POV-Ray SDL | `pov-ray sdl` | `pov-ray%20sdl` | - |
| Power Query | `power query` | `power%20query` | - |
| PowerBuilder | `powerbuilder` | `powerbuilder` | - |
| PowerShell | `powershell` | `powershell` | ps, pwsh |
| Praat | `praat` | `praat` | - |
| Prisma | `prisma` | `prisma` | - |
| Pro*C | `pro*c` | `pro*c` | - |
| Processing | `processing` | `processing` | - |
| Procfile | `procfile` | `procfile` | - |
| Prolog | `prolog` | `prolog` | - |
| Promela | `promela` | `promela` | - |
| Propeller Spin | `propeller spin` | `propeller%20spin` | - |
| Pug | `pug` | `pug` | - |
| Puppet | `puppet` | `puppet` | - |
| PureBasic | `purebasic` | `purebasic` | - |
| PureScript | `purescript` | `purescript` | - |
| Pyret | `pyret` | `pyret` | - |
| Python | `python` | `python` | py, pyth |
| Python console | `python console` | `python%20console` | - |
| Python traceback | `python traceback` | `python%20traceback` | - |
| q | `q` | `q` | - |
| Q# | `q#` | `q#` | - |
| QML | `qml` | `qml` | - |
| Qt Script | `qt script` | `qt%20script` | - |
| Quake | `quake` | `quake` | - |
| QuakeC | `quakec` | `quakec` | - |
| Quartus Simulation IP | `quartus simulation ip` | `quartus%20simulation%20ip` | - |
| QuickBASIC | `quickbasic` | `quickbasic` | - |
| Quint | `quint` | `quint` | - |
| R | `r` | `r` | rlang |
| Racket | `racket` | `racket` | - |
| Ragel | `ragel` | `ragel` | - |
| Raku | `raku` | `raku` | - |
| RAML | `raml` | `raml` | - |
| Rascal | `rascal` | `rascal` | - |
| RAScript | `rascript` | `rascript` | - |
| RBS | `rbs` | `rbs` | - |
| RDoc | `rdoc` | `rdoc` | - |
| Reason | `reason` | `reason` | - |
| ReasonLIGO | `reasonligo` | `reasonligo` | - |
| Rebol | `rebol` | `rebol` | - |
| Record Jar | `record jar` | `record%20jar` | - |
| Red | `red` | `red` | - |
| Redscript | `redscript` | `redscript` | - |
| Regular Expression | `regular expression` | `regular%20expression` | - |
| Ren'Py | `ren'py` | `ren'py` | - |
| ReScript | `rescript` | `rescript` | - |
| reStructuredText | `restructuredtext` | `restructuredtext` | - |
| REXX | `rexx` | `rexx` | - |
| Rez | `rez` | `rez` | - |
| Rhai | `rhai` | `rhai` | - |
| Ring | `ring` | `ring` | - |
| Riot | `riot` | `riot` | - |
| RMarkdown | `rmarkdown` | `rmarkdown` | - |
| RobotFramework | `robotframework` | `robotframework` | - |
| Roc | `roc` | `roc` | - |
| Rocq Prover | `rocq prover` | `rocq%20prover` | - |
| Roff | `roff` | `roff` | - |
| Roff Manpage | `roff manpage` | `roff%20manpage` | - |
| RON | `ron` | `ron` | - |
| ROS Interface | `ros interface` | `ros%20interface` | - |
| Rouge | `rouge` | `rouge` | - |
| RouterOS Script | `routeros script` | `routeros%20script` | - |
| RPGLE | `rpgle` | `rpgle` | - |
| Ruby | `ruby` | `ruby` | rb |
| RUNOFF | `runoff` | `runoff` | - |
| Rust | `rust` | `rust` | - |
| Sail | `sail` | `sail` | - |
| Salt | `salt` | `salt` | - |
| SAS | `sas` | `sas` | - |
| Sass | `sass` | `sass` | - |
| Scala | `scala` | `scala` | - |
| Scaml | `scaml` | `scaml` | - |
| Scenic | `scenic` | `scenic` | - |
| Scheme | `scheme` | `scheme` | - |
| Scilab | `scilab` | `scilab` | - |
| SCSS | `scss` | `scss` | - |
| sed | `sed` | `sed` | - |
| Self | `self` | `self` | - |
| ShaderLab | `shaderlab` | `shaderlab` | - |
| Shell | `shell` | `shell` | sh |
| ShellCheck Config | `shellcheck config` | `shellcheck%20config` | - |
| Shen | `shen` | `shen` | - |
| Simple File Verification | `simple file verification` | `simple%20file%20verification` | - |
| Singularity | `singularity` | `singularity` | - |
| SIP | `sip` | `sip` | - |
| Slang | `slang` | `slang` | - |
| Slash | `slash` | `slash` | - |
| Slice | `slice` | `slice` | - |
| Slim | `slim` | `slim` | - |
| Slint | `slint` | `slint` | - |
| Smalltalk | `smalltalk` | `smalltalk` | - |
| Smarty | `smarty` | `smarty` | - |
| Smithy | `smithy` | `smithy` | - |
| SmPL | `smpl` | `smpl` | - |
| Snakemake | `snakemake` | `snakemake` | - |
| Solidity | `solidity` | `solidity` | - |
| SourcePawn | `sourcepawn` | `sourcepawn` | - |
| SPARQL | `sparql` | `sparql` | - |
| SpiceDB Schema | `spicedb schema` | `spicedb%20schema` | - |
| SQF | `sqf` | `sqf` | - |
| SQL | `sql` | `sql` | - |
| SQLPL | `sqlpl` | `sqlpl` | - |
| Squirrel | `squirrel` | `squirrel` | - |
| SRecode Template | `srecode template` | `srecode%20template` | - |
| Stan | `stan` | `stan` | - |
| Standard ML | `standard ml` | `standard%20ml` | - |
| Starlark | `starlark` | `starlark` | - |
| Stata | `stata` | `stata` | - |
| STL | `stl` | `stl` | - |
| StringTemplate | `stringtemplate` | `stringtemplate` | - |
| Stylus | `stylus` | `stylus` | - |
| SubRip Text | `subrip text` | `subrip%20text` | - |
| SugarSS | `sugarss` | `sugarss` | - |
| SuperCollider | `supercollider` | `supercollider` | - |
| SurrealQL | `surrealql` | `surrealql` | - |
| Survex data | `survex data` | `survex%20data` | - |
| Svelte | `svelte` | `svelte` | sveltejs |
| SVG | `svg` | `svg` | - |
| Sway | `sway` | `sway` | - |
| Sweave | `sweave` | `sweave` | - |
| Swift | `swift` | `swift` | sw |
| SystemVerilog | `systemverilog` | `systemverilog` | - |
| Tact | `tact` | `tact` | - |
| Talon | `talon` | `talon` | - |
| Tcl | `tcl` | `tcl` | - |
| Teal | `teal` | `teal` | - |
| templ | `templ` | `templ` | - |
| Terra | `terra` | `terra` | - |
| Terraform Template | `terraform template` | `terraform%20template` | - |
| TeX | `tex` | `tex` | - |
| TextGrid | `textgrid` | `textgrid` | - |
| Textile | `textile` | `textile` | - |
| TextMate Properties | `textmate properties` | `textmate%20properties` | - |
| Thrift | `thrift` | `thrift` | - |
| TI Program | `ti program` | `ti%20program` | - |
| TL-Verilog | `tl-verilog` | `tl-verilog` | - |
| TLA | `tla` | `tla` | - |
| TMDL | `tmdl` | `tmdl` | - |
| Toit | `toit` | `toit` | - |
| Tolk | `tolk` | `tolk` | - |
| TOML | `toml` | `toml` | - |
| Tor Config | `tor config` | `tor%20config` | - |
| Tree-sitter Query | `tree-sitter query` | `tree-sitter%20query` | - |
| TSQL | `tsql` | `tsql` | - |
| TSV | `tsv` | `tsv` | - |
| TSX | `tsx` | `tsx` | - |
| Turing | `turing` | `turing` | - |
| Twig | `twig` | `twig` | - |
| TXL | `txl` | `txl` | - |
| TypeScript | `typescript` | `typescript` | ts |
| TypeSpec | `typespec` | `typespec` | - |
| Typst | `typst` | `typst` | - |
| ucode | `ucode` | `ucode` | - |
| Unified Parallel C | `unified parallel c` | `unified%20parallel%20c` | - |
| Unity3D Asset | `unity3d asset` | `unity3d%20asset` | - |
| Uno | `uno` | `uno` | - |
| UnrealScript | `unrealscript` | `unrealscript` | - |
| Untyped Plutus Core | `untyped plutus core` | `untyped%20plutus%20core` | - |
| UrWeb | `urweb` | `urweb` | - |
| V | `v` | `v` | - |
| Vala | `vala` | `vala` | - |
| Valve Data Format | `valve data format` | `valve%20data%20format` | - |
| VBA | `vba` | `vba` | - |
| VBScript | `vbscript` | `vbscript` | - |
| vCard | `vcard` | `vcard` | - |
| VCL | `vcl` | `vcl` | - |
| Velocity Template Language | `velocity template language` | `velocity%20template%20language` | - |
| Vento | `vento` | `vento` | - |
| Verilog | `verilog` | `verilog` | - |
| Verse | `verse` | `verse` | - |
| Vespa Schema Definition | `vespa schema definition` | `vespa%20schema%20definition` | - |
| VHDL | `vhdl` | `vhdl` | - |
| Vim Help File | `vim help file` | `vim%20help%20file` | - |
| Vim script | `vim script` | `vim%20script` | vim |
| Vim Snippet | `vim snippet` | `vim%20snippet` | - |
| Visual Basic .NET | `visual basic .net` | `visual%20basic%20.net` | - |
| Visual Basic 6.0 | `visual basic 6.0` | `visual%20basic%206.0` | - |
| Volt | `volt` | `volt` | - |
| Vue | `vue` | `vue` | vuejs |
| Vyper | `vyper` | `vyper` | - |
| WDL | `wdl` | `wdl` | - |
| Web Ontology Language | `web ontology language` | `web%20ontology%20language` | - |
| WebAssembly | `webassembly` | `webassembly` | - |
| WebAssembly Interface Type | `webassembly interface type` | `webassembly%20interface%20type` | - |
| WGSL | `wgsl` | `wgsl` | - |
| Whiley | `whiley` | `whiley` | - |
| Wikitext | `wikitext` | `wikitext` | - |
| Windows Registry Entries | `windows registry entries` | `windows%20registry%20entries` | - |
| wisp | `wisp` | `wisp` | - |
| Witcher Script | `witcher script` | `witcher%20script` | - |
| Wolfram Language | `wolfram language` | `wolfram%20language` | - |
| Wollok | `wollok` | `wollok` | - |
| World of Warcraft Addon Data | `world of warcraft addon data` | `world%20of%20warcraft%20addon%20data` | - |
| Wren | `wren` | `wren` | - |
| X10 | `x10` | `x10` | - |
| xBase | `xbase` | `xbase` | - |
| XC | `xc` | `xc` | - |
| Xmake | `xmake` | `xmake` | - |
| XML | `xml` | `xml` | - |
| XML Property List | `xml property list` | `xml%20property%20list` | - |
| Xojo | `xojo` | `xojo` | - |
| Xonsh | `xonsh` | `xonsh` | - |
| XQuery | `xquery` | `xquery` | - |
| XSLT | `xslt` | `xslt` | - |
| Xtend | `xtend` | `xtend` | - |
| Yacc | `yacc` | `yacc` | - |
| YAML | `yaml` | `yaml` | yml |
| YARA | `yara` | `yara` | - |
| YASnippet | `yasnippet` | `yasnippet` | - |
| Yul | `yul` | `yul` | - |
| ZAP | `zap` | `zap` | - |
| ZenScript | `zenscript` | `zenscript` | - |
| Zephir | `zephir` | `zephir` | - |
| Zig | `zig` | `zig` | - |
| ZIL | `zil` | `zil` | - |
| Zimpl | `zimpl` | `zimpl` | - |
| Zmodel | `zmodel` | `zmodel` | - |
