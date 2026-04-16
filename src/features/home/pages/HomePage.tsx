import { RightSidebar } from '../components/RightSidebar';
import { NewsFeed } from '../components/NewsFeed';
import { MainLayout } from '../../../layouts';

export function HomePage() {
  return (
    <MainLayout>
      <div className="max-w-[1920px] mx-auto">
        <div className="flex gap-4">
          {/* Main Content - News Feed */}
          <main className="flex-1 min-w-0 max-w-[680px] mx-auto py-4">
            <NewsFeed />
          </main>
          
          {/* Right Sidebar */}
          <RightSidebar />
        </div>
      </div>
    </MainLayout>
  );
}