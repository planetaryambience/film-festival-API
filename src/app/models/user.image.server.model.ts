import {getPool} from "../../config/db";
import Logger from "../../config/logger";

import * as fs from "mz/fs";

const storagePath = "./storage/images/";

const checkUserIdExists = async (id: number): Promise<boolean> => {
    Logger.info(`checking user with id ${id} exists`);
    const query = "SELECT id FROM user WHERE id = (?)";
    const conn = await getPool().getConnection();
    try {
        const [result] = await conn.query(query, [id]);
        if (result.length === 0) {
            return false;
        }
        return true;
    } catch (err) {
        Logger.error(err);
    } finally {
        await conn.release();
    }
    return;
}

const getUserImage = async (id: number): Promise<any> => {
    Logger.info(`getting user ${id} image from database`);
    const query = 'SELECT image_filename AS img FROM user WHERE id = (?)';
    const conn = await getPool().getConnection();
    try {
        const [result] = await conn.query(query, [id]);
        if (result.length === 0 || result[0] === null || result[0].img === "") {
            return null;
        }
        return result;
    } catch (err) {
        Logger.error(err);
    } finally {
        await conn.release();
    }
    return;
}

const addImage = async (id: number, imageType: string, image: any): Promise<any> => {
    Logger.info(`adding image for user ${id}`);
    const query = "UPDATE user SET image_filename = (?) WHERE id = (?)";
    const conn = await getPool().getConnection();
    try {
        const fileType = imageType.split("/");
        const fileName = `user_${id}.${fileType[1]}`;
        const [result] = await conn.query(query, [fileName, id]);

        // add image to file system
        await fs.writeFile((storagePath + fileName), image);

        return result;
    } catch (err) {
        Logger.error(err);
    } finally {
        await conn.release();
    }
    return;
}

const deleteImage = async (id:number): Promise<any> => {
    Logger.info(`deleting image from user ${id}`);
    const query = "UPDATE user SET image_filename = null WHERE id = (?)";
    const conn = await getPool().getConnection();
    try {
        // remove image from file system
        const existingImage = await getUserImage(id);
        if (existingImage.length !== null) {
            await fs.unlink(storagePath + existingImage[0].img);
            return true;
        }

        await conn.query(query, [id]);
        return false;
    } catch (err) {
        Logger.error(err);
    } finally {
        await conn.release();
    }
    return;
}

export {checkUserIdExists, getUserImage, addImage, deleteImage}