const fs = require("fs");
const mongoose = require("mongoose");
const User = require("../../intcrzyppl-api/models/models/User");

// var scrapedUser = require("./");
// - variable which stores jsonData after file is readen
let jsonData;
// = variable which stores mainStructured User Data which is then pushed to mongoose
let mainUserStore = [];

// - reads file which stores scraped.json i.e. scraped user
fs.readFile("scraped.json", "utf-8", (err, data) => {
  if (err) throw err;
  jsonData = JSON.parse(data);
  // passing control to structureData fn
  structureData(jsonData);
});

// - function which takes care of multiple roles in one comapany & returns them in structured format for our schema
async function handleMultipleRoles(multipleRolesData) {
  let pastRoles = [];
  for (z = 0; z < multipleRolesData.length; z++) {
    // structure user's duration
    let duration = multipleRolesData[z].date1.split(" – ");
    // multiple roles Object that's pushed to array
    pastRoles.push({
      title: multipleRolesData[z].title,
      startDate: duration[0],
      endDate: duration[1],
      totalDuration: multipleRolesData[z].date2
    });
  }
  return pastRoles;
}

// - function which reads the jsonData of scraped users & converts it to a structured one for seeding into database.
// - last layer of data check & structuring
// - handle every error here, as after here the data will be seeded to databases directly on multiple clusters
async function structureData(jsonData) {
  let scrapedUsers = jsonData;
  for (i = 0; i < scrapedUsers.length; i++) {
    // handling userCompany's title & position
    let userCompany = scrapedUsers[i].userObj.profile.headline.split("at");
    if (userCompany[0]) {
      userCompany[0] = userCompany[0].trim();
    }
    if (userCompany[1]) {
      userCompany[1] = userCompany[1].trim();
    }

    // - to handle userLocation @ get formatted data of locations from Joshua
    let userLocation = scrapedUsers[i].userObj.profile.location;

    // - handling userPastJobs
    let userPastJobs = scrapedUsers[i].userObj.jobs;
    let usersPastJobArr = [];
    let jobDuration;
    console.log(userPastJobs, "check1");
    if (userPastJobs != undefined) {
      for (x = 0; x < userPastJobs.length; x++) {
        // structure user's duration
        if (userPastJobs[x].date1) {
          jobDuration = userPastJobs[x].date1.split(" – ");
        }

        // handle multiple roles in one company
        let multipleRoles = userPastJobs[x].roles;

        // pastJobs Object that's pushed to array
        let structuredPastJobs = {
          title: userPastJobs[x].title,
          company: userPastJobs[x].companyName || userPastJobs[x].title
        };
        if (jobDuration != undefined) {
          structuredPastJobs.startDate = jobDuration[0];
          structuredPastJobs.endDate = jobDuration[1];
        }

        // if multiple roles found in same company append the multipleRoles as pastRoles in Object
        if (multipleRoles != undefined) {
          // if multiple roles are found, this fn handles it's structuring
          let structureRolesInCompany = await handleMultipleRoles(
            multipleRoles
          );
          structuredPastJobs.pastRoles = structureRolesInCompany;
        }
        usersPastJobArr.push(structuredPastJobs);
      }
    }

    // - handling user skills & formatting them to fit our schema
    let userSkills = scrapedUsers[i].userObj.skills;
    let userSkillArr = [];
    for (y = 0; y < userSkills.length; y++) {
      userSkillArr.push(userSkills[y].title);
      console.log("pushing", userSkills[y].title);
    }

    // - handling user volunteer experience
    let userVolunteerExperience = scrapedUsers[i].userObj.volunteerExperience;
    let userVolunteerExpArr = [];
    for (q = 0; q < userVolunteerExperience.length; q++) {
      let userDuration = userVolunteerExperience[q].date1;
      if (userDuration != undefined) {
        userDuration = userVolunteerExperience[q].date1.split(" – ");
        userVolunteerExpArr.push({
          title: userVolunteerExperience[q].title,
          experience: userVolunteerExperience[q].experience,
          startDate: userDuration[0],
          endDate: userDuration[1],
          totalDuration: userVolunteerExperience[q].date2
        });
      }
    }

    // pushing Object of user ready to be seeded into mainUserStore array so that writing JSON File from array will be a breeze.
    mainUserStore.push({
      name: scrapedUsers[i].userObj.profile.name,
      jobTitle: userCompany[0],
      // college: scrapedUsers[i].userObj.education[0].title,
      company: userCompany[1] || userCompany[0],
      location: userLocation,
      pastJobs: usersPastJobArr,
      education: scrapedUsers[i].userObj.education,
      skills: userSkillArr,
      volunteerExperience: userVolunteerExpArr
    });
  }
  console.log(mainUserStore);
  // writing users ready to be seeded to JSON File in encoded format 'utf-8'
  pushToJson();
}

// function to write scraped data to json file after the scraping is completed
function pushToJson() {
  fs.writeFile(
    "scrapedtoseed.json",
    JSON.stringify(mainUserStore),
    "utf8",
    err => {
      if (err) {
        console.log("An error occured while writing JSON Object to File.");
        return console.log(err);
      }
      console.log("JSON File saved, file-name: scrapedtoseed.json");
    }
  );
}
