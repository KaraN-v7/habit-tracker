import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Ābhyāsa',
        short_name: 'Ābhyāsa',
        description: 'Track your habits and syllabus progress',
        id: '/?mode=pwa',
        start_url: '/?mode=pwa',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#000000',
        icons: [
            {
                src: '/force-icon-v5.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/force-icon-v5.png',
                sizes: '512x512',
                type: 'image/png',
            },
            {
                src: '/force-icon-v5.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable'
            }
        ],
    }
}
