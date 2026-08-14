<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Barlo-Ventas | Sistema de Diseño y Activos de Frontend</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/fontsource/css/poppins@latest/latin-500.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/fontsource/css/poppins@latest/latin-600.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/fontsource/css/poppins@latest/latin-700.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/fontsource/css/poppins@latest/latin-800.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/fontsource/css/inter@latest/latin-400.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/fontsource/css/inter@latest/latin-600.css">
<style>
/* ============ TOKENS BARLO-VENTAS ============ */
:root{
  --azul:#0077BB;      /* Azul Caribe Digital */
  --naranja:#FF8800;   /* Naranja Cacao Sol */
  --rojo:#CC2233;      /* Rojo San Juan */
  --verde:#2E8B57;     /* Verde Manglar */
  --arena:#F5F5F0;     /* Blanco Arena */
  --asfalto:#333333;   /* Gris Asfalto */
  --niebla:#A9A9A9;    /* Gris Niebla */
  --azul-claro:#63B6E6;
  --card:#FFFFFF;
  --borde:rgba(51,51,51,.12);
  --radio:16px;
  --sombra:0 10px 30px rgba(51,51,51,.08);
  --f-head:'Poppins',system-ui,sans-serif;
  --f-body:'Inter',system-ui,sans-serif;
}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{font-family:var(--f-body);background:var(--arena);color:var(--asfalto);line-height:1.6;overflow-x:hidden}
::selection{background:var(--naranja);color:#fff}
h1,h2,h3,h4,.head{font-family:var(--f-head)}
img{max-width:100%;display:block}
a{color:inherit;text-decoration:none}
button{font-family:inherit;cursor:pointer}
section{scroll-margin-top:90px}
.wrap{max-width:1180px;margin:0 auto;padding:0 24px}

/* ============ TOPBAR ============ */
.topbar{position:sticky;top:0;z-index:50;background:rgba(245,245,240,.88);backdrop-filter:blur(10px);border-bottom:1px solid var(--borde)}
.topbar .wrap{display:flex;align-items:center;gap:28px;height:72px}
.brand{display:flex;align-items:center;gap:10px;font-family:var(--f-head);font-weight:800;font-size:1.05rem;letter-spacing:.02em}
.brand svg{height:44px;width:auto}
.topnav{display:flex;gap:22px;margin-left:auto}
.topnav a{font-weight:600;font-size:.86rem;color:var(--asfalto);position:relative;padding:6px 2px}
.topnav a::after{content:"";position:absolute;left:0;bottom:0;width:0;height:3px;border-radius:3px;background:var(--naranja);transition:width .25s}
.topnav a:hover::after{width:100%}
@media(max-width:900px){.topnav{display:none}}

/* ============ BOTONES ============ */
.btn{display:inline-flex;align-items:center;gap:8px;border:none;border-radius:12px;font-family:var(--f-head);font-weight:600;font-size:.95rem;padding:14px 24px;transition:transform .2s,box-shadow .2s,background .2s;position:relative}
.btn:hover{transform:translateY(-2px)}
.btn:active{transform:translateY(0) scale(.98)}
.btn-sm{padding:10px 18px;font-size:.85rem}
.btn-primary{background:var(--naranja);color:#fff;box-shadow:0 6px 18px rgba(255,136,0,.35)}
.btn-secondary{background:var(--azul);color:#fff;box-shadow:0 6px 18px rgba(0,119,187,.3)}
.btn-danger{background:var(--rojo);color:#fff;box-shadow:0 6px 18px rgba(204,34,51,.3)}
.btn-outline{background:transparent;color:var(--asfalto);border:2px solid var(--asfalto)}
.btn-outline:hover{background:var(--asfalto);color:var(--arena)}
.btn-ghost{background:transparent;color:var(--verde);border:2px solid var(--verde)}
.btn-ghost:hover{background:var(--verde);color:#fff}
/* pulse del CTA */
.btn-pulse{animation:pulse 2.2s infinite}
@keyframes pulse{
  0%{box-shadow:0 0 0 0 rgba(255,136,0,.45)}
  70%{box-shadow:0 0 0 18px rgba(255,136,0,0)}
  100%{box-shadow:0 0 0 0 rgba(255,136,0,0)}
}
.fx-note{display:inline-block;font-size:.75rem;color:var(--niebla);font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-top:8px}

/* ============ HERO ============ */
.hero{padding:72px 0 56px}
.hero .wrap{display:grid;grid-template-columns:1.15fr .85fr;gap:48px;align-items:center}
.kicker{display:inline-block;background:var(--azul);color:#fff;font-family:var(--f-head);font-weight:600;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;padding:6px 14px;border-radius:999px;margin-bottom:18px}
.hero h1{font-size:clamp(1.7rem,3.6vw,2.9rem);font-weight:800;line-height:1.15;text-transform:uppercase}
.hero h1 .sep{color:var(--naranja)}
.hero-sub{font-family:var(--f-head);font-weight:500;color:var(--niebla);margin-top:8px;font-size:clamp(.85rem,1.4vw,1.05rem)}
.lead{margin-top:18px;font-size:1.02rem;max-width:56ch}
.hero-actions{display:flex;flex-wrap:wrap;gap:14px;margin-top:28px;align-items:center}
.assets{list-style:none;display:flex;flex-wrap:wrap;gap:10px;margin-top:26px}
.asset{display:inline-flex;align-items:center;gap:8px;background:var(--card);border:1px solid var(--borde);border-radius:10px;padding:8px 12px;font-size:.75rem;font-weight:600;transition:.2s;cursor:pointer}
.asset:hover{border-color:var(--naranja);transform:translateY(-2px);box-shadow:var(--sombra)}
.asset svg{width:18px;height:18px;flex:none}
.hero-art{position:relative}
.hero-art img{border-radius:20px;box-shadow:var(--sombra);border:1px solid var(--borde)}
.float-chip{position:absolute;background:#fff;border:1px solid var(--borde);border-radius:999px;padding:6px 12px;font-size:.72rem;font-weight:600;display:flex;align-items:center;gap:6px;box-shadow:var(--sombra);animation:floaty 5s ease-in-out infinite}
.float-chip i{width:12px;height:12px;border-radius:4px;display:inline-block}
.fc1{top:8%;left:-6%;animation-delay:0s}
.fc2{top:44%;right:-7%;animation-delay:1.4s}
.fc3{bottom:6%;left:2%;animation-delay:2.6s}
@keyframes floaty{50%{transform:translateY(-12px)}}
@media(max-width:900px){.hero .wrap{grid-template-columns:1fr}.hero-art{max-width:440px}}

/* ============ SECCIONES ============ */
.section{padding:56px 0}
.sec-title{font-weight:800;font-size:clamp(1.3rem,2.4vw,1.8rem);text-transform:uppercase;letter-spacing:.02em;display:flex;align-items:center;gap:14px}
.sec-title::after{content:"";width:56px;height:6px;border-radius:3px;background:var(--naranja)}
.sec-desc{color:var(--niebla);font-weight:600;margin:6px 0 26px;font-size:.92rem}
.card-panel{background:var(--card);border:1px solid var(--borde);border-radius:var(--radio);box-shadow:var(--sombra)}

/* ============ LOGOTIPO ============ */
.logo-grid{display:grid;grid-template-columns:1.3fr 1fr 1fr 1fr;gap:16px}
.logo-card{border-radius:var(--radio);border:1px solid var(--borde);padding:28px 18px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;min-height:230px;transition:.25s}
.logo-card:hover{transform:translateY(-4px);box-shadow:var(--sombra)}
.logo-card svg{height:120px;width:auto}
.logo-card figcaption{font-family:var(--f-head);font-weight:600;font-size:.9rem}
.lg-full{background:var(--card)}
.lg-panel{background:var(--panel);border-color:transparent}
.lg-panel figcaption{color:#fff}
.logo-mono{--lg-b:#fff;--lg-basket:#fff;--lg-handle:#fff;--lg-wave:#fff;--lg-wave2:rgba(255,255,255,.65);--lg-lattice:var(--panel)}
@media(max-width:980px){.logo-grid{grid-template-columns:1fr 1fr}}
@media(max-width:560px){.logo-grid{grid-template-columns:1fr}}

/* ============ PALETA ============ */
.pal-group{margin-bottom:26px}
.pal-group h3{font-weight:700;font-size:.85rem;letter-spacing:.14em;text-transform:uppercase;color:var(--asfalto);margin-bottom:14px}
.swatches{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px}
.swatch{background:var(--card);border:1px solid var(--borde);border-radius:14px;padding:12px;text-align:left;transition:.2s;position:relative;overflow:hidden}
.swatch:hover{transform:translateY(-4px);box-shadow:var(--sombra);border-color:var(--c)}
.sw-color{display:block;height:88px;border-radius:10px;background:var(--c);border:1px solid rgba(51,51,51,.08);margin-bottom:10px}
.sw-name{font-family:var(--f-head);font-weight:600;font-size:.9rem;display:block}
.swatch code{font-size:.78rem;color:var(--niebla);font-weight:600}
.sw-tag{display:block;font-size:.72rem;color:var(--niebla);margin-top:2px}
.sw-hint{position:absolute;top:20px;right:20px;background:rgba(255,255,255,.92);border-radius:999px;padding:4px 10px;font-size:.68rem;font-weight:600;opacity:0;transition:.2s}
.swatch:hover .sw-hint{opacity:1}

/* ============ TIPOGRAFÍA ============ */
.type-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
.type-card{padding:26px}
.type-card .glyph{font-size:3.4rem;line-height:1;font-weight:700}
.type-card.poppins .glyph{font-family:var(--f-head);color:var(--azul)}
.type-card.inter .glyph{font-family:var(--f-body);color:var(--verde)}
.type-card h3{font-size:1.5rem;font-weight:700;margin-top:6px}
.type-card .use{font-size:.8rem;font-weight:600;color:var(--niebla);text-transform:uppercase;letter-spacing:.1em}
.type-card .weights{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}
.w-chip{border-radius:999px;padding:5px 12px;font-size:.75rem;font-weight:600;background:var(--arena);border:1px solid var(--borde)}
.scale{padding:10px 26px}
.scale-row{display:flex;align-items:baseline;gap:18px;padding:14px 0;border-bottom:1px dashed var(--borde)}
.scale-row:last-child{border:none}
.scale-row .lbl{flex:0 0 150px;font-size:.72rem;font-weight:600;color:var(--niebla);text-transform:uppercase;letter-spacing:.08em}
.s-h1{font-family:var(--f-head);font-weight:700;font-size:2.2rem}
.s-h2{font-family:var(--f-head);font-weight:700;font-size:1.6rem}
.s-h3{font-family:var(--f-head);font-weight:500;font-size:1.2rem}
.s-body{font-size:1rem}
.s-small{font-size:.8rem;color:var(--niebla);font-weight:600}
@media(max-width:820px){.type-grid{grid-template-columns:1fr}.scale-row .lbl{flex-basis:110px}}

/* ============ ICONOS ============ */
.icon-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:16px}
.icon-card{padding:26px 14px;display:flex;flex-direction:column;align-items:center;gap:10px;transition:.2s}
.icon-card:hover{transform:translateY(-4px);box-shadow:var(--sombra);border-color:var(--naranja)}
.icon-card svg{width:52px;height:52px;color:var(--asfalto);transition:.2s}
.icon-card:hover svg{color:var(--azul);transform:scale(1.08)}
.icon-card b{font-family:var(--f-head);font-weight:600;font-size:.92rem}
.icon-card span{font-size:.68rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--niebla);background:var(--arena);border:1px solid var(--borde);padding:3px 10px;border-radius:999px}

/* ============ COMPONENTES ============ */
.comp-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:16px}
.comp-box{padding:26px}
.comp-box h3{font-size:.8rem;letter-spacing:.14em;text-transform:uppercase;margin-bottom:18px;color:var(--niebla)}
.btn-row{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start;margin-bottom:26px}
.field{margin-bottom:16px}
.field label{display:block;font-weight:600;font-size:.82rem;margin-bottom:6px}
.field input,.field select{width:100%;border:2px solid var(--borde);border-radius:12px;padding:12px 14px;font-family:var(--f-body);font-size:.92rem;background:#fff;transition:.2s;outline:none;color:var(--asfalto)}
.field input:focus,.field select:focus{border-color:var(--azul);box-shadow:0 0 0 4px rgba(0,119,187,.15)}
.switch-row{display:flex;align-items:center;gap:10px;font-size:.88rem;font-weight:600}
.switch{position:relative;width:48px;height:26px}
.switch input{opacity:0;width:0;height:0}
.slider{position:absolute;inset:0;background:var(--niebla);border-radius:999px;transition:.25s}
.slider::before{content:"";position:absolute;width:20px;height:20px;border-radius:50%;background:#fff;left:3px;top:3px;transition:.25s}
.switch input:checked + .slider{background:var(--verde)}
.switch input:checked + .slider::before{transform:translateX(22px)}
.badges{display:flex;flex-wrap:wrap;gap:10px}
.badge{padding:7px 14px;border-radius:999px;font-size:.78rem;font-weight:600;color:#fff}
.b-azul{background:var(--azul)}.b-naranja{background:var(--naranja)}.b-rojo{background:var(--rojo)}.b-verde{background:var(--verde)}.b-niebla{background:var(--niebla)}
@media(max-width:900px){.comp-grid{grid-template-columns:1fr}}

/* ============ TOKENS CODE ============ */
.tokens-box{position:relative;background:#22272b;color:#e8ecec;border-radius:var(--radio);padding:26px;font-family:ui-monospace,Consolas,monospace;font-size:.83rem;line-height:1.7;overflow:auto}
.tokens-box .c{color:#7f8c91}.tokens-box .v{color:#ffb066}.tokens-box .k{color:#6fc3ff}
.copy-code{position:absolute;top:14px;right:14px;background:var(--naranja);color:#fff;border:none;border-radius:8px;padding:7px 14px;font-weight:600;font-size:.75rem;font-family:var(--f-head)}
.copy-code:hover{filter:brightness(1.1)}

/* ============ DEMO TIENDA ============ */
.shop{overflow:hidden}
.shop-top{display:flex;align-items:center;gap:20px;padding:16px 22px;border-bottom:1px solid var(--borde)}
.shop-brand{display:flex;align-items:center;gap:8px;font-family:var(--f-head);font-weight:700}
.shop-brand svg{height:34px}
.shop-nav{display:flex;gap:16px;margin-left:auto;font-size:.85rem;font-weight:600}
.shop-nav a:hover{color:var(--azul)}
.cart-btn{position:relative;background:var(--arena);border:1px solid var(--borde);border-radius:12px;padding:9px 11px;display:flex}
.cart-btn svg{width:22px;height:22px;color:var(--asfalto)}
.cart-count{position:absolute;top:-8px;right:-8px;background:var(--rojo);color:#fff;font-size:.68rem;font-weight:700;min-width:20px;height:20px;border-radius:999px;display:grid;place-items:center;padding:0 5px}
.cart-count.pop{animation:pop .35s}
@keyframes pop{50%{transform:scale(1.4)}}
.shop-hero{background:var(--azul);color:#fff;padding:44px 30px 70px;position:relative}
.shop-hero h3{font-size:clamp(1.3rem,2.6vw,2rem);font-weight:700;max-width:22ch}
.shop-hero p{opacity:.9;margin:8px 0 20px;font-size:.95rem}
.shop-hero .wave{position:absolute;bottom:-1px;left:0;width:100%;height:46px}
.shop-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:26px 22px;background:#fff}
.prod{border:1px solid var(--borde);border-radius:14px;overflow:hidden;background:#fff;transition:.2s;display:flex;flex-direction:column}
.prod:hover{transform:translateY(-5px);box-shadow:var(--sombra)}
.prod img{aspect-ratio:1/1;object-fit:cover}
.prod-body{padding:14px;display:flex;flex-direction:column;gap:6px;flex:1}
.prod-body h4{font-weight:600;font-size:1rem}
.prod-body .price{font-family:var(--f-head);font-weight:700;color:var(--azul)}
.prod-body .btn{margin-top:auto;justify-content:center}
@media(max-width:820px){.shop-grid{grid-template-columns:1fr}}

/* ============ FOOTER / TOAST / REVEAL ============ */
footer{border-top:1px solid var(--borde);padding:30px 0;margin-top:40px}
footer .wrap{display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:space-between;font-size:.82rem;color:var(--niebla);font-weight:600}
footer .dots{display:flex;gap:6px}
footer .dots i{width:14px;height:14px;border-radius:4px;display:block}
.toast{position:fixed;left:50%;bottom:26px;transform:translate(-50%,80px);background:var(--asfalto);color:var(--arena);padding:12px 22px;border-radius:999px;font-weight:600;font-size:.85rem;box-shadow:0 12px 30px rgba(0,0,0,.25);transition:transform .35s;z-index:99;display:flex;gap:8px;align-items:center}
.toast.show{transform:translate(-50%,0)}
.toast i{width:10px;height:10px;border-radius:3px;background:var(--naranja);display:inline-block}
.reveal{opacity:0;transform:translateY(26px);transition:opacity .7s,transform .7s}
.reveal.in{opacity:1;transform:none}
</style>
</head>
<body>

<!-- ============ SÍMBOLOS SVG (logo + iconografía) ============ -->
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <clipPath id="bvClip"><path d="M144 76 h96 l-16 88 h-64 Z"/></clipPath>
    <symbol id="logo-bv" viewBox="0 0 260 210">
      <path d="M148 62 Q192 10 236 62" fill="none" stroke="var(--lg-handle,#2E8B57)" stroke-width="10" stroke-linecap="round"/>
      <path d="M144 76 h96 l-16 88 h-64 Z" fill="var(--lg-basket,#FF8800)"/>
      <g clip-path="url(#bvClip)" fill="none" stroke="var(--lg-lattice,rgba(255,255,255,.55))" stroke-width="4">
        <path d="M140 92 l110 84"/><path d="M160 78 l100 78"/><path d="M140 128 l84 64"/>
        <path d="M250 92 l-110 84"/><path d="M230 78 l-100 78"/><path d="M250 128 l-84 64"/>
      </g>
      <rect x="138" y="64" width="106" height="12" rx="6" fill="var(--lg-basket,#FF8800)"/>
      <text x="6" y="176" font-family="Poppins, sans-serif" font-weight="800" font-size="170" fill="var(--lg-b,#0077BB)">B</text>
      <path d="M4 156 q22 -36 44 -8 q20 26 42 2 q22 -24 48 4" fill="none" stroke="var(--lg-wave,#0077BB)" stroke-width="13" stroke-linecap="round"/>
      <path d="M20 182 q20 -28 40 -6 q18 22 40 0" fill="none" stroke="var(--lg-wave2,#63B6E6)" stroke-width="9" stroke-linecap="round"/>
    </symbol>
    <symbol id="i-cacao" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><g transform="rotate(28 24 24)"><ellipse cx="24" cy="24" rx="9" ry="15"/><path d="M24 9.5 Q29 24 24 38.5"/><path d="M19.5 12.5 Q15.5 24 19.5 35.5"/></g></g><path d="M35 7 a11 11 0 0 1 9 9" fill="none" stroke="#FF8800" stroke-width="2.6" stroke-linecap="round"/></symbol>
    <symbol id="i-tambor" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="24" cy="13" rx="13" ry="4.5"/><path d="M11 13 v17 c0 3 6 5.5 13 5.5 s13 -2.5 13 -5.5 v-17"/><path d="M12 17.5 l6 12 l6 -12 l6 12 l6 -12"/></g><path d="M37 6 a11 11 0 0 1 8 8" fill="none" stroke="#FF8800" stroke-width="2.6" stroke-linecap="round"/></symbol>
    <symbol id="i-ola" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 31 C9 17 22 10 31 14 c8 3.5 7 13 -0.5 13 c-4 0 -6 -3 -4.5 -6"/><path d="M7 37 q6 4.5 12 0 t12 0 t10 0"/></g><path d="M36 7 a11 11 0 0 1 8 8" fill="none" stroke="#FF8800" stroke-width="2.6" stroke-linecap="round"/></symbol>
    <symbol id="i-carrito" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10 h5 l5.5 20 h17 l4.5 -13 H14"/><circle cx="20" cy="37" r="3.2"/><circle cx="33" cy="37" r="3.2"/></g><path d="M36 6 a11 11 0 0 1 8 8" fill="none" stroke="#FF8800" stroke-width="2.6" stroke-linecap="round"/></symbol>
    <symbol id="i-usuario" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="16" r="7.5"/><path d="M10 39 c2.5 -11 25.5 -11 28 0"/></g><path d="M35 7 a11 11 0 0 1 8 8" fill="none" stroke="#FF8800" stroke-width="2.6" stroke-linecap="round"/></symbol>
    <symbol id="i-envio" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 12 h20 v18 H8 Z"/><path d="M28 18 h8 l7 7 v5 H28"/><circle cx="15" cy="36" r="3.5"/><circle cx="34" cy="36" r="3.5"/><path d="M2 17 h4 M4 24 h4"/></g><path d="M37 6 a11 11 0 0 1 8 8" fill="none" stroke="#FF8800" stroke-width="2.6" stroke-linecap="round"/></symbol>
    <symbol id="i-folder" viewBox="0 0 24 24"><path d="M3 6 a2 2 0 0 1 2 -2 h5 l2 3 h7 a2 2 0 0 1 2 2 v9 a2 2 0 0 1 -2 2 H5 a2 2 0 0 1 -2 -2 Z" fill="#FFD37A" stroke="#E0A63C" stroke-width="1.4"/></symbol>
    <symbol id="i-file" viewBox="0 0 24 24"><path d="M6 2 h9 l5 5 v15 H6 Z" fill="#fff" stroke="#A9A9A9" stroke-width="1.4"/><path d="M15 2 v5 h5" fill="none" stroke="#A9A9A9" stroke-width="1.4"/><rect x="8" y="13" width="10" height="5" rx="1" fill="#FF8800"/></symbol>
  </defs>
</svg>

<!-- ============ TOPBAR ============ -->
<header class="topbar">
  <div class="wrap">
    <a class="brand" href="#top">
      <svg viewBox="0 0 260 210"><use href="#logo-bv"/></svg>
      BARLO-VENTAS
    </a>
    <nav class="topnav">
      <a href="#logotipo">Logotipo</a>
      <a href="#paleta">Paleta</a>
      <a href="#tipografia">Tipografía</a>
      <a href="#iconos">Iconos</a>
      <a href="#componentes">Componentes</a>
      <a href="#demo">Demo</a>
    </nav>
    <a class="btn btn-primary btn-sm btn-pulse" href="#demo" style="margin-left:auto">Ver demo</a>
  </div>
</header>

<main id="top">
  <!-- ============ HERO ============ -->
  <section class="hero">
    <div class="wrap">
      <div class="reveal in">
        <span class="kicker">Sistema de diseño · Activos frontend</span>
        <h1>Barlo‑Ventas <span class="sep">|</span> Sistema de Diseño y Activos de Frontend</h1>
        <p class="hero-sub">Barlo‑Ventas | Design System &amp; Frontend Assets</p>
        <p class="lead">Tokens de color, tipografías, iconografía y componentes listos para construir la tienda con la confianza del mar Caribe, la energía del cacao y el ritmo del tambor.</p>
        <div class="hero-actions">
          <a class="btn btn-primary btn-pulse" href="#paleta">Explorar estilo</a>
          <button class="btn btn-outline" id="downloadAll">Descargar activos</button>
        </div>
        <ul class="assets">
          <li class="asset" data-file="BARLOVENTAS-LOGOS.zip"><svg><use href="#i-folder"/></svg>BARLOVENTAS‑LOGOS.zip</li>
          <li class="asset" data-file="ICONOS-VECTORIALES.zip"><svg><use href="#i-folder"/></svg>ICONOS‑VECTORIALES.zip</li>
          <li class="asset" data-file="GUIAS-ESTILO.pdf"><svg><use href="#i-file"/></svg>GUIAS‑ESTILO.pdf</li>
          <li class="asset" data-file="PALETA-COLORES.scss"><svg><use href="#i-file"/></svg>PALETA‑COLORES.scss</li>
        </ul>
      </div>
      <div class="hero-art reveal in">
        <img src="https://image.qwenlm.ai/public_source/f1b10a27-567d-44e2-b5f5-6f091e336b02/13494bf53-ba61-410e-83c5-6f2950b03a80.png" alt="Persona revisando el sistema de diseño en una tablet">
        <span class="float-chip fc1"><i style="background:#0077BB"></i>#0077BB</span>
        <span class="float-chip fc2"><i style="background:#FF8800"></i>#FF8800</span>
        <span class="float-chip fc3"><i style="background:#2E8B57"></i>#2E8B57</span>
      </div>
    </div>
  </section>

  <!-- ============ LOGOTIPO ============ -->
  <section class="section" id="logotipo">
    <div class="wrap">
      <h2 class="sec-title">Logotipo</h2>
      <p class="sec-desc">Concepto A — variantes de color oficiales sobre sus fondos permitidos.</p>
      <div class="logo-grid">
        <figure class="logo-card lg-full reveal">
          <svg viewBox="0 0 260 210"><use href="#logo-bv"/></svg>
          <figcaption>Full Color · Blanco Arena</figcaption>
        </figure>
        <figure class="logo-card lg-panel logo-mono reveal" style="--panel:#0077BB">
          <svg viewBox="0 0 260 210"><use href="#logo-bv"/></svg>
          <figcaption>Blue Caribe</figcaption>
        </figure>
        <figure class="logo-card lg-panel logo-mono reveal" style="--panel:#CC2233">
          <svg viewBox="0 0 260 210"><use href="#logo-bv"/></svg>
          <figcaption>Red San Juan</figcaption>
        </figure>
        <figure class="logo-card lg-panel logo-mono reveal" style="--panel:#333333">
          <svg viewBox="0 0 260 210"><use href="#logo-bv"/></svg>
          <figcaption>White</figcaption>
        </figure>
      </div>
    </div>
  </section>

  <!-- ============ PALETA ============ -->
  <section class="section" id="paleta">
    <div class="wrap">
      <h2 class="sec-title">Color Palette</h2>
      <p class="sec-desc">Haz clic en cualquier muestra para copiar su código hexadecimal.</p>

      <div class="pal-group">
        <h3>Primarios</h3>
        <div class="swatches">
          <button class="swatch reveal" style="--c:#0077BB" data-copy="#0077BB"><span class="sw-color"></span><span class="sw-name">Azul Caribe Digital</span><code>#0077BB</code><span class="sw-tag">Confianza · Mar Caribe</span><span class="sw-hint">Copiar</span></button>
          <button class="swatch reveal" style="--c:#FF8800" data-copy="#FF8800"><span class="sw-color"></span><span class="sw-name">Naranja Cacao Sol</span><code>#FF8800</code><span class="sw-tag">Energía · Cacao</span><span class="sw-hint">Copiar</span></button>
        </div>
      </div>
      <div class="pal-group">
        <h3>Secundarios</h3>
        <div class="swatches">
          <button class="swatch reveal" style="--c:#CC2233" data-copy="#CC2233"><span class="sw-color"></span><span class="sw-name">Rojo San Juan</span><code>#CC2233</code><span class="sw-tag">Ritmo · Tradición</span><span class="sw-hint">Copiar</span></button>
          <button class="swatch reveal" style="--c:#2E8B57" data-copy="#2E8B57"><span class="sw-color"></span><span class="sw-name">Verde Manglar</span><code>#2E8B57</code><span class="sw-tag">Naturaleza · Sostenibilidad</span><span class="sw-hint">Copiar</span></button>
        </div>
      </div>
      <div class="pal-group">
        <h3>Base &amp; Texto</h3>
        <div class="swatches">
          <button class="swatch reveal" style="--c:#F5F5F0" data-copy="#F5F5F0"><span class="sw-color"></span><span class="sw-name">Blanco Arena</span><code>#F5F5F0</code><span class="sw-tag">Fondos</span><span class="sw-hint">Copiar</span></button>
          <button class="swatch reveal" style="--c:#333333" data-copy="#333333"><span class="sw-color"></span><span class="sw-name">Gris Asfalto</span><code>#333333</code><span class="sw-tag">Texto principal</span><span class="sw-hint">Copiar</span></button>
          <button class="swatch reveal" style="--c:#A9A9A9" data-copy="#A9A9A9"><span class="sw-color"></span><span class="sw-name">Gris Niebla</span><code>#A9A9A9</code><span class="sw-tag">Texto secundario</span><span class="sw-hint">Copiar</span></button>
        </div>
      </div>
    </div>
  </section>

  <!-- ============ TIPOGRAFÍA ============ -->
  <section class="section" id="tipografia">
    <div class="wrap">
      <h2 class="sec-title">Typography</h2>
      <p class="sec-desc">Poppins para títulos y llamadas · Inter para cuerpo y UI.</p>
      <div class="type-grid">
        <div class="card-panel type-card poppins reveal">
          <span class="use">Títulos</span>
          <div class="glyph">Aa</div>
          <h3>Poppins</h3>
          <div class="weights"><span class="w-chip" style="font-weight:700">Bold 700</span><span class="w-chip" style="font-weight:500">Medium 500</span></div>
        </div>
        <div class="card-panel type-card inter reveal">
          <span class="use">Cuerpo</span>
          <div class="glyph">Aa</div>
          <h3>Inter</h3>
          <div class="weights"><span class="w-chip" style="font-weight:400">Regular 400</span><span class="w-chip" style="font-weight:600">SemiBold 600</span></div>
        </div>
      </div>
      <div class="card-panel scale reveal">
        <div class="scale-row"><span class="lbl">H1 · Poppins Bold</span><span class="s-h1">Sabor que navega</span></div>
        <div class="scale-row"><span class="lbl">H2 · Poppins Bold</span><span class="s-h2">Cacao de Barlovento</span></div>
        <div class="scale-row"><span class="lbl">H3 · Poppins Medium</span><span class="s-h3">Tambores de San Juan</span></div>
        <div class="scale-row"><span class="lbl">Cuerpo · Inter Regular</span><span class="s-body">Productos artesanales con esencia de mar, cacao y tradición.</span></div>
        <div class="scale-row"><span class="lbl">Small · Inter SemiBold</span><span class="s-small">ENVÍO GRATIS DESDE $50</span></div>
      </div>
    </div>
  </section>

  <!-- ============ ICONOGRAFÍA ============ -->
  <section class="section" id="iconos">
    <div class="wrap">
      <h2 class="sec-title">Iconography</h2>
      <p class="sec-desc">Trazo 2.6 px · esquinas redondeadas · acento Naranja Cacao Sol.</p>
      <div class="icon-grid">
        <div class="card-panel icon-card reveal"><svg><use href="#i-cacao"/></svg><b>Cacao</b><span>Categoría</span></div>
        <div class="card-panel icon-card reveal"><svg><use href="#i-tambor"/></svg><b>Tambor</b><span>Categoría</span></div>
        <div class="card-panel icon-card reveal"><svg><use href="#i-ola"/></svg><b>Ola</b><span>Categoría</span></div>
        <div class="card-panel icon-card reveal"><svg><use href="#i-carrito"/></svg><b>Carrito</b><span>Acción</span></div>
        <div class="card-panel icon-card reveal"><svg><use href="#i-usuario"/></svg><b>Usuario</b><span>Acción</span></div>
        <div class="card-panel icon-card reveal"><svg><use href="#i-envio"/></svg><b>Envío</b><span>Acción</span></div>
      </div>
    </div>
  </section>

  <!-- ============ COMPONENTES ============ -->
  <section class="section" id="componentes">
    <div class="wrap">
      <h2 class="sec-title">Componentes</h2>
      <p class="sec-desc">Botones, formularios y badges construidos con los tokens oficiales.</p>
      <div class="comp-grid">
        <div class="card-panel comp-box reveal">
          <h3>Botones</h3>
          <div class="btn-row">
            <div>
              <button class="btn btn-primary btn-pulse">Naranja Cacao Sol</button>
              <br><span class="fx-note">pulse · call to action</span>
            </div>
            <button class="btn btn-secondary">Azul Caribe</button>
            <button class="btn btn-danger">Rojo San Juan</button>
            <button class="btn btn-ghost">Verde Manglar</button>
            <button class="btn btn-outline">Outline</button>
          </div>
          <h3>Badges</h3>
          <div class="badges">
            <span class="badge b-azul">Mar Caribe</span>
            <span class="badge b-naranja">Cacao</span>
            <span class="badge b-rojo">Tambor</span>
            <span class="badge b-verde">Manglar</span>
            <span class="badge b-niebla">Niebla</span>
          </div>
        </div>
        <div class="card-panel comp-box reveal">
          <h3>Formulario</h3>
          <div class="field">
            <label for="f1">Nombre de usuario</label>
            <input id="f1" type="text" placeholder="Ej. Marina de Barlovento">
          </div>
          <div class="field">
            <label for="f2">Categoría favorita</label>
            <select id="f2"><option>Cacao</option><option>Tambor</option><option>Ola</option></select>
          </div>
          <div class="switch-row">
            <label class="switch"><input type="checkbox" checked><span class="slider"></span></label>
            Recibir envíos con ritmo de tambor
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ============ TOKENS ============ -->
  <section class="section" id="tokens">
    <div class="wrap">
      <h2 class="sec-title">Tokens CSS</h2>
      <p class="sec-desc">Copia y pega este bloque :root en tu proyecto frontend.</p>
      <div class="tokens-box reveal">
        <button class="copy-code" id="copyTokens">Copiar</button>
<pre id="tokensCode">:root {
  <span class="c">/* Color — Barlo-Ventas */</span>
  <span class="k">--azul-caribe-digital</span>: <span class="v">#0077BB</span>;  <span class="c">/* Confianza · Mar Caribe */</span>
  <span class="k">--naranja-cacao-sol</span>:  <span class="v">#FF8800</span>;  <span class="c">/* Energía · Cacao */</span>
  <span class="k">--rojo-san-juan</span>:      <span class="v">#CC2233</span>;  <span class="c">/* Ritmo · Tradición */</span>
  <span class="k">--verde-manglar</span>:      <span class="v">#2E8B57</span>;  <span class="c">/* Naturaleza · Sostenibilidad */</span>
  <span class="k">--blanco-arena</span>:       <span class="v">#F5F5F0</span>;  <span class="c">/* Fondos */</span>
  <span class="k">--gris-asfalto</span>:       <span class="v">#333333</span>;  <span class="c">/* Texto */</span>
  <span class="k">--gris-niebla</span>:        <span class="v">#A9A9A9</span>;  <span class="c">/* Texto secundario */</span>

  <span class="c">/* Tipografía */</span>
  <span class="k">--font-titulos</span>: <span class="v">"Poppins", sans-serif</span>;  <span class="c">/* Bold / Medium */</span>
  <span class="k">--font-cuerpo</span>:  <span class="v">"Inter", sans-serif</span>;    <span class="c">/* Regular / SemiBold */</span>

  <span class="c">/* Forma y efecto */</span>
  <span class="k">--radio</span>:  <span class="v">16px</span>;
  <span class="k">--sombra</span>: <span class="v">0 10px 30px rgb(51 51 51 / .08)</span>;
  <span class="k">--pulso-cta</span>: <span class="v">pulse 2.2s infinite</span>;
}</pre>
      </div>
    </div>
  </section>

  <!-- ============ DEMO ============ -->
  <section class="section" id="demo">
    <div class="wrap">
      <h2 class="sec-title">Aplicación · Demo</h2>
      <p class="sec-desc">El estilo aplicado a una mini-tienda funcional.</p>
      <div class="card-panel shop reveal">
        <div class="shop-top">
          <span class="shop-brand"><svg viewBox="0 0 260 210"><use href="#logo-bv"/></svg>Barlo‑Ventas</span>
          <nav class="shop-nav"><a href="#demo">Cacao</a><a href="#demo">Tambores</a><a href="#demo">Playa</a></nav>
          <button class="cart-btn" aria-label="Carrito"><svg><use href="#i-carrito"/></svg><span class="cart-count" id="cartCount">0</span></button>
        </div>
        <div class="shop-hero">
          <h3>Sabor caribeño, hecho a mano</h3>
          <p>Envíos a todo el país con ritmo de tambor. Confianza, energía y tradición en cada pedido.</p>
          <button class="btn btn-primary btn-pulse" id="shopCta">Comprar ahora</button>
          <svg class="wave" viewBox="0 0 1440 90" preserveAspectRatio="none"><path d="M0 60 C240 95 480 20 720 45 C960 70 1200 25 1440 55 L1440 90 L0 90 Z" fill="#ffffff"/></svg>
        </div>
        <div class="shop-grid">
          <article class="prod">
            <img src="https://image.qwenlm.ai/public_source/f1b10a27-567d-44e2-b5f5-6f091e336b02/1b4ebccfc-a67b-48d7-8c50-2883a56204bc.png" alt="Cacao Criollo">
            <div class="prod-body">
              <span class="badge b-naranja" style="align-self:flex-start">Categoría · Cacao</span>
              <h4>Cacao Criollo 1 kg</h4>
              <span class="price">$12,50</span>
              <button class="btn btn-secondary btn-sm add-cart" data-name="Cacao Criollo">Añadir al carrito</button>
            </div>
          </article>
          <article class="prod">
            <img src="https://image.qwenlm.ai/public_source/f1b10a27-567d-44e2-b5f5-6f091e336b02/157c2d0a8-ef70-42a1-bef0-d9b73a8ab8f4.png" alt="Tambor Alegre">
            <div class="prod-body">
              <span class="badge b-rojo" style="align-self:flex-start">Categoría · Tambor</span>
              <h4>Tambor Alegre</h4>
              <span class="price">$89,00</span>
              <button class="btn btn-secondary btn-sm add-cart" data-name="Tambor Alegre">Añadir al carrito</button>
            </div>
          </article>
          <article class="prod">
            <img src="https://image.qwenlm.ai/public_source/f1b10a27-567d-44e2-b5f5-6f091e336b02/1b34d0d98-8671-4f8c-b305-0b3b8a6f6b21.png" alt="Brisa de Ola">
            <div class="prod-body">
              <span class="badge b-azul" style="align-self:flex-start">Categoría · Ola</span>
              <h4>Brisa de Ola</h4>
              <span class="price">$24,00</span>
              <button class="btn btn-secondary btn-sm add-cart" data-name="Brisa de Ola">Añadir al carrito</button>
            </div>
          </article>
        </div>
      </div>
    </div>
  </section>
</main>

<footer>
  <div class="wrap">
    <span>Barlo‑Ventas © 2026 — Sistema de Diseño &amp; Activos de Frontend</span>
    <span class="dots"><i style="background:#0077BB"></i><i style="background:#FF8800"></i><i style="background:#CC2233"></i><i style="background:#2E8B57"></i><i style="background:#333333"></i></span>
    <span>Poppins (Bold/Medium) · Inter (Regular/SemiBold)</span>
  </div>
</footer>

<div class="toast" id="toast"><i></i><span id="toastMsg">Copiado</span></div>

<script>
(function(){
  var toastEl = document.getElementById('toast');
  var toastMsg = document.getElementById('toastMsg');
  var toastTimer = null;
  function showToast(msg){
    toastMsg.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastEl.classList.remove('show'); }, 2200);
  }
  function copyText(txt){
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(txt).then(function(){ showToast('Copiado ' + txt); },
        function(){ fallbackCopy(txt); });
    } else { fallbackCopy(txt); }
  }
  function fallbackCopy(txt){
    var ta = document.createElement('textarea');
    ta.value = txt; document.body.appendChild(ta); ta.select();
    try{ document.execCommand('copy'); showToast('Copiado ' + txt); }catch(e){ showToast(txt); }
    document.body.removeChild(ta);
  }

  /* Copiar colores */
  document.querySelectorAll('[data-copy]').forEach(function(el){
    el.addEventListener('click', function(){ copyText(el.getAttribute('data-copy')); });
  });

  /* Descargas simuladas */
  document.querySelectorAll('[data-file]').forEach(function(el){
    el.addEventListener('click', function(){ showToast('Descarga simulada: ' + el.getAttribute('data-file')); });
  });
  document.getElementById('downloadAll').addEventListener('click', function(){
    showToast('Preparando paquete completo de activos…');
  });

  /* Copiar tokens */
  document.getElementById('copyTokens').addEventListener('click', function(){
    copyText(document.getElementById('tokensCode').textContent.trim());
  });

  /* Carrito demo */
  var count = 0;
  var badge = document.getElementById('cartCount');
  document.querySelectorAll('.add-cart').forEach(function(btn){
    btn.addEventListener('click', function(){
      count++;
      badge.textContent = count;
      badge.classList.remove('pop');
      void badge.offsetWidth;
      badge.classList.add('pop');
      showToast(btn.getAttribute('data-name') + ' añadido al carrito');
    });
  });
  document.getElementById('shopCta').addEventListener('click', function(){
    showToast('¡Bienvenido a la tienda Barlo‑Ventas!');
  });

  /* Reveal on scroll */
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){ entry.target.classList.add('in'); io.unobserve(entry.target); }
    });
  }, { threshold: .12 });
  document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });
})();
</script>
</body>
</html>
