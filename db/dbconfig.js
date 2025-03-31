import { MongoClient, ServerApiVersion } from 'mongodb';
import { config } from 'dotenv';
config();
const credentials = await process.env.MONGO_CREDENTIALS;
const dbstring = await process.env.MONGO_URI;
let database = undefined;

const client = new MongoClient(dbstring, {
    tlsCertificateKeyFile: credentials,
    serverApi: ServerApiVersion.v1
});

(async () => {
    try {
        await client.connect();
        database = client.db(process.env.MONGO_DB);
        console.log('Conexión exitosa a la base de datos.');

    } catch (error) {
        console.error('Error al conectar a la base de datos:', error.message);
    } 
})()

/*async function getClient() {
    return await client;
}*/

async function getConnection() {
    return await database;
}

export { getConnection };