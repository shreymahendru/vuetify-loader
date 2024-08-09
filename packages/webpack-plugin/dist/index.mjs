export { default as VuetifyLoader } from './scriptLoader.mjs';
import { URLSearchParams } from 'url';
import { writeFile } from 'fs/promises';
import path from 'upath';
import mkdirp from 'mkdirp';
import { transformAssetUrls, resolveVuetifyBase, isObject, normalizePath } from '@vuetify/loader-shared';
export { transformAssetUrls } from '@vuetify/loader-shared';

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
function isSubdir(root, test) {
  const relative = path.relative(root, test);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
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
          const qs = new URLSearchParams(query);
          return qs.has("vue") && (qs.get("type") === "template" || qs.get("type") === "script" && qs.has("setup"));
        },
        use: {
          loader: "webpack-plugin-vuetify/scriptLoader",
          options: this.options
        }
      });
    }
    const vueLoader = compiler.options.module.rules.find((rule) => {
      return rule && typeof rule !== "string" && rule.loader && path.toUnix(rule.loader).endsWith("vue-loader/dist/templateLoader.js");
    });
    const vueOptions = typeof vueLoader === "object" && vueLoader?.options;
    if (vueOptions && typeof vueOptions === "object") {
      vueOptions.transformAssetUrls ?? (vueOptions.transformAssetUrls = transformAssetUrls);
    }
    const vuetifyBase = resolveVuetifyBase();
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
    } else if (isObject(this.options.styles)) {
      const findCacheDir = (await import('find-cache-dir')).default;
      const cacheDir = findCacheDir({
        name: "vuetify",
        create: true
      });
      const configFile = path.isAbsolute(this.options.styles.configFile) ? this.options.styles.configFile : path.join(
        compiler.options.context || process.cwd(),
        this.options.styles.configFile
      );
      hookResolve(async (request) => {
        const target = request.replace(/\.css$/, ".sass");
        const file = path.relative(vuetifyBase, target);
        const cacheFile = path.join(cacheDir, file);
        await mkdirp(path.dirname(cacheFile));
        await writeFile(cacheFile, `@use "${normalizePath(configFile)}"
@use "${normalizePath(target)}"`);
        return cacheFile;
      });
    }
  }
}
__publicField(VuetifyPlugin, "transformAssetUrls", transformAssetUrls);

export { VuetifyPlugin };
