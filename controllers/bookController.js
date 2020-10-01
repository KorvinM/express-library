/* Book controller *
 * also has an index() function for the homepage
 */
//grab what we need from express-validator
/* Note:
 * this is a deprecated way of doing it accoding to console output in node
 * but not according to express-validator docs ???
  */
var { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

// import models we need to get records and their counts
var Book = require('../models/book');
var Author = require('../models/author');
var Genre = require('../models/genre');
var BookInstance = require('../models/bookinstance');

// we're going to need async for asynchronous operations
var async = require('async');

/*
 * The async.parallel() method is passed an object with functions for getting the counts for each of our models. These functions are all started at the same time. When all of them have completed the final callback is invoked with the counts in the results parameter (or an error).

On success the callback function calls res.render(), specifying a view (template) named 'index' and an object containing the data that is to be inserted into it (this includes the results object that contains our model counts). The data is supplied as key-value pairs, and can be accessed in the template using the key.

*/

exports.index = function(req, res) {
  async.parallel({
    book_count: function(callback){
      Book.countDocuments({}, callback)},
    book_instance_count: function(callback){
      BookInstance.countDocuments({}, callback)},
    book_instance_available_count: function(callback){
      BookInstance.countDocuments({status:'Available'}, callback)},
    author_count: function(callback){
      Author.countDocuments({}, callback)},
    genre_count: function(callback){
      Genre.countDocuments({},callback)}
    }, function(err, results){
      res.render('index',
        {title: 'Library',
        error: err,
        data: results}
      )}
  );
};

// Display list of all books.
/* The method uses the model's  as we don't need the other fields
(it will also return the _id and virtual fields).
Here we also call populate() on Book:
  specifying the author field
  this will replace the stored book author id with the full author details.

On success, the callback passed to the query renders the
book_list(.pug) template,
passing the title and book_list
(list of books with authors) as variables.
*/
exports.book_list = function(req, res, next) {
  /*find() function to return all Book objects
   *selecting to return only title and author */
  Book.find({}, 'title author')
    .populate('author') //replace author id with their full details
    .exec(function (err, list_books) {
      if (err) { return next(err); }
      //Successful, so render
      res.render('book_list',{
        title: 'Books',
        book_list: list_books });
    });
};

/* Display detail page for a specific book.
   The method uses async.parallel()
   The approach is exactly the same as for the Genre detail
   page
   Since the key 'title' is used to give name to the webpage
  (as defined in the header in 'layout.pug'),
  this time we are passing
  results.book.title while rendering the webpage.*/
exports.book_detail = function(req, res, next) {
  async.parallel({
    /* find the Book
       and its associated copies (BookInstances)*/
    book: function(callback) {
      Book.findById(req.params.id)
        .populate('author')
        .populate('genre')
        .exec(callback);
    },
    book_instance: function(callback) {
      BookInstance.find({ 'book': req.params.id })
      .exec(callback);
      },
  }, function(err, results) {
      if (err) { return next(err); }
      if (results.book==null) { // No results.
        var err = new Error('Book not found');
        err.status = 404;
        return next(err);
      }
    // Successful, so render.
    res.render('book_detail',{
      title: results.book.title,
      book: results.book,
      book_instances: results.book_instance });
  });
};

// Display book create form on GET.
exports.book_create_get = function(req, res, next) {
    async.parallel(
      //the first argument to async.parallel is a collection of the functions to return
      { // Get all authors and genres.
        authors: function(callback) {
            Author.find(callback);
        },
        genres: function(callback) {
            Genre.find(callback);
        },
      }, function(err, results) {//2nd argument: runs when the 1st has completed
        if (err) { return next(err); }
        res.render('book_form',{
          title: 'Create Book',
          authors: results.authors,
          genres: results.genres });
    });
};

// Handle book create on POST.
/*
 * The structure and behaviour of this code is almost exactly the same as for creating a Genre or Author object. First we validate and sanitize the data. If the data is invalid then we re-display the form along with the data that was originally entered by the user and a list of error messages. If the data is valid, we then save the new Book record and redirect the user to the book detail page.

The first main difference with respect to the other form handling code is that we use a wildcard to escape all fields in one go (rather than sanitising them individually):
The next main difference with respect to the other form handling code is how we sanitize the genre information. The form returns an array of Genre items (while for other fields it returns a string). In order to validate the information we first convert the request to an array (required for the next step).
We then use a wildcard (*) in the sanitiser to individually validate each of the genre array entries. The code below shows how - this translates to "sanitise every item below key genre".
The final difference with respect to the other form handling code is that we need to pass in all existing genres and authors to the form. In order to mark the genres that were checked by the user we iterate through all the genres and add the checked='true' parameter to those that were in our post data
*/
exports.book_create_post = [
    // Convert the genres to an array.
    (req, res, next) => {
        if(!(req.body.genre instanceof Array)){
            if(typeof req.body.genre==='undefined')
            req.body.genre=[];
            else
            req.body.genre=new Array(req.body.genre);
        }
        next();
    },

    // Validate fields.
    body('title', 'Title must not be empty.').trim().isLength({ min: 1 }),
    body('author', 'Author must not be empty.').trim().isLength({ min: 1 }),
    body('summary', 'Summary must not be empty.').trim().isLength({ min: 1 }),
    body('isbn').trim(),

    // Sanitize fields (using wildcard).
    sanitizeBody('*').escape(),
    sanitizeBody('genre.*').escape(),

    // Process request after validation and sanitization.
    (req, res, next) => {

        // Extract the validation errors from a request.
        const errors = validationResult(req);

        // Create a Book object with escaped and trimmed data.
        var book = new Book(
          { title: req.body.title,
            author: req.body.author,
            summary: req.body.summary,
            isbn: req.body.isbn,
            genre: req.body.genre
           });

        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/error messages.

            // Get all authors and genres for form.
            async.parallel({
                authors: function(callback) {
                    Author.find(callback);
                },
                genres: function(callback) {
                    Genre.find(callback);
                },
            }, function(err, results) {
                if (err) { return next(err); }

                // Mark our selected genres as checked.
                for (let i = 0; i < results.genres.length; i++) {
                    if (book.genre.indexOf(results.genres[i]._id) > -1) {
                        results.genres[i].checked='true';
                    }
                }
                res.render('book_form', {
                  title: 'Create Book',
                  authors:results.authors,
                  genres:results.genres, book: book,
                  errors: errors.array() });
            });
            return;
        }
        else {
            // Data from form is valid. Save book.
            book.save(function (err) {
                if (err) { return next(err); }
                   //successful - redirect to new book record.
                   res.redirect(book.url);
                });
        }
    }
];
// Display book delete form on GET.
exports.book_delete_get = function(req, res, next) {
    async.parallel({
        book: function(callback) {
            Book.findById(req.params.id).exec(callback)
        },
        book_instances : function(callback){
          BookInstance.find({'book': req.params.id}).exec(callback)
        },
    }, function(err, results) {
        if (err) { return next(err); }
        if (results.book==null) { // No results.
            res.redirect('/catalog/books');
        }
        // Successful, so render.
        res.render('book_delete', { title: 'Delete Book', book: results.book, book_instances: results.book_instances} );
    });
    //res.send('NOT IMPLEMENTED: Book delete GET');
};

// Handle book delete on POST.
exports.book_delete_post = function(req, res, next) {
  async.parallel({
        book: function(callback) {
          Book.findById(req.body.bookid).exec(callback)
        },
        book_instances: function(callback) {
          BookInstance.find({ 'book': req.body.bookid }).exec(callback)
        },
    }, function(err, results) {
        if (err) { return next(err); }
        // Success
        if (results.book_instances.length > 0) {
            // Books has copies. Render in same way as for GET route.
            res.render('book_delete', { title: 'Delete Book', book: results.book, book_instances: results.book_instances } );
            return;
        }
        else {
            // Book has no instances. Delete object and redirect to the list of authors.
            Book.findByIdAndRemove(req.body.bookid, function deleteBook(err) {
                if (err) { return next(err); }
                // Success - go to author list
                res.redirect('/catalog/books')
            })
        }
    });

};

// Display book update form on GET.

/*
 * The controller gets the id of the Book to be updated from the URL parameter (req.params.id).
 It uses the async.parallel() method to get the specified Book record (populating its genre and author fields)
 and lists of all the Author and Genre objects.

When the operations complete it checks for any errors in the find operation, and also whether any books were found.

Note: Not finding any book results is not an error for a search — but it is for this application because we know there must be a matching book record!
The code above compares for (results==null) in the callback, but it could equally well have daisy chained the method orFail() to the query.

We then mark the currently selected genres as checked and then render the book_form.pug view, passing variables for title, book, all authors, and all genres.
*/
exports.book_update_get = function(req, res, next) {
  // Get book, authors and genres for form.
async.parallel({
    book: function(callback) {
        Book.findById(req.params.id).populate('author').populate('genre').exec(callback);
    },
    authors: function(callback) {
        Author.find(callback);
    },
    genres: function(callback) {
        Genre.find(callback);
    },
    }, function(err, results) {
        if (err) { return next(err); }
        if (results.book==null) { // No results.
            var err = new Error('Book not found');
            err.status = 404;
            return next(err);
        }
        // Success.
        // Mark our selected genres as checked.
        for (var all_g_iter = 0; all_g_iter < results.genres.length; all_g_iter++) {
            for (var book_g_iter = 0; book_g_iter < results.book.genre.length; book_g_iter++) {
                if (results.genres[all_g_iter]._id.toString()==results.book.genre[book_g_iter]._id.toString()) {
                    results.genres[all_g_iter].checked='true';
                }
            }
        }
        res.render('book_form', { title: 'Update Book', authors: results.authors, genres: results.genres, book: results.book });
    });
};

// Handle book update on POST. This is very similar to the post route used when creating a Book.
exports.book_update_post = [

    // Convert the genre to an array
    (req, res, next) => {
        if(!(req.body.genre instanceof Array)){
            if(typeof req.body.genre==='undefined')
            req.body.genre=[];
            else
            req.body.genre=new Array(req.body.genre);
        }
        next();
    },

    // Validate fields.
    body('title', 'Title must not be empty.').trim().isLength({ min: 1 }),
    body('author', 'Author must not be empty.').trim().isLength({ min: 1 }),
    body('summary', 'Summary must not be empty.').trim().isLength({ min: 1 }),
    body('isbn', 'ISBN must not be empty').trim().isLength({ min: 1 }),

    // Sanitize fields.
    sanitizeBody('title').escape(),
    sanitizeBody('author').escape(),
    sanitizeBody('summary').escape(),
    sanitizeBody('isbn').escape(),
    sanitizeBody('genre.*').escape(),

    // Process request after validation and sanitization.
    (req, res, next) => {

        // Extract the validation errors from a request.
        const errors = validationResult(req);

        // Create a Book object with escaped/trimmed data and old id.
        var book = new Book(
          { title: req.body.title,
            author: req.body.author,
            summary: req.body.summary,
            isbn: req.body.isbn,
            genre: (typeof req.body.genre==='undefined') ? [] : req.body.genre,
            _id:req.params.id //This is required, or a new ID will be assigned!
           });

        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/error messages.

            // Get all authors and genres for form.
            async.parallel({
                authors: function(callback) {
                    Author.find(callback);
                },
                genres: function(callback) {
                    Genre.find(callback);
                },
            }, function(err, results) {
                if (err) { return next(err); }

                // Mark our selected genres as checked.
                for (let i = 0; i < results.genres.length; i++) {
                    if (book.genre.indexOf(results.genres[i]._id) > -1) {
                        results.genres[i].checked='true';
                    }
                }
                res.render('book_form', { title: 'Update Book',authors: results.authors, genres: results.genres, book: book, errors: errors.array() });
            });
            return;
        }
        else {
            // Data from form is valid. Update the record.
            Book.findByIdAndUpdate(req.params.id, book, {}, function (err,thebook) {
                if (err) { return next(err); }
                   // Successful - redirect to book detail page.
                   res.redirect(thebook.url);
                });
        }
    }
];
