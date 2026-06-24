import type {
  GroupScopeFilter,
  PeopleRelationFilter,
  SearchResultGroup,
  SearchResultPerson,
  SearchResultPost,
  SortType,
} from '../types/search.types';

export function filterPeople(
  people: SearchResultPerson[],
  relation: PeopleRelationFilter,
): SearchResultPerson[] {
  switch (relation) {
    case 'friends':
      return people.filter((person) => person.isFriend);
    case 'friends_of_friends':
      return people.filter(
        (person) => !person.isFriend && (person.mutualFriends ?? 0) > 0,
      );
    case 'everyone':
    default:
      return people;
  }
}

export function filterGroups(
  groups: SearchResultGroup[],
  scope: GroupScopeFilter,
): SearchResultGroup[] {
  switch (scope) {
    case 'joined':
      return groups.filter((group) => group.isMember);
    case 'public':
      return groups.filter((group) => group.privacy === 'public');
    case 'private':
      return groups.filter((group) => group.privacy === 'private');
    case 'all':
    default:
      return groups;
  }
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function filterPostsByDate(
  posts: SearchResultPost[],
  dateFilter: string,
): SearchResultPost[] {
  if (dateFilter === 'any') return posts;

  const now = new Date();
  let cutoff: Date;

  switch (dateFilter) {
    case 'today':
      cutoff = startOfDay(now);
      break;
    case 'week':
      cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 7);
      break;
    case 'month':
      cutoff = new Date(now);
      cutoff.setMonth(cutoff.getMonth() - 1);
      break;
    case 'year':
      cutoff = new Date(now);
      cutoff.setFullYear(cutoff.getFullYear() - 1);
      break;
    default:
      return posts;
  }

  return posts.filter((post) => {
    if (!post.publishedAt) return false;
    const published = new Date(post.publishedAt);
    return !Number.isNaN(published.getTime()) && published >= cutoff;
  });
}

export function sortPosts(posts: SearchResultPost[], sortType: SortType): SearchResultPost[] {
  if (sortType !== 'latest') return posts;

  return [...posts].sort((a, b) => {
    const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return bTime - aTime;
  });
}
