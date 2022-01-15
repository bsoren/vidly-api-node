const { Rental, validate } = require("../models/rental");
const { Movie } = require("../models/movie");
const { Customer } = require("../models/customer");
const auth = require("../middleware/auth");
const mongoose = require("mongoose");
const Fawn = require("fawn");
const express = require("express");
const router = express.Router();

Fawn.init(mongoose);

router.get("/", auth, async (req, res) => {
  const rentals = await Rental.find()
    .select("-__v")
    .sort("-dateOut");
  res.send(rentals);
});

router.put("/:id", async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const customer = await Customer.findById(req.body.customerId);
  if (!customer) return res.status(400).send("Invalid customer.");

  const movie = await Movie.findById(req.body.movieId);
  if (!movie) return res.status(400).send("Invalid movie.");

  if (movie.numberInStock === 0)
    return res.status(400).send("Movie not in stock.");

  const rental = await Rental.findById(req.params.id);
  if (!rental)
    return res.status(404).send("The rental with the given ID was not found.");

  const updatedRental = await Rental.findByIdAndUpdate(
    req.params.id,
    {
      customerId: customer._id,
      movieId: movie._id
    },
    { new: true }
  );

  if (rental.movie._id !== movie._id) {
    try {
      new Fawn.Task()
        .update(
          "movies",
          { _id: movie._id },
          {
            $inc: { numberInStock: -1 }
          }
        )
        .update(
          "movies",
          { _id: rental.movie._id },
          {
            $inc: { numberInStock: 1 }
          }
        )
        .run();

    } catch (ex) {
      res.status(500).send("Something failed.");
    }
  }

  res.send(updatedRental);

});


router.post("/", auth, async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const customer = await Customer.findById(req.body.customerId);
  if (!customer) return res.status(400).send("Invalid customer.");

  const movie = await Movie.findById(req.body.movieId);
  if (!movie) return res.status(400).send("Invalid movie.");

  if (movie.numberInStock === 0)
    return res.status(400).send("Movie not in stock.");

  let rental = new Rental({
    customer: {
      _id: customer._id,
      name: customer.name,
      phone: customer.phone
    },
    movie: {
      _id: movie._id,
      title: movie.title,
      dailyRentalRate: movie.dailyRentalRate
    }
  });

  try {
    new Fawn.Task()
      .save("rentals", rental)
      .update(
        "movies",
        { _id: movie._id },
        {
          $inc: { numberInStock: -1 }
        }
      )
      .run();

    res.send(rental);
  } catch (ex) {
    res.status(500).send("Something failed.");
  }
});

router.get("/:id", auth, async (req, res) => {
  const rental = await Rental.findById(req.params.id).select("-__v");

  if (!rental)
    return res.status(404).send("The rental with the given ID was not found.");

  res.send(rental);
});

router.delete("/:id", auth, async (req, res) => {
  const rental = await Rental.findByIdAndRemove(req.params.id);
  if (!rental)
    return res.status(404).send('Rental not found');

  res.send(rental);
});

module.exports = router;
