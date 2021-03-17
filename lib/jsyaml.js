/**
 * wrapper library of js-yaml
 */
 const jsyaml = require('js-yaml');
 const jstypes = require('js-yaml-js-types');
 const parser = require('esprima');

 /**
 * Function, AsyncFunction 型に対応した js-yaml schema
 */
const fn = new jsyaml.Type('tag:yaml.org,2002:js/function', {
  kind: 'scalar',
  
  resolve(data) {
    if (data === null) return false;
    try {
      const source = '(' + data + ')',
          ast    = parser.parse(source, { range: true });
      if (
        ast.type                    !== 'Program'             ||
        ast.body.length             !== 1                     ||
        ast.body[0].type            !== 'ExpressionStatement' ||
        (
          ast.body[0].expression.type !== 'ArrowFunctionExpression' &&
          ast.body[0].expression.type !== 'FunctionExpression'
        ))
      {
        return false;
      }
      return true;
    } catch (err) {
      return false;
    }
  },

  construct(data) {
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const source = '(' + data + ')',
        ast    = parser.parse(source, { range: true }),
        params = [];
    if (
      ast.type                    !== 'Program'             ||
      ast.body.length             !== 1                     ||
      ast.body[0].type            !== 'ExpressionStatement' ||
      (
        ast.body[0].expression.type !== 'ArrowFunctionExpression' &&
        ast.body[0].expression.type !== 'FunctionExpression' &&
        ast.body[0].expression.type !== 'AsyncFunctionExpression'
      ))
    {
      throw new Error('Failed to resolve function');
    }

    ast.body[0].expression.params.forEach(function (param) {
      params.push(param.name);
    });

    const body = ast.body[0].expression.body.range;
    // Parser's ranges include the first '{' and the last '}' characters on function expressions. So cut them out.
    if (ast.body[0].expression.body.type === 'BlockStatement') {
      return ast.body[0].expression.constructor.name === 'AsyncFunctionExpression'?
        new AsyncFunction(params, source.slice(body[0] + 1, body[1] - 1))
        : new Function(params, source.slice(body[0] + 1, body[1] - 1));
    }
    // ES6 arrow functions can omit the BlockStatement. In that case, just return the body.
    return ast.body[0].expression.constructor.name === 'AsyncFunctionExpression'?
      new AsyncFunction(params, 'return ' + source.slice(body[0], body[1]))
      : new Function(params, 'return ' + source.slice(body[0], body[1]));
  },

  predicate(object) {
    const type = Object.prototype.toString.call(object)
    return type === '[object Function]' || type === '[object AsyncFunction]';
  },
  
  represent(object) {
    return object.toString().replace(/^async /, 'async function ');
  },
});

/**
 * js-yaml の schema として全てのJavaScript型に対応した FULL_SCHEMA を定義
 */
const FULL_SCHEMA = jsyaml.DEFAULT_SCHEMA.extend([fn, jstypes.undefined, jstypes.regexp]);

module.exports = {
  types: {
    fn,
    undefined: jstypes.undefined,
    regexp: jstypes.regexp,
  },

  FULL_SCHEMA,

  /**
   * FULL_SCHEMA に対応した jsyaml.dump
   * @param {object} data
   * @return {string} yaml_string
   */
  dump(data) {
    return jsyaml.dump(data, {schema: FULL_SCHEMA});
  },

  /**
   * FULL_SCHEMA に対応した jsyaml.load
   * @param {string} yaml_string
   * @return {object} data
   */
  load(yaml_string) {
    return jsyaml.load(yaml_string, {schema: FULL_SCHEMA});
  },
};