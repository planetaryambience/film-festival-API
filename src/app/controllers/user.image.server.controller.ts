import {Request, Response} from "express";
import mime from "mime";
import Logger from "../../config/logger";
import * as fs from "mz/fs";

import * as images from "../models/user.image.server.model";
import * as server from "../models/common.server.model";

const getImage = async (req: Request, res: Response): Promise<void> => {
    try{
        const id = parseInt(req.params.id, 10);

        // check if id is a number
        if (isNaN(id)) {
            Logger.error("invalid id");
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }

        const fileName = await images.getUserImage(id);
        if (fileName === null) {
            Logger.error("no user with specified ID, or user has no image");
            res.statusMessage = "Not Found";
            res.status(404).send();
            return;
        } else {
            Logger.info(`getting image '${fileName[0].img}'`);
            const storagePath = __dirname + "../../../../storage/images/";
            const fileExists = fs.existsSync(`./storage/images/${fileName[0].img}`);
            if (fileExists) {
                res.statusMessage = "OK";
                res.type(mime.getType(fileName[0].img));
                res.status(200).sendFile(fileName[0].img, {"root": storagePath});
                return;
            } else {
                Logger.error("no image found in /storage/images/...");
                res.statusMessage = "Not Found";
                res.status(404).send();
                return;
            }
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}


const setImage = async (req: Request, res: Response): Promise<void> => {
    try{
        const id = parseInt(req.params.id, 10);
        const imageType = req.header('Content-Type');
        const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

        // check id is a number and image type is accepted
        if (isNaN(id) || imageTypes.indexOf(imageType) < 0) {
            Logger.error("invalid information");
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }

        const token = req.header('X-Authorization');
        const userId = await server.getIdByToken(token);

        if (!token || userId.length === 0) {
            Logger.error("not authorized");
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }

        const isUser = await images.checkUserIdExists(userId[0].id);
        if (userId[0].id !== id) {
            Logger.error("can not change another user's profile photo");
            res.statusMessage = "Forbidden";
            res.status(403).send();
            return;
        }

        if (!isUser) {
            Logger.error(`no such user with id ${id} or file does not exist in database`);
            res.statusMessage = "Not Found";
            res.status(404).send();
            return;
        } else {
            // delete existing user image
            let hasExistingImage = false;
            const fileName = await images.getUserImage(id);
            const fileExists = fs.existsSync(`./storage/images/${fileName[0].img}`);
            if (fileExists) {
                hasExistingImage = await images.deleteImage(id);
            }
            await images.addImage(id, imageType, req.body);
            if (!hasExistingImage) {
                res.statusMessage = "Created"
                res.status(201).send();
                return;
            } else {
                res.statusMessage = "OK"
                res.status(200).send();
                return;
            }
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const deleteImage = async (req: Request, res: Response): Promise<void> => {
    try{
        const id = parseInt(req.params.id, 10);

        // check id is a number
        if (isNaN(id)) {
            Logger.error("invalid id");
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }

        const token = req.header('X-Authorization');
        const userId = await server.getIdByToken(token);

        if (!token || userId.length === 0) {
            Logger.error("not authorized");
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }

        const isUser = await images.checkUserIdExists(userId[0].id);
        const fileName = await images.getUserImage(id);
        const fileExists = fs.existsSync(`./storage/images/${fileName[0].img}`);

        if (!isUser || !fileExists) {
            Logger.error(`no such user with id ${id} or file does not exist in database`);
            res.statusMessage = "Not Found";
            res.status(404).send();
            return;
        } else if (userId[0].id !== id) {
            Logger.error("can not delete another user's profile photo");
            res.statusMessage = "Forbidden";
            res.status(403).send();
            return;
        } else {
            await images.deleteImage(id);
            res.statusMessage = "OK"
            res.status(200).send();
            return;
        }

    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

export {getImage, setImage, deleteImage}