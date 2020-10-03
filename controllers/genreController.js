/* Genre controller */

// Import validation and sanitisation methods
var validator = require('express-validator');
var { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');
//to help create a specific detail instance for genres, we need to import async and our Book model
var async = require('async');
var Book = require('../models/book');
var Genre = require('../models/genre');

// Display list of all Genre.
exports.genre_list = function(req, res, next) {
  Genre.find()
    .populate('genre')
    .sort([['name', 'ascending']])
    .exec(function (err, list_genres){
      if (err) {return next(err)}
      //successful, so render
      res.render('genre_list',{
        title: 'Genres',
        genre_list: list_genres})
    });
};

// Display detail page for a specific Genre.
/*
 * The method uses async.parallel() to query the genre name
 and its associated books in parallel,
 with the callback rendering the page when (if)
 both requests complete successfully.
*/
exports.genre_detail = function(req, res, next) {
  async.parallel({
    genre: function(callback) {
      /* find current genre:
         uses ID of the genre at the end of the URL
         extracted automatically based on the route definition
         accessed via: req.params.id. */
      Genre.findById(req.params.id)
        .exec(callback);
      },
    genre_books: function(callback) {
      //get all Book objects that have the genre ID:
      Book.find({ 'genre': req.params.id })
        .exec(callback);
      },

  }, function(err, results) {
    if (err) { return next(err); }
    if (results.genre==null) { // No results.
      var err = new Error('Genre not found');
      err.status = 404;
      return next(err);
    }
    // Successful, so render
    res.render('genre_detail', {
      title: 'Genre Detail',
      genre: results.genre,
      genre_books: results.genre_books
    } );
  });

};

// Display Genre create form on GET.
exports.genre_create_get = function(req, res, next) {
    res.render('genre_form', {title: 'Create Genre'})
};

// Handle Genre create on POST.
// specifies an array of middleware functions
exports.genre_create_post =  [

  // Validate that the name field is not empty.
  validator.body(
    'name',
    'You have not entered a Genre name'
  ).trim().isLength({ min: 1 }),

  // Sanitize (escape) the name field.
  validator.sanitizeBody('name').escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {

    // Extract the validation errors from a request.
    const errors = validator.validationResult(req);

    // Create a genre object with escaped and trimmed data.
    var genre = new Genre(
      {name: req.body.name}
    );

    if (!errors.isEmpty()) {
      // There are errors. Render the form again with sanitized values/error messages.
      res.render(
        'genre_form',{
          title: 'Create Genre',
          genre: genre,
          errors: errors.array()}
        );
      return;
    } else { // Data from form is valid.
      // Check if Genre with same name already exists.
      Genre.findOne({ 'name': req.body.name })
        .exec( function(err, found_genre) {
           if (err) { return next(err); }
           if (found_genre) {
             // Genre exists, redirect to its detail page.
             res.redirect(found_genre.url);
           } else {
             genre.save(function (err) {
               if (err) { return next(err); }
               // Genre saved. Redirect to genre detail page.
               res.redirect(genre.url);
             });
           }
         });
      }
    }
];

// Display Genre delete form on GET.
exports.genre_delete_get = function(req, res, next) {
    async.parallel({
        genre: function(callback) {
            Genre.findById(req.params.id).exec(callback)
        },
        genre_books: function(callback) {
          Book.find({ 'genre': req.params.id }).exec(callback)
        },
    }, function(err, results) {
        if (err) { return next(err); }
        if (results.genre==null) { // No results.
            res.redirect('/catalog/genres');
        }
        // Successful, so render.
        res.render(
          'genre_delete',
          {
            title: 'Delete Genre',
            genre: results.genre,
            genre_books: results.genre_books
          }
        );
    });
};

// Handle Genre delete on POST.
exports.genre_delete_post = function(req, res, next) {
  async.parallel({
        genre: function(callback) {
          Genre.findById(req.body.genreid).exec(callback)
        },
        genre_books: function(callback) {
          Book.find({ 'genre': req.body.genreid }).exec(callback)
        },
    }, function(err, results) {
        if (err) { return next(err); }
        // Success
        // whether the Genre has Books or not, delete object
        Genre.findByIdAndRemove(req.body.genreid, function deleteGenre(err) {
            if (err) { return next(err); }
            // Success - redirect to genre list
            res.redirect('/catalog/genres')
        })

    });
};

// Display Genre update form on GET.
exports.genre_update_get = function(req, res, next) {
  async.parallel({
      genre: function(callback) {
          Genre.findById(req.params.id).exec(callback);
      }
  },function(err, results) {
      if (err) { return next(err); }
      if (results.genre==null) { // No results.
          var err = new Error('Genre not found');
          err.status = 404;
          return next(err);
      }
      // Success.
      res.render('genre_form', { title: 'Update Genre', genre: results.genre });
  });
};

// Handle Genre update on POST.
exports.genre_update_post = [
  (req, res, next) => {
      next();
  },
  // Validate that the name field is not empty.
  validator.body('name', 'Genre name required').trim().isLength({ min: 1 }),

  // Sanitize (escape) the name field.
  validator.sanitizeBody('name').escape(),
  // Process request after validation and sanitization.
  (req, res, next) => {

      // Extract the validation errors from a request.
      const errors = validationResult(req);

      // Create a Genre object with escaped/trimmed data and old id.
      var genre = new Genre(
        { name: req.body.name,
        _id:req.params.id //This is required, or a new ID will be assigned! }
        });
      if (!errors.isEmpty()) {
        // There are errors. Render the form again with sanitized values/error messages.
        res.render('genre_form', { title: 'Create Genre', genre: genre, errors: errors.array()});
        return;
      }
      else {
          // Data from form is valid. Update the record.
          Genre.findByIdAndUpdate(req.params.id, genre, {}, function (err,thegenre) {
              if (err) { return next(err); }
                 // Successful - redirect to book detail page.
                 res.redirect(thegenre.url);
              });
      }
  }
]
