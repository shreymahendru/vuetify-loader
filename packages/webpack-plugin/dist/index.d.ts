export { default as VuetifyLoader } from './scriptLoader.js';
import { Compiler } from 'webpack';
import { Options } from '@vuetify/loader-shared';
export { transformAssetUrls } from '@vuetify/loader-shared';

declare class VuetifyPlugin {
    static transformAssetUrls: Record<string, string[]>;
    options: Required<Options>;
    constructor(options: Options);
    apply(compiler: Compiler): Promise<void>;
}

export { VuetifyPlugin };
