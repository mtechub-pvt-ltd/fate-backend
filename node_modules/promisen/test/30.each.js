#!/usr/bin/env mocha -R spec

var assert = require("assert");

var TESTNAME = __filename.replace(/^.*\//, "");
var promisen = require("../promisen");
var Promise = require("es6-promise").Promise;

describe(TESTNAME + " testing", function() {
  describe("each/eachSeries loop:", function() {
    it("typeof", function() {
      assert.ok("function", typeof promisen.each);
      assert.ok("function", typeof promisen.each());
      assert.ok("function", typeof promisen.each()().then);
      assert.ok("function", typeof promisen.eachSeries);
      assert.ok("function", typeof promisen.eachSeries());
      assert.ok("function", typeof promisen.eachSeries()().then);
    });

    it("promisen.each(array, syncTask)", function(done) {
      var source = [1, 2, 3];
      promisen.each(source, syncTask)().then(wrap(done, function(value) {
        assert.ok(value instanceof Array);
        assert.equal(3, source.length);
        assert.equal(source[0] + 1, value[0]);
        assert.equal(source[1] + 1, value[1]);
        assert.equal(source[2] + 1, value[2]);
      }));
    });

    it("promisen.each(null, syncTask)(array)", function(done) {
      var source = [2, 3, 4];
      promisen.each(null, syncTask)(source).then(wrap(done, function(value) {
        assert.ok(value instanceof Array);
        assert.equal(3, source.length);
        assert.equal(source[0] + 1, value[0]);
        assert.equal(source[1] + 1, value[1]);
        assert.equal(source[2] + 1, value[2]);
      }));
    });

    it("promisen.each(arrayTask, syncTask)", function(done) {
      var source = [3, 4, 5];
      promisen.each(arrayTask, syncTask)().then(wrap(done, function(value) {
        assert.ok(value instanceof Array);
        assert.equal(3, source.length);
        assert.equal(source[0] + 1, value[0]);
        assert.equal(source[1] + 1, value[1]);
        assert.equal(source[2] + 1, value[2]);
      }));

      function arrayTask() {
        return source;
      }
    });

    it("promisen.each(array, asyncTask)", function(done) {
      var source = [4, 5, 6];
      var start = new Date();
      promisen.each(source, asyncTask)().then(wrap(done, function(value) {
        assert.ok(value instanceof Array);
        assert.equal(source.length, value.length);
        assert.equal(source[0] + 1, value[0]);
        assert.equal(source[1] + 1, value[1]);
        assert.equal(source[2] + 1, value[2]);
        var duration = new Date() - start;
        assert.ok(duration > 50);
        assert.ok(duration < 150);
      }));
    });

    it("promisen.eachSeries(array, syncTask)", function(done) {
      var source = [5, 6, 7];
      promisen.eachSeries(source, syncTask)().then(wrap(done, function(value) {
        assert.ok(value instanceof Array);
        assert.equal(3, source.length);
        assert.equal(3, value.length);
        assert.equal(source[0] + 1, value[0]);
        assert.equal(source[1] + 1, value[1]);
        assert.equal(source[2] + 1, value[2]);
      }));
    });

    it("promisen.eachSeries(null, syncTask)(array)", function(done) {
      var source = [7, 8, 9];
      promisen.eachSeries(null, syncTask)(source).then(wrap(done, function(value) {
        assert.ok(value instanceof Array);
        assert.equal(3, source.length);
        assert.equal(source[0] + 1, value[0]);
        assert.equal(source[1] + 1, value[1]);
        assert.equal(source[2] + 1, value[2]);
      }));
    });

    it("promisen.eachSeries(array, asyncTask)", function(done) {
      var source = [8, 9, 10];
      var start = new Date();
      promisen.eachSeries(source, asyncTask)().then(wrap(done, function(value) {
        assert.ok(value instanceof Array);
        assert.equal(source.length, value.length);
        assert.equal(source[0] + 1, value[0]);
        assert.equal(source[1] + 1, value[1]);
        assert.equal(source[2] + 1, value[2]);
        var duration = new Date() - start;
        assert.ok(duration > 250);
        assert.ok(duration < 350);
      }));
    });

  });
});

function syncTask(value) {
  return value + 1;
}

function asyncTask(value) {
  return new Promise(function(resolve) {
    setTimeout(function() {
      return resolve(value + 1);
    }, 100);
  });
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
