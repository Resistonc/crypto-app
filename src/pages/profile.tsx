import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/authContext';
import { supabase } from '@/lib/supabaseClient';
import { buyCrypto, sellCrypto } from '@/lib/cryptoActions';
import Button from '@/components/Button';
import { useCryptocurrencies } from '@/hooks/useCryptocurrencies';

const Profile: React.FC = () => {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const cryptocurrencies = useCryptocurrencies();

  const [portfolio, setPortfolio] = useState<
    { amount: number; cryptocurrency: { id: number; symbol: string } }[]
  >([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [selectedCoinId, setSelectedCoinId] = useState<number | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [cryptoPrice, setCryptoPrice] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [transactionType, setTransactionType] = useState<'buy' | 'sell'>('buy');

  const [autoPrice, setAutoPrice] = useState<number>(0);
  const [autoAmount, setAutoAmount] = useState<number>(0);
  const [autoPriceNow, setAutoPriceNow] = useState<number | null>(null);

  const fetchPortfolio = async () => {
    const { data, error } = await supabase
      .from('user_portfolio')
      .select(`
        amount,
        cryptocurrency:cryptocurrencies!user_portfolio_cryptocurrency_id_fkey (
          id,
          symbol
        )
      `)      
      .eq('user_id', user?.id);

    if (error) {
      console.error('Błąd pobierania portfela:', error);
    } else {
      const fixedData = data.map((entry: any) => ({
        amount: entry.amount,
        cryptocurrency: Array.isArray(entry.cryptocurrency)
          ? entry.cryptocurrency[0]
          : entry.cryptocurrency
      }));
      setPortfolio(fixedData);
    }
  };

  const fetchBalance = async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('balance')
      .eq('user_id', user?.id)
      .single();

    if (error) {
      console.error('Błąd pobierania salda:', error);
    } else {
      setBalance(data.balance);
    }
  };

  const fetchCryptoPrice = async () => {
    if (!selectedCoinId) return;

    const { data, error } = await supabase
      .from('crypto_prices')
      .select('price')
      .eq('cryptocurrency_id', selectedCoinId)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.error('Błąd pobierania ceny z bazy:', error);
      setCryptoPrice(null);
    } else {
      setCryptoPrice(data.price);
    }
  };

  const fetchAutoPrice = async () => {
    if (!selectedCoinId) return;
    const { data, error } = await supabase
      .from('crypto_prices')
      .select('price')
      .eq('cryptocurrency_id', selectedCoinId)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      setAutoPriceNow(data.price);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPortfolio();
      fetchBalance();
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    fetchCryptoPrice();
    fetchAutoPrice();
  }, [selectedCoinId]);

  useEffect(() => {
    if (!selectedCoinId && cryptocurrencies.length > 0) {
      setSelectedCoinId(cryptocurrencies[0].id);
    }
  }, [cryptocurrencies]);

  const openModal = (type: 'buy' | 'sell') => {
    setTransactionType(type);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setAmount(0);
  };

  const handleTransaction = async () => {
    if (!user || balance === null || selectedCoinId === null) return;

    if (transactionType === 'buy') {
      await buyCrypto(user, balance, setBalance, selectedCoinId, amount);
    } else {
      await sellCrypto(user, balance, setBalance, portfolio, selectedCoinId, amount);
    }

    await fetchPortfolio();
    closeModal();
  };

  const handleAutoOrder = async () => {
    if (!user || !selectedCoinId || autoPrice <= 0 || autoAmount <= 0) return;

    const { error } = await supabase.from('auto_orders').insert([
      {
        user_id: user.id,
        cryptocurrency_id: selectedCoinId,
        target_price: autoPrice,
        amount: autoAmount
      }
    ]);

    if (error) {
      console.error('Błąd zapisu automatycznego zlecenia:', error);
    } else {
      alert('Automatyczne zlecenie zostało zapisane.');
      setAutoAmount(0);
      setAutoPrice(0);
    }
  };

  if (loading) return <p>Ładowanie...</p>;
  if (!user) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-4">Profil użytkownika</h1>
      <p>Zalogowany jako: {user.email}</p>

      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-2xl">
        <h2 className="text-lg font-semibold">Saldo</h2>
        <p className="text-xl">{balance !== null ? `$${balance.toFixed(2)}` : 'Ładowanie...'}</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-2xl mt-4">
        <h2 className="text-lg font-semibold">Kup / Sprzedaj kryptowaluty</h2>
        <div className="flex flex-col gap-4 mt-4">
          <button className="bg-green-500 text-white py-2 px-4 rounded" onClick={() => openModal('buy')}>
            Kup Kryptowalutę
          </button>
          <button className="bg-red-500 text-white py-2 px-4 rounded" onClick={() => openModal('sell')}>
            Sprzedaj Kryptowalutę
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-2xl mt-4">
        <h2 className="text-lg font-semibold">Twój portfel kryptowalut</h2>
        <ul>
          {portfolio.length > 0 ? (
            portfolio.map((entry) => (
              <li key={entry.cryptocurrency.id} className="flex justify-between border-b py-2">
                <span>{entry.cryptocurrency.symbol.toUpperCase()}</span>
                <span>{entry.amount} szt.</span>
              </li>
            ))
          ) : (
            <p>Nie posiadasz jeszcze kryptowalut.</p>
          )}
        </ul>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-2xl mt-4">
  <h2 className="text-lg font-semibold mb-2">Złóż automatyczne zlecenie kupna</h2>
  <div className="flex flex-col gap-3">
    <select
      className="w-full p-2 border border-gray-300 rounded"
      value={selectedCoinId ?? undefined}
      onChange={(e) => setSelectedCoinId(Number(e.target.value))}
    >
      {cryptocurrencies.map((coin) => (
        <option key={coin.id} value={coin.id}>
          {coin.symbol.toUpperCase()}
        </option>
      ))}
    </select>

    <p className="text-sm text-gray-500">
      Aktualna cena: {autoPriceNow ? `$${autoPriceNow.toFixed(2)}` : 'Ładowanie...'}
    </p>

    <label className="flex items-center gap-2">
      <span className="w-32">Cena docelowa:</span>
      <input
        type="number"
        placeholder="Cena"
        value={autoPrice === 0 ? '' : autoPrice}
        onChange={(e) => setAutoPrice(Number(e.target.value))}
        className="flex-1 p-2 border border-gray-300 rounded"
      />
    </label>

    <label className="flex items-center gap-2">
      <span className="w-32">Ilość:</span>
      <input
        type="number"
        placeholder="Ilość"
        value={autoAmount === 0 ? '' : autoAmount}
        onChange={(e) => setAutoAmount(Number(e.target.value))}
        className="flex-1 p-2 border border-gray-300 rounded"
      />
    </label>

    <button
      className="bg-blue-600 text-white px-4 py-2 rounded mt-2"
      onClick={handleAutoOrder}
    >
      Ustaw zlecenie
    </button>
  </div>
</div>


      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-md w-96">
            <h2 className="text-lg font-semibold">{transactionType === 'buy' ? 'Kup' : 'Sprzedaj'} kryptowalutę</h2>
            <select
              className="w-full p-2 border border-gray-300 rounded mt-2"
              value={selectedCoinId ?? undefined}
              onChange={(e) => setSelectedCoinId(Number(e.target.value))}
            >
              {cryptocurrencies.map((coin) => (
                <option key={coin.id} value={coin.id}>
                  {coin.symbol.toUpperCase()}
                </option>
              ))}
            </select>
            <p>Cena: {cryptoPrice ? `$${cryptoPrice.toFixed(2)}` : 'Ładowanie...'}</p>
            <input
              type="number"
              placeholder="Ilość"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full p-2 border border-gray-300 rounded mt-2"

            />
            <p className="mt-2">
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

      <div className="absolute top-4 right-4">
        <Button type="default" onClick={logout}>
          Wyloguj
        </Button>
      </div>

      <div className="mt-6 flex gap-4">
        <Button type="default" onClick={() => router.push('/')}>Wróć do strony głównej</Button>
        <Button type="default" onClick={() => router.push('/history')}>Historia transakcji</Button>
      </div>
    </div>
  );
};

export default Profile;
