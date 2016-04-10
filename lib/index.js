var fs = require('fs');
var path = require('path');
var util = require('util');
var Transform = require('stream').Transform;

function Transformer(opts) {
  // if no instance, call new
  if (!(this instanceof Parser)) {
    return new Parser(opts); 
  }
  this.opts = opts;
  Transform.call(this, opts);
}

util.inherits(Transformer, Transform);

var writeEnabled = false;

function frListener(fr) {
  fr.on('end', function() {
    writeEnabled = true;
  });
}

function write(pipe, fw, opts) {
  frListener(pipe.fr);
  opts = opts || { end: false };
  return pipe.fr
    .pipe(function() {
      pipe.transformers.forEach(function(tx) {
        tx();
      });
    }) 
    .pipe(fw, opts); 
}

function writing(filePipes, fileWriter) {
  if (filePipes.length == 1 ) {
    var pipe = filePipes.shift();
    return write(pipe, fileWriter, { end: true });
  }

  // Setup recursion
  if (writeEnabled) {
    writeEnabled = false;
    write(filePipes.shift(), fileWriter);
    writing(filePipes, fileWriter);
  } else {
    setImmediate(function() {
      writing(filePipes, fileWriter);
    });
  }
}

module.exports = function(arr, opts) {
  var fileName = opts.fileName || path.join(__dirname, 'temp.out');

  var fileWriter = fs.createWriteStream(fileName);
  fileWriter.setMaxListeners(0);

  var pipes = arr.map(function(item) {
    var fileReader = fs.createReadStream(item);

    return {
      fr: fileReader,
      transformers: opts.transformers || [] 
    };
  });
  writeEnabled = true;
  writing(pipes, fileWriter);
}; 

