(function () {

/* Imports */
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var DDP = Package['ddp-client'].DDP;
var DDPServer = Package['ddp-server'].DDPServer;
var EJSON = Package.ejson.EJSON;

/* Package-scope variables */
var ReactiveMethod;

(function(){

////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                //
// packages/simple_reactive-method/packages/simple_reactive-method.js                             //
//                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                  //
(function () {

/////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                         //
// packages/simple:reactive-method/reactive-method.js                                      //
//                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////
                                                                                           //
ReactiveMethod = {                                                                         // 1
  /**                                                                                      // 2
   * A global object that matches serialized arguments of Method.apply to an               // 3
   * array of computations that depend on the result of that method. Used mainly           // 4
   * to allow invalidation of method results from outside of the computation               // 5
   * using that result.                                                                    // 6
   * @type {Object}                                                                        // 7
   */                                                                                      // 8
  _computations: {},                                                                       // 9
                                                                                           // 10
  /**                                                                                      // 11
   * Call a Meteor method. Can only be used inside a Tracker autorun (which                // 12
   * includes Blaze helpers). Functions much like a promise - on the first run             // 13
   * of the computation returns undefined, and when the method result comes back           // 14
   * reruns the computation and returns the actual result. If this method is               // 15
   * called in consecutive reruns of the computation with the same arguments, it           // 16
   * remembers the previous result, which avoids calling the method over and               // 17
   * over again forever.                                                                   // 18
   *                                                                                       // 19
   * Watch out - if you call this method with a constantly changing value as one           // 20
   * of the arguments (for example the current time or a random value) it will             // 21
   * never return anything.                                                                // 22
   *                                                                                       // 23
   * The API for the arguments is exactly the same as Meteor.call.                         // 24
   *                                                                                       // 25
   * @param {String} methodName The name of the method to call                             // 26
   * @param {EJSONable} [arg1,arg2...] Optional method arguments                           // 27
   */                                                                                      // 28
  call: function (methodName /*, ...arguments */) {                                        // 29
    if (! Tracker.currentComputation) {                                                    // 30
      // If not in an autorun, throw error                                                 // 31
      throw new Error("Don't use ReactiveMethod.call outside of a Tracker computation.");  // 32
    }                                                                                      // 33
                                                                                           // 34
    var args = _.toArray(arguments);                                                       // 35
    return ReactiveMethod.apply(methodName, _.rest(args));                                 // 36
  },                                                                                       // 37
                                                                                           // 38
  /**                                                                                      // 39
   * Just like ReactiveMethod.call except uses the calling API of Meteor.apply             // 40
   * instead of Meteor.call.                                                               // 41
   * @param  {[type]} methodName [description]                                             // 42
   * @param  {[type]} methodArgs [description]                                             // 43
   * @return {[type]}            [description]                                             // 44
   */                                                                                      // 45
  apply: function (methodName, methodArgs) {                                               // 46
    var cc = Tracker.currentComputation;                                                   // 47
                                                                                           // 48
    if (! cc) {                                                                            // 49
      // If not in an autorun, throw error                                                 // 50
      throw new Error("Don't use ReactiveMethod.apply outside of a Tracker computation."); // 51
    }                                                                                      // 52
                                                                                           // 53
    var serializedArgs = EJSON.stringify([methodName, methodArgs]);                        // 54
                                                                                           // 55
                                                                                           // 56
    cc._reactiveMethodData = cc._reactiveMethodData || {};                                 // 57
    cc._reactiveMethodStale = cc._reactiveMethodStale || {};                               // 58
                                                                                           // 59
    var methodReturnValue;                                                                 // 60
                                                                                           // 61
    if (cc._reactiveMethodData && _.has(cc._reactiveMethodData, serializedArgs)) {         // 62
      // We are calling the method again with the same arguments, return the               // 63
      // previous result                                                                   // 64
                                                                                           // 65
      // Mark this result as used                                                          // 66
      delete cc._reactiveMethodStale[serializedArgs];                                      // 67
      methodReturnValue = cc._reactiveMethodData[serializedArgs];                          // 68
    } else {                                                                               // 69
      // Only record the method call if it doesn't match the condition above about         // 70
      // being called again with the same arguments                                        // 71
      recordMethodComputation(cc, serializedArgs);                                         // 72
                                                                                           // 73
      Meteor.apply(methodName, methodArgs, function (err, result) {                        // 74
        cc._reactiveMethodData[serializedArgs] = result;                                   // 75
        cc.invalidate();                                                                   // 76
      });                                                                                  // 77
    }                                                                                      // 78
                                                                                           // 79
    // Copied logic from meteor/meteor/packages/ddp/livedata_connection.js                 // 80
    cc.onInvalidate(function () {                                                          // 81
      // Make sure this is used                                                            // 82
      cc._reactiveMethodStale[serializedArgs] = true;                                      // 83
                                                                                           // 84
      Tracker.afterFlush(function () {                                                     // 85
        if (cc._reactiveMethodStale[serializedArgs]) {                                     // 86
          delete cc._reactiveMethodData[serializedArgs];                                   // 87
          delete cc._reactiveMethodStale[serializedArgs];                                  // 88
          deleteMethodComputation(cc, serializedArgs);                                     // 89
        }                                                                                  // 90
      });                                                                                  // 91
    });                                                                                    // 92
                                                                                           // 93
    cc.onInvalidate(function () {                                                          // 94
      if (cc.stopped) {                                                                    // 95
        // Delete this computation from global computation store to avoid                  // 96
        // keeping a reference to every computation ever                                   // 97
        cleanUpComputation(cc);                                                            // 98
      }                                                                                    // 99
    });                                                                                    // 100
                                                                                           // 101
    return methodReturnValue;                                                              // 102
  },                                                                                       // 103
                                                                                           // 104
  /**                                                                                      // 105
   * Invalidate all computations that are currently depending on the result                // 106
   * of a particular ReactiveMethod.call.                                                  // 107
   */                                                                                      // 108
  invalidateCall: function (methodName /*, ...arguments */) {                              // 109
    var args = _.toArray(arguments);                                                       // 110
    ReactiveMethod.invalidateApply(methodName, _.rest(args));                              // 111
  },                                                                                       // 112
                                                                                           // 113
  /**                                                                                      // 114
   * Invalidate all computations that are currently depending on the result of             // 115
   * a particular ReactiveMethod.apply.                                                    // 116
   */                                                                                      // 117
  invalidateApply: function (methodName, methodArgs) {                                     // 118
    var serializedArgs = EJSON.stringify([methodName, methodArgs]);                        // 119
                                                                                           // 120
    _.each(ReactiveMethod._computations[serializedArgs], function (cc) {                   // 121
      delete cc._reactiveMethodData[serializedArgs];                                       // 122
      cc.invalidate();                                                                     // 123
    });                                                                                    // 124
  }                                                                                        // 125
};                                                                                         // 126
                                                                                           // 127
/**                                                                                        // 128
 * Record that a computation is using the result of a method call, to allow                // 129
 * invalidation from outside of the computation                                            // 130
 * @param  {String} serializedArgs Arguments to Method.apply, in serialized form           // 131
 */                                                                                        // 132
function recordMethodComputation(computation, serializedArgs) {                            // 133
  // Add computation to the list of computations using these arguments, and                // 134
  // create the array if it doesn't exist.                                                 // 135
  var initial = ReactiveMethod._computations[serializedArgs] || [];                        // 136
  ReactiveMethod._computations[serializedArgs] =                                           // 137
    _.union(initial, [computation]);                                                       // 138
}                                                                                          // 139
                                                                                           // 140
/**                                                                                        // 141
 * Remove the computation from the global dictionary of which computations are             // 142
 * watching which method results                                                           // 143
 * @param  {Tracker.Computation} computation                                               // 144
 * @param  {String} serializedArgs Arguments to Method.apply, in serialized form           // 145
 */                                                                                        // 146
function deleteMethodComputation(computation, serializedArgs) {                            // 147
  var methodsForArgs = ReactiveMethod._computations[serializedArgs];                       // 148
  var withoutCC = _.without(methodsForArgs, computation);                                  // 149
                                                                                           // 150
  if (withoutCC.length > 0) {                                                              // 151
    // Remove computation from the array                                                   // 152
    ReactiveMethod._computations[serializedArgs] = withoutCC;                              // 153
  } else {                                                                                 // 154
    // Delete the array if it is empty to avoid memory leak                                // 155
    delete ReactiveMethod._computations[serializedArgs];                                   // 156
  }                                                                                        // 157
}                                                                                          // 158
                                                                                           // 159
/**                                                                                        // 160
 * Remove all references to the computation from global cache of computations,             // 161
 * used to avoid memory leaks from storing stopped computations                            // 162
 * @param  {Tracker.Computation} computation                                               // 163
 */                                                                                        // 164
function cleanUpComputation(computation) {                                                 // 165
  _.each(computation._reactiveMethodData, function (data, serializedArgs) {                // 166
    deleteMethodComputation(computation, serializedArgs);                                  // 167
  });                                                                                      // 168
}                                                                                          // 169
                                                                                           // 170
/////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);

////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
Package._define("simple:reactive-method", {
  ReactiveMethod: ReactiveMethod
});

})();
