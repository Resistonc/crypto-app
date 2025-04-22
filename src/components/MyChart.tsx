import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface MyChartProps {
  selectedCrypto: string;
}

const MyChart: React.FC<MyChartProps> = ({ selectedCrypto }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(
          `https://api.coingecko.com/api/v3/coins/${selectedCrypto}/market_chart`,
          {
            params: {
              vs_currency: 'usd',
              days: days,
              interval: 'daily'
            }
          }
        );
        const prices = response.data.prices.map((price: [number, number]) => ({
          date: new Date(price[0]).toLocaleDateString(),
          cena: parseFloat(price[1].toFixed(2))
        }));
        setData(prices);
      } catch (error) {
        setError('Błąd podczas pobierania danych. Spróbuj ponownie.');
      } finally {
        setLoading(false);
      }
    };

    const fetchCurrentPrice = async () => {
      try {
        const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
          params: {
            ids: selectedCrypto,
            vs_currencies: 'usd',
            include_24hr_change: 'true'
          }
        });
        setCurrentPrice(response.data[selectedCrypto].usd);
        setPriceChange(response.data[selectedCrypto].usd_24h_change);
      } catch (error) {
        setError('Błąd podczas pobierania aktualnej ceny.');
      }
    };

    fetchData();
    fetchCurrentPrice();
  }, [selectedCrypto, days]);

  const formatYAxis = (tickItem: number) => `$${tickItem.toFixed(2)}`;
  const formatTooltip = (value: number) => `$${value.toFixed(2)}`;

  return (
    <div className="flex flex-col items-center mt-8">
      <div className="mb-4 flex gap-4">
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>7 dni</option>
          <option value={30}>30 dni</option>
          <option value={90}>90 dni</option>
        </select>
      </div>
      <div className="mb-4 text-xl">
        <p>Aktualna cena: {currentPrice ? `$${currentPrice.toFixed(2)}` : 'Ładowanie...'}</p>
        {priceChange !== null && (
          <p className={priceChange >= 0 ? 'text-green-500' : 'text-red-500'}>
            Zmiana 24h: {priceChange.toFixed(2)}%
          </p>
        )}
      </div>
      {loading && <p>Ładowanie danych...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && (
        <ResponsiveContainer width="90%" height={400}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={formatYAxis} />
            <Tooltip formatter={formatTooltip} />
            <Legend />
            <Line type="monotone" dataKey="cena" stroke="#8822d8" />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default MyChart;
