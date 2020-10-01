/* model describing the bookinstance */

//import moment to use for dates
var moment = require ('moment');
var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var BookInstanceSchema = new Schema(
  {
    book: { type: Schema.Types.ObjectId, ref: 'Book', required: true }, //reference to the associated book
    imprint: {type: String, required: true},
    status: {type: String, required: true, enum: ['Available', 'Maintenance', 'Loaned', 'Reserved'], default: 'Maintenance'},
    due_back: {type: Date, default: Date.now}
  }
);

// Virtual for bookinstance's URL
BookInstanceSchema
.virtual('url')
.get(function () {
  return '/catalog/bookinstance/' + this._id;
});

// Virtual for the formatted date
BookInstanceSchema
.virtual('due_back_formatted')
.get(function () {
  return moment(this.due_back).format('Do MMMM YYYY');
});

// Virtual for the date formattted for form prefilling
BookInstanceSchema
.virtual('due_back_preformatted')
.get(function () {
  return moment(this.due_back).format('YYYY-MM-D');
});
//Export model
module.exports = mongoose.model('BookInstance', BookInstanceSchema);
