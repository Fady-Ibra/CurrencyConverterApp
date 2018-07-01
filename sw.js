if (!Cache.prototype.add) {
  Cache.prototype.add = function add(request) {
    return this.addAll([request]);
  };
}

if (!Cache.prototype.addAll) {
  Cache.prototype.addAll = function addAll(requests) {
    var cache = this;
    function NetworkError(message) {
      this.name = 'NetworkError';
      this.code = 19;
      this.message = message;
    }
    NetworkError.prototype = Object.create(Error.prototype);
    return Promise.resolve().then(function() {
      if (arguments.length < 1) throw new TypeError();
      var sequence = [];
      requests = requests.map(function(request) {
        if (request instanceof Request) return request;
        else return String(request); 
      });
      return Promise.all(
        requests.map(function(request) {
          if (typeof request === 'string') request = new Request(request);
          var scheme = new URL(request.url).protocol;
          if (scheme !== 'http:' && scheme !== 'https:') throw new NetworkError("Invalid scheme");
          return fetch(request.clone());
        })
      );
    }).then(function(responses) {
      return Promise.all(
        responses.map(function(response, i) {
          return cache.put(requests[i], response);
        })
      );
    }).then(function() {
      return undefined;
    });
  };
}

if (!CacheStorage.prototype.match) {
  CacheStorage.prototype.match = function match(request, opts) {
    var caches = this;
    return this.keys().then(function(cacheNames) {
      var match;
      return cacheNames.reduce(function(chain, cacheName) {
        return chain.then(function() {
          return match || caches.open(cacheName).then(function(cache) {
            return cache.match(request, opts);
          }).then(function(response) {
            match = response;
            return match;
          });
        });
      }, Promise.resolve());
    });
  };
}

self.addEventListener('install', function(event) {
  if (self.skipWaiting) { self.skipWaiting(); }//
  event.waitUntil(
    caches.open('simple-sw-v1').then(function(cache) {
      return cache.addAll([
        './',
        'jquery.min.js',
        'jquery-ui.min.js',
        'jquery-ui.min.css',
        'db.js',        
      ]);
    })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request).then(function(response){
        if(response.status === 404) return new Response(" Whoops !! Not Found ");
        else return response;
      }).catch(function(){
        return new Response(" Whoops !! That is tottaly Failed ");
      });
    })
  );
});
