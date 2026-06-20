import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, SortAsc, SortDesc, Loader2 } from 'lucide-react';
import { Header } from '../../home/components';
import { SearchSidebar, PeopleResult, GroupResult, PostResult, ReelResult } from '../components';
import {
  SearchFilterType,
  SortType,
  SearchResult,
  SearchResultPerson,
  SearchResultGroup,
  SearchResultPost,
  SearchResultReel,
} from '../types/search.types';
import { searchService, SearchApiResponse } from '@/services/searchService';
import type { ReactionType } from '@/services/postService';

// ─── Section Header ───────────────────────────────────────────────────────────
interface SectionHeaderProps {
  title: string;
  count: number;
  onSeeAll: () => void;
}

const SectionHeader = ({ title, count, onSeeAll }: SectionHeaderProps) => (
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">{title}</h3>
    {count > 2 && (
      <button
        onClick={onSeeAll}
        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium hover:underline transition-colors cursor-pointer"
      >
        Xem tất cả
        <ArrowRight className="w-4 h-4" />
      </button>
    )}
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';

  const VALID_FILTERS: SearchFilterType[] = ['all', 'posts', 'people', 'reels', 'groups'];
  const filterFromUrl = (searchParams.get('type') ?? 'all') as SearchFilterType;
  const safeFilter = VALID_FILTERS.includes(filterFromUrl) ? filterFromUrl : 'all';

  const [activeFilter, setActiveFilter] = useState<SearchFilterType>(safeFilter);
  const [sortType, setSortType] = useState<SortType>('relevance');
  const [dateFilter, setDateFilter] = useState('any');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync filter from URL when navigating to a new search query
  useEffect(() => {
    const fromUrl = (searchParams.get('type') ?? 'all') as SearchFilterType;
    setActiveFilter(VALID_FILTERS.includes(fromUrl) ? fromUrl : 'all');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Fetch real data whenever the search query changes
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    searchService
      .search(query.trim())
      .then((data: SearchApiResponse) => {
        const posts = data.posts as SearchResultPost[];

        // Video posts also appear in the Reels tab
        const reels: SearchResultReel[] = posts
          .filter(p => p.video || isVideoUrl(p.image))
          .map(p => {
            const videoSrc = p.video ?? (isVideoUrl(p.image) ? p.image! : '');
            return {
              id: p.id,
              type: 'reel' as const,
              author: { name: p.author.name, avatar: p.author.avatar },
              thumbnail: p.image ?? '',
              videoUrl: videoSrc,
              duration: '',
              views: p.likes ?? 0,
              title: p.content?.split('\n')[0] ?? '',
              userReactionType: p.userReactionType,
              timestamp: p.timestamp,
            };
          });

        const merged: SearchResult[] = [
          ...(data.people as SearchResultPerson[]),
          ...(data.groups as SearchResultGroup[]),
          ...posts,
          ...reels,
        ];
        setResults(merged);
      })
      .catch(() => setError('Không thể tải kết quả tìm kiếm. Vui lòng thử lại.'))
      .finally(() => setLoading(false));
  }, [query]);

  // Toggle handlers (optimistic UI — would be real API calls in production)
  const handleFollowToggle = (id: string) => {
    setResults(prev => prev.map(r =>
      (r.id === id && r.type === 'person')
        ? { ...r, isFollowing: !r.isFollowing }
        : r,
    ));
  };

  const handleJoinToggle = (id: string) => {
    setResults(prev => prev.map(r =>
      (r.id === id && r.type === 'group')
        ? { ...r, isMember: !r.isMember }
        : r,
    ));
  };

  const handleReactionChange = (postId: string, reactionType: ReactionType | null) => {
    setResults(prev => prev.map(r => {
      if (r.id !== postId) return r;
      if (r.type === 'post' || r.type === 'reel') return { ...r, userReactionType: reactionType };
      return r;
    }));
  };

  const isVideoUrl = (url?: string) =>
    !!url && (/\.(mp4|mov|webm|ogg)(\?|$)/i.test(url) || url.includes('/video/'));

  // Typed buckets
  const people = results.filter((r): r is SearchResultPerson => r.type === 'person');
  const groups = results.filter((r): r is SearchResultGroup  => r.type === 'group');
  const reels  = results.filter((r): r is SearchResultReel   => r.type === 'reel');
  const posts  = results.filter((r): r is SearchResultPost   => r.type === 'post');

  const getSortedPosts = (list: SearchResultPost[]) => {
    if (sortType === 'latest') {
      return [...list].sort((a, b) =>
        a.timestamp.includes('giờ') || a.timestamp.includes('phút') ? -1
          : b.timestamp.includes('giờ') || b.timestamp.includes('phút') ? 1
          : 0,
      );
    }
    return list;
  };

  const filteredPosts = getSortedPosts(posts);

  const getFilteredResults = (): SearchResult[] => {
    switch (activeFilter) {
      case 'people': return people;
      case 'groups': return groups;
      case 'posts':  return filteredPosts;
      case 'reels':  return reels;
      default:       return results;
    }
  };

  const totalCount = activeFilter === 'all' ? results.length : getFilteredResults().length;

  const renderResult = (result: SearchResult) => {
    switch (result.type) {
      case 'person':
        return <PeopleResult key={result.id} person={result} onFollowToggle={handleFollowToggle} />;
      case 'group':
        return <GroupResult key={result.id} group={result} onJoinToggle={handleJoinToggle} />;
      case 'post':
        return <PostResult key={result.id} post={result} onReactionChange={handleReactionChange} />;
      case 'reel':
        return <ReelResult key={result.id} reel={result} onReactionChange={handleReactionChange} />;
      default:
        return null;
    }
  };

  // ── Loading / Error states ────────────────────────────────────────────────
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
    </div>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-16">
      <p className="text-gray-400 dark:text-gray-500 text-lg">{message}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background">
      <Header />

      <div className="pt-14 flex">
        {/* Left Sidebar */}
        <SearchSidebar
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          sortType={sortType}
          onSortChange={setSortType}
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
        />

        {/* Main Content */}
        <div className="flex-1 p-6 max-w-4xl">

          {/* No query entered */}
          {!query.trim() && (
            <EmptyState message="Nhập từ khóa để tìm kiếm" />
          )}

          {/* Loading */}
          {query.trim() && loading && <LoadingSpinner />}

          {/* Error */}
          {!loading && error && (
            <div className="text-center py-16">
              <p className="text-red-500 text-base">{error}</p>
            </div>
          )}

          {/* ── Tab: TẤT CẢ ── */}
          {query.trim() && !loading && !error && activeFilter === 'all' && (
            <div className="space-y-8">
              {/* Sort bar */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                  Tìm thấy {totalCount} kết quả{query ? ` cho "${query}"` : ''}
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Sắp xếp:</span>
                  <button
                    onClick={() => setSortType(sortType === 'relevance' ? 'latest' : 'relevance')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm dark:shadow-none cursor-pointer"
                  >
                    {sortType === 'relevance'
                      ? <><SortAsc className="w-4 h-4" /> Liên quan nhất</>
                      : <><SortDesc className="w-4 h-4" /> Mới nhất</>
                    }
                  </button>
                </div>
              </div>

              {/* People */}
              {people.length > 0 && (
                <section>
                  <SectionHeader title="Mọi người" count={people.length} onSeeAll={() => setActiveFilter('people')} />
                  <div className="space-y-3">
                    {people.slice(0, 2).map(p => (
                      <PeopleResult key={p.id} person={p} onFollowToggle={handleFollowToggle} />
                    ))}
                  </div>
                </section>
              )}

              {/* Groups */}
              {groups.length > 0 && (
                <section>
                  <SectionHeader title="Nhóm" count={groups.length} onSeeAll={() => setActiveFilter('groups')} />
                  <div className="grid grid-cols-2 gap-4">
                    {groups.slice(0, 2).map(g => (
                      <GroupResult key={g.id} group={g} onJoinToggle={handleJoinToggle} />
                    ))}
                  </div>
                </section>
              )}

              {/* Reels */}
              {reels.length > 0 && (
                <section>
                  <SectionHeader title="Thước phim" count={reels.length} onSeeAll={() => setActiveFilter('reels')} />
                  <div className="space-y-3">
                    {reels.slice(0, 2).map(r => (
                      <ReelResult key={r.id} reel={r} onReactionChange={handleReactionChange} />
                    ))}
                  </div>
                </section>
              )}

              {/* Posts */}
              {filteredPosts.length > 0 && (
                <section>
                  <SectionHeader title="Bài viết" count={filteredPosts.length} onSeeAll={() => setActiveFilter('posts')} />
                  <div className="space-y-3">
                    {filteredPosts.slice(0, 2).map(p => (
                      <PostResult key={p.id} post={p} onReactionChange={handleReactionChange} />
                    ))}
                  </div>
                </section>
              )}

              {totalCount === 0 && (
                <EmptyState message={`Không tìm thấy kết quả nào cho "${query}"`} />
              )}
            </div>
          )}

          {/* ── Other Tabs ── */}
          {query.trim() && !loading && !error && activeFilter !== 'all' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                  {activeFilter === 'people'  && `${people.length} người`}
                  {activeFilter === 'groups'  && `${groups.length} nhóm`}
                  {activeFilter === 'posts'   && `${filteredPosts.length} bài viết`}
                  {activeFilter === 'reels'   && `${reels.length} thước phim`}
                </h2>

                {activeFilter === 'posts' && (
                  <button
                    onClick={() => setSortType(sortType === 'relevance' ? 'latest' : 'relevance')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm dark:shadow-none cursor-pointer"
                  >
                    {sortType === 'relevance'
                      ? <><SortAsc className="w-4 h-4" /> Liên quan nhất</>
                      : <><SortDesc className="w-4 h-4" /> Mới nhất</>
                    }
                  </button>
                )}
              </div>

              {activeFilter === 'reels' && (
                <div className="space-y-3">
                  {reels.map(r => <ReelResult key={r.id} reel={r} onReactionChange={handleReactionChange} />)}
                </div>
              )}

              {activeFilter === 'groups' && (
                <div className="grid grid-cols-2 gap-4">
                  {groups.map(g => <GroupResult key={g.id} group={g} onJoinToggle={handleJoinToggle} />)}
                </div>
              )}

              {(activeFilter === 'people' || activeFilter === 'posts') && (
                <div className="space-y-3">
                  {getFilteredResults().map(r => renderResult(r))}
                </div>
              )}

              {getFilteredResults().length === 0 && (
                <EmptyState message={`Không tìm thấy kết quả nào cho "${query}"`} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
