# 🎧 YourSpoti – Backend

Este repositorio contiene el backend de **YourSpoti**, una aplicación web que permite **migrar playlists entre YouTube y Spotify** de forma automática y segura. Esta API está desarrollada con **Node.js** y **Express**, y se encarga de la lógica de autenticación, consulta de datos en las APIs externas y migración de listas.

## 🌐 Funcionalidades

- Autenticación OAuth 2.0 con **YouTube** y **Spotify**.
- Gestión de tokens seguros.
- Obtención de playlists y canciones desde ambas plataformas.
- Creación automática de playlists migradas en la plataforma destino.
- Documentación Swagger de los endpoints.
- Comunicación con frontend vía API REST.

## 📦 Tecnologías utilizadas

- **Node.js** + **Express**
- **MongoDB** (almacenamiento de usuarios)
- **dotenv** (configuración de variables de entorno)
- **CORS**
- **Swagger**
- **Crypto**
- **OAuth 2.0**

## ⚙️ Instalación y ejecución

### 1. Clonar el repositorio

```bash
git clone https://github.com/CamarillaGuanxi/YourSpotiBack
cd YourSpotiBack
```

### 2. Instalar dependencias

```bash
npm install
```

### 4. Ejecutar servidor

```bash
node index.js
```

La API estará disponible en: `http://localhost:3000`

La documentación Swagger estará en: `http://localhost:3000/api-docs`

## 📁 Estructura del proyecto

```
yourspoti-backend/
├── index.js                # Entrada principal
├── routes/                 # Rutas organizadas por servicio
│   ├── auth.js
│   ├── spotify.js
│   └── youtube.js
├── controller/              # Lógica de negocio
├── utils/                 # Utilidades como cifrado y helpers
├── .env
├── package.json
└── swagger/               # Configuración Swagger
```

## 🔐 Autenticación

El backend usa **OAuth 2.0** para obtener permisos seguros del usuario y acceder a sus datos de Spotify y YouTube. Los tokens se almacenan temporalmente y se usan para migrar los datos solicitados.

## 📡 Rutas principales

- **Autenticación:** `/authentication`
- **Spotify:** `/spotify/playlists`, `/spotify/playlists/migration`
- **YouTube:** `/youtube/playlists`, `/youtube/playlists/migration`

Consulta todos los endpoints en la [documentación Swagger](http://localhost:3000/api-docs).

## 🤝 Comunicación con el Frontend

Esta API se comunica con la aplicación frontend de Vue.js a través de solicitudes RESTful. Asegúrate de que las URLs y puertos estén configurados correctamente y que **CORS** esté habilitado para permitir el intercambio de datos.

## ✍️ Autor

- **Valentino Dominguez Rabanal**  
  Proyecto final de asignatura – IOT

