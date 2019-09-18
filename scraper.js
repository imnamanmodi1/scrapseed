// preventing script timeouts & set the max process to 100 //
require("events").defaultMaxListeners = 100;

// requiring packages
const scrapedin = require("scrapedin");
const fs = require("fs");
const csv = require("csv-parser");

// declaring initial variables
var urls = [];
const allUsers = [];
let userCount = 0;

//function to make script sleep
async function init() {
  console.log(1);
  await sleep(1000);
  console.log(2);
}

function sleep(ms) {
  console.log("sleeping");
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

// start reading a CSV File to find URLs
readCsvFile();

// multiple logins which makes scraping scalable, we can add more if needed
// successfully tested with 15 batch
const login = [
  { email: "ashutosh@digitaliz.in", password: "Naman@123" },
  { email: "ruchi@digitaliz.in", password: "Naman@123" }
];

// to read a csv file
async function readCsvFile() {
  fs.createReadStream("FB-Linkedin-Members.csv")
    .pipe(csv())
    .on("data", function(data) {
      try {
        data = data.Linkedin_ID;
        urls.push(data);
        // console.log(urls, "this is data");
      } catch (err) {
        //error handler
      }
    })
    .on("end", function() {
      console.log(urls, "here is url");
      //initiating JSON Writing
      loopCsv(0, 2);
    });
}

// loopCsv(2);
// to loopover a CSV & add each user to JSON File
async function loopCsv(start, end) {
  maxNumber = 20;
  start = start || 0;
  if (end > maxNumber) {
    end = maxNumber;
  }
  console.log(end, "inside loopCsv, Successful File Reading");
  for (i = start; i < end + 1; i++) {
    const urlToFetch = urls[i];
    console.log(urlToFetch, "this is url to fetch");
    await getUserDetails(urlToFetch);
  }
  pushToJson();
}

// function to write scraped data to json file after the scraping is completed
function pushToJson() {
  fs.writeFile("scraped.json", JSON.stringify(allUsers), "utf8", err => {
    if (err) {
      console.log("An error occured while writing JSON Object to File.");
      return console.log(err);
    }
    console.log("JSON File saved, file-name: scraped.json");
  });
}

// function to get a user details
async function getUserDetails(profileUrl) {
  userCount += 1;
  console.log(
    "userCount for fetch increased & getting main details",
    `count:${userCount} is current count`
  );
  const profileScraper = await scrapedin({
    email: userCount % 2 ? login[0].email : login[1].email,
    password: login[0].password,
    isHeadless: false,
    hasToLog: true
  }).catch(err => {
    console.log("Login Error", err);
  });
  const profile = await profileScraper(profileUrl, (waitTimeMs = 1000));
  console.log(profile, "this is profileAlternative");
  let userObj = await {
    profile: profile.profileAlternative,
    jobs: profile.positions,
    education: profile.educations,
    skills: profile.skills,
    volunteerExperience: profile.volunteerExperience
  };
  allUsers.push({ userObj });
  // return console.log("this is profile after stringify", userObj);
}
