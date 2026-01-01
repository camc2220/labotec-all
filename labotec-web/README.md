# LABOTEC Web (React + Tailwind + Vite)

## Configuración
1. Copia `.env.example` a `.env` y ajusta:
```
VITE_API_BASE=http://localhost:8080
```

2. Instala y levanta
```bash
npm i
npm run dev   # http://localhost:5173
```

3. Producción (Docker)
```bash
docker build -t labotec-web .
docker run -p 8081:80 labotec-web
# Abre http://localhost:8081
```

## Credenciales de prueba
- Usuario: `admin`
- Contraseña: `Admin#2025!`
