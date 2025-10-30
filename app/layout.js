import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from 'next-themes';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'TechStartup - Modern Tech Solutions',
  description: 'Leading tech startup offering Product Development, Cloud & DevOps, Data & AI, Automation, Cybersecurity, and IT Consulting services.',
  keywords: 'tech startup, web development, cloud services, AI, machine learning, cybersecurity, IT consulting',
  authors: [{ name: 'TechStartup' }],
  openGraph: {
    title: 'TechStartup - Modern Tech Solutions',
    description: 'Leading tech startup offering comprehensive technology solutions for businesses.',
    type: 'website',
    url: 'https://techstartup.com',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1462396240927-52058a6a84ec',
        width: 1200,
        height: 630,
        alt: 'TechStartup',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TechStartup - Modern Tech Solutions',
    description: 'Leading tech startup offering comprehensive technology solutions.',
    images: ['https://images.unsplash.com/photo-1462396240927-52058a6a84ec'],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}