"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _fingerprint = _interopRequireDefault(require("./fingerprint"));

var _uuid = require("uuid");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var Obj = /*#__PURE__*/_createClass(function Obj(values, model) {
  var _this = this;

  _classCallCheck(this, Obj);

  _defineProperty(this, "getFingerprint", function () {
    return (0, _fingerprint["default"])(_this.toJson());
  });

  _defineProperty(this, "get", function (attribute) {
    return _this[attribute];
  });

  _defineProperty(this, "getRelation", function (type, filterFunction) {
    return _this.getModel().getRelation(_this, type, filterFunction);
  });

  _defineProperty(this, "set", function (attribute, value) {
    if (attribute === "id") {
      throw new Error("You cannot change the ID");
    }

    _this[attribute] = value;

    _this.getModel().getStore().update([_this]);
  });

  _defineProperty(this, "save", function () {
    return _this.getModel().getStore().save([_this]);
  });

  _defineProperty(this, "destroy", function () {
    return _this.getModel().getStore()["delete"]([_this]);
  });

  _defineProperty(this, "toJson", function () {
    var attrs = Object.keys(_this);
    var out = {};

    for (var _i = 0, _attrs = attrs; _i < _attrs.length; _i++) {
      var a = _attrs[_i];

      if (typeof _this[a] !== "function") {
        out[a] = _this[a];
      }
    }

    return out;
  });

  _defineProperty(this, "toString", function () {
    return JSON.stringify(_this.toJson());
  });

  this.getModel = function () {
    return model;
  };

  Object.keys(values).forEach(function (key) {
    _this[key] = values[key];
  });
  var id;

  if (this.id && (typeof this.id === "string" || typeof this.id === "number")) {
    id = this.id.toString();
  } else {
    id = (0, _uuid.v4)();
  }

  this.getId = function () {
    return id;
  };
});

exports["default"] = Obj;