#!/usr/bin/env mocha -R spec

var assert = require("assert");

var TESTNAME = __filename.replace(/^.*\//, "");
var promisen = require("../promisen");
var Promise = require("es6-promise").Promise;

describe(TESTNAME + " testing", function() {
  describe("wait:", function() {
    it("typeof", function() {
      assert.ok("function", typeof promisen.wait);
      assert.ok("function", typeof promisen.wait());
      assert.ok("function", typeof promisen.wait()().then);
    });

    var tick = 1000 / 60;

    it("promisen.wait(0)", function(done) {
      var start = new Date();
      promisen.wait(0)("X").then(wrap(done, function(value) {
        assert.equal(value, "X");
        var now = new Date();
        assert.ok(now - start < tick);
      }));
    });

    it("promisen.wait(100)", function(done) {
      var start = new Date();
      promisen.wait(100)("Y").then(wrap(done, function(value) {
        assert.equal(value, "Y");
        var now = new Date();
        assert.ok(now - start > 100 - tick);
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
