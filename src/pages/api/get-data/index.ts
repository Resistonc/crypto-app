import { NextApiRequest, NextApiResponse } from 'next';
import { setupDatabase } from './setup';

const pool = setupDatabase();

const GetDataHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    try {
        console.log('Connected to the database');
        pool.query('SELECT * FROM crypto_info', (error, results) => {
            if (error) {
                console.error(error);
                res.status(500).json({
                    success: false,
                    reason: 'An error occurred while fetching data from the database',
                });
            } else {
                res.status(200).json({
                    success: true,
                    data: results,
                });
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            reason: 'An error occurred while connecting to the database',
        });
};
}

export default GetDataHandler;
