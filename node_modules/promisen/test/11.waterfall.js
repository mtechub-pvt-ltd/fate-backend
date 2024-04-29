#!/usr/bin/env mocha -R spec

var assert = require("assert");

var TESTNAME = __filename.replace(/^.*\//, "");
var promisen = require("../promisen");

var Promise = require("es6-promise").Promise;

describe(TESTNAME + " testing", function() {
  var undef = void 0;
  var TVALUES = [1, 0, true, false, "", {}, [], null, undef];

  describe("multiple values:", function() {
    TVALUES.forEach(function(tvalue) {
      it("promisen.waterfall([1,2,3," + typestr(tvalue) + "])().then()", function(done) {
        promisen.waterfall([1, 2, 3, tvalue])().then(wrap(done, function(value) {
          assert.equal(tvalue, value);
          assert.ok(tvalue === value);
        }));
      });
    });
  });

  describe("waterfall of functions:", function() {
    it("promisen.waterfall([SYNC_FUNCTION,SYNC_FUNCTION])(10).then()", function(done) {
      promisen.waterfall([incr_function, incr_function])(10).then(wrap(done, function(value) {
        assert.equal(12, value);
      }));
    });
    it("promisen.waterfall([SYNC_FUNCTION,ASYNC_FUNCTION])(10).then()", function(done) {
      var start = new Date();
      promisen.waterfall([incr_function, async_function])(10).then(wrap(done, function(value) {
        assert.equal(10, value);
        var duration = new Date() - start;
        assert.ok(duration > 50);
        assert.ok(duration < 150);
      }));
    });
    it("promisen.waterfall([ASYNC_FUNCTION,ASYNC_FUNCTION])(10).then()", function(done) {
      var start = new Date();
      promisen.waterfall([async_function, async_function])(10).then(wrap(done, function(value) {
        assert.equal(8, value);
        var duration = new Date() - start;
        assert.ok(duration > 150);
        assert.ok(duration < 250);
      }));
    });
    it("promisen.waterfall([BOUND_FUNCTION,BOUND_FUNCTION]).call(OBJECT).then()", function(done) {
      var object = new AnObject();
      promisen.waterfall([bind_target, bind_target]).call(object).then(wrap(done, function(array) {
        assert.equal("AnObject-AnObject", array.join("-"));
      }));
    });
  });

  describe("invalid arguments:", function(done) {
    it("promisen.waterfall()", function() {
      var task = promisen.waterfall(); // empty task
      assert.equal("function", typeof task);
      task("X").then(wrap(done, function(value) {
        assert.equal("X", value);
      }));
    });
    it("promisen.waterfall(null)", function(done) {
      var task = promisen.waterfall(null); // returns null
      assert.equal("function", typeof task);
      task("Y").then(wrap(done, function(value) {
        assert.equal(null, value);
      }));
    });
    it("promisen.waterfall(0)", function(done) {
      var task = promisen.waterfall(0); // invalid task ignored
      assert.equal("function", typeof task);
      task("Z").then(wrap(done, function(value) {
        assert.equal("Z", value);
      }));
    });
    it("promisen.waterfall(1)", function(done) {
      var task = promisen.waterfall(1); // invalid task ignored
      assert.equal("function", typeof task);
      task("W").then(wrap(done, function(value) {
        assert.equal("W", value);
      }));
    });
  });
});

function incr_function(value) {
  return value + 1;
}

function async_function(value) {
  return new Promise(function(resolve) {
    setTimeout(function() {
      return resolve(value - 1);
    }, 100);
  });
}

function bind_target(array) {
  if (!array) array = [];
  array.push(this.constructor.name);
  return array;
}

function typestr(tvalue) {
  if ("undefined" === typeof tvalue) return "undefined";
  if ("string" === typeof tvalue) return "String";
  if ("object" !== typeof tvalue) return tvalue + "";
  if (tvalue instanceof Array) return "Array";
  if (tvalue === null) return "null";
  return "Object";
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

function AnObject() {

}