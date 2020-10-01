/* BookInstance controller */
//grab what we need from express-validator
//this is a deprecated way of doing it
var { body,validationResult } = require('express-validator/check');
var { sanitizeBody } = require('express-validator/filter');
var async = require('async')
var Book = require('../models/book');
var BookInstance = require('../models/bookinstance');

// Display list of all BookInstances.
/*
 * The method uses the model's find() function to return all BookInstance objects. It then daisy-chains a call to populate() with the book field—this will replace the book id stored for each BookInstance with a full Book document.

On success, the callback passed to the query renders the bookinstance_list(.pug) template, passing the title and bookinstance_list as variables.
*/
exports.bookinstance_list = function(req, res, next) {
 BookInstance.find()
    .populate('book') //replace book id with full book document
    .exec(function (err, list_bookinstances) {
      if (err) { return next(err); }
      // Successful, so render
      res.render('bookinstance_list',{
        title: 'Copies',
        bookinstance_list: list_bookinstances}
      );
    });
};

/* Display detail page for a specific BookInstance.
*/
exports.bookinstance_detail = function(req, res, next) {
  // get BookInstance from the id passed from the url
  BookInstance.findById(req.params.id)
    .populate('book')// get the details of the associated Book.
    .exec(function (err, bookinstance) {
      if (err) { return next(err); }
      if (bookinstance==null) { // No results.
          var err = new Error('Book copy not found');
          err.status = 404;
          return next(err);
        }
      // Successful, so render.
      res.render('bookinstance_detail',{
        title: 'Copy: '+bookinstance.book.title,
        bookinstance:  bookinstance});
    })
};

// Display BookInstance create form on GET.
//gets a list of all books (book_list) and passes it to the view bookinstance_form.pug (along with the title)
exports.bookinstance_create_get = function(req, res) {
  Book.find({},'title')
    .exec(function (err, books) {
      if (err) { return next(err); }
      // Successful, so render.
      res.render('bookinstance_form',{
        title: 'Create Copy',
        book_list: books});
    });
};

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [

    // Validate fields.
    body('book', 'Book must be specified').trim().isLength({ min: 1 }),
    body('imprint', 'Imprint must be specified').trim().isLength({ min: 1 }),
    body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601(),

    // Sanitize fields.
    sanitizeBody('book').escape(),
    sanitizeBody('imprint').escape(),
    sanitizeBody('status').trim().escape(),
    sanitizeBody('due_back').toDate(),

    // Process request after validation and sanitization.
    (req, res, next) => {

        // Extract the validation errors from a request.
        const errors = validationResult(req);

        // Create a BookInstance object with escaped and trimmed data.
        var bookinstance = new BookInstance(
          { book: req.body.book,
            imprint: req.body.imprint,
            status: req.body.status,
            due_back: req.body.due_back
           });

        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values and error messages.
            Book.find({},'title')
                .exec(function (err, books) {
                    if (err) { return next(err); }
                    // Successful, so render.
                    res.render('bookinstance_form', { title: 'Create BookInstance', book_list: books, selected_book: bookinstance.book._id , errors: errors.array(), bookinstance: bookinstance });
            });
            return;
        }
        else {
            // Data from form is valid.
            bookinstance.save(function (err) {
                if (err) { return next(err); }
                   // Successful - redirect to new record.
                   res.redirect(bookinstance.url);
                });
        }
    }
];
// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = function(req, res, next) {
    async.parallel({
        bookInstance: function(callback) {
            BookInstance.findById(req.params.id).exec(callback)
        },
        book: function(callback) {
          Book.find({ 'bookInstance': req.params.id }).exec(callback)
        },
    }, function(err, results) {
        if (err) { return next(err); }
        if (results.bookInstance==null) { // No results.
            res.redirect('/catalog/books');
        }
        // Successful, so render.
        res.render('bookInstance_delete', { title: 'Delete Book Instance', bookInstance: results.bookInstance, book_title: results.bookInstance.book.title } );
    });

};

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = function(req, res, next) {
  async.parallel({
        bookInstance: function(callback) {
          BookInstance.findById(req.body.bookinstanceid).exec(callback)
        }
    }, function(err, results) {
        if (err) { return next(err); }
        // Success
        else {
            // Delete object and redirect to the list of authors.
            BookInstance.findByIdAndRemove(req.body.bookInstanceid, function deleteBookInstance(err) {
                if (err) { return next(err); }
                // Success - go to author list
                res.redirect('/catalog/books')
            })
        }
    });
};

// Display BookInstance update form on GET.
exports.bookinstance_update_get = function(req, res, next) {
  async.parallel({
      bookinstance: function(callback) {
          BookInstance.findById(req.params.id).populate('book').exec(callback);
      }
  },function(err, results) {
      if (err) { return next(err); }
      if (results.bookinstance==null) { // No results.
          var err = new Error('Copy not found');
          err.status = 404;
          return next(err);
      }
      // Success.
      res.render('bookinstance_form', {
        title: 'Update Copy',
        bookinstance: results.bookinstance });
  });
};

// Handle bookinstance update on POST.
exports.bookinstance_update_post = [

      // Validate fields.
      body('imprint', 'Imprint must be specified').trim().isLength({ min: 1 }),
      body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601(),

      // Sanitize fields.
      sanitizeBody('imprint').escape(),
      sanitizeBody('status').trim().escape(),
      sanitizeBody('due_back').toDate(),

      // Process request after validation and sanitization.
      (req, res, next) => {

          // Extract the validation errors from a request.
          const errors = validationResult(req);

          // Create a BookInstance object with escaped and trimmed data.
          var bookinstance = new BookInstance(
            { book: req.body.book,
              imprint: req.body.imprint,
              status: req.body.status,
              due_back: req.body.due_back,
              _id:req.params.id //This is required, or a new ID will be assigned!

             });

          if (!errors.isEmpty()) {
              // There are errors. Render form again with sanitized values and error messages.
              Book.find({},'title')
                  .exec(function (err, books) {
                      if (err) { return next(err); }
                      // Successful, so render.
                      res.render('bookinstance_form', { title: 'Create BookInstance', book_list: books, selected_book: bookinstance.book._id , errors: errors.array(), bookinstance: bookinstance });
              });
              return;
          }
          else {
              // Data from form is valid. Update the record.
                  BookInstance.findByIdAndUpdate(req.params.id, bookinstance, {}, function (err,thebookinstance) {
                      if (err) { return next(err); }
                         // Successful - redirect to book detail page.
                         res.redirect(thebookinstance.url);
                      });
          }
      }
];
