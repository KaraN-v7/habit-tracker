import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Ābhyāsa',
        short_name: 'Ābhyāsa',
        description: 'Track your habits and syllabus progress',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#000000',
        icons: [
            {
                src: '/icon-maskable.png?v=2',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable'
            },
            {
                src: '/icon-maskable.png?v=2',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any'
            },
            {
                src: '/icon-192.png?v=2',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/logo.png?v=2',
                sizes: 'any',
                type: 'image/png',
            }
        ],
    }
}
