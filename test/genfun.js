'use strict'
var assert = require('assert')
var genfun = require('..')

describe('genfun', function () {
  describe('genfun()', function () {
    it('creates a new genfun', function () {
      assert.equal('function', typeof genfun())
    })
    it('calls noApplicableMethod if called without adding methods', function () {
      var frob = genfun()
      assert.throws(frob, function (err) {
        return err.message === 'No applicable method found when called ' +
          'with arguments of types: ()'
      })
      genfun.noApplicableMethod.add([frob], function () {
        return 'success'
      })
      assert.equal('success', frob())
    })
  })

  describe('noApplicableMethod', function () {
    var frob = genfun()
    var container = { frob: frob }
    var data = [1, 2, 3]
    it('throws an exception if there is no applicable method', function () {
      assert.throws(frob, function (err) { return err instanceof Error })
    })
    it('includes the types of the inputs in the message', function () {
      assert.throws(function () { frob(data) }, function (err) {
        return err.message === 'No applicable method found when called ' +
          'with arguments of types: (Array)'
      })
      assert.throws(function () { frob({}) }, function (err) {
        return err.message === 'No applicable method found when called ' +
          'with arguments of types: (Object)'
      })
    })
    it('includes the original call arguments in the Error instance', function () {
      assert.throws(function () { frob(data) }, function (err) {
        return err.args.length === 1 && err.args[0] === data
      })
    })
    it('includes the `this` argument in the Error instance', function () {
      assert.throws(function () { frob.call(data) }, function (err) {
        return err.thisArg === data
      })
    })
    it('can be modified so something different happens if dispatch fails', function () {
      genfun.noApplicableMethod.add([frob], function () {
        return arguments
      })
      var result = container.frob('foo')
      assert.equal(frob, result[0])
      assert.equal(container, result[1])
      assert.equal('foo', result[2][0])
    })
    it('is only called when dispatch fails', function () {
      frob.add([], function () {
        return 'regular method'
      })
      assert.equal('regular method', frob())
    })
  })
  describe('#apply', function () {
    describe('basic call semantics', function () {
      var frob = genfun()
      frob.add([], function () {
        return {'this': this, 'arguments': arguments}
      })
      var container = {frob: frob}
      it('can be called like a normal function', function () {
        assert.equal('success', frob('success')['arguments'][0])
        assert.equal(container, container.frob()['this'])
      })
      it('can be called using .call', function () {
        assert.equal('success', frob.call(null, 'success')['arguments'][0])
        assert.equal(container, frob.call(container)['this'])
      })
      it('can be called using .apply', function () {
        assert.equal('success', frob.apply(null, ['success'])['arguments'][0])
        assert.equal(container, frob.apply(container)['this'])
      })
      it('calls noApplicableMethod if there are no methods defined')
    })
    describe('callNextMethod', function () {
      it('allows the next applicable method to be called', function () {
        var frob = genfun()
        var obj = Object.create({})
        var objChild = Object.create(obj)
        frob.add([Object], function () {
          return 'default'
        })
        frob.add([obj], function () {
          return genfun.callNextMethod()
        })
        frob.add([objChild], function () {
          return genfun.callNextMethod()
        })
        assert.equal('default', frob(obj))
        assert.equal('default', frob(objChild))
      })
      it('can only be called when there is a next method available', function () {
        var frob = genfun()
        var obj = Object.create({})
        frob.add([frob], function () {
          return genfun.callNextMethod()
        })
        assert.throws(function () { frob(Object.create(obj)) })
        frob.add([Object], function () { return 'ok!' })
        assert.equal('ok!', frob(Object.create(obj)))
      })
      it('can only be called within the scope of a method', function () {
        var frob = genfun()
        var obj = Object.create({})
        frob.add([Object], function () {
          return 'ok'
        })
        frob.add([obj], function () {
          return genfun.callNextMethod()
        })
        assert.throws(function () { genfun.callNextMethod() })
        assert.equal('ok', frob(obj))
      })
      it('does not call noApplicableMethod when done', function () {
        var frob = genfun()
        var obj = Object.create({})
        frob.add([], function () {
          return 'noApplicableMethod'
        })
        frob.add([obj], function () {
          return genfun.callNextMethod()
        })
        assert.throws(function () { frob(obj) })
      })
      it('calls the next method using the original arguments', function () {
        var frob = genfun()
        var obj = {}
        frob.add([Object], function () {
          return {
            args: arguments,
            thisval: this
          }
        })
        frob.add([obj], function () {
          return genfun.callNextMethod()
        })
        var ret = frob.call('test', obj)
        assert.equal(obj, ret.args[0])
        assert.equal('test', ret.thisval)
      })
      it('accepts new arguments for the next method to use', function () {
        var frob = genfun()
        var obj = {name: 'whoosh'}
        frob.add([Object], function (arg) {
          return arg+' called next.'
        })
        frob.add([obj], function (x) {
          return 'And so then, ' + genfun.callNextMethod(obj.name)
        })
        assert.equal('And so then, whoosh called next.', frob(obj))
      })
      it('allows rebinding of `this` in the next method')
    })
    describe('hasNextMethod', function () {
      it('returns true if there is a next method available')
      it('can only be called in the scope of a method')
    })
    describe('noNextMethod', function () {
      it('throws an error by default')
      it('can have methods defined on it to replace the behavior per-genfun')
    })
    describe('method combination', function () {
    })
    describe('dispatch', function () {
      describe('basic single dispatch', function () {
        var frob = genfun()
        var container = {frob: frob}
        var Ctr = function () {}
        frob.add([Ctr], function (ctr) {
          return {
            arguments: arguments,
            this: this
          }
        })
        it('dispatches methods based on the prototype of its argument', function () {
          var obj = new Ctr()
          assert.equal(obj, frob(obj).arguments[0])
        })
        it('fails if there is no method defined for the given argument', function () {
          assert.throws(function () { return frob('nothing') })
        })
        it('properly binds `this` in the method to the genfun\'s `this`', function () {
          assert.equal(container, container.frob(new Ctr()).this)
        })
        it('dispatches the most specific method when multiple methods apply', function () {
          frob.add([Object], function (obj) {
            return 'NOPE'
          })
          var obj = new Ctr()
          assert.equal(obj, frob(obj).arguments[0])
        })
        it('can dispatch on objects where [[Proto]] is null', function () {
          var frob = genfun()
          var nullProto = Object.create(null)
          frob.add([nullProto], function () {
            return 'nullProto'
          })
          assert.equal('nullProto', frob(nullProto))
        })
        it('calls noApplicableMethod correctly if [[Proto]] is null and no applicable method exists for the argument', function () {
          var frob = genfun()
          var nullProto = Object.create(null)
          frob.add([Object], function () {
            return 'whatever'
          })
          genfun.noApplicableMethod.add([frob], function () {
            return 'nullProto'
          })
          assert.equal('nullProto', frob(nullProto))
        })
      })
      describe('ToObject dispatch conversion', function () {
        it('dispatches primitives according to their ToObject\'s prototypes')
        it('passes the original primitive into the effective method function')
        it('works on booleans, numbers, and strings')
      })
      describe('Object.prototype empty-index shorthand', function () {
        var frob = genfun()
        it('lets you write empty array indices into dispatch array to mean Object.prototype', function () {
          frob.add([,Number], function (x, num) {
            return x
          })
          frob.add([String, Number], function (x, num) {
            return num
          })
          frob.add([], function () {
            return 'nomethod'
          })
          assert.equal(5, frob(5, 10))
          assert.equal(10, frob('5', 10))
          assert.equal('nomethod', frob(Object.create(null), 5))
        })
      })
      describe('0-arity dispatch', function () {
        var frob = genfun()
        frob.add([], function (arg) { return arg })
        it('dispatches to a single method when only one method with an empty dispatch array is defined', function () {
          var val = {}
          assert.equal(val, frob(val))
          assert.equal(undefined, frob())
        })
        it('dispatches to the empty/default method when an arg\'s [[Proto]] is null')
      })
      describe('multi-argument dispatch', function () {
        it('compares all given arguments to the dispatch lists for its methods')
        it('weighs methods based on the arguments\' distance to dispatch prototypes')
        it('gives greater weight to earlier arguments')
        it('fails dispatch when an object with null [[Proto]] with no applicable roles is involved', function () {
          var frob = genfun()
          var nullProto = Object.create(null)
          frob.add([Object, Object], function () {
            return 'please no'
          })
          genfun.noApplicableMethod.add([frob], function () {
            return 'success'
          })
          assert.equal('please no', frob({}, {}))
          assert.equal('success', frob(nullProto, {}))
          assert.equal('success', frob({}, nullProto))
          assert.equal('success', frob(nullProto, nullProto))
        })
      })
      describe('variable arity dispatch', function () {
        it('treats \'unfilled\' spaces like Object.prototype when comparing ' +
           'methods with dispatch arrays of different lengths')
        it('handles complex interactions between all the dispatch features', function () {
          var frobnicate = genfun()

          frobnicate.add([Number], function (num) {
            return 'one number: ' + num
          })

          frobnicate.add([String], function (str) {
            return 'one string: ' + str
          })

          frobnicate.add([String, Number], function (string, number) {
            return 'string + number: ' + string + ', ' + number
          })

          frobnicate.add([Number, String], function (number, string) {
            return 'number + string: ' + number + ', ' + string
          })

          frobnicate.add([], function () {
            return 'Dispatch fell through'
          })

          frobnicate.add([Number, , String], function (number, anything, string) {
            return 'number + anything + string: '
            + number + ', ' + anything + ', ' + string
          })

          function test (expected, args) {
            assert.equal(expected, frobnicate.apply(null, args))
          }
          test('string + number: foo, 1', [new String('foo'), new Number(1)])
          test('number + string: 1, foo', [1, 'foo'])
          test('one number: 1', [1, 2])
          test('one number: 1', [1])
          test('one string: str', ['str'])
          test('Dispatch fell through', [true])
          test('Dispatch fell through', [])
          test('number + anything + string: 1, true, foo', [1, true, 'foo'])
        })
      })
      it('treats empty array items (`[x, ,z]`) like Object.prototype', function () {
        var frob = genfun()
        var x = {}
        frob.add([x, ,x], function (a, b, c) {
          return '3-arg method'
        })
        frob.add([], function () {
          return '0-arg method'
        })
        assert.equal('3-arg method', frob(x, x, x))
        assert.equal('3-arg method', frob(x, {}, x))
        assert.equal('0-arg method', frob(x, Object.create(null), x))
      })
    })
  })

  describe('Genfun#add', function () {
    it('defines a new method on the genfun')
    it('is accessible as a method on genfuns', function () {
      var frob = genfun()
      frob.add([String], function (str) { return str + '!' })
      assert.equal('success!', frob('success'))
    })
    it('can define methods that dispatch on objects with null [[Proto]]', function () {
      var frob = genfun()
      var nullProto = Object.create(null)
      frob.add([nullProto, nullProto], function () {
        return 'success'
      })
      assert.equal('success', frob(nullProto, nullProto))
    })
    it('defines and returns a noApplicableMethod method if given an empty array', function () {
      var frob = genfun()
      frob.add([String], function () { return 'nop' })
      frob.add([], function () { return 'yup' })
      assert.equal('yup', frob(Object.create(null)))
    })
    it('errors if any of the arguments given are primitives')
  })

  describe('removeMethod', function () {
    it('undefines a previously defined method on the genfun')
    it('can remove methods that dispatch on objects with null [[Proto]]')
  })
})
