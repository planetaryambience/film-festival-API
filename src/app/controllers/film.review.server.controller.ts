import {Request, Response} from "express";
import Logger from "../../config/logger";

import * as reviews from "../models/film.review.server.model";
import {validate} from "../resources/validate";
import * as schemas from "../resources/schemas.json";
import * as server from "../models/common.server.model";

const getReviews = async (req: Request, res: Response): Promise<void> => {
    try{
        const id = parseInt(req.params.id, 10);
        // check if id is a number
        if (isNaN(id)) {
            Logger.error("invalid id");
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }

        // check film exists
        const isExistingFilm = await reviews.checkFilmExists(id);
        if (!isExistingFilm) {
            Logger.error(`no film with id ${id}`);
            res.statusMessage = "Not Found";
            res.status(404).send();
            return;
        }

        const result = await reviews.getReviews(id);
        if (result === null) {
            res.statusMessage = "OK";
            res.status(200).send("No reviews for this film yet!");
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

const addReview = async (req: Request, res: Response): Promise<void> => {
    try{
        // input validation
        const id = parseInt(req.params.id, 10);
        const validation = await validate(schemas.film_review_post, req.body);
        if (validation !== true) {
            Logger.error(validation.toString());
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }
        // check id is a number
        if (isNaN(id)) {
            Logger.error("invalid id");
            res.statusMessage = "Bad Request";
            res.status(400).send();
            return;
        }

        // check film exists
        const isExistingFilm = await reviews.checkFilmExists(id);
        if (!isExistingFilm) {
            Logger.error(`no film with id ${id}`);
            res.statusMessage = "Not Found";
            res.status(404).send();
            return;
        }

        const rating = req.body.rating;
        let review = req.body.review;
        const currDate = new Date();
        const filmReleaseDate = await reviews.getFilmReleaseDate(id);
        const token = req.header('X-Authorization');
        const userId = await server.getIdByToken(token);
        const directorId = await server.getDirectorIdByFilm(id);

        if (userId.length === 0) {
            Logger.error("not allowed to review film")
            res.statusMessage = "Unauthorized";
            res.status(401).send();
            return;
        }

        const hasAlreadyReviewed = await reviews.checkReviewExists(id, userId[0].id);
        if (directorId[0].director_id === userId[0].id || filmReleaseDate[0].release_date > currDate.toISOString()) {
            Logger.error("cannot review your own film, or cannot post a review on a film that has not yet released");
            res.statusMessage = "Forbidden";
            res.status(403).send();
            return;
        } else if (hasAlreadyReviewed) {
            Logger.error("cannot review film more than once");
            res.statusMessage = "Forbidden";
            res.status(403).send();
            return;
        } else {
            Logger.info("passed all validation");
            if (!review) {
                review = null;
            }
            await reviews.addReview(id, userId[0].id, rating, review, currDate);
            res.statusMessage = "Created";
            res.status(201).send();
            return;
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

export {getReviews, addReview}
