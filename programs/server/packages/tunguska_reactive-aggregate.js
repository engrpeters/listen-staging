(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;
var ECMAScript = Package.ecmascript.ECMAScript;
var Promise = Package.promise.Promise;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;

var require = meteorInstall({"node_modules":{"meteor":{"tunguska:reactive-aggregate":{"aggregate.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                               //
// packages/tunguska_reactive-aggregate/aggregate.js                                                             //
//                                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                 //
var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/objectSpread"));

module.export({
  ReactiveAggregate: () => ReactiveAggregate
});

const ReactiveAggregate = (sub, collection = null, pipeline = [], options = {}) => {
  let Meteor;
  module.link("meteor/meteor", {
    Meteor(v) {
      Meteor = v;
    }

  }, 0);
  let Mongo;
  module.link("meteor/mongo", {
    Mongo(v) {
      Mongo = v;
    }

  }, 1);
  let Promise;
  module.link("meteor/promise", {
    Promise(v) {
      Promise = v;
    }

  }, 2);
  // Define new Meteor Error type
  const TunguskaReactiveAggregateError = Meteor.makeErrorType('tunguska:reactive-aggregate', function (msg) {
    this.message = msg;
    this.path = '';
    this.sanitizedError = new Meteor.Error('Error', 'tunguska:reactive-aggregate');
  }); // Check inbound parameter types

  if (!(sub && sub.ready && sub.stop)) {
    throw new TunguskaReactiveAggregateError('unexpected context - did you set "sub" to "this"?');
  }

  if (!(collection instanceof Mongo.Collection)) {
    throw new TunguskaReactiveAggregateError('"collection" must be a Mongo.Collection');
  }

  if (!(pipeline instanceof Array)) {
    throw new TunguskaReactiveAggregateError('"pipeline" must be an array');
  }

  if (!(options instanceof Object)) {
    throw new TunguskaReactiveAggregateError('"options" must be an object');
  } // Set up local options based on defaults and supplied options


  const localOptions = (0, _objectSpread2.default)({}, {
    noAutomaticObserver: false,
    aggregationOptions: {},
    observeSelector: {},
    observeOptions: {},
    observers: [],
    // cursor1, ... cursorn
    debounceCount: 0,
    debounceDelay: 0,
    // mS
    clientCollection: collection._name
  }, options); // Check options

  if (typeof localOptions.noAutomaticObserver !== 'boolean') {
    throw new TunguskaReactiveAggregateError('"options.noAutomaticObserver" must be true or false');
  }

  if (typeof localOptions.observeSelector !== 'object') {
    throw new TunguskaReactiveAggregateError('deprecated "options.observeSelector" must be an object');
  }

  if (typeof localOptions.observeOptions !== 'object') {
    throw new TunguskaReactiveAggregateError('deprecated "options.observeOptions" must be an object');
  }

  if (!(localOptions.observers instanceof Array)) {
    throw new TunguskaReactiveAggregateError('"options.observers" must be an array of cursors');
  } else {
    localOptions.observers.forEach((cursor, i) => {
      // The obvious "cursor instanceof Mongo.Cursor" doesn't seem to work, so...
      if (!(cursor._cursorDescription && cursor._cursorDescription.collectionName)) {
        throw new TunguskaReactiveAggregateError(`"options.observers[${i}]" must be a cursor`);
      }
    });
  }

  if (!(typeof localOptions.debounceCount === 'number')) {
    throw new TunguskaReactiveAggregateError('"options.debounceCount" must be a positive integer');
  } else {
    localOptions.debounceCount = parseInt(localOptions.debounceCount, 10);

    if (localOptions.debounceCount < 0) {
      throw new TunguskaReactiveAggregateError('"options.debounceCount" must be a positive integer');
    }
  }

  if (!(typeof localOptions.debounceDelay === 'number')) {
    throw new TunguskaReactiveAggregateError('"options.debounceDelay" must be a positive integer');
  } else {
    localOptions.debounceDelay = parseInt(localOptions.debounceDelay, 10);

    if (localOptions.debounceDelay < 0) {
      throw new TunguskaReactiveAggregateError('"options.debounceDelay" must be a positive integer');
    }
  }

  if (typeof localOptions.clientCollection !== 'string') {
    throw new TunguskaReactiveAggregateError('"options.clientCollection" must be a string');
  } // Warn about deprecated parameters if used


  if (Object.keys(localOptions.observeSelector).length !== 0) console.log('tunguska:reactive-aggregate: observeSelector is deprecated');
  if (Object.keys(localOptions.observeOptions).length !== 0) console.log('tunguska:reactive-aggregate: observeOptions is deprecated'); // observeChanges() will immediately fire an "added" event for each document in the cursor
  // these are skipped using the initializing flag

  let initializing = true;
  sub._ids = {};
  sub._iteration = 1;

  const update = () => {
    if (initializing) return; // add and update documents on the client

    try {
      const docs = Promise.await(collection.rawCollection().aggregate(pipeline, localOptions.aggregationOptions).toArray());
      docs.forEach(doc => {
        /*  _ids are complicated:
            For tracking here, they must be String
            For minimongo, they must exist and be
              String or ObjectId
              (however, we'll arbitrarily exclude ObjectId)
            _ids coming from an aggregation pipeline may be anything or nothing!
          ObjectIds coming via toArray() become POJOs
        */
        if (!doc._id) {
          // missing or otherwise falsy
          throw new TunguskaReactiveAggregateError('every aggregation document must have an _id');
        } else if (doc._id instanceof Mongo.ObjectID) {
          doc._id = doc._id.toHexString();
        } else if (typeof doc._id === 'object') {
          doc._id = doc._id.toString();
        } else if (typeof doc._id !== 'string') {
          throw new TunguskaReactiveAggregateError('aggregation document _id is not an allowed type');
        }

        if (!sub._ids[doc._id]) {
          sub.added(localOptions.clientCollection, doc._id, doc);
        } else {
          sub.changed(localOptions.clientCollection, doc._id, doc);
        }

        sub._ids[doc._id] = sub._iteration;
      }); // remove documents not in the result anymore

      Object.keys(sub._ids).forEach(id => {
        if (sub._ids[id] !== sub._iteration) {
          delete sub._ids[id];
          sub.removed(localOptions.clientCollection, id);
        }
      });
      sub._iteration++;
    } catch (err) {
      throw new TunguskaReactiveAggregateError(err.message);
    }
  };

  let currentDebounceCount = 0;
  let timer;

  const debounce = () => {
    if (initializing) return;
    if (!timer && localOptions.debounceCount > 0) timer = Meteor.setTimeout(update, localOptions.debounceDelay);

    if (++currentDebounceCount > localOptions.debounceCount) {
      currentDebounceCount = 0;
      Meteor.clearTimeout(timer);
      update();
    }
  };

  if (!localOptions.noAutomaticObserver) {
    const cursor = collection.find(localOptions.observeSelector, localOptions.observeOptions);
    localOptions.observers.push(cursor);
  }

  const handles = []; // track any changes on the observed cursors

  localOptions.observers.forEach(cursor => {
    handles.push(cursor.observeChanges({
      added: debounce,
      changed: debounce,
      removed: debounce,

      error(err) {
        throw new TunguskaReactiveAggregateError(err.message);
      }

    }));
  }); // stop observing the cursors when the client unsubscribes

  sub.onStop(() => {
    handles.forEach(handle => {
      handle.stop();
    });
  }); // End of the setup phase. We don't need to do any of that again!
  // Clear the initializing flag. From here, we're on autopilot

  initializing = false; // send an initial result set to the client

  update(); // mark the subscription as ready

  sub.ready();
};
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/tunguska:reactive-aggregate/aggregate.js");

/* Exports */
Package._define("tunguska:reactive-aggregate", exports);

})();

//# sourceURL=meteor://💻app/packages/tunguska_reactive-aggregate.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvdHVuZ3Vza2E6cmVhY3RpdmUtYWdncmVnYXRlL2FnZ3JlZ2F0ZS5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnQiLCJSZWFjdGl2ZUFnZ3JlZ2F0ZSIsInN1YiIsImNvbGxlY3Rpb24iLCJwaXBlbGluZSIsIm9wdGlvbnMiLCJNZXRlb3IiLCJsaW5rIiwidiIsIk1vbmdvIiwiUHJvbWlzZSIsIlR1bmd1c2thUmVhY3RpdmVBZ2dyZWdhdGVFcnJvciIsIm1ha2VFcnJvclR5cGUiLCJtc2ciLCJtZXNzYWdlIiwicGF0aCIsInNhbml0aXplZEVycm9yIiwiRXJyb3IiLCJyZWFkeSIsInN0b3AiLCJDb2xsZWN0aW9uIiwiQXJyYXkiLCJPYmplY3QiLCJsb2NhbE9wdGlvbnMiLCJub0F1dG9tYXRpY09ic2VydmVyIiwiYWdncmVnYXRpb25PcHRpb25zIiwib2JzZXJ2ZVNlbGVjdG9yIiwib2JzZXJ2ZU9wdGlvbnMiLCJvYnNlcnZlcnMiLCJkZWJvdW5jZUNvdW50IiwiZGVib3VuY2VEZWxheSIsImNsaWVudENvbGxlY3Rpb24iLCJfbmFtZSIsImZvckVhY2giLCJjdXJzb3IiLCJpIiwiX2N1cnNvckRlc2NyaXB0aW9uIiwiY29sbGVjdGlvbk5hbWUiLCJwYXJzZUludCIsImtleXMiLCJsZW5ndGgiLCJjb25zb2xlIiwibG9nIiwiaW5pdGlhbGl6aW5nIiwiX2lkcyIsIl9pdGVyYXRpb24iLCJ1cGRhdGUiLCJkb2NzIiwiYXdhaXQiLCJyYXdDb2xsZWN0aW9uIiwiYWdncmVnYXRlIiwidG9BcnJheSIsImRvYyIsIl9pZCIsIk9iamVjdElEIiwidG9IZXhTdHJpbmciLCJ0b1N0cmluZyIsImFkZGVkIiwiY2hhbmdlZCIsImlkIiwicmVtb3ZlZCIsImVyciIsImN1cnJlbnREZWJvdW5jZUNvdW50IiwidGltZXIiLCJkZWJvdW5jZSIsInNldFRpbWVvdXQiLCJjbGVhclRpbWVvdXQiLCJmaW5kIiwicHVzaCIsImhh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QXVCSyxPQUF2QixDQUErQkMsTUFBTSxJQUFJO0FBQ3ZDbUMsV0FBTyxDQUFDRCxJQUFSLENBQWFsQyxNQUFNLENBQUNvQyxjQUFQLENBQXNCO0FBQ2pDYixXQUFLLEVBQUVPLFFBRDBCO0FBRWpDTixhQUFPLEVBQUVNLFFBRndCO0FBR2pDSixhQUFPLEVBQUVJLFFBSHdCOztBQUlqQ08sV0FBSyxDQUFDVixHQUFELEVBQU07QUFDVCxjQUFNLElBQUlsRCw4QkFBSixDQUFvQ2tELEdBQUcsQ0FBQy9DLE9BQXhDLENBQU47QUFDRDs7QUFOZ0MsS0FBdEIsQ0FBYjtBQVFELEdBVEQsRUEvSndGLENBMEt4Rjs7QUFDQVosS0FBRyxDQUFDc0UsTUFBSixDQUFXLE1BQU07QUFDZkgsV0FBTyxDQUFDcEMsT0FBUixDQUFnQndDLE1BQU0sSUFBSTtBQUN4QkEsWUFBTSxDQUFDdEQsSUFBUDtBQUNELEtBRkQ7QUFHRCxHQUpELEVBM0t3RixDQWdMeEY7QUFFQTs7QUFDQXdCLGNBQVksR0FBRyxLQUFmLENBbkx3RixDQW9MeEY7O0FBQ0FHLFFBQU0sR0FyTGtGLENBc0x4Rjs7QUFDQTVDLEtBQUcsQ0FBQ2dCLEtBQUo7QUFFRCxDQXpMTSxDIiwiZmlsZSI6Ii9wYWNrYWdlcy90dW5ndXNrYV9yZWFjdGl2ZS1hZ2dyZWdhdGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgY29uc3QgUmVhY3RpdmVBZ2dyZWdhdGUgPSAoc3ViLCBjb2xsZWN0aW9uID0gbnVsbCwgcGlwZWxpbmUgPSBbXSwgb3B0aW9ucyA9IHt9KSA9PiB7XG4gIGltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuICBpbXBvcnQgeyBNb25nbyB9IGZyb20gJ21ldGVvci9tb25nbyc7XG4gIGltcG9ydCB7IFByb21pc2UgfSBmcm9tICdtZXRlb3IvcHJvbWlzZSc7XG5cbiAgLy8gRGVmaW5lIG5ldyBNZXRlb3IgRXJyb3IgdHlwZVxuICBjb25zdCBUdW5ndXNrYVJlYWN0aXZlQWdncmVnYXRlRXJyb3IgPSBNZXRlb3IubWFrZUVycm9yVHlwZSgndHVuZ3Vza2E6cmVhY3RpdmUtYWdncmVnYXRlJywgZnVuY3Rpb24obXNnKSB7XG4gICAgdGhpcy5tZXNzYWdlID0gbXNnO1xuICAgIHRoaXMucGF0aCA9ICcnO1xuICAgIHRoaXMuc2FuaXRpemVkRXJyb3IgPSBuZXcgTWV0ZW9yLkVycm9yKCdFcnJvcicsICd0dW5ndXNrYTpyZWFjdGl2ZS1hZ2dyZWdhdGUnKTtcbiAgfSk7XG5cbiAgLy8gQ2hlY2sgaW5ib3VuZCBwYXJhbWV0ZXIgdHlwZXNcbiAgaWYgKCEoc3ViICYmIHN1Yi5yZWFkeSAmJiBzdWIuc3RvcCkpIHtcbiAgICB0aHJvdyBuZXcgVHVuZ3Vza2FSZWFjdGl2ZUFnZ3JlZ2F0ZUVycm9yKCd1bmV4cGVjdGVkIGNvbnRleHQgLSBkaWQgeW91IHNldCBcInN1YlwiIHRvIFwidGhpc1wiPycpO1xuICB9XG4gIGlmICghKGNvbGxlY3Rpb24gaW5zdGFuY2VvZiBNb25nby5Db2xsZWN0aW9uKSkge1xuICAgIHRocm93IG5ldyBUdW5ndXNrYVJlYWN0aXZlQWdncmVnYXRlRXJyb3IoJ1wiY29sbGVjdGlvblwiIG11c3QgYmUgYSBNb25nby5Db2xsZWN0aW9uJyk7XG4gIH1cbiAgaWYgKCEocGlwZWxpbmUgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICB0aHJvdyBuZXcgVHVuZ3Vza2FSZWFjdGl2ZUFnZ3JlZ2F0ZUVycm9yKCdcInBpcGVsaW5lXCIgbXVzdCBiZSBhbiBhcnJheScpO1xuICB9XG4gIGlmICghKG9wdGlvbnMgaW5zdGFuY2VvZiBPYmplY3QpKSB7XG4gICAgdGhyb3cgbmV3IFR1bmd1c2thUmVhY3RpdmVBZ2dyZWdhdGVFcnJvcignXCJvcHRpb25zXCIgbXVzdCBiZSBhbiBvYmplY3QnKTtcbiAgfVxuXG4gIC8vIFNldCB1cCBsb2NhbCBvcHRpb25zIGJhc2VkIG9uIGRlZmF1bHRzIGFuZCBzdXBwbGllZCBvcHRpb25zXG4gIGNvbnN0IGxvY2FsT3B0aW9ucyA9IHtcbiAgICAuLi57XG4gICAgICBub0F1dG9tYXRpY09ic2VydmVyOiBmYWxzZSxcbiAgICAgIGFnZ3JlZ2F0aW9uT3B0aW9uczoge30sXG4gICAgICBvYnNlcnZlU2VsZWN0b3I6IHt9LFxuICAgICAgb2JzZXJ2ZU9wdGlvbnM6IHt9LFxuICAgICAgb2JzZXJ2ZXJzOiBbXSwgLy8gY3Vyc29yMSwgLi4uIGN1cnNvcm5cbiAgICAgIGRlYm91bmNlQ291bnQ6IDAsXG4gICAgICBkZWJvdW5jZURlbGF5OiAwLCAvLyBtU1xuICAgICAgY2xpZW50Q29sbGVjdGlvbjogY29sbGVjdGlvbi5fbmFtZSxcbiAgICB9LFxuICAgIC4uLm9wdGlvbnNcbiAgfTtcblxuICAvLyBDaGVjayBvcHRpb25zXG4gIGlmICh0eXBlb2YgbG9jYWxPcHRpb25zLm5vQXV0b21hdGljT2JzZXJ2ZXIgIT09ICdib29sZWFuJykge1xuICAgIHRocm93IG5ldyBUdW5ndXNrYVJlYWN0aXZlQWdncmVnYXRlRXJyb3IoJ1wib3B0aW9ucy5ub0F1dG9tYXRpY09ic2VydmVyXCIgbXVzdCBiZSB0cnVlIG9yIGZhbHNlJyk7XG4gIH1cbiAgaWYgKHR5cGVvZiBsb2NhbE9wdGlvbnMub2JzZXJ2ZVNlbGVjdG9yICE9PSAnb2JqZWN0Jykge1xuICAgIHRocm93IG5ldyBUdW5ndXNrYVJlYWN0aXZlQWdncmVnYXRlRXJyb3IoJ2RlcHJlY2F0ZWQgXCJvcHRpb25zLm9ic2VydmVTZWxlY3RvclwiIG11c3QgYmUgYW4gb2JqZWN0Jyk7XG4gIH1cbiAgaWYgKHR5cGVvZiBsb2NhbE9wdGlvbnMub2JzZXJ2ZU9wdGlvbnMgIT09ICdvYmplY3QnKSB7XG4gICAgdGhyb3cgbmV3IFR1bmd1c2thUmVhY3RpdmVBZ2dyZWdhdGVFcnJvcignZGVwcmVjYXRlZCBcIm9wdGlvbnMub2JzZXJ2ZU9wdGlvbnNcIiBtdXN0IGJlIGFuIG9iamVjdCcpO1xuICB9XG4gIGlmICghKGxvY2FsT3B0aW9ucy5vYnNlcnZlcnMgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICB0aHJvdyBuZXcgVHVuZ3Vza2FSZWFjdGl2ZUFnZ3JlZ2F0ZUVycm9yKCdcIm9wdGlvbnMub2JzZXJ2ZXJzXCIgbXVzdCBiZSBhbiBhcnJheSBvZiBjdXJzb3JzJyk7XG4gIH0gZWxzZSB7XG4gICAgbG9jYWxPcHRpb25zLm9ic2VydmVycy5mb3JFYWNoKChjdXJzb3IsIGkpID0+IHtcbiAgICAgIC8vIFRoZSBvYnZpb3VzIFwiY3Vyc29yIGluc3RhbmNlb2YgTW9uZ28uQ3Vyc29yXCIgZG9lc24ndCBzZWVtIHRvIHdvcmssIHNvLi4uXG4gICAgICBpZiAoIShjdXJzb3IuX2N1cnNvckRlc2NyaXB0aW9uICYmIGN1cnNvci5fY3Vyc29yRGVzY3JpcHRpb24uY29sbGVjdGlvbk5hbWUpKSB7XG4gICAgICAgIHRocm93IG5ldyBUdW5ndXNrYVJlYWN0aXZlQWdncmVnYXRlRXJyb3IoYFwib3B0aW9ucy5vYnNlcnZlcnNbJHtpfV1cIiBtdXN0IGJlIGEgY3Vyc29yYCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbiAgaWYgKCEodHlwZW9mIGxvY2FsT3B0aW9ucy5kZWJvdW5jZUNvdW50ID09PSAnbnVtYmVyJykpIHtcbiAgICB0aHJvdyBuZXcgVHVuZ3Vza2FSZWFjdGl2ZUFnZ3JlZ2F0ZUVycm9yKCdcIm9wdGlvbnMuZGVib3VuY2VDb3VudFwiIG11c3QgYmUgYSBwb3NpdGl2ZSBpbnRlZ2VyJyk7XG4gIH0gZWxzZSB7XG4gICAgbG9jYWxPcHRpb25zLmRlYm91bmNlQ291bnQgPSBwYXJzZUludChsb2NhbE9wdGlvbnMuZGVib3VuY2VDb3VudCwgMTApO1xuICAgIGlmIChsb2NhbE9wdGlvbnMuZGVib3VuY2VDb3VudCA8IDApIHtcbiAgICAgIHRocm93IG5ldyBUdW5ndXNrYVJlYWN0aXZlQWdncmVnYXRlRXJyb3IoJ1wib3B0aW9ucy5kZWJvdW5jZUNvdW50XCIgbXVzdCBiZSBhIHBvc2l0aXZlIGludGVnZXInKTtcbiAgICB9XG4gIH1cbiAgaWYgKCEodHlwZW9mIGxvY2FsT3B0aW9ucy5kZWJvdW5jZURlbGF5ID09PSAnbnVtYmVyJykpIHtcbiAgICB0aHJvdyBuZXcgVHVuZ3Vza2FSZWFjdGl2ZUFnZ3JlZ2F0ZUVycm9yKCdcIm9wdGlvbnMuZGVib3VuY2VEZWxheVwiIG11c3QgYmUgYSBwb3NpdGl2ZSBpbnRlZ2VyJyk7XG4gIH0gZWxzZSB7XG4gICAgbG9jYWxPcHRpb25zLmRlYm91bmNlRGVsYXkgPSBwYXJzZUludChsb2NhbE9wdGlvbnMuZGVib3VuY2VEZWxheSwgMTApO1xuICAgIGlmIChsb2NhbE9wdGlvbnMuZGVib3VuY2VEZWxheSA8IDApIHtcbiAgICAgIHRocm93IG5ldyBUdW5ndXNrYVJlYWN0aXZlQWdncmVnYXRlRXJyb3IoJ1wib3B0aW9ucy5kZWJvdW5jZURlbGF5XCIgbXVzdCBiZSBhIHBvc2l0aXZlIGludGVnZXInKTtcbiAgICB9XG4gIH1cbiAgaWYgKHR5cGVvZiBsb2NhbE9wdGlvbnMuY2xpZW50Q29sbGVjdGlvbiAhPT0gJ3N0cmluZycpIHtcbiAgICB0aHJvdyBuZXcgVHVuZ3Vza2FSZWFjdGl2ZUFnZ3JlZ2F0ZUVycm9yKCdcIm9wdGlvbnMuY2xpZW50Q29sbGVjdGlvblwiIG11c3QgYmUgYSBzdHJpbmcnKTtcbiAgfVxuXG5cbiAgLy8gV2FybiBhYm91dCBkZXByZWNhdGVkIHBhcmFtZXRlcnMgaWYgdXNlZFxuICBpZiAoT2JqZWN0LmtleXMobG9jYWxPcHRpb25zLm9ic2VydmVTZWxlY3RvcikubGVuZ3RoICE9PSAwKSBjb25zb2xlLmxvZygndHVuZ3Vza2E6cmVhY3RpdmUtYWdncmVnYXRlOiBvYnNlcnZlU2VsZWN0b3IgaXMgZGVwcmVjYXRlZCcpO1xuICBpZiAoT2JqZWN0LmtleXMobG9jYWxPcHRpb25zLm9ic2VydmVPcHRpb25zKS5sZW5ndGggIT09IDApIGNvbnNvbGUubG9nKCd0dW5ndXNrYTpyZWFjdGl2ZS1hZ2dyZWdhdGU6IG9ic2VydmVPcHRpb25zIGlzIGRlcHJlY2F0ZWQnKTtcblxuICAvLyBvYnNlcnZlQ2hhbmdlcygpIHdpbGwgaW1tZWRpYXRlbHkgZmlyZSBhbiBcImFkZGVkXCIgZXZlbnQgZm9yIGVhY2ggZG9jdW1lbnQgaW4gdGhlIGN1cnNvclxuICAvLyB0aGVzZSBhcmUgc2tpcHBlZCB1c2luZyB0aGUgaW5pdGlhbGl6aW5nIGZsYWdcbiAgbGV0IGluaXRpYWxpemluZyA9IHRydWU7XG4gIHN1Yi5faWRzID0ge307XG4gIHN1Yi5faXRlcmF0aW9uID0gMTtcblxuICBjb25zdCB1cGRhdGUgPSAoKSA9PiB7XG4gICAgaWYgKGluaXRpYWxpemluZykgcmV0dXJuO1xuICAgIC8vIGFkZCBhbmQgdXBkYXRlIGRvY3VtZW50cyBvbiB0aGUgY2xpZW50XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGRvY3MgPSBQcm9taXNlLmF3YWl0KGNvbGxlY3Rpb24ucmF3Q29sbGVjdGlvbigpLmFnZ3JlZ2F0ZShwaXBlbGluZSwgbG9jYWxPcHRpb25zLmFnZ3JlZ2F0aW9uT3B0aW9ucykudG9BcnJheSgpKTtcbiAgICAgIGRvY3MuZm9yRWFjaChkb2MgPT4ge1xuXG4gICAgICAgIC8qICBfaWRzIGFyZSBjb21wbGljYXRlZDpcbiAgICAgICAgICAgIEZvciB0cmFja2luZyBoZXJlLCB0aGV5IG11c3QgYmUgU3RyaW5nXG4gICAgICAgICAgICBGb3IgbWluaW1vbmdvLCB0aGV5IG11c3QgZXhpc3QgYW5kIGJlXG4gICAgICAgICAgICAgIFN0cmluZyBvciBPYmplY3RJZFxuICAgICAgICAgICAgICAoaG93ZXZlciwgd2UnbGwgYXJiaXRyYXJpbHkgZXhjbHVkZSBPYmplY3RJZClcbiAgICAgICAgICAgIF9pZHMgY29taW5nIGZyb20gYW4gYWdncmVnYXRpb24gcGlwZWxpbmUgbWF5IGJlIGFueXRoaW5nIG9yIG5vdGhpbmchXG4gICAgICAgICAgT2JqZWN0SWRzIGNvbWluZyB2aWEgdG9BcnJheSgpIGJlY29tZSBQT0pPc1xuICAgICAgICAqL1xuXG4gICAgICAgIGlmICghZG9jLl9pZCkgeyAvLyBtaXNzaW5nIG9yIG90aGVyd2lzZSBmYWxzeVxuICAgICAgICAgIHRocm93IG5ldyBUdW5ndXNrYVJlYWN0aXZlQWdncmVnYXRlRXJyb3IoJ2V2ZXJ5IGFnZ3JlZ2F0aW9uIGRvY3VtZW50IG11c3QgaGF2ZSBhbiBfaWQnKTtcbiAgICAgICAgfSBlbHNlIGlmIChkb2MuX2lkIGluc3RhbmNlb2YgTW9uZ28uT2JqZWN0SUQpIHtcbiAgICAgICAgICBkb2MuX2lkID0gZG9jLl9pZC50b0hleFN0cmluZygpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBkb2MuX2lkID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgIGRvYy5faWQgPSBkb2MuX2lkLnRvU3RyaW5nKCk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGRvYy5faWQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR1bmd1c2thUmVhY3RpdmVBZ2dyZWdhdGVFcnJvcignYWdncmVnYXRpb24gZG9jdW1lbnQgX2lkIGlzIG5vdCBhbiBhbGxvd2VkIHR5cGUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghc3ViLl9pZHNbZG9jLl9pZF0pIHtcbiAgICAgICAgICBzdWIuYWRkZWQobG9jYWxPcHRpb25zLmNsaWVudENvbGxlY3Rpb24sIGRvYy5faWQsIGRvYyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3ViLmNoYW5nZWQobG9jYWxPcHRpb25zLmNsaWVudENvbGxlY3Rpb24sIGRvYy5faWQsIGRvYyk7XG4gICAgICAgIH1cbiAgICAgICAgc3ViLl9pZHNbZG9jLl9pZF0gPSBzdWIuX2l0ZXJhdGlvbjtcbiAgICAgIH0pO1xuXG4gICAgICAvLyByZW1vdmUgZG9jdW1lbnRzIG5vdCBpbiB0aGUgcmVzdWx0IGFueW1vcmVcbiAgICAgIE9iamVjdC5rZXlzKHN1Yi5faWRzKS5mb3JFYWNoKGlkID0+IHtcbiAgICAgICAgaWYgKHN1Yi5faWRzW2lkXSAhPT0gc3ViLl9pdGVyYXRpb24pIHtcbiAgICAgICAgICBkZWxldGUgc3ViLl9pZHNbaWRdO1xuICAgICAgICAgIHN1Yi5yZW1vdmVkKGxvY2FsT3B0aW9ucy5jbGllbnRDb2xsZWN0aW9uLCBpZCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgc3ViLl9pdGVyYXRpb24rKztcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRocm93IG5ldyBUdW5ndXNrYVJlYWN0aXZlQWdncmVnYXRlRXJyb3IgKGVyci5tZXNzYWdlKTtcbiAgICB9XG4gIH1cblxuICBsZXQgY3VycmVudERlYm91bmNlQ291bnQgPSAwO1xuICBsZXQgdGltZXI7XG5cbiAgY29uc3QgZGVib3VuY2UgPSAoKSA9PiB7XG4gICAgaWYgKGluaXRpYWxpemluZykgcmV0dXJuO1xuICAgIGlmICghdGltZXIgJiYgbG9jYWxPcHRpb25zLmRlYm91bmNlQ291bnQgPiAwKSB0aW1lciA9IE1ldGVvci5zZXRUaW1lb3V0KHVwZGF0ZSwgbG9jYWxPcHRpb25zLmRlYm91bmNlRGVsYXkpO1xuICAgIGlmICgrK2N1cnJlbnREZWJvdW5jZUNvdW50ID4gbG9jYWxPcHRpb25zLmRlYm91bmNlQ291bnQpIHtcbiAgICAgIGN1cnJlbnREZWJvdW5jZUNvdW50ID0gMDtcbiAgICAgIE1ldGVvci5jbGVhclRpbWVvdXQodGltZXIpO1xuICAgICAgdXBkYXRlKCk7XG4gICAgfVxuICB9XG5cbiAgaWYgKCFsb2NhbE9wdGlvbnMubm9BdXRvbWF0aWNPYnNlcnZlcikge1xuICAgIGNvbnN0IGN1cnNvciA9IGNvbGxlY3Rpb24uZmluZChsb2NhbE9wdGlvbnMub2JzZXJ2ZVNlbGVjdG9yLCBsb2NhbE9wdGlvbnMub2JzZXJ2ZU9wdGlvbnMpO1xuICAgIGxvY2FsT3B0aW9ucy5vYnNlcnZlcnMucHVzaChjdXJzb3IpO1xuICB9XG5cbiAgY29uc3QgaGFuZGxlcyA9IFtdO1xuICAvLyB0cmFjayBhbnkgY2hhbmdlcyBvbiB0aGUgb2JzZXJ2ZWQgY3Vyc29yc1xuICBsb2NhbE9wdGlvbnMub2JzZXJ2ZXJzLmZvckVhY2goY3Vyc29yID0+IHtcbiAgICBoYW5kbGVzLnB1c2goY3Vyc29yLm9ic2VydmVDaGFuZ2VzKHtcbiAgICAgIGFkZGVkOiBkZWJvdW5jZSxcbiAgICAgIGNoYW5nZWQ6IGRlYm91bmNlLFxuICAgICAgcmVtb3ZlZDogZGVib3VuY2UsXG4gICAgICBlcnJvcihlcnIpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR1bmd1c2thUmVhY3RpdmVBZ2dyZWdhdGVFcnJvciAoZXJyLm1lc3NhZ2UpO1xuICAgICAgfVxuICAgIH0pKTtcbiAgfSk7XG5cbiAgLy8gc3RvcCBvYnNlcnZpbmcgdGhlIGN1cnNvcnMgd2hlbiB0aGUgY2xpZW50IHVuc3Vic2NyaWJlc1xuICBzdWIub25TdG9wKCgpID0+IHtcbiAgICBoYW5kbGVzLmZvckVhY2goaGFuZGxlID0+IHtcbiAgICAgIGhhbmRsZS5zdG9wKCk7XG4gICAgfSk7XG4gIH0pO1xuICAvLyBFbmQgb2YgdGhlIHNldHVwIHBoYXNlLiBXZSBkb24ndCBuZWVkIHRvIGRvIGFueSBvZiB0aGF0IGFnYWluIVxuXG4gIC8vIENsZWFyIHRoZSBpbml0aWFsaXppbmcgZmxhZy4gRnJvbSBoZXJlLCB3ZSdyZSBvbiBhdXRvcGlsb3RcbiAgaW5pdGlhbGl6aW5nID0gZmFsc2U7XG4gIC8vIHNlbmQgYW4gaW5pdGlhbCByZXN1bHQgc2V0IHRvIHRoZSBjbGllbnRcbiAgdXBkYXRlKCk7XG4gIC8vIG1hcmsgdGhlIHN1YnNjcmlwdGlvbiBhcyByZWFkeVxuICBzdWIucmVhZHkoKTtcblxufTtcbiJdfQ==
