"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _Store2 = _interopRequireDefault(require("./Store"));

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

var PersistentStore = /*#__PURE__*/function (_Store) {
  _inherits(PersistentStore, _Store);

  var _super = _createSuper(PersistentStore);

  function PersistentStore(options) {
    var _this;

    _classCallCheck(this, PersistentStore);

    _this = _super.call(this, options);

    _defineProperty(_assertThisInitialized(_this), "_saveType", function (type) {
      return _this._getSets(type).then(function (_ref) {
        var inserted = _ref.inserted,
            updated = _ref.updated,
            deleted = _ref.deleted;
        return _this.models[type].model.insertObjects(inserted).then(function () {
          return _this.models[type].model.updateObjects(updated);
        }).then(function () {
          return _this.models[type].model.deleteObjects(deleted);
        }).then(function () {
          var _iterator = _createForOfIteratorHelper(deleted),
              _step;

          try {
            for (_iterator.s(); !(_step = _iterator.n()).done;) {
              var object = _step.value;
              delete _this.models[type].storedObjects[object.id];
            }
          } catch (err) {
            _iterator.e(err);
          } finally {
            _iterator.f();
          }

          var _iterator2 = _createForOfIteratorHelper(updated.concat(inserted)),
              _step2;

          try {
            for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
              var _object = _step2.value;
              _this.models[type].storedObjects[_object.id].fingerprint = _object.object.getFingerprint();
              _this.models[type].storedObjects[_object.id].status = "old";
            }
          } catch (err) {
            _iterator2.e(err);
          } finally {
            _iterator2.f();
          }
        });
      });
    });

    _defineProperty(_assertThisInitialized(_this), "_getSets", function (type) {
      return _this._getPromise(type).then(function () {
        var objects = Object.values(_this.models[type].storedObjects);
        var newObjects = objects.filter(function (object) {
          return object.status === "new";
        });
        var edited = objects.filter(function (object) {
          return object.status === "old" && object.fingerprint !== object.object.getFingerprint();
        });
        var deleted = objects.filter(function (object) {
          return object.status === "deleted";
        });
        return {
          inserted: newObjects,
          updates: edited,
          deleted: deleted
        };
      });
    });

    _defineProperty(_assertThisInitialized(_this), "save", function () {
      return Promise.all(Object.keys(_this.models).map(_this._saveType));
    });

    _defineProperty(_assertThisInitialized(_this), "delayedSave", function () {
      if (_this.options.autoSave) {
        if (_this.__delayedSaveTimer) {
          clearTimeout(_this.__delayedSaveTimer);
        }

        _this.__delayedSaveTimer = setTimeout(_this.save, _this.options.saveDelay);
      }

      return Promise.resolve();
    });

    _defineProperty(_assertThisInitialized(_this), "trigger", function (event, objects) {
      if (["insert", "delete", "update"].includes(event)) {
        _this.delayedSave();
      }
    });

    if (typeof _this.options.autoSave === "number") {
      setInterval(_this.delayedSave, _this.options.autoSave);
    }

    return _this;
  }

  return _createClass(PersistentStore);
}(_Store2["default"]);

exports["default"] = PersistentStore;