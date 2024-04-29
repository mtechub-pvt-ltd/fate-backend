/**
 * promisen.js creates promise-returning functions. ready for ES6 Promise.
 *
 * @module promisen
 * @copyright Yusuke Kawasaki
 * @license MIT
 * @see https://github.com/kawanet/promisen
 * @see http://kawanet.github.io/promisen/module-promisen.html
 */

(function(module, window) {
  // node.js
  if (module) module.exports = promisen;

  // browsers
  if (!module && window) window.promisen = promisen;

  // use polifill or not
  var polyfill = ("undefined" === typeof Promise && "undefined" !== typeof require);

  /**
   * Native Promise object or Promise polyfill.
   * "es6-promise" polyfill loaded per default in case no native Promise object ready.
   * Some other libraries which have compatible interface with ES6 Promise are also available:
   * Q, bluebird and RSVP are tested.
   *
   * @class promisen
   * @member Promise {Promise}
   * @static
   * @example
   * var promisen = require("promisen");
   *
   * // https://github.com/jakearchibald/es6-promise (default polyfill)
   * promisen.Promise = require("es6-promise").Promise;
   *
   * // https://github.com/kriskowal/q
   * promisen.Promise = require("q").Promise;
   *
   * // https://github.com/petkaantonov/bluebird
   * promisen.Promise = require("bluebird").Promise;
   *
   * // https://github.com/tildeio/rsvp.js
   * promisen.Promise = require("rsvp").Promise;
   *
   * // https://github.com/calvinmetcalf/lie
   * promisen.Promise = require("lie");
   *
   * // https://github.com/RubenVerborgh/promiscuous
   * promisen.Promise = require("promiscuous");
   */

  promisen.Promise = polyfill ? require("es6-promise").Promise : Promise;
  promisen.resolve = resolve;
  promisen.reject = reject;

  // methods
  promisen.waterfall = waterfall;
  promisen.series = series;
  promisen.parallel = parallel;
  promisen.each = each;
  promisen.eachSeries = eachSeries;
  promisen.IF = promisen["if"] = IF;
  promisen.WHILE = promisen["while"] = WHILE;

  // counter operations
  promisen.incr = incr;
  promisen.decr = decr;

  // array operations
  promisen.push = push;
  promisen.pop = pop;
  promisen.top = top;

  // inpsect tasks
  promisen.log = log;
  promisen.warn = warn;

  // wait
  promisen.wait = wait;

  // lock
  promisen.throttle = throttle;
  promisen.timeout = timeout;

  // nodeify / denodeify
  promisen.nodeify = nodeify;
  promisen.denodeify = denodeify;

  // memoize
  promisen.memoize = memoize;

  /**
   * creates a promise-returning function from plain function or objects below:
   *
   * 1. function
   * 2. promise object
   * 3. thenable object
   * 4. any other constant object or value
   * 5. multiple values of above
   *
   * @class promisen
   * @static
   * @function promisen
   * @param task {...(Function|Promise|thenable|*)}
   * @returns {Function}
   * @see https://www.npmjs.com/package/es6-promise
   * @see promisen.waterfall()
   * @example
   * var promisen = require("promisen");
   *
   * // wrap a single function
   * var wrapped = promisen(function() {...});
   * wrapped(value).then(function(result) {...});
   *
   * // composite multiple tasks
   * var joined = promisen(func, promise, thenable, object);
   * joined(value).then(function(result) {...});
   */

  function promisen(task) {
    if (arguments.length > 1) return waterfall(arguments);
    if (task instanceof Function) return executable;
    if (!arguments.length) return resolve;
    return constant;

    // return the constant value
    function constant() {
      return resolve(task);
    }

    // return a result from the function
    function executable(value) {
      var result;
      try {
        result = resolve(task.apply(this, arguments));
      } catch (e) {
        result = reject(e);
      }
      return result;
    }
  }

  /**
   * returns a Promise object which is resolved as same as Promise.resolve() does.
   *
   * @class promisen
   * @static
   * @function resolve
   * @param value - an argument to be resolved
   */

  function resolve(value) {
    return promisen.Promise.resolve(value);
  }

  /**
   * returns a Promise object which is rejected as same as Promise.reject() does.
   *
   * @class promisen
   * @static
   * @function reject
   * @param reason - reason why this Promise rejected
   */

  function reject(reason) {
    return promisen.Promise.reject(reason);
  }

  /**
   * creates a promise-returning function which runs multiple tasks in order.
   *
   * @class promisen
   * @static
   * @function waterfall
   * @param tasks {Array|Array-like} list of tasks
   * @returns {Function} promise-returning function
   * @example
   * var promisen = require("promisen");
   *
   * // generate a promise-returning function
   * var task = promisen.waterfall([task1, task2, task3,...]);
   *
   * // execute it
   * task(value).then(function(result) {...});
   *
   * // execute it with target object which is passed to every tasks
   * task.call(target, value).then(function(result) {...});
   */

  function waterfall(tasks) {
    if (tasks === null) return promisen(tasks);
    if (tasks == null) return promisen();
    tasks = Array.prototype.map.call(tasks, wrap);
    return composite;

    // composite multiple tasks
    function composite(value) {
      return tasks.reduce(chain.bind(this), resolve(value));
    }

    // apply the first argument only. ignore rest.
    function wrap(task) {
      return promisen(task);
    }

    // chain tasks
    function chain(promise, func) {
      return promise.then(func.bind(this));
    }
  }

  /**
   * creates a promise-returning function which runs multiple tasks in order.
   *
   * @class promisen
   * @static
   * @function series
   * @param tasks {Array|Array-like} list of tasks
   * @returns {Function} promise-returning function
   * @example
   * var promisen = require("promisen");
   *
   * // generate a promise-returning function
   * var task = promisen.series([task1, task2, task3,...]);
   *
   * // execute it
   * task(value).then(function(array) {...}); // array of results
   *
   * // execute it with target object which is passed to every tasks
   * task.call(target, value).then(function(result) {...});
   */

  function series(tasks) {
    if (tasks == null) return promisen([]);
    var stack = [];
    var result = [];
    tasks = Array.prototype.map.call(tasks, wrap);
    tasks = waterfall(tasks);
    return waterfall([push(stack), tasks, result]);

    // apply the first argument only. ignore rest.
    function wrap(task) {
      return waterfall([top(stack), task, push(result)]);
    }
  }

  /**
   * creates a promise-returning function which runs multiple tasks in parallel.
   *
   * @class promisen
   * @static
   * @function parallel
   * @param tasks {Array|Array-like} list of tasks
   * @returns {Function} promise-returning function
   * @example
   * var promisen = require("promisen");
   *
   * // generate a promise-returning function
   * var task = promisen.parallel([task1, task2, task3,...]);
   *
   * // execute it
   * task(value).then(function(array) {...}); // array of results
   *
   * // execute it with target object which is passed to every tasks
   * task.call(target, value).then(function(result) {...});
   */

  function parallel(tasks) {
    if (tasks == null) return promisen([]);
    tasks = Array.prototype.map.call(tasks, wrap);
    return all;

    function all(value) {
      var boundTasks = Array.prototype.map.call(tasks, run.bind(this, value));
      return promisen.Promise.all(boundTasks);
    }

    // apply the first argument only. ignore rest.
    function wrap(task) {
      return promisen(task);
    }

    function run(value, func) {
      return func.call(this, value);
    }
  }

  /**
   * creates a promise-returning function which runs a task assigned by a conditional task.
   *
   * When null or undefined is given as a task, it will do nothing for value and just passes it.
   *
   * @class promisen
   * @static
   * @function if
   * @param [condTask] {Boolean|Function|Promise|thenable|*|null} boolean or function returns boolean
   * @param [trueTask] {Function|Promise|thenable|*|null} task runs when true
   * @param [falseTask] {Function|Promise|thenable|*|null} task runs when false
   * @returns {Function} promise-returning function
   * @example
   * var promisen = require("promisen");
   *
   * // generate a promise-returning function
   * var task = promisen.if(condTask, trueTask, falseTask);
   *
   * // execute itl[pi?K  jk ln lml;/,   m /P/.[h
   * task().then(function(result) {...});
   *
   * // execute it with target object which is passed to every tasks
   * task.call(target).then(function(result) {...});
   *
   * // all three arguments are optional.
   * var runWhenTrueTask = promisen.if(null, trueTask);
   * Promise.resolve(value).then(runWhenTrueTask).then(function(result) {...});
   *
   * // conditional task are also available in a waterfall of promisen tasks
   * var joined = promisen(task1, runWhenTrueTask, task2);
   * joined().then(function(result) {...});
   *
   * // use uglify --compress (or UPPERCASE property name) for IE8
   * var task = promisen["if"](condTask, trueTask, falseTask);
   * var task = promisen.IF(condTask, trueTask, falseTask);
   */

  function IF(condTask, trueTask, falseTask) {
    condTask = (condTask != null) ? promisen(condTask) : promisen();
    trueTask = (trueTask != null) ? promisen(trueTask) : promisen();
    falseTask = (falseTask != null) ? promisen(falseTask) : promisen();
    return conditional;

    function conditional(value) {
      var condFunc = condTask.bind(this, value);
      var trueFunc = trueTask.bind(this, value);
      var falseFunc = falseTask.bind(this, value);
      return condFunc().then(switching);

      function switching(condition) {
        return condition ? trueFunc() : falseFunc();
      }
    }
  }

  /**
   * creates a promise-returning function which runs a task repeatedly while the condition is true.
   *
   * When null or undefined is given as condTask, it will do nothing for value and just passes it.
   *
   * @class promisen
   * @static
   * @function while
   * @param condTask {Boolean|Function|Promise|thenable|*|null} boolean or function returns boolean
   * @param runTask {...(Function|Promise|thenable|*)} task runs while true
   * @returns {Function} promise-returning function
   * @example
   * var promisen = require("promisen");
   *
   * // counter = 8; while (--counter) { runTask }
   * var counter = promisen.number(8);
   * var whileTask = promisen.while(counter.decr, runTask);
   *
   * // for (initTask; condTask; afterTask) { runTask }
   * var forTask = promisen(initTask, promisen.while(condTask, runTask, afterTask));
   *
   * // do { runTask } while (condTask)
   * var doWhileTask = promisen.while(null, runTask, condTask));
   */

  function WHILE(condTask, runTask) {
    var runTasks = Array.prototype.slice.call(arguments, 1);
    runTasks.push(nextTask);
    runTask = waterfall(runTasks);
    var whileTask = IF(condTask, runTask);
    return whileTask;

    function nextTask(value) {
      return whileTask.call(this, value);
    }
  }

  /**
   * creates a promise-returning function which runs task repeatedly for each value of array in order.
   *
   * @class promisen
   * @static
   * @function eachSeries
   * @param arrayTask {Array|Function|Promise|thenable} array or task returns array for iteration
   * @param iteratorTask {Function} task runs repeatedly for each of array values
   * @returns {Function} promise-returning function
   * @example
   * var promisen = require("promisen");
   *
   * var task = promisen.eachSeries([1, 2, 3], mul2);
   *
   * task.call(target).then(function(array) {...}); // => [2, 4, 6]
   *
   * function mul2(value) {
   *   return value * 2;
   * }
   */

  function eachSeries(arrayTask, iteratorTask) {
    if (arrayTask == null) arrayTask = promisen();
    iteratorTask = promisen(iteratorTask);
    return waterfall([arrayTask, loopTask]);

    // composite multiple tasks
    function loopTask(arrayResults) {
      arrayResults = Array.prototype.map.call(arrayResults, wrap);
      return series(arrayResults).call(this);
    }

    function wrap(value) {
      return iterator;
      function iterator() {
        return iteratorTask.call(this, value);
      }
    }
  }

  /**
   * creates a promise-returning function which runs task repeatedly for each value of array in parallel.
   *
   * @class promisen
   * @static
   * @function each
   * @param arrayTask {Array|Function|Promise|thenable} array or task returns array for iteration
   * @param iteratorTask {Function} task runs repeatedly for each of array values
   * @returns {Function} promise-returning function
   * @example
   * var promisen = require("promisen");
   *
   * var task = promisen.each([2, 4, 6], div2);
   *
   * task.call(target).then(function(array) {...}); // => [1, 2, 3]
   *
   * function div2(value) {
   *   return value / 2;
   * }
   */

  function each(arrayTask, iteratorTask) {
    if (arrayTask == null) arrayTask = promisen();
    iteratorTask = promisen(iteratorTask);
    return waterfall([arrayTask, loopTask]);

    // composite multiple tasks
    function loopTask(arrayResults) {
      arrayResults = Array.prototype.map.call(arrayResults, wrap);
      return parallel(arrayResults).call(this);
    }

    // apply the first argument only. ignore rest.
    function wrap(value) {
      return iterator;
      function iterator() {
        return iteratorTask.call(this, value);
      }
    }
  }

  /**
   * creates a promise-returning function which increments a counter on top of stack.
   *
   * @class promisen
   * @static
   * @function incr
   * @param array {Array|Array-like} counter holder
   * @returns {Function} promise-returning function
   * @example
   * var promisen = require("promisen");
   *
   * var counter = [123];
   * console.log("count: " + counter); // => count: 123
   *
   * var incrTask = counter.incr();
   * incrTask().then(function(value) {...}); // => count: 124
   *
   * // incrTask is available in a series of tasks.
   * var task = promisen(otherTask, incrTask);
   */

  function incr(array) {
    return incrTask;

    function incrTask() {
      if (!array.length) {
        Array.prototype.push.call(array, 0 | 0);
      }
      return resolve(++array[array.length - 1]);
    }
  }

  /**
   * creates a promise-returning function which decrements a counter on top of stack.
   *
   * @class promisen
   * @static
   * @function decr
   * @param array {Array|Array-like} counter holder
   * @returns {Function} promise-returning function
   * @example
   * var promisen = require("promisen");
   *
   * var counter = [123];
   * console.log("count: " + counter); // => count: 123
   *
   * var decrTask = counter.decr();
   * decrTask().then(function(value) {...}); // => count: 122
   *
   * // decrTask is available in a series of tasks.
   * var task = promisen(otherTask, decrTask);
   */

  function decr(array) {
    return decrTask;

    function decrTask() {
      if (!array.length) {
        Array.prototype.push.call(array, 0 | 0);
      }
      return resolve(--array[array.length - 1]);
    }
  }

  /**
   * creates a promise-returning function which stores a value into the array.
   *
   * @class promisen
   * @static
   * @function push
   * @param array {Array|Array-like}
   * @returns {Function} promise-returning function
   * @example
   * var promisen = require("promisen");
   *
   * var stack = []; // stack is an array
   *
   * var task2 = promisen(task1, promisen.push(stack));
   *
   * task2().then(function() {...}); // stack.length == 2
   */

  function push(array) {
    return pushTask;

    function pushTask(value) {
      Array.prototype.push.call(array, value); // copy
      return resolve(value); // through
    }
  }

  /**
   * creates a promise-returning function which fetches the last value on the array.
   *
   * @class promisen
   * @static
   * @function pop
   * @param array {Array|Array-like}
   * @returns {Function} promise-returning function
   * @example
   * var promisen = require("promisen");
   *
   * var stack = ["foo", "bar"]; // stack is an array
   *
   * var task2 = promisen(promisen.pop(stack), task1);
   *
   * task2().then(function() {...}); // stack.length == 1
   */

  function pop(array) {
    return popTask;

    function popTask() {
      var value = Array.prototype.pop.call(array);
      return resolve(value);
    }
  }

  /**
   * creates a promise-returning function which inspects the last value on the array.
   *
   * @class promisen
   * @static
   * @function push
   * @param array {Array|Array-like}
   * @returns {Function} promise-returning function
   * @example
   * var promisen = require("promisen");
   *
   * var stack = ["foo", "bar"]; // stack is an array
   *
   * var task2 = promisen(promisen.top(stack), task1);
   *
   * task2().then(function() {...}); // stack.length == 2
   */

  function top(array) {
    return topTask;

    function topTask() {
      var value = array[array.length - 1];
      return resolve(value);
    }
  }

  /**
   * creates a promise-returning function which inspects value to console.warn() for debug purpose.
   *
   * @class promisen
   * @static
   * @function warn
   * @param [prefix] {String}
   * @returns {Function} promise-returning function
   * @example
   * var promisen = require("promisen");
   *
   * var task3 = promisen(task1, promisen.warn("result:"), task2);
   *
   * task3().then(function() {...});
   */

  function warn(prefix) {
    return warnTask;

    function warnTask(value) {
      if ("undefined" !== console && console.warn instanceof Function) {
        if (prefix) {
          console.warn(prefix, value);
        } else {
          console.warn(value);
        }
      }
      return resolve(value);
    }
  }

  /**
   * creates a promise-returning function which inspects value to console.log() for debug purpose.
   *
   * @class promisen
   * @static
   * @function log
   * @param [prefix] {String}
   * @returns {Function} promise-returning function
   * @example
   * var promisen = require("promisen");
   *
   * var task3 = promisen(task1, promisen.log("result:"), task2);
   *
   * task3().then(function() {...});
   */

  function log(prefix) {
    return logTask;

    function logTask(value) {
      if ("undefined" !== console && console.log instanceof Function) {
        if (prefix) {
          console.log(prefix, value);
        } else {
          console.log(value);
        }
      }
      return resolve(value);
    }
  }

  /**
   * creates a promise-returning function which does just sleep for given milliseconds.
   *
   * @class promisen
   * @static
   * @function wait
   * @param msec {Number}
   * @returns {Function} promise-returning function
   * @example
   * var promisen = require("promisen");
   *
   * var sleep = promisen.wait(1000); // 1 sec
   * sleep(value).then(function(value) {...});
   *
   * // similar to below
   * setTimeout(function() {...}, 1000);
   */

  function wait(msec) {
    return waitTask;

    function waitTask(value) {
      var that = this;
      return new promisen.Promise(function(resolve) {
        setTimeout(function() {
          resolve.call(that, value);
        }, msec);
      });
    }
  }

  /**
   * creates a promise-returning function which limits number of concurrent job workers run in parallel.
   *
   * @class promisen
   * @static
   * @function throttle
   * @param task {Function} the job
   * @param concurrency {Number} number of job workers run in parallel (default: 1)
   * @param timeout {Number} timeout in millisecond until job started (default: no timeout)
   * @returns {Function} promise-returning function
   * @example
   * var promisen = require("promisen");
   *
   * var serialAjaxTask = promisen.throttle(ajaxTask, 1, 10000); // 1 worker, 10 seconds
   *
   * serialAjaxTask(req).then(function(res) {...});
   */

  function throttle(task, concurrency, timeout) {
    if (!concurrency) concurrency = 1;
    task = promisen(task);
    var queue = singleTask.queue = [];
    var running = singleTask.running = {};
    var serial = 0;
    return singleTask;

    function singleTask(value) {
      var that = this;
      var args = arguments;
      var Promise = promisen.Promise;
      var seq = ++serial;

      return new Promise(function(resolve, reject) {
        queue.push(job);
        var timer = timeout && setTimeout(onTimeout, timeout);
        next();

        function job() {
          if (timer) clearTimeout(timer);
          running[seq] = true;
          task.apply(that, args).then(onResolve, onReject);
        }

        function onTimeout() {
          onReject(new Error("timeout: " + timeout + "ms"));
        }

        function onResolve(value) {
          delete running[seq];
          setTimeout(next, 0);
          resolve(value);
        }

        function onReject(value) {
          delete running[seq];
          setTimeout(next, 0);
          reject(value);
        }
      });
    }

    function next() {
      if (Object.keys(running).length >= concurrency) return;
      var job = queue.pop();
      if (job) job();
    }
  }

  /**
   * creates a promise-returning function which has timeout detection until job done.
   *
   * @class promisen
   * @static
   * @function timeout
   * @param task {Function} the job
   * @param msec {Number} timeout in millisecond until job done (default: no timeout)
   * @returns {Function} promise-returning function
   */

  function timeout(task, msec) {
    task = promisen(task);
    return timeoutTask;

    function timeoutTask(value) {
      var that = this;
      var args = arguments;
      var Promise = promisen.Promise;

      return new Promise(function(resolve, reject) {
        var timer = setTimeout(onTimeout, msec);
        task.apply(that, args).then(onResolve, onReject);

        function onTimeout() {
          var _reject = reject;
          resolve = reject = NOP;
          _reject(new Error("timeout: " + msec + "ms"));
        }

        function onResolve(value) {
          clearTimeout(timer);
          resolve(value);
        }

        function onReject(value) {
          clearTimeout(timer);
          reject(value);
        }
      });
    }
  }

  /**
   * creates a Node.js-style function from a promise-returning function or any object.
   *
   * @class promisen
   * @static
   * @function nodeify
   * @param task {Function|Promise|thenable|*} promise-returning function or any object
   * @returns {Function} Node.js-style function
   * @example
   * var promisen = require("promisen");
   *
   * var task = nodeify(func);
   *
   * task(value, function(err, res) {...});
   *
   * function func(value) {
   *   return new Promise(function(resolve, reject) {...});
   * }
   */

  function nodeify(task) {
    task = promisen(task);
    return nodeifyTask;

    function nodeifyTask(args, callback) {
      args = Array.prototype.slice.call(arguments);
      callback = (args[args.length - 1] instanceof Function) && args.pop();
      if (!callback) callback = NOP;
      var onResolve = callback.bind(this, null);
      var onReject = callback.bind(this);
      task.apply(this, args).then(onResolve, onReject);
    }
  }

  /**
   * creates a promise-returning function from a Node.js-style function which requests a callback function at the last argument.
   *
   * @class promisen
   * @static
   * @function denodeify
   * @param task {Function} Node.js-style function
   * @returns {Function} promise-returning function
   * @example
   * var promisen = require("promisen");
   * var fs = require("fs");
   *
   * // you should bind target object with the task
   * var readFile = promisen.denodeify(fs.readFile.bind(fs));
   *
   * // readFile() is now available as a promise-returning function
   * readFile("README.md", "utf-8").then(function(value) {...}).catch(function(reason) {...});
   */

  function denodeify(task) {
    return denodeifyTask;

    function denodeifyTask(args) {
      var that = this;
      args = Array.prototype.slice.call(arguments);

      return new promisen.Promise(function(resolve, reject) {
        args.push(callback);
        task.apply(that, args);

        function callback(err, value) {
          return err ? reject(err) : resolve(value);
        }
      });
    }
  }

  /**
   * creates a promise-returning function which caches a result of task.
   *
   * The cache of result is exposed as the memo property of the function returned by memoize.
   *
   * @class promisen
   * @static
   * @function memoize
   * @param task {Function} task to wrap
   * @param expire {Number} millisecond until cache expired
   * @param [hasher] {Function} default: JSON.stringify()
   * @returns {Function} promise-returning function
   * @example
   * var promisen = require("promisen");
   * var request = require("request");
   *
   * var ajaxGet = promisen.denodeify(request);
   * var cachedAjax = promisen.memoize(ajaxGet);
   *
   * var req = {url: "http://www.example.com/"};
   * cachedAjax(req).then(function(res) {...}); // res.body contains response body
   */

  function memoize(task, expire, hasher) {
    var memo = memoizeTask.memo = {};
    expire -= 0;
    var timers = {};
    if (!hasher) hasher = JSON.stringify.bind(JSON);
    return memoizeTask;

    function memoizeTask(value) {
      return waterfall([hasher, readCache]).call(this, value);

      // read previous result from cache
      function readCache(hash) {
        if (hash in memo) return memo[hash];
        return waterfall([task, writeCache]).call(this, value);

        // write new result to cache
        function writeCache(result) {
          result = memo[hash] = resolve(result);
          if (expire) {
            // cancel previous timer
            if (timers[hash]) clearTimeout(timers[hash]);
            // add new timer
            timers[hash] = setTimeout(clearCache, expire);
          }
          return result;
        }

        // clear expired result
        function clearCache() {
          delete memo[hash];
          delete timers[hash];
        }
      }
    }
  }

  function NOP() {
  }

})("undefined" !== typeof module && module, "undefined" !== typeof window && window);
