# 🎯 Propuesta de Mejoras Finales — BARLO-VENTAS (Mobile-First, Asistente Virtual y Navegación)

**Fecha:** 2026-08-26 · **Estado:** Propuesta para aprobación · **Alcance:** `web-customer`, `web-admin`, activos de marca (`BarloVentas/`)

---

## 0. Estrategia Mobile-First (versión PC · Teléfono · Tablet)

### 0.1 Principio rector

> La plataforma se ejecutará **principalmente en equipos móviles**. Todo diseño nuevo debe pensarse primero para pantallas táctiles y luego adaptarse a tablet y escritorio (mobile-first).

### 0.2 Stack de frontend recomendado (el más adecuado y efectivo)

| Capa | Decisión | Justificación |
|---|---|---|
| Framework | **Next.js 15 + React 19** (mantener) | Ya es la base de ambas apps; SSR/ISR; rutas existentes |
| Estilos | **Tailwind CSS v4** (mantener) | Utility-first, responsive por breakpoints, ya integrado |
| Componentes UI | **Componentes propios + patrones de `shadcn/ui`** (opcional) | Botones/inputs/cards accesibles y táctiles sin peso extra |
| PWA (Fase 2, opcional) | **manifest.json + Service Worker** (plugin `next-pwa` o manual) | Permite **instalar la plataforma como app en el móvil** (pantalla completa, icono, sin barra del navegador) |
| Iconografía | SVG inline (ya usado) | Ligero, nítido en todas las densidades |
| Fuentes | Inter/Poppins (ya usadas) | Legibles en pantallas pequeñas |

### 0.3 Diseño responsive por breakpoint

| Breakpoint | Dispositivo | Comportamiento |
|---|---|---|
| `< 640px` | **Teléfono** | Layout de 1 columna; **bottom navigation** (barra inferior fija) en web-customer; **drawer lateral** en web-admin; modales a pantalla completa; tablas → tarjetas; botones táctiles ≥ 44×44 px; tipografía ≥ 14 px; sticky header de ~56 px |
| `640px – 1024px` | **Tablet** | Grid de 2 columnas; sidebar colapsable a iconos en web-admin; filtros en acordeón; tarjetas de catálogo en 2-3 columnas |
| `> 1024px` | **PC** | Layout actual mejorado: sidebar expandida, grids de 3-4 columnas, paneles de finanzas/órdenes más anchos |

### 0.4 Pautas transversales (aplicar en todas las pantallas)

- **Área táctil mínima:** 44×44 px (botones, iconos, enlaces de menú).
- **Safe-area:** respetar `env(safe-area-inset-*)` (notch / gestos de iOS).
- **Sticky headers** con altura compacta y contraste.
- **Tablas → tarjetas** en móvil (pedidos, facturas, inventario, usuarios).
- **Modales full-screen** en móvil (registro, KYC, recarga, factura PDF).
- **Filtros y buscador** plegables (no ocupar espacio permanente).
- **Metadatos móviles:** `viewport` ya presente; añadir `theme-color`, `apple-mobile-web-app-capable` y manifest PWA (Fase 2).
- **Testing:** Playwright con viewports `375×667`, `390×844` (teléfono), `768×1024` (tablet), `1440×900` (PC) + pruebas en dispositivo real.

---

## 1. Integración de `repTecnico/PROPUESTA_USO_PLATAFORMA_MOVIL.md`

Documento ya elaborado y ubicado en `repTecnico/PROPUESTA_USO_PLATAFORMA_MOVIL.md`. Se adopta como requisito para el uso móvil de la billetera:

| Opción | Descripción | Acción |
|---|---|---|
| **A (inmediata)** | Uso del **navegador integrado** de la billetera móvil (in-app browser) + **deep links** (MetaMask `metamask.app.link/dapp/…`, Trust Wallet, Coinbase) | Documentar en `/help` y en el asistente virtual (punto 2) — sin código |
| **B (recomendada)** | Integrar **WalletConnect v2 (Reown AppKit)** en `web-customer` y `web-admin`: QR desde Chrome/Safari móvil, provider EIP-1193 unificado, `ethers.BrowserProvider` sigue funcionando | Fases 1-2 del documento: instalar `@reown/appkit`, Project ID (cloud.reown.com), proveedor unificado, botón "Conectar" con modal+QR, auto-conexión |
| **C (complemento)** | Aprovechar `mipd`/EIP-6963, botón "abrir en la billetera" de respaldo, detección móvil, QR nativo | Fase 4 del documento |

**Nota:** el RPC del nodo Anvil GCP (`https://mcc-foundry-anvil-1095249147821.europe-west1.run.app`, chainId `31337`) y el token **EURT** (`0x5FbDB2315678afecb367f032d93F642f64180aa3`, 6 decimales) son los datos que el asistente (punto 2) usará para la **red personalizada**.

---

## 2. 🤖 Asistente Virtual (onboarding de wallet de prueba)

### 2.1 Objetivo

Un **asistente paso a paso** que guía al usuario a:
1. **Obtener una billetera de prueba** (MetaMask, Trust Wallet o Rabby): enlaces de descarga + deep links de la plataforma.
2. **Agregar la red personalizada Anvil de Google Cloud** (vía `wallet_addEthereumChain`):
   - Network name: `BARLO-VENTAS GCP (Anvil)`
   - RPC URL: `https://mcc-foundry-anvil-1095249147821.europe-west1.run.app`
   - Chain ID: `31337` · Símbolo: `ETH`
3. **Agregar una de las cuentas libres** (importar clave privada de prueba) — listado de cuentas demo disponibles (ver 2.4).
4. **Conectar la billetera a la plataforma** (botón conectar + verificación de estado).

### 2.2 UI y ubicación

- Componente `WalletAssistant` (client) con **wizard de 4 pasos** y barra de progreso.
- Se abre desde un **icono 🤖** en el header (punto 3/4) o desde el **menú desplegable del usuario**.
- **Activación/desactivación:** *toggle* en el menú desplegable del usuario ("Activar asistente virtual") — preferencia persistida en `localStorage` (y opcionalmente en el perfil on-chain futuro). Cuando está desactivado, el icono 🤖 no se muestra en el header.

### 2.3 Funcionalidad por paso

| Paso | Acción | Implementación |
|---|---|---|
| 1. Obtener wallet | Mostrar tarjetas de MetaMask / Trust / Rabby con botón de descarga (App Store / Play) y deep link de la dapp | Enlaces estáticos + `target="_blank"` |
| 2. Agregar red GCP | Botón "Agregar red a mi billetera" → `window.ethereum.request({ method: 'wallet_addEthereumChain', params: [{ chainId: '0x7a69', rpcUrls: [...], chainName: 'BARLO-VENTAS GCP (Anvil)', nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 } }] })` | Detectar `window.ethereum`; si no existe, ofrecer in-app browser / deep link |
| 3. Agregar cuenta libre | Mostrar **una cuenta demo a la vez** (dirección + botón "copiar clave privada" con aviso de seguridad) e instrucciones de importación (MetaMask → Importar cuenta) | Datos en `src/lib/demo/accounts.ts` (ver 2.4) |
| 4. Conectar | Pulsar "Conectar Billetera Web3" (flujo actual de `useWallet`) y mostrar estado final (dirección, red 31337, saldo EURT) | Reutilizar `connect()` existente |

### 2.4 Cuentas demo libres (seguridad)

- Las cuentas demo son las **cuentas Anvil estándar** (fondos de prueba, sin valor real). El asistente **mostrará las claves solo en el entorno demo** (flag `NEXT_PUBLIC_DEMO_MODE=true`); en producción se ocultan y el paso 3 se convierte en "use su propia wallet".
- Datos centralizados en `src/lib/demo/accounts.ts` (dirección + clave) o leídos de un endpoint protegido. **Nunca** en el bundle si no es demo.
- Recomendación: marcar en la UI "⚠️ Cuentas de PRUEBA — no use fondos reales".

### 2.5 Componentes/archivos

- `web-customer/src/components/wallet-assistant.tsx` y `web-admin/src/components/wallet-assistant.tsx` (o uno compartido en `src/lib`).
- Toggle en `UserDropdown` (customer) y en el menú de usuario del sidebar (admin).
- `src/lib/demo/network.ts` (datos de red GCP) y `src/lib/demo/accounts.ts`.

---

## 3. 🛍️ Barra de navegación superior — web-customer (rediseño)

### 3.1 Estado actual

Header con: logo "B" (izquierda) · buscador central grande · "+EURT" · "Ayuda" · `UserDropdown` (derecha).

### 3.2 Propuesta

| Zona | Antes | **Después** |
|---|---|---|
| **Izquierda** | Logo "B" (enlace a inicio) | **Logo oficial de la plataforma** (archivo de `BarloVentas/`) **+ esa zona se convierte en el menú desplegable de usuario** (click en el logo → menú: Mi Perfil · Mis Pedidos · Finanzas · Recargar EURT · Carrito · Inscribirse (si no registrado) · Asistente virtual (toggle) · Desconectar) |
| **Centro** | Buscador grande | **Sin buscador permanente** (icono de búsqueda 🔍 que expande un campo; o se elimina — el buscador ya existe en la página de catálogo) |
| **Derecha** | +EURT · Ayuda · UserDropdown | **Solo 2 iconos:** ❓ **Ayuda** (enlace a `/help`) y 🤖 **Asistente virtual** (abre el wizard del punto 2; oculto si el toggle está desactivado) |

### 3.3 Detalles de implementación

- **Logo:** copiar el SVG de `BarloVentas/IMG_20260817_094224.svg` (o `IMG_20260817_094433.svg`) a `web-customer/public/logo.svg`; usarlo en el header con altura ~36-40 px.
- **Menú de usuario en el logo:** reutilizar la lógica del `UserDropdown` actual (nombre, saldo EURT/ETH, enlaces) pero disparado por el logo; mantener el dropdown en la izquierda (evita overflow en pantallas estrechas).
- **Header móvil:** altura 56 px, logo+menú a la izquierda, ayuda+asistente a la derecha; contraste alto (fondo blanco/translúcido como hoy).
- **Accesibilidad:** `aria-label` en iconos; área táctil ≥ 44 px.

---

## 4. 📊 Barra lateral del dashboard — web-admin (colapsable + logo + menú acordeón)

### 4.1 Estado actual

Sidebar fija con `navItems` (Dashboard, Inventario, Envíos, Órdenes, Empresas, Finanzas, Auditoría, Sistemas, Ayuda) + texto; header superior con logo "B" + enlaces + `WalletConnect`; en móvil hay un drawer (`mobileMenuOpen`).

### 4.2 Propuesta

| Elemento | Antes | **Después** |
|---|---|---|
| **Sidebar izquierda** | Fija (ancho completo con texto) | **Colapsable:** botón (hamburguesa/chevron) que alterna entre expandida (`w-64`, logo + texto + iconos) y **contraída (`w-16`, solo iconos** con `title`/tooltip). Estado persistido en `localStorage` (`admin_sidebar_collapsed`) |
| **Zona superior del sidebar** | Logo "B" simple | **Logo oficial de la plataforma** (`BarloVentas/`) **incluido en el menú de usuario tipo acordeón**: click en el logo/avatar → acordeón con Perfil · Finanzas · Auditoría · Sistemas · Asistente virtual (toggle) · Desconectar (además de los enlaces del sidebar) |
| **Barra superior (zona derecha)** | +EURT · Ayuda · Tienda · WalletConnect | **Solo 2 iconos:** ❓ **Ayuda** y 🤖 **Asistente virtual** (oculto si el toggle está desactivado). El estado de la wallet (dirección, saldo) se integra en el acordeón del logo |

### 4.3 Detalles de implementación

- Estado `sidebarCollapsed` + transiciones CSS (`transition-all`, ancho `w-64` ↔ `w-16`); ocultar textos con `hidden`/`lg:block` según estado.
- En **tablet**, la sidebar arranca contraída; en **móvil**, sigue el drawer existente (con el mismo logo y acordeón).
- `navItems` se mantienen; en modo contraído se muestran solo los iconos con `title`.
- El acordeón del logo reutiliza la lógica del `WalletConnect`/dropdown actual (dirección, saldo, desconectar) y añade el toggle del asistente.

---

## 5. Plan de implementación priorizado

| Fase | Alcance | Estimación |
|---|---|---|
| **F1 — Base móvil** | Refactor responsive de componentes clave (catálogo, carrito, checkout, pedidos, finanzas, inventario, órdenes) a tarjetas/menús táctiles; header compacto; bottom nav (customer); drawer (admin) | 3-4 días |
| **F2 — Asistente virtual** | Componente `WalletAssistant` (4 pasos), toggle en menú usuario, datos de red GCP + cuentas demo (flag demo) | 1,5-2 días |
| **F3 — Header web-customer** | Logo oficial + menú de usuario en la izquierda; derecha solo Ayuda + Asistente; quitar buscador permanente | 1 día |
| **F4 — Sidebar web-admin** | Sidebar colapsable a iconos; logo + menú acordeón arriba; header derecho solo Ayuda + Asistente; persistencia `localStorage` | 1 día |
| **F5 — WalletConnect (AppKit)** | Integración según `repTecnico/PROPUESTA_USO_PLATAFORMA_MOVIL.md` (customer + admin) | 2-3 días |
| **F6 — PWA (opcional)** | Manifest + Service Worker para instalación en el móvil | 1 día |
| **F7 — Testing** | Playwright (375/390/768/1440) + dispositivos reales Android/iOS; matriz de compatibilidad | 1-2 días |

**Total estimado:** ~11-14 días-hombre.

---

## 6. Riesgos y notas

- **Seguridad de cuentas demo:** las claves de las cuentas Anvil son públicas y de prueba; el asistente solo las mostrará con `NEXT_PUBLIC_DEMO_MODE=true` y con aviso. Nunca exponer claves en producción.
- **WalletConnect exige HTTPS** (la demo GCP ya lo es; local requiere túnel `ngrok` o certificado).
- **Proyecto Reown (Project ID)** es público; se configura por env, no se versiona.
- **Compatibilidad de navegadores móviles:** Safari iOS limita PWA/storage; probar en iOS y Android.
- **No romper flujos existentes:** el rediseño del header/sidebar no debe alterar las rutas ni los flujos Web3 (firma, escrow, Stripe) verificados.

---

*Documento de propuesta generado para revisión. Archivos de referencia: `BarloVentas/` (logos), `repTecnico/PROPUESTA_USO_PLATAFORMA_MOVIL.md`, `web-customer/src/app/layout.tsx`, `web-admin/src/app/layout.tsx`.*
