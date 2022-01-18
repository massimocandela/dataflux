"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _StoreObject = _interopRequireDefault(require("./StoreObject"));

var _fingerprint = _interopRequireDefault(require("./fingerprint"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var Store = /*#__PURE__*/_createClass(function Store() {
  var _this = this;

  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  _classCallCheck(this, Store);

  _defineProperty(this, "validateModel", function (model) {
    var type = model.getType();

    if (typeof type !== "string" || type === "") {
      throw new Error("Not valid model object: type missing");
    }
  });

  _defineProperty(this, "addModel", function (model) {
    _this.validateModel(model);

    var type = model.getType();

    if (!_this.models[type]) {
      _this.models[type] = {
        model: model,
        storedObjects: {}
      };
      model.store = _this;

      if (!_this.options.lazyLoad) {
        _this._loadObjects(type);
      }
    } else {
      throw new Error("The model already exists");
    }
  });

  _defineProperty(this, "_getPromise", function (type) {
    if (!_this.models[type]) {
      return Promise.reject("The model doesn't exist");
    } else if (!_this.models[type].promise && !_this.options.lazyLoad) {
      return Promise.reject("The model is not loaded");
    } else if (!_this.models[type].promise && _this.options.lazyLoad) {
      return _this._loadObjects(type).then(function () {
        return _this.models[type].promise;
      });
    } else {
      return _this.models[type].promise;
    }
  });

  _defineProperty(this, "_insertObject", function (type, item) {
    var markAsNew = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    var model = _this.models[type].model;
    var wrapper = new _StoreObject["default"](item, model);
    var id = wrapper.getId();

    if (_this.models[type].storedObjects[id]) {
      throw new Error("The IDs provided for the model ".concat(type, " are not unique"));
    }

    _this.models[type].storedObjects[id] = {
      id: id,
      fingerprint: wrapper.getFingerprint(),
      object: wrapper,
      status: markAsNew ? "new" : "old"
    };
    return wrapper;
  });

  _defineProperty(this, "_loadObjects", function (type) {
    var item = _this.models[type];
    return item.promise = item.model.retrieveAll().then(function (items) {
      var _iterator = _createForOfIteratorHelper(items),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var _item = _step.value;

          _this._insertObject(type, _item, false);
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
    });
  });

  _defineProperty(this, "get", function (type, id) {
    return _this._getPromise(type).then(function () {
      try {
        _this.models[type].storedObjects[id].object;
      } catch (error) {
        return Promise.reject("Object not found");
      }
    });
  });

  _defineProperty(this, "find", function (type, filterFunction) {
    return _this._getPromise(type).then(function () {
      var all = Object.values(_this.models[type].storedObjects).filter(function (i) {
        return i.status !== "deleted";
      }).map(function (i) {
        return i.object;
      });
      return filterFunction ? all.filter(filterFunction) : all;
    });
  });

  _defineProperty(this, "_deleteByObject", function (object) {
    return _this._deleteByFilter(object.getType(), function (item) {
      return (0, _fingerprint["default"])(object) === (0, _fingerprint["default"])(item);
    });
  });

  _defineProperty(this, "_deleteByFilter", function (type, filterFunction) {
    return _this._getPromise(type).then(function () {
      var deleted = Object.values(_this.models[type].storedObjects).filter(function (i) {
        return filterFunction(i.object);
      });

      var _iterator2 = _createForOfIteratorHelper(deleted),
          _step2;

      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var object = _step2.value;
          object.status = "deleted";
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }

      _this.trigger("delete", deleted.map(function (i) {
        return i.object;
      }));

      return true;
    });
  });

  _defineProperty(this, "delete", function (typeOrObjects, filterFunction) {
    if (typeof typeOrObjects === "string" && typeof filterFunction === "function") {
      return _this._deleteByFilter(typeOrObjects, filterFunction);
    } else if (_typeof(typeOrObjects) === "object" && typeOrObjects.length) {
      return Promise.all(typeOrObjects.map(_this._deleteByObject));
    } else {
      throw new Error("Invalid delete request. You have to provide a list of objects or a type and a filter function");
    }
  });

  _defineProperty(this, "insert", function (type, object) {
    return _this._getPromise(type).then(function () {
      var newObj = _this._insertObject(type, object, true);

      _this.trigger("insert", [newObj]);

      return true;
    });
  });

  _defineProperty(this, "update", function (objects) {
    _this.trigger("update", objects);
  });

  _defineProperty(this, "trigger", function (event, objects) {// Nothing here
  });

  this.options = {
    autoSave: options.autoSave || 3000,
    saveDelay: options.autoSave || 1000,
    lazyLoad: options.lazyLoad || false
  };
  this.models = {};
});

exports["default"] = Store;