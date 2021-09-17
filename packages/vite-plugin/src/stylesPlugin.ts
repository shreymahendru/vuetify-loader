import { utimes, writeFile } from 'fs/promises'
import * as path from 'upath'
import type { PluginOption, ViteDevServer } from 'vite'
import type { Options } from '@vuetify/loader-shared'
import findCacheDir from 'find-cache-dir'

function isSubdir (root: string, test: string) {
  const relative = path.relative(root, test)
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative)
}

const styleImportRegexp = /@use ['"]vuetify(\/lib)?\/styles(\/main(\.sass)?)?['"]/

export function stylesPlugin (options: Options): PluginOption {
  const vuetifyBase = path.dirname(require.resolve('vuetify/package.json'))
  const files = new Set<string>()

  let server: ViteDevServer
  let resolve: (v: any) => void
  let promise: Promise<any> | null
  let timeout: NodeJS.Timeout
  let needsTouch = false

  const cacheDir = findCacheDir({
    name: 'vuetify',
    create: true,
    thunk: true
  })!

  async function awaitResolve () {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      resolve(true)
    }, 500)

    if (!promise) {
      promise = new Promise((_resolve) => resolve = _resolve)
      await promise
      await writeFile(
        cacheDir('styles.scss'),
        ['vuetify/lib/styles/main.sass', ...files.values()].map(v => `@forward '${v}';`).join('\n'),
        'utf8'
      )
      if (needsTouch) {
        server.moduleGraph.getModulesByFile(cacheDir('styles.scss'))?.forEach(module => {
          module.importers.forEach(module => {
            module.file && utimes(module.file, Date.now(), Date.now())
          })
        })
        needsTouch = false
      }
      promise = null
    }

    return promise
  }

  return {
    name: 'vuetify:styles',
    enforce: 'pre',
    configureServer (_server) {
      server = _server
    },
    async resolveId (source, importer, custom) {
      if (
        importer &&
        source.endsWith('.css') &&
        isSubdir(vuetifyBase, importer)
      ) {
        if (options.styles === 'none') {
          return '__void__'
        } else if (options.styles === 'expose') {
          awaitResolve()

          const resolution = await this.resolve(
            source.replace(/\.css$/, '.sass'),
            importer,
            { skipSelf: true, custom }
          )

          if (resolution) {
            if (!files.has(resolution.id)) {
              needsTouch = true
              files.add(resolution.id)
            }

            return '__void__'
          }
        }
      }

      return null
    },
    async transform (code, id) {
      if (
        options.styles === 'expose' &&
        ['.scss', '.sass'].some(v => id.endsWith(v)) &&
        styleImportRegexp.test(code)
      ) {
        await awaitResolve()

        return code.replace(styleImportRegexp, '@use ".cache/vuetify/styles.scss"')
      }
    },
    load (id) {
      if (id === '__void__') {
        return ''
      }

      return null
    },
  }
}
