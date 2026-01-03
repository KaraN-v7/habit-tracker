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
                src: '/app-icon-final.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/app-icon-final.png',
                sizes: '512x512',
                type: 'image/png',
            },
            {
                src: '/app-icon-final.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable'
            }
        ],
    }
}
