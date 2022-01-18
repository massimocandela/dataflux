"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _modelHooksUtils = require("./modelHooksUtils");

var _batchPromises = _interopRequireDefault(require("batch-promises"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var Model = /*#__PURE__*/_createClass(function Model(name, options) {
  var _this = this;

  _classCallCheck(this, Model);

  _defineProperty(this, "_bulkOperation", function (objects, action) {
    if (_this.__singleItemQuery) {
      return (0, _batchPromises["default"])(_this.__batchSize, objects, action);
    } else {
      return action(objects);
    }
  });

  _defineProperty(this, "getType", function () {
    return _this.__type;
  });

  _defineProperty(this, "_toArray", function (data) {
    if (Array.isArray(data)) {
      return data;
    } else {
      _this.__singleItemQuery = true;
      return [data];
    }
  });

  _defineProperty(this, "retrieveAll", function () {
    return (0, _modelHooksUtils.executeHook)("retrieve", _this.__retrieveHook, null).then(_this._toArray);
  });

  _defineProperty(this, "insertObjects", function (objects) {
    return _this._bulkOperation(objects, _this._insertObjects);
  });

  _defineProperty(this, "updateObjects", function (objects) {
    return _this._bulkOperation(objects, _this._updateObjects);
  });

  _defineProperty(this, "deleteObjects", function (objects) {
    return _this._bulkOperation(objects, _this._deleteObjects);
  });

  _defineProperty(this, "_insertObjects", function (data) {
    return Promise.resolve(true);
    return (0, _modelHooksUtils.executeHook)("insert", _this.__insertHook, data).then(_this._toArray);
  });

  _defineProperty(this, "_updateObjects", function (data) {
    return Promise.resolve(true);
    return (0, _modelHooksUtils.executeHook)("update", _this.__updateHook, data).then(_this._toArray);
  });

  _defineProperty(this, "_deleteObjects", function (data) {
    return Promise.resolve(true);
    return (0, _modelHooksUtils.executeHook)("update", _this.__deleteHook, data).then(_this._toArray);
  });

  _defineProperty(this, "getStore", function () {
    return _this.store;
  });

  _defineProperty(this, "addRelationByField", function (model, localField) {
    var remoteField = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "id";

    var filterFunction = function filterFunction(parentObject, child) {
      return parentObject[localField] === child[remoteField];
    };

    return _this.addRelationByFilter(model, filterFunction);
  });

  _defineProperty(this, "addRelationByFilter", function (model, filterFunction) {
    var includedType = model.getType();
    _this.__includes[includedType] = filterFunction;
  });

  _defineProperty(this, "addRelation", function (model, param2, param3) {
    if (model) {
      _this.getStore().validateModel(model);

      if (typeof param2 === "string" && (!param3 || typeof param3 === "string")) {
        // explicit model, from, to
        return _this.addRelationByField(model, param2, param3);
      } else if (!param3 && typeof param2 === "function") {
        // explicit model, filterFunction
        return _this.addRelationByFilter(model, param2);
      } else if (!param2 && !param3) {
        // implicit model, from, to (it uses the type as local key and the id as remote key)
        return _this.addRelationByField(model, model.getType(), "id");
      } else {
        throw new Error("Invalid relation declaration");
      }
    } else {
      throw new Error("A relation needs a model");
    }
  });

  _defineProperty(this, "getRelation", function (parentObject, includedType, filterFunction) {
    var filterRelation = _this.__includes[includedType];

    if (filterRelation) {
      return _this.getStore().find(includedType, function (item) {
        return filterRelation(parentObject, item);
      }).then(function (data) {
        if (filterFunction) {
          return data.filter(filterFunction);
        }

        return data;
      });
    } else {
      return Promise.reject("The relation doesn't exist");
    }
  });

  this.__type = name;

  if (!name || !options) {
    throw new Error("A Model requires at least a name and a hook");
  }

  var _ref = _typeof(options) === "object" ? (0, _modelHooksUtils.getHooksFromOptions)(options) : (0, _modelHooksUtils.getHooksFromUrl)(options),
      _ref2 = _slicedToArray(_ref, 4),
      retrieveHook = _ref2[0],
      insertHook = _ref2[1],
      updateHook = _ref2[2],
      deleteHook = _ref2[3];

  this.__retrieveHook = retrieveHook;
  this.__updateHook = updateHook;
  this.__insertHook = insertHook;
  this.__deleteHook = deleteHook;
  this.__singleItemQuery = false; // By default use arrays

  this.__batchSize = 4; // For HTTP requests in parallel if your API doesn't support multiple resources

  this.__includes = {};
});

exports["default"] = Model;