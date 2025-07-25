import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'CMS Platform Docs',
  description: 'Developer documentation for the CMS & Translation Platform',
  
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API Reference', link: '/api/overview' },
      { text: 'Architecture', link: '/architecture/overview' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Project Structure', link: '/guide/project-structure' }
          ]
        },
        {
          text: 'Development',
          items: [
            { text: 'Local Setup', link: '/guide/local-setup' },
            { text: 'Development Workflow', link: '/guide/development-workflow' },
            { text: 'Testing', link: '/guide/testing' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/overview' },
            { text: 'Authentication', link: '/api/authentication' },
            { text: 'Endpoints', link: '/api/endpoints' }
          ]
        },
        {
          text: 'Resources',
          items: [
            { text: 'Users', link: '/api/resources/users' },
            { text: 'Brands', link: '/api/resources/brands' },
            { text: 'Translations', link: '/api/resources/translations' },
            { text: 'Releases', link: '/api/resources/releases' }
          ]
        }
      ],
      '/architecture/': [
        {
          text: 'Architecture',
          items: [
            { text: 'Overview', link: '/architecture/overview' },
            { text: 'Monorepo Structure', link: '/architecture/monorepo' },
            { text: 'Database Design', link: '/architecture/database' },
            { text: 'Authentication Flow', link: '/architecture/authentication' }
          ]
        },
        {
          text: 'Concepts',
          items: [
            { text: 'Multi-Tenancy', link: '/architecture/multi-tenancy' },
            { text: 'RBAC', link: '/architecture/rbac' },
            { text: 'Content Hierarchy', link: '/architecture/content-hierarchy' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-org/cms-platform' }
    ],

    search: {
      provider: 'local'
    }
  }
})