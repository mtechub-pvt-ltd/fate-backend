#!/usr/bin/env mocha -R spec

var assert = require("assert");

var TESTNAME = __filename.replace(/^.*\//, "");
var promisen = require("../promisen");
var Promise = require("es6-promise").Promise;

describe(TESTNAME + " testing", function() {
  describe("while loop:", function() {
    it("typeof", function() {
      assert.ok("function", typeof promisen.while);
      assert.ok("function", typeof promisen.while());
      assert.ok("function", typeof promisen.while()().then);
    });

    // while ( condTask ) { runTask1; }
    it("promisen.while(condTask, runTask)", function(done) {
      var counter = [5];
      var stack = [];
      promisen.while(promisen.decr(counter), promisen.push(stack))("X").then(wrap(done, function(value) {
        assert.equal(0, counter - 0);
        assert.equal(4, stack.length);
        // condTask's result is ignored.
        // the last stack.push returns the previous value: "X"
        assert.equal("X", value);
      }));
    });

    // while ( condTask ) { runTask1; runTask2; }
    it("promisen.while(condTask, runTask1, runTask2)", function(done) {
      var counter1 = [5];
      var counter2 = [0];
      var stack = [];
      promisen.while(promisen.decr(counter1), promisen.incr(counter2), promisen.push(stack))().then(wrap(done, function(value) {
        assert.equal(0, counter1 - 0);
        assert.equal(4, counter2 - 0);
        assert.equal(4, stack.length);
        assert.equal(4, value);
      }));
    });

    // do { runTask } while ( condTask )
    it("promisen.while(null, runTask, condTask)", function(done) {
      var counter = [5];
      var stack = [];
      promisen.while(null, promisen.push(stack), promisen.decr(counter))(true).then(wrap(done, function(value) {
        assert.equal(0, counter - 0);
        assert.equal(5, stack.length);
        assert.equal(0, value);
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
