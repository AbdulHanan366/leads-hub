import './globals.css';
import { Poppins } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AuthProvider } from '@/contexts/AuthContext';

const poppins = Poppins({
  subsets: ['latin'],
  weight: '400'
});

export const metadata = {
  title: 'Leads Hub - Professional Lead Management',
  description: 'Manage your leads efficiently with Leads Hub',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Initialize theme on page load to avoid FOUC
              (function() {
                try {
                  const storedTheme = localStorage.getItem('theme');
                  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  
                  if (storedTheme === 'dark' || (!storedTheme && systemTheme === 'dark')) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {
                  console.log('Theme initialization error:', e);
                }
              })();
            `,
          }}
        />
      </head>
      <body className={poppins.className}>
        <AuthProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}