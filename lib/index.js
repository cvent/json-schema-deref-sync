var _ = require('lodash');
var utils = require('./utils');
var traverse = require('traverse');

var defaults = {
  baseFolder: process.cwd()
};

var jsonSchemaKeywords = ['member', 'property', 'schema', 'targetschema', 'type', 'element', 'properties',
  'definitions'];

var loaders = {
  'file': require('./loaders/file')
};

var cache = {};

/**
 * Returns the reference schema that refVal points to.
 * If the ref val points to a ref within a file, the file is loaded and fully derefed, before we get the
 * pointing property. Derefed files are cahced.
 *
 * @param refVal
 * @param refType
 * @param parent
 * @param options
 * @param state
 * @returns {*}
 */
function getRefSchema(refVal, refType, parent, options, state) {
  if (refType && loaders[refType]) {
    var newVal;

    var filePath = utils.getRefFilePath(refVal);

    var loaderValue;
    if (cache[filePath]) {
      loaderValue = cache[filePath];
    }

    if (!loaderValue) {
      loaderValue = loaders[refType](refVal, options);
      if (loaderValue) {
        loaderValue = derefSchema(loaderValue, options, state);
      }
    }

    if (loaderValue) {
      if (filePath && !cache[filePath]) {
        cache[filePath] = loaderValue;
      }

      if (refVal.indexOf('#') >= 0) {
        var refPaths = refVal.split('#');
        var refPath = refPaths[1];
        var refNewVal = utils.getRefPathValue(loaderValue, refPath);
        if (refNewVal) {
          newVal = refNewVal;
        }
      }
      else {
        newVal = loaderValue;
      }
    }

    return newVal;
  }
  else if (refType === 'local') {
    return utils.getRefPathValue(parent, refVal);
  }
}

/**
 * Builds parental history of a node within an object. To be used in traversal.
 * @param node
 * @returns {*}
 */
function buildNodeHistory(node) {
  if (!node) {
    return [];
  }

  return _.chain(node.path).map(function (pathObj) {
    return pathObj.toLowerCase();
  }).difference(jsonSchemaKeywords).value();
}

/**
 * Derefs schema
 * @param schema
 * @param options
 * @param state
 */
function derefSchema(schema, options, state) {

  if (!state) {
    state = {
      circular: false,
      history: [],
      circularRefs: []
    };
  }

  if (state.circular) {
    return;
  }

  return traverse(schema).map(function (node) {
    if (node && node['$ref'] && typeof node['$ref'] === 'string') {
      var refType = utils.getRefType(node);
      var refVal = utils.getRefValue(node);

      if (refVal === '#') {
        // self referencing schema
        state.circular = true;
        state.circularRefs.push(refVal);
        this.update(node, true);
        return;
      }

      var nodeHistory = buildNodeHistory(this.parent);

      var refPaths = refVal.split('/');
      var finalRef = refPaths[refPaths.length - 1] ? refPaths[refPaths.length - 1].toLowerCase() : null;

      if ((refType === 'local' && finalRef && nodeHistory.indexOf(finalRef) >= 0) ||
        (state.history.indexOf(refVal) >= 0)) {
        state.circular = true;
        state.circularRefs.push(refVal);
        this.update(node, true);
        return;
      }

      state.history.push(refVal);

      var newValue = getRefSchema(refVal, refType, schema, options, state);
      if (newValue) {
        this.update(newValue);
        if (state.circularRefs.indexOf(refVal) === -1) {
          state.history.pop();
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

  cache = {};

  var state = {
    circular: false,
    history: [],
    circularRefs: []
  };

  var firstPass = derefSchema(schema, options, state);

  if (!firstPass || state.circular) {
    return new Error('circular references found: ' + state.circularRefs.toString());
  }

  // order of deref / traversal is unpredictable and not as required to fully do in one pass
  // we need to do a 2nd pass to get missed ones
  return derefSchema(firstPass, options);
}

deref.prototype.getRefPathValue = utils.getRefPathValue;

module.exports = deref;