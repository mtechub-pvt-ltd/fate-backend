#!/usr/bin/env mocha -R spec

var assert = require("assert");

var TESTNAME = __filename.replace(/^.*\//, "");
var promisen = require("../promisen");

describe(TESTNAME + " testing", function() {
  it("promisen.resolve()", function() {
    return promisen.resolve("foo")
      .then(function(result) {
        assert.equal(result, "foo");
      });
  });

  it("promisen.reject()", function(done) {
    return promisen.reject("bar")
      .then(done)
      .catch(function(result) {
        assert.equal(result, "bar");
        done();
      });
  });
});
