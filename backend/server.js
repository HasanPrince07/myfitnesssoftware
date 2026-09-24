const express = require('express');
const app = express();
const pool = require('./db');
const cors = require("cors");
const adminRouter = require('./router/admin');
require("dotenv").config();
const pg = require('pg');
pg.types.setTypeParser(1082, function (stringValue) {
    return stringValue;
});


const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors({ origin: ["http://localhost:3000"], credentials: true }));

pool.query('SELECT NOW()')
    .then(() => {
        console.log('Database is connected successfully');
    })
    .catch((error) => {
        console.log('Database connection failed:', error.message);
    });

app.use('/admin', adminRouter);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});