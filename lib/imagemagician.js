var sys = require('sys'),
    childproc = require('child_process');

//

var ImageMagician = function(image) {
  this.image = image
  this.args = null
}

ImageMagician.prototype = {

  convert: function(args) {
    this.args = args.concat();
    this.args.unshift("-");
    return this
  },

  jpeg: function(quality, callback) {
    this.args.push("-quality")
    this.args.push(quality)
    this.args.push("JPEG:-");
    this.execute(callback);
    return this
  },

  png: function(callback) {
    this.args.push("PNG32:-");
    this.execute(callback);
    return this
  },

  execute: function(callback) {
    var procopt = {encoding: 'binary'};
    proc = exec2(ImageMagician.config.convertPath, this.args, procopt, callback);
    proc.stdin.setEncoding('binary');
    proc.stdin.write(this.image, 'binary');
    proc.stdin.end();
    return proc
  }
}

ImageMagician.config = {
  identifyPath: "identify",
  convertPath: "convert"
}



function exec2(file, args) {
  var options = { encoding: 'utf8'
                , timeout: 0
                , maxBuffer: 500*1024
                , killSignal: 'SIGKILL'
                };

  var callback = arguments[arguments.length-1];

  if (typeof arguments[2] == 'object') {
    var keys = Object.keys(options);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (arguments[2][k] !== undefined) options[k] = arguments[2][k];
    }
  }

  var child = childproc.spawn(file, args);
  var stdout = "";
  var stderr = "";
  var killed = false;
  var timedOut = false;

  var timeoutId;
  if (options.timeout > 0) {
    timeoutId = setTimeout(function () {
      if (!killed) {
        child.kill(options.killSignal);
        timedOut = true;
        killed = true;
        timeoutId = null;
      }
    }, options.timeout);
  }

  child.stdout.setEncoding(options.encoding);
  child.stderr.setEncoding(options.encoding);

  child.stdout.addListener("data", function (chunk) {
    stdout += chunk;
    if (!killed && stdout.length > options.maxBuffer) {
      child.kill(options.killSignal);
      killed = true;
    }
  });

  child.stderr.addListener("data", function (chunk) {
    stderr += chunk;
    if (!killed && stderr.length > options.maxBuffer) {
      child.kill(options.killSignal);
      killed = true
    }
  });

  child.addListener("exit", function (code, signal) {
    if (timeoutId) clearTimeout(timeoutId);
    if (code === 0 && signal === null) {
      if (callback) callback(null, stdout, stderr);
    } else {
      var e = new Error("Command "+(timedOut ? "timed out" : "failed")+": " + stderr);
      e.timedOut = timedOut;
      e.killed = killed;
      e.code = code;
      e.signal = signal;
      if (callback) callback(e, stdout, stderr);
    }
  });
  
  return child;
};

module.exports = ImageMagician
