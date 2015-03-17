var propSearch = require('prop-search');
var mpath = require('mpath');
var _ = require('lodash');
var clone = require('clone');
var utils = require('./utils');

var defaults = {
  baseFolder: process.cwd()
};

var loaders = {
  'file': require('./loaders/file')
};

function derefSchema(schema, baseSchema, pathToBase, options) {

  var setRefValue = function (cr, nval) {
    var path = cr.path;
    var schemaToSet = schema;

    // set in base if needed
    if (!path && pathToBase) {
      path = pathToBase;
      schemaToSet = baseSchema;
    }

    if (path && schemaToSet) {
      var cv = mpath.get(path, schemaToSet);

      // check invalid overwrite
      if (utils.isRefObject(nval) && !utils.isRefObject(cv)) {
        return;
      }

      mpath.set(path, nval, schemaToSet);
    }
  };

  var refs = propSearch.searchForExistence(schema, '$ref', {separator: '.'});

  if (refs && refs.length > 0) {
    _.forEach(refs, function (currRef) {
      var refType = utils.getRefType(currRef);
      var refVal = utils.getRefValue(currRef);

      var handleResult = function (newValue) {
        if (!newValue) {
          newValue = currRef.value;
        }

        // do not replace with self
        if (utils.isRefObject(newValue)) {
          var newRefVal = utils.getRefValue(newValue);
          var newRefType = utils.getRefType(newValue);
          if (newRefVal === refVal || newRefType === 'local') {
            return;
          }
        }

        setRefValue(currRef, newValue);

        var concatPath = pathToBase && currRef.path ? '.' + currRef.path : currRef.path;

        var newValueSchema = derefSchema(newValue, baseSchema, pathToBase.concat(concatPath), options);
        if (newValueSchema) {
          setRefValue(currRef, newValueSchema);
        }
      };

      if (refType && loaders[refType]) {
        var newValue = loaders[refType](refVal, options);
        handleResult(newValue);
      }
      else if (refType === 'local') {
        var newValue = utils.getRefPathValue(schema, refVal);
        handleResult(newValue);
      }
    });
  }

  return schema;
}

/**
 * Derefs `$ref`'s in json schema to actual resolved values.
 * Supports local, file and web refs.
 * @param baseSchema The json schema
 * @param options
 *          baseFolder - the base folder to get relative path files from. Default is `process.cwd()`
 * @returns {*}
 */
function deref(baseSchema, options) {
  if (!options) {
    options = {};
  }

  options = _.defaults(options, defaults);

  var baseSchema = clone(baseSchema);

  return derefSchema(baseSchema, baseSchema, '', options);
}

deref.prototype.getRefPathValue = utils.getRefPathValue;

module.exports = deref;