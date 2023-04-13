const express = require("express");
const router = express.Router();
// Import Express validatior
const { check, validationResult } = require("express-validator");
const movie = require("../models/movie");

// Import Movie and User Mongoose schemas
let Movie = require("../models/movie");
let User = require("../models/user");

// Genres
let genres = [
  "adventure",
  "science fiction",
  "tragedy",
  "romance",
  "horror",
  "comedy",
];

router
  .route("/search")
  .get((req, res) => {
    res.render("search");
  })

  .post(async (req, res) => {
    console.log("post method")
    await check("name", "Movie name is required").notEmpty().run(req);
    const errors = validationResult(req);

    if (!errors || errors.isEmpty()) {
      console.log("error is empty")
      const query = req.body.name
     
      let movie = await Movie.find({ name: { $regex: `^${query}`, $options: 'i' } })
      console.log("movie: " ,movie)
      if (!movie[0]) {
        res.send("Could not find the movie")
      } else {
        let postedBy = movie[0].posted_by
        console.log("postedBy: ", postedBy)
        let user = await User.findById({ _id: postedBy });
        console.log("user name: ", user.name)
        console.log("movie[0]: ", movie[0])
        if (!user) {
          res.send("Could not find user")
        }
        else {
          res.render("search_display", {
            movie: movie[0],
            posted_by: user.name,
          });
        };
      }


    }
    else {
      res.render("search", {
        errors: errors.array(),
      });
    }

  })

router
  .route("/add")
  // Get method renders the pug add_movie page
  .get(ensureAuthenticated, (req, res) => {
    // Render page with list of genres
    res.render("add_movie", {
      genres: genres,
    });
  })
  // Post method accepts form submission and saves movie in MongoDB
  .post(ensureAuthenticated, async (req, res) => {
    // Async validation check of form elements
    await check("name", "Name is required").notEmpty().run(req);
    await check("description", "Description is required").notEmpty().run(req);
    await check("year", "Year is required").notEmpty().run(req);
    await check("rating", "Rating is required").notEmpty().run(req);
    await check("genres", "Genre is required").notEmpty().run(req);

    // Get validation errors
    const errors = validationResult(req);

    // let user1 = await User.findById({ _id: movie.posted_by });
    //       console.log("user1 name:", user1.name)

    if (errors.isEmpty()) {
      // Create new movie from mongoose model
      let movie = new Movie();
      // Assign attributes based on form data
      movie.name = req.body.name;
      movie.description = req.body.description;
      movie.year = req.body.year;
      movie.genres = req.body.genres;
      movie.rating = req.body.rating;
      movie.posted_by = req.user.id;



      // Save movie to MongoDB
      let result = await movie.save()
      if (!result) {
        // Log error if failed
        res.send("Could not save movie")
      } else {
        // Route to home to view movies if suceeeded
        res.redirect("/");
      }
    } else {
      res.render("add_movie", {
        // Render form with errors
        errors: errors.array(),
        genres: genres,
      });
    }
  });


// Route that returns and deletes movie based on id
router
  .route("/:id")
  .get(async (req, res) => {
    // Get movie by id from MongoDB
    // Get user name by id from DB
    let movie = await Movie.findById(req.params.id)
    console.log(movie)
    if (!movie) {
      res.send("Could not find movie")
    }
    let postedBy = movie.posted_by
    console.log("postedBy: ", postedBy)
    let user = await User.findById({ _id: postedBy });
    console.log("user name: ", user.name)

    if (!user) {
      res.send("Could not find user")
    } else {
      res.render("view_movie", {
        movie: movie,
        posted_by: user.name,
      });
    };
  })
  .delete(ensureAuthenticated, async (req, res) => {
    // Restrict delete if user not logged in
    if (!req.user._id) {
      res.status(500).send();
    }

    // Create query dict
    let query = { _id: req.params.id };

    let movie = await Movie.findById(req.params.id)
    if (!movie) {
      res.send("Could not find movie")
    }
    // Restrict delete if user did not post movie
    if (movie.posted_by != req.user._id) {
      res.status(500).send();
    } else {
      // MongoDB delete with Mongoose schema deleteOne
      let result = Movie.deleteOne(query, function (err) {
        if (!result) {
          res.status(500).send();
        }
        res.send("Successfully Deleted");
      });
    }
  });

// Route that return form to edit movie
router
  .route("/edit/:id")
  .get(ensureAuthenticated, async (req, res) => {
    // Get movie by id from MongoDB
    let movie = await Movie.findById(req.params.id)
    if (!movie) {
      res.send("Could not find movie")
    }
    // Restrict to only allowing user that posted to make updates
    if (movie.posted_by != req.user._id) {
      res.redirect("/");
    }
    res.render("edit_movie", {
      movie: movie,
      genres: genres,
    });
  })
  .post(ensureAuthenticated, async (req, res) => {
    // Create dict to hold movie values
    let movie = {};

    // Assign attributes based on form data
    movie.name = req.body.name;
    movie.description = req.body.description;
    movie.year = req.body.year;
    movie.genres = req.body.genres;
    movie.rating = req.body.rating;

    let query = { _id: req.params.id };

    let movie_db = await Movie.findById(req.params.id)
    if (!movie_db) {
      res.send("Could not find movie")
    }
    console.log(movie_db)
    // Restrict to only allowing user that posted to make updates
    if (movie_db.posted_by != req.user._id) {
      res.send("Only user who posted movie can edit")
    } else {
      // Update movie in MongoDB
      let result = await Movie.updateOne(query, movie)
      if (!result) {
        res.send("Could not update movie")
      } else {
        res.redirect("/");
      }
    }
  })

// Function to protect routes from unauthenticated users
function ensureAuthenticated(req, res, next) {
  // If logged in proceed to next middleware
  if (req.isAuthenticated()) {
    return next();
    // Otherwise redirect to login page
  } else {
    res.redirect("/users/login");
  }
}

module.exports = router;
