import { createRequire } from "node:module";
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toESMCache_node;
var __toESMCache_esm;
var __toESM = (mod, isNodeMode, target) => {
  var canCache = mod != null && typeof mod === "object";
  if (canCache) {
    var cache = isNodeMode ? __toESMCache_node ??= new WeakMap : __toESMCache_esm ??= new WeakMap;
    var cached = cache.get(mod);
    if (cached)
      return cached;
  }
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  if (mod && typeof mod === "object" || typeof mod === "function") {
    for (let key of __getOwnPropNames(mod))
      if (!__hasOwnProp.call(to, key))
        __defProp(to, key, {
          get: __accessProp.bind(mod, key),
          enumerable: true
        });
  }
  if (canCache)
    cache.set(mod, to);
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// node_modules/obliterator/iterator.js
var require_iterator = __commonJS(function(exports, module) {
  function Iterator(next) {
    if (typeof next !== "function")
      throw new Error("obliterator/iterator: expecting a function!");
    this.next = next;
  }
  if (typeof Symbol !== "undefined")
    Iterator.prototype[Symbol.iterator] = function() {
      return this;
    };
  Iterator.of = function() {
    var args = arguments, l = args.length, i = 0;
    return new Iterator(function() {
      if (i >= l)
        return { done: true };
      return { done: false, value: args[i++] };
    });
  };
  Iterator.empty = function() {
    var iterator = new Iterator(function() {
      return { done: true };
    });
    return iterator;
  };
  Iterator.fromSequence = function(sequence) {
    var i = 0, l = sequence.length;
    return new Iterator(function() {
      if (i >= l)
        return { done: true };
      return { done: false, value: sequence[i++] };
    });
  };
  Iterator.is = function(value) {
    if (value instanceof Iterator)
      return true;
    return typeof value === "object" && value !== null && typeof value.next === "function";
  };
  module.exports = Iterator;
});

// node_modules/obliterator/support.js
var require_support = __commonJS(function(exports) {
  exports.ARRAY_BUFFER_SUPPORT = typeof ArrayBuffer !== "undefined";
  exports.SYMBOL_SUPPORT = typeof Symbol !== "undefined";
});

// node_modules/obliterator/iter.js
var require_iter = __commonJS(function(exports, module) {
  var Iterator = require_iterator();
  var support = require_support();
  var ARRAY_BUFFER_SUPPORT = support.ARRAY_BUFFER_SUPPORT;
  var SYMBOL_SUPPORT = support.SYMBOL_SUPPORT;
  function iterOrNull(target) {
    if (typeof target === "string" || Array.isArray(target) || ARRAY_BUFFER_SUPPORT && ArrayBuffer.isView(target))
      return Iterator.fromSequence(target);
    if (typeof target !== "object" || target === null)
      return null;
    if (SYMBOL_SUPPORT && typeof target[Symbol.iterator] === "function")
      return target[Symbol.iterator]();
    if (typeof target.next === "function")
      return target;
    return null;
  }
  module.exports = function iter(target) {
    var iterator = iterOrNull(target);
    if (!iterator)
      throw new Error("obliterator: target is not iterable nor a valid iterator.");
    return iterator;
  };
});

// node_modules/obliterator/take.js
var require_take = __commonJS(function(exports, module) {
  var iter = require_iter();
  module.exports = function take(iterable, n) {
    var l = arguments.length > 1 ? n : Infinity, array = l !== Infinity ? new Array(l) : [], step, i = 0;
    var iterator = iter(iterable);
    while (true) {
      if (i === l)
        return array;
      step = iterator.next();
      if (step.done) {
        if (i !== n)
          array.length = i;
        return array;
      }
      array[i++] = step.value;
    }
  };
});

// node_modules/obliterator/chain.js
var require_chain = __commonJS(function(exports, module) {
  var Iterator = require_iterator();
  var iter = require_iter();
  module.exports = function chain() {
    var iterables = arguments;
    var current = null;
    var i = -1;
    return new Iterator(function next() {
      var step = null;
      do {
        if (current === null) {
          i++;
          if (i >= iterables.length)
            return { done: true };
          current = iter(iterables[i]);
        }
        step = current.next();
        if (step.done === true) {
          current = null;
          continue;
        }
        break;
      } while (true);
      return step;
    });
  };
});

// node_modules/graphology/dist/graphology.cjs.js
var require_graphology_cjs = __commonJS(function(exports, module) {
  var events = __require("events");
  var Iterator = require_iterator();
  var take = require_take();
  var chain = require_chain();
  function _interopDefaultLegacy(e) {
    return e && typeof e === "object" && "default" in e ? e : { default: e };
  }
  var Iterator__default = /* @__PURE__ */ _interopDefaultLegacy(Iterator);
  var take__default = /* @__PURE__ */ _interopDefaultLegacy(take);
  var chain__default = /* @__PURE__ */ _interopDefaultLegacy(chain);
  function _typeof(obj) {
    "@babel/helpers - typeof";
    return _typeof = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(obj) {
      return typeof obj;
    } : function(obj) {
      return obj && typeof Symbol == "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    }, _typeof(obj);
  }
  function _inheritsLoose(subClass, superClass) {
    subClass.prototype = Object.create(superClass.prototype);
    subClass.prototype.constructor = subClass;
    _setPrototypeOf(subClass, superClass);
  }
  function _getPrototypeOf(o) {
    _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) {
      return o.__proto__ || Object.getPrototypeOf(o);
    };
    return _getPrototypeOf(o);
  }
  function _setPrototypeOf(o, p) {
    _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) {
      o.__proto__ = p;
      return o;
    };
    return _setPrototypeOf(o, p);
  }
  function _isNativeReflectConstruct() {
    if (typeof Reflect === "undefined" || !Reflect.construct)
      return false;
    if (Reflect.construct.sham)
      return false;
    if (typeof Proxy === "function")
      return true;
    try {
      Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {}));
      return true;
    } catch (e) {
      return false;
    }
  }
  function _construct(Parent, args, Class) {
    if (_isNativeReflectConstruct()) {
      _construct = Reflect.construct.bind();
    } else {
      _construct = function _construct(Parent, args, Class) {
        var a = [null];
        a.push.apply(a, args);
        var Constructor = Function.bind.apply(Parent, a);
        var instance = new Constructor;
        if (Class)
          _setPrototypeOf(instance, Class.prototype);
        return instance;
      };
    }
    return _construct.apply(null, arguments);
  }
  function _isNativeFunction(fn) {
    return Function.toString.call(fn).indexOf("[native code]") !== -1;
  }
  function _wrapNativeSuper(Class) {
    var _cache = typeof Map === "function" ? new Map : undefined;
    _wrapNativeSuper = function _wrapNativeSuper(Class) {
      if (Class === null || !_isNativeFunction(Class))
        return Class;
      if (typeof Class !== "function") {
        throw new TypeError("Super expression must either be null or a function");
      }
      if (typeof _cache !== "undefined") {
        if (_cache.has(Class))
          return _cache.get(Class);
        _cache.set(Class, Wrapper);
      }
      function Wrapper() {
        return _construct(Class, arguments, _getPrototypeOf(this).constructor);
      }
      Wrapper.prototype = Object.create(Class.prototype, {
        constructor: {
          value: Wrapper,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
      return _setPrototypeOf(Wrapper, Class);
    };
    return _wrapNativeSuper(Class);
  }
  function _assertThisInitialized(self) {
    if (self === undefined) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }
    return self;
  }
  function assignPolyfill() {
    var target = arguments[0];
    for (var i = 1, l = arguments.length;i < l; i++) {
      if (!arguments[i])
        continue;
      for (var k in arguments[i]) {
        target[k] = arguments[i][k];
      }
    }
    return target;
  }
  var assign = assignPolyfill;
  if (typeof Object.assign === "function")
    assign = Object.assign;
  function getMatchingEdge(graph, source, target, type) {
    var sourceData = graph._nodes.get(source);
    var edge = null;
    if (!sourceData)
      return edge;
    if (type === "mixed") {
      edge = sourceData.out && sourceData.out[target] || sourceData.undirected && sourceData.undirected[target];
    } else if (type === "directed") {
      edge = sourceData.out && sourceData.out[target];
    } else {
      edge = sourceData.undirected && sourceData.undirected[target];
    }
    return edge;
  }
  function isPlainObject(value) {
    return _typeof(value) === "object" && value !== null;
  }
  function isEmpty(o) {
    var k;
    for (k in o) {
      return false;
    }
    return true;
  }
  function privateProperty(target, name, value) {
    Object.defineProperty(target, name, {
      enumerable: false,
      configurable: false,
      writable: true,
      value
    });
  }
  function readOnlyProperty(target, name, value) {
    var descriptor = {
      enumerable: true,
      configurable: true
    };
    if (typeof value === "function") {
      descriptor.get = value;
    } else {
      descriptor.value = value;
      descriptor.writable = false;
    }
    Object.defineProperty(target, name, descriptor);
  }
  function validateHints(hints) {
    if (!isPlainObject(hints))
      return false;
    if (hints.attributes && !Array.isArray(hints.attributes))
      return false;
    return true;
  }
  function incrementalIdStartingFromRandomByte() {
    var i = Math.floor(Math.random() * 256) & 255;
    return function() {
      return i++;
    };
  }
  var GraphError = /* @__PURE__ */ function(_Error) {
    _inheritsLoose(GraphError, _Error);
    function GraphError(message) {
      var _this;
      _this = _Error.call(this) || this;
      _this.name = "GraphError";
      _this.message = message;
      return _this;
    }
    return GraphError;
  }(/* @__PURE__ */ _wrapNativeSuper(Error));
  var InvalidArgumentsGraphError = /* @__PURE__ */ function(_GraphError) {
    _inheritsLoose(InvalidArgumentsGraphError, _GraphError);
    function InvalidArgumentsGraphError(message) {
      var _this2;
      _this2 = _GraphError.call(this, message) || this;
      _this2.name = "InvalidArgumentsGraphError";
      if (typeof Error.captureStackTrace === "function")
        Error.captureStackTrace(_assertThisInitialized(_this2), InvalidArgumentsGraphError.prototype.constructor);
      return _this2;
    }
    return InvalidArgumentsGraphError;
  }(GraphError);
  var NotFoundGraphError = /* @__PURE__ */ function(_GraphError2) {
    _inheritsLoose(NotFoundGraphError, _GraphError2);
    function NotFoundGraphError(message) {
      var _this3;
      _this3 = _GraphError2.call(this, message) || this;
      _this3.name = "NotFoundGraphError";
      if (typeof Error.captureStackTrace === "function")
        Error.captureStackTrace(_assertThisInitialized(_this3), NotFoundGraphError.prototype.constructor);
      return _this3;
    }
    return NotFoundGraphError;
  }(GraphError);
  var UsageGraphError = /* @__PURE__ */ function(_GraphError3) {
    _inheritsLoose(UsageGraphError, _GraphError3);
    function UsageGraphError(message) {
      var _this4;
      _this4 = _GraphError3.call(this, message) || this;
      _this4.name = "UsageGraphError";
      if (typeof Error.captureStackTrace === "function")
        Error.captureStackTrace(_assertThisInitialized(_this4), UsageGraphError.prototype.constructor);
      return _this4;
    }
    return UsageGraphError;
  }(GraphError);
  function MixedNodeData(key, attributes) {
    this.key = key;
    this.attributes = attributes;
    this.clear();
  }
  MixedNodeData.prototype.clear = function() {
    this.inDegree = 0;
    this.outDegree = 0;
    this.undirectedDegree = 0;
    this.undirectedLoops = 0;
    this.directedLoops = 0;
    this["in"] = {};
    this.out = {};
    this.undirected = {};
  };
  function DirectedNodeData(key, attributes) {
    this.key = key;
    this.attributes = attributes;
    this.clear();
  }
  DirectedNodeData.prototype.clear = function() {
    this.inDegree = 0;
    this.outDegree = 0;
    this.directedLoops = 0;
    this["in"] = {};
    this.out = {};
  };
  function UndirectedNodeData(key, attributes) {
    this.key = key;
    this.attributes = attributes;
    this.clear();
  }
  UndirectedNodeData.prototype.clear = function() {
    this.undirectedDegree = 0;
    this.undirectedLoops = 0;
    this.undirected = {};
  };
  function EdgeData(undirected, key, source, target, attributes) {
    this.key = key;
    this.attributes = attributes;
    this.undirected = undirected;
    this.source = source;
    this.target = target;
  }
  EdgeData.prototype.attach = function() {
    var outKey = "out";
    var inKey = "in";
    if (this.undirected)
      outKey = inKey = "undirected";
    var source = this.source.key;
    var target = this.target.key;
    this.source[outKey][target] = this;
    if (this.undirected && source === target)
      return;
    this.target[inKey][source] = this;
  };
  EdgeData.prototype.attachMulti = function() {
    var outKey = "out";
    var inKey = "in";
    var source = this.source.key;
    var target = this.target.key;
    if (this.undirected)
      outKey = inKey = "undirected";
    var adj = this.source[outKey];
    var head = adj[target];
    if (typeof head === "undefined") {
      adj[target] = this;
      if (!(this.undirected && source === target)) {
        this.target[inKey][source] = this;
      }
      return;
    }
    head.previous = this;
    this.next = head;
    adj[target] = this;
    this.target[inKey][source] = this;
  };
  EdgeData.prototype.detach = function() {
    var source = this.source.key;
    var target = this.target.key;
    var outKey = "out";
    var inKey = "in";
    if (this.undirected)
      outKey = inKey = "undirected";
    delete this.source[outKey][target];
    delete this.target[inKey][source];
  };
  EdgeData.prototype.detachMulti = function() {
    var source = this.source.key;
    var target = this.target.key;
    var outKey = "out";
    var inKey = "in";
    if (this.undirected)
      outKey = inKey = "undirected";
    if (this.previous === undefined) {
      if (this.next === undefined) {
        delete this.source[outKey][target];
        delete this.target[inKey][source];
      } else {
        this.next.previous = undefined;
        this.source[outKey][target] = this.next;
        this.target[inKey][source] = this.next;
      }
    } else {
      this.previous.next = this.next;
      if (this.next !== undefined) {
        this.next.previous = this.previous;
      }
    }
  };
  var NODE = 0;
  var SOURCE = 1;
  var TARGET = 2;
  var OPPOSITE = 3;
  function findRelevantNodeData(graph, method, mode, nodeOrEdge, nameOrEdge, add1, add2) {
    var nodeData, edgeData, arg1, arg2;
    nodeOrEdge = "" + nodeOrEdge;
    if (mode === NODE) {
      nodeData = graph._nodes.get(nodeOrEdge);
      if (!nodeData)
        throw new NotFoundGraphError("Graph.".concat(method, ': could not find the "').concat(nodeOrEdge, '" node in the graph.'));
      arg1 = nameOrEdge;
      arg2 = add1;
    } else if (mode === OPPOSITE) {
      nameOrEdge = "" + nameOrEdge;
      edgeData = graph._edges.get(nameOrEdge);
      if (!edgeData)
        throw new NotFoundGraphError("Graph.".concat(method, ': could not find the "').concat(nameOrEdge, '" edge in the graph.'));
      var source = edgeData.source.key;
      var target = edgeData.target.key;
      if (nodeOrEdge === source) {
        nodeData = edgeData.target;
      } else if (nodeOrEdge === target) {
        nodeData = edgeData.source;
      } else {
        throw new NotFoundGraphError("Graph.".concat(method, ': the "').concat(nodeOrEdge, '" node is not attached to the "').concat(nameOrEdge, '" edge (').concat(source, ", ").concat(target, ")."));
      }
      arg1 = add1;
      arg2 = add2;
    } else {
      edgeData = graph._edges.get(nodeOrEdge);
      if (!edgeData)
        throw new NotFoundGraphError("Graph.".concat(method, ': could not find the "').concat(nodeOrEdge, '" edge in the graph.'));
      if (mode === SOURCE) {
        nodeData = edgeData.source;
      } else {
        nodeData = edgeData.target;
      }
      arg1 = nameOrEdge;
      arg2 = add1;
    }
    return [nodeData, arg1, arg2];
  }
  function attachNodeAttributeGetter(Class, method, mode) {
    Class.prototype[method] = function(nodeOrEdge, nameOrEdge, add1) {
      var _findRelevantNodeData = findRelevantNodeData(this, method, mode, nodeOrEdge, nameOrEdge, add1), data = _findRelevantNodeData[0], name = _findRelevantNodeData[1];
      return data.attributes[name];
    };
  }
  function attachNodeAttributesGetter(Class, method, mode) {
    Class.prototype[method] = function(nodeOrEdge, nameOrEdge) {
      var _findRelevantNodeData2 = findRelevantNodeData(this, method, mode, nodeOrEdge, nameOrEdge), data = _findRelevantNodeData2[0];
      return data.attributes;
    };
  }
  function attachNodeAttributeChecker(Class, method, mode) {
    Class.prototype[method] = function(nodeOrEdge, nameOrEdge, add1) {
      var _findRelevantNodeData3 = findRelevantNodeData(this, method, mode, nodeOrEdge, nameOrEdge, add1), data = _findRelevantNodeData3[0], name = _findRelevantNodeData3[1];
      return data.attributes.hasOwnProperty(name);
    };
  }
  function attachNodeAttributeSetter(Class, method, mode) {
    Class.prototype[method] = function(nodeOrEdge, nameOrEdge, add1, add2) {
      var _findRelevantNodeData4 = findRelevantNodeData(this, method, mode, nodeOrEdge, nameOrEdge, add1, add2), data = _findRelevantNodeData4[0], name = _findRelevantNodeData4[1], value = _findRelevantNodeData4[2];
      data.attributes[name] = value;
      this.emit("nodeAttributesUpdated", {
        key: data.key,
        type: "set",
        attributes: data.attributes,
        name
      });
      return this;
    };
  }
  function attachNodeAttributeUpdater(Class, method, mode) {
    Class.prototype[method] = function(nodeOrEdge, nameOrEdge, add1, add2) {
      var _findRelevantNodeData5 = findRelevantNodeData(this, method, mode, nodeOrEdge, nameOrEdge, add1, add2), data = _findRelevantNodeData5[0], name = _findRelevantNodeData5[1], updater = _findRelevantNodeData5[2];
      if (typeof updater !== "function")
        throw new InvalidArgumentsGraphError("Graph.".concat(method, ": updater should be a function."));
      var attributes = data.attributes;
      var value = updater(attributes[name]);
      attributes[name] = value;
      this.emit("nodeAttributesUpdated", {
        key: data.key,
        type: "set",
        attributes: data.attributes,
        name
      });
      return this;
    };
  }
  function attachNodeAttributeRemover(Class, method, mode) {
    Class.prototype[method] = function(nodeOrEdge, nameOrEdge, add1) {
      var _findRelevantNodeData6 = findRelevantNodeData(this, method, mode, nodeOrEdge, nameOrEdge, add1), data = _findRelevantNodeData6[0], name = _findRelevantNodeData6[1];
      delete data.attributes[name];
      this.emit("nodeAttributesUpdated", {
        key: data.key,
        type: "remove",
        attributes: data.attributes,
        name
      });
      return this;
    };
  }
  function attachNodeAttributesReplacer(Class, method, mode) {
    Class.prototype[method] = function(nodeOrEdge, nameOrEdge, add1) {
      var _findRelevantNodeData7 = findRelevantNodeData(this, method, mode, nodeOrEdge, nameOrEdge, add1), data = _findRelevantNodeData7[0], attributes = _findRelevantNodeData7[1];
      if (!isPlainObject(attributes))
        throw new InvalidArgumentsGraphError("Graph.".concat(method, ": provided attributes are not a plain object."));
      data.attributes = attributes;
      this.emit("nodeAttributesUpdated", {
        key: data.key,
        type: "replace",
        attributes: data.attributes
      });
      return this;
    };
  }
  function attachNodeAttributesMerger(Class, method, mode) {
    Class.prototype[method] = function(nodeOrEdge, nameOrEdge, add1) {
      var _findRelevantNodeData8 = findRelevantNodeData(this, method, mode, nodeOrEdge, nameOrEdge, add1), data = _findRelevantNodeData8[0], attributes = _findRelevantNodeData8[1];
      if (!isPlainObject(attributes))
        throw new InvalidArgumentsGraphError("Graph.".concat(method, ": provided attributes are not a plain object."));
      assign(data.attributes, attributes);
      this.emit("nodeAttributesUpdated", {
        key: data.key,
        type: "merge",
        attributes: data.attributes,
        data: attributes
      });
      return this;
    };
  }
  function attachNodeAttributesUpdater(Class, method, mode) {
    Class.prototype[method] = function(nodeOrEdge, nameOrEdge, add1) {
      var _findRelevantNodeData9 = findRelevantNodeData(this, method, mode, nodeOrEdge, nameOrEdge, add1), data = _findRelevantNodeData9[0], updater = _findRelevantNodeData9[1];
      if (typeof updater !== "function")
        throw new InvalidArgumentsGraphError("Graph.".concat(method, ": provided updater is not a function."));
      data.attributes = updater(data.attributes);
      this.emit("nodeAttributesUpdated", {
        key: data.key,
        type: "update",
        attributes: data.attributes
      });
      return this;
    };
  }
  var NODE_ATTRIBUTES_METHODS = [{
    name: function name(element) {
      return "get".concat(element, "Attribute");
    },
    attacher: attachNodeAttributeGetter
  }, {
    name: function name(element) {
      return "get".concat(element, "Attributes");
    },
    attacher: attachNodeAttributesGetter
  }, {
    name: function name(element) {
      return "has".concat(element, "Attribute");
    },
    attacher: attachNodeAttributeChecker
  }, {
    name: function name(element) {
      return "set".concat(element, "Attribute");
    },
    attacher: attachNodeAttributeSetter
  }, {
    name: function name(element) {
      return "update".concat(element, "Attribute");
    },
    attacher: attachNodeAttributeUpdater
  }, {
    name: function name(element) {
      return "remove".concat(element, "Attribute");
    },
    attacher: attachNodeAttributeRemover
  }, {
    name: function name(element) {
      return "replace".concat(element, "Attributes");
    },
    attacher: attachNodeAttributesReplacer
  }, {
    name: function name(element) {
      return "merge".concat(element, "Attributes");
    },
    attacher: attachNodeAttributesMerger
  }, {
    name: function name(element) {
      return "update".concat(element, "Attributes");
    },
    attacher: attachNodeAttributesUpdater
  }];
  function attachNodeAttributesMethods(Graph) {
    NODE_ATTRIBUTES_METHODS.forEach(function(_ref) {
      var { name, attacher } = _ref;
      attacher(Graph, name("Node"), NODE);
      attacher(Graph, name("Source"), SOURCE);
      attacher(Graph, name("Target"), TARGET);
      attacher(Graph, name("Opposite"), OPPOSITE);
    });
  }
  function attachEdgeAttributeGetter(Class, method, type) {
    Class.prototype[method] = function(element, name) {
      var data;
      if (this.type !== "mixed" && type !== "mixed" && type !== this.type)
        throw new UsageGraphError("Graph.".concat(method, ": cannot find this type of edges in your ").concat(this.type, " graph."));
      if (arguments.length > 2) {
        if (this.multi)
          throw new UsageGraphError("Graph.".concat(method, ": cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about."));
        var source = "" + element;
        var target = "" + name;
        name = arguments[2];
        data = getMatchingEdge(this, source, target, type);
        if (!data)
          throw new NotFoundGraphError("Graph.".concat(method, ': could not find an edge for the given path ("').concat(source, '" - "').concat(target, '").'));
      } else {
        if (type !== "mixed")
          throw new UsageGraphError("Graph.".concat(method, ": calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type."));
        element = "" + element;
        data = this._edges.get(element);
        if (!data)
          throw new NotFoundGraphError("Graph.".concat(method, ': could not find the "').concat(element, '" edge in the graph.'));
      }
      return data.attributes[name];
    };
  }
  function attachEdgeAttributesGetter(Class, method, type) {
    Class.prototype[method] = function(element) {
      var data;
      if (this.type !== "mixed" && type !== "mixed" && type !== this.type)
        throw new UsageGraphError("Graph.".concat(method, ": cannot find this type of edges in your ").concat(this.type, " graph."));
      if (arguments.length > 1) {
        if (this.multi)
          throw new UsageGraphError("Graph.".concat(method, ": cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about."));
        var source = "" + element, target = "" + arguments[1];
        data = getMatchingEdge(this, source, target, type);
        if (!data)
          throw new NotFoundGraphError("Graph.".concat(method, ': could not find an edge for the given path ("').concat(source, '" - "').concat(target, '").'));
      } else {
        if (type !== "mixed")
          throw new UsageGraphError("Graph.".concat(method, ": calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type."));
        element = "" + element;
        data = this._edges.get(element);
        if (!data)
          throw new NotFoundGraphError("Graph.".concat(method, ': could not find the "').concat(element, '" edge in the graph.'));
      }
      return data.attributes;
    };
  }
  function attachEdgeAttributeChecker(Class, method, type) {
    Class.prototype[method] = function(element, name) {
      var data;
      if (this.type !== "mixed" && type !== "mixed" && type !== this.type)
        throw new UsageGraphError("Graph.".concat(method, ": cannot find this type of edges in your ").concat(this.type, " graph."));
      if (arguments.length > 2) {
        if (this.multi)
          throw new UsageGraphError("Graph.".concat(method, ": cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about."));
        var source = "" + element;
        var target = "" + name;
        name = arguments[2];
        data = getMatchingEdge(this, source, target, type);
        if (!data)
          throw new NotFoundGraphError("Graph.".concat(method, ': could not find an edge for the given path ("').concat(source, '" - "').concat(target, '").'));
      } else {
        if (type !== "mixed")
          throw new UsageGraphError("Graph.".concat(method, ": calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type."));
        element = "" + element;
        data = this._edges.get(element);
        if (!data)
          throw new NotFoundGraphError("Graph.".concat(method, ': could not find the "').concat(element, '" edge in the graph.'));
      }
      return data.attributes.hasOwnProperty(name);
    };
  }
  function attachEdgeAttributeSetter(Class, method, type) {
    Class.prototype[method] = function(element, name, value) {
      var data;
      if (this.type !== "mixed" && type !== "mixed" && type !== this.type)
        throw new UsageGraphError("Graph.".concat(method, ": cannot find this type of edges in your ").concat(this.type, " graph."));
      if (arguments.length > 3) {
        if (this.multi)
          throw new UsageGraphError("Graph.".concat(method, ": cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about."));
        var source = "" + element;
        var target = "" + name;
        name = arguments[2];
        value = arguments[3];
        data = getMatchingEdge(this, source, target, type);
        if (!data)
          throw new NotFoundGraphError("Graph.".concat(method, ': could not find an edge for the given path ("').concat(source, '" - "').concat(target, '").'));
      } else {
        if (type !== "mixed")
          throw new UsageGraphError("Graph.".concat(method, ": calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type."));
        element = "" + element;
        data = this._edges.get(element);
        if (!data)
          throw new NotFoundGraphError("Graph.".concat(method, ': could not find the "').concat(element, '" edge in the graph.'));
      }
      data.attributes[name] = value;
      this.emit("edgeAttributesUpdated", {
        key: data.key,
        type: "set",
        attributes: data.attributes,
        name
      });
      return this;
    };
  }
  function attachEdgeAttributeUpdater(Class, method, type) {
    Class.prototype[method] = function(element, name, updater) {
      var data;
      if (this.type !== "mixed" && type !== "mixed" && type !== this.type)
        throw new UsageGraphError("Graph.".concat(method, ": cannot find this type of edges in your ").concat(this.type, " graph."));
      if (arguments.length > 3) {
        if (this.multi)
          throw new UsageGraphError("Graph.".concat(method, ": cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about."));
        var source = "" + element;
        var target = "" + name;
        name = arguments[2];
        updater = arguments[3];
        data = getMatchingEdge(this, source, target, type);
        if (!data)
          throw new NotFoundGraphError("Graph.".concat(method, ': could not find an edge for the given path ("').concat(source, '" - "').concat(target, '").'));
      } else {
        if (type !== "mixed")
          throw new UsageGraphError("Graph.".concat(method, ": calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type."));
        element = "" + element;
        data = this._edges.get(element);
        if (!data)
          throw new NotFoundGraphError("Graph.".concat(method, ': could not find the "').concat(element, '" edge in the graph.'));
      }
      if (typeof updater !== "function")
        throw new InvalidArgumentsGraphError("Graph.".concat(method, ": updater should be a function."));
      data.attributes[name] = updater(data.attributes[name]);
      this.emit("edgeAttributesUpdated", {
        key: data.key,
        type: "set",
        attributes: data.attributes,
        name
      });
      return this;
    };
  }
  function attachEdgeAttributeRemover(Class, method, type) {
    Class.prototype[method] = function(element, name) {
      var data;
      if (this.type !== "mixed" && type !== "mixed" && type !== this.type)
        throw new UsageGraphError("Graph.".concat(method, ": cannot find this type of edges in your ").concat(this.type, " graph."));
      if (arguments.length > 2) {
        if (this.multi)
          throw new UsageGraphError("Graph.".concat(method, ": cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about."));
        var source = "" + element;
        var target = "" + name;
        name = arguments[2];
        data = getMatchingEdge(this, source, target, type);
        if (!data)
          throw new NotFoundGraphError("Graph.".concat(method, ': could not find an edge for the given path ("').concat(source, '" - "').concat(target, '").'));
      } else {
        if (type !== "mixed")
          throw new UsageGraphError("Graph.".concat(method, ": calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type."));
        element = "" + element;
        data = this._edges.get(element);
        if (!data)
          throw new NotFoundGraphError("Graph.".concat(method, ': could not find the "').concat(element, '" edge in the graph.'));
      }
      delete data.attributes[name];
      this.emit("edgeAttributesUpdated", {
        key: data.key,
        type: "remove",
        attributes: data.attributes,
        name
      });
      return this;
    };
  }
  function attachEdgeAttributesReplacer(Class, method, type) {
    Class.prototype[method] = function(element, attributes) {
      var data;
      if (this.type !== "mixed" && type !== "mixed" && type !== this.type)
        throw new UsageGraphError("Graph.".concat(method, ": cannot find this type of edges in your ").concat(this.type, " graph."));
      if (arguments.length > 2) {
        if (this.multi)
          throw new UsageGraphError("Graph.".concat(method, ": cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about."));
        var source = "" + element, target = "" + attributes;
        attributes = arguments[2];
        data = getMatchingEdge(this, source, target, type);
        if (!data)
          throw new NotFoundGraphError("Graph.".concat(method, ': could not find an edge for the given path ("').concat(source, '" - "').concat(target, '").'));
      } else {
        if (type !== "mixed")
          throw new UsageGraphError("Graph.".concat(method, ": calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type."));
        element = "" + element;
        data = this._edges.get(element);
        if (!data)
          throw new NotFoundGraphError("Graph.".concat(method, ': could not find the "').concat(element, '" edge in the graph.'));
      }
      if (!isPlainObject(attributes))
        throw new InvalidArgumentsGraphError("Graph.".concat(method, ": provided attributes are not a plain object."));
      data.attributes = attributes;
      this.emit("edgeAttributesUpdated", {
        key: data.key,
        type: "replace",
        attributes: data.attributes
      });
      return this;
    };
  }
  function attachEdgeAttributesMerger(Class, method, type) {
    Class.prototype[method] = function(element, attributes) {
      var data;
      if (this.type !== "mixed" && type !== "mixed" && type !== this.type)
        throw new UsageGraphError("Graph.".concat(method, ": cannot find this type of edges in your ").concat(this.type, " graph."));
      if (arguments.length > 2) {
        if (this.multi)
          throw new UsageGraphError("Graph.".concat(method, ": cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about."));
        var source = "" + element, target = "" + attributes;
        attributes = arguments[2];
        data = getMatchingEdge(this, source, target, type);
        if (!data)
          throw new NotFoundGraphError("Graph.".concat(method, ': could not find an edge for the given path ("').concat(source, '" - "').concat(target, '").'));
      } else {
        if (type !== "mixed")
          throw new UsageGraphError("Graph.".concat(method, ": calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type."));
        element = "" + element;
        data = this._edges.get(element);
        if (!data)
          throw new NotFoundGraphError("Graph.".concat(method, ': could not find the "').concat(element, '" edge in the graph.'));
      }
      if (!isPlainObject(attributes))
        throw new InvalidArgumentsGraphError("Graph.".concat(method, ": provided attributes are not a plain object."));
      assign(data.attributes, attributes);
      this.emit("edgeAttributesUpdated", {
        key: data.key,
        type: "merge",
        attributes: data.attributes,
        data: attributes
      });
      return this;
    };
  }
  function attachEdgeAttributesUpdater(Class, method, type) {
    Class.prototype[method] = function(element, updater) {
      var data;
      if (this.type !== "mixed" && type !== "mixed" && type !== this.type)
        throw new UsageGraphError("Graph.".concat(method, ": cannot find this type of edges in your ").concat(this.type, " graph."));
      if (arguments.length > 2) {
        if (this.multi)
          throw new UsageGraphError("Graph.".concat(method, ": cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about."));
        var source = "" + element, target = "" + updater;
        updater = arguments[2];
        data = getMatchingEdge(this, source, target, type);
        if (!data)
          throw new NotFoundGraphError("Graph.".concat(method, ': could not find an edge for the given path ("').concat(source, '" - "').concat(target, '").'));
      } else {
        if (type !== "mixed")
          throw new UsageGraphError("Graph.".concat(method, ": calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type."));
        element = "" + element;
        data = this._edges.get(element);
        if (!data)
          throw new NotFoundGraphError("Graph.".concat(method, ': could not find the "').concat(element, '" edge in the graph.'));
      }
      if (typeof updater !== "function")
        throw new InvalidArgumentsGraphError("Graph.".concat(method, ": provided updater is not a function."));
      data.attributes = updater(data.attributes);
      this.emit("edgeAttributesUpdated", {
        key: data.key,
        type: "update",
        attributes: data.attributes
      });
      return this;
    };
  }
  var EDGE_ATTRIBUTES_METHODS = [{
    name: function name(element) {
      return "get".concat(element, "Attribute");
    },
    attacher: attachEdgeAttributeGetter
  }, {
    name: function name(element) {
      return "get".concat(element, "Attributes");
    },
    attacher: attachEdgeAttributesGetter
  }, {
    name: function name(element) {
      return "has".concat(element, "Attribute");
    },
    attacher: attachEdgeAttributeChecker
  }, {
    name: function name(element) {
      return "set".concat(element, "Attribute");
    },
    attacher: attachEdgeAttributeSetter
  }, {
    name: function name(element) {
      return "update".concat(element, "Attribute");
    },
    attacher: attachEdgeAttributeUpdater
  }, {
    name: function name(element) {
      return "remove".concat(element, "Attribute");
    },
    attacher: attachEdgeAttributeRemover
  }, {
    name: function name(element) {
      return "replace".concat(element, "Attributes");
    },
    attacher: attachEdgeAttributesReplacer
  }, {
    name: function name(element) {
      return "merge".concat(element, "Attributes");
    },
    attacher: attachEdgeAttributesMerger
  }, {
    name: function name(element) {
      return "update".concat(element, "Attributes");
    },
    attacher: attachEdgeAttributesUpdater
  }];
  function attachEdgeAttributesMethods(Graph) {
    EDGE_ATTRIBUTES_METHODS.forEach(function(_ref) {
      var { name, attacher } = _ref;
      attacher(Graph, name("Edge"), "mixed");
      attacher(Graph, name("DirectedEdge"), "directed");
      attacher(Graph, name("UndirectedEdge"), "undirected");
    });
  }
  var EDGES_ITERATION = [{
    name: "edges",
    type: "mixed"
  }, {
    name: "inEdges",
    type: "directed",
    direction: "in"
  }, {
    name: "outEdges",
    type: "directed",
    direction: "out"
  }, {
    name: "inboundEdges",
    type: "mixed",
    direction: "in"
  }, {
    name: "outboundEdges",
    type: "mixed",
    direction: "out"
  }, {
    name: "directedEdges",
    type: "directed"
  }, {
    name: "undirectedEdges",
    type: "undirected"
  }];
  function forEachSimple(breakable, object, callback, avoid) {
    var shouldBreak = false;
    for (var k in object) {
      if (k === avoid)
        continue;
      var edgeData = object[k];
      shouldBreak = callback(edgeData.key, edgeData.attributes, edgeData.source.key, edgeData.target.key, edgeData.source.attributes, edgeData.target.attributes, edgeData.undirected);
      if (breakable && shouldBreak)
        return edgeData.key;
    }
    return;
  }
  function forEachMulti(breakable, object, callback, avoid) {
    var edgeData, source, target;
    var shouldBreak = false;
    for (var k in object) {
      if (k === avoid)
        continue;
      edgeData = object[k];
      do {
        source = edgeData.source;
        target = edgeData.target;
        shouldBreak = callback(edgeData.key, edgeData.attributes, source.key, target.key, source.attributes, target.attributes, edgeData.undirected);
        if (breakable && shouldBreak)
          return edgeData.key;
        edgeData = edgeData.next;
      } while (edgeData !== undefined);
    }
    return;
  }
  function createIterator(object, avoid) {
    var keys = Object.keys(object);
    var l = keys.length;
    var edgeData;
    var i = 0;
    return new Iterator__default["default"](function next() {
      do {
        if (!edgeData) {
          if (i >= l)
            return {
              done: true
            };
          var k = keys[i++];
          if (k === avoid) {
            edgeData = undefined;
            continue;
          }
          edgeData = object[k];
        } else {
          edgeData = edgeData.next;
        }
      } while (!edgeData);
      return {
        done: false,
        value: {
          edge: edgeData.key,
          attributes: edgeData.attributes,
          source: edgeData.source.key,
          target: edgeData.target.key,
          sourceAttributes: edgeData.source.attributes,
          targetAttributes: edgeData.target.attributes,
          undirected: edgeData.undirected
        }
      };
    });
  }
  function forEachForKeySimple(breakable, object, k, callback) {
    var edgeData = object[k];
    if (!edgeData)
      return;
    var sourceData = edgeData.source;
    var targetData = edgeData.target;
    if (callback(edgeData.key, edgeData.attributes, sourceData.key, targetData.key, sourceData.attributes, targetData.attributes, edgeData.undirected) && breakable)
      return edgeData.key;
  }
  function forEachForKeyMulti(breakable, object, k, callback) {
    var edgeData = object[k];
    if (!edgeData)
      return;
    var shouldBreak = false;
    do {
      shouldBreak = callback(edgeData.key, edgeData.attributes, edgeData.source.key, edgeData.target.key, edgeData.source.attributes, edgeData.target.attributes, edgeData.undirected);
      if (breakable && shouldBreak)
        return edgeData.key;
      edgeData = edgeData.next;
    } while (edgeData !== undefined);
    return;
  }
  function createIteratorForKey(object, k) {
    var edgeData = object[k];
    if (edgeData.next !== undefined) {
      return new Iterator__default["default"](function() {
        if (!edgeData)
          return {
            done: true
          };
        var value = {
          edge: edgeData.key,
          attributes: edgeData.attributes,
          source: edgeData.source.key,
          target: edgeData.target.key,
          sourceAttributes: edgeData.source.attributes,
          targetAttributes: edgeData.target.attributes,
          undirected: edgeData.undirected
        };
        edgeData = edgeData.next;
        return {
          done: false,
          value
        };
      });
    }
    return Iterator__default["default"].of({
      edge: edgeData.key,
      attributes: edgeData.attributes,
      source: edgeData.source.key,
      target: edgeData.target.key,
      sourceAttributes: edgeData.source.attributes,
      targetAttributes: edgeData.target.attributes,
      undirected: edgeData.undirected
    });
  }
  function createEdgeArray(graph, type) {
    if (graph.size === 0)
      return [];
    if (type === "mixed" || type === graph.type) {
      if (typeof Array.from === "function")
        return Array.from(graph._edges.keys());
      return take__default["default"](graph._edges.keys(), graph._edges.size);
    }
    var size = type === "undirected" ? graph.undirectedSize : graph.directedSize;
    var list = new Array(size), mask = type === "undirected";
    var iterator = graph._edges.values();
    var i = 0;
    var step, data;
    while (step = iterator.next(), step.done !== true) {
      data = step.value;
      if (data.undirected === mask)
        list[i++] = data.key;
    }
    return list;
  }
  function forEachEdge(breakable, graph, type, callback) {
    if (graph.size === 0)
      return;
    var shouldFilter = type !== "mixed" && type !== graph.type;
    var mask = type === "undirected";
    var step, data;
    var shouldBreak = false;
    var iterator = graph._edges.values();
    while (step = iterator.next(), step.done !== true) {
      data = step.value;
      if (shouldFilter && data.undirected !== mask)
        continue;
      var _data = data, { key, attributes, source, target } = _data;
      shouldBreak = callback(key, attributes, source.key, target.key, source.attributes, target.attributes, data.undirected);
      if (breakable && shouldBreak)
        return key;
    }
    return;
  }
  function createEdgeIterator(graph, type) {
    if (graph.size === 0)
      return Iterator__default["default"].empty();
    var shouldFilter = type !== "mixed" && type !== graph.type;
    var mask = type === "undirected";
    var iterator = graph._edges.values();
    return new Iterator__default["default"](function next() {
      var step, data;
      while (true) {
        step = iterator.next();
        if (step.done)
          return step;
        data = step.value;
        if (shouldFilter && data.undirected !== mask)
          continue;
        break;
      }
      var value = {
        edge: data.key,
        attributes: data.attributes,
        source: data.source.key,
        target: data.target.key,
        sourceAttributes: data.source.attributes,
        targetAttributes: data.target.attributes,
        undirected: data.undirected
      };
      return {
        value,
        done: false
      };
    });
  }
  function forEachEdgeForNode(breakable, multi, type, direction, nodeData, callback) {
    var fn = multi ? forEachMulti : forEachSimple;
    var found;
    if (type !== "undirected") {
      if (direction !== "out") {
        found = fn(breakable, nodeData["in"], callback);
        if (breakable && found)
          return found;
      }
      if (direction !== "in") {
        found = fn(breakable, nodeData.out, callback, !direction ? nodeData.key : undefined);
        if (breakable && found)
          return found;
      }
    }
    if (type !== "directed") {
      found = fn(breakable, nodeData.undirected, callback);
      if (breakable && found)
        return found;
    }
    return;
  }
  function createEdgeArrayForNode(multi, type, direction, nodeData) {
    var edges = [];
    forEachEdgeForNode(false, multi, type, direction, nodeData, function(key) {
      edges.push(key);
    });
    return edges;
  }
  function createEdgeIteratorForNode(type, direction, nodeData) {
    var iterator = Iterator__default["default"].empty();
    if (type !== "undirected") {
      if (direction !== "out" && typeof nodeData["in"] !== "undefined")
        iterator = chain__default["default"](iterator, createIterator(nodeData["in"]));
      if (direction !== "in" && typeof nodeData.out !== "undefined")
        iterator = chain__default["default"](iterator, createIterator(nodeData.out, !direction ? nodeData.key : undefined));
    }
    if (type !== "directed" && typeof nodeData.undirected !== "undefined") {
      iterator = chain__default["default"](iterator, createIterator(nodeData.undirected));
    }
    return iterator;
  }
  function forEachEdgeForPath(breakable, type, multi, direction, sourceData, target, callback) {
    var fn = multi ? forEachForKeyMulti : forEachForKeySimple;
    var found;
    if (type !== "undirected") {
      if (typeof sourceData["in"] !== "undefined" && direction !== "out") {
        found = fn(breakable, sourceData["in"], target, callback);
        if (breakable && found)
          return found;
      }
      if (typeof sourceData.out !== "undefined" && direction !== "in" && (direction || sourceData.key !== target)) {
        found = fn(breakable, sourceData.out, target, callback);
        if (breakable && found)
          return found;
      }
    }
    if (type !== "directed") {
      if (typeof sourceData.undirected !== "undefined") {
        found = fn(breakable, sourceData.undirected, target, callback);
        if (breakable && found)
          return found;
      }
    }
    return;
  }
  function createEdgeArrayForPath(type, multi, direction, sourceData, target) {
    var edges = [];
    forEachEdgeForPath(false, type, multi, direction, sourceData, target, function(key) {
      edges.push(key);
    });
    return edges;
  }
  function createEdgeIteratorForPath(type, direction, sourceData, target) {
    var iterator = Iterator__default["default"].empty();
    if (type !== "undirected") {
      if (typeof sourceData["in"] !== "undefined" && direction !== "out" && target in sourceData["in"])
        iterator = chain__default["default"](iterator, createIteratorForKey(sourceData["in"], target));
      if (typeof sourceData.out !== "undefined" && direction !== "in" && target in sourceData.out && (direction || sourceData.key !== target))
        iterator = chain__default["default"](iterator, createIteratorForKey(sourceData.out, target));
    }
    if (type !== "directed") {
      if (typeof sourceData.undirected !== "undefined" && target in sourceData.undirected)
        iterator = chain__default["default"](iterator, createIteratorForKey(sourceData.undirected, target));
    }
    return iterator;
  }
  function attachEdgeArrayCreator(Class, description) {
    var { name, type, direction } = description;
    Class.prototype[name] = function(source, target) {
      if (type !== "mixed" && this.type !== "mixed" && type !== this.type)
        return [];
      if (!arguments.length)
        return createEdgeArray(this, type);
      if (arguments.length === 1) {
        source = "" + source;
        var nodeData = this._nodes.get(source);
        if (typeof nodeData === "undefined")
          throw new NotFoundGraphError("Graph.".concat(name, ': could not find the "').concat(source, '" node in the graph.'));
        return createEdgeArrayForNode(this.multi, type === "mixed" ? this.type : type, direction, nodeData);
      }
      if (arguments.length === 2) {
        source = "" + source;
        target = "" + target;
        var sourceData = this._nodes.get(source);
        if (!sourceData)
          throw new NotFoundGraphError("Graph.".concat(name, ':  could not find the "').concat(source, '" source node in the graph.'));
        if (!this._nodes.has(target))
          throw new NotFoundGraphError("Graph.".concat(name, ':  could not find the "').concat(target, '" target node in the graph.'));
        return createEdgeArrayForPath(type, this.multi, direction, sourceData, target);
      }
      throw new InvalidArgumentsGraphError("Graph.".concat(name, ": too many arguments (expecting 0, 1 or 2 and got ").concat(arguments.length, ")."));
    };
  }
  function attachForEachEdge(Class, description) {
    var { name, type, direction } = description;
    var forEachName = "forEach" + name[0].toUpperCase() + name.slice(1, -1);
    Class.prototype[forEachName] = function(source, target, callback) {
      if (type !== "mixed" && this.type !== "mixed" && type !== this.type)
        return;
      if (arguments.length === 1) {
        callback = source;
        return forEachEdge(false, this, type, callback);
      }
      if (arguments.length === 2) {
        source = "" + source;
        callback = target;
        var nodeData = this._nodes.get(source);
        if (typeof nodeData === "undefined")
          throw new NotFoundGraphError("Graph.".concat(forEachName, ': could not find the "').concat(source, '" node in the graph.'));
        return forEachEdgeForNode(false, this.multi, type === "mixed" ? this.type : type, direction, nodeData, callback);
      }
      if (arguments.length === 3) {
        source = "" + source;
        target = "" + target;
        var sourceData = this._nodes.get(source);
        if (!sourceData)
          throw new NotFoundGraphError("Graph.".concat(forEachName, ':  could not find the "').concat(source, '" source node in the graph.'));
        if (!this._nodes.has(target))
          throw new NotFoundGraphError("Graph.".concat(forEachName, ':  could not find the "').concat(target, '" target node in the graph.'));
        return forEachEdgeForPath(false, type, this.multi, direction, sourceData, target, callback);
      }
      throw new InvalidArgumentsGraphError("Graph.".concat(forEachName, ": too many arguments (expecting 1, 2 or 3 and got ").concat(arguments.length, ")."));
    };
    var mapName = "map" + name[0].toUpperCase() + name.slice(1);
    Class.prototype[mapName] = function() {
      var args = Array.prototype.slice.call(arguments);
      var callback = args.pop();
      var result;
      if (args.length === 0) {
        var length = 0;
        if (type !== "directed")
          length += this.undirectedSize;
        if (type !== "undirected")
          length += this.directedSize;
        result = new Array(length);
        var i = 0;
        args.push(function(e, ea, s, t, sa, ta, u) {
          result[i++] = callback(e, ea, s, t, sa, ta, u);
        });
      } else {
        result = [];
        args.push(function(e, ea, s, t, sa, ta, u) {
          result.push(callback(e, ea, s, t, sa, ta, u));
        });
      }
      this[forEachName].apply(this, args);
      return result;
    };
    var filterName = "filter" + name[0].toUpperCase() + name.slice(1);
    Class.prototype[filterName] = function() {
      var args = Array.prototype.slice.call(arguments);
      var callback = args.pop();
      var result = [];
      args.push(function(e, ea, s, t, sa, ta, u) {
        if (callback(e, ea, s, t, sa, ta, u))
          result.push(e);
      });
      this[forEachName].apply(this, args);
      return result;
    };
    var reduceName = "reduce" + name[0].toUpperCase() + name.slice(1);
    Class.prototype[reduceName] = function() {
      var args = Array.prototype.slice.call(arguments);
      if (args.length < 2 || args.length > 4) {
        throw new InvalidArgumentsGraphError("Graph.".concat(reduceName, ": invalid number of arguments (expecting 2, 3 or 4 and got ").concat(args.length, ")."));
      }
      if (typeof args[args.length - 1] === "function" && typeof args[args.length - 2] !== "function") {
        throw new InvalidArgumentsGraphError("Graph.".concat(reduceName, ": missing initial value. You must provide it because the callback takes more than one argument and we cannot infer the initial value from the first iteration, as you could with a simple array."));
      }
      var callback;
      var initialValue;
      if (args.length === 2) {
        callback = args[0];
        initialValue = args[1];
        args = [];
      } else if (args.length === 3) {
        callback = args[1];
        initialValue = args[2];
        args = [args[0]];
      } else if (args.length === 4) {
        callback = args[2];
        initialValue = args[3];
        args = [args[0], args[1]];
      }
      var accumulator = initialValue;
      args.push(function(e, ea, s, t, sa, ta, u) {
        accumulator = callback(accumulator, e, ea, s, t, sa, ta, u);
      });
      this[forEachName].apply(this, args);
      return accumulator;
    };
  }
  function attachFindEdge(Class, description) {
    var { name, type, direction } = description;
    var findEdgeName = "find" + name[0].toUpperCase() + name.slice(1, -1);
    Class.prototype[findEdgeName] = function(source, target, callback) {
      if (type !== "mixed" && this.type !== "mixed" && type !== this.type)
        return false;
      if (arguments.length === 1) {
        callback = source;
        return forEachEdge(true, this, type, callback);
      }
      if (arguments.length === 2) {
        source = "" + source;
        callback = target;
        var nodeData = this._nodes.get(source);
        if (typeof nodeData === "undefined")
          throw new NotFoundGraphError("Graph.".concat(findEdgeName, ': could not find the "').concat(source, '" node in the graph.'));
        return forEachEdgeForNode(true, this.multi, type === "mixed" ? this.type : type, direction, nodeData, callback);
      }
      if (arguments.length === 3) {
        source = "" + source;
        target = "" + target;
        var sourceData = this._nodes.get(source);
        if (!sourceData)
          throw new NotFoundGraphError("Graph.".concat(findEdgeName, ':  could not find the "').concat(source, '" source node in the graph.'));
        if (!this._nodes.has(target))
          throw new NotFoundGraphError("Graph.".concat(findEdgeName, ':  could not find the "').concat(target, '" target node in the graph.'));
        return forEachEdgeForPath(true, type, this.multi, direction, sourceData, target, callback);
      }
      throw new InvalidArgumentsGraphError("Graph.".concat(findEdgeName, ": too many arguments (expecting 1, 2 or 3 and got ").concat(arguments.length, ")."));
    };
    var someName = "some" + name[0].toUpperCase() + name.slice(1, -1);
    Class.prototype[someName] = function() {
      var args = Array.prototype.slice.call(arguments);
      var callback = args.pop();
      args.push(function(e, ea, s, t, sa, ta, u) {
        return callback(e, ea, s, t, sa, ta, u);
      });
      var found = this[findEdgeName].apply(this, args);
      if (found)
        return true;
      return false;
    };
    var everyName = "every" + name[0].toUpperCase() + name.slice(1, -1);
    Class.prototype[everyName] = function() {
      var args = Array.prototype.slice.call(arguments);
      var callback = args.pop();
      args.push(function(e, ea, s, t, sa, ta, u) {
        return !callback(e, ea, s, t, sa, ta, u);
      });
      var found = this[findEdgeName].apply(this, args);
      if (found)
        return false;
      return true;
    };
  }
  function attachEdgeIteratorCreator(Class, description) {
    var { name: originalName, type, direction } = description;
    var name = originalName.slice(0, -1) + "Entries";
    Class.prototype[name] = function(source, target) {
      if (type !== "mixed" && this.type !== "mixed" && type !== this.type)
        return Iterator__default["default"].empty();
      if (!arguments.length)
        return createEdgeIterator(this, type);
      if (arguments.length === 1) {
        source = "" + source;
        var sourceData = this._nodes.get(source);
        if (!sourceData)
          throw new NotFoundGraphError("Graph.".concat(name, ': could not find the "').concat(source, '" node in the graph.'));
        return createEdgeIteratorForNode(type, direction, sourceData);
      }
      if (arguments.length === 2) {
        source = "" + source;
        target = "" + target;
        var _sourceData = this._nodes.get(source);
        if (!_sourceData)
          throw new NotFoundGraphError("Graph.".concat(name, ':  could not find the "').concat(source, '" source node in the graph.'));
        if (!this._nodes.has(target))
          throw new NotFoundGraphError("Graph.".concat(name, ':  could not find the "').concat(target, '" target node in the graph.'));
        return createEdgeIteratorForPath(type, direction, _sourceData, target);
      }
      throw new InvalidArgumentsGraphError("Graph.".concat(name, ": too many arguments (expecting 0, 1 or 2 and got ").concat(arguments.length, ")."));
    };
  }
  function attachEdgeIterationMethods(Graph) {
    EDGES_ITERATION.forEach(function(description) {
      attachEdgeArrayCreator(Graph, description);
      attachForEachEdge(Graph, description);
      attachFindEdge(Graph, description);
      attachEdgeIteratorCreator(Graph, description);
    });
  }
  var NEIGHBORS_ITERATION = [{
    name: "neighbors",
    type: "mixed"
  }, {
    name: "inNeighbors",
    type: "directed",
    direction: "in"
  }, {
    name: "outNeighbors",
    type: "directed",
    direction: "out"
  }, {
    name: "inboundNeighbors",
    type: "mixed",
    direction: "in"
  }, {
    name: "outboundNeighbors",
    type: "mixed",
    direction: "out"
  }, {
    name: "directedNeighbors",
    type: "directed"
  }, {
    name: "undirectedNeighbors",
    type: "undirected"
  }];
  function CompositeSetWrapper() {
    this.A = null;
    this.B = null;
  }
  CompositeSetWrapper.prototype.wrap = function(set) {
    if (this.A === null)
      this.A = set;
    else if (this.B === null)
      this.B = set;
  };
  CompositeSetWrapper.prototype.has = function(key) {
    if (this.A !== null && key in this.A)
      return true;
    if (this.B !== null && key in this.B)
      return true;
    return false;
  };
  function forEachInObjectOnce(breakable, visited, nodeData, object, callback) {
    for (var k in object) {
      var edgeData = object[k];
      var sourceData = edgeData.source;
      var targetData = edgeData.target;
      var neighborData = sourceData === nodeData ? targetData : sourceData;
      if (visited && visited.has(neighborData.key))
        continue;
      var shouldBreak = callback(neighborData.key, neighborData.attributes);
      if (breakable && shouldBreak)
        return neighborData.key;
    }
    return;
  }
  function forEachNeighbor(breakable, type, direction, nodeData, callback) {
    if (type !== "mixed") {
      if (type === "undirected")
        return forEachInObjectOnce(breakable, null, nodeData, nodeData.undirected, callback);
      if (typeof direction === "string")
        return forEachInObjectOnce(breakable, null, nodeData, nodeData[direction], callback);
    }
    var visited = new CompositeSetWrapper;
    var found;
    if (type !== "undirected") {
      if (direction !== "out") {
        found = forEachInObjectOnce(breakable, null, nodeData, nodeData["in"], callback);
        if (breakable && found)
          return found;
        visited.wrap(nodeData["in"]);
      }
      if (direction !== "in") {
        found = forEachInObjectOnce(breakable, visited, nodeData, nodeData.out, callback);
        if (breakable && found)
          return found;
        visited.wrap(nodeData.out);
      }
    }
    if (type !== "directed") {
      found = forEachInObjectOnce(breakable, visited, nodeData, nodeData.undirected, callback);
      if (breakable && found)
        return found;
    }
    return;
  }
  function createNeighborArrayForNode(type, direction, nodeData) {
    if (type !== "mixed") {
      if (type === "undirected")
        return Object.keys(nodeData.undirected);
      if (typeof direction === "string")
        return Object.keys(nodeData[direction]);
    }
    var neighbors = [];
    forEachNeighbor(false, type, direction, nodeData, function(key) {
      neighbors.push(key);
    });
    return neighbors;
  }
  function createDedupedObjectIterator(visited, nodeData, object) {
    var keys = Object.keys(object);
    var l = keys.length;
    var i = 0;
    return new Iterator__default["default"](function next() {
      var neighborData = null;
      do {
        if (i >= l) {
          if (visited)
            visited.wrap(object);
          return {
            done: true
          };
        }
        var edgeData = object[keys[i++]];
        var sourceData = edgeData.source;
        var targetData = edgeData.target;
        neighborData = sourceData === nodeData ? targetData : sourceData;
        if (visited && visited.has(neighborData.key)) {
          neighborData = null;
          continue;
        }
      } while (neighborData === null);
      return {
        done: false,
        value: {
          neighbor: neighborData.key,
          attributes: neighborData.attributes
        }
      };
    });
  }
  function createNeighborIterator(type, direction, nodeData) {
    if (type !== "mixed") {
      if (type === "undirected")
        return createDedupedObjectIterator(null, nodeData, nodeData.undirected);
      if (typeof direction === "string")
        return createDedupedObjectIterator(null, nodeData, nodeData[direction]);
    }
    var iterator = Iterator__default["default"].empty();
    var visited = new CompositeSetWrapper;
    if (type !== "undirected") {
      if (direction !== "out") {
        iterator = chain__default["default"](iterator, createDedupedObjectIterator(visited, nodeData, nodeData["in"]));
      }
      if (direction !== "in") {
        iterator = chain__default["default"](iterator, createDedupedObjectIterator(visited, nodeData, nodeData.out));
      }
    }
    if (type !== "directed") {
      iterator = chain__default["default"](iterator, createDedupedObjectIterator(visited, nodeData, nodeData.undirected));
    }
    return iterator;
  }
  function attachNeighborArrayCreator(Class, description) {
    var { name, type, direction } = description;
    Class.prototype[name] = function(node) {
      if (type !== "mixed" && this.type !== "mixed" && type !== this.type)
        return [];
      node = "" + node;
      var nodeData = this._nodes.get(node);
      if (typeof nodeData === "undefined")
        throw new NotFoundGraphError("Graph.".concat(name, ': could not find the "').concat(node, '" node in the graph.'));
      return createNeighborArrayForNode(type === "mixed" ? this.type : type, direction, nodeData);
    };
  }
  function attachForEachNeighbor(Class, description) {
    var { name, type, direction } = description;
    var forEachName = "forEach" + name[0].toUpperCase() + name.slice(1, -1);
    Class.prototype[forEachName] = function(node, callback) {
      if (type !== "mixed" && this.type !== "mixed" && type !== this.type)
        return;
      node = "" + node;
      var nodeData = this._nodes.get(node);
      if (typeof nodeData === "undefined")
        throw new NotFoundGraphError("Graph.".concat(forEachName, ': could not find the "').concat(node, '" node in the graph.'));
      forEachNeighbor(false, type === "mixed" ? this.type : type, direction, nodeData, callback);
    };
    var mapName = "map" + name[0].toUpperCase() + name.slice(1);
    Class.prototype[mapName] = function(node, callback) {
      var result = [];
      this[forEachName](node, function(n, a) {
        result.push(callback(n, a));
      });
      return result;
    };
    var filterName = "filter" + name[0].toUpperCase() + name.slice(1);
    Class.prototype[filterName] = function(node, callback) {
      var result = [];
      this[forEachName](node, function(n, a) {
        if (callback(n, a))
          result.push(n);
      });
      return result;
    };
    var reduceName = "reduce" + name[0].toUpperCase() + name.slice(1);
    Class.prototype[reduceName] = function(node, callback, initialValue) {
      if (arguments.length < 3)
        throw new InvalidArgumentsGraphError("Graph.".concat(reduceName, ": missing initial value. You must provide it because the callback takes more than one argument and we cannot infer the initial value from the first iteration, as you could with a simple array."));
      var accumulator = initialValue;
      this[forEachName](node, function(n, a) {
        accumulator = callback(accumulator, n, a);
      });
      return accumulator;
    };
  }
  function attachFindNeighbor(Class, description) {
    var { name, type, direction } = description;
    var capitalizedSingular = name[0].toUpperCase() + name.slice(1, -1);
    var findName = "find" + capitalizedSingular;
    Class.prototype[findName] = function(node, callback) {
      if (type !== "mixed" && this.type !== "mixed" && type !== this.type)
        return;
      node = "" + node;
      var nodeData = this._nodes.get(node);
      if (typeof nodeData === "undefined")
        throw new NotFoundGraphError("Graph.".concat(findName, ': could not find the "').concat(node, '" node in the graph.'));
      return forEachNeighbor(true, type === "mixed" ? this.type : type, direction, nodeData, callback);
    };
    var someName = "some" + capitalizedSingular;
    Class.prototype[someName] = function(node, callback) {
      var found = this[findName](node, callback);
      if (found)
        return true;
      return false;
    };
    var everyName = "every" + capitalizedSingular;
    Class.prototype[everyName] = function(node, callback) {
      var found = this[findName](node, function(n, a) {
        return !callback(n, a);
      });
      if (found)
        return false;
      return true;
    };
  }
  function attachNeighborIteratorCreator(Class, description) {
    var { name, type, direction } = description;
    var iteratorName = name.slice(0, -1) + "Entries";
    Class.prototype[iteratorName] = function(node) {
      if (type !== "mixed" && this.type !== "mixed" && type !== this.type)
        return Iterator__default["default"].empty();
      node = "" + node;
      var nodeData = this._nodes.get(node);
      if (typeof nodeData === "undefined")
        throw new NotFoundGraphError("Graph.".concat(iteratorName, ': could not find the "').concat(node, '" node in the graph.'));
      return createNeighborIterator(type === "mixed" ? this.type : type, direction, nodeData);
    };
  }
  function attachNeighborIterationMethods(Graph) {
    NEIGHBORS_ITERATION.forEach(function(description) {
      attachNeighborArrayCreator(Graph, description);
      attachForEachNeighbor(Graph, description);
      attachFindNeighbor(Graph, description);
      attachNeighborIteratorCreator(Graph, description);
    });
  }
  function forEachAdjacency(breakable, assymetric, disconnectedNodes, graph, callback) {
    var iterator = graph._nodes.values();
    var type = graph.type;
    var step, sourceData, neighbor, adj, edgeData, targetData, shouldBreak;
    while (step = iterator.next(), step.done !== true) {
      var hasEdges = false;
      sourceData = step.value;
      if (type !== "undirected") {
        adj = sourceData.out;
        for (neighbor in adj) {
          edgeData = adj[neighbor];
          do {
            targetData = edgeData.target;
            hasEdges = true;
            shouldBreak = callback(sourceData.key, targetData.key, sourceData.attributes, targetData.attributes, edgeData.key, edgeData.attributes, edgeData.undirected);
            if (breakable && shouldBreak)
              return edgeData;
            edgeData = edgeData.next;
          } while (edgeData);
        }
      }
      if (type !== "directed") {
        adj = sourceData.undirected;
        for (neighbor in adj) {
          if (assymetric && sourceData.key > neighbor)
            continue;
          edgeData = adj[neighbor];
          do {
            targetData = edgeData.target;
            if (targetData.key !== neighbor)
              targetData = edgeData.source;
            hasEdges = true;
            shouldBreak = callback(sourceData.key, targetData.key, sourceData.attributes, targetData.attributes, edgeData.key, edgeData.attributes, edgeData.undirected);
            if (breakable && shouldBreak)
              return edgeData;
            edgeData = edgeData.next;
          } while (edgeData);
        }
      }
      if (disconnectedNodes && !hasEdges) {
        shouldBreak = callback(sourceData.key, null, sourceData.attributes, null, null, null, null);
        if (breakable && shouldBreak)
          return null;
      }
    }
    return;
  }
  function serializeNode(key, data) {
    var serialized = {
      key
    };
    if (!isEmpty(data.attributes))
      serialized.attributes = assign({}, data.attributes);
    return serialized;
  }
  function serializeEdge(type, key, data) {
    var serialized = {
      key,
      source: data.source.key,
      target: data.target.key
    };
    if (!isEmpty(data.attributes))
      serialized.attributes = assign({}, data.attributes);
    if (type === "mixed" && data.undirected)
      serialized.undirected = true;
    return serialized;
  }
  function validateSerializedNode(value) {
    if (!isPlainObject(value))
      throw new InvalidArgumentsGraphError('Graph.import: invalid serialized node. A serialized node should be a plain object with at least a "key" property.');
    if (!("key" in value))
      throw new InvalidArgumentsGraphError("Graph.import: serialized node is missing its key.");
    if ("attributes" in value && (!isPlainObject(value.attributes) || value.attributes === null))
      throw new InvalidArgumentsGraphError("Graph.import: invalid attributes. Attributes should be a plain object, null or omitted.");
  }
  function validateSerializedEdge(value) {
    if (!isPlainObject(value))
      throw new InvalidArgumentsGraphError('Graph.import: invalid serialized edge. A serialized edge should be a plain object with at least a "source" & "target" property.');
    if (!("source" in value))
      throw new InvalidArgumentsGraphError("Graph.import: serialized edge is missing its source.");
    if (!("target" in value))
      throw new InvalidArgumentsGraphError("Graph.import: serialized edge is missing its target.");
    if ("attributes" in value && (!isPlainObject(value.attributes) || value.attributes === null))
      throw new InvalidArgumentsGraphError("Graph.import: invalid attributes. Attributes should be a plain object, null or omitted.");
    if ("undirected" in value && typeof value.undirected !== "boolean")
      throw new InvalidArgumentsGraphError("Graph.import: invalid undirectedness information. Undirected should be boolean or omitted.");
  }
  var INSTANCE_ID = incrementalIdStartingFromRandomByte();
  var TYPES = new Set(["directed", "undirected", "mixed"]);
  var EMITTER_PROPS = new Set(["domain", "_events", "_eventsCount", "_maxListeners"]);
  var EDGE_ADD_METHODS = [{
    name: function name(verb) {
      return "".concat(verb, "Edge");
    },
    generateKey: true
  }, {
    name: function name(verb) {
      return "".concat(verb, "DirectedEdge");
    },
    generateKey: true,
    type: "directed"
  }, {
    name: function name(verb) {
      return "".concat(verb, "UndirectedEdge");
    },
    generateKey: true,
    type: "undirected"
  }, {
    name: function name(verb) {
      return "".concat(verb, "EdgeWithKey");
    }
  }, {
    name: function name(verb) {
      return "".concat(verb, "DirectedEdgeWithKey");
    },
    type: "directed"
  }, {
    name: function name(verb) {
      return "".concat(verb, "UndirectedEdgeWithKey");
    },
    type: "undirected"
  }];
  var DEFAULTS = {
    allowSelfLoops: true,
    multi: false,
    type: "mixed"
  };
  function _addNode(graph, node, attributes) {
    if (attributes && !isPlainObject(attributes))
      throw new InvalidArgumentsGraphError('Graph.addNode: invalid attributes. Expecting an object but got "'.concat(attributes, '"'));
    node = "" + node;
    attributes = attributes || {};
    if (graph._nodes.has(node))
      throw new UsageGraphError('Graph.addNode: the "'.concat(node, '" node already exist in the graph.'));
    var data = new graph.NodeDataClass(node, attributes);
    graph._nodes.set(node, data);
    graph.emit("nodeAdded", {
      key: node,
      attributes
    });
    return data;
  }
  function unsafeAddNode(graph, node, attributes) {
    var data = new graph.NodeDataClass(node, attributes);
    graph._nodes.set(node, data);
    graph.emit("nodeAdded", {
      key: node,
      attributes
    });
    return data;
  }
  function addEdge(graph, name, mustGenerateKey, undirected, edge, source, target, attributes) {
    if (!undirected && graph.type === "undirected")
      throw new UsageGraphError("Graph.".concat(name, ": you cannot add a directed edge to an undirected graph. Use the #.addEdge or #.addUndirectedEdge instead."));
    if (undirected && graph.type === "directed")
      throw new UsageGraphError("Graph.".concat(name, ": you cannot add an undirected edge to a directed graph. Use the #.addEdge or #.addDirectedEdge instead."));
    if (attributes && !isPlainObject(attributes))
      throw new InvalidArgumentsGraphError("Graph.".concat(name, ': invalid attributes. Expecting an object but got "').concat(attributes, '"'));
    source = "" + source;
    target = "" + target;
    attributes = attributes || {};
    if (!graph.allowSelfLoops && source === target)
      throw new UsageGraphError("Graph.".concat(name, ': source & target are the same ("').concat(source, `"), thus creating a loop explicitly forbidden by this graph 'allowSelfLoops' option set to false.`));
    var sourceData = graph._nodes.get(source), targetData = graph._nodes.get(target);
    if (!sourceData)
      throw new NotFoundGraphError("Graph.".concat(name, ': source node "').concat(source, '" not found.'));
    if (!targetData)
      throw new NotFoundGraphError("Graph.".concat(name, ': target node "').concat(target, '" not found.'));
    var eventData = {
      key: null,
      undirected,
      source,
      target,
      attributes
    };
    if (mustGenerateKey) {
      edge = graph._edgeKeyGenerator();
    } else {
      edge = "" + edge;
      if (graph._edges.has(edge))
        throw new UsageGraphError("Graph.".concat(name, ': the "').concat(edge, '" edge already exists in the graph.'));
    }
    if (!graph.multi && (undirected ? typeof sourceData.undirected[target] !== "undefined" : typeof sourceData.out[target] !== "undefined")) {
      throw new UsageGraphError("Graph.".concat(name, ': an edge linking "').concat(source, '" to "').concat(target, `" already exists. If you really want to add multiple edges linking those nodes, you should create a multi graph by using the 'multi' option.`));
    }
    var edgeData = new EdgeData(undirected, edge, sourceData, targetData, attributes);
    graph._edges.set(edge, edgeData);
    var isSelfLoop = source === target;
    if (undirected) {
      sourceData.undirectedDegree++;
      targetData.undirectedDegree++;
      if (isSelfLoop) {
        sourceData.undirectedLoops++;
        graph._undirectedSelfLoopCount++;
      }
    } else {
      sourceData.outDegree++;
      targetData.inDegree++;
      if (isSelfLoop) {
        sourceData.directedLoops++;
        graph._directedSelfLoopCount++;
      }
    }
    if (graph.multi)
      edgeData.attachMulti();
    else
      edgeData.attach();
    if (undirected)
      graph._undirectedSize++;
    else
      graph._directedSize++;
    eventData.key = edge;
    graph.emit("edgeAdded", eventData);
    return edge;
  }
  function mergeEdge(graph, name, mustGenerateKey, undirected, edge, source, target, attributes, asUpdater) {
    if (!undirected && graph.type === "undirected")
      throw new UsageGraphError("Graph.".concat(name, ": you cannot merge/update a directed edge to an undirected graph. Use the #.mergeEdge/#.updateEdge or #.addUndirectedEdge instead."));
    if (undirected && graph.type === "directed")
      throw new UsageGraphError("Graph.".concat(name, ": you cannot merge/update an undirected edge to a directed graph. Use the #.mergeEdge/#.updateEdge or #.addDirectedEdge instead."));
    if (attributes) {
      if (asUpdater) {
        if (typeof attributes !== "function")
          throw new InvalidArgumentsGraphError("Graph.".concat(name, ': invalid updater function. Expecting a function but got "').concat(attributes, '"'));
      } else {
        if (!isPlainObject(attributes))
          throw new InvalidArgumentsGraphError("Graph.".concat(name, ': invalid attributes. Expecting an object but got "').concat(attributes, '"'));
      }
    }
    source = "" + source;
    target = "" + target;
    var updater;
    if (asUpdater) {
      updater = attributes;
      attributes = undefined;
    }
    if (!graph.allowSelfLoops && source === target)
      throw new UsageGraphError("Graph.".concat(name, ': source & target are the same ("').concat(source, `"), thus creating a loop explicitly forbidden by this graph 'allowSelfLoops' option set to false.`));
    var sourceData = graph._nodes.get(source);
    var targetData = graph._nodes.get(target);
    var edgeData;
    var alreadyExistingEdgeData;
    if (!mustGenerateKey) {
      edgeData = graph._edges.get(edge);
      if (edgeData) {
        if (edgeData.source.key !== source || edgeData.target.key !== target) {
          if (!undirected || edgeData.source.key !== target || edgeData.target.key !== source) {
            throw new UsageGraphError("Graph.".concat(name, ': inconsistency detected when attempting to merge the "').concat(edge, '" edge with "').concat(source, '" source & "').concat(target, '" target vs. ("').concat(edgeData.source.key, '", "').concat(edgeData.target.key, '").'));
          }
        }
        alreadyExistingEdgeData = edgeData;
      }
    }
    if (!alreadyExistingEdgeData && !graph.multi && sourceData) {
      alreadyExistingEdgeData = undirected ? sourceData.undirected[target] : sourceData.out[target];
    }
    if (alreadyExistingEdgeData) {
      var info = [alreadyExistingEdgeData.key, false, false, false];
      if (asUpdater ? !updater : !attributes)
        return info;
      if (asUpdater) {
        var oldAttributes = alreadyExistingEdgeData.attributes;
        alreadyExistingEdgeData.attributes = updater(oldAttributes);
        graph.emit("edgeAttributesUpdated", {
          type: "replace",
          key: alreadyExistingEdgeData.key,
          attributes: alreadyExistingEdgeData.attributes
        });
      } else {
        assign(alreadyExistingEdgeData.attributes, attributes);
        graph.emit("edgeAttributesUpdated", {
          type: "merge",
          key: alreadyExistingEdgeData.key,
          attributes: alreadyExistingEdgeData.attributes,
          data: attributes
        });
      }
      return info;
    }
    attributes = attributes || {};
    if (asUpdater && updater)
      attributes = updater(attributes);
    var eventData = {
      key: null,
      undirected,
      source,
      target,
      attributes
    };
    if (mustGenerateKey) {
      edge = graph._edgeKeyGenerator();
    } else {
      edge = "" + edge;
      if (graph._edges.has(edge))
        throw new UsageGraphError("Graph.".concat(name, ': the "').concat(edge, '" edge already exists in the graph.'));
    }
    var sourceWasAdded = false;
    var targetWasAdded = false;
    if (!sourceData) {
      sourceData = unsafeAddNode(graph, source, {});
      sourceWasAdded = true;
      if (source === target) {
        targetData = sourceData;
        targetWasAdded = true;
      }
    }
    if (!targetData) {
      targetData = unsafeAddNode(graph, target, {});
      targetWasAdded = true;
    }
    edgeData = new EdgeData(undirected, edge, sourceData, targetData, attributes);
    graph._edges.set(edge, edgeData);
    var isSelfLoop = source === target;
    if (undirected) {
      sourceData.undirectedDegree++;
      targetData.undirectedDegree++;
      if (isSelfLoop) {
        sourceData.undirectedLoops++;
        graph._undirectedSelfLoopCount++;
      }
    } else {
      sourceData.outDegree++;
      targetData.inDegree++;
      if (isSelfLoop) {
        sourceData.directedLoops++;
        graph._directedSelfLoopCount++;
      }
    }
    if (graph.multi)
      edgeData.attachMulti();
    else
      edgeData.attach();
    if (undirected)
      graph._undirectedSize++;
    else
      graph._directedSize++;
    eventData.key = edge;
    graph.emit("edgeAdded", eventData);
    return [edge, true, sourceWasAdded, targetWasAdded];
  }
  function dropEdgeFromData(graph, edgeData) {
    graph._edges["delete"](edgeData.key);
    var { source: sourceData, target: targetData, attributes } = edgeData;
    var undirected = edgeData.undirected;
    var isSelfLoop = sourceData === targetData;
    if (undirected) {
      sourceData.undirectedDegree--;
      targetData.undirectedDegree--;
      if (isSelfLoop) {
        sourceData.undirectedLoops--;
        graph._undirectedSelfLoopCount--;
      }
    } else {
      sourceData.outDegree--;
      targetData.inDegree--;
      if (isSelfLoop) {
        sourceData.directedLoops--;
        graph._directedSelfLoopCount--;
      }
    }
    if (graph.multi)
      edgeData.detachMulti();
    else
      edgeData.detach();
    if (undirected)
      graph._undirectedSize--;
    else
      graph._directedSize--;
    graph.emit("edgeDropped", {
      key: edgeData.key,
      attributes,
      source: sourceData.key,
      target: targetData.key,
      undirected
    });
  }
  var Graph = /* @__PURE__ */ function(_EventEmitter) {
    _inheritsLoose(Graph, _EventEmitter);
    function Graph(options) {
      var _this;
      _this = _EventEmitter.call(this) || this;
      options = assign({}, DEFAULTS, options);
      if (typeof options.multi !== "boolean")
        throw new InvalidArgumentsGraphError(`Graph.constructor: invalid 'multi' option. Expecting a boolean but got "`.concat(options.multi, '".'));
      if (!TYPES.has(options.type))
        throw new InvalidArgumentsGraphError(`Graph.constructor: invalid 'type' option. Should be one of "mixed", "directed" or "undirected" but got "`.concat(options.type, '".'));
      if (typeof options.allowSelfLoops !== "boolean")
        throw new InvalidArgumentsGraphError(`Graph.constructor: invalid 'allowSelfLoops' option. Expecting a boolean but got "`.concat(options.allowSelfLoops, '".'));
      var NodeDataClass = options.type === "mixed" ? MixedNodeData : options.type === "directed" ? DirectedNodeData : UndirectedNodeData;
      privateProperty(_assertThisInitialized(_this), "NodeDataClass", NodeDataClass);
      var instancePrefix = "geid_" + INSTANCE_ID() + "_";
      var edgeId = 0;
      var edgeKeyGenerator = function edgeKeyGenerator() {
        var availableEdgeKey;
        do {
          availableEdgeKey = instancePrefix + edgeId++;
        } while (_this._edges.has(availableEdgeKey));
        return availableEdgeKey;
      };
      privateProperty(_assertThisInitialized(_this), "_attributes", {});
      privateProperty(_assertThisInitialized(_this), "_nodes", new Map);
      privateProperty(_assertThisInitialized(_this), "_edges", new Map);
      privateProperty(_assertThisInitialized(_this), "_directedSize", 0);
      privateProperty(_assertThisInitialized(_this), "_undirectedSize", 0);
      privateProperty(_assertThisInitialized(_this), "_directedSelfLoopCount", 0);
      privateProperty(_assertThisInitialized(_this), "_undirectedSelfLoopCount", 0);
      privateProperty(_assertThisInitialized(_this), "_edgeKeyGenerator", edgeKeyGenerator);
      privateProperty(_assertThisInitialized(_this), "_options", options);
      EMITTER_PROPS.forEach(function(prop) {
        return privateProperty(_assertThisInitialized(_this), prop, _this[prop]);
      });
      readOnlyProperty(_assertThisInitialized(_this), "order", function() {
        return _this._nodes.size;
      });
      readOnlyProperty(_assertThisInitialized(_this), "size", function() {
        return _this._edges.size;
      });
      readOnlyProperty(_assertThisInitialized(_this), "directedSize", function() {
        return _this._directedSize;
      });
      readOnlyProperty(_assertThisInitialized(_this), "undirectedSize", function() {
        return _this._undirectedSize;
      });
      readOnlyProperty(_assertThisInitialized(_this), "selfLoopCount", function() {
        return _this._directedSelfLoopCount + _this._undirectedSelfLoopCount;
      });
      readOnlyProperty(_assertThisInitialized(_this), "directedSelfLoopCount", function() {
        return _this._directedSelfLoopCount;
      });
      readOnlyProperty(_assertThisInitialized(_this), "undirectedSelfLoopCount", function() {
        return _this._undirectedSelfLoopCount;
      });
      readOnlyProperty(_assertThisInitialized(_this), "multi", _this._options.multi);
      readOnlyProperty(_assertThisInitialized(_this), "type", _this._options.type);
      readOnlyProperty(_assertThisInitialized(_this), "allowSelfLoops", _this._options.allowSelfLoops);
      readOnlyProperty(_assertThisInitialized(_this), "implementation", function() {
        return "graphology";
      });
      return _this;
    }
    var _proto = Graph.prototype;
    _proto._resetInstanceCounters = function _resetInstanceCounters() {
      this._directedSize = 0;
      this._undirectedSize = 0;
      this._directedSelfLoopCount = 0;
      this._undirectedSelfLoopCount = 0;
    };
    _proto.hasNode = function hasNode(node) {
      return this._nodes.has("" + node);
    };
    _proto.hasDirectedEdge = function hasDirectedEdge(source, target) {
      if (this.type === "undirected")
        return false;
      if (arguments.length === 1) {
        var edge = "" + source;
        var edgeData = this._edges.get(edge);
        return !!edgeData && !edgeData.undirected;
      } else if (arguments.length === 2) {
        source = "" + source;
        target = "" + target;
        var nodeData = this._nodes.get(source);
        if (!nodeData)
          return false;
        return nodeData.out.hasOwnProperty(target);
      }
      throw new InvalidArgumentsGraphError("Graph.hasDirectedEdge: invalid arity (".concat(arguments.length, ", instead of 1 or 2). You can either ask for an edge id or for the existence of an edge between a source & a target."));
    };
    _proto.hasUndirectedEdge = function hasUndirectedEdge(source, target) {
      if (this.type === "directed")
        return false;
      if (arguments.length === 1) {
        var edge = "" + source;
        var edgeData = this._edges.get(edge);
        return !!edgeData && edgeData.undirected;
      } else if (arguments.length === 2) {
        source = "" + source;
        target = "" + target;
        var nodeData = this._nodes.get(source);
        if (!nodeData)
          return false;
        return nodeData.undirected.hasOwnProperty(target);
      }
      throw new InvalidArgumentsGraphError("Graph.hasDirectedEdge: invalid arity (".concat(arguments.length, ", instead of 1 or 2). You can either ask for an edge id or for the existence of an edge between a source & a target."));
    };
    _proto.hasEdge = function hasEdge(source, target) {
      if (arguments.length === 1) {
        var edge = "" + source;
        return this._edges.has(edge);
      } else if (arguments.length === 2) {
        source = "" + source;
        target = "" + target;
        var nodeData = this._nodes.get(source);
        if (!nodeData)
          return false;
        return typeof nodeData.out !== "undefined" && nodeData.out.hasOwnProperty(target) || typeof nodeData.undirected !== "undefined" && nodeData.undirected.hasOwnProperty(target);
      }
      throw new InvalidArgumentsGraphError("Graph.hasEdge: invalid arity (".concat(arguments.length, ", instead of 1 or 2). You can either ask for an edge id or for the existence of an edge between a source & a target."));
    };
    _proto.directedEdge = function directedEdge(source, target) {
      if (this.type === "undirected")
        return;
      source = "" + source;
      target = "" + target;
      if (this.multi)
        throw new UsageGraphError("Graph.directedEdge: this method is irrelevant with multigraphs since there might be multiple edges between source & target. See #.directedEdges instead.");
      var sourceData = this._nodes.get(source);
      if (!sourceData)
        throw new NotFoundGraphError('Graph.directedEdge: could not find the "'.concat(source, '" source node in the graph.'));
      if (!this._nodes.has(target))
        throw new NotFoundGraphError('Graph.directedEdge: could not find the "'.concat(target, '" target node in the graph.'));
      var edgeData = sourceData.out && sourceData.out[target] || undefined;
      if (edgeData)
        return edgeData.key;
    };
    _proto.undirectedEdge = function undirectedEdge(source, target) {
      if (this.type === "directed")
        return;
      source = "" + source;
      target = "" + target;
      if (this.multi)
        throw new UsageGraphError("Graph.undirectedEdge: this method is irrelevant with multigraphs since there might be multiple edges between source & target. See #.undirectedEdges instead.");
      var sourceData = this._nodes.get(source);
      if (!sourceData)
        throw new NotFoundGraphError('Graph.undirectedEdge: could not find the "'.concat(source, '" source node in the graph.'));
      if (!this._nodes.has(target))
        throw new NotFoundGraphError('Graph.undirectedEdge: could not find the "'.concat(target, '" target node in the graph.'));
      var edgeData = sourceData.undirected && sourceData.undirected[target] || undefined;
      if (edgeData)
        return edgeData.key;
    };
    _proto.edge = function edge(source, target) {
      if (this.multi)
        throw new UsageGraphError("Graph.edge: this method is irrelevant with multigraphs since there might be multiple edges between source & target. See #.edges instead.");
      source = "" + source;
      target = "" + target;
      var sourceData = this._nodes.get(source);
      if (!sourceData)
        throw new NotFoundGraphError('Graph.edge: could not find the "'.concat(source, '" source node in the graph.'));
      if (!this._nodes.has(target))
        throw new NotFoundGraphError('Graph.edge: could not find the "'.concat(target, '" target node in the graph.'));
      var edgeData = sourceData.out && sourceData.out[target] || sourceData.undirected && sourceData.undirected[target] || undefined;
      if (edgeData)
        return edgeData.key;
    };
    _proto.areDirectedNeighbors = function areDirectedNeighbors(node, neighbor) {
      node = "" + node;
      neighbor = "" + neighbor;
      var nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError('Graph.areDirectedNeighbors: could not find the "'.concat(node, '" node in the graph.'));
      if (this.type === "undirected")
        return false;
      return neighbor in nodeData["in"] || neighbor in nodeData.out;
    };
    _proto.areOutNeighbors = function areOutNeighbors(node, neighbor) {
      node = "" + node;
      neighbor = "" + neighbor;
      var nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError('Graph.areOutNeighbors: could not find the "'.concat(node, '" node in the graph.'));
      if (this.type === "undirected")
        return false;
      return neighbor in nodeData.out;
    };
    _proto.areInNeighbors = function areInNeighbors(node, neighbor) {
      node = "" + node;
      neighbor = "" + neighbor;
      var nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError('Graph.areInNeighbors: could not find the "'.concat(node, '" node in the graph.'));
      if (this.type === "undirected")
        return false;
      return neighbor in nodeData["in"];
    };
    _proto.areUndirectedNeighbors = function areUndirectedNeighbors(node, neighbor) {
      node = "" + node;
      neighbor = "" + neighbor;
      var nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError('Graph.areUndirectedNeighbors: could not find the "'.concat(node, '" node in the graph.'));
      if (this.type === "directed")
        return false;
      return neighbor in nodeData.undirected;
    };
    _proto.areNeighbors = function areNeighbors(node, neighbor) {
      node = "" + node;
      neighbor = "" + neighbor;
      var nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError('Graph.areNeighbors: could not find the "'.concat(node, '" node in the graph.'));
      if (this.type !== "undirected") {
        if (neighbor in nodeData["in"] || neighbor in nodeData.out)
          return true;
      }
      if (this.type !== "directed") {
        if (neighbor in nodeData.undirected)
          return true;
      }
      return false;
    };
    _proto.areInboundNeighbors = function areInboundNeighbors(node, neighbor) {
      node = "" + node;
      neighbor = "" + neighbor;
      var nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError('Graph.areInboundNeighbors: could not find the "'.concat(node, '" node in the graph.'));
      if (this.type !== "undirected") {
        if (neighbor in nodeData["in"])
          return true;
      }
      if (this.type !== "directed") {
        if (neighbor in nodeData.undirected)
          return true;
      }
      return false;
    };
    _proto.areOutboundNeighbors = function areOutboundNeighbors(node, neighbor) {
      node = "" + node;
      neighbor = "" + neighbor;
      var nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError('Graph.areOutboundNeighbors: could not find the "'.concat(node, '" node in the graph.'));
      if (this.type !== "undirected") {
        if (neighbor in nodeData.out)
          return true;
      }
      if (this.type !== "directed") {
        if (neighbor in nodeData.undirected)
          return true;
      }
      return false;
    };
    _proto.inDegree = function inDegree(node) {
      node = "" + node;
      var nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError('Graph.inDegree: could not find the "'.concat(node, '" node in the graph.'));
      if (this.type === "undirected")
        return 0;
      return nodeData.inDegree;
    };
    _proto.outDegree = function outDegree(node) {
      node = "" + node;
      var nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError('Graph.outDegree: could not find the "'.concat(node, '" node in the graph.'));
      if (this.type === "undirected")
        return 0;
      return nodeData.outDegree;
    };
    _proto.directedDegree = function directedDegree(node) {
      node = "" + node;
      var nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError('Graph.directedDegree: could not find the "'.concat(node, '" node in the graph.'));
      if (this.type === "undirected")
        return 0;
      return nodeData.inDegree + nodeData.outDegree;
    };
    _proto.undirectedDegree = function undirectedDegree(node) {
      node = "" + node;
      var nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError('Graph.undirectedDegree: could not find the "'.concat(node, '" node in the graph.'));
      if (this.type === "directed")
        return 0;
      return nodeData.undirectedDegree;
    };
    _proto.inboundDegree = function inboundDegree(node) {
      node = "" + node;
      var nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError('Graph.inboundDegree: could not find the "'.concat(node, '" node in the graph.'));
      var degree = 0;
      if (this.type !== "directed") {
        degree += nodeData.undirectedDegree;
      }
      if (this.type !== "undirected") {
        degree += nodeData.inDegree;
      }
      return degree;
    };
    _proto.outboundDegree = function outboundDegree(node) {
      node = "" + node;
      var nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError('Graph.outboundDegree: could not find the "'.concat(node, '" node in the graph.'));
      var degree = 0;
      if (this.type !== "directed") {
        degree += nodeData.undirectedDegree;
      }
      if (this.type !== "undirected") {
        degree += nodeData.outDegree;
      }
      return degree;
    };
    _proto.degree = function degree(node) {
      node = "" + node;
      var nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError('Graph.degree: could not find the "'.concat(node, '" node in the graph.'));
      var degree = 0;
      if (this.type !== "directed") {
        degree += nodeData.undirectedDegree;
      }
      if (this.type !== "undirected") {
        degree += nodeData.inDegree + nodeData.outDegree;
      }
      return degree;
    };
    _proto.inDegreeWithoutSelfLoops = function inDegreeWithoutSelfLoops(node) {
      node = "" + node;
      var nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError('Graph.inDegreeWithoutSelfLoops: could not find the "'.concat(node, '" node in the graph.'));
      if (this.type === "undirected")
        return 0;
      return nodeData.inDegree - nodeData.directedLoops;
    };
    _proto.outDegreeWithoutSelfLoops = function outDegreeWithoutSelfLoops(node) {
      node = "" + node;
      var nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError('Graph.outDegreeWithoutSelfLoops: could not find the "'.concat(node, '" node in the graph.'));
      if (this.type === "undirected")
        return 0;
      return nodeData.outDegree - nodeData.directedLoops;
    };
    _proto.directedDegreeWithoutSelfLoops = function directedDegreeWithoutSelfLoops(node) {
      node = "" + node;
      var nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError('Graph.directedDegreeWithoutSelfLoops: could not find the "'.concat(node, '" node in the graph.'));
      if (this.type === "undirected")
        return 0;
      return nodeData.inDegree + nodeData.outDegree - nodeData.directedLoops * 2;
    };
    _proto.undirectedDegreeWithoutSelfLoops = function undirectedDegreeWithoutSelfLoops(node) {
      node = "" + node;
      var nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError('Graph.undirectedDegreeWithoutSelfLoops: could not find the "'.concat(node, '" node in the graph.'));
      if (this.type === "directed")
        return 0;
      return nodeData.undirectedDegree - nodeData.undirectedLoops * 2;
    };
    _proto.inboundDegreeWithoutSelfLoops = function inboundDegreeWithoutSelfLoops(node) {
      node = "" + node;
      var nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError('Graph.inboundDegreeWithoutSelfLoops: could not find the "'.concat(node, '" node in the graph.'));
      var degree = 0;
      var loops = 0;
      if (this.type !== "directed") {
        degree += nodeData.undirectedDegree;
        loops += nodeData.undirectedLoops * 2;
      }
      if (this.type !== "undirected") {
        degree += nodeData.inDegree;
        loops += nodeData.directedLoops;
      }
      return degree - loops;
    };
    _proto.outboundDegreeWithoutSelfLoops = function outboundDegreeWithoutSelfLoops(node) {
      node = "" + node;
      var nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError('Graph.outboundDegreeWithoutSelfLoops: could not find the "'.concat(node, '" node in the graph.'));
      var degree = 0;
      var loops = 0;
      if (this.type !== "directed") {
        degree += nodeData.undirectedDegree;
        loops += nodeData.undirectedLoops * 2;
      }
      if (this.type !== "undirected") {
        degree += nodeData.outDegree;
        loops += nodeData.directedLoops;
      }
      return degree - loops;
    };
    _proto.degreeWithoutSelfLoops = function degreeWithoutSelfLoops(node) {
      node = "" + node;
      var nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError('Graph.degreeWithoutSelfLoops: could not find the "'.concat(node, '" node in the graph.'));
      var degree = 0;
      var loops = 0;
      if (this.type !== "directed") {
        degree += nodeData.undirectedDegree;
        loops += nodeData.undirectedLoops * 2;
      }
      if (this.type !== "undirected") {
        degree += nodeData.inDegree + nodeData.outDegree;
        loops += nodeData.directedLoops * 2;
      }
      return degree - loops;
    };
    _proto.source = function source(edge) {
      edge = "" + edge;
      var data = this._edges.get(edge);
      if (!data)
        throw new NotFoundGraphError('Graph.source: could not find the "'.concat(edge, '" edge in the graph.'));
      return data.source.key;
    };
    _proto.target = function target(edge) {
      edge = "" + edge;
      var data = this._edges.get(edge);
      if (!data)
        throw new NotFoundGraphError('Graph.target: could not find the "'.concat(edge, '" edge in the graph.'));
      return data.target.key;
    };
    _proto.extremities = function extremities(edge) {
      edge = "" + edge;
      var edgeData = this._edges.get(edge);
      if (!edgeData)
        throw new NotFoundGraphError('Graph.extremities: could not find the "'.concat(edge, '" edge in the graph.'));
      return [edgeData.source.key, edgeData.target.key];
    };
    _proto.opposite = function opposite(node, edge) {
      node = "" + node;
      edge = "" + edge;
      var data = this._edges.get(edge);
      if (!data)
        throw new NotFoundGraphError('Graph.opposite: could not find the "'.concat(edge, '" edge in the graph.'));
      var source = data.source.key;
      var target = data.target.key;
      if (node === source)
        return target;
      if (node === target)
        return source;
      throw new NotFoundGraphError('Graph.opposite: the "'.concat(node, '" node is not attached to the "').concat(edge, '" edge (').concat(source, ", ").concat(target, ")."));
    };
    _proto.hasExtremity = function hasExtremity(edge, node) {
      edge = "" + edge;
      node = "" + node;
      var data = this._edges.get(edge);
      if (!data)
        throw new NotFoundGraphError('Graph.hasExtremity: could not find the "'.concat(edge, '" edge in the graph.'));
      return data.source.key === node || data.target.key === node;
    };
    _proto.isUndirected = function isUndirected(edge) {
      edge = "" + edge;
      var data = this._edges.get(edge);
      if (!data)
        throw new NotFoundGraphError('Graph.isUndirected: could not find the "'.concat(edge, '" edge in the graph.'));
      return data.undirected;
    };
    _proto.isDirected = function isDirected(edge) {
      edge = "" + edge;
      var data = this._edges.get(edge);
      if (!data)
        throw new NotFoundGraphError('Graph.isDirected: could not find the "'.concat(edge, '" edge in the graph.'));
      return !data.undirected;
    };
    _proto.isSelfLoop = function isSelfLoop(edge) {
      edge = "" + edge;
      var data = this._edges.get(edge);
      if (!data)
        throw new NotFoundGraphError('Graph.isSelfLoop: could not find the "'.concat(edge, '" edge in the graph.'));
      return data.source === data.target;
    };
    _proto.addNode = function addNode(node, attributes) {
      var nodeData = _addNode(this, node, attributes);
      return nodeData.key;
    };
    _proto.mergeNode = function mergeNode(node, attributes) {
      if (attributes && !isPlainObject(attributes))
        throw new InvalidArgumentsGraphError('Graph.mergeNode: invalid attributes. Expecting an object but got "'.concat(attributes, '"'));
      node = "" + node;
      attributes = attributes || {};
      var data = this._nodes.get(node);
      if (data) {
        if (attributes) {
          assign(data.attributes, attributes);
          this.emit("nodeAttributesUpdated", {
            type: "merge",
            key: node,
            attributes: data.attributes,
            data: attributes
          });
        }
        return [node, false];
      }
      data = new this.NodeDataClass(node, attributes);
      this._nodes.set(node, data);
      this.emit("nodeAdded", {
        key: node,
        attributes
      });
      return [node, true];
    };
    _proto.updateNode = function updateNode(node, updater) {
      if (updater && typeof updater !== "function")
        throw new InvalidArgumentsGraphError('Graph.updateNode: invalid updater function. Expecting a function but got "'.concat(updater, '"'));
      node = "" + node;
      var data = this._nodes.get(node);
      if (data) {
        if (updater) {
          var oldAttributes = data.attributes;
          data.attributes = updater(oldAttributes);
          this.emit("nodeAttributesUpdated", {
            type: "replace",
            key: node,
            attributes: data.attributes
          });
        }
        return [node, false];
      }
      var attributes = updater ? updater({}) : {};
      data = new this.NodeDataClass(node, attributes);
      this._nodes.set(node, data);
      this.emit("nodeAdded", {
        key: node,
        attributes
      });
      return [node, true];
    };
    _proto.dropNode = function dropNode(node) {
      node = "" + node;
      var nodeData = this._nodes.get(node);
      if (!nodeData)
        throw new NotFoundGraphError('Graph.dropNode: could not find the "'.concat(node, '" node in the graph.'));
      var edgeData;
      if (this.type !== "undirected") {
        for (var neighbor in nodeData.out) {
          edgeData = nodeData.out[neighbor];
          do {
            dropEdgeFromData(this, edgeData);
            edgeData = edgeData.next;
          } while (edgeData);
        }
        for (var _neighbor in nodeData["in"]) {
          edgeData = nodeData["in"][_neighbor];
          do {
            dropEdgeFromData(this, edgeData);
            edgeData = edgeData.next;
          } while (edgeData);
        }
      }
      if (this.type !== "directed") {
        for (var _neighbor2 in nodeData.undirected) {
          edgeData = nodeData.undirected[_neighbor2];
          do {
            dropEdgeFromData(this, edgeData);
            edgeData = edgeData.next;
          } while (edgeData);
        }
      }
      this._nodes["delete"](node);
      this.emit("nodeDropped", {
        key: node,
        attributes: nodeData.attributes
      });
    };
    _proto.dropEdge = function dropEdge(edge) {
      var edgeData;
      if (arguments.length > 1) {
        var source = "" + arguments[0];
        var target = "" + arguments[1];
        edgeData = getMatchingEdge(this, source, target, this.type);
        if (!edgeData)
          throw new NotFoundGraphError('Graph.dropEdge: could not find the "'.concat(source, '" -> "').concat(target, '" edge in the graph.'));
      } else {
        edge = "" + edge;
        edgeData = this._edges.get(edge);
        if (!edgeData)
          throw new NotFoundGraphError('Graph.dropEdge: could not find the "'.concat(edge, '" edge in the graph.'));
      }
      dropEdgeFromData(this, edgeData);
      return this;
    };
    _proto.dropDirectedEdge = function dropDirectedEdge(source, target) {
      if (arguments.length < 2)
        throw new UsageGraphError("Graph.dropDirectedEdge: it does not make sense to try and drop a directed edge by key. What if the edge with this key is undirected? Use #.dropEdge for this purpose instead.");
      if (this.multi)
        throw new UsageGraphError("Graph.dropDirectedEdge: cannot use a {source,target} combo when dropping an edge in a MultiGraph since we cannot infer the one you want to delete as there could be multiple ones.");
      source = "" + source;
      target = "" + target;
      var edgeData = getMatchingEdge(this, source, target, "directed");
      if (!edgeData)
        throw new NotFoundGraphError('Graph.dropDirectedEdge: could not find a "'.concat(source, '" -> "').concat(target, '" edge in the graph.'));
      dropEdgeFromData(this, edgeData);
      return this;
    };
    _proto.dropUndirectedEdge = function dropUndirectedEdge(source, target) {
      if (arguments.length < 2)
        throw new UsageGraphError("Graph.dropUndirectedEdge: it does not make sense to drop a directed edge by key. What if the edge with this key is undirected? Use #.dropEdge for this purpose instead.");
      if (this.multi)
        throw new UsageGraphError("Graph.dropUndirectedEdge: cannot use a {source,target} combo when dropping an edge in a MultiGraph since we cannot infer the one you want to delete as there could be multiple ones.");
      var edgeData = getMatchingEdge(this, source, target, "undirected");
      if (!edgeData)
        throw new NotFoundGraphError('Graph.dropUndirectedEdge: could not find a "'.concat(source, '" -> "').concat(target, '" edge in the graph.'));
      dropEdgeFromData(this, edgeData);
      return this;
    };
    _proto.clear = function clear() {
      this._edges.clear();
      this._nodes.clear();
      this._resetInstanceCounters();
      this.emit("cleared");
    };
    _proto.clearEdges = function clearEdges() {
      var iterator = this._nodes.values();
      var step;
      while (step = iterator.next(), step.done !== true) {
        step.value.clear();
      }
      this._edges.clear();
      this._resetInstanceCounters();
      this.emit("edgesCleared");
    };
    _proto.getAttribute = function getAttribute(name) {
      return this._attributes[name];
    };
    _proto.getAttributes = function getAttributes() {
      return this._attributes;
    };
    _proto.hasAttribute = function hasAttribute(name) {
      return this._attributes.hasOwnProperty(name);
    };
    _proto.setAttribute = function setAttribute(name, value) {
      this._attributes[name] = value;
      this.emit("attributesUpdated", {
        type: "set",
        attributes: this._attributes,
        name
      });
      return this;
    };
    _proto.updateAttribute = function updateAttribute(name, updater) {
      if (typeof updater !== "function")
        throw new InvalidArgumentsGraphError("Graph.updateAttribute: updater should be a function.");
      var value = this._attributes[name];
      this._attributes[name] = updater(value);
      this.emit("attributesUpdated", {
        type: "set",
        attributes: this._attributes,
        name
      });
      return this;
    };
    _proto.removeAttribute = function removeAttribute(name) {
      delete this._attributes[name];
      this.emit("attributesUpdated", {
        type: "remove",
        attributes: this._attributes,
        name
      });
      return this;
    };
    _proto.replaceAttributes = function replaceAttributes(attributes) {
      if (!isPlainObject(attributes))
        throw new InvalidArgumentsGraphError("Graph.replaceAttributes: provided attributes are not a plain object.");
      this._attributes = attributes;
      this.emit("attributesUpdated", {
        type: "replace",
        attributes: this._attributes
      });
      return this;
    };
    _proto.mergeAttributes = function mergeAttributes(attributes) {
      if (!isPlainObject(attributes))
        throw new InvalidArgumentsGraphError("Graph.mergeAttributes: provided attributes are not a plain object.");
      assign(this._attributes, attributes);
      this.emit("attributesUpdated", {
        type: "merge",
        attributes: this._attributes,
        data: attributes
      });
      return this;
    };
    _proto.updateAttributes = function updateAttributes(updater) {
      if (typeof updater !== "function")
        throw new InvalidArgumentsGraphError("Graph.updateAttributes: provided updater is not a function.");
      this._attributes = updater(this._attributes);
      this.emit("attributesUpdated", {
        type: "update",
        attributes: this._attributes
      });
      return this;
    };
    _proto.updateEachNodeAttributes = function updateEachNodeAttributes(updater, hints) {
      if (typeof updater !== "function")
        throw new InvalidArgumentsGraphError("Graph.updateEachNodeAttributes: expecting an updater function.");
      if (hints && !validateHints(hints))
        throw new InvalidArgumentsGraphError("Graph.updateEachNodeAttributes: invalid hints. Expecting an object having the following shape: {attributes?: [string]}");
      var iterator = this._nodes.values();
      var step, nodeData;
      while (step = iterator.next(), step.done !== true) {
        nodeData = step.value;
        nodeData.attributes = updater(nodeData.key, nodeData.attributes);
      }
      this.emit("eachNodeAttributesUpdated", {
        hints: hints ? hints : null
      });
    };
    _proto.updateEachEdgeAttributes = function updateEachEdgeAttributes(updater, hints) {
      if (typeof updater !== "function")
        throw new InvalidArgumentsGraphError("Graph.updateEachEdgeAttributes: expecting an updater function.");
      if (hints && !validateHints(hints))
        throw new InvalidArgumentsGraphError("Graph.updateEachEdgeAttributes: invalid hints. Expecting an object having the following shape: {attributes?: [string]}");
      var iterator = this._edges.values();
      var step, edgeData, sourceData, targetData;
      while (step = iterator.next(), step.done !== true) {
        edgeData = step.value;
        sourceData = edgeData.source;
        targetData = edgeData.target;
        edgeData.attributes = updater(edgeData.key, edgeData.attributes, sourceData.key, targetData.key, sourceData.attributes, targetData.attributes, edgeData.undirected);
      }
      this.emit("eachEdgeAttributesUpdated", {
        hints: hints ? hints : null
      });
    };
    _proto.forEachAdjacencyEntry = function forEachAdjacencyEntry(callback) {
      if (typeof callback !== "function")
        throw new InvalidArgumentsGraphError("Graph.forEachAdjacencyEntry: expecting a callback.");
      forEachAdjacency(false, false, false, this, callback);
    };
    _proto.forEachAdjacencyEntryWithOrphans = function forEachAdjacencyEntryWithOrphans(callback) {
      if (typeof callback !== "function")
        throw new InvalidArgumentsGraphError("Graph.forEachAdjacencyEntryWithOrphans: expecting a callback.");
      forEachAdjacency(false, false, true, this, callback);
    };
    _proto.forEachAssymetricAdjacencyEntry = function forEachAssymetricAdjacencyEntry(callback) {
      if (typeof callback !== "function")
        throw new InvalidArgumentsGraphError("Graph.forEachAssymetricAdjacencyEntry: expecting a callback.");
      forEachAdjacency(false, true, false, this, callback);
    };
    _proto.forEachAssymetricAdjacencyEntryWithOrphans = function forEachAssymetricAdjacencyEntryWithOrphans(callback) {
      if (typeof callback !== "function")
        throw new InvalidArgumentsGraphError("Graph.forEachAssymetricAdjacencyEntryWithOrphans: expecting a callback.");
      forEachAdjacency(false, true, true, this, callback);
    };
    _proto.nodes = function nodes() {
      if (typeof Array.from === "function")
        return Array.from(this._nodes.keys());
      return take__default["default"](this._nodes.keys(), this._nodes.size);
    };
    _proto.forEachNode = function forEachNode(callback) {
      if (typeof callback !== "function")
        throw new InvalidArgumentsGraphError("Graph.forEachNode: expecting a callback.");
      var iterator = this._nodes.values();
      var step, nodeData;
      while (step = iterator.next(), step.done !== true) {
        nodeData = step.value;
        callback(nodeData.key, nodeData.attributes);
      }
    };
    _proto.findNode = function findNode(callback) {
      if (typeof callback !== "function")
        throw new InvalidArgumentsGraphError("Graph.findNode: expecting a callback.");
      var iterator = this._nodes.values();
      var step, nodeData;
      while (step = iterator.next(), step.done !== true) {
        nodeData = step.value;
        if (callback(nodeData.key, nodeData.attributes))
          return nodeData.key;
      }
      return;
    };
    _proto.mapNodes = function mapNodes(callback) {
      if (typeof callback !== "function")
        throw new InvalidArgumentsGraphError("Graph.mapNode: expecting a callback.");
      var iterator = this._nodes.values();
      var step, nodeData;
      var result = new Array(this.order);
      var i = 0;
      while (step = iterator.next(), step.done !== true) {
        nodeData = step.value;
        result[i++] = callback(nodeData.key, nodeData.attributes);
      }
      return result;
    };
    _proto.someNode = function someNode(callback) {
      if (typeof callback !== "function")
        throw new InvalidArgumentsGraphError("Graph.someNode: expecting a callback.");
      var iterator = this._nodes.values();
      var step, nodeData;
      while (step = iterator.next(), step.done !== true) {
        nodeData = step.value;
        if (callback(nodeData.key, nodeData.attributes))
          return true;
      }
      return false;
    };
    _proto.everyNode = function everyNode(callback) {
      if (typeof callback !== "function")
        throw new InvalidArgumentsGraphError("Graph.everyNode: expecting a callback.");
      var iterator = this._nodes.values();
      var step, nodeData;
      while (step = iterator.next(), step.done !== true) {
        nodeData = step.value;
        if (!callback(nodeData.key, nodeData.attributes))
          return false;
      }
      return true;
    };
    _proto.filterNodes = function filterNodes(callback) {
      if (typeof callback !== "function")
        throw new InvalidArgumentsGraphError("Graph.filterNodes: expecting a callback.");
      var iterator = this._nodes.values();
      var step, nodeData;
      var result = [];
      while (step = iterator.next(), step.done !== true) {
        nodeData = step.value;
        if (callback(nodeData.key, nodeData.attributes))
          result.push(nodeData.key);
      }
      return result;
    };
    _proto.reduceNodes = function reduceNodes(callback, initialValue) {
      if (typeof callback !== "function")
        throw new InvalidArgumentsGraphError("Graph.reduceNodes: expecting a callback.");
      if (arguments.length < 2)
        throw new InvalidArgumentsGraphError("Graph.reduceNodes: missing initial value. You must provide it because the callback takes more than one argument and we cannot infer the initial value from the first iteration, as you could with a simple array.");
      var accumulator = initialValue;
      var iterator = this._nodes.values();
      var step, nodeData;
      while (step = iterator.next(), step.done !== true) {
        nodeData = step.value;
        accumulator = callback(accumulator, nodeData.key, nodeData.attributes);
      }
      return accumulator;
    };
    _proto.nodeEntries = function nodeEntries() {
      var iterator = this._nodes.values();
      return new Iterator__default["default"](function() {
        var step = iterator.next();
        if (step.done)
          return step;
        var data = step.value;
        return {
          value: {
            node: data.key,
            attributes: data.attributes
          },
          done: false
        };
      });
    };
    _proto["export"] = function _export() {
      var _this2 = this;
      var nodes = new Array(this._nodes.size);
      var i = 0;
      this._nodes.forEach(function(data, key) {
        nodes[i++] = serializeNode(key, data);
      });
      var edges = new Array(this._edges.size);
      i = 0;
      this._edges.forEach(function(data, key) {
        edges[i++] = serializeEdge(_this2.type, key, data);
      });
      return {
        options: {
          type: this.type,
          multi: this.multi,
          allowSelfLoops: this.allowSelfLoops
        },
        attributes: this.getAttributes(),
        nodes,
        edges
      };
    };
    _proto["import"] = function _import(data) {
      var _this3 = this;
      var merge = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      if (data instanceof Graph) {
        data.forEachNode(function(n, a) {
          if (merge)
            _this3.mergeNode(n, a);
          else
            _this3.addNode(n, a);
        });
        data.forEachEdge(function(e, a, s, t, _sa, _ta, u) {
          if (merge) {
            if (u)
              _this3.mergeUndirectedEdgeWithKey(e, s, t, a);
            else
              _this3.mergeDirectedEdgeWithKey(e, s, t, a);
          } else {
            if (u)
              _this3.addUndirectedEdgeWithKey(e, s, t, a);
            else
              _this3.addDirectedEdgeWithKey(e, s, t, a);
          }
        });
        return this;
      }
      if (!isPlainObject(data))
        throw new InvalidArgumentsGraphError("Graph.import: invalid argument. Expecting a serialized graph or, alternatively, a Graph instance.");
      if (data.attributes) {
        if (!isPlainObject(data.attributes))
          throw new InvalidArgumentsGraphError("Graph.import: invalid attributes. Expecting a plain object.");
        if (merge)
          this.mergeAttributes(data.attributes);
        else
          this.replaceAttributes(data.attributes);
      }
      var i, l, list, node, edge;
      if (data.nodes) {
        list = data.nodes;
        if (!Array.isArray(list))
          throw new InvalidArgumentsGraphError("Graph.import: invalid nodes. Expecting an array.");
        for (i = 0, l = list.length;i < l; i++) {
          node = list[i];
          validateSerializedNode(node);
          var _node = node, { key, attributes } = _node;
          if (merge)
            this.mergeNode(key, attributes);
          else
            this.addNode(key, attributes);
        }
      }
      if (data.edges) {
        var undirectedByDefault = false;
        if (this.type === "undirected") {
          undirectedByDefault = true;
        }
        list = data.edges;
        if (!Array.isArray(list))
          throw new InvalidArgumentsGraphError("Graph.import: invalid edges. Expecting an array.");
        for (i = 0, l = list.length;i < l; i++) {
          edge = list[i];
          validateSerializedEdge(edge);
          var _edge = edge, { source, target, attributes: _attributes, undirected: _edge$undirected } = _edge, undirected = _edge$undirected === undefined ? undirectedByDefault : _edge$undirected;
          var method = undefined;
          if ("key" in edge) {
            method = merge ? undirected ? this.mergeUndirectedEdgeWithKey : this.mergeDirectedEdgeWithKey : undirected ? this.addUndirectedEdgeWithKey : this.addDirectedEdgeWithKey;
            method.call(this, edge.key, source, target, _attributes);
          } else {
            method = merge ? undirected ? this.mergeUndirectedEdge : this.mergeDirectedEdge : undirected ? this.addUndirectedEdge : this.addDirectedEdge;
            method.call(this, source, target, _attributes);
          }
        }
      }
      return this;
    };
    _proto.nullCopy = function nullCopy(options) {
      var graph = new Graph(assign({}, this._options, options));
      graph.replaceAttributes(assign({}, this.getAttributes()));
      return graph;
    };
    _proto.emptyCopy = function emptyCopy(options) {
      var graph = this.nullCopy(options);
      this._nodes.forEach(function(nodeData, key) {
        var attributes = assign({}, nodeData.attributes);
        nodeData = new graph.NodeDataClass(key, attributes);
        graph._nodes.set(key, nodeData);
      });
      return graph;
    };
    _proto.copy = function copy(options) {
      options = options || {};
      if (typeof options.type === "string" && options.type !== this.type && options.type !== "mixed")
        throw new UsageGraphError('Graph.copy: cannot create an incompatible copy from "'.concat(this.type, '" type to "').concat(options.type, '" because this would mean losing information about the current graph.'));
      if (typeof options.multi === "boolean" && options.multi !== this.multi && options.multi !== true)
        throw new UsageGraphError("Graph.copy: cannot create an incompatible copy by downgrading a multi graph to a simple one because this would mean losing information about the current graph.");
      if (typeof options.allowSelfLoops === "boolean" && options.allowSelfLoops !== this.allowSelfLoops && options.allowSelfLoops !== true)
        throw new UsageGraphError("Graph.copy: cannot create an incompatible copy from a graph allowing self loops to one that does not because this would mean losing information about the current graph.");
      var graph = this.emptyCopy(options);
      var iterator = this._edges.values();
      var step, edgeData;
      while (step = iterator.next(), step.done !== true) {
        edgeData = step.value;
        addEdge(graph, "copy", false, edgeData.undirected, edgeData.key, edgeData.source.key, edgeData.target.key, assign({}, edgeData.attributes));
      }
      return graph;
    };
    _proto.toJSON = function toJSON() {
      return this["export"]();
    };
    _proto.toString = function toString() {
      return "[object Graph]";
    };
    _proto.inspect = function inspect() {
      var _this4 = this;
      var nodes = {};
      this._nodes.forEach(function(data, key) {
        nodes[key] = data.attributes;
      });
      var edges = {}, multiIndex = {};
      this._edges.forEach(function(data, key) {
        var direction = data.undirected ? "--" : "->";
        var label = "";
        var source = data.source.key;
        var target = data.target.key;
        var tmp;
        if (data.undirected && source > target) {
          tmp = source;
          source = target;
          target = tmp;
        }
        var desc = "(".concat(source, ")").concat(direction, "(").concat(target, ")");
        if (!key.startsWith("geid_")) {
          label += "[".concat(key, "]: ");
        } else if (_this4.multi) {
          if (typeof multiIndex[desc] === "undefined") {
            multiIndex[desc] = 0;
          } else {
            multiIndex[desc]++;
          }
          label += "".concat(multiIndex[desc], ". ");
        }
        label += desc;
        edges[label] = data.attributes;
      });
      var dummy = {};
      for (var k in this) {
        if (this.hasOwnProperty(k) && !EMITTER_PROPS.has(k) && typeof this[k] !== "function" && _typeof(k) !== "symbol")
          dummy[k] = this[k];
      }
      dummy.attributes = this._attributes;
      dummy.nodes = nodes;
      dummy.edges = edges;
      privateProperty(dummy, "constructor", this.constructor);
      return dummy;
    };
    return Graph;
  }(events.EventEmitter);
  if (typeof Symbol !== "undefined")
    Graph.prototype[Symbol["for"]("nodejs.util.inspect.custom")] = Graph.prototype.inspect;
  EDGE_ADD_METHODS.forEach(function(method) {
    ["add", "merge", "update"].forEach(function(verb) {
      var name = method.name(verb);
      var fn = verb === "add" ? addEdge : mergeEdge;
      if (method.generateKey) {
        Graph.prototype[name] = function(source, target, attributes) {
          return fn(this, name, true, (method.type || this.type) === "undirected", null, source, target, attributes, verb === "update");
        };
      } else {
        Graph.prototype[name] = function(edge, source, target, attributes) {
          return fn(this, name, false, (method.type || this.type) === "undirected", edge, source, target, attributes, verb === "update");
        };
      }
    });
  });
  attachNodeAttributesMethods(Graph);
  attachEdgeAttributesMethods(Graph);
  attachEdgeIterationMethods(Graph);
  attachNeighborIterationMethods(Graph);
  var DirectedGraph = /* @__PURE__ */ function(_Graph) {
    _inheritsLoose(DirectedGraph, _Graph);
    function DirectedGraph(options) {
      var finalOptions = assign({
        type: "directed"
      }, options);
      if ("multi" in finalOptions && finalOptions.multi !== false)
        throw new InvalidArgumentsGraphError("DirectedGraph.from: inconsistent indication that the graph should be multi in given options!");
      if (finalOptions.type !== "directed")
        throw new InvalidArgumentsGraphError('DirectedGraph.from: inconsistent "' + finalOptions.type + '" type in given options!');
      return _Graph.call(this, finalOptions) || this;
    }
    return DirectedGraph;
  }(Graph);
  var UndirectedGraph = /* @__PURE__ */ function(_Graph2) {
    _inheritsLoose(UndirectedGraph, _Graph2);
    function UndirectedGraph(options) {
      var finalOptions = assign({
        type: "undirected"
      }, options);
      if ("multi" in finalOptions && finalOptions.multi !== false)
        throw new InvalidArgumentsGraphError("UndirectedGraph.from: inconsistent indication that the graph should be multi in given options!");
      if (finalOptions.type !== "undirected")
        throw new InvalidArgumentsGraphError('UndirectedGraph.from: inconsistent "' + finalOptions.type + '" type in given options!');
      return _Graph2.call(this, finalOptions) || this;
    }
    return UndirectedGraph;
  }(Graph);
  var MultiGraph = /* @__PURE__ */ function(_Graph3) {
    _inheritsLoose(MultiGraph, _Graph3);
    function MultiGraph(options) {
      var finalOptions = assign({
        multi: true
      }, options);
      if ("multi" in finalOptions && finalOptions.multi !== true)
        throw new InvalidArgumentsGraphError("MultiGraph.from: inconsistent indication that the graph should be simple in given options!");
      return _Graph3.call(this, finalOptions) || this;
    }
    return MultiGraph;
  }(Graph);
  var MultiDirectedGraph = /* @__PURE__ */ function(_Graph4) {
    _inheritsLoose(MultiDirectedGraph, _Graph4);
    function MultiDirectedGraph(options) {
      var finalOptions = assign({
        type: "directed",
        multi: true
      }, options);
      if ("multi" in finalOptions && finalOptions.multi !== true)
        throw new InvalidArgumentsGraphError("MultiDirectedGraph.from: inconsistent indication that the graph should be simple in given options!");
      if (finalOptions.type !== "directed")
        throw new InvalidArgumentsGraphError('MultiDirectedGraph.from: inconsistent "' + finalOptions.type + '" type in given options!');
      return _Graph4.call(this, finalOptions) || this;
    }
    return MultiDirectedGraph;
  }(Graph);
  var MultiUndirectedGraph = /* @__PURE__ */ function(_Graph5) {
    _inheritsLoose(MultiUndirectedGraph, _Graph5);
    function MultiUndirectedGraph(options) {
      var finalOptions = assign({
        type: "undirected",
        multi: true
      }, options);
      if ("multi" in finalOptions && finalOptions.multi !== true)
        throw new InvalidArgumentsGraphError("MultiUndirectedGraph.from: inconsistent indication that the graph should be simple in given options!");
      if (finalOptions.type !== "undirected")
        throw new InvalidArgumentsGraphError('MultiUndirectedGraph.from: inconsistent "' + finalOptions.type + '" type in given options!');
      return _Graph5.call(this, finalOptions) || this;
    }
    return MultiUndirectedGraph;
  }(Graph);
  function attachStaticFromMethod(Class) {
    Class.from = function(data, options) {
      var finalOptions = assign({}, data.options, options);
      var instance = new Class(finalOptions);
      instance["import"](data);
      return instance;
    };
  }
  attachStaticFromMethod(Graph);
  attachStaticFromMethod(DirectedGraph);
  attachStaticFromMethod(UndirectedGraph);
  attachStaticFromMethod(MultiGraph);
  attachStaticFromMethod(MultiDirectedGraph);
  attachStaticFromMethod(MultiUndirectedGraph);
  Graph.Graph = Graph;
  Graph.DirectedGraph = DirectedGraph;
  Graph.UndirectedGraph = UndirectedGraph;
  Graph.MultiGraph = MultiGraph;
  Graph.MultiDirectedGraph = MultiDirectedGraph;
  Graph.MultiUndirectedGraph = MultiUndirectedGraph;
  Graph.InvalidArgumentsGraphError = InvalidArgumentsGraphError;
  Graph.NotFoundGraphError = NotFoundGraphError;
  Graph.UsageGraphError = UsageGraphError;
  module.exports = Graph;
});

// src/index.ts
import { Plugin } from "@opencode/plugin";

// src/adapters/inbound/agent-plugin/tool-exports.ts
import * as fs7 from "fs";
import * as path6 from "path";
import * as crypto3 from "crypto";

// src/config/raggai-paths.ts
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// node_modules/smol-toml/dist/error.js
/*!
 * Copyright (c) Squirrel Chat et al., All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
function getLineColFromPtr(string, ptr) {
  let lines = string.slice(0, ptr).split(/\r?\n/);
  return [lines.length, lines.pop().length + 1];
}
function makeCodeBlock(string, line, column) {
  let lines = string.split(/\r?\n/);
  let codeblock = "";
  let numberLen = (Math.log10(line + 1) | 0) + 1;
  for (let i = line - 1;i <= line + 1; i++) {
    let l = lines[i - 1];
    if (!l)
      continue;
    codeblock += i.toString().padEnd(numberLen, " ");
    codeblock += ":  ";
    codeblock += l;
    codeblock += `
`;
    if (i === line) {
      codeblock += " ".repeat(numberLen + column + 2);
      codeblock += `^
`;
    }
  }
  return codeblock;
}

class TomlError extends Error {
  line;
  column;
  codeblock;
  constructor(message, options) {
    const [line, column] = getLineColFromPtr(options.toml, options.ptr);
    const codeblock = makeCodeBlock(options.toml, line, column);
    super(`Invalid TOML document: ${message}

${codeblock}`, options);
    this.line = line;
    this.column = column;
    this.codeblock = codeblock;
  }
  static x(message, ctx, ptr) {
    throw new TomlError(message, { toml: ctx.s, ptr: ptr ?? ctx.p });
  }
}

// node_modules/smol-toml/dist/primitive.js
/*!
 * Copyright (c) Squirrel Chat et al., All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
function parseString(ctx) {
  let startPtr = ctx.p;
  let c = ctx.s.charCodeAt(ctx.p++);
  let first = c;
  let isLiteral = c === 39;
  let isMultiline = c === ctx.s.charCodeAt(ctx.p) && c === ctx.s.charCodeAt(ctx.p + 1);
  if (isMultiline) {
    if ((c = ctx.s.charCodeAt(ctx.p += 2)) === 10)
      ctx.p++;
    else if (c === 13 && ctx.s.charCodeAt(ctx.p + 1) === 10)
      ctx.p += 2;
  }
  let parsed = "";
  let sliceStart = ctx.p;
  let state = 0;
  for (;ctx.p < ctx.s.length; ctx.p++) {
    c = ctx.s.charCodeAt(ctx.p);
    if (isMultiline && (c === 10 || c === 13 && ctx.s.charCodeAt(ctx.p + 1) === 10)) {
      state = state && 3;
    } else if (c < 32 && c !== 9 || c === 127) {
      TomlError.x("control characters are not allowed in strings", ctx);
    } else if ((!state || state === 3) && c === first && (!isMultiline || ctx.s.charCodeAt(ctx.p + 1) === first && ctx.s.charCodeAt(ctx.p + 2) === first)) {
      if (isMultiline) {
        if (ctx.s.charCodeAt(ctx.p + 3) === first)
          ctx.p++;
        if (ctx.s.charCodeAt(ctx.p + 3) === first)
          ctx.p++;
      }
      if (!state) {
        let s = ctx.s.slice(sliceStart, ctx.p);
        parsed = parsed ? parsed + s : s;
      }
      ctx.p += isMultiline ? 3 : 1;
      return parsed;
    } else if (!state) {
      if (!isLiteral && c === 92) {
        parsed += ctx.s.slice(sliceStart, sliceStart = ctx.p);
        state = 1;
      }
    } else if (state === 1) {
      if (c === 120 || c === 117 || c === 85) {
        let errPtr = ctx.p++ - 1;
        let value = 0;
        let len = c === 120 ? 2 : c === 117 ? 4 : 8;
        for (let j = 0;j < len; j++, ctx.p++) {
          let hex = ctx.s.charCodeAt(ctx.p);
          let digit = hex >= 48 && hex <= 57 ? hex - 48 : hex >= 65 && hex <= 70 ? hex - 65 + 10 : hex >= 97 && hex <= 102 ? hex - 97 + 10 : -1;
          if (digit < 0)
            TomlError.x("invalid non-hex character in unicode escape", ctx);
          value = value << 4 | digit;
        }
        if (value < 0 || value > 1114111 || value >= 55296 && value <= 57343) {
          TomlError.x("invalid unicode escape", ctx, errPtr);
        }
        parsed += String.fromCodePoint(value);
        sliceStart = ctx.p--;
        state = 0;
      } else if (isMultiline && (c === 32 || c === 9)) {
        state = 2;
      } else {
        if (c === 98)
          parsed += "\b";
        else if (c === 116)
          parsed += "\t";
        else if (c === 110)
          parsed += `
`;
        else if (c === 102)
          parsed += "\f";
        else if (c === 114)
          parsed += "\r";
        else if (c === 101)
          parsed += "\x1B";
        else if (c === 34)
          parsed += '"';
        else if (c === 92)
          parsed += "\\";
        else
          TomlError.x("unrecognised escape sequence", ctx);
        sliceStart = ctx.p + 1;
        state = 0;
      }
    } else if (c !== 32 && c !== 9) {
      if (state === 2)
        TomlError.x("invalid escape: only line-ending whitespace may be escaped", ctx, sliceStart);
      state = !isLiteral && c === 92 ? 1 : 0;
      sliceStart = ctx.p;
    }
  }
  TomlError.x("unfinished string", ctx, startPtr);
}

// node_modules/smol-toml/dist/date.js
/*!
 * Copyright (c) Squirrel Chat et al., All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
var DATE_TIME_RE = /^(\d{4}-\d{2}-\d{2})?[Tt ]?(?:(\d{2}):\d{2}(?::\d{2}(?:\.\d+)?)?)?(Z|z|[-+]\d{2}:\d{2})?$/i;

class TomlDate extends Date {
  #hasDate = false;
  #hasTime = false;
  #offset = null;
  constructor(date, fasttype, unsafeDelim) {
    let hasDate = true;
    let hasTime = true;
    let offset = "Z";
    let c;
    if (typeof date === "string") {
      if (fasttype)
        prep: {
          if (fasttype < 3) {
            if (+date.slice(11, 13) > 23) {
              date = "";
              break prep;
            }
            if (fasttype === 2) {
              offset = null;
              date += "Z";
            } else if ((c = date.charCodeAt(date.length - 1)) !== 90 && c !== 122) {
              offset = date.slice(date.length - 6);
            }
            if (unsafeDelim)
              date = date.slice(0, 10) + "T" + date.slice(11);
          } else if (fasttype === 4) {
            date = +date.slice(0, 2) > 23 ? "" : `0000-01-01T${date}Z`;
          }
          hasDate = fasttype !== 4;
          hasTime = fasttype !== 3;
        }
      else {
        let match = date.match(DATE_TIME_RE);
        if (match) {
          if (!match[1]) {
            hasDate = false;
            date = `0000-01-01T${date}`;
          }
          hasTime = !!match[2];
          hasTime && date[10] === " " && (date = date.replace(" ", "T"));
          if (match[2] && +match[2] > 23) {
            date = "";
          } else {
            offset = match[3] || null;
            if (!offset && hasTime)
              date += "Z";
          }
        } else {
          date = "";
        }
      }
    }
    super(date);
    if (!isNaN(this.getTime())) {
      this.#hasDate = hasDate;
      this.#hasTime = hasTime;
      this.#offset = offset;
    }
  }
  isDateTime() {
    return this.#hasDate && this.#hasTime;
  }
  isLocal() {
    return !this.#hasDate || !this.#hasTime || !this.#offset;
  }
  isDate() {
    return this.#hasDate && !this.#hasTime;
  }
  isTime() {
    return this.#hasTime && !this.#hasDate;
  }
  isValid() {
    return this.#hasDate || this.#hasTime;
  }
  toISOString() {
    let iso = super.toISOString();
    if (this.isDate())
      return iso.slice(0, 10);
    if (this.isTime())
      return iso.slice(11, 23);
    if (this.#offset === null)
      return iso.slice(0, -1);
    if (this.#offset === "Z" || this.#offset === "z")
      return iso;
    let offset = +this.#offset.slice(1, 3) * 60 + +this.#offset.slice(4, 6);
    offset = this.#offset[0] === "-" ? offset : -offset;
    let offsetDate = new Date(this.getTime() - offset * 60000);
    return offsetDate.toISOString().slice(0, -1) + this.#offset;
  }
  static wrapAsOffsetDateTime(jsDate, offset = "Z") {
    let date = new TomlDate(jsDate);
    date.#offset = offset;
    return date;
  }
  static wrapAsLocalDateTime(jsDate) {
    let date = new TomlDate(jsDate);
    date.#offset = null;
    return date;
  }
  static wrapAsLocalDate(jsDate) {
    let date = new TomlDate(jsDate);
    date.#hasTime = false;
    date.#offset = null;
    return date;
  }
  static wrapAsLocalTime(jsDate) {
    let date = new TomlDate(jsDate);
    date.#hasDate = false;
    date.#offset = null;
    return date;
  }
}

// node_modules/smol-toml/dist/extract.js
/*!
 * Copyright (c) Squirrel Chat et al., All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
function isDigit(char, base = 10) {
  return base === 16 ? char > 47 && char < 58 || char > 64 && char < 71 || char > 96 && char < 103 : char > 47 && char < 48 + base;
}
function isEndOfValue(char, delim) {
  return char === 32 || char === 9 || char === 10 || char === 13 || delim && (char === delim || char === 44) || char === 35;
}
function extractValue(ctx, end) {
  let errPtr = ctx.p;
  let c = ctx.s.charCodeAt(ctx.p);
  if (c === 91 || c === 123) {
    ctx.d-- || TomlError.x("document contains excessively nested structures. aborting.", ctx);
    let value = c === 91 ? parseArray(ctx) : parseInlineTable(ctx);
    ctx.d++;
    return value;
  }
  if (c === 34 || c === 39) {
    return parseString(ctx);
  }
  if (c === 116) {
    if (ctx.s.charCodeAt(++ctx.p) !== 114 || ctx.s.charCodeAt(++ctx.p) !== 117 || ctx.s.charCodeAt(++ctx.p) !== 101)
      TomlError.x("invalid value", ctx, errPtr);
    return ctx.p++, true;
  }
  if (c === 102) {
    if (ctx.s.charCodeAt(++ctx.p) !== 97 || ctx.s.charCodeAt(++ctx.p) !== 108 || ctx.s.charCodeAt(++ctx.p) !== 115 || ctx.s.charCodeAt(++ctx.p) !== 101)
      TomlError.x("invalid value", ctx, errPtr);
    return ctx.p++, false;
  }
  if (c === 43 || c === 45) {
    return parseNumber(ctx, ctx.p, ctx.s.charCodeAt(++ctx.p), 44 - c, end);
  }
  if (ctx.s.charCodeAt(ctx.p + 4) === 45 && ctx.s.charCodeAt(ctx.p + 7) === 45) {
    return parseDate(ctx, c, end);
  }
  if (ctx.s.charCodeAt(ctx.p + 2) === 58) {
    return parseTime(ctx, c, end);
  }
  return parseNumber(ctx, ctx.p, c, 0, end);
}
function parseNumber(ctx, startPtr, startChr, sign, endChr) {
  let c = startChr;
  let state = 0;
  let hasUnderscores = false;
  if (c === 105) {
    if (ctx.s.charCodeAt(++ctx.p) !== 110 || ctx.s.charCodeAt(++ctx.p) !== 102)
      TomlError.x("invalid value", ctx, startPtr);
    return ctx.p++, (sign || 1) / 0;
  }
  if (c === 110) {
    if (ctx.s.charCodeAt(++ctx.p) !== 97 || ctx.s.charCodeAt(++ctx.p) !== 110)
      TomlError.x("invalid value", ctx, startPtr);
    return ctx.p++, NaN;
  }
  if (c === 48) {
    if (++ctx.p >= ctx.s.length || isEndOfValue(c = ctx.s.charCodeAt(ctx.p), endChr))
      return ctx.bi === true ? 0n : 0;
    if (!sign) {
      if (c === 120)
        return parseIntegerBaseN(ctx, startPtr, 16, endChr);
      else if (c === 98)
        return parseIntegerBaseN(ctx, startPtr, 2, endChr);
      else if (c === 111)
        return parseIntegerBaseN(ctx, startPtr, 8, endChr);
    }
    if (c === 46)
      state = 2;
    else if (c === 101 || c === 69)
      state = 4;
    else
      TomlError.x("illegal leading zero", ctx, startPtr);
  } else if (!isDigit(c))
    TomlError.x("invalid value", ctx, startPtr);
  while (++ctx.p < ctx.s.length && (c = ctx.s.charCodeAt(ctx.p), !isEndOfValue(c, endChr))) {
    if (!state)
      state = 1;
    if (c === 95) {
      if (!(state & 1))
        TomlError.x("illegal underscore", ctx);
      state += 11;
      hasUnderscores = true;
    } else if (state === 1 && c === 46)
      state = 2;
    else if ((state === 1 || state === 3) && (c === 101 || c === 69))
      state = 4;
    else if (state === 4 && (c === 43 || c === 45)) {
      state = 6;
    } else if (!isDigit(c))
      TomlError.x(`illegal character in numeric literal`, ctx);
    else if (state > 9)
      state -= 11;
    else if (!(state & 1))
      state++;
  }
  if (!state) {
    let val = (startChr - 48) * (sign || 1);
    return ctx.bi === true ? BigInt(val) : val;
  }
  if (!(state & 1))
    TomlError.x("unfinished numeric value", ctx, startPtr);
  let str = ctx.s.slice(startPtr, ctx.p);
  if (hasUnderscores)
    str = str.replaceAll("_", "");
  return state > 1 ? parseFloat(str) : parseInteger(ctx, str, 10, startPtr);
}
function parseIntegerBaseN(ctx, startPtr, base, endChr) {
  let c, underscore = 1;
  while (++ctx.p < ctx.s.length && (c = ctx.s.charCodeAt(ctx.p), !isEndOfValue(c, endChr))) {
    if (c === 95) {
      if (underscore & 1)
        TomlError.x("illegal underscore", ctx);
      underscore = 3;
    } else if (!isDigit(c, base))
      TomlError.x(`illegal character in numeric literal`, ctx);
    else if (underscore & 1)
      underscore--;
  }
  if (underscore & 1)
    TomlError.x("unfinished numeric value", ctx);
  let str = ctx.s.slice(startPtr + 2, ctx.p);
  if (underscore)
    str = str.replaceAll("_", "");
  return parseInteger(ctx, str, base, startPtr);
}
function parseInteger(ctx, str, base, startPtr) {
  if (ctx.bi !== true)
    int: {
      let val = parseInt(str, base);
      if (!Number.isSafeInteger(val)) {
        if (ctx.bi)
          break int;
        TomlError.x("integer value cannot be represented losslessly", ctx, startPtr);
      }
      return val;
    }
  return base === 10 ? BigInt(str) : BigInt((base === 2 ? "0b" : base === 8 ? "0o" : "0x") + str);
}
function parseDate(ctx, c, endChr) {
  let startPtr = ctx.p++, unsafeSeparator;
  if (!isDigit(c) || !isDigit(ctx.s.charCodeAt(ctx.p++)) || !isDigit(ctx.s.charCodeAt(ctx.p++)) || !isDigit(ctx.s.charCodeAt(ctx.p++))) {
    return parseNumber(ctx, ctx.p = startPtr, c, 0, endChr);
  }
  ctx.p += 5;
  if (!isDigit(ctx.s.charCodeAt(ctx.p++)))
    TomlError.x("invalid date-time: date part is malformed", ctx, startPtr);
  if (ctx.p >= ctx.s.length || ((c = ctx.s.charCodeAt(ctx.p)) !== 32 || (unsafeSeparator = true, !isDigit(ctx.s.charCodeAt(ctx.p + 1)))) && c !== 84 && c !== 116) {
    let t = ctx.s.slice(startPtr, ctx.p);
    return readDate(ctx, t, 3, false, startPtr);
  }
  if (ctx.s.charCodeAt(ctx.p += 3) !== 58)
    TomlError.x("invalid date-time: time part is malformed", ctx, startPtr);
  if (ctx.s.charCodeAt(ctx.p += 3) === 58)
    ctx.p += 3;
  if (ctx.s.charCodeAt(ctx.p) === 46)
    while (isDigit(ctx.s.charCodeAt(++ctx.p)))
      ;
  if (c = ctx.s.charCodeAt(ctx.p)) {
    if (c === 90 || c === 122) {
      let t = ctx.s.slice(startPtr, ++ctx.p);
      return readDate(ctx, t, 1, unsafeSeparator, startPtr, "[+00:00]");
    }
    if (c === 43 || c === 45) {
      let t = ctx.s.slice(startPtr, ctx.p += 6);
      return readDate(ctx, t, 1, unsafeSeparator, startPtr, !ctx.ld && "[" + ctx.s.slice(ctx.p - 6, ctx.p) + "]");
    }
  }
  let t = ctx.s.slice(startPtr, ctx.p);
  return readDate(ctx, t, 2, unsafeSeparator, startPtr);
}
function parseTime(ctx, c, endChr) {
  let start = ctx.p;
  if (!isDigit(c) || !isDigit(ctx.s.charCodeAt(++ctx.p))) {
    return parseNumber(ctx, --ctx.p, c, 0, endChr);
  }
  if (ctx.s.charCodeAt(ctx.p += 4) === 58)
    ctx.p += 3;
  if (ctx.s.charCodeAt(ctx.p) === 46)
    while (isDigit(ctx.s.charCodeAt(++ctx.p)))
      ;
  let t = ctx.s.slice(start, ctx.p);
  return readDate(ctx, t, 4, false, start);
}
function readDate(ctx, str, type, unsafeDelim, errPtr, temporalSuffix) {
  if (ctx.ld) {
    let date = new TomlDate(str, type, unsafeDelim);
    if (!date.isValid())
      TomlError.x("invalid date", ctx, errPtr);
    return date;
  }
  try {
    if (temporalSuffix)
      str += temporalSuffix;
    switch (type) {
      case 1:
        return Temporal.ZonedDateTime.from(str);
      case 2:
        return Temporal.PlainDateTime.from(str);
      case 3:
        return Temporal.PlainDate.from(str);
      case 4:
        return Temporal.PlainTime.from(str);
    }
  } catch (e) {
    TomlError.x(e instanceof Error ? e.message : "" + e, ctx, errPtr);
  }
}

// node_modules/smol-toml/dist/util.js
/*!
 * Copyright (c) Squirrel Chat et al., All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
function skipComment(ctx) {
  for (;ctx.p < ctx.s.length; ctx.p++) {
    let c = ctx.s.charCodeAt(ctx.p);
    if (c === 10)
      break;
    if (c === 13 && ctx.s.charCodeAt(ctx.p + 1) === 10) {
      ctx.p++;
      break;
    }
    if (c < 32 && c !== 9 || c === 127) {
      TomlError.x("control characters are not allowed in comments", ctx);
    }
  }
}
function skipVoid(ctx, banNewLines, banComments) {
  let c;
  while (ctx.p < ctx.s.length) {
    while (ctx.p < ctx.s.length && ((c = ctx.s.charCodeAt(ctx.p)) === 32 || c === 9 || !banNewLines && (c === 10 || c === 13 && ctx.s.charCodeAt(ctx.p + 1) === 10)))
      ctx.p++;
    if (banComments || c !== 35)
      break;
    skipComment(ctx);
  }
}

// node_modules/smol-toml/dist/struct.js
/*!
 * Copyright (c) Squirrel Chat et al., All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
function parseKey(ctx, end = 61) {
  let startPtr;
  let state = 0;
  let parsed = [];
  let sliceStart;
  let c = ctx.s.charCodeAt(startPtr = ctx.p);
  do {
    if (c === end) {
      if (!state)
        TomlError.x("unexpected end of key", ctx);
      if (state === 1)
        parsed.push(ctx.s.slice(sliceStart, ctx.p));
      return ctx.p++, parsed;
    } else if (c === 46) {
      if (!state)
        TomlError.x("illegal empty bare key", ctx);
      if (state === 1)
        parsed.push(ctx.s.slice(sliceStart, ctx.p));
      state = 0;
    } else if (!state && (c === 34 || c === 39)) {
      if (c === ctx.s.charCodeAt(ctx.p + 1) && c === ctx.s.charCodeAt(ctx.p + 2))
        TomlError.x("illegal quoted key: multiline strings are not allowed", ctx);
      parsed.push(parseString(ctx));
      state = 2;
      ctx.p--;
    } else if (c === 32 || c === 9) {
      if (state === 1) {
        parsed.push(ctx.s.slice(sliceStart, ctx.p));
        state = 2;
      }
    } else if (state === 2 || c < 48 && c !== 45 || c > 57 && c < 65 || c > 90 && c < 97 && c !== 95 || c > 122) {
      TomlError.x("illegal character in key", ctx);
    } else if (!state) {
      state = 1;
      sliceStart = ctx.p;
    }
  } while (c = ctx.s.charCodeAt(++ctx.p));
  TomlError.x("incomplete key-value: cannot find end of key", ctx, startPtr);
}
function parseInlineTable(ctx) {
  let startPtr = ctx.p++;
  let res = Object.create(null);
  let seen = new Set;
  let c;
  while (ctx.p < ctx.s.length) {
    skipVoid(ctx);
    if ((c = ctx.s.charCodeAt(ctx.p)) === 125) {
      ctx.p++;
      return res;
    }
    let k;
    let t = res;
    let hasOwn = false;
    let errPtr = ctx.p;
    let key = parseKey(ctx);
    for (let i = 0;i < key.length; i++) {
      if (i)
        t = hasOwn ? t[k] : t[k] = Object.create(null);
      k = key[i];
      if ((hasOwn = Object.hasOwn(t, k)) && (typeof t[k] !== "object" || seen.has(t[k]))) {
        TomlError.x("trying to redefine an already defined value", ctx, errPtr);
      }
      let unsafe = k === "__proto__";
      if (ctx.uk && (unsafe || k === "constructor")) {
        t = ctx.uk !== 1 && TomlError.x("document contains an unsafe property", ctx, errPtr);
        break;
      }
      if (!hasOwn && unsafe) {
        Object.defineProperty(t, k, { enumerable: true, configurable: true, writable: true });
      }
    }
    if (hasOwn) {
      TomlError.x("trying to redefine an already defined value", ctx, errPtr);
    }
    skipVoid(ctx, true, true);
    let value = extractValue(ctx, 125);
    if (t && typeof (t[k] = value) === "object")
      seen.add(value);
    skipVoid(ctx);
    if ((c = ctx.s.charCodeAt(ctx.p++)) === 125) {
      return res;
    }
    if (c !== 44)
      TomlError.x("expected comma or end of structure", ctx, ctx.p - 1);
  }
  TomlError.x("unfinished table", ctx, startPtr);
}
function parseArray(ctx) {
  let startPtr = ctx.p++;
  let res = [];
  let c;
  while (ctx.p < ctx.s.length) {
    skipVoid(ctx);
    if ((c = ctx.s.charCodeAt(ctx.p)) === 93) {
      ctx.p++;
      return res;
    }
    res.push(extractValue(ctx, 93));
    skipVoid(ctx);
    if ((c = ctx.s.charCodeAt(ctx.p++)) === 93) {
      return res;
    }
    if (c !== 44)
      TomlError.x("expected comma or end of structure", ctx, ctx.p - 1);
  }
  TomlError.x("unfinished array", ctx, startPtr);
}

// node_modules/smol-toml/dist/parse.js
/*!
 * Copyright (c) Squirrel Chat et al., All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
function peekTable(ctx, key, table, meta, type) {
  let t = table;
  let m = meta;
  let k;
  let hasOwn = false;
  let state;
  for (let i = 0;i < key.length; i++) {
    if (i) {
      t = hasOwn ? t[k] : t[k] = Object.create(null);
      m = (state = m[k]).c;
      if (type === 0 && (state.t === 1 || state.t === 2)) {
        return null;
      }
      if (state.t === 2) {
        let l = t.length - 1;
        t = t[l];
        m = m[l].c;
      }
    }
    k = key[i];
    if ((hasOwn = Object.hasOwn(t, k)) && m[k]?.t === 0 && m[k]?.d) {
      return null;
    }
    if (!hasOwn) {
      let unsafe = k === "__proto__";
      if (ctx.uk && (unsafe || k === "constructor"))
        return false;
      if (unsafe) {
        Object.defineProperty(t, k, { enumerable: true, configurable: true, writable: true });
        Object.defineProperty(m, k, { enumerable: true, configurable: true, writable: true });
      }
      m[k] = {
        t: i < key.length - 1 && type === 2 ? 3 : type,
        d: false,
        i: 0,
        c: Object.create(null)
      };
    }
  }
  state = m[k];
  if (state.t !== type && !(type === 1 && state.t === 3)) {
    return null;
  }
  if (type === 2) {
    if (!state.d) {
      state.d = true;
      t[k] = [];
    }
    t[k].push(t = Object.create(null));
    state.c[state.i++] = state = { t: 1, d: false, i: 0, c: Object.create(null) };
  }
  if (state.d) {
    return null;
  }
  state.d = true;
  if (type === 1) {
    t = hasOwn ? t[k] : t[k] = Object.create(null);
  } else if (type === 0 && hasOwn) {
    return null;
  }
  return [k, t, state.c];
}
function validateTablePeek(ctx, peek, ptr) {
  if (peek === null || ctx.uk === 2)
    TomlError.x(peek === null ? "trying to redefine an already defined table or value" : "document contains an unsafe property", ctx, ptr);
}
function parse(toml, options = {}) {
  let ctx = {
    s: toml,
    p: 0,
    d: options.maxDepth ?? 1000,
    bi: options.integersAsBigInt ?? false,
    ld: options.useLegacyDate ?? true,
    uk: options.unsafeKeyBehaviour === "throw" ? 2 : options.unsafeKeyBehaviour === "drop" ? 1 : 0
  };
  let res = Object.create(null);
  let meta = Object.create(null);
  let tmp;
  let skipping = false;
  let tbl = res;
  let m = meta;
  if (toml.charCodeAt(0) === 65279)
    ctx.p++;
  skipVoid(ctx);
  while (ctx.p < toml.length) {
    if (toml.charCodeAt(ctx.p) === 91) {
      let isTableArray = toml.charCodeAt(++ctx.p) === 91;
      tmp = ctx.p += +isTableArray;
      skipping = false;
      let k = parseKey(ctx, 93);
      if (isTableArray) {
        if (toml.charCodeAt(ctx.p) !== 93) {
          TomlError.x("expected end of table array declaration", ctx);
        }
        ctx.p++;
      }
      let p = peekTable(ctx, k, res, meta, isTableArray ? 2 : 1);
      if (!p) {
        validateTablePeek(ctx, p, tmp);
        skipping = true;
      } else {
        m = p[2];
        tbl = p[1];
      }
    } else {
      tmp = ctx.p;
      let k = parseKey(ctx);
      let p = peekTable(ctx, k, tbl, m, 0);
      if (!p && !skipping)
        validateTablePeek(ctx, p, tmp);
      skipVoid(ctx, true, true);
      let v = extractValue(ctx, undefined);
      if (p && !skipping)
        p[1][p[0]] = v;
    }
    skipVoid(ctx, true);
    if (ctx.p < toml.length && (tmp = toml.charCodeAt(ctx.p)) !== 10 && (tmp !== 13 || toml.charCodeAt(ctx.p + 1) !== 10)) {
      TomlError.x("each key-value declaration must be followed by an end-of-line", ctx);
    }
    skipVoid(ctx);
  }
  return res;
}

// node_modules/smol-toml/dist/stringify.js
/*!
 * Copyright (c) Squirrel Chat et al., All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
var BARE_KEY = /^[a-z0-9-_]+$/i;
var HAS_WELLFORMED = !!"".isWellFormed;
function extendedTypeOf(obj) {
  let type = typeof obj;
  if (type === "object") {
    if (Array.isArray(obj))
      return "array";
    if (typeof obj.getUTCDate === "function" && obj instanceof Date)
      return "date";
    if (globalThis.Temporal) {
      if (obj.until) {
        if (obj instanceof Temporal.ZonedDateTime)
          return "temporal/tz+uc";
        if (obj instanceof Temporal.PlainDateTime || obj instanceof Temporal.PlainDate)
          return "temporal/uc";
        if (obj instanceof Temporal.PlainTime || obj instanceof Temporal.Instant)
          return "temporal";
        if (obj instanceof Temporal.PlainYearMonth)
          return "temporal/x";
      } else if (obj.toPlainDate && obj instanceof Temporal.PlainMonthDay || obj.negated && obj instanceof Temporal.Duration) {
        return "temporal/x";
      }
    }
  }
  return type;
}
function isArrayOfTables(obj) {
  for (let i = 0;i < obj.length; i++) {
    if (extendedTypeOf(obj[i]) !== "object")
      return false;
  }
  return obj.length != 0;
}
function formatWellFormedStringUnchecked(s) {
  return JSON.stringify(s).replaceAll("", "\\u007f");
}
function formatString(s) {
  return formatWellFormedStringUnchecked(HAS_WELLFORMED ? s.toWellFormed() : s);
}
function formatKey(s) {
  if (BARE_KEY.test(s))
    return s;
  if (HAS_WELLFORMED && !s.isWellFormed())
    throw new RangeError("key contains illegal lone surrogates");
  return formatWellFormedStringUnchecked(s);
}
function stringifyValue(val, type, depth, numberAsFloat, strictTemporal) {
  if (depth === 0) {
    throw new Error("Could not stringify the object: maximum object depth exceeded");
  }
  switch (type) {
    case "number":
      if (isNaN(val))
        return "nan";
      if (val === Infinity)
        return "inf";
      if (val === -Infinity)
        return "-inf";
      if (Number.isInteger(val) && (numberAsFloat || !Number.isSafeInteger(val)))
        return val.toFixed(1);
    case "bigint":
    case "boolean":
    case "temporal":
      return val.toString();
    case "string":
      return formatString(val);
    case "date":
      if (isNaN(val.getTime()))
        throw new TypeError("cannot serialize invalid date");
      return val.toISOString();
    case "object":
      return stringifyInlineTable(val, depth, numberAsFloat, strictTemporal);
    case "array":
      return stringifyArray(val, depth, numberAsFloat, strictTemporal);
    case "temporal/tz+uc":
      if (strictTemporal) {
        let tz = val.timeZoneId;
        let tzc = tz.charCodeAt(0);
        if (tzc !== 43 && tzc !== 45 && (tzc !== 85 && tzc !== 71 && tzc !== 90 && tzc !== 69 || tz !== "UTC" && tz !== "UCT" && tz !== "Universal" && tz !== "Zulu" && !tz.startsWith("GMT") && tz !== "Greenwich" && !tz.startsWith("Etc/"))) {
          throw new TypeError("Temporal objects with an IANA timezone are not allowed in Temporal strict mode");
        }
      }
    case "temporal/uc":
      if (strictTemporal && val.calendarId !== "iso8601")
        throw new TypeError("Temporal objects with a non-default calendar are not allowed in Temporal strict mode");
      return val.toString({
        calendarName: "never",
        timeZoneName: "never"
      });
    case "temporal/x":
      throw new TypeError("Unsupported " + val[Symbol.toStringTag]);
  }
}
function stringifyInlineTable(obj, depth, numberAsFloat, strictTemporal) {
  let keys = Object.keys(obj);
  if (keys.length === 0)
    return "{}";
  let res = "{ ";
  for (let i = 0;i < keys.length; i++) {
    let k = keys[i];
    if (i)
      res += ", ";
    res += formatKey(k) + " = " + stringifyValue(obj[k], extendedTypeOf(obj[k]), depth - 1, numberAsFloat, strictTemporal);
  }
  return res + " }";
}
function stringifyArray(array, depth, numberAsFloat, strictTemporal) {
  if (array.length === 0)
    return "[]";
  let res = "[ ";
  for (let i = 0;i < array.length; i++) {
    if (i)
      res += ", ";
    if (array[i] === null || array[i] === undefined) {
      throw new TypeError("arrays cannot contain null or undefined values");
    }
    res += stringifyValue(array[i], extendedTypeOf(array[i]), depth - 1, numberAsFloat, strictTemporal);
  }
  return res + " ]";
}
function stringifyArrayTable(array, key, depth, numberAsFloat, strictTemporal) {
  if (depth === 0) {
    throw new Error("Could not stringify the object: maximum object depth exceeded");
  }
  let res = "";
  for (let i = 0;i < array.length; i++) {
    res += `${res && `
`}[[${key}]]
`;
    res += stringifyTable(0, array[i], key, depth, numberAsFloat, strictTemporal);
  }
  return res;
}
function stringifyTable(tableKey, obj, prefix, depth, numberAsFloat, strictTemporal) {
  if (depth === 0) {
    throw new Error("Could not stringify the object: maximum object depth exceeded");
  }
  let preamble = "";
  let tables = "";
  let keys = Object.keys(obj);
  for (let i = 0;i < keys.length; i++) {
    let k = keys[i];
    if (obj[k] !== null && obj[k] !== undefined) {
      let type = extendedTypeOf(obj[k]);
      if (type === "symbol" || type === "function") {
        throw new TypeError(`cannot serialize values of type '${type}'`);
      }
      let key = formatKey(k);
      if (type === "array" && isArrayOfTables(obj[k])) {
        tables += (tables && `
`) + stringifyArrayTable(obj[k], prefix ? `${prefix}.${key}` : key, depth - 1, numberAsFloat, strictTemporal);
      } else if (type === "object") {
        let tblKey = prefix ? `${prefix}.${key}` : key;
        tables += (tables && `
`) + stringifyTable(tblKey, obj[k], tblKey, depth - 1, numberAsFloat, strictTemporal);
      } else {
        preamble += key;
        preamble += " = ";
        preamble += stringifyValue(obj[k], type, depth, numberAsFloat, strictTemporal);
        preamble += `
`;
      }
    }
  }
  if (tableKey && (preamble || !tables))
    preamble = preamble ? `[${tableKey}]
${preamble}` : `[${tableKey}]`;
  return preamble && tables ? `${preamble}
${tables}` : preamble || tables;
}
function stringify(obj, { maxDepth = 1000, numbersAsFloat = false, strictTemporal = false } = {}) {
  if (extendedTypeOf(obj) !== "object") {
    throw new TypeError("stringify can only be called with an object");
  }
  let str = stringifyTable(0, obj, "", maxDepth, numbersAsFloat, strictTemporal);
  if (str[str.length - 1] !== `
`)
    return str + `
`;
  return str;
}

// node_modules/smol-toml/dist/index.js
/*!
 * Copyright (c) Squirrel Chat et al., All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

// src/config/raggai-paths.ts
function getRaggaiHome() {
  const env = process.env.RAGGAI_HOME;
  if (env && env.trim())
    return path.resolve(env);
  return path.join(os.homedir(), ".config", "raggai");
}
function getGlobalConfigPath() {
  return path.join(getRaggaiHome(), "config.toml");
}
function getDomainsRegistryPath() {
  return path.join(getRaggaiHome(), "domains.toml");
}
function getDomainsDir() {
  return path.join(getRaggaiHome(), "domains");
}
function getCacheDir() {
  return path.join(getRaggaiHome(), "cache");
}
function ensureRaggaiHome() {
  const home = getRaggaiHome();
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(getDomainsDir(), { recursive: true });
  fs.mkdirSync(getCacheDir(), { recursive: true });
}
function readTomlFile(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath))
      return fallback;
    const raw = fs.readFileSync(filePath, "utf-8");
    return parse(raw) ?? fallback;
  } catch {
    return fallback;
  }
}
function writeTomlFile(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, stringify(data), "utf-8");
}
function loadGlobalConfig() {
  return readTomlFile(getGlobalConfigPath(), { defaultDomain: "global", overlay: ["global"] });
}
function saveGlobalConfig(cfg) {
  writeTomlFile(getGlobalConfigPath(), cfg);
}
function loadDomainsRegistry() {
  const reg = readTomlFile(getDomainsRegistryPath(), { domains: {} });
  if (!reg.domains)
    reg.domains = {};
  return reg;
}
function saveDomainsRegistry(reg) {
  writeTomlFile(getDomainsRegistryPath(), reg);
}
function getDomainDir(domainName) {
  const reg = loadDomainsRegistry();
  const entry = reg.domains[domainName];
  if (entry?.path)
    return entry.path;
  return path.join(getDomainsDir(), domainName);
}
function getVectorDir(domainName) {
  return path.join(getDomainDir(domainName), "vector_store");
}
function getGraphFile(domainName) {
  return path.join(getDomainDir(domainName), "graph_store.json");
}
function ensureDomain(domainName, type = "custom", description) {
  ensureRaggaiHome();
  if (!/^[a-zA-Z0-9._-]+$/.test(domainName))
    throw new Error(`Invalid domain name: ${domainName}`);
  const reg = loadDomainsRegistry();
  const dir = path.join(getDomainsDir(), domainName);
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, "vector_store"), { recursive: true });
  const entry = reg.domains[domainName] || {
    name: domainName,
    type,
    path: dir,
    description,
    createdAt: new Date().toISOString()
  };
  entry.path = dir;
  entry.type = type;
  if (description)
    entry.description = description;
  reg.domains[domainName] = entry;
  if (!reg.defaultDomain)
    reg.defaultDomain = "global";
  saveDomainsRegistry(reg);
  return entry;
}
function bootstrapDefaults() {
  ensureRaggaiHome();
  const reg = loadDomainsRegistry();
  if (!reg.domains["global"]) {
    ensureDomain("global", "global", "Global/universal domain");
  } else {
    ensureDomain("global", "global", reg.domains["global"].description);
  }
  const cfg = loadGlobalConfig();
  if (!fs.existsSync(getGlobalConfigPath()))
    saveGlobalConfig({ defaultDomain: "global", overlay: ["global"], ...cfg });
  if (!fs.existsSync(getDomainsRegistryPath()))
    saveDomainsRegistry(reg);
  return { cfg: loadGlobalConfig(), reg: loadDomainsRegistry() };
}
function findProjectConfig(startDir) {
  let dir = path.resolve(startDir || process.cwd());
  const root = path.parse(dir).root;
  while (true) {
    const p = path.join(dir, ".raggai", "config.toml");
    if (fs.existsSync(p)) {
      return { dir, config: readTomlFile(p, {}) };
    }
    if (dir === root)
      break;
    dir = path.dirname(dir);
  }
  return null;
}
function resolveContext(cwd) {
  bootstrapDefaults();
  const project = findProjectConfig(cwd);
  const globalCfg = loadGlobalConfig();
  const envDomain = process.env.RAGGAI_DOMAIN;
  const envDomains = process.env.RAGGAI_DOMAINS?.split(",").map((s) => s.trim()).filter(Boolean);
  const activeDomain = envDomain || project?.config.domain || globalCfg.defaultDomain || "global";
  const overlay = envDomains && envDomains.length ? envDomains : project?.config.include || globalCfg.overlay || [activeDomain, "global"].filter((v, i, a) => a.indexOf(v) === i);
  const excludeDirs = Array.from(new Set([...globalCfg.excludeDirs || [], ...project?.config.excludeDirs || []]));
  const excludePatterns = Array.from(new Set([...globalCfg.excludePatterns || [], ...project?.config.excludePatterns || []]));
  const embeddingCache = project?.config.embeddingCache ?? globalCfg.embeddingCache ?? true;
  return { project, globalCfg, activeDomain, overlay: Array.from(new Set(overlay)), home: getRaggaiHome(), excludeDirs, excludePatterns, embeddingCache };
}

// src/domain/services/text-splitter.ts
var LANGUAGE_RULES = {
  bracketBased: {
    startMarkers: [
      /export\s+(const|class|function|interface)/,
      /class\s+\w+/,
      /(public|private|protected|async)\s+/,
      /function\s+\w+/
    ],
    endMarkers: ["}", "};"]
  },
  py: {
    startMarkers: [/^def\s+\w+/, /^class\s+\w+/, /^@\w+/],
    endMarkers: ["#", "def ", "class "]
  },
  compiled: {
    startMarkers: [/^func\s+/, /^fn\s+/, /^pub\s+fn\s+/, /^type\s+\w+\s+struct/],
    endMarkers: ["}"]
  }
};
function chunkCodebase(fileContent, filePath) {
  const lines = fileContent.split(`
`);
  const chunks = [];
  let currentChunk = [];
  const fileName = filePath.split(/[\\/]/).pop() ?? "";
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  let ruleType = "bracketBased";
  if (["py"].includes(ext))
    ruleType = "py";
  if (["go", "rs"].includes(ext))
    ruleType = "compiled";
  if (["json", "yaml", "yml", "toml", "md", "css"].includes(ext)) {
    for (let i = 0;i < lines.length; i += 40) {
      const slice = lines.slice(i, i + 45);
      chunks.push(`[File: ${fileName}] [Config/Static]
${slice.join(`
`)}`);
    }
    return chunks;
  }
  const rules = LANGUAGE_RULES[ruleType];
  for (let i = 0;i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    const isNewComponent = rules.startMarkers.some((regex) => regex.test(trimmedLine));
    if (isNewComponent && currentChunk.length >= 20) {
      chunks.push(`[File: ${fileName}] [Language: ${ext}] [Lines: ${i - currentChunk.length + 1}-${i}]
${currentChunk.join(`
`)}`);
      currentChunk = currentChunk.slice(-4);
    }
    currentChunk.push(line);
    if (ruleType !== "py") {
      const isEndMarker = rules.endMarkers.includes(trimmedLine) || currentChunk.length >= 80;
      if (isEndMarker && currentChunk.length >= 15) {
        chunks.push(`[File: ${fileName}] [Language: ${ext}] [Lines: ${i - currentChunk.length + 1}-${i}]
${currentChunk.join(`
`)}`);
        currentChunk = [];
      }
    } else if (currentChunk.length >= 60) {
      chunks.push(`[File: ${fileName}] [Python] [Lines: ${i - currentChunk.length + 1}-${i}]
${currentChunk.join(`
`)}`);
      currentChunk = [];
    }
  }
  if (currentChunk.length > 0) {
    chunks.push(`[File: ${fileName}] [Language: ${ext}]
${currentChunk.join(`
`)}`);
  }
  return chunks;
}
function chunkTextWithOverlap(text, chunkSize = 120, overlap = 25) {
  const words = text.trim().split(/\s+/);
  const chunks = [];
  if (words.length <= chunkSize)
    return [text];
  let i = 0;
  while (i < words.length) {
    const end = Math.min(i + chunkSize, words.length);
    chunks.push(words.slice(i, end).join(" "));
    i += chunkSize - overlap;
  }
  return chunks;
}

// src/domain/services/graph-ingest.ts
function emptyGraphIngestMetrics() {
  return { extracted: 0, upserted: 0, created: 0, merged: 0, prunedEdges: 0, prunedNodes: 0, rejected: 0, byMethod: {} };
}
function addGraphIngestMetrics(acc, m) {
  acc.extracted += m.extracted;
  acc.upserted += m.upserted;
  acc.created += m.created;
  acc.merged += m.merged;
  acc.prunedEdges += m.prunedEdges;
  acc.prunedNodes += m.prunedNodes;
  acc.rejected += m.rejected;
  for (const [k, v] of Object.entries(m.byMethod))
    acc.byMethod[k] = (acc.byMethod[k] || 0) + v;
  return acc;
}
var DEFAULT_MIN_CONFIDENCE = 0.5;
function resolveMinConfidence(explicit) {
  if (typeof explicit === "number" && Number.isFinite(explicit))
    return explicit;
  const fromEnv = Number(process.env.RAGGAI_GRAPH_MIN_CONFIDENCE);
  if (Number.isFinite(fromEnv) && process.env.RAGGAI_GRAPH_MIN_CONFIDENCE !== undefined && process.env.RAGGAI_GRAPH_MIN_CONFIDENCE !== "") {
    return Math.min(1, Math.max(0, fromEnv));
  }
  return DEFAULT_MIN_CONFIDENCE;
}
function graphIngestForFile(graph, extractor, input, opts) {
  const minConfidence = resolveMinConfidence(opts?.minConfidence);
  const metrics = emptyGraphIngestMetrics();
  const prune = graph.removeFactsBySource(input.path, input.hash ? { keepHash: input.hash } : undefined);
  metrics.prunedEdges += prune.removedEdges;
  metrics.prunedNodes += prune.removedNodes;
  const result = extractor.extract(input);
  const accepted = result.facts.filter((f) => Number.isFinite(f.confidence) && f.confidence >= minConfidence);
  metrics.rejected = result.facts.length - accepted.length;
  metrics.extracted = accepted.length;
  for (const f of accepted)
    metrics.byMethod[f.method] = (metrics.byMethod[f.method] || 0) + 1;
  const up = graph.upsertFacts(accepted);
  metrics.upserted = up.upserted;
  metrics.created = up.created;
  metrics.merged = up.merged;
  return metrics;
}

// src/domain/services/ingest-embed.ts
import * as crypto from "crypto";
var INGEST_BATCH_SIZE = 16;
async function embedAndSaveChunks(ports, items, opts) {
  if (!items.length)
    return { count: 0, embedMs: 0, writeMs: 0 };
  const batchSize = Math.max(1, opts?.batchSize ?? INGEST_BATCH_SIZE);
  const { embeddingPort, vectorPort } = ports;
  const e0 = Date.now();
  const vecs = embeddingPort.generateMany ? await embeddingPort.generateMany(items.map((i) => i.text), { batchSize }) : await Promise.all(items.map((i) => embeddingPort.generate(i.text)));
  const embedMs = Date.now() - e0;
  const w0 = Date.now();
  for (let i = 0;i < items.length; i++) {
    await vectorPort.save({
      id: items[i].id ?? crypto.randomUUID(),
      text: items[i].saveText,
      embedding: vecs[i],
      meta: items[i].meta
    });
  }
  return { count: items.length, embedMs, writeMs: Date.now() - w0 };
}

// src/domain/services/predicate-vocab.ts
var CANONICAL_PREDICATES = [
  "uses",
  "depends_on",
  "contains",
  "defines",
  "references",
  "implements",
  "calls",
  "extends",
  "part_of"
];
var RAW_ALIASES = {
  uses: ["use", "uses", "using", "usage", "utilise", "utilises", "utilising", "utilize", "utilizes", "utilizing"],
  depends_on: [
    "depend",
    "depends",
    "depending",
    "depends on",
    "depend on",
    "dependency",
    "dependencies",
    "require",
    "requires",
    "required",
    "requirement",
    "requirements",
    "need",
    "needs"
  ],
  contains: [
    "contain",
    "contains",
    "containing",
    "include",
    "includes",
    "including",
    "comprise",
    "comprises",
    "comprising",
    "consists of",
    "consisting of"
  ],
  defines: [
    "define",
    "defines",
    "defining",
    "definition",
    "definitions",
    "declare",
    "declares",
    "declaring",
    "declaration",
    "declarations"
  ],
  references: [
    "reference",
    "references",
    "referencing",
    "refer",
    "refers",
    "referring",
    "refer to",
    "refers to",
    "related",
    "related to",
    "related links",
    "related docs",
    "see",
    "see also",
    "link",
    "links",
    "mention",
    "mentions",
    "veja",
    "ver",
    "consulte"
  ],
  implements: ["implement", "implements", "implementing", "implementation", "implementations", "implementa"],
  calls: ["call", "calls", "calling", "invoke", "invokes", "invoking", "invocation", "chama", "invoca"],
  extends: ["extend", "extends", "extending", "inherit", "inherits", "inheritance", "inherit from", "inherits from"],
  part_of: ["part of", "belongs to", "belong to", "belongs", "member of", "faz parte de", "pertence a", "pertence"]
};
function normalizePredicate(raw) {
  return String(raw ?? "").trim().toLowerCase().replace(/[_\-/]+/g, " ").replace(/\s+/g, " ").trim();
}
var ALIAS_INDEX = (() => {
  const m = new Map;
  for (const canonical of CANONICAL_PREDICATES) {
    m.set(normalizePredicate(canonical.replace(/_/g, " ")), canonical);
    for (const alias of RAW_ALIASES[canonical])
      m.set(normalizePredicate(alias), canonical);
  }
  return m;
})();
function canonicalPredicate(raw) {
  const norm = normalizePredicate(raw);
  const hit = ALIAS_INDEX.get(norm);
  return hit ?? norm.replace(/\s+/g, "_");
}
function isKnownPredicate(raw) {
  return ALIAS_INDEX.has(normalizePredicate(raw));
}

// src/domain/services/entity-utils.ts
function normalizeEntityText(raw) {
  let s = String(raw ?? "");
  s = s.replace(/`([^`]*)`/g, "$1");
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1");
  s = s.replace(/~~([^~]+)~~/g, "$1");
  s = s.trim().replace(/\s+/g, " ");
  s = s.replace(/^["'\(\[]+|["'\)\]]+$/g, "").trim();
  s = s.replace(/[.,;:]+$/, "").trim();
  return s;
}
function isValidEntity(s) {
  if (!s)
    return false;
  if (s.length > 80)
    return false;
  if (!/[A-Za-zÀ-ÿ0-9]/.test(s))
    return false;
  if (/^https?:\/\//i.test(s))
    return false;
  return true;
}
function safeDecodeUri(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
function docEntityName(sourcePath) {
  const base = sourcePath.split(/[\\/]/).pop() || sourcePath;
  const dot = base.lastIndexOf(".");
  return safeDecodeUri(dot > 0 ? base.slice(0, dot) : base);
}

// src/adapters/outbound/extraction/code.extraction.ts
import * as fs2 from "fs";
import * as path2 from "path";
var CONF = { import: 0.8, importWeak: 0.6, symbol: 0.8, inherit: 0.85 };
var NODE_BUILTINS = new Set([
  "fs",
  "path",
  "crypto",
  "url",
  "http",
  "https",
  "os",
  "stream",
  "events",
  "util",
  "buffer",
  "child_process",
  "worker_threads",
  "assert",
  "zlib",
  "net",
  "tty",
  "vm",
  "readline",
  "async_hooks",
  "perf_hooks",
  "bun",
  "node:test"
]);
var PY_STDLIB = new Set([
  "os",
  "sys",
  "re",
  "json",
  "pathlib",
  "typing",
  "dataclasses",
  "collections",
  "itertools",
  "functools",
  "logging",
  "datetime",
  "math",
  "io",
  "enum",
  "abc",
  "subprocess",
  "shutil",
  "glob",
  "argparse",
  "asyncio",
  "copy",
  "hashlib",
  "importlib",
  "inspect",
  "uuid",
  "time",
  "unittest",
  "textwrap",
  "warnings",
  "string",
  "random",
  "threading",
  "multiprocessing",
  "queue",
  "signal",
  "socket",
  "struct",
  "csv",
  "sqlite3",
  "pickle",
  "tempfile",
  "traceback",
  "contextlib",
  "operator",
  "numbers",
  "decimal",
  "fractions",
  "secrets",
  "base64",
  "binascii"
]);
var GO_STD_FIRST = new Set([
  "fmt",
  "os",
  "io",
  "strings",
  "sync",
  "time",
  "errors",
  "context",
  "math",
  "sort",
  "bytes",
  "bufio",
  "strconv",
  "unicode",
  "regexp",
  "flag",
  "log",
  "embed",
  "maps",
  "slices",
  "log/slog"
]);
var GO_STD_PREFIX = ["net/", "net", "encoding/", "crypto/", "database/", "debug/", "expvar", "mime/", "path/", "text/", "html/", "runtime/", "testing", "unsafe", "syscall"];
function stripGenerics(s) {
  let t = s, prev;
  do {
    prev = t;
    t = t.replace(/<[^<>]*>/g, "");
  } while (t !== prev);
  return t.trim();
}
function lastSegment(s) {
  const segs = s.split(/[./]/).filter(Boolean);
  return segs.length ? segs[segs.length - 1] : s;
}
function rootPackage(spec) {
  if (spec.startsWith("@")) {
    const [scope, name] = spec.split("/");
    return name ? `${scope}/${name}` : scope;
  }
  return spec.split("/")[0];
}
function snippet(s) {
  return s.replace(/\s+/g, " ").trim().slice(0, 120);
}
function resolveRelativeModule(fromFile, spec) {
  const base = path2.resolve(path2.dirname(fromFile), spec);
  const exts = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"];
  const candidates = [base, ...exts.map((e) => base + e), ...exts.map((e) => path2.join(base, "index" + e))];
  for (const c of candidates) {
    try {
      if (fs2.statSync(c).isFile())
        return { name: docEntityName(c), resolved: true };
    } catch {}
  }
  const name = spec.replace(/^(\.\/|\.\.\/)+/, "").replace(/\.(ts|tsx|js|jsx|mjs|cjs|json)$/i, "").replace(/\/index$/i, "");
  return { name, resolved: false };
}
function emitImport(spec, evidence, input, doc, emit) {
  const clean = spec.trim().replace(/^node:/, "");
  if (!clean)
    return;
  if (clean.startsWith(".")) {
    const { name, resolved } = resolveRelativeModule(input.path, clean);
    if (isValidEntity(name))
      emit(doc, "depends_on", name, resolved ? CONF.import : CONF.importWeak, "import", snippet(evidence));
    return;
  }
  if (clean.startsWith("/") || clean.startsWith("~") || clean.startsWith("@/") || clean.startsWith("#"))
    return;
  if (NODE_BUILTINS.has(clean.split("/")[0]))
    return;
  const pkg = rootPackage(clean);
  if (isValidEntity(pkg))
    emit(doc, "depends_on", pkg, CONF.import, "import", snippet(evidence));
}
var TOP_ANCHOR = /^\S/;
function scanJsLike(input, doc, emit) {
  const text = input.text;
  const spans = [];
  for (const m of text.matchAll(/(?:import|export)\s+[^'"]*\bfrom\s*['"]([^'"]+)['"]/gs))
    spans.push({ m, spec: m[1] });
  for (const m of text.matchAll(/(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g))
    spans.push({ m, spec: m[1] });
  for (const m of text.matchAll(/\brequire\(\s*['"]([^'"]+)['"]\s*\)/g))
    spans.push({ m, spec: m[1] });
  for (const m of text.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g))
    spans.push({ m, spec: m[1] });
  spans.sort((a, b) => (a.m.index ?? 0) - (b.m.index ?? 0));
  for (const { m, spec } of spans)
    emitImport(spec, m[0], input, doc, emit);
  const lines = text.split(`
`);
  for (const raw of lines) {
    if (!TOP_ANCHOR.test(raw))
      continue;
    const line = raw.trim();
    if (line.startsWith("//") || line.startsWith("/*") || line.startsWith("*"))
      continue;
    const sym = line.match(/^(?:export\s+)?(?:default\s+)?(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(class|interface|type|enum|function)\s+([A-Za-z_$][\w$]*)/);
    const arrowConst = line.match(/^export\s+(?:declare\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*[:=]/);
    if (sym)
      emit(doc, "defines", sym[2], CONF.symbol, "symbol", snippet(line));
    else if (arrowConst)
      emit(doc, "defines", arrowConst[1], CONF.symbol, "symbol", snippet(line));
    if (sym && (sym[1] === "class" || sym[1] === "interface")) {
      const name = sym[2];
      const ext = line.match(/\bextends\s+([A-Za-z0-9_$.,\s<>]+?)(?=\s+implements\s|\s*\{|\s*$)/);
      const impl = line.match(/\bimplements\s+([A-Za-z0-9_$.,\s<>]+?)(?=\s*\{|\s*$)/);
      const strip = (part) => stripGenerics(part).split(",").map((t) => t.trim().replace(/^readonly\s+/, "")).filter((t) => /^[A-Za-z_$][\w$.]*$/.test(t));
      for (const t of ext ? strip(ext[1]) : [])
        emit(name, "extends", t, CONF.inherit, "inherit", snippet(line));
      for (const t of impl ? strip(impl[1]) : [])
        emit(name, "implements", t, CONF.inherit, "inherit", snippet(line));
    }
  }
}
function scanPython(input, doc, emit) {
  const lines = input.text.split(`
`);
  let inTriple = false;
  for (const raw of lines) {
    const tripleCount = (raw.match(/"""|'''/g) || []).length;
    const wasInTriple = inTriple;
    if (tripleCount % 2 === 1)
      inTriple = !inTriple;
    if (wasInTriple || tripleCount % 2 === 1 && !wasInTriple && raw.trim().startsWith('"""'))
      continue;
    if (inTriple)
      continue;
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#"))
      continue;
    if (/^\s/.test(raw))
      continue;
    const fromM = trimmed.match(/^from\s+(\.*[\w.]+)\s+import\b/);
    if (fromM) {
      const mod = fromM[1];
      if (mod.startsWith(".")) {
        const dots = mod.match(/^\.+/)[0].length;
        const rest = mod.slice(dots).replace(/\./g, "/");
        if (rest) {
          let target = path2.dirname(input.path);
          for (let i = 1;i < dots; i++)
            target = path2.dirname(target);
          const base = path2.join(target, rest);
          for (const c of [base + ".py", path2.join(base, "__init__.py")]) {
            try {
              if (fs2.statSync(c).isFile()) {
                const name = docEntityName(c);
                if (isValidEntity(name))
                  emit(doc, "depends_on", name, CONF.import, "import", snippet(trimmed));
                break;
              }
            } catch {}
          }
        }
      } else {
        const root = mod.split(".")[0];
        if (!PY_STDLIB.has(root) && isValidEntity(root))
          emit(doc, "depends_on", root, CONF.import, "import", snippet(trimmed));
      }
      continue;
    }
    const impM = trimmed.match(/^import\s+([\w.]+)/);
    if (impM) {
      const root = impM[1].split(".")[0];
      if (!PY_STDLIB.has(root) && isValidEntity(root))
        emit(doc, "depends_on", root, CONF.import, "import", snippet(trimmed));
      continue;
    }
    const sym = trimmed.match(/^(?:async\s+)?def\s+([A-Za-z_]\w*)/) ?? trimmed.match(/^class\s+([A-Za-z_]\w*)/);
    if (sym) {
      emit(doc, "defines", sym[1], CONF.symbol, "symbol", snippet(trimmed));
      const cls = trimmed.match(/^class\s+\w+\s*\(([^)]*)\)/);
      if (cls && sym[1] && trimmed.startsWith("class")) {
        for (let base of cls[1].split(",")) {
          base = base.trim().replace(/=.*$/, "");
          base = stripGenerics(base.replace(/\[[^\]]*\]/g, ""));
          base = lastSegment(base).trim();
          if (!base || /^(object|ABC|Generic|Protocol)$/.test(base))
            continue;
          if (/^[A-Za-z_]\w*$/.test(base))
            emit(sym[1], "extends", base, CONF.inherit, "inherit", snippet(trimmed));
        }
      }
    }
  }
}
function isGoStdlib(spec) {
  const first = spec.split("/")[0];
  if (GO_STD_FIRST.has(first))
    return true;
  if (GO_STD_PREFIX.some((p) => spec === p || spec.startsWith(p)))
    return true;
  return !spec.includes(".") && !spec.includes("/");
}
function scanGo(input, doc, emit) {
  const lines = input.text.split(`
`);
  let inImportBlock = false;
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (trimmed.startsWith("//"))
      continue;
    if (/^import\s*\($/.test(trimmed)) {
      inImportBlock = true;
      continue;
    }
    if (inImportBlock) {
      if (trimmed.startsWith(")")) {
        inImportBlock = false;
        continue;
      }
      const m = trimmed.match(/(?:^[\w.]+\s+)?["]([^"]+)["]/);
      if (m && !isGoStdlib(m[1]) && isValidEntity(m[1]))
        emit(doc, "depends_on", m[1], CONF.import, "import", snippet(trimmed));
      continue;
    }
    const single = trimmed.match(/^import\s+["]([^"]+)["]/);
    if (single) {
      if (!isGoStdlib(single[1]) && isValidEntity(single[1]))
        emit(doc, "depends_on", single[1], CONF.import, "import", snippet(trimmed));
      continue;
    }
    if (!/^\S/.test(raw))
      continue;
    const fn = trimmed.match(/^func\s+(?:\([^)]*\)\s*)?([A-Za-z_]\w*)\s*\(/);
    if (fn) {
      emit(doc, "defines", fn[1], CONF.symbol, "symbol", snippet(trimmed));
      continue;
    }
    const ty = trimmed.match(/^type\s+([A-Za-z_]\w*)\s/);
    if (ty)
      emit(doc, "defines", ty[1], CONF.symbol, "symbol", snippet(trimmed));
  }
}
function scanRust(input, doc, emit) {
  const lines = input.text.split(`
`);
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (trimmed.startsWith("//"))
      continue;
    if (!/^\S/.test(raw))
      continue;
    const useM = trimmed.match(/^(?:pub\s+)?use\s+([A-Za-z_][\w]*)(?:::|\s*;)/);
    if (useM) {
      const root = useM[1];
      if (!/^(std|core|alloc|crate|self|super)$/.test(root) && isValidEntity(root))
        emit(doc, "depends_on", root, CONF.import, "import", snippet(trimmed));
      continue;
    }
    const extCrate = trimmed.match(/^extern\s+crate\s+([A-Za-z_]\w*)/);
    if (extCrate && isValidEntity(extCrate[1])) {
      emit(doc, "depends_on", extCrate[1], CONF.import, "import", snippet(trimmed));
      continue;
    }
    const sym = trimmed.match(/^(?:pub\s+)?(?:unsafe\s+)?(?:async\s+)?fn\s+([A-Za-z_]\w*)/) ?? trimmed.match(/^(?:pub\s+)?(?:union\s+|type\s+|const\s+|static\s+)?(struct|enum|trait|mod)\s+([A-Za-z_]\w*)/);
    if (sym) {
      const name = sym[1] && /^(struct|enum|trait|mod)$/.test(sym[1]) ? sym[2] : sym[1];
      emit(doc, "defines", name, CONF.symbol, "symbol", snippet(trimmed));
    }
    const traitM = trimmed.match(/^(?:pub\s+)?trait\s+[A-Za-z_]\w*[^:{]*:\s*([^{]+)/);
    if (traitM) {
      const traitName = trimmed.match(/^(?:pub\s+)?trait\s+([A-Za-z_]\w*)/)[1];
      for (const sup of traitM[1].split("+")) {
        const t = stripGenerics(sup).trim();
        if (/^[A-Za-z_]\w*$/.test(t))
          emit(traitName, "extends", t, CONF.inherit, "inherit", snippet(trimmed));
      }
    }
    const implM = trimmed.match(/^impl(?:<[^>]*>)?\s+([A-Za-z_][\w:]*(?:<[^>]*>)?)\s+for\s+([A-Za-z_][\w:]*(?:<[^>]*>)?)/);
    if (implM) {
      const trait = stripGenerics(implM[1]).split("::").pop();
      const type = stripGenerics(implM[2]).split("::").pop();
      if (/^[A-Za-z_]\w*$/.test(trait) && /^[A-Za-z_]\w*$/.test(type))
        emit(type, "implements", trait, CONF.inherit, "inherit", snippet(trimmed));
    }
  }
}
function extractCodeFacts(input) {
  const facts = [];
  const seen = new Set;
  const doc = docEntityName(input.path);
  const emit = (subject, predicate, object, confidence, method, evidence) => {
    const s = normalizeEntityText(subject), o = normalizeEntityText(object);
    if (!isValidEntity(s) || !isValidEntity(o))
      return;
    const key = `${predicate}|${s}|${o}`;
    if (seen.has(key))
      return;
    seen.add(key);
    facts.push({ subject: s, predicate, object: o, confidence, method, sourcePath: input.path, sourceHash: input.hash, evidence: evidence.slice(0, 200) });
  };
  const ext = String(input.language ?? path2.extname(input.path).slice(1)).toLowerCase();
  if (["ts", "tsx", "mts", "cts", "js", "jsx", "mjs", "cjs"].includes(ext))
    scanJsLike(input, doc, emit);
  else if (ext === "py")
    scanPython(input, doc, emit);
  else if (ext === "go")
    scanGo(input, doc, emit);
  else if (ext === "rs")
    scanRust(input, doc, emit);
  return facts;
}

// src/adapters/outbound/extraction/deterministic.extraction.ts
var LEGACY_FACT_LINE = /-\s*\[([^\]]+)\]\s+([^\[\]\n]+?)\s+\[([^\]]+)\]/;
var CONFIDENCE = { rule: 0.9, frontmatter: 0.85, table: 0.8, wiki: 0.8, md: 0.75, heading: 0.75 };
var WIKILINK = /\[\[([^\]|#]+)(#[^\]|]*)?(\|[^\]]*)?\]\]/g;
var MD_LINK = /(?<!!)\[([^\]]*)\]\(([^)\s]+)(#[^)\s]*)?\)/g;
var TRIPLE_HEADERS = {
  entity: "subject",
  subject: "subject",
  source: "subject",
  from: "subject",
  relation: "predicate",
  predicate: "predicate",
  rel: "predicate",
  target: "object",
  object: "object",
  to: "object",
  dest: "object"
};
function parseTableCells(line) {
  const inner = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return inner.split("|").map((c) => normalizeEntityText(c));
}
function isSeparatorRow(cells) {
  return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c.trim()) || /^-+$/.test(c.trim()));
}
function splitFrontmatterList(value) {
  let v = value.trim();
  if (v.startsWith("[") && v.endsWith("]"))
    v = v.slice(1, -1);
  return v.split(",").map((s) => normalizeEntityText(s.replace(/^["']|["']$/g, ""))).filter(Boolean);
}

class DeterministicExtractionAdapter {
  extract(input) {
    const facts = input.kind === "note" ? this.extractNote(input) : extractCodeFacts(input);
    return { facts, diagnostics: { extracted: facts.length, rejectedLowConfidence: 0 } };
  }
  extractNote(input) {
    const facts = [];
    const doc = docEntityName(input.path);
    const push = (subject, predicate, object, confidence, method, evidence) => {
      const s = normalizeEntityText(subject), o = normalizeEntityText(object);
      if (!isValidEntity(s) || !isValidEntity(o))
        return;
      const p = canonicalPredicate(predicate);
      if (!p)
        return;
      facts.push({ subject: s, predicate: p, object: o, confidence, method, sourcePath: input.path, sourceHash: input.hash, evidence: evidence.slice(0, 200) });
    };
    const lines = input.text.split(`
`);
    let inFrontmatter = false, frontmatterSeen = false, inFence = false;
    let headingPredicate = null;
    let pendingFmPredicate = null;
    let tableHeader = null, tableRows = [];
    const flushTable = () => {
      if (tableHeader) {
        const norm = tableHeader.map((c) => c.toLowerCase().replace(/[^a-z_]/g, "_").replace(/^_+|_+$/g, ""));
        const roles = norm.map((c) => TRIPLE_HEADERS[c]);
        const triple = roles.length >= 3 && roles[0] === "subject" && roles[1] === "predicate" && roles[2] === "object";
        const predCols = tableHeader.map((c, i) => i > 0 && isKnownPredicate(c) ? { i, pred: canonicalPredicate(c) } : null).filter(Boolean);
        for (const row of tableRows) {
          if (triple) {
            push(row[0], row[1], row[2], CONFIDENCE.table, "table", `| ${row.join(" | ")} |`);
          } else {
            for (const { i, pred } of predCols)
              push(row[0], pred, row[i], CONFIDENCE.table, "table", `| ${row.join(" | ")} |`);
          }
        }
      }
      tableHeader = null;
      tableRows = [];
    };
    for (let idx = 0;idx < lines.length; idx++) {
      const trimmed = lines[idx].trim();
      if (idx === 0 && trimmed === "---") {
        inFrontmatter = true;
        frontmatterSeen = true;
        continue;
      }
      if (inFrontmatter) {
        if (trimmed === "---" || trimmed === "...") {
          inFrontmatter = false;
          continue;
        }
        const kv = trimmed.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
        if (kv) {
          const key = kv[1], val = kv[2].trim();
          pendingFmPredicate = isKnownPredicate(key) ? canonicalPredicate(key) : null;
          if (val !== "" && pendingFmPredicate) {
            for (const item of splitFrontmatterList(val))
              push(doc, pendingFmPredicate, item, CONFIDENCE.frontmatter, "frontmatter", trimmed);
            pendingFmPredicate = null;
          }
        } else if (pendingFmPredicate && /^-\s+/.test(trimmed)) {
          push(doc, pendingFmPredicate, trimmed.replace(/^-\s+/, ""), CONFIDENCE.frontmatter, "frontmatter", trimmed);
        } else if (trimmed !== "" && !/^-\s+/.test(trimmed)) {
          pendingFmPredicate = null;
        }
        continue;
      }
      if (frontmatterSeen && idx === 0) {}
      if (/^(```|~~~)/.test(trimmed)) {
        inFence = !inFence;
        flushTable();
        continue;
      }
      if (inFence)
        continue;
      if (/^\|.*\|$/.test(trimmed)) {
        const cells = parseTableCells(trimmed);
        if (isSeparatorRow(cells))
          continue;
        if (!tableHeader)
          tableHeader = cells;
        else
          tableRows.push(cells);
        continue;
      }
      flushTable();
      const h = trimmed.match(/^#{1,6}\s+(.+)$/);
      if (h) {
        const text = normalizeEntityText(h[1]);
        headingPredicate = isKnownPredicate(text) ? canonicalPredicate(text) : null;
        continue;
      }
      const b = trimmed.match(/^(?:[-*+]|\d+[.)])\s+(.+)$/);
      if (b && headingPredicate && !/[\[\]]/.test(b[1])) {
        push(doc, headingPredicate, b[1], CONFIDENCE.heading, "heading", trimmed);
      }
      for (const m of trimmed.matchAll(WIKILINK))
        push(doc, "references", m[1], CONFIDENCE.wiki, "link", trimmed);
      for (const m of trimmed.matchAll(MD_LINK)) {
        const target = m[2];
        if (/^https?:\/\//i.test(target))
          continue;
        const pathOnly = target.split("#")[0];
        if (!/\.(md|mdx|markdown|txt)$/i.test(pathOnly))
          continue;
        push(doc, "references", docEntityName(pathOnly), CONFIDENCE.md, "link", trimmed);
      }
      const legacy = trimmed.match(LEGACY_FACT_LINE);
      if (legacy)
        push(legacy[1], legacy[2], legacy[3], CONFIDENCE.rule, "rule", trimmed);
    }
    flushTable();
    return facts;
  }
}

// src/adapters/outbound/transformers/xenova.adapter.ts
import { pipeline } from "@xenova/transformers";
import { ONNX } from "@xenova/transformers/src/backends/onnx.js";

// src/config/embedding-cache.ts
import * as fs3 from "fs";
import * as path3 from "path";
import * as crypto2 from "crypto";
class EmbeddingCache {
  cacheFile;
  map = {};
  dirty = false;
  hits = 0;
  misses = 0;
  constructor(name = "embeddings") {
    const dir = path3.join(getCacheDir(), "embeddings");
    fs3.mkdirSync(dir, { recursive: true });
    this.cacheFile = path3.join(dir, `${name}.json`);
    try {
      if (fs3.existsSync(this.cacheFile))
        this.map = JSON.parse(fs3.readFileSync(this.cacheFile, "utf-8"));
    } catch {
      this.map = {};
    }
  }
  key(text, model = "default") {
    return crypto2.createHash("sha256").update(model + `
` + text).digest("hex");
  }
  get(text, model) {
    const v = this.map[this.key(text, model)];
    if (v)
      this.hits++;
    else
      this.misses++;
    return v;
  }
  set(text, embedding, model) {
    this.map[this.key(text, model)] = embedding;
    this.dirty = true;
  }
  stats() {
    return { hits: this.hits, misses: this.misses, size: Object.keys(this.map).length };
  }
  flush() {
    if (!this.dirty)
      return;
    try {
      fs3.writeFileSync(this.cacheFile, JSON.stringify(this.map));
      this.dirty = false;
    } catch {}
  }
}

// src/adapters/outbound/transformers/xenova.adapter.ts
function forceNativeCpuBackend() {
  const IS = ONNX?.InferenceSession;
  if (!IS || IS.__raggaiCpuPatched)
    return;
  const originalCreate = IS.create.bind(IS);
  IS.create = (buffer, options) => originalCreate(buffer, { ...options || {}, executionProviders: ["cpu"] });
  IS.__raggaiCpuPatched = true;
}
forceNativeCpuBackend();

class XenovaAdapter {
  pipe = null;
  initPromise = null;
  cache = null;
  model;
  constructor(opts) {
    this.model = opts?.model || "Xenova/all-MiniLM-L6-v2";
    if (opts?.cache !== false) {
      this.cache = new EmbeddingCache(opts?.cacheName || "default");
    }
  }
  async init() {
    if (this.initPromise)
      return this.initPromise;
    const attempt = async () => {
      let timer;
      try {
        return await Promise.race([
          pipeline("feature-extraction", this.model),
          new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error("Timed out loading the embedding model")), 60000);
          })
        ]);
      } finally {
        if (timer)
          clearTimeout(timer);
      }
    };
    const p = (async () => {
      let lastErr;
      for (let i = 0;i < 3; i++) {
        try {
          this.pipe = await attempt();
          return;
        } catch (err) {
          lastErr = err;
          console.warn(`[raggai] Embedding model load failed (attempt ${i + 1}/3):`, err?.message ?? err);
        }
      }
      throw new Error(`Failed to load the embedding model after 3 attempts. Last error: ${lastErr?.message ?? lastErr}`);
    })();
    this.initPromise = p;
    p.catch(() => {
      if (this.initPromise === p)
        this.initPromise = null;
    });
    return p;
  }
  async generate(text) {
    const cached = this.cache?.get(text, this.model);
    if (cached)
      return cached;
    await this.init();
    const output = await this.pipe(text, { pooling: "mean", normalize: true });
    const vec = Array.from(output.data);
    this.cache?.set(text, vec, this.model);
    return vec;
  }
  async generateMany(texts, opts) {
    const batchSize = Math.max(1, opts?.batchSize || 8);
    const results = new Array(texts.length);
    const pending = [];
    for (let i = 0;i < texts.length; i++) {
      const c = this.cache?.get(texts[i], this.model);
      if (c)
        results[i] = c;
      else
        pending.push({ i, text: texts[i] });
    }
    if (!pending.length)
      return results;
    await this.init();
    for (let start = 0;start < pending.length; start += batchSize) {
      const slice = pending.slice(start, start + batchSize);
      const vecs = await Promise.all(slice.map(async (p) => {
        const output = await this.pipe(p.text, { pooling: "mean", normalize: true });
        const vec = Array.from(output.data);
        this.cache?.set(p.text, vec, this.model);
        return { i: p.i, vec };
      }));
      for (const v of vecs)
        results[v.i] = v.vec;
    }
    return results;
  }
  getCacheStats() {
    return this.cache ? this.cache.stats() : null;
  }
  flushCache() {
    this.cache?.flush();
  }
}

// src/adapters/outbound/lancedb/lancedb.adapter.ts
import * as fs4 from "fs";
import * as lancedb from "@lancedb/lancedb";
class LanceDBAdapter {
  embeddingPort;
  db = null;
  table = null;
  initPromise = null;
  vectorDir;
  domain;
  constructor(embeddingPort, opts) {
    this.embeddingPort = embeddingPort;
    this.domain = opts?.domain || process.env.RAGGAI_DOMAIN || "global";
    this.vectorDir = opts?.vectorDir || getVectorDir(this.domain);
  }
  async init() {
    if (this.initPromise)
      return this.initPromise;
    this.initPromise = (async () => {
      ensureDomain(this.domain, this.domain === "global" ? "global" : "custom");
      fs4.mkdirSync(this.vectorDir, { recursive: true });
      this.db = await lancedb.connect(this.vectorDir);
      try {
        this.table = await this.db.openTable("memoria_vetorial");
      } catch {
        const dummy = this.embeddingPort ? await this.embeddingPort.generate("init") : new Array(384).fill(0);
        this.table = await this.db.createTable("memoria_vetorial", [
          { vector: dummy, text: "Inicialização do sistema", type: "system", path: "none", domain: this.domain }
        ]);
      }
    })();
    return this.initPromise;
  }
  async deleteByPath(filePath) {
    await this.init();
    const escaped = filePath.replace(/'/g, "''");
    const attempts = [
      { name: "sql-path", run: () => this.table.delete(`path = '${escaped}'`) },
      { name: "sql-quoted", run: () => this.table.delete(`"path" = '${escaped}'`) },
      { name: "where-path", run: () => this.table.delete({ where: `path = '${escaped}'` }) }
    ];
    let lastErr = "";
    for (const a of attempts) {
      try {
        await a.run();
        return { deleted: true, method: a.name };
      } catch (e) {
        lastErr = e?.message || String(e);
      }
    }
    return { deleted: false, error: lastErr };
  }
  async count() {
    await this.init();
    try {
      if (typeof this.table.countRows === "function")
        return await this.table.countRows();
      if (typeof this.table.count_rows === "function")
        return await this.table.count_rows();
    } catch {}
    try {
      const rows = await this.table.query().select(["id"]).limit(1e5).toArray();
      return rows.length;
    } catch {
      return null;
    }
  }
  async save(chunk) {
    await this.init();
    const items = Array.isArray(chunk) ? chunk : [chunk];
    for (const c of items) {
      const record = {
        vector: c.embedding,
        text: c.text,
        domain: this.domain,
        ...c.meta
      };
      await this.table.add([record]);
    }
  }
  async search(queryEmbedding, k = 4) {
    await this.init();
    const hits = await this.table.search(queryEmbedding).distanceType("cosine").limit(k).toArray();
    return hits.map((h) => ({
      id: h.text ?? "",
      score: 1 - (h._distance ?? 0),
      meta: { path: h.path, type: h.type, domain: h.domain || this.domain, text: h.text }
    }));
  }
  async clear() {
    if (fs4.existsSync(this.vectorDir))
      fs4.rmSync(this.vectorDir, { recursive: true, force: true });
    this.table = null;
    this.db = null;
    this.initPromise = null;
  }
}

// src/adapters/outbound/graphology/json-graph.adapter.ts
var import_graphology = __toESM(require_graphology_cjs(), 1);
import * as fs5 from "fs";
import * as path4 from "path";
function getLevenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0;i <= b.length; i++) {
    matrix[i] = new Array(a.length + 1).fill(0);
    matrix[i][0] = i;
  }
  for (let j = 0;j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1;i <= b.length; i++) {
    for (let j = 1;j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1))
        matrix[i][j] = matrix[i - 1][j - 1];
      else
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}
var clamp01 = (n) => Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
var normalizePredicate2 = (relation) => relation.trim().toLowerCase().replace(/\s+/g, "_");
var nowIso = () => new Date().toISOString();

class JsonGraphAdapter {
  graph;
  graphFile;
  domain;
  constructor(opts) {
    this.domain = opts?.domain || process.env.RAGGAI_DOMAIN || "global";
    this.graphFile = opts?.graphFile || getGraphFile(this.domain);
    this.graph = new import_graphology.default({ multi: true });
    this.load();
    if (!fs5.existsSync(this.graphFile))
      this.save();
  }
  validateAndFindEntity(name) {
    const cleanName = name.trim();
    if (!cleanName)
      return "EmptyEntity";
    const normalizedTarget = cleanName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const wordLike = /^[a-z0-9]+$/i.test(cleanName.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
    for (const node of this.graph.nodes()) {
      const normalizedNode = node.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (normalizedTarget === normalizedNode)
        return node;
      const nodeWordLike = /^[a-z0-9]+$/i.test(node.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
      if (wordLike && nodeWordLike && cleanName.length > 4 && normalizedTarget.charAt(0) === normalizedNode.charAt(0) && getLevenshteinDistance(cleanName.toLowerCase(), node.toLowerCase()) <= 2)
        return node;
    }
    return cleanName;
  }
  addFact(source, relation, target) {
    this.upsertFacts([{ subject: source, predicate: relation, object: target, confidence: 1, method: "manual" }]);
  }
  upsertFacts(facts) {
    const result = { upserted: 0, created: 0, merged: 0 };
    let touched = false;
    for (const fact of facts) {
      if (!fact)
        continue;
      const subject = this.validateAndFindEntity(String(fact.subject ?? ""));
      const object = this.validateAndFindEntity(String(fact.object ?? ""));
      const relation = normalizePredicate2(String(fact.predicate ?? ""));
      if (!subject || !object || !relation)
        continue;
      if (!this.graph.hasNode(subject))
        this.graph.addNode(subject);
      if (!this.graph.hasNode(object))
        this.graph.addNode(object);
      const extractedAt = nowIso();
      const evidence = {
        sourcePath: fact.sourcePath,
        sourceHash: fact.sourceHash,
        method: String(fact.method || "rule"),
        confidence: clamp01(fact.confidence),
        evidence: fact.evidence ? String(fact.evidence).slice(0, 200) : undefined,
        extractedAt
      };
      const edgeKey = `${subject}-${relation}-${object}`;
      if (this.graph.hasEdge(edgeKey)) {
        const attrs = this.graph.getEdgeAttributes(edgeKey) || {};
        const provenance = Array.isArray(attrs.provenance) ? [...attrs.provenance] : [];
        const idx = provenance.findIndex((p) => (p.sourcePath ?? "") === (evidence.sourcePath ?? "") && p.method === evidence.method);
        if (idx >= 0)
          provenance[idx] = evidence;
        else
          provenance.push(evidence);
        const merged = this.withMergedAttributes(attrs, relation, provenance, extractedAt);
        this.graph.replaceEdgeAttributes(edgeKey, merged);
        result.merged++;
      } else {
        this.graph.addEdgeWithKey(edgeKey, subject, object, {
          relation,
          domain: this.domain,
          confidence: evidence.confidence,
          occurrences: 1,
          updatedAt: extractedAt,
          provenance: [evidence]
        });
        result.created++;
      }
      result.upserted++;
      touched = true;
    }
    if (touched)
      this.save();
    return result;
  }
  withMergedAttributes(attrs, relation, provenance, updatedAt) {
    const confidence = provenance.length ? Math.max(...provenance.map((p) => clamp01(p.confidence))) : clamp01(attrs.confidence ?? 1);
    return {
      ...attrs,
      relation,
      domain: this.domain,
      confidence,
      occurrences: provenance.length,
      updatedAt,
      provenance
    };
  }
  removeFactsBySource(sourcePath, opts) {
    let removedEdges = 0;
    const keepHash = opts?.keepHash;
    for (const edge of [...this.graph.edges()]) {
      const attrs = this.graph.getEdgeAttributes(edge) || {};
      const provenance = Array.isArray(attrs.provenance) ? attrs.provenance : [];
      if (!provenance.length)
        continue;
      const remaining = provenance.filter((p) => !(p.sourcePath === sourcePath && (!keepHash || p.sourceHash !== keepHash)));
      if (remaining.length === provenance.length)
        continue;
      if (remaining.length === 0) {
        this.graph.dropEdge(edge);
        removedEdges++;
      } else {
        this.graph.replaceEdgeAttributes(edge, this.withMergedAttributes(attrs, attrs.relation ?? "uses", remaining, nowIso()));
      }
    }
    let removedNodes = 0;
    for (const node of [...this.graph.nodes()]) {
      if (this.graph.degree(node) === 0) {
        this.graph.dropNode(node);
        removedNodes++;
      }
    }
    if (removedEdges || removedNodes)
      this.save();
    return { removedEdges, removedNodes };
  }
  searchConnections(keyword) {
    if (!this.graph.hasNode(keyword))
      return [];
    const lines = [];
    const render = (from, to, edgeKey) => {
      const attrs = this.graph.getEdgeAttributes(edgeKey);
      lines.push(`Structured fact: [${from}] -> (${attrs?.relation ?? "?"}) -> [${to}]`);
    };
    for (const edge of this.graph.outEdges(keyword))
      render(keyword, this.graph.target(edge), edge);
    for (const edge of this.graph.inEdges(keyword))
      render(this.graph.source(edge), keyword, edge);
    return lines;
  }
  auditAndExportTree() {
    let nosRemovidos = 0;
    this.graph.nodes().forEach((node) => {
      if (this.graph.degree(node) === 0) {
        this.graph.dropNode(node);
        nosRemovidos++;
      }
    });
    if (nosRemovidos > 0)
      this.save();
    let tracked = 0, occurrences = 0;
    const byMethod = {};
    for (const edge of this.graph.edges()) {
      const attrs = this.graph.getEdgeAttributes(edge) || {};
      const prov = Array.isArray(attrs.provenance) ? attrs.provenance : [];
      if (!prov.length)
        continue;
      tracked++;
      occurrences += prov.length;
      for (const p of prov)
        byMethod[p.method] = (byMethod[p.method] || 0) + 1;
    }
    const methodSummary = Object.entries(byMethod).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(", ") || "none";
    let visualTree = `=== GRAPH AUDIT TREE ===

`;
    const visited = new Set;
    const roots = this.graph.nodes().sort((a, b) => this.graph.outDegree(b) - this.graph.outDegree(a));
    roots.forEach((root) => {
      if (!visited.has(root)) {
        visualTree += `[${root}]
`;
        visited.add(root);
        const edges = this.graph.outEdges(root);
        edges.forEach((edge, index) => {
          const target = this.graph.target(edge);
          const attrs = this.graph.getEdgeAttributes(edge);
          visualTree += `${index === edges.length - 1 ? "└── " : "├── "}──(${attrs.relation})──> [${target}]
`;
          visited.add(target);
        });
        visualTree += `
`;
      }
    });
    const ativos = typeof this.graph.order === "function" ? this.graph.order() : this.graph.order;
    return {
      relatorio: `Orphan nodes removed: ${nosRemovidos}. Active: ${ativos}. Edges: ${this.graph.edges().length} (provenance-tracked: ${tracked}, occurrences: ${occurrences}; by method: ${methodSummary}).
`,
      arvoreVisual: visualTree
    };
  }
  exportInteractiveHtml(outputPath) {
    const nodes = this.graph.nodes().map((node) => ({ id: node, label: node, shape: "dot", size: 20 }));
    const edges = this.graph.edges().map((e) => ({ from: this.graph.source(e), to: this.graph.target(e), label: this.graph.getEdgeAttributes(e).relation, arrows: "to" }));
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Knowledge Graph</title><script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script><style>body{margin:0}#m{width:100vw;height:100vh}</style></head><body><div id="m"></div><script>new vis.Network(document.getElementById('m'),{nodes:new vis.DataSet(${JSON.stringify(nodes)}),edges:new vis.DataSet(${JSON.stringify(edges)})},{physics:{stabilization:true}})</script></body></html>`;
    fs5.mkdirSync(path4.dirname(outputPath), { recursive: true });
    fs5.writeFileSync(outputPath, html, "utf-8");
  }
  clear() {
    this.graph.clear();
    if (fs5.existsSync(this.graphFile))
      fs5.unlinkSync(this.graphFile);
  }
  getRaw() {
    return this.graph.export();
  }
  save() {
    ensureDomain(this.domain, this.domain === "global" ? "global" : "custom");
    fs5.mkdirSync(path4.dirname(this.graphFile), { recursive: true });
    fs5.writeFileSync(this.graphFile, JSON.stringify(this.graph.export(), null, 2));
  }
  load() {
    if (fs5.existsSync(this.graphFile)) {
      try {
        this.graph.import(JSON.parse(fs5.readFileSync(this.graphFile, "utf-8")));
      } catch {}
    }
  }
}

// src/config/fs-utils.ts
import * as fs6 from "fs";
import * as path5 from "path";
var DEFAULT_EXCLUDE_DIRS = new Set(["node_modules", ".git", "dist", "data", ".opencode", ".idea", "build", "coverage", ".next", ".turbo", ".cache"]);
var DEFAULT_EXCLUDE_FILES = [/\.env(\.|$)/i, /secret/i, /credential/i, /\.pem$/i, /\.key$/i, /id_rsa/i, /\.sqlite$/i, /\.db$/i, /token/i];
function compilePatterns(patterns) {
  const out = [];
  for (const p of patterns || []) {
    try {
      out.push(new RegExp(p, "i"));
    } catch {}
  }
  return out;
}
function isSensitivePath(p, extraPatterns) {
  const base = path5.basename(p);
  const all = [...DEFAULT_EXCLUDE_FILES, ...extraPatterns || []];
  return all.some((r) => r.test(base) || r.test(p));
}
function shouldExcludeDir(name, extraDirs) {
  return DEFAULT_EXCLUDE_DIRS.has(name) || !!extraDirs?.has(name);
}
function walkFiles(root, opts) {
  const out = [];
  const exts = opts?.exts;
  const extraDirs = opts?.excludeDirs?.length ? new Set(opts.excludeDirs) : undefined;
  const extraPatterns = compilePatterns(opts?.excludePatterns);
  const st = fs6.statSync(root);
  if (st.isFile()) {
    const fp = path5.resolve(root);
    if (isSensitivePath(fp, extraPatterns))
      return [];
    const ext = path5.basename(fp).split(".").pop()?.toLowerCase() || "";
    if (exts && !exts.has(ext))
      return [];
    return [fp];
  }
  const walk = (dir) => {
    let entries = [];
    try {
      entries = fs6.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const fp = path5.join(dir, e.name);
      if (e.isDirectory()) {
        if (shouldExcludeDir(e.name, extraDirs))
          continue;
        walk(fp);
      } else if (e.isFile()) {
        if (isSensitivePath(fp, extraPatterns))
          continue;
        const ext = e.name.split(".").pop()?.toLowerCase() || "";
        if (exts && !exts.has(ext))
          continue;
        out.push(fp);
      }
    }
  };
  walk(path5.resolve(root));
  return out;
}
function walkCodeFiles(root, opts) {
  return walkFiles(root, { ...opts, exts: new Set(["ts", "tsx", "js", "jsx", "py", "go", "rs", "json", "yaml", "yml", "css", "toml", "sql", "sh", "java", "rb", "php", "c", "cpp", "h", "cs"]) });
}
function walkMarkdownFiles(root, opts) {
  return walkFiles(root, { ...opts, exts: new Set(["md"]) });
}

// src/adapters/inbound/agent-plugin/tool-exports.ts
function raggaiTool(def) {
  return {
    name: def.name,
    description: def.description,
    input: def.inputSchema,
    execute: async (args, _context) => {
      const out = await def.execute(args);
      if (out && typeof out === "object" && (("content" in out) || ("output" in out) || ("metadata" in out)))
        return out;
      return { content: JSON.stringify(out ?? null, null, 2) };
    }
  };
}
var tool = raggaiTool;
var sharedEmbedding = null;
function getEmbedding() {
  if (!sharedEmbedding) {
    const ctx = resolveContext();
    sharedEmbedding = new XenovaAdapter({ cache: ctx.embeddingCache ?? true, cacheName: "global" });
  }
  return sharedEmbedding;
}
var sharedExtraction = new DeterministicExtractionAdapter;
function getDomainContainer(domain) {
  const emb = getEmbedding();
  return { embeddingPort: emb, vectorPort: new LanceDBAdapter(emb, { domain }), graphPort: new JsonGraphAdapter({ domain }), extractionPort: sharedExtraction, domain };
}
function hashContent(s) {
  return crypto3.createHash("sha256").update(s).digest("hex");
}
function manifestPath(domain) {
  return path6.join(getDomainDir(domain), "index-manifest.json");
}
function loadManifest(domain) {
  try {
    return JSON.parse(fs7.readFileSync(manifestPath(domain), "utf-8"));
  } catch {
    return {};
  }
}
function saveManifest(domain, m) {
  fs7.mkdirSync(getDomainDir(domain), { recursive: true });
  fs7.writeFileSync(manifestPath(domain), JSON.stringify(m, null, 2));
}
var consult_memory_personal = tool({
  name: "consult_memory_personal",
  description: "Hybrid search: vector (LanceDB) + graph (keywords) across project/global overlay",
  inputSchema: { type: "object", properties: { query: { type: "string" }, keywords: { type: "array", items: { type: "string" } } }, required: ["query"] },
  execute: async ({ query, keywords }) => {
    const ctx = resolveContext();
    const domains = ctx.overlay.length ? ctx.overlay : [ctx.activeDomain];
    const emb = getEmbedding();
    const qEmb = await emb.generate(query);
    let graphResults = [];
    let vectorResults = [];
    const all = await Promise.all(domains.map(async (d) => {
      ensureDomain(d, d === "global" ? "global" : "custom");
      const c = getDomainContainer(d);
      const hits = await c.vectorPort.search(qEmb, 4);
      const kws = keywords && keywords.length ? keywords : query.split(/\s+/).filter((w) => w.length > 3).slice(0, 3);
      let g = [];
      for (const kw of kws)
        g = g.concat(c.graphPort.searchConnections(kw).map((x) => `[${d}] ${x}`));
      return { d, hits, g };
    }));
    const mergedHits = all.flatMap((x) => x.hits.map((h) => ({ ...h, domain: x.d }))).sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 6);
    vectorResults = mergedHits.map((h) => `[${h.domain}|${h.meta?.type || ""}|${h.meta?.path || ""}|${((h.score || 0) * 100).toFixed(1)}%] ${h.meta?.text ?? h.id}`);
    graphResults = all.flatMap((x) => x.g);
    return { dados_grafo: graphResults, dados_vetor: vectorResults, domains };
  }
});
var memorize_personal_fact = tool({
  name: "memorize_personal_fact",
  description: "Stores structured fact + text in active project domain",
  inputSchema: { type: "object", properties: { rawText: { type: "string" }, entity: { type: "string" }, relation: { type: "string" }, target: { type: "string" } }, required: ["rawText"] },
  execute: async ({ rawText, entity, relation, target }) => {
    const t0 = Date.now();
    try {
      const ctx = resolveContext();
      const d = ctx.activeDomain;
      ensureDomain(d, d === "global" ? "global" : "project");
      const c = getDomainContainer(d);
      await c.vectorPort.save({ id: crypto3.randomUUID(), text: rawText, embedding: await c.embeddingPort.generate(rawText), meta: { type: "general", path: "none" } });
      if (entity && relation && target)
        c.graphPort.upsertFacts([{ subject: entity, predicate: relation, object: target, confidence: 1, method: "manual" }]);
      c.embeddingPort.flushCache?.();
      return { status: "Success", domain: d, timing_ms: Date.now() - t0, embedding_cache: c.embeddingPort.getCacheStats?.() || undefined };
    } catch (e) {
      return { status: "Error", detail: e.message };
    }
  }
});
var import_markdown_notes = tool({
  name: "import_markdown_notes",
  description: ".md ingestion with overlap + auto graph into active domain (incremental by hash)",
  inputSchema: { type: "object", properties: { targetPath: { type: "string" } }, required: ["targetPath"] },
  execute: async ({ targetPath }) => {
    const t0 = Date.now();
    const pResolved = path6.resolve(targetPath);
    if (!fs7.existsSync(pResolved))
      return { error: "Path not found" };
    const ctx = resolveContext();
    const d = ctx.activeDomain;
    ensureDomain(d, d === "global" ? "global" : "project");
    const c = getDomainContainer(d);
    const manifest = loadManifest(d);
    const files = fs7.statSync(pResolved).isFile() && pResolved.endsWith(".md") ? [pResolved] : walkMarkdownFiles(pResolved, { excludeDirs: ctx.excludeDirs, excludePatterns: ctx.excludePatterns });
    const seen = new Set(files);
    let processed = 0, skipped = 0, chunksTotal = 0, pruned = 0, deleteFailures = 0;
    const graphStats = emptyGraphIngestMetrics();
    const safeDelete = async (fp) => {
      if (!c.vectorPort.deleteByPath)
        return;
      try {
        const r = await c.vectorPort.deleteByPath(fp);
        if (r && r.deleted === false)
          deleteFailures++;
      } catch {
        deleteFailures++;
      }
    };
    const embedSave = async (items) => {
      const r = await embedAndSaveChunks(c, items);
      chunksTotal += r.count;
    };
    for (const f of files) {
      const content = fs7.readFileSync(f, "utf-8");
      const h = hashContent(content);
      if (manifest[f] === h) {
        skipped++;
        continue;
      }
      if (manifest[f])
        await safeDelete(f);
      const chunks = chunkTextWithOverlap(content);
      await embedSave(chunks.map((chunk) => ({ text: chunk, saveText: `[Note: ${path6.basename(f)}] ${chunk}`, meta: { type: "note", path: f, fileHash: h } })));
      addGraphIngestMetrics(graphStats, graphIngestForFile(c.graphPort, c.extractionPort, { kind: "note", path: f, text: content, hash: h }));
      manifest[f] = h;
      processed++;
    }
    for (const old of Object.keys(manifest)) {
      if (old.startsWith(pResolved) && !seen.has(old) && !fs7.existsSync(old)) {
        await safeDelete(old);
        const g = c.graphPort.removeFactsBySource(old);
        graphStats.prunedEdges += g.removedEdges;
        graphStats.prunedNodes += g.removedNodes;
        delete manifest[old];
        pruned++;
      }
    }
    saveManifest(d, manifest);
    c.embeddingPort.flushCache?.();
    return { status: "Success", domain: d, files_processed: processed, files_skipped: skipped, blocks_indexed: chunksTotal, orphans_pruned: pruned, delete_failures: deleteFailures, graph: graphStats, timing_ms: Date.now() - t0, embedding_cache: c.embeddingPort.getCacheStats?.() || undefined };
  }
});
var index_local_codebase = tool({
  name: "index_local_codebase",
  description: "Indexes source code into active domain (incremental by hash)",
  inputSchema: { type: "object", properties: { repoPath: { type: "string" } }, required: ["repoPath"] },
  execute: async ({ repoPath }) => {
    const t0 = Date.now();
    const pAbsoluto = path6.resolve(repoPath);
    if (!fs7.existsSync(pAbsoluto))
      return { error: "Path not found" };
    const ctx = resolveContext();
    const d = ctx.activeDomain;
    ensureDomain(d, d === "global" ? "global" : "project");
    const c = getDomainContainer(d);
    const manifest = loadManifest(d);
    const files = walkCodeFiles(pAbsoluto, { excludeDirs: ctx.excludeDirs, excludePatterns: ctx.excludePatterns });
    const seen = new Set(files);
    let total = 0, processed = 0, skipped = 0, pruned = 0, deleteFailures = 0;
    const graphStats = emptyGraphIngestMetrics();
    const safeDelete = async (fp) => {
      if (!c.vectorPort.deleteByPath)
        return;
      try {
        const r = await c.vectorPort.deleteByPath(fp);
        if (r && r.deleted === false)
          deleteFailures++;
      } catch {
        deleteFailures++;
      }
    };
    const embedSave = async (items) => {
      const r = await embedAndSaveChunks(c, items);
      total += r.count;
    };
    for (const f of files) {
      try {
        const content = fs7.readFileSync(f, "utf-8");
        const h = hashContent(content);
        if (manifest[f] === h) {
          skipped++;
          continue;
        }
        if (manifest[f])
          await safeDelete(f);
        const chunks = chunkCodebase(content, f);
        await embedSave(chunks.map((chunk) => ({ text: chunk, saveText: chunk, meta: { type: "code", path: f, fileHash: h } })));
        addGraphIngestMetrics(graphStats, graphIngestForFile(c.graphPort, c.extractionPort, { kind: "code", path: f, text: content, hash: h, language: f.split(".").pop() }));
        manifest[f] = h;
        processed++;
      } catch {}
    }
    for (const old of Object.keys(manifest)) {
      if (old.startsWith(pAbsoluto) && !seen.has(old) && !fs7.existsSync(old)) {
        await safeDelete(old);
        const g = c.graphPort.removeFactsBySource(old);
        graphStats.prunedEdges += g.removedEdges;
        graphStats.prunedNodes += g.removedNodes;
        delete manifest[old];
        pruned++;
      }
    }
    saveManifest(d, manifest);
    c.embeddingPort.flushCache?.();
    return { status: "Success", domain: d, files_processed: processed, files_skipped: skipped, blocks_indexed: total, orphans_pruned: pruned, delete_failures: deleteFailures, graph: graphStats, timing_ms: Date.now() - t0, embedding_cache: c.embeddingPort.getCacheStats?.() || undefined };
  }
});
var search_semantic_codebase = tool({
  name: "search_semantic_codebase",
  description: "Semantic code search across overlay domains",
  inputSchema: { type: "object", properties: { query: { type: "string" }, limit: { type: "number", default: 4 } }, required: ["query"] },
  execute: async ({ query, limit = 4 }) => {
    const ctx = resolveContext();
    const domains = ctx.overlay.length ? ctx.overlay : [ctx.activeDomain];
    const emb = getEmbedding();
    const qEmb = await emb.generate(query);
    const all = await Promise.all(domains.map(async (d) => {
      ensureDomain(d, d === "global" ? "global" : "custom");
      const c = getDomainContainer(d);
      const hits = await c.vectorPort.search(qEmb, limit);
      return hits.filter((h) => h.meta?.type === "code").map((h) => ({ ...h, domain: d }));
    }));
    const merged = all.flat().sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, limit);
    return { context_recovered: merged.map((h, i) => ({ result_number: i + 1, file_path: h.meta?.path ?? "", relevance: `${((h.score ?? 0) * 100).toFixed(2)}%`, domain: h.domain, code_snippet: h.meta?.text ?? h.id })) };
  }
});
var audit_and_visualize_graph = tool({
  name: "audit_and_visualize_graph",
  description: "Cleans orphan nodes + structured tree report for active domain",
  inputSchema: { type: "object", properties: {} },
  execute: async () => {
    const ctx = resolveContext();
    const d = ctx.activeDomain;
    const c = getDomainContainer(d);
    const { relatorio, arvoreVisual } = c.graphPort.auditAndExportTree();
    const out = path6.join(getDomainDir(d), "auditoria_grafo.md");
    fs7.writeFileSync(out, `# Audit ${d}
${relatorio}
\`\`\`text
${arvoreVisual}
\`\`\``, "utf-8");
    return { domain: d, report: relatorio, visualization: arvoreVisual, path: out };
  }
});
var export_visual_graph_map = tool({
  name: "export_visual_graph_map",
  description: "Exports interactive 2D HTML map for active domain",
  inputSchema: { type: "object", properties: {} },
  execute: async () => {
    const ctx = resolveContext();
    const d = ctx.activeDomain;
    const c = getDomainContainer(d);
    const out = path6.join(getDomainDir(d), "mapa_interativo.html");
    c.graphPort.exportInteractiveHtml(out);
    return { status: "Success", domain: d, path: out };
  }
});
var reset_local_memory = tool({
  name: "reset_local_memory",
  description: "Deletes indexes for active domain (Vector + Graph) — requires confirm: true",
  inputSchema: { type: "object", properties: { confirm: { type: "boolean" } }, required: ["confirm"] },
  execute: async ({ confirm }) => {
    if (!confirm)
      return { error: "Not authorized." };
    const ctx = resolveContext();
    const d = ctx.activeDomain;
    const c = getDomainContainer(d);
    await c.vectorPort.clear();
    c.graphPort.clear();
    try {
      fs7.unlinkSync(manifestPath(d));
    } catch {}
    return { status: "Success", domain: d };
  }
});

// src/index.ts
var raggaiTools = [
  consult_memory_personal,
  memorize_personal_fact,
  import_markdown_notes,
  index_local_codebase,
  search_semantic_codebase,
  audit_and_visualize_graph,
  export_visual_graph_map,
  reset_local_memory
];
var src_default = Plugin.define({
  id: "raggai",
  async setup(ctx) {
    await ctx.tool.transform((editor) => {
      for (const raggaiTool of raggaiTools)
        editor.add(raggaiTool);
    });
    return () => {
      return;
    };
  }
});
export {
  audit_and_visualize_graph,
  consult_memory_personal,
  src_default as default,
  export_visual_graph_map,
  import_markdown_notes,
  index_local_codebase,
  memorize_personal_fact,
  reset_local_memory,
  search_semantic_codebase
};
