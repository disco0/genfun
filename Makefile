#
# Binaries
#
module-root = ./node_modules
uglify = $(module-root)/uglify-js/bin/uglifyjs
browserify = $(module-root)/browserify/bin/cmd.js
jsdoc = $(module-root)/jsdoc/jsdoc
mocha = $(module-root)/mocha/bin/mocha $(mocha-opts)
linter = $(module-root)/jshint/bin/jshint $(linter-opts)

#
# Opts
#
mocha-opts = --reporter spec \
				--check-leaks
linter-opts =

#
# Files
#
main-file = src/genfun.js
source-files = src/*.js
build-dir = build
docs-dir = docs
browserify-bundle = $(build-dir)/genfun.js
min-file = $(build-dir)/genfun.min.js
source-map = $(build-dir)/genfun.js.src
jsdoc-config = jsdoc.conf.json
linter-config = jshint.conf.json
readme = README.md

#
# Targets
#
.PHONY: all
all: lint test docs compile

.PHONY: compile
compile: $(min-file) $(source-map)

$(min-file) $(source-map): $(browserify-bundle)
	$(uglify) $(browserify-bundle) \
		-o $(min-file) \
		--source-map $(source-map)

$(browserify-bundle): $(main-file) $(source-files) | $(build-dir)
	$(browserify) $(main-file) \
		-s Genfun \
		-o $@

$(build-dir):
	mkdir -p $@

$(docs-dir): $(jsdoc-config) $(source-files) $(readme)
	$(jsdoc) -d $@ -c $(jsdoc-config) $(source-files) $(readme)

.PHONY: clean
clean:
	-rm -rf $(build-dir)
	-rm -rf $(docs-dir)

.PHONY: test
test: $(source-files)
	$(mocha)

.PHONY: test-watch
test-watch: $(source-files)
	$(mocha) --reporter min --watch

.PHONY: lint
lint: $(source-files) $(linter-config)
	$(linter) --config $(linter-config) $(source-files)
