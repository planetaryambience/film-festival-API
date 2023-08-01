import {getPool} from "../../config/db";
import Logger from "../../config/logger";
import {ResultSetHeader} from "mysql2";

import bcrypt from 'bcrypt';
import {uid} from "rand-token";

const hash = async (password: string) => {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(password, salt)
}

const checkEmail = async (email: string): Promise<boolean> => {
    Logger.info(`checking if ${email} already in use`);
    const query = "SELECT email FROM user WHERE email = (?)";
    const conn = await getPool().getConnection();
    try {
        const [result] = await conn.query(query, [email]);
        if (result.length === 0) {
            return true;
        }
        return false;
    } catch (err) {
        Logger.error(err);
    } finally {
        await conn.release();
    }
    return;
}

const checkPassword = async (id: number, password:string): Promise<boolean> => {
    Logger.info("checking password");
    const query = "SELECT password FROM user WHERE id = (?)";
    const conn = await getPool().getConnection();
    try {
        const [result] = await conn.query(query, [id]);
        const isPassword = await bcrypt.compare(password, result[0].password);
        return isPassword;
    } catch (err) {
        Logger.error(err);
    } finally {
        await conn.release();
    }
    return;
}

const getUser = async (id: number, token?: string): Promise<User> => {
    Logger.info(`getting user ${id} from database`);
    const query = "SELECT email, first_name, last_name, auth_token FROM user WHERE id = (?)";
    const conn = await getPool().getConnection();
    try {
        const [result] = await conn.query(query, [id]);
        if (result.length === 0) {
            return null;
        }

        const response: User = {
            firstName: result[0].first_name,
            lastName: result[0].last_name
        }
        // include email if user is logged in/authenticated
        if (result[0].auth_token !== null && result[0].auth_token === token) {
            response.email = result[0].email;
        }
        return response;
    } catch (err) {
        Logger.error(err);
    } finally {
        await conn.release();
    }
    return;
}

const register = async (req: any): Promise<ResultSetHeader> => {
    const email = req.body.email;
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const password = await hash(req.body.password);

    Logger.info(`adding ${email} to database`);

    const conn = await getPool().getConnection();
    try {
        const query = "INSERT INTO user (email, first_name, last_name, password) VALUES (?,?,?,?)";
        const [result] = await conn.query(query, [email, firstName, lastName, password]);
        return result;
    } catch (err) {
        Logger.error(err);
    } finally {
        await conn.release();
    }
    return;
}

const login = async (email: string, password: string): Promise<UserLogin> => {
    Logger.info(`trying to log in ${email}`);

    const query = "SELECT id, password FROM user WHERE email = (?)";
    const conn = await getPool().getConnection();
    try {
        const [result] = await conn.query(query, [email]);
        const isPassword = await bcrypt.compare(password, result[0].password);
        if (!isPassword || result.length === 0) {
            return null;
        }

        const userToken = uid(32);
        const response: UserLogin = {
            userId: result[0].id,
            token: userToken
        }
        await insertToken(result[0].id, userToken);
        return response;
    } catch (err) {
        Logger.error(err);
    } finally {
        await conn.release();
    }
    return;
}

const insertToken = async(id: number, token: string): Promise<void> => {
    Logger.info("adding authentication token to user");
    const conn = await getPool().getConnection();
    try {
        const query = "UPDATE user SET auth_token = (?) WHERE id = (?)";
        await conn.query(query, [token, id]);
    } catch (err) {
        Logger.error(err);
    } finally {
        await conn.release();
    }
    return;
}

const removeToken = async(token: string): Promise<void> => {
    Logger.info("removing authentication token from usee");
    const conn = await getPool().getConnection();
    try {
        const query = "UPDATE user SET auth_token = null WHERE auth_token = (?)";
        await conn.query(query, [token]);
    } catch (err) {
        Logger.error(err);
    } finally {
        await conn.release();
    }
    return;
}

const updateValue = async (col: string, val: any, id: number): Promise<void> => {
    Logger.info(`updating ${col}`);
    const conn = await getPool().getConnection();
    try {
        if (col === "password") {
            val = await hash(val);
        }
        const query = `UPDATE user SET ${col} = (?) WHERE id = (?)`;
        await conn.query(query, [val, id]);
    } catch (err) {
        Logger.error(err);
    } finally {
        await conn.release();
    }
    return;
}

export {
    checkEmail,
    checkPassword,
    getUser,
    register,
    login,
    insertToken,
    removeToken,
    updateValue,
    hash
}
