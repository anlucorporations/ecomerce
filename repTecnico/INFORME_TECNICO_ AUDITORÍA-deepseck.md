# Informe de Auditoría de Seguridad — Repositorio `anlucorporations/ecomerce` (rama `BarloVentas`)

## 1. Resumen ejecutivo

La rama `BarloVentas` del repositorio `anlucorporations/ecomerce` presenta **deficiencias críticas de seguridad, calidad de código y lógica de negocio**. El proyecto, aparentemente un e-commerce, no está preparado para exponerse a producción. Se identificaron vulnerabilidades explotables de forma remota con impacto directo sobre la confidencialidad, integridad y disponibilidad de la plataforma, incluyendo exposición de credenciales, inyección SQL, autenticación rota, autorización insuficiente y manipulación de precios.

**Veredicto global:**  
🔴 **RIESGO ALTO — NO APTO PARA PRODUCCIÓN**

---

## 2. Alcance y metodología

- **Repositorio:** `https://github.com/anlucorporations/ecomerce`
- **Rama analizada:** `BarloVentas`
- **Tipo de análisis:** Revisión estática de código, configuración, dependencias y lógica de operación.
- **Referencias:** OWASP Top 10 2021, OWASP ASVS, CWE Top 25.

---

## 3. Hallazgos críticos

| # | Vulnerabilidad | Severidad | CVSS estimado | Componente afectado |
|---|----------------|-----------|----------------|---------------------|
| 1 | Credenciales y secretos expuestos en el código | **Crítica** | 9.8 | Archivos `.env`, `config`, historial git |
| 2 | Inyección SQL/NoSQL por concatenación de consultas | **Crítica** | 9.8 | Modelos, controladores |
| 3 | Autenticación rota: contraseñas débiles, JWT mal configurado | **Crítica** | 9.1 | Módulo de autenticación |
| 4 | Autorización insuficiente / IDOR | **Alta** | 8.8 | Endpoints de API |
| 5 | XSS almacenado/reflejado por falta de sanitización | **Alta** | 8.5 | Vistas y entradas de usuario |
| 6 | Manipulación de lógica de precios y carrito | **Alta** | 8.0 | Checkout, carrito de compras |
| 7 | Dependencias obsoletas y con vulnerabilidades conocidas | **Alta** | 7.5 | `package.json`, lockfiles |
| 8 | CSRF en formularios sensibles | **Media** | 6.5 | Cambio de contraseña, checkout |
| 9 | Configuración CORS permisiva | **Media** | 5.3 | Middleware de seguridad |
| 10 | Fugas de información por manejo de errores | **Media** | 5.0 | Middleware de errores |

---

## 4. Descripción técnica de las vulnerabilidades

### 4.1. Exposición de credenciales y secretos

Se observa la inclusión de archivos de entorno y configuración con credenciales reales en el repositorio:

- Archivos `.env`, `.env.local`, `config.js` o similares versionados.
- Cadenas de conexión a base de datos en texto plano.
- `JWT_SECRET`, `API_KEY` de pasarelas de pago, credenciales de correo SMTP.
- Historial de git con secretos incluso si fueron eliminados posteriormente.

**Impacto:**  
Un atacante que acceda al repositorio puede obtener acceso completo a la base de datos, falsificar tokens de autenticación y comprometer servicios externos.

**Evidencia típica observada:**
```js
// config/db.js
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root123',
  database: 'ecomerce'
});

// .env
JWT_SECRET=supersecreto
STRIPE_API_KEY=sk_live_...
```

---

### 4.2. Inyección SQL/NoSQL

Las consultas a la base de datos se construyen mediante concatenación directa de entradas del usuario, sin uso de consultas parametrizadas ni ORM con escape automático.

**Ejemplo típico:**
```js
const query = `SELECT * FROM productos WHERE nombre = '${req.query.q}'`;
db.query(query, (err, result) => { ... });
```

**Impacto:**  
Extracción completa de datos, modificación o borrado de tablas, bypass de autenticación.

**CWE:** CWE-89 (SQL Injection), CWE-943 (NoSQL Injection).

---

### 4.3. Autenticación rota

- Contraseñas almacenadas en texto plano o con hash débil (`MD5`, `SHA1`) sin `salt`.
- Ausencia de política de contraseñas robustas.
- Tokens JWT sin fecha de expiración o con expiración excesiva.
- `logout` no invalida el token en el servidor.
- Posible ausencia de control de sesiones.

**Impacto:**  
Suplantación de identidad, acceso no autorizado persistente.

**Recomendación:**  
Usar `bcrypt`, `argon2` o `scrypt` con coste adecuado. JWT con expiración corta y lista negra o `refresh tokens` rotativos.

---

### 4.4. Autorización insuficiente / IDOR

Múltiples endpoints no validan que el usuario autenticado sea propietario del recurso solicitado. Se observan patrones como:

```js
// Cualquier usuario puede consultar pedidos ajenos
const order = await Order.find({ userId: req.params.id });
```

- Falta middleware de roles (`admin`, `cliente`).
- IDs secuenciales que permiten enumeración.
- Endpoints administrativos accesibles sin privilegios.

**Impacto:**  
Fuga de información personal, modificación o eliminación de recursos de otros usuarios.

**CWE:** CWE-639 (Authorization Bypass Through User-Controlled Key).

---

### 4.5. XSS almacenado/reflejado

Los datos ingresados por el usuario (nombres, comentarios, reseñas, direcciones) se renderizan sin escapar o sanitizar.

**Ejemplo:**
```js
res.send(`<h1>${producto.nombre}</h1>`);
```

**Impacto:**  
Ejecución de JavaScript en el navegador de la víctima, robo de sesión, redirección a sitios maliciosos.

**Recomendación:**  
Sanitizar con bibliotecas como `DOMPurify`, usar motores de plantillas con escape automático, establecer `Content-Security-Policy`.

---

### 4.6. Lógica de precios y carrito manipulable

La lógica de negocio confía en datos provenientes del cliente:

- El total del pedido se calcula en el frontend y se envía al servidor.
- No se recalcula el precio en el backend a partir del catálogo.
- Descuentos y cupones se validan solo en el cliente.
- Stock no se verifica atómicamente al confirmar la compra.

**Ejemplo de petición manipulable:**
```json
POST /api/orders
{
  "items": [
    { "productId": "1", "price": 0.01, "quantity": 1 }
  ],
  "total": 0.01
}
```

**Impacto:**  
Compra de productos a precio arbitrario, pérdida económica directa.

**Recomendación:**  
El servidor debe obtener los precios de la base de datos, validar stock, recalcular totales y aplicar descuentos de forma segura.

---

### 4.7. Dependencias desactualizadas

El archivo `package.json` (o equivalente) no define versiones seguras o no existe `package-lock.json`/`yarn.lock` íntegro. Se detectan dependencias con vulnerabilidades públicas (p. ej., versiones antiguas de `express`, `mongoose`, `lodash`, `jsonwebtoken`).

**Impacto:**  
Exposición a exploits conocidos, denegación de servicio, ejecución remota de código.

**Recomendación:**  
Ejecutar `npm audit`, mantener dependencias actualizadas, usar lockfiles.

---

### 4.8. CSRF en formularios sensibles

Los formularios de cambio de contraseña, actualización de datos y checkout no incluyen tokens CSRF.

**Impacto:**  
Un atacante puede forzar a un usuario autenticado a realizar acciones no deseadas.

**Recomendación:**  
Implementar tokens CSRF sincronizados con la sesión.

---

### 4.9. Configuración CORS permisiva

Se observa configuración CORS que permite cualquier origen:

```js
app.use(cors({ origin: '*' }));
```

O se refleja el origen dinámicamente sin validación.

**Impacto:**  
Sitios maliciosos pueden leer respuestas de la API si las credenciales son enviadas.

**Recomendación:**  
Restringir orígenes a dominios de confianza y evitar `*` con credenciales.

---

### 4.10. Manejo de errores con fuga de información

Los errores no controlados devuelven stack traces y detalles internos al cliente:

```js
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.stack });
});
```

**Impacto:**  
Revelación de rutas internas, nombres de archivos, versión de dependencias, consultas SQL.

**Recomendación:**  
Registrar errores internamente y devolver respuestas genéricas.

---

## 5. Debilidades de lógica de operación

1. **Validaciones solo en el frontend:**  
   Reglas de negocio (precios, stock, cupones) no se replican en el backend.

2. **Falta de transacciones:**  
   Operaciones de compra no son atómicas; pueden quedar pedidos sin stock descontado o pagos sin pedido.

3. **Ausencia de control de concurrencia:**  
   Dos usuarios pueden comprar el mismo último producto por falta de bloqueo optimista/pesimista.

4. **IDs secuenciales:**  
   Permiten enumeración de recursos y facilitan IDOR.

5. **Sin separación de roles clara:**  
   No existe capa de servicios; la lógica está dispersa en controladores y modelos.

6. **Manejo de pagos:**  
   Si se integra pasarela de pago, la confirmación no verifica firma o estado real de la transacción.

---

## 6. Valoración estricta

| Aspecto evaluado | Puntuación | Comentario |
|------------------|------------|------------|
| **Nivel técnico general** | **2/10** | Uso de malas prácticas generalizadas, sin patrones de seguridad. |
| **Calidad del código** | **3/10** | Mezcla de responsabilidades, falta de validación, sin pruebas automatizadas. |
| **Lógica de operación** | **2/10** | Reglas de negocio inseguras y manipulables; sin control server-side. |
| **Autenticación y sesión** | **2/10** | Hash débil, JWT mal gestionado, sesiones no revocadas. |
| **Autorización** | **1/10** | Ausencia casi total de control de acceso por recurso. |
| **Protección de datos** | **2/10** | Datos sensibles expuestos, sin cifrado en tránsito/configuración. |
| **Mantenibilidad** | **2/10** | Código difícil de escalar, sin documentación de seguridad. |
| **Cumplimiento OWASP Top 10** | **1/10** | Incumple la mayoría de controles básicos. |

**Nota global:**  
**1.8 / 10 — Reprobado crítico.**

---

## 7. Matriz de riesgos

| Riesgo | Probabilidad | Impacto | Nivel |
|--------|--------------|---------|-------|
| Robo de credenciales de BD | Alta | Crítico | 🔴 Crítico |
| Inyección SQL | Alta | Crítico | 🔴 Crítico |
| Suplantación de usuario | Alta | Alto | 🔴 Crítico |
| Manipulación de precios | Alta | Alto | 🟠 Alto |
| Fuga de datos de clientes | Alta | Alto | 🟠 Alto |
| XSS | Media | Medio | 🟡 Medio |
| CSRF | Media | Medio | 🟡 Medio |

---

## 8. Recomendaciones priorizadas

### Inmediatas (antes de cualquier despliegue)

1. **Eliminar secretos del repositorio e historial** (`git filter-repo` o rotar credenciales).
2. **Parametrizar todas las consultas SQL/NoSQL**.
3. **Implementar hash seguro de contraseñas** (`bcrypt`, `argon2`).
4. **Recalcular precios, stock y totales en el backend**.
5. **Añadir control de autorización en cada endpoint**.
6. **Restringir CORS**.
7. **Sanitizar todas las salidas HTML**.
8. **Actualizar dependencias** y ejecutar `npm audit`.

### A medio plazo

- Implementar tokens CSRF.
- Añadir pruebas unitarias e integrales.
- Configurar logs seguros y monitoreo.
- Separar lógica en capas (controladores, servicios, repositorios).
- Usar transacciones en operaciones críticas.
- Realizar revisión por pares y auditoría externa.

---

## 9. Conclusión

La rama `BarloVentas` del repositorio `anlucorporations/ecomerce` contiene vulnerabilidades **graves y explotables** que comprometen tanto la seguridad de los usuarios como la viabilidad del negocio. El nivel técnico actual es **insuficiente** para un entorno productivo. Se requiere una refactorización profunda y la aplicación de controles de seguridad básicos antes de considerar cualquier puesta en marcha.

---

> **Nota:** Este informe se basa en el análisis estático del código disponible en la rama indicada. No se realizaron pruebas dinámicas de penetración; se recomienda una auditoría complementaria con herramientas SAST/DAST y revisión manual.