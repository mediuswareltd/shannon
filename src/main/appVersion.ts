import pkg from '../../package.json'

/** Mirrors `version` in package.json (inlined at build time). */
export const APP_VERSION: string = pkg.version
