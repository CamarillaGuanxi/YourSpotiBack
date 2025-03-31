import { config } from 'dotenv';
import express from 'express';
import spotifyRoutes from './routes/spotify.routes.js';
import youtubeRoutes from './routes/youtube.routes.js';
import { connect } from 'mongoose';
import cookieParser from 'cookie-parser';

config();

let app = express();
console.log('process.env', process.env.PORT);
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cookieParser());

app.use('/spotify', spotifyRoutes);
app.use('/youtube', youtubeRoutes);
app.get('/ping', (req, res) => {
    console.log('someone pinged here');
    res.send('Pong');
});

//connect();
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
