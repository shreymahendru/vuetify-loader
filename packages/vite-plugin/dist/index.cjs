'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const loaderShared = require('@vuetify/loader-shared');
const vite = require('vite');
const url = require('url');
const path = require('upath');

function _interopDefaultCompat (e) { return e && typeof e === 'object' && 'default' in e ? e.default : e; }

const path__default = /*#__PURE__*/_interopDefaultCompat(path);

function parseId(id) {
  const [pathname, query] = id.split("?");
  return {
    query: query ? Object.fromEntries(new url.URLSearchParams(query)) : null,
    path: pathname ?? id
  };
}
function importPlugin(options) {
  let filter;
  return {
    name: "vuetify:import",
    configResolved(config) {
      const vuetifyIdx = config.plugins.findIndex((plugin) => plugin.name === "vuetify:import");
      const vueIdx = config.plugins.findIndex((plugin) => plugin.name === "vite:vue");
      if (vuetifyIdx < vueIdx) {
        throw new Error("Vuetify plugin must be loaded after the vue plugin");
      }
      const vueOptions = config.plugins[vueIdx].api.options;
      filter = vite.createFilter(vueOptions.include, vueOptions.exclude);
    },
    async transform(code, id) {
      const { query, path } = parseId(id);
      const isVueVirtual = query && "vue" in query;
      const isVueFile = !isVueVirtual && filter(path) && !/^import { render as _sfc_render } from ".*"$/m.test(code);
      const isVueTemplate = isVueVirtual && (query.type === "template" || query.type === "script" && query.setup === "true");
      const isCompiledTemplate = id.endsWith("-view.html") || id.endsWith("-view.html.js");
      if (isVueFile || isVueTemplate || isCompiledTemplate) {
        const { code: imports, source } = loaderShared.generateImports(code, options);
        return {
          code: source + imports,
          map: null
        };
      }
      return null;
    }
  };
}

function isSubdir(root, test) {
  const relative = path__default.relative(root, test);
  return relative && !relative.startsWith("..") && !path__default.isAbsolute(relative);
}
const PLUGIN_VIRTUAL_PREFIX = "virtual:";
const PLUGIN_VIRTUAL_NAME = "plugin-vuetify";
const VIRTUAL_MODULE_ID = `${PLUGIN_VIRTUAL_PREFIX}${PLUGIN_VIRTUAL_NAME}`;
function stylesPlugin(options) {
  const vuetifyBase = loaderShared.resolveVuetifyBase();
  let configFile;
  const tempFiles = /* @__PURE__ */ new Map();
  return {
    name: "vuetify:styles",
    enforce: "pre",
    configResolved(config) {
      if (loaderShared.isObject(options.styles)) {
        if (path__default.isAbsolute(options.styles.configFile)) {
          configFile = options.styles.configFile;
        } else {
          configFile = path__default.join(config.root || process.cwd(), options.styles.configFile);
        }
      }
    },
    async resolveId(source, importer, { custom }) {
      if (source === "vuetify/styles" || importer && source.endsWith(".css") && isSubdir(vuetifyBase, path__default.isAbsolute(source) ? source : importer)) {
        if (options.styles === "none") {
          return `${PLUGIN_VIRTUAL_PREFIX}__void__`;
        } else if (options.styles === "sass") {
          const target = source.replace(/\.css$/, ".sass");
          return this.resolve(target, importer, { skipSelf: true, custom });
        } else if (loaderShared.isObject(options.styles)) {
          const resolution = await this.resolve(source, importer, { skipSelf: true, custom });
          if (!resolution)
            return null;
          const target = resolution.id.replace(/\.css$/, ".sass");
          const file = path__default.relative(path__default.join(vuetifyBase, "lib"), target);
          const contents = `@use "${loaderShared.normalizePath(configFile)}"
@use "${loaderShared.normalizePath(target)}"`;
          tempFiles.set(file, contents);
          return `${VIRTUAL_MODULE_ID}:${file}`;
        }
      } else if (source.startsWith(`/${PLUGIN_VIRTUAL_NAME}:`)) {
        return PLUGIN_VIRTUAL_PREFIX + source.slice(1);
      } else if (source.startsWith(`/@id/__x00__${PLUGIN_VIRTUAL_NAME}:`)) {
        return PLUGIN_VIRTUAL_PREFIX + source.slice(12);
      } else if (source.startsWith(`/${VIRTUAL_MODULE_ID}:`)) {
        return source.slice(1);
      }
      return null;
    },
    load(id) {
      if (new RegExp(`^${PLUGIN_VIRTUAL_PREFIX}__void__(\\?.*)?$`).test(id)) {
        return "";
      }
      if (id.startsWith(`${VIRTUAL_MODULE_ID}`)) {
        const file = new RegExp(`^${VIRTUAL_MODULE_ID}:(.*?)(\\?.*)?$`).exec(id)[1];
        return tempFiles.get(file);
      }
      return null;
    }
  };
}

function vuetify(_options = {}) {
  const options = {
    autoImport: true,
    styles: true,
    ..._options
  };
  const plugins = [];
  if (options.autoImport) {
    plugins.push(importPlugin(options));
  }
  if (loaderShared.includes(["none", "sass"], options.styles) || loaderShared.isObject(options.styles)) {
    plugins.push(stylesPlugin(options));
  }
  return plugins;
}
vuetify.transformAssetUrls = loaderShared.transformAssetUrls;

module.exports = vuetify;
module.exports.transformAssetUrls = loaderShared.transformAssetUrls;
module.exports.default = vuetify;