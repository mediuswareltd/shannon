/// <reference types="vite/client" />

import type { PeApi } from '../../shared/api'

declare global {
  interface Window {
    peApi: PeApi
  }
}

export {}
