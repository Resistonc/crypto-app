import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/authContext';
import { supabase } from '@/lib/supabaseClient';
import Button from '@/components/Button';

interface Transaction {
  amount: number;
  price: number;
  type: string;
  created_at: string;
  symbol: string;
}


const History: React.FC = () => {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell'>('all');

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user) return;
    
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          amount,
          price,
          type,
          created_at,
          cryptocurrency:cryptocurrencies!transactions_cryptocurrency_id_fkey (
            symbol
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
    
      if (error) {
        console.error("Błąd pobierania transakcji:", error);
      } else {
        const formatted = (data as any[]).map(tx => ({
          amount: tx.amount,
          price: tx.price,
          type: tx.type,
          created_at: tx.created_at,
          symbol: Array.isArray(tx.cryptocurrency)
            ? tx.cryptocurrency[0]?.symbol ?? 'unknown'
            : tx.cryptocurrency?.symbol ?? 'unknown'
        }));
    
        setTransactions(formatted);
      }
    };
    

    fetchTransactions();
  }, [user]);

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'all') return true;
    return tx.type === filter;
  });

  if (loading) return <p>Ładowanie...</p>;
  if (!user) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-4">Historia transakcji</h1>

      <div className="mb-4">
        <label className="mr-2 font-semibold">Filtruj:</label>
        <select
          className="p-2 border border-gray-300 rounded"
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'all' | 'buy' | 'sell')}
        >
          <option value="all">Wszystkie</option>
          <option value="buy">Kupno</option>
          <option value="sell">Sprzedaż</option>
        </select>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-4xl">
        <h2 className="text-lg font-semibold mb-2">Twoje transakcje</h2>
        <ul>
        {filteredTransactions.length > 0 ? (
  filteredTransactions.map((tx, index) => (
    <li key={index} className="flex justify-between border-b py-2">
      <span>
        {tx.created_at.split('T')[0]} - {tx.type.toUpperCase()} {tx.amount} {tx.symbol.toUpperCase()}
      </span>
      <span>${(tx.amount * tx.price).toFixed(2)}</span>
    </li>
  ))
) : (
  <p>Brak transakcji.</p>
)}

        </ul>
      </div>

      <div className="mt-6 flex gap-4">
        <Button type="default" onClick={() => router.push('/profile')}>Powrót do profilu</Button>
      </div>
    </div>
  );
};

export default History;
