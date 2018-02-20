const Author = require('../models/author')
const Book = require('../models/book')

const async = require('async')
const { body, validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

var debug = require('debug')('author');

// Display list of all Authors.
exports.author_list = function (req, res, next) {

    Author.find()
        .sort([['family_name', 'ascending']])
        .exec(function (err, list_authors) {
            if (err) { 
                debug('mongo error -> listing all authors');       
                return next(err); 
            }
            // Successful, so render.
            debug('success -> listing all authors');
            res.render('author_list', { title: 'Author List', author_list: list_authors });
        })

};

// Display detail page for a specific Author.
exports.author_detail = function (req, res, next) {
    async.parallel({
        author: function (callback) {
            Author.findById(req.params.id)
                .exec(callback);
        },
        authors_books: function (callback) {
            Book.find({ 'author': req.params.id }, 'title summary')
                .exec(callback);
        },
    }, function (err, results) {
        if (err) { 
            debug("mongo error -> while getting author or author's books");
            return next(err); } // Error in API usage.
        if (results.author == null) { // No results.
            debug("error -> author not found");
            var err = new Error('Author not found');
            err.status = 404;
            return next(err);
        }
        // Successful, so render.
        debug('success -> getting detail of author id %o', req.params.id);   
        res.render('author_detail', { title: 'Author Detail', author: results.author, author_books: results.authors_books });
    });

};

// Display Author create form on GET.
exports.author_create_get = function(req, res) {
    debug('start -> creating author');
    res.render('author_form', { title: 'Create Author' });
};

// Handle Author create on POST.
exports.author_create_post = [
    body('first_name').isLength({min: 1}).trim().withMessage('First name must be specified')
    .isAlpha().withMessage('First name should only contain letters '),
    body('family_name').isLength({min: 1}).trim().withMessage('Family name must be specified')
    .isAlpha().withMessage('Family name should only contain letters '),
    body('date_of_birth', 'Invalid date of birth').optional({ checkFalsy: true}).isISO8601(),
    body('date_of_death', 'Invalid date of death').optional({ checkFalsy: true}).isISO8601(),

    sanitizeBody('first_name').trim().escape(),
    sanitizeBody('family_name').trim().escape(),
    sanitizeBody('date_of_birth').toDate(),
    sanitizeBody('date_of_death').toDate(),

    (req, res, next) => {
        const errors = validationResult(req);

        var author = new Author({
            first_name: req.body.first_name,
            family_name: req.body.family_name,
            date_of_birth: req.body.date_of_birth,
            date_of_death: req.body.date_of_death,
        });

        if (!errors.isEmpty()){
            debug('validation errors -> creating author: ' + errors.array());
            res.render('author_form', {title: 'Create Author', author: author, errors: errors.array()});
            return;
        }
        else{
            author.save(function(err){
                if (err) {
                    debug('mongo error -> saving new author');
                    return next(err); 
                }
                debug('success -> creating author');
                res.redirect(author.url);
            })
        }
    }
]

// Display Author delete form on GET.
exports.author_delete_get = function(req, res, next) {
    async.parallel({
        author: function(callback){
            Author.findById(req.params.id)
            .exec(callback)
        },
        author_books: function(callback){
            Book.find({'author': req.params.id})
            .exec(callback)
        }
    }, function(err, results) {
        if (err) {
            debug("mongo error -> getting author or author's books");
            return next(err);
        }
        debug("start -> deleting author")        
        res.render('author_delete', { title: 'Delete Author', author: results.author, author_books: results.author_books})
    })
};

// Handle Author delete on POST.
exports.author_delete_post = function(req, res, next) {
    async.parallel({
        author: function(callback){
            Author.findById(req.body.authorid)
            .exec(callback)
        },
        author_books: function(callback){
            Book.find({'author': req.body.authorid})
            .exec(callback)
        }
    }, function(err, results){
        if (err) { 
            debug("mongo error -> getting author or author's books");            
            return next(err);
        }
        if (results.author_books.length > 0){
            //there are still some books asociated with the author
            debug("error -> still some books asociated");                        
            res.render('author_delete', { title: 'Delete Author', author: results.author, author_books: results.author_books})
        }
        //success
        Author.findByIdAndRemove(req.body.authorid, function(err){
            if (err) {
                debug("mongo error -> while deleting by id");                                    
                return next(err);
            }
            //deleted
            debug("success -> deleting author");                                               
            res.redirect('/catalog/authors')            
        });
    })
};

// Display Author update form on GET.
exports.author_update_get = function(req, res, next) {
    Author.findById(req.params.id)
    .exec(function(err, author){
        if (err) {
            debug('mongo error -> author not found, id: ' + req.params.id);
            return next(err);
        }
        debug("start -> updating author");
        res.render('author_form', { title: 'Update Author', author: author })    
    })
};

// Handle Author update on POST.
exports.author_update_post = [
    body('first_name').isLength({min: 1}).trim().withMessage('First name must be specified')
    .isAlpha().withMessage('First name should only contain letters '),
    body('family_name').isLength({min: 1}).trim().withMessage('Family name must be specified')
    .isAlpha().withMessage('Family name should only contain letters '),
    body('date_of_birth', 'Invalid date of birth').optional({ checkFalsy: true}).isISO8601(),
    body('date_of_death', 'Invalid date of death').optional({ checkFalsy: true}).isISO8601(),

    sanitizeBody('first_name').trim().escape(),
    sanitizeBody('family_name').trim().escape(),
    sanitizeBody('date_of_birth').toDate(),
    sanitizeBody('date_of_death').toDate(),

    (req, res, next) => {
        const errors = validationResult(req);

        var author = new Author({
            first_name: req.body.first_name,
            family_name: req.body.family_name,
            date_of_birth: req.body.date_of_birth,
            date_of_death: req.body.date_of_death,
            _id: req.params.id
        });

        if (!errors.isEmpty()){
            debug("validation errors -> updating author: " + errors.array());
            res.render('author_form', {title: 'Update Author', author: author, errors: errors.array()});
            return;
        }
        else{
            Author.findByIdAndUpdate(req.params.id, author, function(err, new_author){
                if (err) {
                    debug("mongo error -> updating author");            
                    return next(err);}
                //success
                debug("success -> updating author");        
                res.redirect(new_author.url);
            })
        }
    }
]