# 🔍 INFORME DE AUDITORÍA PROFUNDA — BARLO-VENTAS (E-Commerce Web3 con Custodia Escrow)

**Fecha:** 2026-08-23 · **Alcance:** repositorio completo `C:\Users\lucci\MasterCodeCripto\GitLab\ecomerce`
**Módulos auditados:** contratos Solidity (`sc-ecommerce`, `stablecoin/sc`), `web-admin`, `web-customer`, `stablecoin/pasarela-de-pago`, `stablecoin/compra-stablecoin`, scripts de despliegue, Dockerfiles, configuración, documentación.
**Método:** lectura íntegra del código (contratos, librerías, páginas, APIs, hooks, configs), ejecución de `forge test` (44/44 PASS), verificación **on-chain en vivo** (Anvil 31337) con `eth_call`/`eth_getCode`, despliegue limpio reproducible, seeder de datos y smoke tests de navegador (Playwright) contra las 4 apps.

> **Nota de estado:** al iniciar la auditoría **toda la plataforma estaba caída** (8545, 3000, 3001, 3002, 3003). Para la verificación se restauró un despliegue limpio (Anvil + contratos + seed) y se arrancaron los 4 microservicios. Al cierre del informe la plataforma quedó **operativa** (ver §9).

---

## 1. Resumen ejecutivo

El núcleo escrow del contrato `Ecommerce.sol` está **bien construido** (checks-effects-interactions + `nonReentrant` en las 4 funciones que mueven fondos, aritmética checked 0.8.x, sin errores de redondeo en 6 decimales, doble liberación de escrow bloqueada por estados; 44 tests Foundry pasan). **Sin embargo, la plataforma NO es segura ni reproducible como está**, por tres razones estructurales:

1. **Cadena de custodia comprometida por diseño:** la clave privada de la cuenta #0 de Anvil (owner del contrato y **MINTER del token**) está **hardcodeada como fallback en 2 rutas de servidor**, aparece en **texto plano en un archivo accidental trackeado por git**, y está publicada en **`public/` de dos apps web** (se serviría en producción). Consecuencias directas: **minteo de EURT sin pago** (`/api/checkout` sin `STRIPE_SECRET_KEY`), **KYC on-chain de cualquier wallet** (`/api/kyc/verify` sin autenticación) y **suplantación total del Super Admin**.
2. **El despliegue no es reproducible ni idempotente:** el bytecode de `Ecommerce` (28.597 bytes) **supera el límite EIP-170 (24.576)** — el orquestador local arranca Anvil sin `--code-size-limit` y el deploy **revierte**; el script de deploy crea un `MockEuroToken` nuevo (mint abierto) si no se le pasa la dirección del token real; las direcciones hardcodeadas en configs/docs solo coinciden con la cadena bajo un orden de nonces específico que nada garantiza.
3. **El escrow no protege al comprador y retiene fondos:** no existe cancelación ni reembolso (una orden pagada nunca enviada queda bloqueada para siempre), `registerCustomerSelf` **retiene los 3 ETH** que la app envía sin posibilidad de retiro, y el "15% cashback" prometido en la UI **no existe en ningún contrato**.

**Conteo de anomalías verificadas:** 6 Críticas · 12 Altas · 22 Medias · 18 Bajas/Info ≈ **58 hallazgos** (las tablas por sección detallan cada una con archivo:línea y solución).

---

## 2. ANOMALÍAS CRÍTICAS

| # | Módulo | Ubicación | Anomalía | Solución |
|---|--------|-----------|----------|----------|
| C1 | Contratos | `sc-ecommerce/test/mocks/MockEuroToken.sol:17-21` | El EURT desplegado en el estado previo era `MockEuroToken` con **`mint` público**: cualquiera puede acuñar EURT ilimitado y comprar todo el catálogo. (En el despliegue limpio de esta auditoría el token es `EuroTokenOptimized` con `MINTER_ROLE` — ver §8.) | Desplegar y cablear siempre `EuroTokenOptimized` (`stablecoin/sc`) con `MINTER_ROLE` restringido; **nunca** usar el mock fuera de tests. |
| C2 | Contratos | `sc-ecommerce/src/Ecommerce.sol:233-235` | `decreaseStock` **no tiene control de acceso**: cualquier dirección decrementa el stock de cualquier producto (DoS de inventario). El propio test lo invoca sin prank. | `require(companyStorage.getCompany(product.companyId).companyAddress == msg.sender)` o hacerla `internal` (solo desde checkout/pago). |
| C3 | Contratos | `Ecommerce.sol:424-467` | `checkoutMultiCompany` **no valida duplicados**: un producto/empresa repetido en los arrays **cobra el doble** y decrementa stock dos veces. | Validar unicidad de `_companyIds`/`_productIds` (o acumular por producto antes de calcular totales). |
| C4 | Contratos + Apps | `Ecommerce.sol:291-304` + `web-customer/src/components/customer-registration-modal.tsx:87-124` | `registerCustomerSelf` es `payable` pero **ignora `msg.value`** y el contrato **no tiene función de retiro de ETH**: los 3 ETH que envían las apps quedan **atrapados para siempre**. `REGISTRATION_FEE` (3 ETH) no se enforcea. | Eliminar el envío de ETH de las apps; o `require(msg.value == 0)` + cobrar la tasa a owner (como `registerCompanySelf`); añadir `withdrawETH` soloOwner para fondos mal enviados. |
| C5 | Contratos | `Ecommerce.sol` (ausencia de `cancelOrder`/refund) | **No existe cancelación ni reembolso**: una factura pagada que nunca se envía queda bloqueada para siempre; `resolveDisputeReleaseEscrow` solo libera al comerciante y exige estado `Shipped` — el escrow **no protege al comprador**. | Añadir `cancelOrder`/`refundInvoice` (estado Cancelado + devolución al cliente) y permitir resolución de disputas desde `Paid` (p.ej. timelock 7 días si el comerciante no envía). |
| C6 | Seguridad de secretos | `web-customer/src/app/api/kyc/verify/route.ts:20` · `stablecoin/compra-stablecoin/src/app/api/checkout/route.ts:30` · `stablecoin/pasarela-de-pago/cast send 0x5FbDB…` (trackeado por git) · `public/anvil-metamask-accounts.json` (en web-admin y web-customer) · `gcp-db/Dockerfile` (pass pgAdmin) | **Clave privada del owner/MINTER hardcodeada** en código, en un archivo accidental versionado y servida desde `public/`; contraseña de pgAdmin en el Dockerfile. La clave es pública (Anvil default) y verifiqué on-chain que es `owner()` y `MINTER_ROLE` → control total. | Eliminar los fallbacks de clave; exigir variables de entorno; **borrar el archivo `cast send…` del repo e historial git**; mover `anvil-metamask-accounts.json` fuera de `public/`; parametrizar pgAdmin (env `PGADMIN_DEFAULT_PASSWORD` en runtime, nunca en el Dockerfile). Rotar claves. |

---

## 3. ANOMALÍAS ALTAS

| # | Módulo | Ubicación | Anomalía | Solución |
|---|--------|-----------|----------|----------|
| A1 | Contratos | `Ecommerce.sol:357-405,535-572` | `createInvoice` **no consume el carrito**: del mismo carrito se pueden crear y pagar varias facturas (doble pago si hay stock). | Vaciar/marcar items consumidos en `createInvoice` y bloquear factura no pagada activa del mismo carrito. |
| A2 | Contratos | `Ecommerce.sol:535-543` | `processPayment` **no verifica `invoice.customerAddress == _customer`**: el cliente A puede pagar la factura de B (pierde fondos); el owner puede mover EURT de cualquier cliente al escrow. | `require(invoice.customerAddress == _customer, "Not invoice customer")`. |
| A3 | Contratos | `Ecommerce.sol:428-435` | `checkoutMultiCompany` **no comprueba `isActive`** de producto/empresa: desactivados siguen vendiéndose. | Añadir `require(product.isActive && company.isActive)` en la validación. |
| A4 | Contratos/Apps | `Ecommerce.sol:476,553` + `web-customer/src/app/orders/page.tsx:486-496` + `web-admin/orders:346` + `InvoicePdfModal.tsx` | El contrato **nunca persiste `paymentTxHash`** (siempre `""`); las apps **fabrican un hash falso** en la factura PDF/QR (`0x5f8b91…`/`0x8be375…`) y el QR apunta a `/systems?tx=` que no procesa nada → verificación de pago engañosa. | Persistir hash real (evento/log) o mostrar "Pendiente"; ocultar QR si no hay tx real. |
| A5 | compra-stablecoin | `src/app/api/checkout/route.ts:83-107` | **Mint de EURT sin pago:** sin `STRIPE_SECRET_KEY` (así está el `.env.local`) se omite Stripe, se genera `ch_stripe_demo_…` falso y **se mintea igual**; mint inmediato sin comprobar `paymentIntent.status` (3DS `requires_action` → mint sin pago). | Exigir key real + `status === 'succeeded'`; bloquear mint en demo; idempotency key; compensación si el mint falla tras el cargo. |
| A6 | compra-stablecoin | `src/app/api/webhooks/stripe/route.ts:31-41` | Verificación de firma evadible: solo verifica si `webhookSecret && signature`; si no, **`JSON.parse(rawBody)` crudo acepta eventos forjados** (`payment_intent.succeeded` → mint). Idempotencia solo en memoria (se pierde en reinicios/multi-instancia). | Exigir whsec + header siempre; idempotencia persistente; validar metadata/amounts. |
| A7 | compra-stablecoin | `src/app/api/webhooks/simulate/route.ts:13-52` + botón en `page.tsx` | **Simulador de webhook que mintea EURT reales sin pago** si el relayer key está seteado (producción); sin auth ni rate limit; monto sin validar. | Eliminar en producción o proteger con flag de entorno + auth + validación. |
| A8 | web-customer | `src/app/api/kyc/verify/route.ts` | **KYC 100% eludible:** el endpoint marca `updateKYCStatus(address,true)` de **cualquier wallet** sin validar phone/birthDate/hashes/firma (se desestructuran y descartan); las apps además aceptan `localStorage.kyc_verified_*` como prueba. | Validar datos+firma server-side antes de la llamada on-chain; quitar el bypass de localStorage del checkout/topup. |
| A9 | web-admin | `public/anvil-metamask-accounts.json` + `layout.tsx:28` (auth por dirección hardcodeada) | La "autenticación" admin es solo comparar la wallet conectada con `getEntityType()` (view pública) y una dirección hardcodeada; **no hay sesión/middleware/JWT**. Quien tenga la clave (pública) suplanta al Super Admin. | Implementar auth real server-side (sesión + rol); nunca confiar en la dirección como único factor. |
| A10 | web-admin | `src/app/api/upload/route.ts:35-52` | API **anónima** (sin auth/rate-limit/límite de tamaño) con **path traversal real** vía `companyId` (verificado: `companyId="../../../../../../tmp"` escribe fuera de `public/uploads`). | Validar `companyId` como entero + `path.basename`; límite 5 MB; auth; `writeFile` async. |
| A11 | web-admin | `src/app/systems/page.tsx:871,1201-1428` | `/systems` expone **PII de todos los usuarios** (emails, direcciones, wallets, saldos ETH/EURT, "histórico Stripe") a **cualquier wallet conectada**; `/orders` permite ver facturas de cualquier `companyId` tecleado (`getCompanyInvoices` es view pública). | Gate por rol server-side; paginar/ocultar PII a no-owners; validar `companyId` contra la wallet de la empresa. |
| A12 | pasarela-de-pago | `src/app/page.tsx:47-48,179-191` | Query string **sin validar**: `amount` no numérico → `BigInt(NaN)` crashea; `redirectUrl` → **open redirect** post-pago sin allowlist; `postMessage(..., "*")`. La API `process-payment` responde `success:true` sin verificar nada on-chain. | Validar amount/invoiceId; allowlist de redirects; `targetOrigin` específico; verificar tx on-chain o eliminar el endpoint. |

---

## 4. ANOMALÍAS MEDIAS

| # | Módulo | Ubicación | Anomalía | Solución |
|---|--------|-----------|----------|----------|
| M1 | Contratos | `Ecommerce.sol:560-563` | `processPayment` decrementa stock sin verificar disponibilidad → factura impagable sin cancelación (deadlock de UX). | Validar stock al pagar con mensaje claro; o reservar stock en `createInvoice`. |
| M2 | Contratos | `Ecommerce.sol:432` vs `ShoppingCartLib.sol:45` | Precio inconsistente: carrito congela `unitPrice` al añadir; `checkoutMultiCompany` usa el **precio vivo**. Si la empresa cambia el precio, total mostrado ≠ cobrado. | Recalcular con precios vivos en ambos caminos (o congelar precios on-chain). |
| M3 | Contratos | `Ecommerce.sol:146` | `registerCompanySelf` reenvía **todo** el `msg.value` (no solo 3 ETH) con `transfer` (2300 gas). | Transferir exactamente `REGISTRATION_FEE` y devolver exceso; usar `call{value:…}`. |
| M4 | Contratos | `Ecommerce.sol:645-661` | `rateCompany` **no deduplica por cliente** (un cliente con N facturas infla la reputación) y no exige entrega. La UI "auto rating 24h" es un botón inmediato (sin timer). | Una reseña por cliente; requerir `Delivered/Completed`. |
| M5 | web-admin | `src/app/page.tsx:13,90-97` | ABI de `getCompanyRating` declara **3 retornos**; el contrato devuelve **2** → decodificación BAD_DATA (verificado) → la reputación **siempre muestra 5.0**; además la UI usaría `avg*100` como estrellas. | Corregir ABI a 2 outputs y dividir por 100. |
| M6 | web-admin | `src/app/page.tsx:170` | Botón "Inscribir Empresa (3.0 ETH)" → `setShowCompanyRegModal` **no está definido** → `ReferenceError` (verificado por código). | Declarar el estado o `router.push('/companies')`. |
| M7 | web-admin | `src/app/orders/page.tsx:149-153` | Flujo "Confirmar Pago y Despachar" **siempre revierte** para comerciantes: `processPayment` exige `msg.sender == customer || owner` y firma la wallet de la empresa. | No ofrecer auto-pago al comerciante; que el pago lo haga el cliente en la pasarela. |
| M8 | web-admin | `src/app/audit/page.tsx:203-232` | "Autorización" por `personal_sign` que **nunca se valida ni se envía**; además `catch { setAuthorized(true) }` → el acceso se concede aunque la firma falle. | Verificar la firma en servidor o eliminar el teatro. |
| M9 | web-admin | `src/app/systems/page.tsx:767-782,836-869,207-402` | Health checks **siempre ONLINE** (`catch` retorna ONLINE + `no-cors`); CRUD de usuarios/empresas **solo muta estado local** (no escribe on-chain, se pierde al recargar); datos **fabricados** presentados como on-chain (sourceCode viejo, logs/Stripe hardcodeados, "Tasa Éxito 100%"). | OFFLINE en catch; quitar botones de edición o implementar tx reales; cargar source real y marcar demo. |
| M10 | web-customer | `src/app/profile/page.tsx:163-266` | "Actualización on-chain" falsa: no existe `updateCustomer`; nombre/direcciones solo viven en estado/localStorage y **se pierden al recargar**; re-registro **resetea KYC a false**. | Persistir en contrato/backend; no resetear KYC. |
| M11 | web-customer | `src/app/topup/page.tsx:18-21,370-418` + `stripe-topup-modal.tsx` | **Formulario de tarjeta decorativo**: PAN/CVC/expiración capturados pero **nunca enviados** (`paymentMethodId:'pm_card_visa'` fijo); UI proclama "Stripe PCI-DSS". | Usar Stripe Elements real (PaymentElement) o eliminar el formulario falso. |
| M12 | web-customer | `src/app/finance/page.tsx:39,325-330` | `StripeTopupModal` es código muerto (nunca se abre) y no valida KYC. | Eliminar o conectar; unificar validación. |
| M13 | pasarela-de-pago | `PaymentGateway.tsx:34-35,129-130` · `page.tsx:44` | Envs **inexistentes** (`NEXT_PUBLIC_EUROTOKEN_CONTRACT_ADDRESS` vs reales) → componente "no configurado"; fallback de Ecommerce `0x7bc06c…` **sin código on-chain**; apunta a red Besu 81234. Componente no importado (dead code). | Unificar nombres de env; corregir fallback a `0x5FC8…`; eliminar dead code. |
| M14 | Compra/pasarela | `checkout/route.ts:5-8` (CORS `*`) · sin `middleware.ts` en ninguna app · sin rate limiting | CORS abierto en API que mintea tokens; sin rate limit en `/api/kyc/verify`, `/api/checkout`, `/api/webhooks/*`, `/api/process-payment`. | Restringir orígenes; añadir rate limiting (IP+wallet) en endpoints sensibles. |
| M15 | Transversal | `kyc/verify:58`, `checkout:120`, `webhooks/stripe:71` | Errores de servidor devueltos al cliente (`error?.message`/`reason`) → filtran internals. | Errores genéricos + log server-side. |
| M16 | Transversal | web-admin y web-customer `next.config.ts` sin `headers()` | Sin CSP/X-Frame-Options/HSTS. | `headers()` con CSP básica. |
| M17 | Contratos | `Ecommerce.sol:68,87,339-353` | Arrays sin límite (`activityLogs`, `invoiceIds`) → gas creciente (DoS); `getCart` usa comparación de direcciones (mensaje "not customer nor admin" engañoso). | Paginar views, podar logs, aclarar mensajes. |
| M18 | Docs | `repTecnico/manage-platform.ps1` vs README | El orquestador está en `repTecnico/` pero el README dice `.\manage-platform.ps1` en la raíz; `-Action seed` **no está en el `ValidateSet`** (inalcanzable); `Test-PortOnline` exige HTTP 200 pero Anvil responde **400 a GET** → el RPC siempre aparece "DETENIDO"; requiere `PRIVATE_KEY` env y **no pasa `--code-size-limit`** (deploy de Ecommerce revierte, verificado) ni `EURO_TOKEN_ADDRESS` (crea MockEuroToken); imprime direcciones fijas sin extraerlas del output. | Mover a la raíz, corregir ValidateSet y health-check JSON-RPC, añadir flags/`EURO_TOKEN_ADDRESS` y verificación post-deploy. |
| M19 | Despliegue | `deploy-all.sh`, `restart-all.sh`, `simple-deploy.sh`, `test-deployment.sh` | Scripts `.sh` **rotos/obsoletos**: `deploy-all.sh` usa `script/Deploy.s.sol` (**inexistente**), greps que no matchean el output real y funciones que no existen (`transferAllOwnership`, getters de subcontratos) → genera `.env` con direcciones vacías (el `deployment.log` confirma que murió al inicio del Step 2); `simple-deploy.sh` despliega `src/EcommerceMain.sol` (**inexistente** — solo existe `Ecommerce.sol`) y `MockEuroToken` (mint abierto); `restart-all.sh` apunta a **producción Besu** (`besu1.proyectos.codecrypto.academy`, chainId 81234, puertos 6001-6004) con rutas de otra máquina (`/Users/joseviejo/...`) y exige `jq` (ausente); `test-deployment.sh` espera `NEXT_PUBLIC_COMPANY_REGISTRY_ADDRESS` y `DEPLOYED_ADDRESSES.md` (inexistentes). | Rehacer los scripts contra la estructura real (monolito `Ecommerce.sol`, `--code-size-limit`), eliminar los que apuntan a Besu o marcarlos legacy, y basar `test-deployment` en las variables reales. |
| M20 | Config | `web-customer/src/components/wallet-connect.tsx:6` | `EXPECTED_CHAIN_ID` default **81234 (Besu)** y `.env.local` sin `NEXT_PUBLIC_CHAIN_ID` → si se usa WalletConnect, intenta "Switch to Besu" contra Anvil 31337 (web-admin usa default 31337 — contradicción entre apps). | Añadir `NEXT_PUBLIC_CHAIN_ID=31337` a web-customer/.env.local. |
| M21 | Docker | Dockerfiles de web-admin, pasarela, compra | Las 3 apps **EXPOSE 8080 + `npm start`** (chocan entre sí sin compose); sin `.dockerignore`; sin inyección de secretos; `NEXT_PUBLIC_*` horneados en build (sin `.env.local` en CI → fallbacks Besu 81234). | ARG/ENV explícitos, docker-compose con puertos distintos, `.dockerignore`. |
| M22 | Repo | `.gitmodules` + `.gitignore` | 2 submódulos declarados pero **NO inicializados** (`git ls-files lib` = 0) → un clone fresco no compila sin `forge install`; `.gitignore` no cubre `.env`, `anvil-metamask-accounts.json`, `deployment.log`, `anvil_state.json`, `*.log`; **no existen `.env.example`** pese a que DEPLOYMENT.md instruye `cp .env.example .env.local`. | `git submodule update --init` o documentar `forge install`; ampliar `.gitignore`; crear `.env.example` por app. |

---

## 5. ANOMALÍAS BAJAS / INFO (selección)

| # | Módulo | Ubicación | Anomalía | Solución |
|---|--------|-----------|----------|----------|
| B1 | Contratos | `Ecommerce.sol:31,99-102,339-353,549,645-661` | Estado `Completed` nunca asignado; sin `transferOwnership`; sin función rescue de tokens/ETH mal enviados; warning variable sin usar; `paymentTxHash` siempre vacío. | Limpiar enum, Ownable2Step, rescue, quitar warning, registrar hash. |
| B2 | Token | `stablecoin/sc/src/EuroTokenOptimized.sol:87-89` | `_update` con `whenNotPaused`: si el admin pausa el token se **bloquean las liberaciones de escrow**. | Documentar riesgo o excluir al escrow del pause. |
| B3 | Contratos | `Ecommerce.sol:339-353` | `getCart/calculateTotal/clearCart` solo accesibles por cliente/admin (bloquea lecturas guest). | Por diseño; aclarar mensaje. |
| B4 | web-admin | `src/contracts/Ecommerce.json` | ABI JSON **desactualizado** (faltan `getEntityType`, `getCompanyRating`, `checkoutMultiCompany`, `shipOrder`, etc.). | `forge inspect Ecommerce abi` para regenerar. |
| B5 | web-admin | tuples Product de 8 campos vs 9 reales (ethersh tolera el sobrante); `systems` usa nombres `ipfsHash/isAvailable` incorrectos. | Completar tuples y nombres. |
| B6 | web-customer | `abis.ts:8-10` declara `permit/nonces/DOMAIN_SEPARATOR` inexistentes en el token desplegado (latente). | Alinear ABI o desplegar EuroTokenOptimized (que sí tiene permit). |
| B7 | web-customer | `kyc-modal.tsx:18`, `registration-check.tsx:12` | ABIs muertos/incorrectos (`registerCustomer()` inexistente; tupla `getCustomer` desalineada). | Limpiar. |
| B8 | web-customer | `topup/page.tsx:91` | RPC hardcodeado `http://localhost:8545` en vez de `NEXT_PUBLIC_RPC_URL`. | Usar variable. |
| B9 | Compra | `webhooks/stripe/route.ts:51-52` | `metadata` nunca se setea en el checkout → el webhook legítimo nunca mintea; solo eventos forjados lo harían. | Setear y validar metadata. |
| B10 | Config | `.env.local` de las 4 apps | Sin `NEXT_PUBLIC_CHAIN_ID` (defaults 31337 correctos en web-admin; 81234 legacy Besu en `addresses.ts`/pasarela); direcciones de contrato duplicadas/hardcodeadas en muchos archivos. | Centralizar en env; documentar `NEXT_PUBLIC_CHAIN_ID=31337`; limpiar 81234. |
| B11 | Apps | `page.tsx` (customer) promete **15% Cashback EURT** — **ningún contrato lo implementa**. | Implementar cashback on-chain o eliminar la promesa. |
| B12 | Pasarela | `package.json` | Tailwind sin `content` config (warnings). | Configurar Tailwind. |
| B13 | Repo | `.gitignore` | `broadcast/` ignorado (bien), pero el archivo `cast send…` y `anvil-metamask-accounts.json` **sí están trackeados**. | `git rm --cached` + purgar historial + `.gitignore`. |
| B14 | Docs | `Docs/INFORME_CUMPLIMIENTO_PROYECTO_ESTUDIANTE.md:39` | Referencia `sc-ecommerce/src/EuroTokenOptimized.sol` — **el archivo está en `stablecoin/sc/src`**; enlace roto. | Corregir ruta. |
| B15 | Docs | `Docs/INFORME_CUMPLIMIENTO…`, `REPORTE_PRUEBAS_CONTRATOS…`, `REPORTE_PRUEBAS_UNITARIAS…` | Conteos desactualizados: docs dicen 48/62, lo real es **49/49** (44 sc-ecommerce + 5 token); Integration 6/6 vs 7/7; líneas de código citadas obsoletas; `manage-platform.ps1` referido en la raíz (real: `repTecnico/`). | Actualizar docs a la realidad medida. |
| B16 | Pasarela | `stablecoin/pasarela-de-pago/README.md` | Documenta el componente **legacy** (`PaymentGateway.tsx`, params `merchant_address/…`, vars que no existen) y red Besu 81234; el código real es `page.tsx` (params `merchant/amount/invoiceId/redirectUrl`). | Reescribir README. |
| B17 | Compra | `compra-stablecoin` (.env.local + route.ts:83-85) | Sin `STRIPE_SECRET_KEY`/`NEXT_PUBLIC_STRIPE_PUBLIC_KEY` → la rampa Stripe opera en **modo demo** (`ch_stripe_demo_…`), pese a que los informes afirman "Stripe API v2025" activa. | Añadir claves reales o documentar modo demo. |
| B18 | Repo | `package.json` raíz | `hardhat ^3.13.0` instalado pero no usado (todo el stack es Foundry). | Limpiar dependencia. |

---

## 6. Estado del despliegue y reproducibilidad (verificado en vivo)

**Lo que encontré al iniciar:** ningún servicio corriendo (8545/3000-3003 caídos). El `deployment.log` está incompleto (21 líneas, colores ANSI, direcciones obsoletas).

**Verificación de reproducibilidad (ejecutada durante la auditoría):**
1. `anvil --port 8545 --chain-id 31337` (config del orquestador) → deploy de `Ecommerce` **REVIERTE**: bytecode 28.597 bytes > límite EIP-170 (24.576). *Reproducible en vivo.*
2. `anvil --port 8545 --chain-id 31337 --code-size-limit 100000` → despliegue exitoso: **EURT=0x5FbDB231…aa3** (`EuroTokenOptimized`, AccessControl, decimals 6, 10.728 B de código) y **Ecommerce=0x5FC8d326…F875707** (28.431 B) con `euroTokenAddress()=0x5FbDB…` — **coinciden con los `.env.local`** de las 4 apps.
3. Seed (`scripts/seed-local-data.cjs`) → 2 empresas, 10 productos, 2 clientes KYC con €1.000 EURT.
4. Smoke live (Playwright): customer muestra saldo €1.000 y botón de pago **habilitado**; admin reconoce al Super Admin; "Nivel de Reputación ⭐5.0" (bug del ABI de `getCompanyRating` confirmado en vivo).

**Reconciliación de direcciones (importante):** en el nodo actual **`0x5FbDB` SÍ tiene código** (es el EuroToken) y **`0xDc64a` NO tiene código**. La premisa previa ("EURT real en 0xDc64a, 0x5FbDB vacío") corresponde a un estado derivado — un nodo donde un primer deploy revirtió o se desplegó en otro orden (no reproducible ni verificable). El `anvil_state.json` versionado también contiene un estado **distinto** al despliegue limpio (0x5FbDB con 4.268 B, 0xDc64a con 1.922 B).

**Conclusión:** las direcciones de configs/README son correctas **solo** para un despliegue limpio con este orden (EuroTokenOptimized primero + `EURO_TOKEN_ADDRESS` explícito en DeployEcommerce + `--code-size-limit`). El orquestador `manage-platform.ps1` no garantiza nada de eso, y el `anvil_state.json` persistido en el repo es un estado viejo — si se usa `--load-state` (como hace `entrypoint.sh` de Docker), **las apps quedan desalineadas**.

---

## 7. Consistencia contratos ↔ apps (verificada)

- ✅ Firmas correctas: `processPayment(address,uint256,uint256)`, `confirmDelivery(uint256)`, `rateCompany(uint256,uint8,string)`, `registerCustomerSelf(string,string,string)`, `updateKYCStatus(address,bool)`, `getInvoiceItems`, `getCustomerInvoices`, `getAllCompanies`, `checkoutMultiCompany`.
- ✅ `processPayment` exige `amount == totalAmount` y `msg.sender == customer || owner` (mitiga manipulación de montos en la pasarela).
- ✅ Escrow: `checkoutMultiCompany` transfiere EURT a `address(this)`; `confirmDelivery` libera a la empresa solo en estado `Shipped`; `resolveDisputeReleaseEscrow` onlyOwner.
- ❌ Desajustes: `getCompanyRating` (3 vs 2 outputs), tuples Product (8 vs 9), ABI JSON desactualizado, `getCompanyProducts` con nombres incorrectos en `systems`, `permit` inexistente en el token (Mock).
- ❌ Pasarela 3002 **huérfana**: web-customer no la referencia (el carrito paga con `checkoutMultiCompany` directo); `compra-stablecoin` sí se usa (`/topup` → `/api/checkout`).

---

## 8. Verificación de pruebas

- `forge test -vv` en `sc-ecommerce`: **44/44 PASS** (solc 0.8.35) + `forge test` en `stablecoin/sc`: **5/5 PASS** (EuroTokenOptimized) → **49/49 en total**. Cobertura: escrow security, carrito, empresa, catálogo, integración, token.
- **Faltan tests críticos:** reentrancy con token malicioso, duplicados en `checkoutMultiCompany`, cancelación/reembolso/disputa, doble factura desde el mismo carrito, pago de factura ajena, productos desactivados, ETH atrapado, permisos de `decreaseStock`, rating múltiple.
- Smoke live de navegador: OK (customer con saldo y pago habilitado; admin operativo).

---

## 9. Estado final de la plataforma

Al cierre de esta auditoría la plataforma quedó **levantada y operativa** (restaurada para la verificación):
- Anvil `http://127.0.0.1:8545` (chainId 31337, `--code-size-limit 100000`) · web-admin `:3000` · web-customer `:3001` · pasarela `:3002` · compra-stablecoin `:3003`.
- Para apagarla: `powershell -File repTecnico\manage-platform.ps1 -Action stop`.

---

## 10. Plan de remediación priorizado

**Fase 1 — Seguridad crítica (hacer ya):**
1. Eliminar fallbacks de clave privada en `kyc/verify/route.ts` y `checkout/route.ts`; exigir env vars.
2. Borrar `stablecoin/pasarela-de-pago/cast send 0x5FbDB…` del repo e historial; `git rm --cached` + `filter-repo`; rotar claves.
3. Mover `anvil-metamask-accounts.json` fuera de `public/` (raíz de web-admin y web-customer); excluir del build.
4. Bloquear mint sin pago: `STRIPE_SECRET_KEY` obligatoria + `payment_intent.status == 'succeeded'` + idempotencia persistente; eliminar/proteger `webhooks/simulate`; whsec obligatorio con firma.
5. Autenticar `/api/kyc/verify` y validar datos KYC + firma; eliminar bypass de localStorage.
6. Parametrizar `PGADMIN_DEFAULT_PASSWORD` (runtime env, nunca en Dockerfile).

**Fase 2 — Contratos (antes de cualquier uso real):**
7. `decreaseStock` con auth; dedupe en `checkoutMultiCompany`; `require(invoice.customerAddress == _customer)`; validar `isActive`.
8. Implementar `cancelOrder`/`refundInvoice` y disputas desde `Paid`; `withdrawETH`/`rescueToken`; no retener ETH en `registerCustomerSelf`.
9. Persistir `paymentTxHash` real; consumir carrito en `createInvoice`; precios consistentes; dedupe de ratings; stock validado en pago.
10. Tests Foundry para todos los casos anteriores.

**Fase 3 — Plataforma y despliegue:**
11. Orquestador: `--code-size-limit 100000`, pasar `EURO_TOKEN_ADDRESS` real, verificar direcciones post-deploy, mover a la raíz, corregir `ValidateSet` (seed) y health-check JSON-RPC; eliminar/regenerar `anvil_state.json` obsoleto.
12. Despliegue idempotente (CREATE2 con salt fijo o registry) + script de seed; reescribir o eliminar los scripts `.sh` rotos (`deploy-all.sh`, `simple-deploy.sh`, `restart-all.sh`, `test-deployment.sh`); crear `.env.example`; inicializar submódulos; ampliar `.gitignore`.
13. web-admin: auth real server-side; validar `companyId` en `/api/upload`; gate por rol en `/systems`; corregir ABI `getCompanyRating`; arreglar `setShowCompanyRegModal`; quitar datos fabricados y health checks falsos; CSP/rate-limit.
14. web-customer: factura sin hash falso; formulario Stripe real; persistir perfil; unificar KYC; `NEXT_PUBLIC_CHAIN_ID=31337`.
15. Pasarela: validar query string, redirect allowlist, `targetOrigin`, corregir envs/fallbacks (0x5FC8), eliminar dead code; o integrarla de verdad al flujo de pago.
16. Documentación: alinear direcciones, puertos, chainId (31337), conteos de tests (49/49), quitar "81234", y marcar características no implementadas (cashback 15%, Stripe demo).

---

*Anexo de evidencia en vivo:* `artifacts/browser-test/live/` (capturas customer-cart, admin-home, admin-systems, smoke.json) · scripts de verificación `scripts/check-chain.mjs`, `scripts/verify-state.mjs`, `scripts/verify-purchase.mjs`, `scripts/browser-test/*` · broadcasts: `sc-ecommerce/broadcast/DeployEcommerce.s.sol/31337/run-latest.json`, `stablecoin/sc/broadcast/DeployEuroTokenOptimized.s.sol/31337/run-latest.json`.
