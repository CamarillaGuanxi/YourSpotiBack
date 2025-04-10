import { autentication } from './spotify.controller.js';
export const checkCookies = async (req, res) => {
    const userLogged = req.cookies.user_id;
    console.log('userLogged', userLogged);

    if (userLogged) {
        await autentication(req, res);
    } else {

        await autentication(req, res);
    }

}