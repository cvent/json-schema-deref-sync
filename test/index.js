/* eslint-env mocha */
describe('json-schema-deref-sync', function () {
  var expect = require('chai').expect
  var deref = require('../')
  var path = require('path')
  var fsx = require('fs.extra')
  var async = require('async')
  var fileLoader = require('../lib/loaders/file')
  var customLoaders = require('./custom-loaders')

  var tempFolder = '/var/tmp/json-deref-schema-tests/'
  before(function (done) {
    var srcfiles = ['id.json', 'foo.json', 'bar.json', 'id.yml', 'componentsfoo.yaml', 'componentsbar.YAML']
    fsx.rmrfSync(tempFolder)
    fsx.mkdirpSync(tempFolder)
    async.eachSeries(
      srcfiles,
      function (filePath, cb) {
        var srcFile = path.resolve(path.join(__dirname, './schemas', filePath))
        var desFile = path.join('/var/tmp/json-deref-schema-tests/', filePath)
        fsx.copy(srcFile, desFile, cb)
      },
      done
    )
  })

  after(function (done) {
    fsx.rmrf(tempFolder, done)
  })

  describe('deref', function () {
    it('should work with basic schema', function () {
      var basicSchema = require('./schemas/basic')

      var schema = deref(basicSchema)
      expect(schema).to.be.ok
      expect(schema).to.deep.equal(basicSchema)
    })

    it('should work with basic local refs', function () {
      var input = require('./schemas/localrefs')
      var expected = require('./schemas/localrefs.expected.json')

      var schema = deref(input)
      expect(schema).to.be.ok
      expect(schema).to.deep.equal(expected)
    })

    it('should work with basic file refs and relative baseFolder', function () {
      var input = require('./schemas/basicfileref')
      var expected = require('./schemas/basic')

      var schema = deref(input, { baseFolder: './test/schemas' })
      expect(schema).to.be.ok
      expect(schema).to.deep.equal(expected)
    })

    it('should work with basic file refs and absolute + relative baseFolder', function () {
      var input = require('./schemas/basicfileref')
      var expected = require('./schemas/basic')
      const baseFolder = path.resolve(__dirname, './schemas')
      var schema = deref(input, { baseFolder })
      expect(schema).to.be.ok
      expect(schema).to.deep.equal(expected)
    })

    it('should work with basic file refs and absolute baseFolder', function () {
      var input = require('./schemas/basicfileref')
      var expected = require('./schemas/basic')

      var schema = deref(input, { baseFolder: path.join(__dirname, 'schemas') })
      expect(schema).to.be.ok
      expect(schema).to.deep.equal(expected)
    })

    it('should work with local and file refs', function () {
      var input = require('./schemas/localandfilerefs')
      var expected = require('./schemas/localrefs.expected.json')

      var schema = deref(input, { baseFolder: './test/schemas' })
      expect(schema).to.be.ok
      expect(schema).to.deep.equal(expected)
    })

    it('should work with absolute files', function () {
      var input = require('./schemas/filerefs')
      var expected = require('./schemas/basic.json') // same expected output

      var schema = deref(input)
      expect(schema).to.be.ok
      expect(schema).to.deep.equal(expected)
    })

    it('should work with absolute files with # at end', function () {
      var input = require('./schemas/filerefswithhash')
      var expected = require('./schemas/basic.json') // same expected output

      var schema = deref(input)
      expect(schema).to.be.ok
      expect(schema).to.deep.equal(expected)
    })

    it('should work with yaml files using custom loader', function () {
      var input = require('./schemas/filerefsyaml.json')
      var expected = require('./schemas/basic')

      var schema = deref(input, {
        baseFolder: './test/schemas',
        loaders: {
          file: customLoaders.file
        }
      })
      expect(schema).to.be.ok
      expect(schema).to.deep.equal(expected)
    })

    it('should work with simple web refs', function () {
      var input = require('./schemas/webrefs')
      var expected = require('./schemas/webrefs.expected.json') // same expected output

      var schema = deref(input)
      expect(schema).to.be.ok
      expect(schema).to.deep.equal(expected)
    })

    it('should work with simple web refs ended with #', function () {
      var input = require('./schemas/webrefswithhash')
      var expected = require('./schemas/webrefswithhash.expected.json') // same expected output

      var schema = deref(input)
      expect(schema).to.be.ok
      expect(schema).to.deep.equal(expected)
    })

    it('should work with web and local mixed refs', function () {
      var input = require('./schemas/webwithlocal')
      var expected = require('./schemas/webwithlocal.expected.json')

      var schema = deref(input)
      expect(schema).to.be.ok
      expect(schema).to.deep.equal(expected)
    })

    it('should work with simple web refs ended with # and option', function () {
      var input = require('./schemas/webrefswithhash')
      var expected = require('./schemas/webrefswithhash.expected.json') // same expected output

      var schema = deref(input, { baseFolder: './test/schemas' })
      expect(schema).to.be.ok
      expect(schema).to.deep.equal(expected)
    })

    it('should work with web refs with json pointers', function () {
      var input = require('./schemas/webrefswithpointer')
      var expected = require('./schemas/webrefswithpointer.expected.json')

      var schema = deref(input)
      expect(schema).to.be.ok
      expect(schema).to.deep.equal(expected)
    })

    it('should work with file refs with json pointers', function () {
      var input = require('./schemas/filerefswithpointer')
      var expected = require('./schemas/filerefswithpointer.expected.json') // same expected output

      var schema = deref(input, { baseFolder: './test/schemas' })
      expect(schema).to.be.ok
      expect(schema).to.deep.equal(expected)
    })

    it('should work with nested json pointers', function () {
      var input = require('./schemas/api.props.json')
      var expected = require('./schemas/api.props.expected.json')

      var schema = deref(input, { baseFolder: './test/schemas' })
      expect(schema).to.be.ok
      expect(schema).to.deep.equal(expected)
    })

    it('should work with nested json pointers to files and links ref to files', function () {
      var input = require('./schemas/api.linksref.json')
      var expected = require('./schemas/api.linksref.expected.json')

      var schema = deref(input, { baseFolder: './test/schemas' })
      expect(schema).to.be.ok
      expect(schema).to.deep.equal(expected)
    })

    it('should work with nested json pointers to files and links ref to files via custom loader', function () {
      var input = require('./schemas/api.linksref.json')
      var expected = require('./schemas/api.linksref.expected.json')

      var schema = deref(input, { baseFolder: './test/schemas', loaders: { file: fileLoader } })
      expect(schema).to.be.ok
      expect(schema).to.deep.equal(expected)
    })

    it('should work with nested json pointers to files with redirect to file in an array', function () {
      var input = require('./schemas/arrayfileref.json')
      var expected = require('./schemas/arrayfileref.expected.json')

      var schema = deref(input, { baseFolder: './test/schemas' })
      expect(schema).to.be.ok
      expect(schema).to.deep.equal(expected)
    })

    it('should work with deep links', function () {
      var input = require('./schemas/apideeplink.json')
      var expected = require('./schemas/apideeplink.expected.json')

      var schema = deref(input, { baseFolder: './test/schemas' })
      expect(schema).to.be.ok
      expect(schema).to.deep.equal(expected)
    })

    it('should work with deep nested ref links', function () {
      var input = require('./schemas/apinestedrefs.json')
      var expected = require('./schemas/apinestedrefs.expected.json')

      var schema = deref(input, { baseFolder: './test/schemas' })
      expect(schema).to.be.ok
      expect(schema).to.deep.equal(expected)
    })

    it('should work with custom types', function () {
      var input = require('./schemas/customtype.json')
      var expected = require('./schemas/customtype.expected.json')

      var options = {
        baseFolder: './test/schemas'
      }

      var schema = deref(input, options)
      expect(schema).to.be.ok
      expect(schema).to.deep.equal(expected)
    })

    it('should work unknown type 2', function () {
      var input = require('./schemas/customunknown.json')
      var expected = require('./schemas/customunknown.expected.json')

      var options = {
        baseFolder: './test/schemas'
      }

      var schema = deref(input, options)
      expect(schema).to.be.ok
      expect(schema).to.deep.equal(expected)
    })

    it('should work with missing properties', function () {
      var input = require('./schemas/missing.json')
      var expected = require('./schemas/missing.expected.json')

      var schema = deref(input, { baseFolder: './test/schemas' })
      expect(schema).to.be.ok
      expect(schema).to.deep.equal(expected)
    })

    it('should error with missing properties if option specified', function () {
      var input = require('./schemas/missing.json')
      var expected = require('./schemas/missing.expected.json')

      var schema = deref(input, { baseFolder: './test/schemas', failOnMissing: true })
      expect(schema).to.be.ok
      expect(schema).to.be.an.instanceOf(Error)
    })

    it('should work with anyOf array properties', function () {
      var input = require('./schemas/anyofref.json')
      var expected = require('./schemas/anyofref.expected.json')

      var schema = deref(input, { baseFolder: './test/schemas' })
      expect(schema).to.be.ok
      expect(schema).to.deep.equal(expected)
    })

    it('should work with dots (.) in properties', function () {
      var input = require('./schemas/dotprop.json')
      var expected = require('./schemas/dotprop.expected.json')

      var schema = deref(input, { baseFolder: './test/schemas' })
      expect(schema).to.be.ok
      expect(schema).to.deep.equal(expected)
    })

    it('should work with top level ref properties', function () {
      var input = require('./schemas/toplevel.json')
      var expected = require('./schemas/toplevel.expected.json')

      var schema = deref(input, { baseFolder: './test/schemas' })
      expect(schema).to.be.ok
      expect(schema).to.deep.equal(expected)
    })

    it('should work with local circular ref properties', function () {
      var input = require('./schemas/circularlocalref.json')
      var expected = require('./schemas/circularlocalref.expected.json')

      var schema = deref(input, { baseFolder: './schemas' })
      expect(schema).to.be.ok
      expect(schema).to.be.an.instanceOf(Error)
    })

    it('should work with local self referencing properties', function () {
      var input = require('./schemas/circularself.json')
      var expected = require('./schemas/circularself.expected.json')

      var schema = deref(input, { baseFolder: './test/schemas' })

      expect(schema).to.be.ok
      expect(schema).to.be.an.instanceOf(Error)
    })

    it('should work with circular file ref properties', function () {
      var input = require('./schemas/circular-file-root.json')
      var expected = require('./schemas/circular-file-root.expected.json')

      var schema = deref(input, { baseFolder: './test/schemas' })

      expect(schema).to.be.ok
      expect(schema).to.be.an.instanceOf(Error)
    })

    it('should work with array refs in file', function () {
      var input = require('./schemas/filerefarray-schema1.json')
      var expected = require('./schemas/filerefarray.expected.json')

      var schema = deref(input, { baseFolder: './test/schemas' })
      expect(schema).to.be.ok
      expect(schema).to.deep.equal(expected)
    })

    it('should work with cyclycal object', function () {
      var input = require('./schemas/cyclicaljs.json')

      var schema = deref(input, { baseFolder: './test/schemas' })

      expect(schema).to.be.ok
      expect(schema).to.be.an.instanceOf(Error)
    })

    it('should work with nested folders object', function () {
      var input = require('./schemas/nestedfolder.json')
      var expected = require('./schemas/nestedfolder.expected.json')

      var schema = deref(input, { baseFolder: './test/schemas' })
      expect(schema).to.be.ok
      expect(schema).to.deep.equal(expected)
    })

    it('should work with nested schema issue 12', function () {
      var input = require('./schemas/issue12.json')
      var expected = require('./schemas/issue12.expected.json')

      var schema = deref(input, { baseFolder: './test/schemas' })
      expect(schema).to.be.ok
      expect(schema).to.deep.equal(expected)
    })

    it('should work with falsy values in schema', function () {
      var input = require('./schemas/includesnullvalues.json')
      var expected = require('./schemas/includesnullvalues.expected.json')

      var schema = deref(input)
      expect(schema).to.be.ok
      expect(schema).to.deep.equal(expected)
    })

    it('should work with null values in default attribute', function () {
      const input = require('./schemas/null.json')
      const expected = require('./schemas/null.expected.json')

      var schema = deref(input, { baseFolder: './test/schemas' })
      expect(schema).to.be.ok
      expect(schema).to.deep.equal(expected)
    })

    it('should work with paths of the same name as ref', function () {
      var input = require('./schemas/notcircularlocalref.json')
      var expected = require('./schemas/notcircularlocalref.expected.json')
      var schema = deref(input)
      expect(schema).to.be.ok
      expect(schema).to.deep.equal(expected)
    })

    it('should work with keys containing "."', function () {
      var input = require('./schemas/dot-key.json')
      var expected = require('./schemas/dot-key.expected.json')
      var schema = deref(input)
      expect(schema).to.be.ok
      expect(schema).to.deep.equal(expected)
    })
  })
})
