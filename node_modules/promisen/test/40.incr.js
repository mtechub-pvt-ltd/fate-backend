#!/usr/bin/env mocha -R spec

var assert = require("assert");

var TESTNAME = __filename.replace(/^.*\//, "");
var promisen = require("../promisen");
var Promise = require("es6-promise").Promise;

describe(TESTNAME + " testing", function() {
  describe("counter operations:", function() {
    it("typeof", function() {
      var counter = [0];
      assert.equal("function", typeof promisen.incr);
      assert.equal("function", typeof promisen.incr());
      assert.equal("function", typeof promisen.incr(counter)().then);

      assert.equal("function", typeof promisen.decr);
      assert.equal("function", typeof promisen.decr());
      assert.equal("function", typeof promisen.decr(counter)().then);
    });

    it("promisen.incr(array)", function(done) {
      var counter = [5];
      assert.equal(5, Number(counter));
      promisen.incr(counter)().then(wrap(done, function(value) {
        assert.equal(6, value);
        assert.equal(1, counter.length);
      }));
    });

    it("promisen.decr(array)", function(done) {
      var counter = [-5];
      assert.equal(-5, Number(counter));
      promisen.decr(counter)().then(wrap(done, function(value) {
        assert.equal(-6, value);
        assert.equal(1, counter.length);
      }));
    });

    it("promisen.incr(arraylike) => 1", function(done) {
      var counter = {};
      promisen.incr(counter)().then(wrap(done, function(value) {
        assert.equal(1, value);
        assert.equal(1, counter.length);
      }));
    });

    it("promisen.decr(arraylike) => -1", function(done) {
      var counter = {};
      promisen.decr(counter)().then(wrap(done, function(value) {
        assert.equal(-1, value);
        assert.equal(1, counter.length);
      }));
    });

  });
});

function wrap(done, test) {
  return function() {
    try {
      test.apply(this, arguments);
      done();
    } catch (e) {
      done(e);
    }
  };
}
