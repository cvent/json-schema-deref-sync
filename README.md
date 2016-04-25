# json-schema-deref-sync

Dereference JSON pointers in a JSON schemas with their true resolved values.
Basically a lighter, synchronous version of [json-schema-deref](https://github.com/bojand/json-schema-deref) but omits web references and
custom loaders.

## Installation

`npm install json-schema-deref-sync`

## Overview

Let's say you have the following JSON Schema:

```json
{
  "description": "Just some JSON schema.",
  "title": "Basic Widget",
  "type": "object",
  "definitions": {
    "id": {
      "description": "unique identifier",
      "type": "string",
      "minLength": 1,
      "readOnly": true
    }
  },
  "properties": {
    "id": {
      "$ref": "#/definitions/id"
    },
    "foo": {
      "$ref": "http://www.mysite.com/myschema.json#/definitions/foo"
    },
    "bar": {
      "$ref": "bar.json"
    }
  }
}
```

Sometimes you just want that schema to be fully expanded, with `$ref`'s being their (true) resolved values:

```json
{
  "description": "Just some JSON schema.",
  "title": "Basic Widget",
  "type": "object",
  "definitions": {
    "id": {
      "description": "unique identifier",
      "type": "string",
      "minLength": 1,
      "readOnly": true
    }
  },
  "properties": {
    "id": {
      "description": "unique identifier",
      "type": "string",
      "minLength": 1,
      "readOnly": true
    },
    "foo": {
      "description": "foo property",
      "readOnly": true,
      "type": "number"
    },
    "bar": {
      "description": "bar property",
      "type": "boolean"
    }
  }
}
```

This utility lets you do that:


```js
var deref = require('json-schema-deref-sync');
var myschema = require('schema.json');

var fullSchema = deref(myschema);
```

## API Reference

<a name="deref"></a>

## deref(schema, options) ⇒ <code>Object</code> &#124; <code>Error</code>
Derefs <code>$ref</code>'s in JSON Schema to actual resolved values. Supports local, and file refs.

**Kind**: global function  
**Returns**: <code>Object</code> &#124; <code>Error</code> - the deref schema oran instance of <code>Error</code> if error.  

| Param | Type | Description |
| --- | --- | --- |
| schema | <code>Object</code> | The JSON schema |
| options | <code>Object</code> | options |
| options.baseFolder | <code>String</code> | the base folder to get relative path files from. Default is <code>process.cwd()</code> |
| options.failOnMissing | <code>Boolean</code> | By default missing / unresolved refs will be left as is with their ref value intact.                                        If set to <code>true</code> we will error out on first missing ref that we cannot                                        resolve. Default: <code>false</code>. |

