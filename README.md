# Labotec – Railway ready

Monorepo con el backend ASP.NET 8 (`Labotec.Api`) y el frontend Vite (`labotec-web`). El backend incluye migraciones automáticas y se seeds de datos iniciales (roles, usuario admin y exámenes) al iniciar.

## Despliegue en Railway
Railway puede construir cada carpeta con su respectiva `Dockerfile`. La API expone el puerto `8080` y el frontend el `80` de Nginx.

1. **Crear el servicio de base de datos**: agrega un recurso MySQL en Railway. La API se inicializará aplicando migraciones automáticamente.
2. **Servicio `api`** (backend):
   - Fuente: `Labotec.Api/Dockerfile` (puerto 8080).
   - Variables de entorno recomendadas:
     - `ASPNETCORE_URLS=http://0.0.0.0:8080`
     - `ConnectionStrings__Default=Server=${MYSQLHOST};Port=${MYSQLPORT};Database=${MYSQLDATABASE};Uid=${MYSQLUSER};Pwd=${MYSQLPASSWORD};SslMode=Preferred;`
     - `Jwt__Issuer=Labotec.Api`
     - `Jwt__Audience=Labotec.Client`
     - `Jwt__Key=<genera_una_clave_larga_y_secreta>`
     - `Cors__AllowedOrigins__0=https://<dominio-frontend>` (agrega más índices si necesitas varios orígenes).
     - Al usar almacenamiento de archivos: `Storage__Provider=File` y, opcionalmente, `Storage__File__PublicBaseUrl=https://<dominio-api>/` para enlaces públicos a `/uploads`.
     - Para Azure Blob en su lugar: `Storage__Provider=Azure`, `Storage__Azure__ConnectionString`, `Storage__Azure__Container` y `Storage__Azure__CdnUrl`.
3. **Servicio `web`** (frontend):
   - Fuente: `labotec-web/Dockerfile` (puerto 80).
   - Variable de entorno: `VITE_API_BASE=https://<dominio-api>`.
4. **Dominios**: asigna un dominio al backend y otro al frontend. Añade el dominio del frontend en CORS del API y configura `VITE_API_BASE` para apuntar al backend.

## Desarrollo local

1. **Backend**: dentro de `Labotec.Api` crea/ajusta `appsettings.json` (puedes copiar `appsettings.Template.json`, o usar variables de entorno) y ejecuta:
   ```bash
   dotnet restore
   dotnet run
   ```
   La API aplicará migraciones y sembrará datos al iniciar.
2. **Frontend**: dentro de `labotec-web` instala dependencias y levanta Vite:
   ```bash
   npm install
   npm run dev
   ```
   Configura `VITE_API_BASE` en un `.env` local si no quieres usar `http://localhost:8080`.
