#!/usr/bin/env mocha -R spec

var assert = require("assert");

var TESTNAME = __filename.replace(/^.*\//, "");
var promisen = require("../promisen");
var Promise = require("es6-promise").Promise;

describe(TESTNAME + " testing", function() {
  describe("timeout:", function() {
    it("typeof", function() {
      assert.ok("function", typeof promisen.timeout);
      assert.ok("function", typeof promisen.timeout());
      assert.ok("function", typeof promisen.timeout()().then);
    });

    var tick1 = 50;
    var tick4 = tick1 * 4;
    var tick9 = tick1 * 9;
    var wait4 = promisen.wait(tick4);
    var wait9 = promisen.wait(tick9);

    it("promisen.single(wait) -> success", function(done) {
      var task = promisen.timeout(wait4, tick9);
      var start = new Date();
      task("Y").then(wrap(done, function(value) {
        assert.equal(value, "Y");
        assert.ok(new Date() - start > tick4 * 0.9);
      }), done);
    });

    it("promisen.single(wait) -> timeout", function(done) {
      var task = promisen.timeout(wait9, tick4);
      var start = new Date();
      task("Y").then(function() {
        done(new Error("should timeout"));
      }).catch(wrap(done, function(reason) {
        assert.ok(reason instanceof Error);
        assert.ok(new Date() - start > tick4 * 0.9);
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
