import { ResultSetHeader } from "mysql2";
import {getPool} from "../../config/db";
import Logger from "../../config/logger";

const checkTitleUnique = async (title: string): Promise<boolean> => {
    Logger.info("checking if film title is unique");
    const query = "SELECT title FROM film WHERE title = (?)";
    const conn = await getPool().getConnection();
    try {
        const [result] = await conn.query(query, [title]);
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

const checkGenreId = async (genres: any): Promise<boolean> => {
    Logger.info("checking if genre is valid");
    const existingGenres = [];
    const query = "SELECT id FROM genre";
    const conn = await getPool().getConnection();
    try {
        const [result] = await conn.query(query);
        for (const i of result.keys()) {
            existingGenres.push(`${result[i].id}`);
        }
    } catch (err) {
        Logger.error(err);
    } finally {
        await conn.release()
    }

    if (typeof genres === "string") {
        return (genres in existingGenres);
    } else {
        for (const i of genres.keys()) {
            // returns false if one value not in validGenres,
            // even if other input genreIds are valid
            if (existingGenres.indexOf(genres[i]) === -1) {
                return false;
            }
        }
    }
    return true;
}

const getGenres = async (): Promise<Genre[]> => {
    Logger.info("getting genres from database");
    const query = "SELECT id, name FROM genre";
    const conn = await getPool().getConnection();
    try {
        const [result] = await conn.query(query);
        if (result.length === 0) {
            return null;
        }

        const response: Genre[] = [];
        for (const i of result.keys()) {
            const genre: Genre = {
                "genreId": result[i].id,
                "name": result[i].name
            }
            response.push(genre);
        }
        return response;
    } catch (err) {
        Logger.error(err);
    } finally {
        await conn.release();
    }
    return;
}

const getAllFilms = async (params: any): Promise<Films> => {
        Logger.info("getting matching films");

        let query = "WITH r AS (SELECT film.id AS id, " +
            "COALESCE((TRIM(FORMAT(AVG(film_review.rating), 2))+0), 0) AS rating " +
            "FROM film LEFT JOIN film_review ON film.id = film_review.film_id " +
            "JOIN user ON director_id = user.id " +
            "GROUP BY film.id, film_review.film_id) " +
            "SELECT film.id AS filmId, title, description, " +
            "genre_id AS genreId, director_id AS directorId, " +
            "first_name AS directorFirstName, " +
            "last_name AS directorLastName, " +
            "release_date AS releaseDate, " +
            "age_rating AS ageRating, r.rating AS rating " +
            "FROM r LEFT JOIN film ON r.id = film.id " +
            "LEFT JOIN film_review ON film.id = film_review.film_id " +
            "JOIN user ON director_id = user.id ";

        const conn = await getPool().getConnection();
        try {
            // where clause
            const whereClauses: string[] = [];
            const whereValues: string[] = [];
            if (params.q) {
                whereClauses.push(`(title LIKE '%${params.q}%' OR description LIKE '%${params.q}%')`);
            }
            if (params.genreIds) {
                whereClauses.push("genre_id IN (?)");
                whereValues.push(params.genreIds);
            }
            if (params.ageRatings) {
                whereClauses.push("age_rating IN (?)");
                whereValues.push(params.ageRatings);
            }
            if (params.directorId) {
                whereClauses.push(`director_id = ${params.directorId}`);
            }
            if (params.reviewerId) {
                whereClauses.push(`film_review.user_id = ${params.reviewerId}`);
            }
            if (whereClauses.length > 0) {
                query += " WHERE "
                for (const [i, val] of whereClauses.entries()) {
                    if (i === (whereClauses.length - 1)) {
                        query += `${val}`;
                    } else {
                        query += `${val} AND `;
                    }
                }
            }

            // group by
            query += " GROUP BY film.id, film_review.film_id";

            // order by
            let order: string = "";
            if (params.sortBy) {
                order += params.sortBy;
            }
            switch (order) {
                case "ALPHABETICAL_ASC":
                    order = "title ASC";
                    break;
                case "ALPHABETICAL_DESC":
                    order = "title DESC";
                    break;
                case "RELEASED_DESC":
                    order = "released_date DESC";
                    break;
                case "RATING_ASC":
                    order = "rating ASC";
                    break;
                case "RATING_DESC":
                    order = "rating DESC";
                    break;
                default:
                    order = "release_date ASC";
            }
            query += ` ORDER BY ${order}, film.id ASC`;

            // call query
            let result;
            if (whereValues) {
                [result] = await conn.query(query, whereValues);
            } else {
                [result] = await conn.query(query);
            }

            // removing description that was used for filtering from final results
            for (const index of result.keys()) {
                delete result[index].description;
            }

            // start index and limit
            let resultRows;
            let startIndex = 0;
            if (params.startIndex) {
                startIndex = params.startIndex;
            }
            if (params.count) {
                resultRows = result.slice(startIndex, startIndex + params.count);
            } else {
                resultRows = result.slice(startIndex);
            }

            const response: Films = {
                films: resultRows,
                count: result.length
            }
            return(response);
        } catch (err) {
            Logger.error(err);
        } finally {
            await conn.release();
        }
        return;
    }

const getFilm = async (id: number): Promise<Film> => {
    Logger.info(`getting film ${id} from database`);

    const query = "SELECT film.id AS filmId, title, genre_id AS genreId, " +
        "age_rating AS ageRating, director_id AS directorId, " +
        "first_name AS directorFirstName, last_name AS directorLastName, " +
        "COALESCE((TRIM(FORMAT(AVG(film_review.rating), 2))+0), 0) AS rating, " +
        "release_date AS releaseDate, description, runtime, count(film_review.id) AS numReviews " +
        "FROM film LEFT JOIN film_review ON film.id = film_review.film_id " +
        "JOIN user ON director_id = user.id " +
        "WHERE film.id = (?) " +
        "GROUP BY film.id, film_review.film_id";
    // getting number of reviews as "numReviews" as specified in Postman tests instead of "numRatings" in API spec.

    const conn = await getPool().getConnection();
    try {
        const [result] = await conn.query(query, [id]);
        if (result.length === 0) {
            return null;
        }
        return result[0];
    } catch (err) {
        Logger.error(err);
    } finally {
        await conn.release();
    }
    return;
}

const addFilm = async (directorId: number, title: string, description: string, releaseDate: Date,
    genreId: number, runtime: number, ageRating: string): Promise<ResultSetHeader> => {
    Logger.info(`adding film ${title} to database`);

    const query = "INSERT INTO film (director_id, title, description, release_date, genre_id, runtime, age_rating) VALUES (?,?,?,?,?,?,?)";

    const conn = await getPool().getConnection();
    try {
        const [result] = await conn.query(query, [directorId, title, description, releaseDate, genreId, runtime, ageRating]);
        return result;
    } catch (err) {
        Logger.error(err);
    } finally {
        await conn.release();
    }
    return;
}

const updateValue = async (col: string, val: any, id: number): Promise<void> => {
    Logger.info(`updating ${col}`);
    const query = `UPDATE film SET ${col} = (?) WHERE id = (?)`;
    const conn = await getPool().getConnection();
    try {
        await conn.query(query, [val, id]);
    } catch (err) {
        Logger.error(err);
    } finally {
        await conn.release();
    }
    return;
}

const deleteFilm = async (id: number): Promise<void> => {
    Logger.info(`deleting film ${id} from database`);
    const query = "DELETE FROM film WHERE id = (?)";
    const conn = await getPool().getConnection();
    try {
        await conn.query(query, [id]);
    } catch (err) {
        Logger.error(err);
    } finally {
        await conn.release();
    }
    return;
}

export {
    checkTitleUnique,
    checkGenreId,
    getGenres,
    getAllFilms,
    getFilm,
    addFilm,
    updateValue,
    deleteFilm
}