import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BARLO-VENTAS Admin Platform',
    short_name: 'BARLO Admin',
    description: 'Consola administrativa y control logístico descentralizado de BARLO-VENTAS',
    start_url: '/',
    display: 'standalone',
    background_color: '#0F172A',
    theme_color: '#0077BB',
    icons: [
      {
        src: '/logo.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
