var _ = require('lodash');
var utils = require('./utils');
var traverse = require('traverse');

var defaults = {
  baseFolder: process.cwd()
};

var loaders = {
  'file': require('./loaders/file')
};

function getRefSchema(parent, refObj, options) {
  var refType = utils.getRefType(refObj);
  var refVal = utils.getRefValue(refObj);

  if (refType && loaders[refType]) {
    return loaders[refType](refVal, options);
  }
  else if (refType === 'local') {
    return utils.getRefPathValue(parent, refVal);
  }
}

function derefSchema(schema, options) {
  return traverse(schema).map(function (node) {
    if (node && node['$ref'] && typeof node['$ref'] === 'string') {
      var newValue = getRefSchema(schema, node, options);
      if (newValue) {
        var value = derefSchema(newValue, options);
        if (value || newValue) {
          this.update(value || newValue);
        }
      }
    }
  });
}

/**
 * Derefs `$ref`'s in json schema to actual resolved values.
 * Supports local, file and web refs.
 * @param schema The json schema
 * @param options
 *          baseFolder - the base folder to get relative path files from. Default is `process.cwd()`
 * @returns {*}
 */
function deref(schema, options) {
  if (!options) {
    options = {};
  }

  options = _.defaults(options, defaults);

  return derefSchema(schema, options);
}

deref.prototype.getRefPathValue = utils.getRefPathValue;

module.exports = deref;