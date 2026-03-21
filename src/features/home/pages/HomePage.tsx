import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RightSidebar } from '../components/RightSidebar';
import { NewsFeed } from '../components/NewsFeed';
import { MainLayout } from '../../../layouts';

export function HomePage() {
  const navigate = useNavigate();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const user = localStorage.getItem('user');

    if (!user) {
      navigate('/auth/login');
      return;
    }

    setIsCheckingAuth(false);
  }, [navigate]);

  if (isCheckingAuth) return null;

  return (
    <MainLayout>
      <div className="max-w-[1920px] mx-auto">
        <div className="flex gap-4">
          <main className="flex-1 min-w-0 max-w-[680px] mx-auto py-4">
            <NewsFeed />
          </main>

          <RightSidebar />
        </div>
      </div>
    </MainLayout>
  );
}