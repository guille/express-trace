
/*!
 * express-trace
 * Copyright(c) 2011 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var http = require('http');

/**
 * Export trace function.
 */

exports = module.exports = trace;

/**
 * Library version.
 */

exports.version = '0.0.2';

/**
 * Status code color map.
 */

var colors = {
    2: 32
  , 3: 36
  , 4: 33
  , 5: 31
};

/**
 * Trace middleware in the given `app`.
 *
 * @param {express.HTTPServer} app
 * @api public
 */

function trace(app) {
  var stack = app.stack || app.router.stack
    , len = stack.length;

  for (var i = 0; i < len; ++i) {
    stack[i].handle = (function(route, fn){
      // TODO: mounted apps
      // TODO: route middleware

      // router
      if ('router' == fn.name) {
        for (var method in fn.routes) {
          fn.routes[method].forEach(function(route){
            var callback = route.callback;

            // callback
            route.callback = function(req, res, next){
              var start = start = new Date;;
              
              process.stderr.write('    \033[90mapp.'
                + route.method.toLowerCase() + '('
                + route.path + ')\033[0m ');

              callback(req, res, function(err){
                console.error('\033[90m%dms\033[0m', new Date - start);
                next(err);
              });
            };

            // middleware
            route.middleware = route.middleware.map(function(fn){
              return function(req, res, next){
                var name = fn.name || 'anonymous'
                  , start = new Date;

                process.stderr.write('      \033[90mmiddleware '
                  + '\033[36m' + name + '\033[0m ');

                fn(req, res, function(err){
                  console.error('\033[90m%dms\033[0m', new Date - start);
                  next(err);
                });
              }
            });
          });
        }
      }

      // regular middleware
      return function(req, res, next){
        var route = route || '/'
          , name = fn.name || 'anonymous'
          , router = 'router' == fn.name
          , start = new Date;

        // middleware
        process.stderr.write('  \033[90mmiddleware \033[33m'
          + route + ' \033[36m'
          + name + '\033[0m'
          + (router ? '\n' : ' '));

        // duration
        fn(req, res, function(err){
          console.error((router ? '  ' : '')
            + '\033[90m%dms\033[0m', new Date - start);
          next(err);
        });
      }
    })(stack[i].route, stack[i].handle);
  }

  stack.unshift({
      route: ''
    , handle: function(req, res, next){
      var start = new Date;
      res.on('finish', function(){
        var color = colors[res.statusCode / 100 | 0];
        console.error('\n  \033[90mresponded to %s \033[33m%s\033[0m '
          + '\033[90min %dms with \033[' + color + 'm%s\033[0m'
          + ' \033[90m"%s"\033[0m'
          , req.method
          , req.url
          , new Date - start
          , res.statusCode
          , http.STATUS_CODES[res.statusCode]);
      });
      console.error('\n  \033[90m%s \033[33m%s\033[0m', req.method, req.url);
      next();
    }
  });

  stack.push({
      route: ''
    , handle: function(req, res, next){
      next();
    }
  });
  
  stack.push({
      route: ''
    , handle: function(err, req, res, next){
      req.__err = err;
      next(err);
    }
  });
};