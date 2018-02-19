var Book = require('../models/book');
var Author = require('../models/author');
var Genre = require('../models/genre');
var BookInstance = require('../models/bookinstance');

const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

var async = require('async');

exports.index = function(req, res) {

    async.parallel({
        book_count: function(callback) {
            Book.count(callback);
        },
        book_instance_count: function(callback) {
            BookInstance.count(callback);
        },
        book_instance_available_count: function(callback) {
            BookInstance.count({status:'Available'},callback);
        },
        author_count: function(callback) {
            Author.count(callback);
        },
        genre_count: function(callback) {
            Genre.count(callback);
        },
    }, function(err, results) {
        res.render('index', { title: 'Local Library Home', error: err, data: results });
    });
};


// Display list of all books.
exports.book_list = function(req, res, next) {

  Book.find({}, 'title author ')
    .populate('author')
    .exec(function (err, list_books) {
      if (err) { return next(err); }
      // Successful, so render
      res.render('book_list', { title: 'Book List', book_list:  list_books});
    });

};

// Display detail page for a specific book.
exports.book_detail = function(req, res, next) {
    async.parallel({
        book: function(callback) {
            Book.findById(req.params.id)
              .populate('author')
              .populate('genre')
              .exec(callback);
        },
        book_instances: function(callback) {
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
        res.render('book_detail', { title: 'Title', book:  results.book, book_instances: results.book_instances } );
    });

};

// Display book create form on GET.
exports.book_create_get = function(req, res, next) {
    async.parallel({
        authors: function(callback){
            Author.find(callback);
        },
        genres: function(callback){
            Genre.find(callback);
        }
    }, function(err, results){
        if (err) { return next(err); }
        res.render('book_form', { title:'Create Book', authors: results.authors, genres: results.genres})
    })
};

// Handle book create on POST.
exports.book_create_post = [
    // Convert the genre to an array.
    (req, res, next) => {
        if (!(req.body.genre instanceof Array)){
            if (typeof req.body.genre === 'undefined')
                req.body.genre = [];
            else
                console.log(req.body.genre);
                req.body.genre = new Array(req.body.genre);
        }
        next();
    },

    //Validate fields
    body('title', 'Title must not be empty').isLength({min:1}).trim(),
    body('author', 'Author must not be empty').isLength({min:1}).trim(),
    body('summary', 'Summary must not be empty').isLength({min:1}).trim(),
    body('isbn', 'ISBN must not be empty').isLength({min:1}).trim(),

    //Sanitize fields
    sanitizeBody('*').trim().escape(),

    //process request after validation and sanitization.
    (req, res, next) => {
        //extract validation errors from data
        const errors = validationResult(req);

        //create book object with escaped and trimmed data
        const book = new Book({
            title: req.body.title,
            author: req.body.author,
            summary: req.body.summary,
            isbn: req.body.isbn,
            genre: req.body.genre
        })
        if (!errors.isEmpty()){
            //There are errors, render form again fixed
            async.parallel({
                authors: function(callback){
                    Author.find(callback)
                },
                genres: function(callback){
                    Genre.find(callback)
                },
            }, function (err, results) {
                if (err) { return next(err);}
                
                //Mark already selected genres as checked
                for (let i=0; i < results.genres.length; i++){
                    if (book.genre.indexOf(results.genres[i]._id) > -1){
                        results.genres[i].checked = true;
                    }
                }

                res.render('book_form', {title:'Create Book', authors: results.authors, genres: results.genres, book: book, errors: errors.array()});            
            });
            return;
        }
        else {
            //Data from book is valid
            book.save(function(err){
                if (err) {return next(err);}
                //success
                res.redirect(book.url);
            })
        }
    }
]

// Display book delete form on GET.
exports.book_delete_get = function(req, res, next) {
    async.parallel({
        book: function(callback) {
            Book.findById(req.params.id)
            .populate('author')
            .populate('genre')
            .exec(callback)
        },
        book_instances: function(callback) {
            BookInstance.find({'book': req.params.id})
            .exec(callback)
        }
    }, function(err, results) {
        if (err) { next(err); }
        if (results.book == null){
            //no book found
            var error = new Error('Book not found :(');
            err.status = 404;
            next(err);
        }
        res.render('book_delete', {title: 'Delete Book', book: results.book, book_instances: results.book_instances})
    })
};

// Handle book delete on POST.
exports.book_delete_post = function(req, res, next) {
    async.parallel({
        book: function(callback) {
            Book.findById(req.body.bookid)
            .populate('author')
            .populate('genre')
            .exec(callback)
        },
        book_instances: function(callback) {
            BookInstance.find({'book': req.body.bookid})
            .exec(callback)
        }
    }, function(err, results) {
        if (err) { next(err); }
        if (results.book == null){
            //no book found
            var error = new Error('Book not found :(');
            err.status = 404;
            next(err);
        }
        if (results.book_instances.length > 0) {
            //still some bookinstances to delete
            res.render('book_delete', {title: 'Delete Book', book: results.book, book_instances: results.book_instances})
        }  
        //success
        Book.findByIdAndRemove(req.body.bookid)
        .exec( function(err, result) {
            if (err) return next(err);
            res.redirect('/catalog/books')
        })
    })
};

// Display book update form on GET.
exports.book_update_get = function(req, res) {
    res.send('NOT IMPLEMENTED: Book update GET');
};

// Handle book update on POST.
exports.book_update_post = function(req, res) {
    res.send('NOT IMPLEMENTED: Book update POST');
};