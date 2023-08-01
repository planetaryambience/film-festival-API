import {ResultSetHeader} from "mysql2";
import {getPool} from "../../config/db";
import Logger from "../../config/logger";

const checkFilmExists = async (id: number): Promise<boolean> => {
    Logger.info(`checking film ${id} exists`);
    const query = "SELECT id FROM film WHERE id = (?)";
    const conn = await getPool().getConnection();
    try {
        const [result] = await conn.query(query, id);
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

const checkReviewExists = async (filmId: number, reviewerId: number): Promise<boolean> => {
    Logger.info(`checking if user ${reviewerId} has already left a review for film ${filmId}`);
    const query = "SELECT id FROM film_review WHERE film_id = (?) AND user_id = (?)";
    const conn = await getPool().getConnection();
    try {
        const [result] = await conn.query(query, [filmId, reviewerId]);
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

const getFilmReleaseDate = async (id: number): Promise<any> => {
    Logger.info("getting film release date");
    const query = "SELECT release_date FROM film WHERE id = (?)";
    const conn = await getPool().getConnection();
    try {
        const [result] = await conn.query(query, id);
        return result;
    } catch (err) {
        Logger.error(err);
    } finally {
        await conn.release();
    }
    return;
}

const getReviews = async (id: number): Promise<Review[]> => {
    Logger.info(`getting reviews for film ${id}`);
    const query = "SELECT user_id AS reviewerId, rating, review, "
        + "first_name AS reviewerFirstName, last_name AS reviewerLastName, timestamp "
        + "FROM film_review JOIN user ON user_id = user.id "
        + "WHERE film_id = (?) "
        + "ORDER BY timestamp DESC";
    const conn = await getPool().getConnection();
    try {
        const [result] = await conn.query(query, id);
        return result;
    } catch (err) {
        Logger.error(err);
    } finally {
        await conn.release();
    }
    return;
}

const addReview = async (filmId: number, userId: number, rating: number, review: string, timestamp: Date): Promise<ResultSetHeader> => {
    Logger.info("adding review for film to database");
    const query = "INSERT INTO film_review (film_id, user_id, rating, review, timestamp) VALUES (?,?,?,?,?)";
    const conn = await getPool().getConnection();
    try {
        const [result] = await conn.query(query, [filmId, userId, rating, review, timestamp]);
        return result;
    } catch (err) {
        Logger.error(err);
    } finally {
        await conn.release();
    }
    return;
}

export {checkFilmExists, checkReviewExists, getFilmReleaseDate, getReviews, addReview}