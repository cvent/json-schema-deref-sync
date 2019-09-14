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
  const filePathLowerCase = filePath.toLowerCase()

  let newValue
  try {
    var data = fs.readFileSync(filePath, 'utf8')
    if (filePathLowerCase.endsWith('.json')) {
      newValue = parseJson(data) || parseYaml(data)
    } else if (filePathLowerCase.endsWith('.yml') || filePathLowerCase.endsWith('.yaml')) {
      newValue = parseYaml(data)
    } else {
      newValue = parseJson(data) || parseYaml(data)
    }
  } catch (e) {}

  return newValue
}
module.exports.file = file

function parseJson(data) {
  try {
    return JSON.parse(data)
  } catch (e) {}
}

function parseYaml(data) {
  try {
    return jsyaml.load(data)
  } catch (e) {}
}