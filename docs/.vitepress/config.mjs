import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Shannon",
  description: "An Electron desktop monitor board for developer activity, starting with GitHub and built to add more sources later.",
  base: '/shannon/',
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['link', { rel: 'icon', href: '/favicon.png' }],
  ],
  themeConfig: {
    logo: { light: '/logo.png', dark: '/logo.png' },
    siteTitle: "Shannon",
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide' },
      { text: 'Getting started', link: '/getting-started' },
      {
        text: 'GitHub',
        link: 'https://github.com/mediuswareltd/shannon'
      }
    ],
    sidebar: [
      {
        text: 'Documentation',
        items: [
          { text: 'Overview', link: '/' },
          { text: 'Getting started', link: '/getting-started' },
          { text: 'Guide', link: '/guide' },
          { text: 'About', link: '/about' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/mediuswareltd/shannon' }
    ],
    footer: {
      message: 'Built by Mediusware',
      copyright: 'Copyright © Mediusware Ltd'
    },
    editLink: {
      pattern: 'https://github.com/mediuswareltd/shannon/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },
    search: {
      provider: 'local'
    }
  }
,
  vite: {
    css: {
      postcss: {
        plugins: []
      }
    }
  }
})
