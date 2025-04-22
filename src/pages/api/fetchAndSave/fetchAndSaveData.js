const axios = require('axios');
const mysql = require('mysql');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '1',
    database: 'mydb'
};

const API_KEY = 'X+W+2iPzCJ9ooNeGWcpC7g==xpunBz63wt5tkZaj';
const connection = mysql.createConnection(dbConfig);
const fetchDataAndSaveToDatabase = async () => {
    try {

        const response = await axios.get('https://api.api-ninjas.com/v1/cryptoprice?symbol=BTCUSD', {
            headers: {
                'X-API-Key': API_KEY
            }
        });
        let data = response.data;


        if (!Array.isArray(data)) {
            data = [data];
        }
        data.forEach(entry => {
            const { symbol, price, timestamp } = entry;
            const query = `INSERT INTO crypto_info (symbol, price, timestamp) VALUES (?, ?, ?)`;
            connection.query(query, [symbol, price, timestamp], (error, results, fields) => {
                if (error) {
                    console.error('Error inserting data into database:', error);
                }
            });
        });

        console.log('Data fetched and saved successfully!');
    } catch (error) {
        console.error('Error fetching and saving data:', error);
    }
};


 const intervalTimeInMilliseconds = 60;
setInterval(fetchDataAndSaveToDatabase, intervalTimeInMilliseconds);
