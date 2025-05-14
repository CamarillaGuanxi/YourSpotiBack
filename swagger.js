import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { config } from 'dotenv';
config()
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'YouSpoti API',
            version: '1.0.0',
            description: 'API para la integración entre Spotify y YouTube',
        },
        servers: [
            {
                url: "http://localhost:" + process.env.PORT,
                description: 'Servidor local',
            },
        ],
    },
    apis: ['./routes/*.js'], // Archivos donde están las rutas
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app) => {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};