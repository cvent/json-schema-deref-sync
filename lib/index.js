var _ = require('lodash');
var utils = require('./utils');
var traverse = require('traverse');
var path = require('path');

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
    var oldBasePath;
    var loaderValue;

    if (refType === 'file') {
      var filePath = utils.getRefFilePath(refVal);

      if (cache[filePath]) {
        loaderValue = cache[filePath];
      }
    }

    if (!loaderValue) {
      loaderValue = loaders[refType](refVal, options);
      if (loaderValue) {
        // adjust base folder if needed so that we can handle paths in nested folders
        if (refType === 'file') {
          var dirname = path.dirname(filePath);
          if (dirname === '.') {
            dirname = '';
          }

          if (dirname) {
            oldBasePath = state.cwd;
            var newBasePath = path.resolve(state.cwd, dirname);
            options.baseFolder = state.cwd = newBasePath;
          }
        }

        loaderValue = derefSchema(loaderValue, options, state);

        // reset
        if (oldBasePath) {
          options.baseFolder = state.cwd = oldBasePath;
        }
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

function derefType(schema, options, state, type) {
  if (state.circular) {
    return;
  }

  return traverse(schema).map(function (node) {
    if (node && node['$ref'] && typeof node['$ref'] === 'string') {
      var refType = utils.getRefType(node);
      var refVal = utils.getRefValue(node);

      if (refType == type) {

        if (refVal === '#') {
          // self referencing schema
          state.circular = true;
          state.circularRefs.push(refVal);
          this.update(node, true);
          return;
        }

        var nodeHistory = buildNodeHistory(this.parent);

        var filePath;
        var refPaths = refVal.split('/');
        var finalRef = refPaths[refPaths.length - 1] ? refPaths[refPaths.length - 1].toLowerCase() : null;

        if ((refType === 'local' && finalRef && nodeHistory.indexOf(finalRef) >= 0)) {
          state.circular = true;
          state.circularRefs.push(refVal);
          this.update(node, true);
          return;
        }
        else if (refType === 'file') {
          filePath = utils.getRefFilePath(refVal);
          if (!path.isAbsolute(filePath) && state.cwd) {
            filePath = path.resolve(state.cwd, filePath);
          }

          if (state.history.indexOf(filePath) >= 0) {
            state.circular = true;
            state.circularRefs.push(filePath);
            this.update(node, true);
            return;
          }
        }

        state.history.push(filePath || refVal);

        var newValue = getRefSchema(refVal, refType, schema, options, state);
        if (newValue) {
          this.update(newValue);
          if (state.circularRefs.indexOf(refVal) === -1) {
            state.history.pop();
          }
          if (state.missing.indexOf(refVal) !== -1) {
            state.missing.splice(state.missing.indexOf(refVal), 1);
          }
        }
        else {
          state.history.pop();
          if (state.missing.indexOf(refVal) === -1) {
            if (state.circularRefs.indexOf(refVal) !== -1) {
              state.circularRefs.splice(state.circularRefs.indexOf(refVal), 1);
            }
            state.missing.push(refVal);
          }
        }
      }
    }
  });
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

  state.missing = [];

  while (!state.circular && hasRefs(schema, state.missing, 'file')) {
    schema = derefType(schema, options, state, 'file');
  }
  while (!state.circular && hasRefs(schema, state.missing, 'local')) {
    schema = derefType(schema, options, state, 'local');
  }

  return schema;
}

function hasRefs(schema, missing, type) {
  var refs = [];
  traverse(schema).forEach(function (node) {
    if (node && node['$ref'] && typeof node['$ref'] === 'string') {
      var refVal = utils.getRefValue(node);
      var refType = utils.getRefType(node);
      if(type) {
        if(refType === type) {
          refs.push(refVal);
        }
      }
      else {
        refs.push(refVal);
      }
    }
  });

  var diff = _.difference(refs, missing);
  return diff && diff.length > 0;
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

  var bf = options.baseFolder;
  var cwd = bf;
  if (!path.isAbsolute(bf)) {
    cwd = path.resolve(process.cwd(), bf);
  }

  var state = {
    circular: false,
    history: [],
    circularRefs: [],
    cwd: cwd,
    missing: []
  };

  var ret = derefSchema(schema, options, state);
  if (ret instanceof Error) {
    return ret;
  }
  else if (!ret || state.circular) {
    ret = new Error('circular references found: ' + state.circularRefs.toString());
  }


  return ret;
}

deref.prototype.getRefPathValue = utils.getRefPathValue;

module.exports = deref;