#!/usr/bin/env mocha -R spec

var assert = require("assert");

var TESTNAME = __filename.replace(/^.*\//, "");
var promisen = require("../promisen");
var Promise = require("es6-promise").Promise;

describe(TESTNAME + " testing", function() {
  describe("memoize:", function() {
    var undef = void 0;
    var TVALUES = [1, 0, true, false, "", {}, [], null, undef];
    var task;

    it("typeof", function() {
      assert.ok("function", typeof promisen.memoize);
      assert.ok("function", typeof promisen.memoize());
      assert.ok("function", typeof promisen.memoize()().then);
    });

    it("promisen.memoize(task) # first time", function(done) {
      task = promisen.memoize(seq(0));
      promisen.eachSeries(TVALUES, task)().then(wrap(done, function(array) {
        assert.equal(array.length, TVALUES.length);
        array.forEach(function(value) {
          assert.ok(value > 0);
          assert.ok(value <= TVALUES.length);
        });
      })).catch(done);
    });

    it("promisen.memoize(task) # second time", function(done) {
      promisen.eachSeries(TVALUES, task)().then(wrap(done, function(array) {
        assert.equal(array.length, TVALUES.length);
        array.forEach(function(value) {
          assert.ok(value > 0); // cached value
          assert.ok(value <= TVALUES.length); // cached value
        });
      })).catch(done);
    });

    it("promisen.memoize(task, expire)", function(done) {
      task = promisen.memoize(seq(0), 50);
      task = promisen.eachSeries(TVALUES, task);
      task = promisen.waterfall([task, promisen.wait(100), task]);
      task().then(wrap(done, function(array) {
        assert.equal(array.length, TVALUES.length);
        array.forEach(function(value) {
          assert.ok(value > TVALUES.length); // cache ignored
          assert.ok(value <= TVALUES.length * 2);
        });
      })).catch(done);
    });

    it("promisen.memoize(task, null, hasher)", function(done) {
      task = promisen.memoize(seq(0), null, hasher);
      promisen.eachSeries(TVALUES, task)().then(wrap(done, function(array) {
        // 5 types: number, boolean, string, object, undefined
        assert.equal(array.length, TVALUES.length);
        array.forEach(function(value) {
          assert.ok(value > 0);
          assert.ok(value < 6);
        });
      })).catch(done);
    });
  });
});

function seq(cnt) {
  return function() {
    return ++cnt;
  };
}

function hasher(value) {
  return typeof value;
}

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
