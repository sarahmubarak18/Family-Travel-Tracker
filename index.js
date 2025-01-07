import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;
// establish relationship between users and visited_countries using foreign key and primary key (one to many relationship)
// references sets the foriegn key
const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1; // to get first users visited_countries

let users = [
  { id: 1, name: "Sarah", color: "teal" },
  { id: 2, name: "Maya", color: "powderblue" },
];
// users.id (primary key of users table) user_id (foreign key of the visited_countries table) gives all of the countries the users have been to
// currentuserid is set to one becauce when you land on the homepage you want to see the visited_countries of the first user
async function checkVisisted() {
  const result = await db.query("SELECT country_code FROM visited_countries JOIN users ON users.id = user_id WHERE user_id = $1; ", [currentUserId]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

async function getCurrentUser() {
  const result = await db.query("SELECT * FROM users");
  users = result.rows;
  return users.find((user) => user.id == currentUserId); // YOU CAN ALSO CREATE A SIMPLE FOR LOOP 
  // 3 equal signs might not work because of the datatype being diff or something. console.log(typeof user.id); console.log(typeof currentUserId);
}
app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const currentUser = await getCurrentUser();
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
  }); 
});
app.post("/add", async (req, res) => {
  const input = req.body["country"];
  const currentUser = await getCurrentUser(); // get a hold of the current user 


  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});
app.post("/user", async (req, res) => {
  // add button is clicked then hitting the new route
  if (req.body.add === "new") {
    res.render("new.ejs");
  } else {
    currentUserId = req.body.user; // here we are setting the currentUserId to be equal to whichever tab was selected
    res.redirect("/");
  }
});

app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
  // getting hold of name and the color entered and then inserting it into the db table
  // returning * returns the new record that was added from the INSERT and through this we can get hold of currentuserid
  const name = req.body.name;
  const color = req.body.color;

  const result = await db.query ("INSERT INTO users (name, color) VALUES($1, $2) RETURNING *;", [name,color]); 
 
  const id = result.rows[0].id;
  currentUserId = id; 

  res.redirect("/"); // id changes then redirect to the home route that checkvisiteduserid, latest and upto date info on user. 
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
