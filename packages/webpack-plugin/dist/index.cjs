'use strict';

const scriptLoader = require('./scriptLoader.cjs');
const url = require('url');
const promises = require('fs/promises');
const path = require('upath');
const mkdirp = require('mkdirp');
const loaderShared = require('@vuetify/loader-shared');

function _interopDefaultCompat (e) { return e && typeof e === 'object' && 'default' in e ? e.default : e; }

const path__default = /*#__PURE__*/_interopDefaultCompat(path);
const mkdirp__default = /*#__PURE__*/_interopDefaultCompat(mkdirp);

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
function isSubdir(root, test) {
  const relative = path__default.relative(root, test);
  return relative && !relative.startsWith("..") && !path__default.isAbsolute(relative);
}
class VuetifyPlugin {
  constructor(options) {
    __publicField(this, "options");
    this.options = {
      autoImport: true,
      styles: true,
      ...options
    };
  }
  async apply(compiler) {
    if (this.options.autoImport) {
      compiler.options.module.rules.unshift({
        resourceQuery: (query) => {
          if (!query)
            return false;
          const qs = new url.URLSearchParams(query);
          return qs.has("vue") && (qs.get("type") === "template" || qs.get("type") === "script" && qs.has("setup"));
        },
        use: {
          loader: "webpack-plugin-vuetify/scriptLoader",
          options: this.options
        }
      });
    }
    const vueLoader = compiler.options.module.rules.find((rule) => {
      return rule && typeof rule !== "string" && rule.loader && path__default.toUnix(rule.loader).endsWith("vue-loader/dist/templateLoader.js");
    });
    const vueOptions = typeof vueLoader === "object" && vueLoader?.options;
    if (vueOptions && typeof vueOptions === "object") {
      vueOptions.transformAssetUrls ?? (vueOptions.transformAssetUrls = loaderShared.transformAssetUrls);
    }
    const vuetifyBase = loaderShared.resolveVuetifyBase();
    function hookResolve(transform) {
      compiler.resolverFactory.hooks.resolver.for("normal").tap("vuetify-loader", (resolver) => {
        resolver.getHook("beforeResult").tapAsync("vuetify-loader", async (request, context, callback) => {
          if (request.path && request.path.endsWith(".css") && isSubdir(vuetifyBase, request.path)) {
            request.path = await transform(request.path);
          }
          callback(null, request);
        });
      });
    }
    if (this.options.styles === "none") {
      compiler.options.module.rules.push({
        enforce: "pre",
        test: /\.css$/,
        include: /node_modules[/\\]vuetify[/\\]/,
        issuer: /node_modules[/\\]vuetify[/\\]/,
        loader: "null-loader"
      });
    } else if (this.options.styles === "sass") {
      hookResolve((file) => file.replace(/\.css$/, ".sass"));
    } else if (loaderShared.isObject(this.options.styles)) {
      const findCacheDir = (await import('find-cache-dir')).default;
      const cacheDir = findCacheDir({
        name: "vuetify",
        create: true
      });
      const configFile = path__default.isAbsolute(this.options.styles.configFile) ? this.options.styles.configFile : path__default.join(
        compiler.options.context || process.cwd(),
        this.options.styles.configFile
      );
      hookResolve(async (request) => {
        const target = request.replace(/\.css$/, ".sass");
        const file = path__default.relative(vuetifyBase, target);
        const cacheFile = path__default.join(cacheDir, file);
        await mkdirp__default(path__default.dirname(cacheFile));
        await promises.writeFile(cacheFile, `@use "${loaderShared.normalizePath(configFile)}"
@use "${loaderShared.normalizePath(target)}"`);
        return cacheFile;
      });
    }
  }
}
__publicField(VuetifyPlugin, "transformAssetUrls", loaderShared.transformAssetUrls);

exports.VuetifyLoader = scriptLoader.default;
exports.transformAssetUrls = loaderShared.transformAssetUrls;
exports.VuetifyPlugin = VuetifyPlugin;
