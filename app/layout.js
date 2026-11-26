import './globals.css';

export const metadata = {
  title: 'WISDOM Paper Management Portal | Peer Review & Submission System',
  description:
    'Official CMT-style manuscript submission, double-blinded peer review, and editorial management portal for WISDOM Journal.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
