const fs = require("fs");

// requiring mongoose
const mongoose = require("mongoose");

// requiring slugify util
const slugify = require("slugify");

// requiring all schemas
const userSchema = require("../../intcrzyppl-api/models/schemas/User");
const skillSchema = require("../../intcrzyppl-api/models/schemas/Skill");
const locationSchema = require("../../intcrzyppl-api/models/schemas/Location");
const companySchema = require("../../intcrzyppl-api/models/schemas/Company");
const universitySchema = require("../../intcrzyppl-api/models/schemas/University");
// removing pre-validations check of models so that we can seed user without any difficulties
userSchema.set("validateBeforeSave", false);

// requiring all models
const {
  User,
  Skill,
  Location,
  Company,
  University
} = require("../../intcrzyppl-api/models");

// fix depreciation warning
mongoose.set("useFindAndModify", false);
mongoose.set("useNewUrlParser", true);

// connecting to mongoose
const conn = mongoose.createConnection("mongodb://localhost:27017/intcrzyppl");
// requiring models
const UserModel = conn.model("User", userSchema);
const SkillModel = conn.model("Skill", skillSchema);
const LocationModel = conn.model("Location", locationSchema);
const CompanyModel = conn.model("Company", companySchema);
const UniversityModel = conn.model("University", universitySchema);

// fn which deleteUser & removeUser references
async function deleteUser(userId) {
  UserModel.findOneAndDelete(
    { _id: "5d7edf538dbc953aeb03a1f9" },
    (err, removedUser) => {
      if (err) {
        console.log("user cannot be deleted", err);
      }
      if (removedUser) {
        console.log("USER REMOVED SUCCESSFULLY");
      }
    }
  );
}
