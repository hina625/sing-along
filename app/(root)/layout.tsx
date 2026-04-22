import { ReactNode } from 'react';
import {SubcriptionProvider} from '@/providers/SubscriptionProvider'

const RootLayout = ({ children }: Readonly<{ children: ReactNode }>) => {
  return (
    <main>
      <SubcriptionProvider>
        {children}
      </SubcriptionProvider>
    </main>
  );
};

export default RootLayout;
