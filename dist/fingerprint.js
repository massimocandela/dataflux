"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = fingerprint;

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

var md5 = require("md5");

var _getFingerprint = function _getFingerprint(object) {
  switch (_typeof(object)) {
    case "object":
      return markType(object, object !== null ? getObjectFingerprint(object) : "null");

    case "boolean":
      return markType(object, object.toString());

    case "function":
      throw new Error("You cannot pass a function as data item");

    case "number":
      return markType(object, object.toString());

    case "string":
      return markType(object, object);

    case "undefined":
      return markType(object, "undefined");
  }
};

var markType = function markType(object, fingerprint) {
  return _typeof(object) + ":" + fingerprint;
};

var getObjectFingerprint = function getObjectFingerprint(value) {
  var sortedKeys = Object.keys(value).sort();
  var buff = "";

  var _iterator = _createForOfIteratorHelper(sortedKeys),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var key = _step.value;
      buff += key + "<" + fingerprint(value[key]) + ">";
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  return buff;
};

function fingerprint(object) {
  return md5(_getFingerprint(object));
}