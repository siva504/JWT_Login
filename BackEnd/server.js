var express = require("express");
var bodyParser = require("body-parser");
var cors = require("cors");
var app = express();
var jwt = require("jsonwebtoken");
var session = require("express-session");
const { Client } = require("pg");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cors());
app.use(
  session({
        secret: "secretkey",
    saveUninitialized: true,
    resave: true,
  })
);

const client = new Client({
  user: "postgres",
  password: "siva@123",
  host: "localhost",
  port: 5432,
  database: "Customer",
});

client
  .connect()
  .then(() => {
    console.log("Postgresql database was connected");
  })
  .catch((err) => {
    console.log("error in databases", err);
  });

app.post("/createAccount", (req, res) => {
  const { username, password, email } = req.body;
  client.query(
    "insert into login(username,password,email)values($1,$2,$3) RETURNING id",
    [username, password, email],
    (err, result) => {
      if (err) {
        throw err;
      } else {
        const newUserId = result.rows[0].id;
        res.status(201).json({
          message: "User created account  successfully",
          data: {
            id:newUserId,
            Details: { username, password, email },
          },
        });
      }
    }
  );
});

app.post("/login1", (req, res) => {
  const { email, password } = req.body;
  const jwtToken = jwt.sign({ Email: email, Password: password }, "secertkey", {
    expiresIn: "1h",
  });
  console.log(jwtToken);
  const decodeJwtToken = jwt.verify(jwtToken, "secertkey");
  console.log(decodeJwtToken);
  res.send({
    token: jwtToken,
    decoded: decodeJwtToken,
  });
});
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const query =
    "SELECT id, username, email, password FROM login WHERE email = $1 AND password = $2";

  client.query(query, [email, password], (err, result) => {
    if (err) {
      console.error("Error executing query:", err);
      return res
        .status(500)
        .json({ message: "An error occurred. Please try again later" });
    }

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const userDetails = result.rows[0];

    req.session.user = {
      id: userDetails.id,
      username: userDetails.username,
      email: userDetails.email
      
    };
    console.log(req.session.user);
    const jwtToken = jwt.sign({ Email: email }, "secertkey", {
      expiresIn: "1h",
    });
    res.status(200).json({
      message: "User login successful",
      data: {
        details: {
          id: userDetails.id,
          username: userDetails.username,
          email: userDetails.email,
          password: userDetails.password,
          token: jwtToken,
          session:req.session.user
        },
      },
    });
  });
});

app.get("/get/:id", (req, res) => {
  const id = parseInt(req.params.id);
  client.query(
    "select id,username,email from login where id=$1",
    [id],
    (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).json({ err: "Internal server error" });
      } else {
        if (result.rowCount === 0) {
          res.status(404).json({ message: `User with ID ${id} is not found ` });
        } else {
          const { id, username, email } = result.rows[0];
          res.status(200).json({
            message: `Getting the details with id ${id}`,
            data: {
              Details: { id, username, email },
            },
          });
        }
      }
    }
  );
});

app.get("/getting", (req, res) => {
  client.query("select * from login", (err, result) => {
    if (err) {
      throw err;
    } else {
      res.status(200).json(result.rows);
    }
  });
});

app.get("/get_Details", (req, res) => {
  console.log(req.session);
  console.log("Data will be accessing");
  if (req.session.view) {
    req.session.view++;
  } else {
    req.session.view = 1;
  }
  res.send(`you have visited this api ${req.session.view} `);
});

// app.get('/auth', (req, res) => {
//     const token = req.headers.authorization;

//     if (!token) {
//         return res.status(401).json({
//             login: false,
//             message: "No token provided"
//         });
//     }
//     const tokenWithoutPrefix = token.split(' ')[1];

//     try {
//         const decodedToken = jwt.verify(tokenWithoutPrefix, "secertkey");

//         res.json({
//             login: true,
//             decodedToken: decodedToken
//         });
//     } catch (err) {
//         console.error('Error verifying token:', err);
//         res.status(401).json({
//             login: false,
//             message: "Invalid token"
//         });
//     }
// });

function verifyToken(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({
      login: false,
      message: "No token provided",
    });
  }

  const tokenWithoutPrefix = token.split(" ")[1];

  try {
    const decodedToken = jwt.verify(tokenWithoutPrefix, "secertkey");
    req.userEmail = decodedToken.Email;
    next();
  } catch (err) {
    console.error("Error verifying token:", err);
    res.status(401).json({
      login: false,
      message: "Invalid token",
    });
  }
}

app.get("/get_detail", verifyToken, (req, res) => {
  const userEmail = req.userEmail;
  const query = "SELECT id, username, email FROM login WHERE email = $1";

  client.query(query, [userEmail], (err, result) => {
    if (err) {
      console.error("Error executing query:", err);
      return res
        .status(500)
        .json({ message: "An error occurred. Please try again later" });
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const userDetails = result.rows[0];
    res.status(200).json({
      message: "User details retrieved successfully",
      data: {
        details: {
          id: userDetails.id,
          username: userDetails.username,
          email: userDetails.email,
        },
      },
    });
  });
});

app.listen(5004, () => {
  console.log("Sever starting at port number 5004");
});
