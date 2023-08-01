import {Express} from "express";
import {rootUrl} from "./base.server.routes";
import * as film from '../controllers/film.server.controller';
import * as filmImages from '../controllers/film.image.server.controller';
import * as filmReviews from '../controllers/film.review.server.controller';

module.exports = (app: Express) => {
    app.route(rootUrl+'/films')
        .get(film.viewAll)
        .post(film.addOne);

    app.route(rootUrl+'/films/genres')
        .get(film.getGenres);

    app.route(rootUrl+'/films/:id')
        .get(film.getOne)
        .patch(film.editOne)
        .delete(film.deleteOne);

    app.route(rootUrl+'/films/:id/reviews')
        .get(filmReviews.getReviews)
        .post(filmReviews.addReview);

    app.route(rootUrl+'/films/:id/image')
        .get(filmImages.getImage)
        .put(filmImages.setImage);
}