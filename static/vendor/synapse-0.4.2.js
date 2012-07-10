

(function(root, factory) {
  if (typeof exports !== 'undefined') {
    return factory(root, exports);
  } else if (typeof define === 'function' && define.amd) {
    return define('synapse/core', ['exports'], function(exports) {
      return factory(root, exports);
    });
  } else {
    return root.SynapseCore = factory(root, {});
  }
})(this, function(root, core) {
  var channels;
  channels = {};
  return {
    toString: Object.prototype.toString,
    getType: function(object) {
      return this.toString.call(object).match(/^\[object\s(.*)\]$/)[1];
    },
    isObject: function(object) {
      return this.getType(object) === 'Object';
    },
    isArray: function(object) {
      return this.getType(object) === 'Array';
    },
    isFunction: function(object) {
      return this.getType(object) === 'Function';
    },
    isString: function(object) {
      return this.getType(object) === 'String';
    },
    isBoolean: function(object) {
      return this.getType(object) === 'Boolean';
    }
  };
});

var __slice = Array.prototype.slice;

(function(root, factory) {
  if (typeof exports !== 'undefined') {
    return factory(root, exports, require('synapse/core'));
  } else if (typeof define === 'function' && define.amd) {
    return define('synapse', ['synapse/core', 'exports'], function(core, exports) {
      return factory(root, exports, core);
    });
  } else {
    return root.Synapse = factory(root, {}, root.SynapseCore);
  }
})(this, function(root, Synapse, core) {
  var connect, connectOne, defaultConnectOptions, detectEvent, detectInterface, detectOtherInterface, limitedApi, objectGuid, offEvent, onEvent, synapseHooks, synapseObjects, triggerEvent;
  objectGuid = 1;
  synapseObjects = {};
  synapseHooks = [];
  limitedApi = ['observe', 'notify', 'syncWith', 'stopObserving', 'pauseObserving', 'resumeObserving', 'stopNotifying', 'pauseNotifying', 'resumeNotifying'];
  Synapse = (function() {

    Synapse.prototype.version = '0.4.2';

    function Synapse(object) {
      var hook, method, raw, wrapped, _fn, _i, _j, _len, _len2,
        _this = this;
      if (object instanceof Synapse) return object;
      if (this.constructor !== Synapse) {
        wrapped = new Synapse(object);
        raw = wrapped.raw;
        _fn = function(method) {
          return raw[method] = function() {
            wrapped[method].apply(wrapped, arguments);
            return this;
          };
        };
        for (_i = 0, _len = limitedApi.length; _i < _len; _i++) {
          method = limitedApi[_i];
          _fn(method);
        }
        return raw;
      }
      for (_j = 0, _len2 = synapseHooks.length; _j < _len2; _j++) {
        hook = synapseHooks[_j];
        if (hook.checkObjectType(object)) break;
        hook = null;
      }
      if (!hook) {
        throw new Error("No hook exists for " + (core.getType(object)) + " types");
      }
      this.raw = (typeof hook.coerceObject === "function" ? hook.coerceObject(object) : void 0) || object;
      this.hook = hook;
      this.guid = objectGuid++;
      this._observing = {};
      this._notifying = {};
      synapseObjects[this.guid] = this;
    }

    Synapse.prototype.get = function() {
      var _ref;
      return (_ref = this.hook).getHandler.apply(_ref, [this.raw].concat(__slice.call(arguments)));
    };

    Synapse.prototype.set = function() {
      var _ref;
      (_ref = this.hook).setHandler.apply(_ref, [this.raw].concat(__slice.call(arguments)));
      return this;
    };

    Synapse.prototype.observe = function() {
      var args, other;
      other = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      other = new Synapse(other);
      connect.apply(null, [other, this].concat(__slice.call(args)));
      return this;
    };

    Synapse.prototype.notify = function() {
      var args, other;
      other = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      other = new Synapse(other);
      connect.apply(null, [this, other].concat(__slice.call(args)));
      return this;
    };

    Synapse.prototype.syncWith = function(other) {
      other = new Synapse(other);
      this.observe(other).notify(other);
      return this;
    };

    Synapse.prototype.stopObserving = function(other) {
      var channels, observerInterface, subject, subjectGuid, thread;
      if (!other) {
        for (subjectGuid in this._observing) {
          channels = this._observing[subjectGuid];
          subject = synapseObjects[subjectGuid];
          for (observerInterface in channels) {
            thread = channels[observerInterface];
            offEvent(subject, thread.event, thread.handler);
          }
          this._observing = {
            _open: true
          };
        }
      } else {
        channels = this._observing[other.guid];
        for (observerInterface in channels) {
          thread = channels[observerInterface];
          offEvent(other, thread.event, thread.handler);
        }
        this._observing[other.guid] = {
          _open: true
        };
      }
      return this;
    };

    Synapse.prototype.pauseObserving = function(other) {
      var channels, subjectGuid;
      if (!other) {
        for (subjectGuid in this._observing) {
          channels = this._observing[subjectGuid];
          channels._open = false;
        }
      } else {
        channels = this._observing[other.guid];
        channels._open = false;
      }
      return this;
    };

    Synapse.prototype.resumeObserving = function(other) {
      var channels, subjectGuid;
      if (other) {
        if ((channels = this._observing[other.guid])) channels._open = true;
      } else {
        for (subjectGuid in this._observing) {
          this._observing[subjectGuid]._open = true;
        }
      }
      return this;
    };

    Synapse.prototype.stopNotifying = function(other) {
      var channels, observer, observerGuid, observerInterface, thread;
      if (!other) {
        for (observerGuid in this._notifying) {
          channels = this._notifying[observerGuid];
          observer = synapseObjects[observerGuid];
          for (observerInterface in channels) {
            thread = channels[observerInterface];
            offEvent(this, thread.event, thread.handler);
          }
          this._notifying = {
            _open: true
          };
        }
      } else {
        channels = this._notifying[other.guid];
        for (observerInterface in channels) {
          thread = channels[observerInterface];
          offEvent(this, thread.event, thread.handler);
        }
        this._notifying[other.guid] = {
          _open: true
        };
      }
      return this;
    };

    Synapse.prototype.pauseNotifying = function(other) {
      var channels, observerGuid;
      if (!other) {
        for (observerGuid in this._notifying) {
          channels = this._notifying[observerGuid];
          channels._open = false;
        }
      } else {
        channels = this._notifying[other.guid];
        channels._open = false;
      }
      return this;
    };

    Synapse.prototype.resumeNotifying = function(other) {
      var channels, observerGuid;
      if (other) {
        if ((channels = this._notifying[other.guid])) channels._open = true;
      } else {
        for (observerGuid in this._notifying) {
          this._notifying[observerGuid]._open = true;
        }
      }
      return this;
    };

    return Synapse;

  })();
  Synapse.addHooks = function() {
    return synapseHooks.push.apply(synapseHooks, arguments);
  };
  Synapse.clearHooks = function() {
    return synapseHooks = [];
  };
  detectEvent = function() {
    var args, object, value, _ref;
    object = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    if ((value = (_ref = object.hook).detectEvent.apply(_ref, [object.raw].concat(__slice.call(args))))) {
      return value;
    }
    throw new Error("" + object.hook.typeName + " types do not support events");
  };
  onEvent = function() {
    var args, object, value, _base;
    object = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    if ((value = typeof (_base = object.hook).onEventHandler === "function" ? _base.onEventHandler.apply(_base, [object.raw].concat(__slice.call(args))) : void 0)) {
      return object;
    }
    throw new Error("" + object.hook.typeName + " types do not support events");
  };
  offEvent = function() {
    var args, object, value, _base;
    object = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    if ((value = typeof (_base = object.hook).offEventHandler === "function" ? _base.offEventHandler.apply(_base, [object.raw].concat(__slice.call(args))) : void 0)) {
      return object;
    }
    throw new Error("" + object.hook.typeName + " types do not support events");
  };
  triggerEvent = function() {
    var args, object, value, _base;
    object = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    if ((value = typeof (_base = object.hook).triggerEventHandler === "function" ? _base.triggerEventHandler.apply(_base, [object.raw].concat(__slice.call(args))) : void 0)) {
      return object;
    }
    throw new Error("" + object.hook.typeName + " types do not support events");
  };
  detectInterface = function(object) {
    var _base;
    return typeof (_base = object.hook).detectInterface === "function" ? _base.detectInterface(object.raw) : void 0;
  };
  detectOtherInterface = function(object) {
    var _base;
    return typeof (_base = object.hook).detectOtherInterface === "function" ? _base.detectOtherInterface(object.raw) : void 0;
  };
  defaultConnectOptions = {
    event: null,
    subjectInterface: null,
    observerInterface: null,
    converter: null,
    triggerOnBind: true
  };
  connectOne = function(subject, observer, options) {
    var channel, converter, event, events, handler, key, observerChannels, observerInterface, subjectChannels, subjectInterface, triggerOnBind, value, _i, _len;
    for (key in defaultConnectOptions) {
      value = defaultConnectOptions[key];
      if (!(options[key] != null)) options[key] = value;
    }
    if ((converter = options.converter) && !core.isFunction(converter)) {
      converter = observer.object[converter];
    }
    if (!(subjectInterface = options.subjectInterface)) {
      if (!(subjectInterface = detectInterface(subject) || detectOtherInterface(observer)) && !converter) {
        throw new Error("An interface for " + subject.hook.typeName + " objects could not be detected");
      }
    }
    if (!(observerInterface = options.observerInterface)) {
      if (!(observerInterface = detectInterface(observer) || detectOtherInterface(subject))) {
        throw new Error("An interface for " + observer.hook.typeName + " objects could not be detected");
      }
    }
    if (!(events = options.event)) events = detectEvent(subject, subjectInterface);
    if (!core.isArray(events)) events = [events];
    triggerOnBind = options.triggerOnBind;
    for (_i = 0, _len = events.length; _i < _len; _i++) {
      event = events[_i];
      handler = function() {
        if (observer._observing[subject.guid]._open === true && subject._notifying[observer.guid]._open === true) {
          value = subject.get(subjectInterface);
          if (converter) value = converter(value);
          return observer.set(observerInterface, value);
        }
      };
      if (!(observerChannels = observer._observing[subject.guid])) {
        observerChannels = observer._observing[subject.guid] = {
          _open: true
        };
      }
      if (!(subjectChannels = subject._notifying[observer.guid])) {
        subjectChannels = subject._notifying[observer.guid] = {
          _open: true
        };
      }
      channel = {
        event: event,
        handler: handler
      };
      observerChannels[observerInterface] = channel;
      subjectChannels[observerInterface] = channel;
      onEvent(subject, event, handler);
      if (triggerOnBind) triggerEvent(subject, event);
    }
  };
  connect = function() {
    var arg0, arg1, args, observer, opt, options, subject, _i, _len;
    subject = arguments[0], observer = arguments[1], args = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
    options = args;
    arg0 = args[0];
    arg1 = args[1];
    if (core.isFunction(arg0)) {
      options = {
        converter: arg0
      };
    } else if (core.isArray(arg0) || !core.isObject(arg0)) {
      options = {
        subjectInterface: arg0,
        observerInterface: arg1
      };
    }
    if (!core.isArray(options)) options = [options];
    for (_i = 0, _len = options.length; _i < _len; _i++) {
      opt = options[_i];
      connectOne(subject, observer, opt);
    }
  };
  return Synapse;
});


(function(root, factory) {
  if (typeof exports !== 'undefined') {
    return factory(root, exports, require('synapse/core'));
  } else if (typeof define === 'function' && define.amd) {
    return define('synapse/hooks/object', ['synapse/core', 'exports'], function(core, exports) {
      return factory(root, exports, core);
    });
  } else {
    return root.ObjectHook = factory(root, {}, root.SynapseCore);
  }
})(this, function(root, ObjectHook, core) {
  return {
    typeName: 'Plain Object',
    checkObjectType: function(object) {
      return core.isObject(object);
    },
    getHandler: function(object, key) {
      if (core.isFunction(object[key])) {
        return object[key]();
      } else {
        return object[key];
      }
    },
    setHandler: function(object, key, value) {
      if (core.isFunction(object[key])) {
        return object[key](value);
      } else {
        return object[key] = value;
      }
    }
  };
});

var __slice = Array.prototype.slice;

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    return define('synapse/hooks/jquery', ['synapse/core', 'jquery', 'exports'], function(core, $, exports) {
      return factory(root, exports, core, $);
    });
  } else if (typeof exports === 'undefined') {
    return root.jQueryHook = factory(root, {}, root.SynapseCore, root.jQuery);
  }
})(this, function(root, jQueryHook, core, $) {
  var domEvents, elementBindAttributes, elementInterfaces, interfaces;
  interfaces = (function() {
    return {
      registry: {},
      register: function(config) {
        return this.registry[config.name] = config;
      },
      unregister: function(name) {
        return delete this.registry[name];
      },
      get: function() {
        var args, iface, key, name, object, _ref;
        object = arguments[0], name = arguments[1], args = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
        _ref = name.split('.'), name = _ref[0], key = _ref[1];
        if (key != null) args = [key].concat(args);
        if ((iface = this.registry[name])) return iface.get.apply(object, args);
      },
      set: function() {
        var args, iface, key, name, object, _ref;
        object = arguments[0], name = arguments[1], args = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
        _ref = name.split('.'), name = _ref[0], key = _ref[1];
        if (key != null) args = [key].concat(args);
        if ((iface = this.registry[name])) return iface.set.apply(object, args);
      }
    };
  })();
  (function() {
    var getAttribute, getCss, getProperty, setAttribute, setCss, setProperty;
    getProperty = function(key) {
      if (this.prop != null) return this.prop(key);
      return getAttribute.call(this, key);
    };
    setProperty = function(key, value) {
      if (this.prop != null) {
        if (typeof key === 'object') return this.prop(key);
        return this.prop(key, value);
      }
      return setAttribute.call(this, key, value);
    };
    getAttribute = function(key) {
      return this.attr(key);
    };
    setAttribute = function(key, value) {
      if (core.isObject(key)) {
        return this.attr(key);
      } else {
        return this.attr(key, value);
      }
    };
    getCss = function(key) {
      return this.css(key);
    };
    setCss = function(key, value) {
      if (core.isObject(key)) {
        return this.css(key);
      } else {
        return this.css(key, value);
      }
    };
    interfaces.register({
      name: 'text',
      get: function() {
        return this.text();
      },
      set: function(value) {
        return this.text((value != null ? value : '').toString());
      }
    });
    interfaces.register({
      name: 'html',
      get: function() {
        return this.html();
      },
      set: function(value) {
        return this.html((value != null ? value : '').toString());
      }
    });
    interfaces.register({
      name: 'value',
      get: function() {
        return this.val();
      },
      set: function(value) {
        return this.val(value != null ? value : '');
      }
    });
    interfaces.register({
      name: 'enabled',
      get: function() {
        return !getProperty.call(this, 'disabled');
      },
      set: function(value) {
        if (core.isArray(value) && value.length === 0) value = false;
        return setProperty.call(this, 'disabled', !Boolean(value));
      }
    });
    interfaces.register({
      name: 'disabled',
      get: function() {
        return getProperty.call(this, 'disabled');
      },
      set: function(value) {
        if (core.isArray(value) && value.length === 0) value = false;
        return setProperty.call(this, 'disabled', Boolean(value));
      }
    });
    interfaces.register({
      name: 'checked',
      get: function() {
        return getProperty.call(this, 'checked');
      },
      set: function(value) {
        if (core.isArray(value) && value.length === 0) value = false;
        return setProperty.call(this, 'checked', Boolean(value));
      }
    });
    interfaces.register({
      name: 'visible',
      get: function() {
        return getCss.call(this, 'display') === !'none';
      },
      set: function(value) {
        if (core.isArray(value) && value.length === 0) value = false;
        if (Boolean(value)) {
          return this.show();
        } else {
          return this.hide();
        }
      }
    });
    interfaces.register({
      name: 'hidden',
      get: function() {
        return getCss.call(this, 'display') === 'none';
      },
      set: function(value) {
        if (core.isArray(value) && value.length === 0) value = false;
        if (Boolean(value)) {
          return this.hide();
        } else {
          return this.show();
        }
      }
    });
    interfaces.register({
      name: 'prop',
      get: function(key) {
        return getProperty.call(this, key);
      },
      set: function(key, value) {
        return setProperty.call(this, key, value);
      }
    });
    interfaces.register({
      name: 'attr',
      get: function(key) {
        return getAttribute.call(this, key);
      },
      set: function(key, value) {
        return setAttribute.call(this, key, value);
      }
    });
    interfaces.register({
      name: 'css',
      get: function(key) {
        return getCss.call(this, key);
      },
      set: function(key, value) {
        return setCss.call(this, key, value);
      }
    });
    interfaces.register({
      name: 'data',
      get: function(key) {
        return this.data(key);
      },
      set: function(key, value) {
        return this.data(key, value);
      }
    });
    return interfaces.register({
      name: 'class',
      get: function(key) {
        return this.hasClass(key);
      },
      set: function(key, value) {
        return this.toggleClass(key, Boolean(value));
      }
    });
  })();
  domEvents = [['a,button,[type=button],[type=reset]', 'click'], ['select,[type=checkbox],[type=radio],textarea', 'change'], ['[type=submit]', 'submit'], ['input', 'keyup']];
  elementInterfaces = [['[type=checkbox],[type=radio]', 'checked'], ['input,textarea,select', 'value']];
  elementBindAttributes = ['name', 'role', 'data-bind'];
  return {
    typeName: 'jQuery',
    domEvents: domEvents,
    elementBindAttributes: elementBindAttributes,
    elementInterfaces: elementInterfaces,
    interfaces: interfaces,
    checkObjectType: function(object) {
      return object instanceof $ || object.nodeType === 1 || core.isString(object);
    },
    coerceObject: function(object) {
      return $(object);
    },
    getHandler: function(object, key) {
      var value;
      value = interfaces.get(object, key);
      if (value && object.is('[type=number]')) {
        if (value.indexOf('.') > -1) {
          return parseFloat(value);
        } else {
          return parseInt(value);
        }
      }
      return value;
    },
    setHandler: function(object, key, value) {
      return interfaces.set(object, key, value);
    },
    onEventHandler: function(object, event, handler) {
      return object.bind(event, handler);
    },
    offEventHandler: function(object, event, handler) {
      return object.unbind(event, handler);
    },
    triggerEventHandler: function(object, event) {
      return object.trigger(event);
    },
    detectEvent: function(object) {
      var event, item, selector, _i, _len;
      for (_i = 0, _len = domEvents.length; _i < _len; _i++) {
        item = domEvents[_i];
        selector = item[0], event = item[1];
        if (object.is(selector)) return event;
      }
    },
    detectInterface: function(object) {
      var iface, item, selector, _i, _len;
      for (_i = 0, _len = elementInterfaces.length; _i < _len; _i++) {
        item = elementInterfaces[_i];
        selector = item[0], iface = item[1];
        if (object.is(selector)) return iface;
      }
      return 'text';
    },
    detectOtherInterface: function(object) {
      var attr, value, _i, _len;
      for (_i = 0, _len = elementBindAttributes.length; _i < _len; _i++) {
        attr = elementBindAttributes[_i];
        if ((value = object.attr(attr))) return value;
      }
    }
  };
});


(function(root, factory) {
  if (typeof exports !== 'undefined') {
    return factory(root, exports, require('synapse/core'), require('backbone'));
  } else if (typeof define === 'function' && define.amd) {
    return define('synapse/hooks/backbone-model', ['synapse/core', 'backbone', 'exports'], function(core, Backbone, exports) {
      return factory(root, exports, core, Backbone);
    });
  } else {
    return root.BackboneModelHook = factory(root, {}, root.SynapseCore, root.Backbone);
  }
})(this, function(root, BackboneModelHook, core) {
  return {
    typeName: 'Backbone Model',
    checkObjectType: function(object) {
      return object instanceof Backbone.Model;
    },
    getHandler: function(object, key) {
      if (core.isFunction(object[key])) {
        return object[key]();
      } else {
        return object.get(key);
      }
    },
    setHandler: function(object, key, value) {
      var attrs;
      if (core.isFunction(object[key])) {
        return object[key](value);
      } else {
        attrs = {};
        attrs[key] = value;
        return object.set(attrs);
      }
    },
    onEventHandler: function(object, event, handler) {
      return object.bind(event, handler);
    },
    offEventHandler: function(object, event, handler) {
      return object.unbind(event, handler);
    },
    triggerEventHandler: function(object, event) {
      return object.trigger(event);
    },
    detectEvent: function(object, iface) {
      if (iface && !object[iface]) return "change:" + iface;
      return 'change';
    }
  };
});

var __slice = Array.prototype.slice;

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    return define('synapse/hooks/backbone-view', ['synapse/core', 'backbone', 'exports'], function(core, Backbone, exports) {
      return factory(root, exports, core, Backbone);
    });
  } else if (typeof exports === 'undefined') {
    return root.BackboneViewHook = factory(root, {}, root.SynapseCore, root.Backbone);
  }
})(this, function(root, BackboneViewHook, core) {
  var domEvents, elementBindAttributes, elementInterfaces, interfaces;
  interfaces = (function() {
    return {
      registry: {},
      register: function(config) {
        return this.registry[config.name] = config;
      },
      unregister: function(name) {
        return delete this.registry[name];
      },
      get: function() {
        var args, iface, key, name, object, _ref;
        object = arguments[0], name = arguments[1], args = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
        _ref = name.split('.'), name = _ref[0], key = _ref[1];
        if (key != null) args = [key].concat(args);
        if ((iface = this.registry[name])) return iface.get.apply(object, args);
      },
      set: function() {
        var args, iface, key, name, object, _ref;
        object = arguments[0], name = arguments[1], args = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
        _ref = name.split('.'), name = _ref[0], key = _ref[1];
        if (key != null) args = [key].concat(args);
        if ((iface = this.registry[name])) return iface.set.apply(object, args);
      }
    };
  })();
  (function() {
    var getAttribute, getCss, getProperty, setAttribute, setCss, setProperty;
    getProperty = function(key) {
      if (this.prop != null) return this.prop(key);
      return getAttribute.call(this, key);
    };
    setProperty = function(key, value) {
      if (this.prop != null) {
        if (typeof key === 'object') return this.prop(key);
        return this.prop(key, value);
      }
      return setAttribute.call(this, key, value);
    };
    getAttribute = function(key) {
      return this.attr(key);
    };
    setAttribute = function(key, value) {
      if (core.isObject(key)) {
        return this.attr(key);
      } else {
        return this.attr(key, value);
      }
    };
    getCss = function(key) {
      return this.css(key);
    };
    setCss = function(key, value) {
      if (core.isObject(key)) {
        return this.css(key);
      } else {
        return this.css(key, value);
      }
    };
    interfaces.register({
      name: 'text',
      get: function() {
        return this.text();
      },
      set: function(value) {
        return this.text((value != null ? value : '').toString());
      }
    });
    interfaces.register({
      name: 'html',
      get: function() {
        return this.html();
      },
      set: function(value) {
        return this.html((value != null ? value : '').toString());
      }
    });
    interfaces.register({
      name: 'value',
      get: function() {
        return this.val();
      },
      set: function(value) {
        return this.val(value != null ? value : '');
      }
    });
    interfaces.register({
      name: 'enabled',
      get: function() {
        return !getProperty.call(this, 'disabled');
      },
      set: function(value) {
        if (core.isArray(value) && value.length === 0) value = false;
        return setProperty.call(this, 'disabled', !Boolean(value));
      }
    });
    interfaces.register({
      name: 'disabled',
      get: function() {
        return getProperty.call(this, 'disabled');
      },
      set: function(value) {
        if (core.isArray(value) && value.length === 0) value = false;
        return setProperty.call(this, 'disabled', Boolean(value));
      }
    });
    interfaces.register({
      name: 'checked',
      get: function() {
        return getProperty.call(this, 'checked');
      },
      set: function(value) {
        if (core.isArray(value) && value.length === 0) value = false;
        return setProperty.call(this, 'checked', Boolean(value));
      }
    });
    interfaces.register({
      name: 'visible',
      get: function() {
        return getCss.call(this, 'display') === !'none';
      },
      set: function(value) {
        if (core.isArray(value) && value.length === 0) value = false;
        if (Boolean(value)) {
          return this.show();
        } else {
          return this.hide();
        }
      }
    });
    interfaces.register({
      name: 'hidden',
      get: function() {
        return getCss.call(this, 'display') === 'none';
      },
      set: function(value) {
        if (core.isArray(value) && value.length === 0) value = false;
        if (Boolean(value)) {
          return this.hide();
        } else {
          return this.show();
        }
      }
    });
    interfaces.register({
      name: 'prop',
      get: function(key) {
        return getProperty.call(this, key);
      },
      set: function(key, value) {
        return setProperty.call(this, key, value);
      }
    });
    interfaces.register({
      name: 'attr',
      get: function(key) {
        return getAttribute.call(this, key);
      },
      set: function(key, value) {
        return setAttribute.call(this, key, value);
      }
    });
    interfaces.register({
      name: 'css',
      get: function(key) {
        return getCss.call(this, key);
      },
      set: function(key, value) {
        return setCss.call(this, key, value);
      }
    });
    interfaces.register({
      name: 'data',
      get: function(key) {
        return this.data(key);
      },
      set: function(key, value) {
        return this.data(key, value);
      }
    });
    return interfaces.register({
      name: 'class',
      get: function(key) {
        return this.hasClass(key);
      },
      set: function(key, value) {
        return this.toggleClass(key, Boolean(value));
      }
    });
  })();
  domEvents = [['a,button,[type=button],[type=reset]', 'click'], ['select,[type=checkbox],[type=radio],textarea', 'change'], ['[type=submit]', 'submit'], ['input', 'keyup']];
  elementInterfaces = [['[type=checkbox],[type=radio]', 'checked'], ['input,textarea,select', 'value']];
  elementBindAttributes = ['name', 'role', 'data-bind'];
  return {
    typeName: 'Backbone View',
    domEvents: domEvents,
    elementBindAttributes: elementBindAttributes,
    elementInterfaces: elementInterfaces,
    interfaces: interfaces,
    checkObjectType: function(object) {
      return object instanceof Backbone.View;
    },
    getHandler: function(object, key) {
      var el, value;
      el = object.$(object.el);
      if (core.isFunction(object[key])) {
        value = object[key]();
      } else {
        value = interfaces.get(el, key);
      }
      if (value && el.is('[type=number]')) {
        if (value.indexOf('.') > -1) {
          return parseFloat(value);
        } else {
          return parseInt(value);
        }
      }
      return value;
    },
    setHandler: function(object, key, value) {
      if (core.isFunction(object[key])) return object[key](value);
      return interfaces.set(object.$(object.el), key, value);
    },
    onEventHandler: function(object, event, handler) {
      return object.$(object.el).bind(event, handler);
    },
    offEventHandler: function(object, event, handler) {
      return object.$(object.el).unbind(event, handler);
    },
    triggerEventHandler: function(object, event) {
      return object.$(object.el).trigger(event);
    },
    detectEvent: function(object) {
      var el, event, item, selector, _i, _len;
      el = object.$(object.el);
      for (_i = 0, _len = domEvents.length; _i < _len; _i++) {
        item = domEvents[_i];
        selector = item[0], event = item[1];
        if (el.is(selector)) return event;
      }
    },
    detectInterface: function(object) {
      var el, iface, item, selector, _i, _len;
      el = object.$(object.el);
      for (_i = 0, _len = elementInterfaces.length; _i < _len; _i++) {
        item = elementInterfaces[_i];
        selector = item[0], iface = item[1];
        if (el.is(selector)) return iface;
      }
      return 'text';
    },
    detectOtherInterface: function(object) {
      var attr, el, value, _i, _len;
      el = object.$(object.el);
      for (_i = 0, _len = elementBindAttributes.length; _i < _len; _i++) {
        attr = elementBindAttributes[_i];
        if ((value = el.attr(attr))) return value;
      }
    }
  };
});
