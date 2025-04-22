import { supabase } from "@/lib/supabaseClient";
import axios from "axios";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 1. Pobierz kryptowaluty z coingecko_id
    const { data: cryptos, error } = await supabase
      .from("cryptocurrencies")
      .select("id, coingecko_id");

    if (error || !cryptos) {
      return res.status(500).json({ error: "Błąd pobierania kryptowalut z bazy." });
    }

    const ids = cryptos.map(c => c.coingecko_id).join(",");

    // 2. Pobierz ceny z CoinGecko
    const response = await axios.get("https://api.coingecko.com/api/v3/simple/price", {
      params: {
        ids,
        vs_currencies: "usd"
      }
    });

    const pricesData = response.data;

    // 3. Zapisz dane do tabeli crypto_prices
    const insertData = cryptos.map(c => ({
      cryptocurrency_id: c.id,
      price: pricesData[c.coingecko_id]?.usd,
      fetched_at: new Date()
    })).filter(d => d.price !== undefined);

    const { error: insertError } = await supabase.from("crypto_prices").insert(insertData);

    if (insertError) {
      return res.status(500).json({ error: "Błąd zapisu cen do bazy danych." });
    }

    return res.status(200).json({ success: true, inserted: insertData.length });

  } catch (err) {
    console.error("Błąd endpointu:", err);
    return res.status(500).json({ error: "Nieoczekiwany błąd serwera." });
  }
}
