import './globals.css';
import { AuthProvider } from '@/lib/AuthContext';

export const metadata = {
  title: 'StudentOS — Goal-Oriented Student Operating System',
  description: 'A personal operating system for achieving your academic, career, and personal goals. Plan, track, and review your progress systematically.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
