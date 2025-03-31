export const checkCookies = async (req, res) => {
    const userLogged = req.cookies.user_id;
    if (userLogged) {
        res.redirect('/spotify/autenticate');
    } else {
        res.redirect('/spotify/callback');
    }

}