#!/usr/bin/env mocha -R spec

var assert = require("assert");

var TESTNAME = __filename.replace(/^.*\//, "");
var promisen = require("../promisen");
var Promise = require("es6-promise").Promise;

describe(TESTNAME + " testing", function() {

  describe("nodeify():", function() {
    it("typeof", function() {
      assert.equal("function", typeof promisen.nodeify);
      assert.equal("function", typeof promisen.nodeify());
    });

    it("promisen.nodeify(resolve)", function(done) {
      var task = promisen.nodeify(Promise.resolve("foo"));
      task(wrap(done, function(err, res) {
        assert.ok(!err);
        assert.ok(res);
        assert.equal(res, "foo");
      }));
    });

    it("promisen.nodeify(reject)", function(done) {
      var task = promisen.nodeify(Promise.reject("bar"));
      task(wrap(done, function(err, res) {
        assert.ok(err);
        assert.ok(err.match("bar"));
        assert.ok(!res);
      }));
    });
    it("promisen.nodeify(resolve1)", function(done) {
      var task = promisen.nodeify(resolve1);
      task("FOO", wrap(done, function(err, res) {
        assert.ok(!err);
        assert.ok(res);
        assert.equal(res, "FOO");
      }));
    });

    it("promisen.nodeify(reject1)", function(done) {
      var task = promisen.nodeify(reject1);
      task("BAR", wrap(done, function(err, res) {
        assert.ok(err);
        assert.ok(err.match("BAR"));
        assert.ok(!res);
      }));
    });

    it("promisen.nodeify(syncThrow)", function(done) {
      var task = promisen.nodeify(syncThrow);
      task("BAZ", wrap(done, function(err, res) {
        assert.ok(err);
        assert.ok(!res);
      }));
    });

    it("promisen.nodeify(asyncThrow)", function(done) {
      var task = promisen.nodeify(asyncThrow);
      task("QUUX", wrap(done, function(err, res) {
        assert.ok(err);
        assert.ok(!res);
      }));
    });
  });

  describe("denodeify():", function() {
    it("typeof", function() {
      assert.equal("function", typeof promisen.denodeify);
      assert.equal("function", typeof promisen.denodeify());
      assert.equal("function", typeof promisen.denodeify()().then);
    });

    it("promisen.denodeify(resolve0)", function(done) {
      var task = promisen.denodeify(resolve0);
      task().then(wrap(done, function(value) {
        assert.equal(value, "X");
      }), done);
    });

    it("promisen.denodeify(reject0)", function(done) {
      var task = promisen.denodeify(reject0);
      task().then(done, wrap(done, function(reason) {
        assert.ok(reason);
      }));
    });

    it("promisen.denodeify(resolve3)", function(done) {
      var task = promisen.denodeify(resolve3);
      task("A", "B", "C").then(wrap(done, function(value) {
        assert.equal(value, "A");
      }), done);
    });

    it("promisen.denodeify(reject3)", function(done) {
      var task = promisen.denodeify(reject3);
      task("A", "B", "C").then(done, wrap(done, function(reason) {
        assert.ok(reason);
      }));
    });

    it("promisen.denodeify(syncThrow)", function(done) {
      var task = promisen.denodeify(syncThrow);
      task("QUX").then(done, wrap(done, function(reason) {
        assert.ok(reason);
      }));
    });
  });


  describe("denodeify(nodeify()):", function() {
    it("promisen.denodeify(promisen.nodeify(resolve))", function(done) {
      var task = promisen.denodeify(promisen.nodeify(Promise.resolve("hoge")));
      task().then(wrap(done, function(value) {
        assert.equal(value, "hoge");
      }), done);
    });

    it("promisen.denodeify(promisen.nodeify(reject))", function(done) {
      var task = promisen.denodeify(promisen.nodeify(Promise.reject("pomu")));
      task().then(done, wrap(done, function(reason) {
        assert.equal(reason, "pomu");
      }));
    });

    it("promisen.nodeify(promisen.denodeify(resolve))", function(done) {
      var task = promisen.nodeify(promisen.denodeify(resolve0));
      task(wrap(done, function(err, res) {
        assert.ok(!err);
        assert.ok(res);
        assert.equal(res, "X");
      }));
    });

    it("promisen.nodeify(promisen.denodeify(reject))", function(done) {
      var task = promisen.nodeify(promisen.denodeify(reject0));
      task(wrap(done, function(err, res) {
        assert.ok(err);
        assert.ok(!res);
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

function resolve1(value) {
  return new Promise(function(resolve, reject) {
    resolve(value);
  });
}

function reject1(value) {
  return new Promise(function(resolve, reject) {
    reject(value);
  });
}

function syncThrow() {
  throw new Error("sync error");
}

function asyncThrow() {
  return new Promise(function(resolve, reject) {
    throw new Error("async error");
  });
}

function resolve0(callback) {
  callback(null, "X", "Y");
}

function reject0(callback) {
  callback(new Error("something wrong"));
}

function resolve3(a, b, c, callback) {
  callback(null, a, b, c);
}

function reject3(a, b, c, callback) {
  callback(new Error("another error"));
}
