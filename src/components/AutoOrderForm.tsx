import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCryptocurrencies } from '@/hooks/useCryptocurrencies';

interface AutoOrderFormProps {
  userId: string;
  onCreated?: () => void;
}

const AutoOrderForm: React.FC<AutoOrderFormProps> = ({ userId, onCreated }) => {
  const cryptocurrencies = useCryptocurrencies();
  const [cryptocurrencyId, setCryptocurrencyId] = useState<number | null>(null);
  const [targetPrice, setTargetPrice] = useState<number>(0);
  const [amount, setAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !cryptocurrencyId || !targetPrice || !amount) return;

    setLoading(true);

    const { error } = await supabase.from('auto_orders').insert([
      {
        user_id: userId,
        cryptocurrency_id: cryptocurrencyId,
        target_price: targetPrice,
        amount,
      },
    ]);

    setLoading(false);

    if (error) {
      console.error('Błąd tworzenia zlecenia:', error);
      alert('Nie udało się utworzyć zlecenia.');
    } else {
      alert('Zlecenie automatycznego zakupu zostało dodane.');
      setTargetPrice(0);
      setAmount(0);
      if (onCreated) onCreated();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md max-w-md w-full">
      <h2 className="text-xl font-semibold mb-4">Nowe automatyczne zlecenie zakupu</h2>

      <label className="block mb-2 font-medium">Kryptowaluta</label>
      <select
        className="w-full p-2 border border-gray-300 rounded mb-4"
        value={cryptocurrencyId ?? ''}
        onChange={(e) => setCryptocurrencyId(Number(e.target.value))}
      >
        <option value="">Wybierz...</option>
        {cryptocurrencies.map((crypto) => (
          <option key={crypto.id} value={crypto.id}>
            {crypto.symbol.toUpperCase()} - {crypto.name}
          </option>
        ))}
      </select>

      <label className="block mb-2 font-medium">Cena docelowa ($)</label>
      <input
        type="number"
        step="0.01"
        className="w-full p-2 border border-gray-300 rounded mb-4"
        value={targetPrice}
        onChange={(e) => setTargetPrice(parseFloat(e.target.value))}
        placeholder="np. 20000"
      />

      <label className="block mb-2 font-medium">Ilość</label>
      <input
        type="number"
        step="0.0001"
        className="w-full p-2 border border-gray-300 rounded mb-4"
        value={amount}
        onChange={(e) => setAmount(parseFloat(e.target.value))}
        placeholder="np. 0.5"
      />

      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded w-full"
        disabled={loading}
      >
        {loading ? 'Dodawanie...' : 'Dodaj zlecenie'}
      </button>
    </form>
  );
};

export default AutoOrderForm;
