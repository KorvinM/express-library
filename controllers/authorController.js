/* Author controller
 * exports functions for each of the URLs we wish to handle
 */

//grab what we need from express-validator
var { body,validationResult } = require('express-validator/check');
var { sanitizeBody } = require('express-validator/filter');
var async = require('async')
var Book = require('../models/book')
var Author = require('../models/author');

// Display list of all Authors.
/*
 * The method uses the model's
 * find(), sort() and exec() functions
 * to return all Author objects sorted by family_name in alphabetic order.
 * The callback passed to the exec() method is called with any errors (or null) as the first parameter,
 * or a list of all authors on success.
 * If there is an error it calls the next middleware function with the error value,
 * and if not it renders the author_list(.pug) template,
 * passing the page title and the list of authors (author_list).
*/
exports.author_list = function(req, res, next) {
  Author.find()
    .populate('author')
    .sort([['family_name', 'ascending']])
    .exec(function (err, list_authors) {
      if (err) { return next(err); }
      //Successful, so render
      res.render('author_list',{
        title: 'Authors',
        author_list: list_authors}
      );
    });

};

// Display detail page for a specific Author.
exports.author_detail = function(req, res, next) {
async.parallel({
        author: function(callback) {
            Author.findById(req.params.id)
              .exec(callback)
        },
        authors_books: function(callback) {
          Book.find({ 'author': req.params.id },'title summary')
          .exec(callback)
        },
    }, function(err, results) {
        if (err) { return next(err); } // Error in API usage.
        if (results.author==null) { // No results.
            var err = new Error('Author not found');
            err.status = 404;
            return next(err);
        }
        // Successful, so render.
        res.render('author_detail', {
          title: 'Author : '+results.author.first_name+' '+results.author.family_name,
          author: results.author,
          author_books: results.authors_books } );
    });
};

// Display Author create form on GET.
exports.author_create_get = function(req, res, next) {
    res.render('author_form', { title: 'Create Author'});
};


// Handle Author create on POST.
exports.author_create_post = [

    // Validate fields: we can daisy-chain validators
    body('first_name')
      .isLength({ min: 1 })
      .trim().withMessage('First name must be specified.')
      .isAlphanumeric().withMessage('First name has non-alphanumeric characters.'),
    body('family_name')
      .isLength({ min: 1 })
      .trim().withMessage('Family name must be specified.')
      .isAlphanumeric().withMessage('Family name has non-alphanumeric characters.'),
    body('date_of_birth', 'Invalid date of birth')
      .optional({ checkFalsy: true }).isISO8601(),
    body('date_of_death', 'Invalid date of death')
      .optional({ checkFalsy: true }).isISO8601(),

    // Sanitize fields: //toDate() casts the string to the proper JS type
    sanitizeBody('first_name').escape(),
    sanitizeBody('family_name').escape(),
    sanitizeBody('date_of_birth').toDate(),
    sanitizeBody('date_of_death').toDate(),

    // Process request after validation and sanitization.
    (req, res, next) => {

      // Extract the validation errors from a request.
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        // There are errors. Render form again with sanitized values/errors messages.
        res.render('author_form',{
          title: 'Create Author',
          author: req.body, errors: errors.array()
        });
        return;
      } else {
        // Data from form is valid.

        // Create an Author object with escaped and trimmed data.
        var author = new Author(
          {
            first_name: req.body.first_name,
            family_name: req.body.family_name,
            date_of_birth: req.body.date_of_birth,
            date_of_death: req.body.date_of_death
          });
        author.save(function (err) {
          if (err) { return next(err); }
          // Successful - redirect to new author record.
            res.redirect(author.url);
          });
      }
    } //end Process request after validation and sanitization.
];

// Display Author delete form on GET.
exports.author_delete_get = function(req, res, next) {
    async.parallel({
        author: function(callback) {
            Author.findById(req.params.id).exec(callback)
        },
        authors_books: function(callback) {
          Book.find({ 'author': req.params.id }).exec(callback)
        },
    }, function(err, results) {
        if (err) { return next(err); }
        if (results.author==null) { // No results.
            res.redirect('/catalog/authors');
        }
        // Successful, so render.
        res.render('author_delete', { title: 'Delete Author', author: results.author, author_books: results.authors_books } );
    });
};

// Handle Author delete on POST.
exports.author_delete_post = function(req, res, next) {
async.parallel({
        author: function(callback) {
          Author.findById(req.body.authorid).exec(callback)
        },
        authors_books: function(callback) {
          Book.find({ 'author': req.body.authorid }).exec(callback)
        },
    }, function(err, results) {
        if (err) { return next(err); }
        // Success
        if (results.authors_books.length > 0) {
            // Author has books. Render in same way as for GET route.
            res.render('author_delete', { title: 'Delete Author', author: results.author, author_books: results.authors_books } );
            return;
        }
        else {
            // Author has no books. Delete object and redirect to the list of authors.
            Author.findByIdAndRemove(req.body.authorid, function deleteAuthor(err) {
                if (err) { return next(err); }
                // Success - go to author list
                res.redirect('/catalog/authors')
            })
        }
    });

};

// Display Author update form on GET.
exports.author_update_get = function(req, res, next) {
  async.parallel({
    author : function(callback){
      Author.findById(req.params.id).exec(callback);
    }
  }, function(err,results){
    if (err) { return next(err); }
    if (results.author==null) { // No results.
        var err = new Error('Author not found');
        err.status = 404;
        return next(err);
    }
    // Success.
    res.render('author_form', { title: 'Update Author', author: results.author});

  }

)
};

// Handle Author update on POST.
exports.author_update_post = [
  (req, res, next) => {
      next();
  },
  body('first_name').isLength({ min: 1 }).trim().withMessage('First name must be specified.')
      .isAlphanumeric().withMessage('First name has non-alphanumeric characters.'),
  body('family_name').isLength({ min: 1 }).trim().withMessage('Family name must be specified.')
      .isAlphanumeric().withMessage('Family name has non-alphanumeric characters.'),
  body('date_of_birth', 'Invalid date of birth').optional({ checkFalsy: true }).isISO8601(),
  body('date_of_death', 'Invalid date of death').optional({ checkFalsy: true }).isISO8601(),

  // Sanitize fields.
  sanitizeBody('first_name').escape(),
  sanitizeBody('family_name').escape(),
  sanitizeBody('date_of_birth').toDate(),
  sanitizeBody('date_of_death').toDate(),
  // Process request after validation and sanitization.
  (req, res, next) => {

      // Extract the validation errors from a request.
      const errors = validationResult(req);

      // Create a Book object with escaped/trimmed data and old id.
      var author = new Author(    {
              first_name: req.body.first_name,
              family_name: req.body.family_name,
              date_of_birth: req.body.date_of_birth,
              date_of_death: req.body.date_of_death
          });

      if (!errors.isEmpty()) {
          // There are errors. Render form again with sanitized values/error messages.
          res.render('author_form', { title: 'Update Author',errors: errors.array() });
           return;
          }
      else {
          // Data from form is valid. Update the record.
          Author.findByIdAndUpdate(req.params.id, author, {}, function (err,theauthor) {
              if (err) { return next(err); }
                 // Successful - redirect to book detail page.
                 res.redirect(theauthor.url);
              });
      }
  }
]
