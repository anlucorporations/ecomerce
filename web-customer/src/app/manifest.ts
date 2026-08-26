import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BARLO-VENTAS | Marketplace Web3 & Escrow',
    short_name: 'BARLO-VENTAS',
    description: 'Plataforma de comercio electrónico y delivery descentralizado con custodia escrow on-chain y EuroToken EURT',
    start_url: '/',
    display: 'standalone',
    background_color: '#F5F5F0',
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
