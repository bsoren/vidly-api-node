const express = require('express');
const router = express.Router();
const { Rental } = require('../models/rental');
const { Movie } = require('../models/movie');
const auth = require('../middleware/auth');
const moment = require('moment');

router.post('/', auth, async (req, res) => {
    const { customerId, movieId } = req.body;

    if (!customerId) return res.status(400).send('Invalid customerId');

    if (!movieId) return res.status(400).send('Invalid movieId');

    const rental = await Rental.findOne({ 'customer._id': customerId, 'movie._id': movieId });

    if (!rental) return res.status(404).send('rental not found');

    if (rental.dateReturned) return res.status(400).send('rental already processed');

    rental.dateReturned = new Date();
    const rentalDays = moment().diff(rental.dateOut, 'days');
    rental.rentalFee = rentalDays * rental.movie.dailyRentalRate;
    await rental.save();

    await Movie.update({ _id: rental.movie._id }, {
        $inc: { numberInStock: 1 }
    });

    return res.status(200).send(rental);

});

module.exports = router;