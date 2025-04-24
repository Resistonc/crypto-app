import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Crypto {
  id: number;
  name: string;
  symbol: string;
}





export const useCryptocurrencies = () => {
  const [cryptos, setCryptos] = useState<Crypto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCryptos = async () => {
      const { data, error } = await supabase.from('cryptocurrencies').select('*');
      if (!error && data) {
        setCryptos(data);
      } else {
        console.error("Error fetching cryptos:", error);
      }
      setLoading(false);
    };

    fetchCryptos();
  }, []);

  return cryptos;
};
