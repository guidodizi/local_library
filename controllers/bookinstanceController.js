var BookInstance = require('../models/bookinstance')
var Book = require('../models/book')
var async = require('async')

const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

// Display list of all BookInstances.
exports.bookinstance_list = function(req, res, next) {

  BookInstance.find()
    .populate('book')
    .exec(function (err, list_bookinstances) {
      if (err) { return next(err); }
      // Successful, so render.
      res.render('bookinstance_list', { title: 'Book Instance List', bookinstance_list:  list_bookinstances});
    })

};

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = function(req, res, next) {

    BookInstance.findById(req.params.id)
    .populate('book')
    .exec(function (err, bookinstance) {
      if (err) { return next(err); }
      if (bookinstance==null) { // No results.
          var err = new Error('Book copy not found');
          err.status = 404;
          return next(err);
        }
      // Successful, so render.
      res.render('bookinstance_detail', { title: 'Book:', bookinstance:  bookinstance});
    })

};

// Display BookInstance create form on GET.
exports.bookinstance_create_get = function(req, res, next) {
    Book.find({}, 'title')
    .exec((err, books) => {
        res.render('bookinstance_form', {title: 'Create BookInstance', book_list: books})
    })
};

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [
    //Validate
    body('book', 'Book must be specified').isLength({min:1}).trim(),
    body('imprint', 'Imprint must be specified').isLength({min:1}).trim(),
    body('due_back', 'Invalid date').optional({checkFalsy:true}).isISO8601(),
    //Sanitize
    sanitizeBody('book').trim().escape(),
    sanitizeBody('imprint').trim().escape(),
    sanitizeBody('status').trim().escape(),
    sanitizeBody('due_back').toDate(),
    //process
    (req,res,next) => {
        const errors = validationResult(req);

        const bookinstance = new BookInstance({
            book: req.body.book,
            imprint: req.body.imprint,
            status: req.body.status,
            due_back: req.body.due_back,
        });
        if(!errors.isEmpty()){
        //There are errors. Re-render
            Book.find({}, 'title')
            .exec((err, books) => {
                if (err) {return next(err);}
                //succesfull so render
                res.render('bookinstance_form', {title: 'Create BookInstance', book_list: books, selected_book: bookinstance._id, errors: errors.array(), bookinstance: bookinstance})
            })
        }
        else{
            bookinstance.save(function(err){
                if (err) {return err; }
                //success, redirect to detail
                res.redirect(bookinstance.url);
            })
        }
    }
];

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = function(req, res, next) {
    BookInstance.findById(req.params.id)
    .populate('book')
    .exec(function (err, bookinstance) {
      if (err) { return next(err); }
      if (bookinstance==null) { // No results.
          var err = new Error('Book copy not found');
          err.status = 404;
          return next(err);
        }
      // Successful, so render.
      res.render('bookinstance_delete', { title: 'Delete BookInstance ID', bookinstance:  bookinstance});
    })
};

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = function(req, res, next) {
    BookInstance.findByIdAndRemove(req.body.bookinstanceid)
    .exec(function(err, result){
        if (err) { return next(err);}
        //success
        res.redirect('/catalog/bookinstances')
    })
};

// Display BookInstance update form on GET.
exports.bookinstance_update_get = function(req, res) {
    res.send('NOT IMPLEMENTED: BookInstance update GET');
};

// Handle bookinstance update on POST.
exports.bookinstance_update_post = function(req, res) {
    res.send('NOT IMPLEMENTED: BookInstance update POST');
};