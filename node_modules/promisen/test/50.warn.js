#!/usr/bin/env mocha -R spec

var assert = require("assert");

var TESTNAME = __filename.replace(/^.*\//, "");
var promisen = require("../promisen");
var Promise = require("es6-promise").Promise;

describe(TESTNAME + " testing", function() {
  describe("logging:", function() {
    it("typeof", function() {
      assert.ok("function", typeof promisen.log);
      assert.ok("function", typeof promisen.log("Log:"));
      assert.ok("function", typeof promisen.warn);
      assert.ok("function", typeof promisen.warn("Warn:"));
    });
  });
});
