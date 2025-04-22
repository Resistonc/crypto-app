import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MyChart from '@/components/MyChart';
import Button from '@/components/Button';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/authContext';
import { supabase } from '@/lib/supabaseClient';
import { buyCrypto, sellCrypto } from '@/lib/cryptoActions';

const Home: React.FC = () => {
    const [topCryptos, setTopCryptos] = useState<{ id: string; name: string; price: number; change: number }[]>([]);
    const [selectedCrypto, setSelectedCrypto] = useState<string>('bitcoin');
    const [balance, setBalance] = useState<number | null>(null);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [transactionType, setTransactionType] = useState<'buy' | 'sell'>('buy');
    const [amount, setAmount] = useState<number>(0);
    const [cryptoPrice, setCryptoPrice] = useState<number | null>(null);
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        const fetchTopCryptos = async () => {
            try {
                const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
                    params: {
                        vs_currency: 'usd',
                        order: 'market_cap_desc',
                        per_page: 5,
                        page: 1,
                        sparkline: false
                    }
                });
                const cryptos = response.data.map((crypto: any) => ({
                    id: crypto.id,
                    name: crypto.name,
                    price: crypto.current_price,
                    change: crypto.price_change_percentage_24h
                }));
                setTopCryptos(cryptos);
            } catch (error) {
                console.error("Błąd pobierania danych kryptowalut:", error);
            }
        };

        fetchTopCryptos();
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

    const handleLoginRedirect = () => {
        router.push('/login');
    };
    
    const handleProfileRedirect = () => {
        router.push('/profile');
    };


    useEffect(() => {
        const fetchCryptoPrice = async () => {
            try {
                const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
                    params: {
                        ids: selectedCrypto,
                        vs_currencies: 'usd',
                    },
                });
                setCryptoPrice(response.data[selectedCrypto]?.usd || null);
            } catch (error) {
                console.error(`Błąd pobierania ceny ${selectedCrypto}:`, error);
            }
        };
    
        if (isModalOpen) {
            fetchCryptoPrice();
        }
    }, [selectedCrypto, isModalOpen]);


    const openModal = (type: 'buy' | 'sell') => {
        setTransactionType(type);
        setIsModalOpen(true);
        console.log(`Otwarcie modala: ${type} dla ${selectedCrypto}`);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setAmount(0);
    };
    
    const handleTransaction = async () => {
        if (!user || !balance || !cryptoPrice) return;
        if (transactionType === 'buy') {
            await buyCrypto(user, balance, setBalance, selectedCrypto, amount);
        } else {
            await sellCrypto(user, balance, setBalance, [], selectedCrypto, amount);
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
                    <Button type="default" onClick={handleProfileRedirect}>
                        Przejdź do profilu
                    </Button>
                ) : (
                    <Button type="default" onClick={handleLoginRedirect}>
                        Zaloguj
                    </Button>
                )}
                
            </div>
            
            
            {!user ? (
                <div className="text-center max-w-3xl">
                    <h1 className="text-3xl font-bold mb-4">Witaj na platformie inwestycyjnej!</h1>
                    <p className="text-lg text-gray-700">Śledź ceny kryptowalut i zarządzaj swoim portfelem.</p>
                    <div className="bg-white p-6 rounded-lg shadow-md mt-6">
                        <h2 className="text-xl font-semibold mb-2">Kryptowaluty:</h2>
                        <div className="flex flex-col gap-2">
                            {topCryptos.map((crypto, index) => (
                                <div key={index} className="p-2 bg-gray-100 rounded flex justify-between">
                                    <span className="font-semibold">{crypto.name}</span>
                                    <span>${crypto.price.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="mt-6">
                        <p className="text-lg font-semibold">Zarejestruj się, aby:</p>
                        <ul className="list-disc list-inside text-gray-700">
                            <li>Śledzić pełną historię cen kryptowalut</li>
                            <li>Inwestować w kryptowaluty</li>
                            <li>Uzyskać dostęp do swojego portfela</li>
                        </ul>
                        <div className="mt-8 flex justify-center">
                        <Button type="default" onClick={() => router.push('/register')}>Zarejestruj się teraz</Button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="relative flex flex-col md:flex-row w-full max-w-6xl items-start justify-center">
                    <div className="md:w-1/6 mr-16 mt-40 flex flex-col gap-4 self-start">
                        {topCryptos.map((crypto) => (
                            <div 
                                key={crypto.id} 
                                className={`p-2 bg-white shadow-md rounded-lg flex flex-col items-start text-sm w-full cursor-pointer ${selectedCrypto === crypto.id ? 'border-2 border-blue-500' : ''}`}
                                onClick={() => setSelectedCrypto(crypto.id)}
                            >
                                <h2 className="text-base font-semibold">{crypto.name}</h2>
                                <p className="text-sm">${crypto.price.toFixed(2)}</p>
                                <p className={`text-xs ${crypto.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>Zmiana 24h: {crypto.change.toFixed(2)}%</p>
                            </div>
                        ))}
                    </div>
                    <div className="md:w-3/4 flex flex-col items-start">
                        <h1 className="text-center text-3xl ml-72 font-bold my-6">Zmiany cenowe {topCryptos.find(c => c.id === selectedCrypto)?.name}</h1>
                        <div className="w-full max-w-4xl bg-white p-6 rounded-lg shadow-md">
                            <MyChart selectedCrypto={selectedCrypto} />
                        </div>



                        {/* buy/sell button */}
                        <div className="absolute bottom-10 right-10 flex flex-col gap-4">
                            <button className="bg-green-500 text-white py-2 px-4 rounded" onClick={() => openModal('buy')}>
                                Kup {selectedCrypto.toUpperCase()}
                            </button>
                            <button className="bg-red-500 text-white py-2 px-4 rounded" onClick={() => openModal('sell')}>
                                Sprzedaj {selectedCrypto.toUpperCase()}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* buy/sell */}
            {isModalOpen && (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
        <div className="bg-white p-6 rounded-lg shadow-md w-96">
            <h2 className="text-lg font-semibold">
                {transactionType === 'buy' ? 'Kup' : 'Sprzedaj'} {selectedCrypto.toUpperCase()}
            </h2>

            <p className="mt-2">
                Cena: {cryptoPrice ? `$${cryptoPrice.toFixed(2)}` : 'Ładowanie...'}
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