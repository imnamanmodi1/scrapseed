const fs = require("fs");

// requiring mongoose
const mongoose = require("mongoose");

// requiring slugify util
const slugify = require("slugify");

// requiring all schemas
const userSchema = require("../../intcrzyppl-api/models/schemas/User");
const skillSchema = require("../../intcrzyppl-api/models/schemas/Skill");
const locationSchema = require("../../intcrzyppl-api/models/schemas/UserLocation");
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

// requiring logger for better debugging & error handling
var logger = require("logger").createLogger();

// var which stores structured data to seed
let dataToSeed;

// read structured json file to seed data into database
fs.readFile("scrapedtoseed.json", "utf-8", (err, data) => {
  if (err) throw err;
  logger.info("reading structured JSON File");
  dataToSeed = JSON.parse(data);
  //pass control to seeder function
  seedData(dataToSeed);
  // console.log(some);
});

// function which handles seeding of user, user profile, user bio, user edu, user experiences
async function seedData(dataToSeed) {
  let totalUsersToSeed = dataToSeed.length;
  for (i = 0; i < totalUsersToSeed; i++) {
    const userToSeed = dataToSeed[i];
    console.log("seeding user @", userToSeed.name);
    // create all companies
    const createdCompanies = await handleNewCompany(userToSeed.pastJobs);
    // handling userBio from a fn
    const userBio = await handleBio(
      userToSeed.jobTitle,
      userToSeed.company,
      userToSeed.skills
    );
    // handling profile from a fn
    const userProfile = await handleProfile(
      userToSeed.pastJobs,
      userToSeed.education
    );
    // handling userLocation from a fn
    const userLocation = await handleLocation(userToSeed.location);
    const userSlug = await getSlugFromName(userToSeed.name);
    console.log(userProfile, "check2");
    console.log(userBio, "userBio comes as expected");
    //check if user already exists
    UserModel.findOne({ name: userToSeed.name }, (err, foundUser) => {
      console.log(foundUser, "this is userFound");
      // handle if any error comes
      if (err) {
        console.log(
          err,
          "findOne cannot run, please check User.findOne call at seedData fn"
        );
      }
      // if user found, update the old user in db with scraped data
      if (foundUser != undefined) {
        console.log(
          "user already found, switching seeding script to update user & not create a new user"
        );
        UserModel.findOneAndUpdate(
          { name: userToSeed.name },
          {
            scrapedUser: true,
            bio: userBio,
            profile: userProfile,
            slug: userSlug
          },
          { new: true },
          (err, createdUser) => {
            if (err) {
              console.log(
                err,
                "something went wrong & new user cannot be created @ fn seedData"
              );
            }
            if (createdUser) {
              console.log(createdUser, "USER DETAILS UPDATED SUCCESSFULLY");
            }
          }
        );
      }
      // if foundUser is null i.e. user not found in db, then create a new user
      if (foundUser == null) {
        console.log(foundUser, "this is user found");
        console.log("No user found in db, hence creating a new user");
        console.log("creating new document in db for:", userToSeed.name);
        UserModel.create(
          {
            name: userToSeed.name,
            scrapedUser: true,
            // FIX BUG @ ask if scraped user has to be set as verifiedEmail true or not
            isVerifiedEmail: false,
            bio: userBio,
            profile: userProfile,
            email: userSlug + "@gmail.com",
            password: "",
            slug: userSlug,
            location: userLocation
          },
          (err, createdUser) => {
            if (err) {
              console.log(
                err,
                "something went wrong & new user cannot be created @ fn seedDatas"
              );
            }
            if (createdUser) {
              console.log(createdUser, "NEW USER CREATION SUCCESS");
            }
          }
        );
      }
    });
  }
}

// handle user profile while seeding
async function handleProfile(experience, education) {
  // this array stores user's experience array after
  let userExpArr = [];
  let userEduArr = [];
  console.log(experience, "restructuring user's profile");
  if (experience) {
    for (y = 0; y < experience.length; y++) {
      const jobToStructure = experience[y];
      if (jobToStructure.pastRoles) {
        for (z = 0; z < jobToStructure.pastRoles.length; z++) {
          let userExpObj = {};
          // let companyOfAllPositions = await handleCompanyToID(
          //   jobToStructure.company
          // );
          let newJobToStructure = jobToStructure.pastRoles[z];
          let newJobTitle = newJobToStructure.title;
          let dateToBeStructured = newJobToStructure.startDate.split(" ");
          let yearOfStart;
          let monthOfStart;
          if (dateToBeStructured[1]) {
            yearOfStart = Number(dateToBeStructured[1].trim());
            monthOfStart = await handleUserMonth(dateToBeStructured[0]);
          }
          // let yearOfStart = Number(dateToBeStructured[1].trim());
          // let monthOfStart = await handleUserMonth(dateToBeStructured[0]);
          let endDateToBeStructured = newJobToStructure.endDate;
          let structuredEndMonth;
          let structuredEndYear;
          if (endDateToBeStructured == "Present") {
            console.log("no end date insertion as userCurrently works here");
            userExpObj.currentlyWorkHere = true;
            userExpObj = {
              title: newJobTitle,
              company: await handleCompanyToID(jobToStructure.company),
              dates: {
                currentlyWorkHere: true,
                start: {
                  month: monthOfStart,
                  year: yearOfStart
                }
              }
            };
            userExpArr.push(userExpObj);
          } else if (endDateToBeStructured != undefined) {
            console.log("structuring end dates @ inside elif");
            let thisEndDate = endDateToBeStructured.split(" ");
            if (thisEndDate[0]) {
              structuredEndMonth = await handleUserMonth(thisEndDate[0]);
            }
            if (thisEndDate[1]) {
              structuredEndYear = thisEndDate[1].trim();
            }
            // structuredEndMonth = await handleUserMonth(thisEndDate[0]);
            // structuredEndYear = thisEndDate[1].trim();

            userExpObj = {
              title: newJobTitle,
              company: await handleCompanyToID(jobToStructure.company),
              dates: {
                currentlyWorkHere: false,
                start: {
                  month: monthOfStart,
                  year: yearOfStart
                },
                end: {
                  month: structuredEndMonth,
                  year: structuredEndYear
                }
              }
            };
            userExpArr.push(userExpObj);
          }
        }
      }
      if (!jobToStructure.pastRoles) {
        let singleJobTitle = jobToStructure.title;
        // let singleCompanyID = await handleCompanyToID(jobToStructure.company);
        let StartDateArr;
        let singleStartMonth;
        let singleStartYear;
        let EndDateArr;
        if (jobToStructure.startDate != undefined) {
          StartDateArr = jobToStructure.startDate.split(" ");
          singleStartMonth = await handleUserMonth(StartDateArr[0]);
          if (StartDateArr[1]) {
            singleStartYear = Number(StartDateArr[1].trim());
          }
          EndDateArr = jobToStructure.endDate;
        }
        // let StartDateArr = jobToStructure.startDate.split(" ");
        // let singleStartMonth = await handleUserMonth(StartDateArr[0]);
        // let singleStartYear = Number(StartDateArr[1].trim());
        // let EndDateArr = jobToStructure.endDate;
        if (EndDateArr == "Present") {
          console.log("no end date insertion as userCurrently works here");
          userExpObj.currentlyWorkHere = true;
          userExpObj = {
            title: singleJobTitle,
            company: await handleCompanyToID(jobToStructure.company),
            dates: {
              currentlyWorkHere: true,
              start: {
                month: singleStartMonth,
                year: singleStartYear
              }
            }
          };
          userExpArr.push(userExpObj);
        } else if (EndDateArr != undefined) {
          console.log("structuring end dates @ inside elif", EndDateArr);
          let newEndDateArr = EndDateArr.split(" ");
          singleEndMonth = await handleUserMonth(newEndDateArr[0]);
          if (newEndDateArr[1]) {
            singleEndYear = newEndDateArr[1].trim();
          }

          userExpObj = {
            title: singleJobTitle,
            company: await handleCompanyToID(jobToStructure.company),
            dates: {
              currentlyWorkHere: false,
              start: {
                month: singleStartMonth,
                year: singleStartYear
              },
              end: {
                month: singleEndMonth,
                year: singleEndYear
              }
            }
          };
          userExpArr.push(userExpObj);
        }
      }
    }
  }
  if (education) {
    console.log("restructuring educations");
    for (b = 0; b < education.length; b++) {
      let eduToStructure = education[b];
      // console.log(eduToStructure, "@1");
      let degreeOfUser = eduToStructure.degree;
      let datesObj = {
        start: eduToStructure.date1,
        end: eduToStructure.date2
      };
      let userUniversity = await handleUserUniversity(eduToStructure.title);
      let uniObjToSeedForEdu = {
        university: userUniversity,
        programme: degreeOfUser,
        dates: datesObj
      };
      userEduArr.push(uniObjToSeedForEdu);
    }
  }
  console.log(userExpArr, "mainCheck");
  console.log(userEduArr, "mainCheck2");

  let returningObj = {
    experiences: userExpArr,
    education: userEduArr
  };
  return returningObj;
  // console.log(userExpObj, "mainCheck2");
}

async function handleUserUniversity(universityName) {
  let universityObjId = [];
  if (universityName) {
    let universityOfUser = universityName;
    await UniversityModel.findOne(
      { name: universityName },
      (err, universityFound) => {
        if (err) {
          console.log(
            err,
            "cannot found university @findOne - handleUniversity"
          );
        }
        if (!universityFound) {
          console.log(
            "no university found, hence creating a new document for it in db"
          );
          UniversityModel.create(
            {
              name: universityOfUser,
              userCount: 1,
              slug: getSlugFromName(universityOfUser)
            },
            (err, createdUniversity) => {
              if (err) {
                console.log(
                  "something went wrong while creating new university in db",
                  err
                );
              }
              universityObjId.push(createdUniversity._id).then((err, res) => {
                if (err) {
                  console.log(err);
                }
                console.log("its here");
                if (res) {
                  console.log(res, "this is response");
                }
              });
              if (createdUniversity) {
                console.log("UNIVERSITY CREATED & PUSHED SUCCESSFULLY");
                universityObjId.push(createdUniversity._id);
              }
            }
          );
        }
        if (universityFound != null) {
          console.log(
            "university found, hence updating the existing document in db"
          );
          let universityId = universityFound._id;
          universityObjId.push(universityId);
          // console.log(universityObjId, "here");
          UniversityModel.findOneAndUpdate(
            { _id: universityId },
            { $inc: { userCount: 1 } },
            { new: true },
            (err, universityToUpdate) => {
              if (err) {
                console.log(
                  err,
                  "something went wrong while finding university"
                );
              }
              if (universityToUpdate) {
                console.log(
                  "university document count increased & assigned to user",
                  universityToUpdate._id
                );
              }
            }
          );
        }
      }
    );
  }
  return universityObjId[0];
}

async function getSlugFromName(name) {
  return slugify(name).toLowerCase() || name.toLowerCase().replace(/\s+/g, "-");
}

async function handleNewCompany(newComNameArr) {
  console.log("inside fn");
  let comDataArr = newComNameArr;
  if (newComNameArr) {
    for (c = 0; c < comDataArr.length; c++) {
      let companyToSearch = comDataArr[c].company;
      CompanyModel.findOne(
        { name: companyToSearch },
        (err, companyToCreate) => {
          if (err) {
            console.log(err, "something went wrong @ handleNewCompany");
          }
          if (companyToCreate == null) {
            var creatingCom = CompanyModel.create({
              name: companyToSearch,
              userCount: 1,
              slug: getSlugFromName(companyToSearch)
            });
            creatingCom.then(companyNewData => {
              console.log(companyNewData, "new compamy created");
            });
          }
        }
      );
    }
  }
}

async function handleCompanyToID(companyName) {
  let companyIDFromName = [];
  if (companyName) {
    let companyOfUser = companyName;
    await CompanyModel.findOne({ name: companyName }, (err, companyFound) => {
      if (err) {
        console.log("something went wrong while doing CompanyModel.}findOne");
      }
      if (companyFound) {
        console.log(
          "company found, updating userCount in company & appending to user's object"
        );
        let companyID = companyFound._id;
        companyIDFromName.push(companyID);
        CompanyModel.findOneAndUpdate(
          { name: companyName },
          { $inc: { userCount: 1 } },
          { new: true, upsert: true },
          (err, updatedCompany) => {
            if (err) {
              console.log(
                "something went wrong when updating count of userCompany"
              );
            }
            if (updatedCompany) {
              console.log("company document updated in db", updatedCompany._id);
            }
          }
        );
      }
    });
  }
  console.log(companyIDFromName, "ckckc");
  if (companyIDFromName[0]) {
    return companyIDFromName[0];
  }
}

// throw any month in it's params @ 3 LETTERS ONLY & it will return it's number back
async function handleUserMonth(month) {
  return new Date(Date.parse(month + " 1, 2012")).getMonth() + 1;
}

// handle user skills while seeding
async function handleBio(jobTitle, company, skills) {
  let userHeadLine;
  let userSkillStructured = [];
  let skillsLength = skills.length;
  console.log(skillsLength, "check1 @ skill length");

  // FIX BUG HERE
  if (jobTitle && company) {
    userHeadLine = jobTitle + " at " + company;
  }
  for (x = 0; x < skillsLength; x++) {
    await SkillModel.findOne({ name: skills[x] }, (err, collection) => {
      if (err) console.log("something went wrong", err);
      if (!collection) {
        console.log(`Collection for ${skills[x]} not found in database`);
        // adding a new collection as it's not found
        SkillModel.create(
          { name: skills[x], userCount: 1 },
          (err, createdSkill) => {
            if (err)
              console.log(
                "something went wrong & hence skill could not be created"
              );
            if (createdSkill) {
              console.log(
                createdSkill,
                "New Skill Created by Seeder with userCount increased to 1"
              );
              // push id of new created skill to the array of structured data
              userSkillStructured.push(createdSkill._id);
            }
          }
        );
      }
      if (collection != null) {
        let collectionID = collection._id;
        console.log(
          collectionID,
          "skill found, replacing with ObjectID",
          `number: ${x}`,
          skills[x]
        );
        // incrementing SkillModel's userCount
        SkillModel.findOneAndUpdate(
          { _id: collectionID },
          { $inc: { userCount: 1 } },
          { new: true },
          (err, updatedSkill) => {
            if (err) {
              console.log("Error : Skill userCount cannot be incremented");
            }
            if (updatedSkill) {
              console.log(updatedSkill, "increased user count successfully");
            }
          }
        );
        // push id of exisiting collection to the array of structured data
        userSkillStructured.push(collectionID);
      }
    });
  }
  // the object which gets returned from this function
  const structuredUserBio = {
    headline: userHeadLine,
    skills: userSkillStructured
  };
  return structuredUserBio;
}

// fn to create a random password @ params - name of the user
async function createRandomStrongPassword(name) {
  // generating random password from a randomString
  if (name) {
    var randomstring = Math.random()
      .toString(36)
      .slice(-8);
    let newPassword = randomstring + name;
    return newPassword;
  }
}

// handle user location while seeding
async function handleLocation(location) {
  let userLocationArr = [];
  if (location) {
    await LocationModel.findOne({ name: location }, (err, foundLocation) => {
      if (err) {
        console.log("location cannot be found, somthing went wrong");
      }
      if (foundLocation != null) {
        console.log("location found @ handleLocation findOne");
        // userLocationArr = [];
        let userLocationId = foundLocation._id;
        userLocationArr.push(userLocationId);
        LocationModel.findOneAndUpdate(
          { _id: userLocationId },
          { $inc: { userCount: 1 } },
          { new: true },
          (err, updatedLocationCount) => {
            if (err) {
              console.log(
                "something went wrong & location count cannot be updated",
                err
              );
            }
            if (updatedLocationCount) {
              console.log(
                "LOCATION COUNT INCREASED SUCCESSFULLY",
                userLocationId
              );
            }
          }
        );
      }

      if (!foundLocation) {
        // userLocationArr = [];
        console.log("No location found in db, hence creating new location");
        LocationModel.create(
          {
            name: location,
            userCount: 1
          },
          (err, newCreatedLoc) => {
            if (err) {
              console.log(
                "something went wrong while creating new location",
                err
              );
            }
            if (newCreatedLoc) {
              console.log(
                "New location Created by Seeder with userCount increased to 1",
                newCreatedLoc._id
              );
              userLocationArr.push(newCreatedLoc._id);
            }
          }
        );
      }
    });
    let userLocObj = {
      currentLocation: userLocationArr[0]
    };
    return userLocObj;
  }
}
