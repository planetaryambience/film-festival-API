type Films = {
    films: [
        {
            filmId: number,
            title: string,
            genreId: number,
            directorId: number,
            directorFirstName: string,
            directorLastName: string,
            releaseDate: Date,
            ageRating: string,
            rating: number
        }
    ],
    count: number
}

type Film = {
    filmId: number,
    title: string,
    genreId: number,
    ageRating: string,
    directorId: number,
    directorFirstName: string,
    directorLastName: string,
    rating: number,
    releaseDate: Date,
    description: string,
    runtime: number,
    numReviews: number
}

type Genre = {
    genreId: number,
    name: string
}

type Review = {
    reviewerId: number,
    rating: number,
    review: string,
    reviewerFirstName: string,
    reviewerLastName: string,
    timestamp: Date
}