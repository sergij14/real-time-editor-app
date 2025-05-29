const mongoose = require("mongoose");

const DocSchema = new mongoose.Schema({
  _id: String,
  data: Object,
});

module.exports = mongoose.model("Doc", DocSchema);
