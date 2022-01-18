"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _uuid = require("uuid");

var _batchPromises = _interopRequireDefault(require("batch-promises"));

var _PersistentStore2 = _interopRequireDefault(require("./PersistentStore"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var ObserverStore = /*#__PURE__*/function (_PersistentStore) {
  _inherits(ObserverStore, _PersistentStore);

  var _super = _createSuper(ObserverStore);

  function ObserverStore(options) {
    var _this;

    _classCallCheck(this, ObserverStore);

    _this = _super.call(this, options);

    _defineProperty(_assertThisInitialized(_this), "subscribe", function (type, callback, filterFunction) {
      var subKey = (0, _uuid.v4)();

      if (!_this.__subscribed[type]) {
        _this.__subscribed[type] = {};
      }

      _this.find(type, filterFunction).then(function (data) {
        _this._subscribeToObjects(type, data, {
          callback: callback,
          filterFunction: filterFunction,
          subKey: subKey
        });

        return callback(data);
      });

      return subKey;
    });

    _defineProperty(_assertThisInitialized(_this), "unsubscribe", function (key) {
      for (var type in _this.__subscribed) {
        for (var id in _this.__subscribed[type]) {
          _this.__subscribed[type][id] = _this.__subscribed[type][id].filter(function (i) {
            return i.subKey !== key;
          });

          if (_this.__subscribed[type][id].length === 0) {
            delete _this.__subscribed[type][id];
          }
        }
      }
    });

    _defineProperty(_assertThisInitialized(_this), "_getUniqueSubs", function (objects, type) {
      var out = {};

      var _iterator = _createForOfIteratorHelper(objects),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var object = _step.value;
          var objectId = object.getId();
          var typeChannel = _this.__subscribed[type] || {};
          var subscribedToObject = typeChannel[objectId] || [];

          var _iterator2 = _createForOfIteratorHelper(subscribedToObject),
              _step2;

          try {
            for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
              var sub = _step2.value;
              out[sub.subKey] = out[sub.subKey] || sub;
            }
          } catch (err) {
            _iterator2.e(err);
          } finally {
            _iterator2.f();
          }
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }

      return Object.values(out);
    });

    _defineProperty(_assertThisInitialized(_this), "_propagateChange", function () {
      var objects = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

      if (objects.length) {
        var type = objects[0].getModel().getType();

        var uniqueSubs = _this._getUniqueSubs(objects, type);

        (0, _batchPromises["default"])(10, uniqueSubs, function (_ref) {
          var callback = _ref.callback,
              filterFunction = _ref.filterFunction;
          return _this.find(type, filterFunction).then(callback);
        });
      }
    });

    _defineProperty(_assertThisInitialized(_this), "_subscribeToObjects", function (type, objectsToSubscribe, item) {
      var _iterator3 = _createForOfIteratorHelper(objectsToSubscribe),
          _step3;

      try {
        for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
          var object = _step3.value;
          var id = object.getId();

          if (!_this.__subscribed[type][id]) {
            _this.__subscribed[type][id] = [];
          }

          _this.__subscribed[type][id].push(item);
        }
      } catch (err) {
        _iterator3.e(err);
      } finally {
        _iterator3.f();
      }
    });

    _defineProperty(_assertThisInitialized(_this), "_propagateInsertChange", function (type, newObjects) {
      var uniqueSubs = {};
      var objects = Object.values(_this.__subscribed[type]);

      for (var _i = 0, _objects = objects; _i < _objects.length; _i++) {
        var object = _objects[_i];

        var _iterator4 = _createForOfIteratorHelper(object),
            _step4;

        try {
          for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
            var sub = _step4.value;

            if (!uniqueSubs[sub.subKey]) {
              uniqueSubs[sub.subKey] = sub;
            }
          }
        } catch (err) {
          _iterator4.e(err);
        } finally {
          _iterator4.f();
        }
      }

      var possibleSubs = Object.values(uniqueSubs);
      (0, _batchPromises["default"])(10, possibleSubs, function (_ref2) {
        var callback = _ref2.callback,
            filterFunction = _ref2.filterFunction;
        var objectsToSubscribe = filterFunction ? newObjects.filter(filterFunction) : newObjects;

        if (objectsToSubscribe.length) {
          // Check if the new objects matter
          return _this.find(type, filterFunction).then(function (data) {
            var subKey;

            var _iterator5 = _createForOfIteratorHelper(data),
                _step5;

            try {
              for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
                var d = _step5.value;

                var item = _this.__subscribed[d.getModel().getType()][d.getId()];

                subKey = item ? item.subKey : null;
                if (subKey) break;
              }
            } catch (err) {
              _iterator5.e(err);
            } finally {
              _iterator5.f();
            }

            _this._subscribeToObjects(type, objectsToSubscribe, {
              callback: callback,
              filterFunction: filterFunction,
              subKey: subKey
            });

            return data;
          }).then(callback);
        }
      });
    });

    _defineProperty(_assertThisInitialized(_this), "trigger", function (event, objects) {
      switch (event) {
        case "insert":
          if (objects[0]) _this._propagateInsertChange(objects[0].getModel().getType(), objects);
          break;

        case "update":
          _this._propagateChange(objects);

          break;

        case "delete":
          _this._propagateChange(objects);

          break;
      }

      _this.delayedSave();
    });

    _this.__subscribed = {};
    return _this;
  }

  return _createClass(ObserverStore);
}(_PersistentStore2["default"]);

var _default = ObserverStore;
exports["default"] = _default;