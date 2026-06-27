import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '../../home/components';
import { SearchSidebar, SearchRightPanel, PeopleResult, GroupResult, PostResult, ReelResult, SearchReelModal } from '../components';
import {
  GroupScopeFilter,
  PeopleRelationFilter,
  SearchFilterType,
  SortType,
  SearchResult,
  SearchResultPerson,
  SearchResultGroup,
  SearchResultPost,
  SearchResultReel,
} from '../types/search.types';
import { filterGroups, filterPeople, filterPostsByDate, sortPosts } from '../utils/searchFilterUtils';
import { splitPostsByKind, mapSearchPostsToReels } from '../utils/searchReelUtils';
import { searchService, SearchApiResponse } from '@/services/searchService';
import { authService } from '@/services/authService';
import { friendService } from '@/services/friendService';
import { groupService } from '@/services/groupService';
import type { ReactionType } from '@/services/postService';

const PEOPLE_GRID_CLASS = 'grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5';
const GROUPS_GRID_CLASS = 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4';
const REELS_GRID_CLASS = 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5';
const POSTS_GRID_CLASS = 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-2';

function mapPerson(person: SearchApiResponse['people'][number]): SearchResultPerson {
  return {
    ...person,
    isFriend: person.isFollowing,
  };
}

// ─── Section Header ───────────────────────────────────────────────────────────
interface SectionHeaderProps {
  title: string;
  count: number;
  onSeeAll: () => void;
}

const SectionHeader = ({ title, count, onSeeAll }: SectionHeaderProps) => (
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-lg font-bold text-foreground">{title}</h3>
    {count > 2 && (
      <button
        onClick={onSeeAll}
        className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-sm font-medium hover:underline transition-colors cursor-pointer"
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
  const [peopleFilter, setPeopleFilter] = useState<PeopleRelationFilter>('everyone');
  const [groupFilter, setGroupFilter] = useState<GroupScopeFilter>('all');
  const [sortType, setSortType] = useState<SortType>('relevance');
  const [dateFilter, setDateFilter] = useState('any');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeReelIndex, setActiveReelIndex] = useState<number | null>(null);
  const currentUser = useMemo(() => authService.getCurrentUser(), []);

  // Sync filter from URL when navigating to a new search query
  useEffect(() => {
    const fromUrl = (searchParams.get('type') ?? 'all') as SearchFilterType;
    setActiveFilter(VALID_FILTERS.includes(fromUrl) ? fromUrl : 'all');
    setActiveReelIndex(null);
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

        const merged: SearchResult[] = [
          ...data.people.map(mapPerson),
          ...(data.groups as SearchResultGroup[]),
          ...posts,
        ];
        setResults(merged);
      })
      .catch(() => setError('Không thể tải kết quả tìm kiếm. Vui lòng thử lại.'))
      .finally(() => setLoading(false));
  }, [query]);

  const handleFriendToggle = async (id: string) => {
    if (!currentUser?.id) return;

    const target = results.find((r): r is SearchResultPerson => r.type === 'person' && r.id === id);
    if (!target) return;

    try {
      if (target.isFriend) {
        const status = await friendService.getStatus(currentUser.id, id);
        if (!status.friendshipId) return;
        await friendService.deleteFriendship(status.friendshipId);
        setResults((prev) => prev.map((r) =>
          r.id === id && r.type === 'person' ? { ...r, isFriend: false } : r,
        ));
        toast.success('Đã hủy kết bạn');
        return;
      }

      await friendService.sendFriendRequest(currentUser.id, id);
      toast.success('Đã gửi lời mời kết bạn');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể thực hiện thao tác kết bạn');
    }
  };

  const handleJoinToggle = async (id: string) => {
    if (!currentUser?.id) return;

    const target = results.find((r): r is SearchResultGroup => r.type === 'group' && r.id === id);
    if (!target || target.isMember || target.isPending) return;

    try {
      const joined = await groupService.joinGroup(id, currentUser.id);
      setResults((prev) => prev.map((r) =>
        r.id === id && r.type === 'group'
          ? {
              ...r,
              isMember: joined.status === 'APPROVED',
              isPending: joined.status === 'PENDING',
            }
          : r,
      ));
      toast.success(joined.status === 'PENDING' ? 'Đã gửi yêu cầu tham gia nhóm' : 'Đã tham gia nhóm');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể tham gia nhóm');
    }
  };

  const handleReactionChange = (postId: string, reactionType: ReactionType | null) => {
    setResults(prev => prev.map(r => {
      if (r.id !== postId || r.type !== 'post') return r;
      return { ...r, userReactionType: reactionType };
    }));
  };

  const allPosts = useMemo(
    () => results.filter((r): r is SearchResultPost => r.type === 'post'),
    [results],
  );
  const { reels, feedPosts: rawFeedPosts } = useMemo(
    () => splitPostsByKind(allPosts),
    [allPosts],
  );
  const watchReels = useMemo(
    () => mapSearchPostsToReels(allPosts, reels.map((r) => r.id)),
    [allPosts, reels],
  );

  const handlePlayReel = useCallback((reelId: string) => {
    const index = watchReels.findIndex((r) => r.id === reelId);
    if (index !== -1) setActiveReelIndex(index);
  }, [watchReels]);

  const allPeople = useMemo(
    () => results.filter((r): r is SearchResultPerson => r.type === 'person'),
    [results],
  );
  const allGroups = useMemo(
    () => results.filter((r): r is SearchResultGroup => r.type === 'group'),
    [results],
  );
  const people = useMemo(
    () => (activeFilter === 'people' ? filterPeople(allPeople, peopleFilter) : allPeople),
    [activeFilter, allPeople, peopleFilter],
  );
  const groups = useMemo(
    () => (activeFilter === 'groups' ? filterGroups(allGroups, groupFilter) : allGroups),
    [activeFilter, allGroups, groupFilter],
  );
  const posts = useMemo(
    () => sortPosts(
      filterPostsByDate(
        rawFeedPosts,
        activeFilter === 'all' || activeFilter === 'posts' ? dateFilter : 'any',
      ),
      activeFilter === 'all' || activeFilter === 'posts' ? sortType : 'relevance',
    ),
    [rawFeedPosts, dateFilter, sortType, activeFilter],
  );

  const getFilteredResults = (): SearchResult[] => {
    switch (activeFilter) {
      case 'people': return people;
      case 'groups': return groups;
      case 'posts':  return posts;
      case 'reels':  return reels;
      default:       return [...people, ...groups, ...posts];
    }
  };

  const totalCount = activeFilter === 'all'
    ? people.length + groups.length + posts.length + reels.length
    : getFilteredResults().length;

  const renderResult = (result: SearchResult) => {
    switch (result.type) {
      case 'person':
        return <PeopleResult key={result.id} person={result} onFriendToggle={handleFriendToggle} />;
      case 'group':
        return <GroupResult key={result.id} group={result} onJoinToggle={handleJoinToggle} />;
      case 'post':
        return <PostResult key={result.id} post={result} onReactionChange={handleReactionChange} />;
      case 'reel':
        return <ReelResult key={result.id} reel={result} onPlay={handlePlayReel} />;
      default:
        return null;
    }
  };

  // ── Loading / Error states ────────────────────────────────────────────────
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
    </div>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-16">
      <p className="text-muted-foreground text-lg">{message}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted dark:bg-background">
      <Header />

      <div className="flex w-full pt-14">
        <SearchSidebar
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6">

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
              <h2 className="text-xl font-semibold text-foreground">
                Tìm thấy {totalCount} kết quả{query ? ` cho "${query}"` : ''}
              </h2>

              {/* People */}
              {people.length > 0 && (
                <section>
                  <SectionHeader title="Mọi người" count={people.length} onSeeAll={() => setActiveFilter('people')} />
                  <div className={PEOPLE_GRID_CLASS}>
                    {people.slice(0, 4).map(p => (
                      <PeopleResult key={p.id} person={p} onFriendToggle={handleFriendToggle} />
                    ))}
                  </div>
                </section>
              )}

              {/* Groups */}
              {groups.length > 0 && (
                <section>
                  <SectionHeader title="Nhóm" count={groups.length} onSeeAll={() => setActiveFilter('groups')} />
                  <div className={GROUPS_GRID_CLASS}>
                    {groups.slice(0, 4).map(g => (
                      <GroupResult key={g.id} group={g} onJoinToggle={handleJoinToggle} />
                    ))}
                  </div>
                </section>
              )}

              {/* Reels */}
              {reels.length > 0 && (
                <section>
                  <SectionHeader title="Thước phim" count={reels.length} onSeeAll={() => setActiveFilter('reels')} />
                  <div className={REELS_GRID_CLASS}>
                    {reels.slice(0, 5).map(r => (
                      <ReelResult key={r.id} reel={r} onPlay={handlePlayReel} />
                    ))}
                  </div>
                </section>
              )}

              {/* Posts */}
              {posts.length > 0 && (
                <section>
                  <SectionHeader title="Bài viết" count={posts.length} onSeeAll={() => setActiveFilter('posts')} />
                  <div className={POSTS_GRID_CLASS}>
                    {posts.slice(0, 4).map(p => (
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
              <h2 className="mb-2 text-xl font-semibold text-foreground">
                {activeFilter === 'people'  && `${people.length} người`}
                {activeFilter === 'groups'  && `${groups.length} nhóm`}
                {activeFilter === 'posts'   && `${posts.length} bài viết`}
                {activeFilter === 'reels'   && `${reels.length} thước phim`}
              </h2>

              {activeFilter === 'reels' && (
                <div className={REELS_GRID_CLASS}>
                  {reels.map(r => (
                    <ReelResult key={r.id} reel={r} onPlay={handlePlayReel} />
                  ))}
                </div>
              )}

              {activeFilter === 'groups' && (
                <div className={GROUPS_GRID_CLASS}>
                  {groups.map(g => <GroupResult key={g.id} group={g} onJoinToggle={handleJoinToggle} />)}
                </div>
              )}

              {activeFilter === 'people' && (
                <div className={PEOPLE_GRID_CLASS}>
                  {people.map(p => (
                    <PeopleResult key={p.id} person={p} onFriendToggle={handleFriendToggle} />
                  ))}
                </div>
              )}

              {activeFilter === 'posts' && (
                <div className={POSTS_GRID_CLASS}>
                  {posts.map(p => (
                    <PostResult key={p.id} post={p} onReactionChange={handleReactionChange} />
                  ))}
                </div>
              )}

              {getFilteredResults().length === 0 && (
                <EmptyState message={`Không tìm thấy kết quả nào cho "${query}"`} />
              )}
            </div>
          )}
        </main>

        <SearchRightPanel
          activeFilter={activeFilter}
          peopleFilter={peopleFilter}
          onPeopleFilterChange={setPeopleFilter}
          groupFilter={groupFilter}
          onGroupFilterChange={setGroupFilter}
          sortType={sortType}
          onSortChange={setSortType}
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
        />
      </div>

      <SearchReelModal
        open={activeReelIndex !== null}
        reels={watchReels}
        initialIndex={activeReelIndex ?? 0}
        onClose={() => setActiveReelIndex(null)}
      />
    </div>
  );
}
