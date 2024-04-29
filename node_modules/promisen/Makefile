#!/usr/bin/env bash -c make

SRC=./promisen.js
TESTS=./test/*.js
DIST=./dist
DEST=./dist/promisen.min.js
JSHINT=./node_modules/.bin/jshint
UGLIFYJS=./node_modules/.bin/uglifyjs
MOCHA=./node_modules/.bin/mocha
JSDOC=./node_modules/.bin/jsdoc

DOCS_DIR=./gh-pages
DOC_HTML=./gh-pages/module-promisen.html
DOCS_CSS_SRC=./assets/jsdoc.css
DOCS_CSS_DEST=./gh-pages/styles/jsdoc-default.css

all: $(DEST) jsdoc

clean:
	rm -fr $(DEST) $(DOC_HTML)

$(DIST):
	mkdir -p $(DIST)

$(DEST): $(SRC) $(DIST)
	$(UGLIFYJS) $(SRC) -c -m -o $(DEST)

test: jshint mocha

mocha:
	$(MOCHA) -R spec $(TESTS)

jshint:
	$(JSHINT) $(SRC) $(TESTS)

jsdoc: $(DOC_HTML)

$(DOC_HTML): README.md $(SRC) $(DOCS_CSS_SRC)
	mkdir -p $(DOCS_DIR)
	$(JSDOC) -d $(DOCS_DIR) -R README.md $(SRC)
	cat $(DOCS_CSS_SRC) >> $(DOCS_CSS_DEST)
	rm -f $(DOCS_DIR)/*.js.html
	for f in $(DOCS_DIR)/*.html; do sed 's#</a> on .* 201.* GMT.*##' < $$f > $$f~ && mv $$f~ $$f; done
	for f in $(DOCS_DIR)/*.html; do sed 's#<a href=".*.js.html">.*line.*line.*</a>##' < $$f > $$f~ && mv $$f~ $$f; done

.PHONY: all clean test jshint mocha
