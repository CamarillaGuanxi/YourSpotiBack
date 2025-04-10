import { config } from 'dotenv';
import express from 'express';
import spotifyRoutes from './routes/spotify.routes.js';
import youtubeRoutes from './routes/youtube.routes.js';
import { connect } from 'mongoose';
import cookieParser from 'cookie-parser';
import cookiesRoutes from './routes/cookies.routes.js';
import axios from 'axios';
import cors from 'cors';
config();

let app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

app.use('/spotify', spotifyRoutes);
app.use('/youtube', youtubeRoutes);
app.use('/cookies', cookiesRoutes);
app.get('/ping', (req, res) => {
    console.log('someone pinged here');
    res.send('Pong');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
