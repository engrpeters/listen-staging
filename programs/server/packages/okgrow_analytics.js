(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var analytics;

var require = meteorInstall({"node_modules":{"meteor":{"okgrow:analytics":{"server":{"main.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////
//                                                                          //
// packages/okgrow_analytics/server/main.js                                 //
//                                                                          //
//////////////////////////////////////////////////////////////////////////////
                                                                            //
module.link("./browser-policy");
module.link("./publications");
//////////////////////////////////////////////////////////////////////////////

},"browser-policy.js":function(){

//////////////////////////////////////////////////////////////////////////////
//                                                                          //
// packages/okgrow_analytics/server/browser-policy.js                       //
//                                                                          //
//////////////////////////////////////////////////////////////////////////////
                                                                            //
/* global Package */
if (Package['browser-policy-common']) {
  const content = Package['browser-policy-common'].BrowserPolicy.content;

  if (content) {
    content.allowOriginForAll('https://www.google.com/analytics/');
    content.allowOriginForAll('https://cdn.mxpnl.com');
  }
}
//////////////////////////////////////////////////////////////////////////////

},"publications.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////
//                                                                          //
// packages/okgrow_analytics/server/publications.js                         //
//                                                                          //
//////////////////////////////////////////////////////////////////////////////
                                                                            //
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
// eslint-disable-line import/no-extraneous-dependencies, import/extensions
Meteor.publish(null, function analyticsUsersPublish() {
  if (this.userId) {
    const self = this;
    const query = Meteor.users.find({
      _id: this.userId
    }, {
      fields: {
        emails: 1,
        'services.google.email': 1,
        'services.github.email': 1,
        'services.facebook.email': 1
      }
    });

    Mongo.Collection._publishCursor(query, self, 'AnalyticsUsers');

    return self.ready();
  }

  this.ready();
});
//////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/okgrow:analytics/server/main.js");

/* Exports */
Package._define("okgrow:analytics", exports, {
  analytics: analytics
});

})();

//# sourceURL=meteor://💻app/packages/okgrow_analytics.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb2tncm93OmFuYWx5dGljcy9zZXJ2ZXIvbWFpbi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb2tncm93OmFuYWx5dGljcy9zZXJ2ZXIvYnJvd3Nlci1wb2xpY3kuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL29rZ3JvdzphbmFseXRpY3Mvc2VydmVyL3B1YmxpY2F0aW9ucy5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJsaW5rIiwiUGFja2FnZSIsImNvbnRlbnQiLCJCcm93c2VyUG9saWN5IiwiYWxsb3dPcmlnaW5Gb3JBbGwiLCJNZXRlb3IiLCJ2IiwiTW9uZ28iLCJwdWJsaXNoIiwiYW5hbHl0aWNzVXNlcnNQdWJsaXNoIiwidXNlcklkIiwic2VsZiIsInF1ZXJ5IiwidXNlcnMiLCJmaW5kIiwiX2lkIiwiZmllbGRzIiwiZW1haWxzIiwiQ29sbGVjdGlvbiIsIl9wdWJsaXNoQ3Vyc29yIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQUEsTUFBTSxDQUFDQyxJQUFQLENBQVksa0JBQVo7QUFBZ0NELE1BQU0sQ0FBQ0MsSUFBUCxDQUFZLGdCQUFaLEU7Ozs7Ozs7Ozs7O0FDQWhDO0FBRUEsSUFBSUMsT0FBTyxDQUFDLHVCQUFELENBQVgsRUFBc0M7QUFDcEMsUUFBTUMsT0FBTyxHQUFHRCxPQUFPLENBQUMsdUJBQUQsQ0FBUCxDQUFpQ0UsYUFBakMsQ0FBK0NELE9BQS9EOztBQUNBLE1BQUlBLE9BQUosRUFBYTtBQUNYQSxXQUFPLENBQUNFLGlCQUFSLENBQTBCLG1DQUExQjtBQUNBRixXQUFPLENBQUNFLGlCQUFSLENBQTBCLHVCQUExQjtBQUNEO0FBQ0YsQzs7Ozs7Ozs7Ozs7QUNSRCxJQUFJQyxNQUFKO0FBQVdOLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZLGVBQVosRUFBNEI7QUFBQ0ssUUFBTSxDQUFDQyxDQUFELEVBQUc7QUFBQ0QsVUFBTSxHQUFDQyxDQUFQO0FBQVM7O0FBQXBCLENBQTVCLEVBQWtELENBQWxEO0FBQXFELElBQUlDLEtBQUo7QUFBVVIsTUFBTSxDQUFDQyxJQUFQLENBQVksY0FBWixFQUEyQjtBQUFDTyxPQUFLLENBQUNELENBQUQsRUFBRztBQUFDQyxTQUFLLEdBQUNELENBQU47QUFBUTs7QUFBbEIsQ0FBM0IsRUFBK0MsQ0FBL0M7QUFDcEM7QUFFdENELE1BQU0sQ0FBQ0csT0FBUCxDQUFlLElBQWYsRUFBcUIsU0FBU0MscUJBQVQsR0FBaUM7QUFDcEQsTUFBSSxLQUFLQyxNQUFULEVBQWlCO0FBQ2YsVUFBTUMsSUFBSSxHQUFHLElBQWI7QUFDQSxVQUFNQyxLQUFLLEdBQUdQLE1BQU0sQ0FBQ1EsS0FBUCxDQUNYQyxJQURXLENBQ047QUFDSkMsU0FBRyxFQUFFLEtBQUtMO0FBRE4sS0FETSxFQUdUO0FBQ0RNLFlBQU0sRUFBRTtBQUNOQyxjQUFNLEVBQUUsQ0FERjtBQUVOLGlDQUF5QixDQUZuQjtBQUdOLGlDQUF5QixDQUhuQjtBQUlOLG1DQUEyQjtBQUpyQjtBQURQLEtBSFMsQ0FBZDs7QUFXQVYsU0FBSyxDQUFDVyxVQUFOLENBQWlCQyxjQUFqQixDQUFnQ1AsS0FBaEMsRUFBdUNELElBQXZDLEVBQTZDLGdCQUE3Qzs7QUFDQSxXQUFPQSxJQUFJLENBQUNTLEtBQUwsRUFBUDtBQUNEOztBQUVELE9BQUtBLEtBQUw7QUFDRCxDQW5CRCxFIiwiZmlsZSI6Ii9wYWNrYWdlcy9va2dyb3dfYW5hbHl0aWNzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICcuL2Jyb3dzZXItcG9saWN5JztcbmltcG9ydCAnLi9wdWJsaWNhdGlvbnMnO1xuIiwiLyogZ2xvYmFsIFBhY2thZ2UgKi9cblxuaWYgKFBhY2thZ2VbJ2Jyb3dzZXItcG9saWN5LWNvbW1vbiddKSB7XG4gIGNvbnN0IGNvbnRlbnQgPSBQYWNrYWdlWydicm93c2VyLXBvbGljeS1jb21tb24nXS5Ccm93c2VyUG9saWN5LmNvbnRlbnQ7XG4gIGlmIChjb250ZW50KSB7XG4gICAgY29udGVudC5hbGxvd09yaWdpbkZvckFsbCgnaHR0cHM6Ly93d3cuZ29vZ2xlLmNvbS9hbmFseXRpY3MvJyk7XG4gICAgY29udGVudC5hbGxvd09yaWdpbkZvckFsbCgnaHR0cHM6Ly9jZG4ubXhwbmwuY29tJyk7XG4gIH1cbn1cbiIsImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGltcG9ydC9uby1leHRyYW5lb3VzLWRlcGVuZGVuY2llcywgaW1wb3J0L2V4dGVuc2lvbnNcbmltcG9ydCB7IE1vbmdvIH0gZnJvbSAnbWV0ZW9yL21vbmdvJzsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBpbXBvcnQvbm8tZXh0cmFuZW91cy1kZXBlbmRlbmNpZXMsIGltcG9ydC9leHRlbnNpb25zXG5cbk1ldGVvci5wdWJsaXNoKG51bGwsIGZ1bmN0aW9uIGFuYWx5dGljc1VzZXJzUHVibGlzaCgpIHtcbiAgaWYgKHRoaXMudXNlcklkKSB7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgY29uc3QgcXVlcnkgPSBNZXRlb3IudXNlcnNcbiAgICAgIC5maW5kKHtcbiAgICAgICAgX2lkOiB0aGlzLnVzZXJJZCxcbiAgICAgIH0sIHtcbiAgICAgICAgZmllbGRzOiB7XG4gICAgICAgICAgZW1haWxzOiAxLFxuICAgICAgICAgICdzZXJ2aWNlcy5nb29nbGUuZW1haWwnOiAxLFxuICAgICAgICAgICdzZXJ2aWNlcy5naXRodWIuZW1haWwnOiAxLFxuICAgICAgICAgICdzZXJ2aWNlcy5mYWNlYm9vay5lbWFpbCc6IDEsXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICBNb25nby5Db2xsZWN0aW9uLl9wdWJsaXNoQ3Vyc29yKHF1ZXJ5LCBzZWxmLCAnQW5hbHl0aWNzVXNlcnMnKTtcbiAgICByZXR1cm4gc2VsZi5yZWFkeSgpO1xuICB9XG5cbiAgdGhpcy5yZWFkeSgpO1xufSk7XG4iXX0=
