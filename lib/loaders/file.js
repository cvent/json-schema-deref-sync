var fs = require('fs');
var clone = require('clone');
var path = require('path');

var utils = require('../utils');

var cwd = process.cwd();

function readFile(filePath) {
  var newValue;
  try {
    var data = fs.readFileSync(filePath);
    newValue = JSON.parse(data);
  }
  catch (e) {
  }

  return newValue;
}

/**
 * Resolves a file link of a json schema to the actual value it references
 * @param refValue the value. String. Ex. `/some/path/schema.json#/definitions/foo`
 * @param options
 *              baseFolder - the base folder to get relative path files from. Default is `process.cwd()`
 * @returns {*}
 */
module.exports = function (refValue, options) {

  var refPath = refValue;
  var baseFolder = options.baseFolder ? path.resolve(cwd, options.baseFolder) : cwd;

  if (refPath.indexOf('file:') === 0) {
    refPath = refPath.substring(5);
  }
  else {
    refPath = path.resolve(baseFolder, refPath);
  }

  var filePath = refPath;
  var hashIndex = filePath.indexOf('#');
  if (hashIndex > 0) {
    filePath = refPath.substring(0, hashIndex);
  }

  var finishIt = function (fileValue) {
    var newVal;
    if (fileValue) {
      newVal = fileValue;
    }
    return newVal;
  };

  if (filePath.indexOf('.json') >= 0) {
    var reqValue;
    try {
      reqValue = require(filePath);
    }
    catch (e) {
    }

    if (reqValue) {
      return finishIt(clone(reqValue));
    }
    return finishIt(readFile(filePath));
  }
  else {
    return finishIt(readFile(filePath));
  }
};