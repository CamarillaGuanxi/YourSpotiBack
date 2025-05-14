import { config } from 'dotenv';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import spotifyRoutes from './routes/spotify.routes.js';
import youtubeRoutes from './routes/youtube.routes.js';
import authenticationRoutes from './routes/authentication.routes.js';
import { setupSwagger } from './swagger.js';

config();

const app = express();
const PORT = process.env.PORT;

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: process.env.FRONT,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

// Configuración de rutas
app.use('/spotify', spotifyRoutes);
app.use('/youtube', youtubeRoutes);
app.use('/authentication', authenticationRoutes);

// Configuración de Swagger
setupSwagger(app);

app.get('/ping', (req, res) => {
    console.log('Ping received');
    res.send('Pong');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
