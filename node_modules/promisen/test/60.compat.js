#!/usr/bin/env mocha -R spec

var assert = require("assert");

var TESTNAME = __filename.replace(/^.*\//, "");
var promisen = require("../promisen");

describe(TESTNAME + " testing", function() {
  test("es6-promise:", function() {
    return require("es6-promise").Promise;
  });
  test("q:", function() {
    return require("q").Promise;
  });
  test("bluebird:", function() {
    return require("bluebird").Promise;
  });
  test("rsvp:", function() {
    return require("rsvp").Promise;
  });
  test("lie:", function() {
    return require("lie");
  });
  test("promiscuous:", function() {
    return require("promiscuous");
  });
});

function test(name, loader, skip) {
  var PromiseClass;
  var promiseConstructor;
  var promiseName;
  var desc = describe;

  if (!skip) {
    try {
      PromiseClass = loader();
      promiseConstructor = PromiseClass.resolve().constructor;
      promiseName = promiseConstructor.name;
    } catch (e) {
      skip = e;
    }
  }

  if (skip) {
    name += " " + skip;
    desc = describe.skip;
    promiseName = "(SKIP)";
  }

  desc(name, function() {
    it("promisen()() => " + promiseName, function() {
      promisen.Promise = PromiseClass;
      assert.ok(promisen() instanceof Function);
      assert.ok(promisen()() instanceof promiseConstructor);
      assert.ok(promisen()().then instanceof Function); // thenable
    });

    it("promisen.waterfall([SYNC_TASK, SYNC_TASK])(1).then()", function(done) {
      promisen.Promise = PromiseClass;
      promisen.waterfall([syncTask, syncTask])(1).then(wrap(done, function(value) {
        assert.equal(4, value);
      }));
    });

    it("promisen.series([ASYNC_TASK, ASYNC_TASK])(1).then()", function(done) {
      promisen.Promise = PromiseClass;
      var start = new Date();
      promisen.series([asyncTask, asyncTask])(1).then(wrap(done, function(array) {
        assert.equal(2, array.length);
        assert.equal(2, array[0]);
        assert.equal(2, array[1]);
        var duration = new Date() - start;
        assert.ok(duration > 150);
        assert.ok(duration < 250);
      }));
    });

    it("promisen.parallel([ASYNC_TASK, ASYNC_TASK])(1).then()", function(done) {
      promisen.Promise = PromiseClass;
      var start = new Date();
      promisen.parallel([asyncTask, asyncTask])(1).then(wrap(done, function(array) {
        assert.equal(2, array.length);
        assert.equal(2, array[0]);
        assert.equal(2, array[1]);
        var duration = new Date() - start;
        assert.ok(duration > 50);
        assert.ok(duration < 150);
      }));
    });

    it("promisen.wait(100)().then()", function(done) {
      promisen.Promise = PromiseClass;
      var start = new Date();
      promisen.wait(100)("X").then(wrap(done, function(value) {
        assert.equal("X", value);
        var duration = new Date() - start;
        assert.ok(duration > 50);
        assert.ok(duration < 150);
      }));
    });

    it("promisen.timeout(SYNC_TASK)(1).then()", function(done) {
      promisen.Promise = PromiseClass;
      promisen.timeout(syncTask, 100)(1).then(wrap(done, function(value) {
        assert.equal(2, value);
      }));
    });

    it("promisen.throttle(SYNC_TASK)(1).then()", function(done) {
      promisen.Promise = PromiseClass;
      promisen.throttle(syncTask, 1, 100)(1).then(wrap(done, function(value) {
        assert.equal(2, value);
      }));
    });
  });
}

function syncTask(value) {
  return value * 2;
}

function asyncTask(value) {
  return new Promise(function(resolve) {
    setTimeout(function() {
      return resolve(value * 2);
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