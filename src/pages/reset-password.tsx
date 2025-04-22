import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/router";

const ResetPassword = () => {
    const [newPassword, setNewPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const { type, access_token } = router.query;

        if (type === "recovery" && access_token) {
            supabase.auth.setSession({
                access_token: access_token as string,
                refresh_token: "",
            });
        }
    }, [router.query]);

    const handlePasswordUpdate = async () => {
        setLoading(true);
        setError(null);
        setMessage(null);

        const { error } = await supabase.auth.updateUser({ password: newPassword });

        if (error) {
            setError(error.message);
        } else {
            setMessage("Hasło zostało pomyślnie zmienione!");
            setTimeout(() => router.push("/login"), 2000);
        }

        setLoading(false);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-2xl font-bold mb-4">Resetowanie hasła</h1>
            <div className="bg-white p-6 rounded-lg shadow-md w-80">
                <label className="block text-sm font-medium">Nowe hasło</label>
                <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded mt-2"
                    required
                />
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                {message && <p className="text-green-500 text-sm mt-2">{message}</p>}
                <button
                    onClick={handlePasswordUpdate}
                    className="w-full bg-blue-500 text-white py-2 rounded mt-4"
                    disabled={loading}
                >
                    {loading ? "Zapisywanie..." : "Zmień hasło"}
                </button>
            </div>
        </div>
    );
};

export default ResetPassword;
