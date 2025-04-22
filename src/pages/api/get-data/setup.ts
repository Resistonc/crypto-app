import mysql from 'mysql';

const config = {
  host: 'localhost',
  user: 'root',
  password: '1',
  database: 'mydb',
};

export const setupDatabase = () => {
  const pool = mysql.createPool(config);
  return pool;
};
