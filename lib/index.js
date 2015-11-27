var _ = require('lodash');
var utils = require('./utils');
var traverse = require('traverse');

var defaults = {
  baseFolder: process.cwd()
};

var loaders = {
  'file': require('./loaders/file')
};

function getRefSchema(refVal, refType, parent, options, state) {
  if (refType && loaders[refType]) {
    var newVal;

    var loaderValue = loaders[refType](refVal, options);
    if (loaderValue) {
      loaderValue = derefSchema(loaderValue, options, state);
    }

    if (loaderValue) {
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

var jsonSchemaKeywords = ['member', 'property', 'schema', 'targetschema', 'type', 'element', 'properties',
  'definitions'];

function buildNodeHistory(node, history) {
  if (!history) {
    history = [];
  }

  if (node && node.key && jsonSchemaKeywords.indexOf(node.key) === -1) {
    history.push(node.key);
  }

  if (!node || !node.parent) {
    return history;
  }

  return buildNodeHistory(node.parent, history);
}

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

      var nodeHistory = buildNodeHistory(this.parent);

      var refPaths = refVal.split('/');
      var finalRef = refPaths[refPaths.length - 1];

      if ((nodeHistory.indexOf(finalRef) >= 0) || (state.history.indexOf(refVal) >= 0)) {
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

  var state = {
    circular: false,
    history: [],
    circularRefs: []
  };


  var firstPass = derefSchema(schema, options, state);

  if (!firstPass || state.circular) {
    return new Error('circular references found: ' + state.circularRefs.toString());
  }

  return derefSchema(firstPass, options);
}

deref.prototype.getRefPathValue = utils.getRefPathValue;

module.exports = deref;