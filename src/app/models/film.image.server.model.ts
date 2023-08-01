import {getPool} from "../../config/db";
import Logger from "../../config/logger";

import * as fs from "mz/fs";

const storagePath = "./storage/images/";

const checkFilmExists = async (id: number): Promise<boolean> => {
    Logger.info(`checking film with id ${id} exists`);
    const query = "SELECT id FROM film WHERE id = (?)";
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

const getFilmImage = async (id: number): Promise<any> => {
    Logger.info(`getting film ${id} image from database`);
    const conn = await getPool().getConnection();
    const query = 'SELECT image_filename AS img FROM film WHERE id = (?)';
    try {
        const [result] = await conn.query(query, [id]);
        if (result.length === 0 || result[0].img === null || result[0].img === "") {
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
    Logger.info(`adding image for film ${id}`);
    const query = "UPDATE film SET image_filename = (?) WHERE id = (?)";
    const conn = await getPool().getConnection();
    try {
        const fileType = imageType.split("/");
        const fileName = `film_${id}.${fileType[1]}`;
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
    // returns boolean: if film had existing image
    Logger.info(`deleting image from film ${id}`);
    const query = "UPDATE film SET image_filename = null WHERE id = (?)";
    const conn = await getPool().getConnection();
    try {
        // remove image from file system
        const existingImage = await getFilmImage(id);
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

export {checkFilmExists, getFilmImage, addImage, deleteImage}