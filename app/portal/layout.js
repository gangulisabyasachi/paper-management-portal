import { Outfit } from 'next/font/google';
import './portal.css';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata = {
  title: 'WISDOM Paper Management Portal | Peer Review & Submission System',
  description:
    'Official CMT-style manuscript submission, double-blinded peer review, and editorial management portal for WISDOM Journal.',
};

export default function PortalRootLayout({ children }) {
  return (
    <div className={`portal-mode ${outfit.variable}`}>
      {children}
    </div>
  );
}
