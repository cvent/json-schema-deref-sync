const fs = require('fs')
const path = require('path')
const jsyaml = require('js-yaml')

const { getRefFilePath } = require('../lib/utils')

const cwd = process.cwd();

const file = function (refValue, options) {
  let refPath = refValue
  const baseFolder = options.baseFolder ? path.resolve(cwd, options.baseFolder) : cwd

  if (refPath.indexOf('file:') === 0) {
    refPath = refPath.substring(5)
  } else {
    refPath = path.resolve(baseFolder, refPath)
  }

  const filePath = getRefFilePath(refPath)

  let newValue
  try {
    var data = fs.readFileSync(filePath, 'utf8')
    newValue = jsyaml.load(data)
  } catch (e) {}

  return newValue
}
module.exports.file = file