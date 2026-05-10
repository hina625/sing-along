import { ReactNode } from 'react';
import { SubcriptionProvider } from '@/providers/SubscriptionProvider';
import { WorkspaceProvider } from '@/providers/WorkspaceProvider';

const RootLayout = ({ children }: Readonly<{ children: ReactNode }>) => {
  return (
    <main>
      <SubcriptionProvider>
        <WorkspaceProvider>
          {children}
        </WorkspaceProvider>
      </SubcriptionProvider>
    </main>
  );
};

export default RootLayout;
