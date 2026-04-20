import pkg from '../../package.json'

/** Latest GitHub Releases URL for installers (derived from `homepage` in package.json). */
export function getReleasesLatestUrl(): string {
  const h = typeof pkg.homepage === 'string' ? pkg.homepage.replace(/\/$/, '') : ''
  return h ? `${h}/releases/latest` : 'https://github.com'
}
