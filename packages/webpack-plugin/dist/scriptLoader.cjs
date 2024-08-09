'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const loaderShared = require('@vuetify/loader-shared');

const VuetifyLoader = (function VuetifyLoader(content, sourceMap) {
  if (this.data?.skip) {
    return content;
  }
  this.async();
  this.cacheable();
  const options = this.getOptions();
  const { code: imports, source } = loaderShared.generateImports(content, options);
  this.callback(null, source + imports, sourceMap);
});
const pitch = function VuetifyLoaderPitch(remainingRequest, precedingRequest, data) {
  if (this.loaders.some((loader) => loader.path.endsWith("vue-loader/dist/pitcher.js"))) {
    data.skip = true;
  }
};

exports.default = VuetifyLoader;
exports.pitch = pitch;
