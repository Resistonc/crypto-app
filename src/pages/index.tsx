// Poprawiony kod z typami i obiektami kryptowalut
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MyChart from '@/components/MyChart';
import Button from '@/components/Button';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/authContext';
import { supabase } from '@/lib/supabaseClient';
import { buyCrypto, sellCrypto } from '@/lib/cryptoActions';

interface CryptoDisplay {
  id: number;
  name: string;
  symbol: string;
  price: number;
  change: number;
}

const Home: React.FC = () => {
  const [topCryptos, setTopCryptos] = useState<CryptoDisplay[]>([]);
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoDisplay | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState(0);
  const [cryptoPrice, setCryptoPrice] = useState<number | null>(null);

  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const fetchTopCryptos = async () => {
      const { data: dbCryptos } = await supabase.from('cryptocurrencies').select('*');
      const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: 5,
          page: 1,
          sparkline: false
        }
      });
      const cryptos = response.data.map((crypto: any) => {
        const match = dbCryptos?.find((db: any) => db.symbol === crypto.symbol);
        return {
          id: match?.id,
          name: crypto.name,
          symbol: crypto.symbol,
          price: crypto.current_price,
          change: crypto.price_change_percentage_24h
        };
      }).filter((c: any) => c.id);

      setTopCryptos(cryptos);
      if (!selectedCrypto && cryptos.length) setSelectedCrypto(cryptos[0]);
    };

    fetchTopCryptos();
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchBalance = async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('balance')
        .eq('user_id', user.id)
        .single();
      if (!error && data) setBalance(data.balance);
    };
    fetchBalance();
  }, [user]);

  useEffect(() => {
    const fetchCryptoPrice = async () => {
      if (!selectedCrypto) return;
      const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
        params: {
          ids: selectedCrypto.symbol,
          vs_currencies: 'usd'
        }
      });
      setCryptoPrice(response.data[selectedCrypto.symbol]?.usd || null);
    };
    if (isModalOpen) fetchCryptoPrice();
  }, [selectedCrypto, isModalOpen]);

  const openModal = (type: 'buy' | 'sell') => {
    setTransactionType(type);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setAmount(0);
  };

  const handleTransaction = async () => {
    if (!user || !balance || !cryptoPrice || !selectedCrypto) return;
    if (transactionType === 'buy') {
      await buyCrypto(user, balance, setBalance, selectedCrypto.id, amount);
    } else {
      await sellCrypto(user, balance, setBalance, [], selectedCrypto.id, amount);
    }
    closeModal();
  };

  if (loading) return <p>Ładowanie...</p>;

  return (
    <div className="relative flex flex-col items-center min-h-screen bg-gray-100 p-6">
      <div className="absolute top-4 right-4 flex items-center gap-4">
        {user && balance !== null && <p className="text-lg font-semibold">Saldo: ${balance.toFixed(2)}</p>}
        {user ? (
          <Button type="default" onClick={() => router.push('/profile')}>Przejdź do profilu</Button>
        ) : (
          <Button type="default" onClick={() => router.push('/login')}>Zaloguj</Button>
        )}
      </div>

      {user && selectedCrypto ? (
        <div className="relative flex flex-col md:flex-row w-full max-w-6xl items-start justify-center">
          <div className="md:w-1/6 mr-16 mt-40 flex flex-col gap-4 self-start">
            {topCryptos.map((crypto) => (
              <div
                key={crypto.id}
                className={`p-2 bg-white shadow-md rounded-lg flex flex-col items-start text-sm w-full cursor-pointer ${selectedCrypto.id === crypto.id ? 'border-2 border-blue-500' : ''}`}
                onClick={() => setSelectedCrypto(crypto)}
              >
                <h2 className="text-base font-semibold">{crypto.name}</h2>
                <p className="text-sm">${crypto.price.toFixed(2)}</p>
                <p className={`text-xs ${crypto.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>Zmiana 24h: {crypto.change.toFixed(2)}%</p>
              </div>
            ))}
          </div>
          <div className="md:w-3/4 flex flex-col items-start">
            <h1 className="text-center text-3xl ml-72 font-bold my-6">Zmiany cenowe {selectedCrypto.name}</h1>
            <div className="w-full max-w-4xl bg-white p-6 rounded-lg shadow-md">
              <MyChart selectedCrypto={selectedCrypto.symbol} />
            </div>
            <div className="absolute bottom-10 right-10 flex flex-col gap-4">
              <button className="bg-green-500 text-white py-2 px-4 rounded" onClick={() => openModal('buy')}>
                Kup {selectedCrypto.symbol.toUpperCase()}
              </button>
              <button className="bg-red-500 text-white py-2 px-4 rounded" onClick={() => openModal('sell')}>
                Sprzedaj {selectedCrypto.symbol.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-lg">Zaloguj się, aby inwestować.</p>
      )}

      {isModalOpen && selectedCrypto && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-md w-96">
            <h2 className="text-lg font-semibold">
              {transactionType === 'buy' ? 'Kup' : 'Sprzedaj'} {selectedCrypto.symbol.toUpperCase()}
            </h2>
            <p className="mt-2">Cena: {cryptoPrice ? `$${cryptoPrice.toFixed(2)}` : 'Ładowanie...'}</p>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full p-2 border border-gray-300 rounded mt-2"
              placeholder="Ilość"
            />
            <p className="mt-2 font-semibold">
              {transactionType === 'buy' ? 'Koszt transakcji' : 'Wartość transakcji'}:{' '}
              {cryptoPrice ? `$${(amount * cryptoPrice).toFixed(2)}` : 'Ładowanie...'}
            </p>
            <div className="flex justify-between mt-4">
              <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={handleTransaction}>
                Potwierdź
              </button>
              <button className="bg-gray-500 text-white px-4 py-2 rounded" onClick={closeModal}>
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;