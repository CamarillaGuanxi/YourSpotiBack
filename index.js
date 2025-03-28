import { config } from 'dotenv';
import express from 'express';
import spotifyRoutes from './routes/spotify.routes.js';

config();

let app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.use('/spotify', spotifyRoutes);

app.get('/ping', (req, res) => {
    console.log('someone pinged here');
    res.send('Pong');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
