"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getHooksFromUrl = exports.getHooksFromOptions = exports.executeHook = void 0;

var _axios = _interopRequireDefault(require("axios"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

var getDataStringHook = function getDataStringHook(url) {
  var method = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "get";
  var data = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
  return (0, _axios["default"])({
    url: url,
    method: method,
    data: data,
    reponseType: 'json'
  }).then(function (data) {
    return data.data;
  });
};

var createHookItem = function createHookItem(optionItem, defaultMethod, defaultUrl) {
  if (typeof optionItem === "function") {
    return optionItem;
  } else {
    return {
      method: optionItem.method || defaultMethod,
      url: optionItem.url || defaultUrl
    };
  }
};

var getHooksFromOptions = function getHooksFromOptions(options) {
  var defaultUrl = typeof options.retrieve === "function" ? null : options.retrieve.url;
  return [createHookItem(options.retrieve, "get", defaultUrl), createHookItem(options.insert, "post", defaultUrl), createHookItem(options.update, "put", defaultUrl), createHookItem(options["delete"], "delete", defaultUrl)];
};

exports.getHooksFromOptions = getHooksFromOptions;

var getHooksFromUrl = function getHooksFromUrl(url) {
  return [{
    method: "get",
    url: url
  }, {
    method: "post",
    url: url
  }, {
    method: "put",
    url: url
  }, {
    method: "delete",
    url: url
  }];
};

exports.getHooksFromUrl = getHooksFromUrl;

var executeHook = function executeHook(type, hook, data) {
  var hookType = _typeof(hook);

  switch (hookType) {
    case "object":
      return getDataStringHook(hook.url, hook.method, data);

    case "function":
      return hook(data);

    default:
      return Promise.reject("The ".concat(type, " hook must be a URL or a function returning a promise"));
  }
};

exports.executeHook = executeHook;