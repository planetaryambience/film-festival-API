import {Request, Response} from "express";
import Logger from "../../config/logger";

import * as films from "../models/film.server.model";
import {validate} from "../resources/validate";
import * as schemas from "../resources/schemas.json";
import * as server from "../models/common.server.model";

const viewAll = async (req: Request, res: Response): Promise<void> => {
    Logger.info("getting list of films");
    try{
        // input validation (400 errors)
        const validation = await validate(schemas.film_search, req.query);
        if (validation !== true) {
            Logger.error(validation.toString());
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }
        // check genre exists and startIndex and count are integers
        let isExistingGenre = false;
        if (req.query.genreIds) {
            isExistingGenre = await films.checkGenreId(req.query.genreIds);
        }
        if ((req.query.genreIds && !isExistingGenre)
            || (req.query.count && isNaN(+req.query.count))
            || (req.query.startIndex && isNaN(+req.query.startIndex))) {
            Logger.error("invalid information");
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        } else {
          const result = await films.getAllFilms(req.query);
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

const getOne = async (req: Request, res: Response): Promise<void> => {
    try{
        const id = parseInt(req.params.id, 10);

        // check if ID is a number
        if (isNaN(id)) {
            Logger.error("invalid id");
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }

        const result = await films.getFilm(id);
        if (result === null) {
            Logger.error(`no film with id ${id}`);
            res.statusMessage = "Not Found";
            res.status(404).send();
            return;
        } else {
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

const addOne = async (req: Request, res: Response): Promise<void> => {
    try{
        // input validation
        const validation = await validate(schemas.film_post, req.body);
        if (validation !== true) {
            Logger.error(validation.toString());
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }

        // check authorisation
        const token = req.header('X-Authorization');
        const directorId = await server.getIdByToken(token);
        if (!token || directorId.length === 0) {
            Logger.error("not allowed to add film")
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }

        const title = req.body.title;
        const description = req.body.description;
        let releaseDate = req.body.releaseDate;
        const genreId = req.body.genreId;
        let runtime = req.body.runtime;
        let ageRating = req.body.ageRating;
        const currDate = new Date();
        const isExistingGenre = await films.checkGenreId(`${genreId}`);
        const isUniqueTitle = await films.checkTitleUnique(title);

        if (!isExistingGenre) {
            Logger.error("invalid information");
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        } else if (!isUniqueTitle || (releaseDate && releaseDate < currDate.toISOString())) {
            Logger.error("film title is not unique, or cannot release a film in the past");
            res.statusMessage = "Forbidden";
            res.status(403).send();
            return;
        } else {
            Logger.info("passed validation checks")
            if (!releaseDate) {
                releaseDate = currDate;
            }
            if (!runtime) {
                runtime = null;
            }
            if (!ageRating) {
                ageRating = "TBC";
            }

            const result = await films.addFilm(directorId[0].id, title, description, releaseDate, genreId, runtime, ageRating);
            res.statusMessage = "Created";
            res.status(201).send({"filmId": result.insertId});
            return;
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const editOne = async (req: Request, res: Response): Promise<void> => {
    try{
        // input validation
        const id = parseInt(req.params.id, 10);
        const validation = await validate(schemas.film_patch, req.body);
        if (validation !== true) {
            Logger.error(validation.toString());
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }

        const title = req.body.title;
        const description = req.body.description;
        const releaseDate = req.body.releaseDate;
        const genreId = req.body.genreId;
        const runtime = req.body.runtime;
        const ageRating = req.body.ageRating;
        const currDate = new Date();

        // check if ID is a number and if genreId exists
        let isExistingGenre = false;
        if (genreId) {
            isExistingGenre = await films.checkGenreId(`${genreId}`);
        }
        if (isNaN(id) || (genreId && !isExistingGenre)) {
            Logger.error("invalid film id");
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }

        const directorId = await server.getDirectorIdByFilm(id);
        const token = req.header('X-Authorization');
        const authId = await server.getIdByToken(token);
        const film = await films.getFilm(id);

        if (authId.length === 0 || !token) {
            Logger.error("unauthorized");
            res.statusMessage = "Not Authorised";
            res.status(401).send();
            return;
        } else if (!film) {
            Logger.error(`no film found with id ${id}`);
            res.statusMessage = "Not Found";
            res.status(404).send();
            return;
        } else if ((directorId[0].director_id !== authId[0].id) || (film.numReviews > 0)
            || (releaseDate && (releaseDate < currDate.toISOString()))
            || (film.releaseDate.toISOString() < currDate.toISOString())) {
            Logger.error("only the director of a film may change it, cannot change the releaseDate since it has already passed, cannot edit a film that has a review placed, or cannot release a film in the past");
            res.statusMessage = "Forbidden";
            res.status(403).send();
            return;
        } else {
            Logger.info("passed validation checks");
            // update title
            if (title && films.checkTitleUnique(title) && title !== film.title) {
                await films.updateValue('title', title, id);
            }
            // update description
            if (description && description !== film.description) {
                await films.updateValue('description', description, id);
            }
            // update release date
            if (releaseDate && releaseDate !== film.releaseDate) {
                await films.updateValue('release_date', releaseDate, id);
            }
            // update genre id
            if (genreId && genreId !== film.genreId) {
                await films.updateValue('genre_id', genreId, id);
            }
            // update runtime
            if (runtime && runtime !== film.runtime) {
                await films.updateValue('runtime', runtime, id);
            }
            // update age rating
            if (ageRating && ageRating !== film.ageRating) {
                await films.updateValue('age_rating', ageRating, id);
            }

            res.statusMessage = "OK";
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

const deleteOne = async (req: Request, res: Response): Promise<void> => {
    try{
        const id = parseInt(req.params.id, 10);

        // check if ID is a number
        if (isNaN(id)) {
            Logger.error("invalid film id");
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }

        const directorId = await server.getDirectorIdByFilm(id);
        const token = req.header('X-Authorization');
        const authId = await server.getIdByToken(token);
        const film = await films.getFilm(id);

        if (authId.length === 0 || !token) {
            Logger.error("unauthorized");
            res.statusMessage = "Not Authorised";
            res.status(401).send();
            return;
        } else if (!film) {
            Logger.error(`no film found with id ${id}`);
            res.statusMessage = "Not Found";
            res.status(404).send();
            return;
        } else if (directorId[0].director_id !== authId[0].id) {
            Logger.error("only the director of a film can delete it");
            res.statusMessage = "Forbidden";
            res.status(403).send();
            return;
        } else {
            Logger.info("passed validation checks");
            await films.deleteFilm(id);
            res.statusMessage = "OK";
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

const getGenres = async (req: Request, res: Response): Promise<void> => {
    try{
        const result = await films.getGenres();
        if (result === null) {
            Logger.error("no genres found");
            res.statusMessage = "Not Found";
            res.status(404).send();
            return;
        } else {
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

export {viewAll, getOne, addOne, editOne, deleteOne, getGenres};