import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';
import Button from '@/components/Button';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
        } else {
            router.push('/profile');
        }
    };

    const handlePasswordReset = async () => {
        setMessage(null);
        setError(null);
        
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });
        
        if (error) {
            setError(error.message);
        } else {
            setMessage('E-mail z linkiem do resetowania hasła został wysłany!');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-2xl font-bold mb-4">Logowanie</h1>
            <form onSubmit={handleLogin} className="bg-white p-6 rounded-lg shadow-md w-80">
                <div className="mb-4">
                    <label className="block text-sm font-medium">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded"
                        required
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium">Hasło</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded"
                        required
                    />
                </div>
                {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
                {message && <p className="text-green-500 text-sm mb-2">{message}</p>}
                <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded">
                    Zaloguj się
                </button>
                <button type="button" onClick={() => router.push('/register')} className="w-full mt-2 text-blue-500 hover:underline">
                    Zarejestruj się teraz
                    </button>
                <button type="button" onClick={handlePasswordReset} className="w-full mt-2 text-blue-500 hover:underline">
                    Nie pamiętasz hasła?
                </button>
            </form>
            <div className="absolute top-4 right-4">
                <Button type="default" onClick={() => router.push('/')}>Wróć do strony głównej</Button>
            </div>
        </div>
    );
};

export default Login;