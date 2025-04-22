import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/authContext';
import { supabase } from '@/lib/supabaseClient';
import { buyCrypto, sellCrypto } from '@/lib/cryptoActions';
import axios from 'axios';
import Button from '@/components/Button';

const Profile: React.FC = () => {
    const router = useRouter();
    const { user, loading, logout } = useAuth();
    const [portfolio, setPortfolio] = useState<{ coin: string; amount: number }[]>([]);
    const [balance, setBalance] = useState<number | null>(null);
    const [selectedCoin, setSelectedCoin] = useState<string>('bitcoin');
    const [amount, setAmount] = useState<number>(0);
    const [cryptoPrice, setCryptoPrice] = useState<number | null>(null);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [transactionType, setTransactionType] = useState<'buy' | 'sell'>('buy');

    const SUPPORTED_CRYPTOS = ['bitcoin', 'ethereum', 'binancecoin', 'solana', 'cardano'];


    useEffect(() => {
      const fetchPortfolio = async () => {
          if (!user) return;
  
          const { data, error } = await supabase
              .from('user_portfolio')
              .select('coin, amount')
              .eq('user_id', user.id);
  
          if (error) {
              console.error("Błąd pobierania portfela:", error);
          } else {
              setPortfolio(data);
          }
      };
  
      fetchPortfolio();
  }, [user]);
  

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

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        const fetchCryptoPrice = async () => {
            try {
                const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
                    params: {
                        ids: selectedCoin,
                        vs_currencies: 'usd',
                    },
                });
                setCryptoPrice(response.data[selectedCoin]?.usd || null);
            } catch (error) {
                console.error(`Błąd pobierania ceny ${selectedCoin}:`, error);
            }
        };

        fetchCryptoPrice();
    }, [selectedCoin]);

    const openModal = (type: 'buy' | 'sell') => {
        setTransactionType(type);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setAmount(0);
    };

    const handleTransaction = () => {
        if (transactionType === 'buy') {
            buyCrypto(user, balance, setBalance, selectedCoin, amount);
        } else {
            sellCrypto(user, balance, setBalance, portfolio, selectedCoin, amount);

        }
        
        closeModal();
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
            portfolio.map((coin) => (
                <li key={coin.coin} className="flex justify-between border-b py-2">
                    <span>{coin.coin.toUpperCase()}</span>
                    <span>{coin.amount} szt.</span>
                </li>
            ))
        ) : (
            <p>Nie posiadasz jeszcze kryptowalut.</p>
        )}
    </ul>
</div>

            {isModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
                    <div className="bg-white p-6 rounded-lg shadow-md w-96">
                        <h2 className="text-lg font-semibold">{transactionType === 'buy' ? 'Kup' : 'Sprzedaj'} kryptowalutę</h2>
                        <select
                            className="w-full p-2 border border-gray-300 rounded mt-2"
                            value={selectedCoin}
                            onChange={(e) => setSelectedCoin(e.target.value)}
                        >
                            {SUPPORTED_CRYPTOS.map((coin) => (
                                <option key={coin} value={coin}>{coin.toUpperCase()}</option>
                            ))}
                        </select>
                        <p>Cena: {cryptoPrice ? `$${cryptoPrice.toFixed(2)}` : 'Ładowanie...'}</p>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                            className="w-full p-2 border border-gray-300 rounded mt-2"
                            placeholder="Ilość"
                        />
                        <p className="mt-2">Koszt transakcji: {cryptoPrice ? `$${(amount * cryptoPrice).toFixed(2)}` : 'Ładowanie...'}</p>
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
            <Button type="default" onClick={logout}>Wyloguj</Button>
            </div>


            <div className="mt-6 flex gap-4">
                <Button type="default" onClick={() => router.push('/')}>Wróć do strony głównej</Button>
                <Button type="default" onClick={() => router.push('/history')}>Historia transakcji</Button>
            </div>
        </div>
    );
};

export default Profile;
