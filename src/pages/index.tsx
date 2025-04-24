import React, { useState, useEffect } from 'react';
import MyChart from '@/components/MyChart';
import Button from '@/components/Button';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/authContext';
import { supabase } from '@/lib/supabaseClient';
import { buyCrypto, sellCrypto } from '@/lib/cryptoActions';

interface Crypto {
  id: number;
  name: string;
  symbol: string;
  price: number;
  change: number;
}

const Home: React.FC = () => {
  const [topCryptos, setTopCryptos] = useState<Crypto[]>([]);
  const [selectedCrypto, setSelectedCrypto] = useState<Crypto | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [transactionType, setTransactionType] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState<number>(0);
  const [cryptoPrice, setCryptoPrice] = useState<number | null>(null);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const fetchCryptosFromDb = async () => {
        const { data: cryptos, error: cryptosError } = await supabase
            .from('cryptocurrencies')
            .select('id, name, symbol');

        if (cryptosError || !cryptos) {
            console.error('Błąd pobierania kryptowalut:', cryptosError);
            return;
        }

        const cryptoData: Crypto[] = [];

        for (const crypto of cryptos) {
            const { data: prices, error: pricesError } = await supabase
                .from('crypto_prices')
                .select('price')
                .eq('cryptocurrency_id', crypto.id)
                .order('fetched_at', { ascending: false })
                .limit(2);

            if (pricesError || !prices || prices.length === 0) continue;

            const current = prices[0].price;
            const previous = prices[1]?.price ?? prices[0].price; // fallback jeśli tylko jedna cena

            const change = ((current - previous) / previous) * 100;

            cryptoData.push({
                id: crypto.id,
                name: crypto.name,
                symbol: crypto.symbol,
                price: current,
                change
            });
        }

        setTopCryptos(cryptoData);
        setSelectedCrypto(cryptoData[0]);
    };

    fetchCryptosFromDb();
}, []);


  useEffect(() => {
    const fetchBalance = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Błąd pobierania salda:', error);
      } else {
        setBalance(data.balance);
      }
    };

    fetchBalance();
  }, [user]);

  const handleLoginRedirect = () => router.push('/login');
  const handleProfileRedirect = () => router.push('/profile');

  const openModal = (type: 'buy' | 'sell') => {
    setTransactionType(type);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setAmount(0);
  };

  const handleTransaction = async () => {
    if (!user || !balance || !selectedCrypto) return;
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
        {user && balance !== null && (
          <p className="text-lg font-semibold">Saldo: ${balance.toFixed(2)}</p>
        )}
        {user ? (
          <Button type="default" onClick={handleProfileRedirect}>Przejdź do profilu</Button>
        ) : (
          <Button type="default" onClick={handleLoginRedirect}>Zaloguj</Button>
        )}
      </div>

      <div className="relative flex flex-col md:flex-row w-full max-w-6xl items-start justify-center">
      <div className="md:w-1/6 mr-16 mt-40 flex flex-col gap-4 self-start">
  {topCryptos.map((crypto) => {
    const trendColor = crypto.change > 0 ? 'text-green-500' : crypto.change < 0 ? 'text-red-500' : 'text-gray-500';

    return (
      <div
        key={crypto.id}
        className={`p-2 bg-white shadow-md rounded-lg flex flex-col items-start text-sm w-full cursor-pointer ${
          selectedCrypto?.id === crypto.id ? 'border-2 border-blue-500' : ''
        }`}
        onClick={() => setSelectedCrypto(crypto)}
      >
        <h2 className="text-base font-semibold">{crypto.name}</h2>
        <p className="text-sm">${crypto.price.toFixed(2)}</p>
        <p className={`text-xs flex items-center gap-1 ${trendColor}`}>
           Zmiana: {crypto.change.toFixed(2)}%
        </p>
      </div>
    );
  })}
</div>

        <div className="md:w-3/4 flex flex-col items-start">
          <h1 className="text-center text-3xl ml-72 font-bold my-6">
            Zmiany cenowe {selectedCrypto?.name}
          </h1>
          <div className="w-full max-w-4xl bg-white p-6 rounded-lg shadow-md">
            {selectedCrypto && <MyChart selectedCrypto={selectedCrypto.name.toLowerCase()} />}
          </div>
          <div className="absolute bottom-10 right-10 flex flex-col gap-4">
            <button className="bg-green-500 text-white py-2 px-4 rounded" onClick={() => openModal('buy')}>
              Kup {selectedCrypto?.name.toUpperCase()}
            </button>
            <button className="bg-red-500 text-white py-2 px-4 rounded" onClick={() => openModal('sell')}>
              Sprzedaj {selectedCrypto?.name.toUpperCase()}
            </button>
          </div>
        </div>
      </div>

      {isModalOpen && selectedCrypto && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-md w-96">
            <h2 className="text-lg font-semibold">
              {transactionType === 'buy' ? 'Kup' : 'Sprzedaj'} {selectedCrypto.name.toUpperCase()}
            </h2>
            <p className="mt-2">
              Cena: ${selectedCrypto.price.toFixed(2)}
            </p>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full p-2 border border-gray-300 rounded mt-2"
              placeholder="Ilość"
            />
            <p className="mt-2 font-semibold">
              {transactionType === 'buy' ? 'Koszt transakcji' : 'Wartość transakcji'}:{' '}
              ${(amount * selectedCrypto.price).toFixed(2)}
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