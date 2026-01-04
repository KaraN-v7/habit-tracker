import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Habit Flow',
        short_name: 'Habit Flow',
        description: 'Track your habits and syllabus progress',
        id: '/?mode=pwa',
        start_url: '/?mode=pwa',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#000000',
        icons: [
            {
                src: '/logo-rounded.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/logo-rounded.png',
                sizes: '512x512',
                type: 'image/png',
            },
            {
                src: '/logo-rounded.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable'
            }
        ],
    }
}
