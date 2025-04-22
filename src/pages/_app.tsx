import "@/app/globals.css";
import type { AppProps } from "next/app";
import { Baumans } from "next/font/google";
import { AuthProvider } from "@/context/authContext";

const baumans = Baumans({
  weight: ["400"],
  subsets: ["latin"],
});

const FontLoader = () => (

  <style jsx global>
    {`
      :root {
        --baumans-font: ${baumans.style.fontFamily};
      }
    `}
  </style>
);

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <FontLoader />
      <Component {...pageProps} />
    </AuthProvider>
  );
}
