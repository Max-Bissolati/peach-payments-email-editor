import type { AppProps } from 'next/app';
import Head from 'next/head';
import './globals.css';
import { AuthProvider } from '@/components/auth-provider';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Head>
        <title>Peach Email Builder - Visual Email Template Editor</title>
        <meta
          name='description'
          content='Peach Payments visual drag-and-drop email template builder.'
        />
        <meta
          name='viewport'
          content='width=device-width, initial-scale=1.0'
        />
      </Head>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
