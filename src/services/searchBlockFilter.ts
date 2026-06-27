import type { SearchApiResponse, SearchSuggestionDto } from './searchService';

export function filterSearchSuggestions(
  suggestions: SearchSuggestionDto[],
  blockedIds: Set<string>,
): SearchSuggestionDto[] {
  if (blockedIds.size === 0) return suggestions;
  return suggestions.filter(
    (item) => item.type !== 'person' || !blockedIds.has(item.id),
  );
}

export function filterSearchResults(
  data: SearchApiResponse,
  blockedIds: Set<string>,
): SearchApiResponse {
  if (blockedIds.size === 0) return data;

  return {
    people: data.people.filter((person) => !blockedIds.has(person.id)),
    groups: data.groups,
    posts: data.posts.filter((post) => {
      const authorId = post.author?.id;
      return !authorId || !blockedIds.has(authorId);
    }),
  };
}
