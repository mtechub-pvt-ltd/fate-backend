#!/usr/bin/env mocha -R spec

var assert = require("assert");

var TESTNAME = __filename.replace(/^.*\//, "");
var promisen = require("../promisen");
var Promise = require("es6-promise").Promise;

describe(TESTNAME + " testing", function() {
  describe("push(), pop(), top():", function() {
    it("typeof", function() {
      var stack = [];
      assert.equal("function", typeof promisen.push);
      assert.equal("function", typeof promisen.push());
      assert.equal("function", typeof promisen.push(stack)().then);

      assert.equal("function", typeof promisen.pop);
      assert.equal("function", typeof promisen.pop());
      assert.equal("function", typeof promisen.pop(stack)().then);

      assert.equal("function", typeof promisen.top);
      assert.equal("function", typeof promisen.top());
      assert.equal("function", typeof promisen.top(stack)().then);
    });

    it("promisen.push()", function(done) {
      var stack = ["X"];
      var task = promisen.push(stack);
      task("Y").then(wrap(done, function(value) {
        assert.equal(2, stack.length);
        assert.equal("X", stack[0]);
        assert.equal("Y", stack[1]);
        assert.equal("Y", value);
      }));
    });

    it("promisen.pop()", function(done) {
      var stack = ["X", "Y"];
      var task = promisen.pop(stack);
      task().then(wrap(done, function(value) {
        assert.equal(1, stack.length);
        assert.equal("X", stack[0]);
        assert.equal("Y", value);
      }));
    });

    it("promisen.top()", function(done) {
      var stack = ["X", "Y"];
      promisen.top(stack)().then(wrap(done, function(value) {
        assert.equal("Y", value);
        assert.equal(2, stack.length);
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
