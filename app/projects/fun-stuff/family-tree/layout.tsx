import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Family Tree | Vikas Yadav',
  description: 'Build interactive family trees with photos and relationships. Store multiple trees, export as PNG, and share via URL.',
};

export default function FamilyTreeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
