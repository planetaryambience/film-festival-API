import {Request, Response} from "express";
import Logger from "../../config/logger";

import * as users from "../models/user.server.model";
import * as schemas from "../resources/schemas.json";
import {validate} from "../resources/validate";
import * as server from "../models/common.server.model";

const register = async (req: Request, res: Response): Promise<void> => {
    Logger.http(`POST register user with email ${req.body.email}`);
    try{
        // input validation
        const validation = await validate(schemas.user_register, req.body);
        if (validation !== true) {
            Logger.error(validation.toString());
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }

        // check email not already being used
        const isNewEmail = await users.checkEmail(req.body.email);
        if (!isNewEmail) {
            Logger.error("email already in use");
            res.statusMessage = "Forbidden";
            res.status(403).send();
            return;
        }

        Logger.info("passed validation checks");
        const result = await users.register(req);
        res.statusMessage = "Created";
        res.status(201).send({"userId": result.insertId});
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const login = async (req: Request, res: Response): Promise<void> => {
    Logger.info("trying to log in user");
    try{
        // input validation
        const validation = await validate(schemas.user_login, req.body);
        if (validation !== true) {
            Logger.error(validation.toString());
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }

        const email = req.body.email;
        const password = req.body.password;
        const result = await users.login(email, password);

        if (result === null) {
            Logger.error("incorrect email/password");
            res.statusMessage = "Not Authorised";
            res.status(401).send();
        } else {
            Logger.info("user logged in");
            res.statusMessage = "OK";
            res.status(200).send(result);
            return;
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const logout = async (req: Request, res: Response): Promise<void> => {
    Logger.info("trying to log out user");
    try{
        const token = req.header('X-Authorization');
        const isAuth = await server.getIdByToken(token);

        // check authentication token
        if (isAuth.length !== 0) {
            await users.removeToken(token);
            res.statusMessage = "OK";
            res.status(200).send();
            return;
        } else {
            Logger.error("cannot log out if you are not authenticated");
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const view = async (req: Request, res: Response): Promise<void> => {
    Logger.info("getting user info from database");
    try {
        const id = parseInt(req.params.id, 10);
        const token = req.header('X-Authorization');

        if (isNaN(id)) {
            Logger.error("invalid user ID");
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }

        const result = await users.getUser(id, token);
        if (result === null) {
            Logger.error(`no user with id ${id}`);
            res.statusMessage = "Not Found";
            res.status(404).send();
            return;
        } else {
            res.statusMessage = "OK";
            res.status(200).send(result);
        }
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const update = async (req: Request, res: Response): Promise<void> => {
    Logger.info("updating user info");
    try{
        const email = req.body.email;
        const password = req.body.password;
        const currentPassword = req.body.currentPassword;
        const firstName = req.body.firstName;
        const lastName = req.body.lastName;
        const id = parseInt(req.params.id, 10);
        const token = req.header('X-Authorization');

        // input validation
        const validation = await validate(schemas.user_edit, req.body);
        if (validation !== true) {
            Logger.error(validation.toString());
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }

        // check id is a number
        if (isNaN(id)) {
            Logger.error("invalid user ID");
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }

        // check user exists
        const user = await users.getUser(id);
        if (user === null) {
            Logger.error(`no user with id ${id}`);
            res.statusMessage = "Not Found";
            res.status(404).send();
            return;
        }

        const userId = await server.getIdByToken(token);
        const isNewEmail = await users.checkEmail(email);

        // 401 error checks
        if (currentPassword) {
            const isPassword = await users.checkPassword(id, currentPassword);
            if (!isPassword) {
                Logger.error("invalid currentPassword");
                res.statusMessage = "Not Authorised";
                res.status(401).send();
                return;
            }
        }
        if (userId.length === 0 || !token) {
            Logger.error("unauthorized");
            res.statusMessage = "Not Authorised";
            res.status(401).send();
            return;
        }

        // 403 error checks
        if (userId[0].id !== id || !isNewEmail || (password && currentPassword && (password === currentPassword))) {
            Logger.error("this is not your account, or the email is already in use, or identical current and new passwords")
            res.statusMessage = "Forbidden";
            res.status(403).send();
            return;
        }

        // update email
        if (email && isNewEmail && email !== user.email) {
            await users.updateValue('email', email, id);
        }
        // update password
        if (password && currentPassword) {
            await users.updateValue('password', password, id);
        } else if ((password && !currentPassword) || (!password && currentPassword)) {
            Logger.error("missing either new password or current password");
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }
        // update first name
        if (firstName && firstName !== user.firstName) {
            await users.updateValue('first_name', firstName, id);
        }
        // update last name
        if (lastName && lastName !== user.lastName) {
            await users.updateValue('last_name', lastName, id);
        }

        res.statusMessage = "OK";
        res.status(200).send();
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

export {register, login, logout, view, update}
