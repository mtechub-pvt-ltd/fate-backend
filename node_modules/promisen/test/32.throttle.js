#!/usr/bin/env mocha -R spec

var assert = require("assert");

var TESTNAME = __filename.replace(/^.*\//, "");
var promisen = require("../promisen");
var Promise = require("es6-promise").Promise;

describe(TESTNAME + " testing", function() {
  describe("throttle:", function() {
    it("typeof", function() {
      assert.ok("function", typeof promisen.throttle);
      assert.ok("function", typeof promisen.throttle());
      assert.ok("function", typeof promisen.throttle()().then);
    });

    var tick1 = 25;
    var tick4 = tick1 * 4;
    var tick9 = tick1 * 9;
    var wait4 = promisen.wait(tick4);
    var wait9 = promisen.wait(tick9);

    it("promisen.throttle(wait)", function(done) {
      var start = new Date();
      var task = promisen.throttle(wait4, 1, tick9);
      task("X").then(wrap(done, function(value) {
        assert.equal(value, "X");
        var duration = new Date() - start;
        assert.ok(duration > tick4 - tick1);
        assert.ok(duration < tick4 + tick1);
      })).catch(done);
    });

    it("promisen.throttle(wait) -> timeout", function(done) {
      var task = promisen.throttle(wait9, 1, tick4);
      setTimeout(function() {
        task("X").then();
      }, 0);
      setTimeout(function() {
        var start = new Date();
        task("Y").then(wrap(done, function(value) {
          var duration = new Date() - start;
          throw new Error("should not success");
        })).catch(wrap(done, function(reason) {
          assert.ok(reason instanceof Error);
          var duration = new Date() - start;
          assert.ok(duration > (tick4 - tick1));
          assert.ok(duration < (tick4 * 2));
        }));
      }, tick1);
    });

    it("promisen.throttle(wait) X 5 in parallel", function(done) {
      var job = promisen.throttle(wait4, 5, tick4 * 10); // concurrency=5
      var jobs = [job, job, job, job, job];
      var task = promisen.parallel(jobs);
      var start = new Date();
      task("Y").then(wrap(done, function(array) {
        assert.equal(array.length, jobs.length);
        assert.equal(array.pop(), "Y");
        assert.equal(array.shift(), "Y");
        var duration = new Date() - start;
        assert.ok(duration > tick4 - tick1);
        assert.ok(duration < tick4 * 2);
      })).catch(done);
    });

    it("promisen.throttle(wait) X 5 in serial", function(done) {
      var job = promisen.throttle(wait4, 1, tick4 * 10); // concurrency=1
      var jobs = [job, job, job, job, job];
      var task = promisen.parallel(jobs);
      var start = new Date();
      task("Y").then(wrap(done, function(array) {
        assert.equal(array.length, jobs.length);
        assert.equal(array.pop(), "Y");
        assert.equal(array.shift(), "Y");
        var duration = new Date() - start;
        assert.ok(duration > tick4 * 5 - tick1);
        assert.ok(duration < tick4 * 6);
      })).catch(done);
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
