import {getPool} from "../../config/db";
import Logger from "../../config/logger";

const getIdByToken = async (token: string): Promise<any> => {
    Logger.info("getting user id from token");
    const query = "SELECT id FROM user WHERE auth_token = (?)";
    const conn = await getPool().getConnection();
    try {
        const [result] = await conn.query(query, [token]);
        return result;
    } catch (err) {
        Logger.error(err);
    } finally {
        await conn.release();
    }
    return;
}

const getDirectorIdByFilm = async (id: number): Promise<any> => {
    Logger.info(`getting director_id of film ${id}`);
    const query = "SELECT director_id FROM film WHERE id = (?)";
    const conn = await getPool().getConnection();
    try {
        const [result] = await conn.query(query, [id]);
        return result;
    } catch (err) {
        Logger.error(err);
    } finally {
        await conn.release();
    }
    return;
}

export {getIdByToken, getDirectorIdByFilm}