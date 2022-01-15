// POST /api/returns_new {customerId, movieId}

// return 401 if client is not logged in
// return 400 if customerId is not provided
// return 400 if movieId is not provided.
// return 404 if no rental found for this customer/movie
// Return 400 if rental already processed.
// Return 200 if valid request
// Set the return date
// Calcuate the rental fee
// Increase the stock
// Return the rental

const { Rental } = require('../../models/rental');
const mongoose = require('mongoose');
const request = require('supertest');
const { User } = require('../../models/user');
const { Movie } = require('../../models/movie');
const moment = require('moment');

describe('POST /api/returns_new', () => {
    let server;
    let customerId;
    let movieId;
    let rental;
    let movie;
    let token;

    const exec = () => {
        return request(server)
            .post('/api/returns_new')
            .set('x-auth-token', token)
            .send({ customerId, movieId });
    };

    beforeEach(async () => {
        server = require('../../index');
        customerId = mongoose.Types.ObjectId();
        movieId = mongoose.Types.ObjectId();

        token = new User().generateAuthToken();

        movie = new Movie({
            _id: movieId,
            title: '12345',
            dailyRentalRate: 2,
            numberInStock: 10,
            genre: { name: '12345' }
        });

        await movie.save();

        // save a rental.
        rental = new Rental({
            customer: {
                _id: customerId,
                name: '12345',
                phone: '12345'
            },
            movie: {
                _id: movieId,
                title: '12345',
                dailyRentalRate: 2
            }
        });

        await rental.save();

    });

    afterEach(async () => {
        await server.close();
        await Rental.remove({});
    });

    it('it should work!', async () => {
        try {
            const result = await Rental.findById(rental._id);
            expect(result).not.toBeNull();
        } catch (err) {
            console.log('Error', err.message);
        }
    });

    it('return 401 if client is not logged in', async () => {
        token = '';
        const res = await exec();
        expect(res.status).toBe(401);
    });

    it('return 400 if customerId is not provided', async () => {
        customerId = '';
        const res = await exec();
        expect(res.status).toBe(400);
    });

    it('return 400 if movieId is not provided', async () => {
        movieId = '';
        const res = await exec();
        expect(res.status).toBe(400);
    });

    it('return 404 if no rental found for this customer/movie', async () => {
        await Rental.remove({});
        const res = await exec();
        expect(res.status).toBe(404);
    });

    it('return 400 if rental already processed', async () => {
        rental.dateReturned = new Date();
        await rental.save();

        const res = await exec();
        expect(res.status).toBe(400);
    });

    // Return 200 if valid request
    it('return 200 if valid request', async () => {
        const res = await exec();
        expect(res.status).toBe(200);
    });

    // Set the return date
    it('return a valid return date', async () => {
        const res = await exec();
        const rentalInDb = await Rental.findById(rental._id);
        const diff = new Date() - rentalInDb.dateReturned;
        expect(diff).toBeLessThan(10 * 1000);
    });

    // Calcuate the rental fee
    it('should return a correct rental fee', async () => {
        rental.dateOut = moment().add(-7, 'days').toDate();
        await rental.save();

        const res = await exec();

        const rentalInDb = await Rental.findById(rental._id);

        expect(rentalInDb.rentalFee).toBe(14);
    });

    // Increase the stock
    it('should increase the movie stock', async () => {
        const res = await exec();
        const movieInDb = await Movie.findById(movieId);
        expect(movieInDb.numberInStock).toBe(movie.numberInStock + 1);
    });


    // Return the rental
    it('should return rental if input is valid', async () => {
        const res = await exec();
        const rentalInDb = await Rental.findById(rental._id);
        expect(Object.keys(res.body))
            .toEqual(expect.arrayContaining(['dateOut', 'dateReturned', 'rentalFee', 'customer', 'movie']));
    });


});