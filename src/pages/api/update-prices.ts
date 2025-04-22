// pages/api/updatePrices.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Pobierz listę kryptowalut z bazy danych
    const { data: cryptocurrencies, error } = await supabase
      .from('cryptocurrencies')
      .select('id, coingecko_id');

    if (error) throw error;

    // Dla każdej kryptowaluty pobierz cenę z CoinGecko
    for (const crypto of cryptocurrencies) {
      const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
        params: {
          ids: crypto.coingecko_id,
          vs_currencies: 'usd',
        },
      });

      const price = response.data[crypto.coingecko_id]?.usd;

      // Zapisz cenę do bazy danych
      await supabase.from('crypto_prices').insert({
        cryptocurrency_id: crypto.id,
        price,
      });
    }

    res.status(200).json({ message: 'Ceny zostały zaktualizowane.' });
  } catch (error) {
    console.error('Błąd podczas aktualizacji cen:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas aktualizacji cen.' });
  }
}
